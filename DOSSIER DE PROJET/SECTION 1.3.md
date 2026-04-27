# Dossier de Projet — Cinés Délices
### Titre Professionnel CDA RNCP Niveau 6 — O'Clock 2026
**Équipe :** Nathalie Leduc · Hameni Abanya · Vincent Duverger · Orianne Jaunet · Emilie Vatelin

---

## Bloc 1 — Développer une application sécurisée

### 1.3 Développement des composants métier

#### 1.3.1 Architecture des composants

L'application est découpée selon le principe de **séparation des responsabilités** : chaque couche a un rôle précis et ne fait que ça.  
Analogie : dans un restaurant, le cuisinier cuisine, le serveur sert, le caissier encaisse — personne ne fait tout à la fois.

**Architecture back-end — flux d'une requête HTTP :**

```
Requête HTTP entrante
  │
  ├── app.js          → middlewares globaux (Helmet, CORS, rate-limit)
  ├── routes/*.js     → déclaration des endpoints REST
  ├── middlewares/    → authMiddleware, adminMiddleware, validation Zod
  ├── controllers/    → logique métier (une fonction = une responsabilité)
  └── lib/prisma.js   → accès base de données via Prisma ORM
          │
          └── PostgreSQL
```

**Architecture front-end — organisation React :**

```
src/
  ├── pages/          → composants de haut niveau (1 page = 1 fichier)
  ├── components/     → composants réutilisables (Navbar, RecipeCard...)
  ├── context/        → AuthContext (état global d'authentification)
  ├── api/            → fonctions fetch centralisées (apiClient.js)
  ├── utils/          → fonctions utilitaires partagées
  └── styles/         → SCSS global + variables CSS
```

> ➡️ **Annexe G** — Diagramme d'architecture complet (schéma des couches front ↔ back ↔ BDD)

---

#### 1.3.2 Patterns de conception implémentés

**Pattern Repository / Service Layer (back-end)**

Les controllers ne contiennent pas de requêtes Prisma brutes. L'accès aux données passe par des fonctions dédiées — si la logique de récupération d'une recette change, on modifie un seul endroit, pas tous les controllers qui en ont besoin.

**Pattern Context / Provider (front-end)**

L'état d'authentification est géré par un `AuthContext` React. Tous les composants qui ont besoin de savoir "qui est connecté" lisent ce contexte sans que l'information soit passée manuellement de parent en enfant (prop drilling).  
Analogie : c'est un tableau d'affichage commun que tous les employés peuvent consulter — personne n'a besoin qu'on lui transmette l'information individuellement.

```jsx
// context/AuthContext.jsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Chargement du user au démarrage si token présent
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setUser(parseJwt(token));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Dans n'importe quel composant :
const { user } = useAuth(); // accès direct, sans props
```

**Pattern Middleware Chain (back-end)**

Les middlewares s'enchaînent comme des filtres successifs. Une route admin passe obligatoirement par deux contrôles avant d'atteindre le controller :

```javascript
// Route protégée admin — 3 couches de contrôle
router.patch(
  '/:id/publish',
  authMiddleware,    // 1. Vérifie que le JWT est valide → injecte req.user
  adminMiddleware,   // 2. Vérifie que req.user.role === 'ADMIN'
  publishRecipe      // 3. Seulement ici : logique métier
);
```

**Pattern Observer — Notifications in-app**

Quand un événement métier se produit (recette soumise, validée, refusée), une notification est créée en base de données via un `upsert` Prisma. Le frontend interroge régulièrement l'API pour afficher le badge de notification en temps réel.

---

#### 1.3.3 Règles métier — workflow de publication

Le cycle de vie d'une recette suit un **workflow à 3 statuts** strictement contrôlé par l'API.  
Analogie : c'est la chaîne éditoriale d'un journal — le journaliste (membre) écrit un brouillon, le soumet à la rédaction, et le rédacteur en chef (admin) décide de publier ou de renvoyer en correction.

```
DRAFT ──[soumettre]──► PENDING ──[valider]──► PUBLISHED
  ▲                        │
  └────────[refuser]────────┘  (avec motif de refus)
```

**Règles d'intégrité :**

