# Volet 3 — Emails automatiques RGPD (Cinés Délices)

## Vue d'ensemble

Le volet 3 met en place un système automatisé de gestion des comptes inactifs,
conformément aux recommandations CNIL (durée de conservation limitée à 12 mois).

### Calendrier RGPD

| Inactivité | Action | Email envoyé |
|------------|--------|-------------|
| 11 mois | Email de prévenance | "Votre compte sera supprimé dans 30 jours" |
| 12 mois | Suppression automatique | "Votre compte a été supprimé" |

### Architecture complète

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CINÉS DÉLICES — RGPD                              │
│                   Architecture emails & inactivité                       │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
    │   MEMBRE    │         │   BACK-END   │         │    SERVICES     │
    │  (React)    │         │  (Node.js)   │         │    EXTERNES     │
    └──────┬──────┘         └──────┬───────┘         └────────┬────────┘
           │                       │                          │
           │  POST /api/auth/login │                          │
           │──────────────────────►│                          │
           │                       │                          │
           │                       ├─── prisma.user.update    │
           │                       │    { lastLoginAt: now }  │
           │                       │                          │
           │   { token, user }     │                          │
           │◄──────────────────────│                          │
           │                       │                          │
           │                       │                          │
    ═══════╪═══════════════════════╪══════════════════════════╪══════════
    CRON   │   Chaque lundi 3h     │                          │
    ═══════╪═══════════════════════╪══════════════════════════╪══════════
           │                       │                          │
           │                 ┌─────┴──────┐                   │
           │                 │  node-cron  │                   │
           │                 │  '0 3 * * 1'│                   │
           │                 └─────┬──────┘                   │
           │                       │                          │
           │                       ▼                          │
           │          ┌────────────────────────┐              │
           │          │ checkInactiveAccounts() │              │
           │          └────────────┬───────────┘              │
           │                       │                          │
           │              ┌────────┴────────┐                 │
           │              │                 │                 │
           │              ▼                 ▼                 │
           │    ┌─────────────────┐ ┌──────────────────┐      │
           │    │ 11-12 mois      │ │ 12+ mois         │      │
           │    │ d'inactivité    │ │ d'inactivité     │      │
           │    └────────┬────────┘ └────────┬─────────┘      │
           │             │                   │                │
           │             ▼                   ▼                │
           │    ┌─────────────────┐ ┌──────────────────┐      │
           │    │ buildWarning    │ │ buildDeletion    │      │
           │    │ Email()         │ │ Email()          │      │
           │    └────────┬────────┘ └────────┬─────────┘      │
           │             │                   │                │
           │             │                   ▼                │
           │             │          ┌──────────────────┐      │
           │             │          │ prisma.$transaction│     │
           │             │          │ • deleteMany      │     │
           │             │          │   (DRAFT/PENDING) │     │
           │             │          │ • user.delete     │     │
           │             │          │   (→ SetNull sur  │     │
           │             │          │    PUBLISHED)     │     │
           │             │          └──────────────────┘      │
           │             │                   │                │
           │             └─────────┬─────────┘                │
           │                       │                          │
           │                       ▼                          │
           │              ┌─────────────────┐    SMTP         │
           │              │   sendEmail()   │────────────────►│
           │              │   (Nodemailer)  │                 │
           │              └─────────────────┘    ┌────────────┤
           │                                     │  Mailtrap  │
           │                                     │  (dev)     │
           │                                     ├────────────┤
           │                                     │  Brevo     │
           │                                     │  (prod)    │
           │                                     └────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        FLUX DÉTAILLÉ                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Login du membre                                                      │
│     └─► lastLoginAt = maintenant                                         │
│                                                                          │
│  2. Cron (lundi 3h)                                                      │
│     ├─► Requête BDD : MEMBER avec lastLoginAt < 12 mois                 │
│     │   ou (lastLoginAt = null ET createdAt < 12 mois)                   │
│     │   └─► Pour chaque : email suppression → transaction delete         │
│     │                                                                    │
│     └─► Requête BDD : MEMBER avec lastLoginAt entre 11 et 12 mois       │
│         ou (lastLoginAt = null ET createdAt entre 11 et 12 mois)         │
│         └─► Pour chaque : email de prévenance                            │
│                                                                          │
│  3. Suppression (ce qui est supprimé / conservé)                         │
│     ├─► SUPPRIMÉ : email, pseudo, nom, passwordHash, notifications       │
│     ├─► SUPPRIMÉ : recettes DRAFT et PENDING                             │
│     └─► CONSERVÉ : recettes PUBLISHED (userId → null, "Ancien membre")   │
│                                                                          │
│  4. Sécurités                                                            │
│     ├─► Les ADMIN ne sont jamais ciblés                                  │
│     ├─► Email envoyé AVANT suppression (on a encore l'adresse)           │
│     ├─► Erreurs catchées par compte (un échec ne bloque pas les autres)  │
│     └─► Si SMTP non configuré → warning en console, pas de crash         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Packages installés

```bash
pnpm i nodemailer node-cron
```

- **nodemailer** : envoi d'emails via SMTP
- **node-cron** : planification de tâches récurrentes

---

## Fichiers créés

### 1. `src/lib/mailer.js` — Service email

**Rôle** : configure le transporteur SMTP et expose une fonction `sendEmail()` réutilisable.

**Points clés** :
- Si les variables SMTP ne sont pas dans le `.env`, l'app ne plante pas — elle log un warning et skip l'envoi
- Fonction `verifyMailer()` disponible pour tester la connexion SMTP au démarrage
- Compatible Mailtrap (dev), Brevo (prod), Gmail

### 2. `src/jobs/inactivityCheck.js` — Cron d'inactivité

**Rôle** : chaque lundi à 3h du matin, vérifie les comptes inactifs et agit.

**Logique** :

1. **Suppression (12+ mois)** :
   - Cherche les `MEMBER` (jamais les admins) avec `lastLoginAt < 12 mois`
   - Inclut aussi les comptes avec `lastLoginAt: null` + `createdAt < 12 mois`
   - Envoie l'email de suppression AVANT de supprimer (on a encore l'adresse)
   - Transaction : supprime les recettes DRAFT/PENDING, puis le User
   - Les recettes PUBLISHED restent (SetNull sur userId)