- Un membre ne peut soumettre que ses propres recettes (`RG-03` — vérification d'ownership)
- Un membre ne peut supprimer que ses recettes `DRAFT` ou `PENDING` — jamais une recette `PUBLISHED`
- Seul un `ADMIN` peut passer une recette de `PENDING` à `PUBLISHED` ou la rejeter
- En cas de refus, un `rejectionReason` est stocké et une notification est envoyée au membre

```javascript
// api/src/controllers/recipesController.js — submit
export async function submitRecipe(req, res) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id }
  });

  // RG-03 : vérification d'ownership
  if (recipe.userId !== req.user.id)
    throw new AppError(403, 'Cette recette ne vous appartient pas');

  // Seule une recette DRAFT peut être soumise
  if (recipe.status !== 'DRAFT')
    throw new AppError(400, 'Seule une recette DRAFT peut être soumise');

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { status: 'PENDING' }
  });

  // Notification admin via upsert (évite les doublons)
  await prisma.notification.upsert({
    where:  { recipeId: recipe.id },
    update: { read: false },
    create: { recipeId: recipe.id, type: 'PENDING_REVIEW' }
  });

  res.json({ message: 'Recette soumise à validation' });
}
```

---

#### 1.3.4 Création d'une recette — fonctionnement complet

La création d'une recette est la fonctionnalité la plus complexe de l'application : elle implique le formulaire React, l'upload d'image, l'intégration TMDB, la gestion des ingrédients avec fuzzy search, et la gestion du temps.

**Flux complet :**

```
Membre remplit le formulaire
  │
  ├── 1. Titre, description, catégorie  → validation Zod côté serveur
  ├── 2. Image                          → Multer (mémoire) → Sharp → WebP
  ├── 3. Média TMDB                     → autocomplétion debounce 400ms
  ├── 4. Ingrédients                    → fuzzy search + normalisation singulier
  ├── 5. Temps prépa / cuisson          → parser multi-formats → minutes
  └── 6. Statut                         → DRAFT (sauvegarde) ou PENDING (soumission)
```

**Gestion du temps de préparation et cuisson :**

Le champ temps accepte plusieurs formats naturels et les convertit en minutes entiers stockés en base :

```javascript
// api/src/utils/timeParser.js
// "45min" → 45  |  "1h30" → 90  |  "1:30" → 90  |  "2h" → 120
export function parseTimeToMinutes(input) {
  const hm = input.match(/(\d+)h\s*(\d+)?/);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2] || 0);
  const m = input.match(/(\d+)\s*min/);
  if (m) return parseInt(m[1]);
  const colon = input.match(/(\d+):(\d+)/);
  if (colon) return parseInt(colon[1]) * 60 + parseInt(colon[2]);
  return parseInt(input) || 0;
}
```

À l'affichage, les minutes sont reconverties en format lisible : `90 min → "1h 30min"`.

**Fuzzy search sur les ingrédients :**

Quand un membre tape un ingrédient, deux requêtes successives sont effectuées pour éviter la création de doublons :

```
"citon" tapé
  │
  ├── Requête 1 : contains("citon")    → [] vide
  │
  ├── < 3 résultats ? OUI
  │
  ├── Requête 2 : contains("cit")      → ["citron", "citronnade"]
  │              (3 premières lettres comme filet de sécurité)
  │
  └── Tri par distance de Levenshtein
        → citron      distance 1  ✅ suggéré en #1
        → citronnade  distance 5  — en #2
```

La distance de Levenshtein mesure le nombre de modifications (ajout, suppression, substitution d'un caractère) pour passer d'un mot à l'autre. "citon" → "citron" = 1 insertion = distance 1.

**Normalisation au singulier :**

Pour éviter les doublons `citron` / `citrons`, tout ingrédient est normalisé au singulier à la saisie : le `s` final est supprimé automatiquement si le mot se termine par `s` (avec une liste d'exceptions pour les mots naturellement pluriels).

**Upload et optimisation d'image :**

```javascript
// Pipeline Multer (mémoire) → Sharp → WebP
// L'image ne touche jamais le disque en format original
const upload = multer({ storage: multer.memoryStorage() });

export async function processImage(buffer) {
  return sharp(buffer)
    .resize(800, 600, { fit: 'cover' })
    .webp({ quality: 80 })    // conversion WebP : -70% de poids
    .toBuffer();
}
```

> ➡️ **Annexe H** — Diagramme de séquence : création d'une recette (formulaire → API → BDD)

---

#### 1.3.5 Système de notifications

L'application implémente un double système de notifications : **in-app** (temps réel dans l'interface) et **email** (Nodemailer via Mailtrap en développement, Brevo en production).

**Notifications in-app :**

| Événement | Destinataire | Message |
|-----------|-------------|---------|
| Recette soumise (PENDING) | Admin | Badge + "Nouvelle recette à valider" |
| Recette publiée (PUBLISHED) | Membre auteur | "Votre recette a été publiée ✅" |
| Recette refusée (DRAFT) | Membre auteur | "Votre recette a été refusée : [motif]" |
| Ingrédient invalidé | Membre auteur | Message détaillé de l'admin |

**Emails applicatifs (Nodemailer) :**

| Email | Déclencheur | Destinataire |
|-------|------------|-------------|
| Réinitialisation mot de passe | `POST /api/auth/forgot-password` | Membre demandeur |
| Confirmation changement MDP | `PATCH /api/users/me/password` | Membre connecté |
| Prévenance inactivité (11 mois) | CRON — lundi 3h00 | Membres inactifs |
| Suppression compte (12 mois) | CRON — lundi 3h00 | Membres supprimés |

**Architecture du système d'emails :**

```
app.js
  └── startInactivityCron()      ← démarre au boot
        └── cron : chaque lundi 3h00
              └── checkInactiveAccounts()
                    ├── 12+ mois → purgeInactiveAccount()
                    │     ├── sendEmail(buildDeletionEmail) ← AVANT suppression
                    │     └── prisma.$transaction(
                    │           delete DRAFT/PENDING recipes,
                    │           delete User
                    │         )
                    └── 11-12 mois → sendEmail(buildWarningEmail)
```

> **Important :** l'email de suppression est envoyé **avant** la suppression du compte — une fois le compte supprimé, l'adresse email n'est plus disponible.

**Configuration SMTP selon l'environnement :**

| Variable | Développement (Mailtrap) | Production (Brevo) |
|----------|--------------------------|-------------------|
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` | `587` |
| `SMTP_USER` | Identifiant Mailtrap | Identifiant Brevo |
| `SMTP_PASS` | Mot de passe Mailtrap | Clé API Brevo |

Mailtrap est une "boîte aux lettres fictive" en développement : les emails sont capturés et visibles dans une interface web, sans jamais atteindre de vraie boîte mail. Analogie : c'est un simulateur de vol — on teste sans risque réel.

---

#### 1.3.6 Sécurisation des composants métier

**Routes sensibles protégées :**

Chaque route sensible est protégée par la chaîne de middlewares appropriée avant d'atteindre le controller :

```javascript
// Routes publiques : aucun middleware
router.get('/api/recipes', getCatalog);

// Routes membre : JWT requis
router.post('/api/recipes', authMiddleware, createRecipe);
router.patch('/api/recipes/:id/submit', authMiddleware, submitRecipe);

// Routes admin : JWT + rôle ADMIN
router.patch('/api/admin/recipes/:id/publish',
  authMiddleware, adminMiddleware, publishRecipe);
router.post('/api/admin/ingredients/merge',
  authMiddleware, adminMiddleware, mergeIngredients);
```

**Validation des données côté serveur (Zod) :**

Toutes les données reçues du client sont validées avec Zod avant d'être traitées. Zod ne fait pas confiance au frontend — même si la validation côté client a déjà eu lieu. Analogie : c'est le contrôle de sécurité à l'aéroport — même si tu as déjà été vérifié à l'entrée, on contrôle à nouveau avant l'embarquement.

```javascript
// Schéma de validation Zod pour la création de recette
const createRecipeSchema = z.object({
  title:       z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  categoryId:  z.number().int().positive(),
  prepTime:    z.number().int().min(0).max(9999),
  cookTime:    z.number().int().min(0).max(9999),
  servings:    z.number().int().min(1).max(100),
});
// Une donnée invalide → erreur 400 automatique, jamais de crash
```

**Gestion propre des erreurs back-end :**

Une classe `AppError` centralisée garantit que les erreurs techniques (stack traces, détails SQL) ne sont jamais exposées au client :

```javascript
// Handler global Express — intercepte toutes les erreurs
app.use((err, req, res, next) => {
  const code = err.statusCode || 500;
  const msg  = err.statusCode
    ? err.message                        // erreur métier → message lisible
    : 'Une erreur interne est survenue'; // erreur technique → message générique
  res.status(code).json({ error: msg });
  // La stack trace n'est JAMAIS envoyée au client
});
```

**Vérification des droits sur les actions :**

Chaque action sensible vérifie l'ownership avant exécution. Un membre ne peut pas modifier ou supprimer la recette d'un autre membre, même en connaissant son ID :

```javascript
// Vérification ownership sur toute modification de recette
const recipe = await prisma.recipe.findUnique({ where: { id } });
if (!recipe)              throw new AppError(404, 'Recette introuvable');
if (recipe.userId !== req.user.id)
                          throw new AppError(403, 'Accès interdit');
```

**Gestion des secrets :**

Aucune clé API, mot de passe ou secret JWT n'est versionné dans Git. Toutes les valeurs sensibles sont dans des fichiers `.env` exclus via `.gitignore`. Le fichier `.env.example` documente les variables nécessaires sans leurs valeurs réelles.

> ➡️ **Annexe I** — Tableau complet des routes API avec niveaux d'accès (Public / Membre / Admin)

---

## Récapitulatif des annexes — sections 1.1 à 1.3

| Annexe | Contenu | Section |
|--------|---------|---------|
| A | Charte graphique complète | 1.2.1 |
| B | 22 wireframes Desktop (WFD-01 à WFD-22) | 1.2.2 |
| C | 22 wireframes Mobile (WFM-01 à WFM-22) | 1.2.2 |
| D | 22 maquettes Desktop (MQD-01 à MQD-22) | 1.2.2 |
| E | 22 maquettes Mobile (MQM-01 à MQM-22) | 1.2.2 |
| F | Rapports Lighthouse Desktop et Mobile | 1.2.7 |
| G | Diagramme d'architecture des couches | 1.3.1 |
| H | Diagramme de séquence — création d'une recette | 1.3.4 |
| I | Tableau complet des routes API | 1.3.6 |