2. **Prévenance (11-12 mois)** :
   - Cherche les comptes entre 11 et 12 mois d'inactivité
   - Envoie un email avec un bouton "Me reconnecter"
   - Si le membre se reconnecte, `lastLoginAt` est mis à jour et il sort de la fenêtre

### 3. Variables `.env` ajoutées

```env
# SMTP — Mailtrap (développement)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=votre_username_mailtrap
SMTP_PASS=votre_password_mailtrap
SMTP_FROM="Cinés Délices <noreply@cines-delices.fr>"
```

### 4. Modification `app.js`

```javascript
import { startInactivityCron } from './jobs/inactivityCheck.js';

// Après app.listen()
startInactivityCron();
```

---

## Les 2 templates d'emails

### Email 1 — Prévenance (11 mois d'inactivité)

**Objet** : `Cinés Délices — Votre compte sera bientôt supprimé`

**Design** :
- Fond crème `#FAF7F2` avec coins arrondis
- Header centré : "🎬 Cinés Délices" en bordeaux `#8E1F2F`
- Message personnalisé avec le pseudo du membre
- Bouton CTA bordeaux "Me reconnecter" → lien vers `/login`
- Footer avec liens vers mentions légales et politique de confidentialité en or `#C9A45C`
- Séparateur horizontal fin `#E0DDD5`

**Contenu** :

> Bonjour {pseudo},
>
> Nous constatons que vous ne vous êtes pas connecté(e) à Cinés Délices
> depuis plus de 11 mois.
>
> Conformément à notre politique de protection des données personnelles
> (RGPD) et aux recommandations de la CNIL, votre compte sera
> automatiquement supprimé dans 30 jours si vous ne vous reconnectez pas.
>
> Vos recettes publiées resteront visibles de manière anonyme sur le site.
>
> [ Me reconnecter ]

---

### Email 2 — Confirmation de suppression (12 mois d'inactivité)

**Objet** : `Cinés Délices — Votre compte a été supprimé`

**Design** : identique au template 1 (même charte graphique).

**Contenu** :

> Bonjour {pseudo},
>
> Suite à une inactivité de plus de 12 mois et conformément à notre
> politique de protection des données (RGPD), votre compte Cinés Délices
> a été supprimé.
>
> Vos données personnelles (email, pseudo, mot de passe) ont été
> définitivement effacées. Vos recettes publiées restent visibles
> de manière anonyme.
>
> Vous pouvez à tout moment créer un nouveau compte sur Cinés Délices.

---

## Tester en développement

### Tester l'envoi d'un email

```bash
cat > test-email.mjs << 'EOF'
import 'dotenv/config';
import { sendEmail } from './src/lib/mailer.js';

await sendEmail({
  to: 'test@example.com',
  subject: 'Test — Email de prévenance Cinés Délices',
  html: '<h1 style="color: #8E1F2F;">Test réussi !</h1><p>Cet email arrive dans Mailtrap.</p>',
});

console.log('Vérifie dans Mailtrap !');
process.exit();
EOF
node test-email.mjs
rm test-email.mjs
```

### Tester le cron manuellement

```bash
cat > test-cron.mjs << 'EOF'
import 'dotenv/config';
import { checkInactiveAccounts } from './src/jobs/inactivityCheck.js';
await checkInactiveAccounts();
process.exit();
EOF
node test-cron.mjs
rm test-cron.mjs
```

**Résultat attendu** (tous les comptes sont récents) :

```
[CRON] Vérification des comptes inactifs — 2026-03-27T14:25:35.984Z
[CRON] Résultat : 0 supprimé(s), 0 prévenu(s)
```

### Simuler un compte inactif (pour voir les emails)

```sql
-- Dans psql, vieillir artificiellement un compte de test
UPDATE users
SET last_login_at = NOW() - INTERVAL '11 months 15 days'
WHERE pseudo = 'nom-du-compte-test';
```

Puis relancez `test-cron.mjs` — le cron détectera le compte et enverra
l'email de prévenance visible dans Mailtrap.

---

## Passage en production

Quand vous serez prêts à envoyer de vrais emails, remplacez les
variables SMTP dans le `.env` de production :

```env
# SMTP — Brevo (production, gratuit 300 emails/jour)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre_email@example.com
SMTP_PASS=votre_cle_smtp_brevo
SMTP_FROM="Cinés Délices <noreply@cines-delices.fr>"
```

Créez un compte gratuit sur [brevo.com](https://www.brevo.com),
activez le SMTP dans Settings → SMTP & API, et copiez les identifiants.

---

## Sécurités intégrées

- **Les admins ne sont jamais ciblés** par le cron (filtre `role: 'MEMBER'`)
- **L'email de suppression est envoyé AVANT** la suppression du compte
- **Les recettes publiées survivent** grâce au `onDelete: SetNull`
- **Si le SMTP n'est pas configuré**, l'app ne plante pas (warning en console)
- **Chaque suppression est loguée** dans la console serveur
- **Les erreurs sont catchées individuellement** par compte (un échec ne bloque pas les autres)
