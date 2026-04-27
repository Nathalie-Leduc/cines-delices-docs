# Dossier de Projet — Cinés Délices
### Titre Professionnel CDA RNCP Niveau 6 — O'Clock 2026
**Équipe :** Nathalie Leduc · Hameni Abanya · Vincent Duverger · Orianne Jaunet · Emilie Vatelin

---

## Bloc 3 — Préparer le déploiement d'une application sécurisée

### 3.1 Stratégie de déploiement

#### 3.1.1 Environnements

L'application est déployée sur trois environnements distincts, chacun avec ses propres variables de configuration :

| Environnement | Infrastructure | Usage |
|---------------|---------------|-------|
| **Développement** | Docker Compose (local) | Développement quotidien, tests manuels |
| **Test / Intégration** | API Railway (production) | Tests d'intégration automatisés via CI/CD |
| **Production** | Railway (3 services) | Application accessible aux utilisateurs |

En développement, Docker Compose orchestre trois conteneurs : l'API Node.js, le client React/Vite et PostgreSQL. Le lancement complet tient en une commande :

```bash
docker compose up   # démarre API + client + PostgreSQL
```

En production, les trois services sont déployés sur Railway comme des services indépendants qui communiquent entre eux via le réseau interne Railway. Railway n'utilise pas Docker Compose mais son propre système Nixpacks pour construire les images.

> ➡️ **Annexe V** — Guide de déploiement Railway complet (étapes pas à pas)

---

#### 3.1.2 Configuration par environnement

Les configurations sont séparées strictement par environnement via les variables d'environnement. Aucune valeur de production n'apparaît dans le code source.

**Développement (`.env` local) :**

| Variable | Valeur développement |
|----------|---------------------|
| `DATABASE_URL` | `postgresql://cinesdelices:cinesdelices@db:5432/cinesdelices` |
| `NODE_ENV` | `development` |
| `JWT_SECRET` | Valeur locale (non partagée) |
| `TMDB_API_KEY` | Clé personnelle du développeur |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` (emails capturés, jamais envoyés) |
| `VITE_API_URL` | `http://localhost:3000` |

**Production (Railway — variables injectées par l'interface Railway) :**

| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | URL PostgreSQL interne Railway (générée automatiquement) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Chaîne aléatoire 64 caractères |
| `TMDB_API_KEY` | Clé API TMDB de l'équipe |
| `API_BASE_URL` | URL publique du service API Railway |
| `CLIENT_URL` | URL publique du service client Railway |
| `SMTP_HOST` | Serveur Brevo (envoi réel d'emails) |
| `VITE_API_URL` | URL publique de l'API (injectée au build Vite) |

**Point critique — `VITE_API_URL` :**  
Vite injecte les variables d'environnement au moment du **build**, pas au runtime. Si `VITE_API_URL` n'est pas définie avant le build, toutes les requêtes API pointent vers `localhost:3000` en production — une erreur invisible jusqu'au déploiement. Cette contrainte a été identifiée lors du premier déploiement Render et documentée dans le guide.

---

#### 3.1.3 Sécurité du déploiement

**HTTPS en production :**  
Railway fournit automatiquement un certificat TLS pour chaque service déployé. Toutes les communications entre le client et l'API se font en HTTPS — les données ne transitent jamais en clair.

**Principe de moindre privilège :**  
Chaque service Railway n'a accès qu'aux variables dont il a besoin. Le service client n'a pas accès aux variables de l'API (`JWT_SECRET`, `DATABASE_URL`), et vice versa.

**Secrets dans le pipeline CI/CD :**  
Les secrets utilisés par GitHub Actions (URL de l'API Railway, `DATABASE_URL` pour le seed de test) sont stockés dans GitHub → Settings → Secrets → Actions. Ils ne sont jamais visibles dans les logs du pipeline.

```yaml
# ci.yml — référence sécurisée, valeur jamais exposée
env:
  API_BASE_URL: ${{ secrets.API_BASE_URL }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Caddyfile — cache HTTP en production :**  
Un fichier `Caddyfile` configure les headers de cache HTTP pour les assets statiques en production, sans exposer d'informations sensibles sur l'infrastructure :

```
:80 {
  encode gzip
  root * /srv
  file_server

  header /assets/* {
    Cache-Control "public, max-age=31536000, immutable"
  }
  header *.webp {
    Cache-Control "public, max-age=86400"
  }

  try_files {path} /index.html
}
```

---

### 3.2 Tests de l'application

#### 3.2.1 Stratégie de tests — pyramide

La stratégie de tests suit la **pyramide de tests** classique :

```
         ▲
        / \          Tests E2E (manuels)
       /   \         Parcours complets navigateur
      /─────\
     /       \       Tests d'intégration
    /         \      Endpoints API réels (Railway)
   /───────────\
  /             \    Tests unitaires
 /               \   Logique métier isolée (Vitest + node:assert)
/─────────────────\
```

**Justification de ce périmètre :**  
Les tests unitaires couvrent la logique métier critique (parsing, normalisation, formatage) — celle qui peut produire des bugs silencieux difficiles à détecter manuellement. Les tests d'intégration vérifient que les routes API se comportent correctement de bout en bout, y compris les règles de sécurité. Les tests E2E sont manuels car l'interface utilisateur change fréquemment en sprint et le coût d'automatisation n'est pas justifié à ce stade.

---

#### 3.2.2 Outils et frameworks utilisés

| Outil | Couche | Usage |
|-------|--------|-------|
| **Vitest** | Front-end (client) | Tests unitaires sur les utilitaires React |
| **Testing Library** | Front-end (client) | Tests de composants React (affichage, comportement) |
| **node:test + node:assert** | Back-end (API) | Tests d'intégration des routes (module natif Node.js 24) |
| **API Rest Client** (VS Code) | Back-end | Tests manuels des endpoints pendant le développement |

---

#### 3.2.3 Tests unitaires back-end — logique métier critique

Les tests unitaires back-end ciblent les fonctions de `recipeUtils.js` et `timeParser.js` — des utilitaires partagés dont une régression silencieuse affecterait immédiatement l'expérience utilisateur.

```javascript
// api/tests/unit/recipeUtils.test.js — node:test + node:assert
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseTimeToMinutes,
  normalizeIngredientName,
  formatMinutes,
} from '../../src/utils/recipeUtils.js';

describe('parseTimeToMinutes', () => {
  it('entier pur',   () => assert.strictEqual(parseTimeToMinutes('70'), 70));
  it('1h30',         () => assert.strictEqual(parseTimeToMinutes('1h30'), 90));
  it('1h',           () => assert.strictEqual(parseTimeToMinutes('1h'), 60));
  it('30min',        () => assert.strictEqual(parseTimeToMinutes('30min'), 30));
  it('1:30',         () => assert.strictEqual(parseTimeToMinutes('1:30'), 90));
  it('vide → null',  () => assert.strictEqual(parseTimeToMinutes(''), null));
  it('abc → null',   () => assert.strictEqual(parseTimeToMinutes('abc'), null));
});

describe('normalizeIngredientName', () => {
  it('citrons → citron', () => assert.strictEqual(normalizeIngredientName('citrons'), 'citron'));
  it('riz inchangé',     () => assert.strictEqual(normalizeIngredientName('riz'), 'riz'));
  it('noix inchangé',    () => assert.strictEqual(normalizeIngredientName('noix'), 'noix'));
  it('Tomates → tomate', () => assert.strictEqual(normalizeIngredientName('Tomates'), 'tomate'));
});

describe('formatMinutes', () => {
  it('45 → 45 min', () => assert.strictEqual(formatMinutes(45), '45 min'));
  it('60 → 1h',     () => assert.strictEqual(formatMinutes(60), '1h'));
  it('90 → 1h30',   () => assert.strictEqual(formatMinutes(90), '1h30'));
});
```

---

#### 3.2.4 Tests des routes API principales

Les tests d'intégration frappent directement l'API Railway déployée, sans mock. Ils valident le comportement réel de bout en bout, incluant la base de données, les middlewares et les règles de sécurité.

**Suites de tests d'intégration (node:assert) :**

| Suite | Routes testées | Cas couverts |
|-------|----------------|--------------|
| Auth | POST /register, POST /login | Inscription valide, email dupliqué, mot de passe faible, connexion invalide |
| Recettes | GET /recipes, GET /recipes/:slug, POST /recipes | Catalogue paginé, filtres, accès non authentifié |
| Workflow | PATCH /recipes/:id/submit, PATCH /admin/recipes/:id/publish | DRAFT→PENDING→PUBLISHED, ownership RG-03 |
| Admin | GET /admin/recipes/pending, POST /admin/ingredients/merge | Accès réservé ADMIN, fusion ingrédients |
| Sécurité | Toutes les routes protégées | JWT manquant (401), rôle insuffisant (403), SQL injection, XSS headers |
| RGPD | DELETE /users/me | Suppression compte + SET NULL recettes publiées |
| Ingrédients | GET /ingredients/search | Fuzzy search, normalisation singulier |

---

#### 3.2.5 Données de test isolées

Les tests d'intégration utilisent des données isolées et reproductibles :

- Un **seed de test** (`ensureTestUsers`) crée ou réinitialise les comptes de test (membre, admin) avant chaque run
- Les données créées pendant les tests (recettes, ingrédients) utilisent des identifiants uniques horodatés pour éviter les collisions
- La base de données Railway de production est utilisée pour les tests d'intégration — les données de test sont nettoyées en fin de run

---

#### 3.2.6 Tests front-end — composants clés

Les tests Vitest + Testing Library ciblent les composants React dont un bug aurait un impact direct sur l'expérience utilisateur.

```javascript
// client/src/utils/recipeUtils.test.js — Vitest
import { describe, it, expect } from 'vitest';
import { parseTimeToMinutes, normalizeIngredientName, formatMinutes }
  from './recipeUtils';

describe('parseTimeToMinutes', () => {
  it('1h30 → 90',         () => expect(parseTimeToMinutes('1h30')).toBe(90));
  it('30min → 30',        () => expect(parseTimeToMinutes('30min')).toBe(30));
  it('vide → null',       () => expect(parseTimeToMinutes('')).toBeNull());
});

describe('normalizeIngredientName', () => {
  it('citrons → citron',  () => expect(normalizeIngredientName('citrons')).toBe('citron'));
  it('Tomates → tomate',  () => expect(normalizeIngredientName('Tomates')).toBe('tomate'));
});
```

**Composants testés :**
- États d'affichage (chargement, erreur, contenu vide, succès)
- Formulaires (validation, messages d'erreur, soumission)
- Affichage conditionnel selon le rôle (boutons admin/membre)

---

#### 3.2.7 Tests de sécurité

Les tests de sécurité vérifient les protections contre les vulnérabilités du Top 10 OWASP 2025 :

| Vulnérabilité OWASP | Test effectué | Résultat |
|---------------------|--------------|----------|
| **A01 — Broken Access Control** | Appels aux routes admin sans token / avec token membre | 401 / 403 retournés ✅ |
| **A02 — Cryptographic Failures** | Vérification que les mots de passe ne sont pas stockés en clair | Hash Argon2id en BDD ✅ |
| **A03 — Injection** | Injection SQL via les paramètres de recherche | Prisma paramétrise toutes les requêtes ✅ |
| **A05 — Security Misconfiguration** | Vérification des headers HTTP (X-Frame-Options, CSP...) | Helmet configuré ✅ |
| **A07 — Auth Failures** | Token JWT expiré, token falsifié, token absent | 401 dans tous les cas ✅ |
| **A08 — Data Integrity** | Modification d'une recette appartenant à un autre membre | 403 Forbidden ✅ |

Les headers de sécurité sont vérifiés automatiquement dans le pipeline CI :

```javascript
// test-api-security.js — vérification des headers Helmet
const res = await fetch(`${API}/api/health`);
assert.ok(res.headers.get('x-frame-options'),         'X-Frame-Options manquant');
assert.ok(res.headers.get('x-content-type-options'),  'X-Content-Type-Options manquant');
assert.ok(res.headers.get('strict-transport-security'),'HSTS manquant');
```

---

#### 3.2.8 Justification du périmètre et lien avec les risques métier

**Ce qui est testé et pourquoi :**

- **Parser de temps et normalisation des ingrédients** — une régression silencieuse sur ces fonctions affecterait toutes les recettes du catalogue sans message d'erreur visible
- **Workflow DRAFT→PENDING→PUBLISHED** — c'est le cœur métier de l'application ; un bug ici bloquerait la contribution des membres
- **Règles d'ownership (RG-03)** — une régression permettrait à un membre de modifier la recette d'un autre, avec des conséquences légales potentielles
- **Routes admin** — un accès non autorisé au back-office est le risque de sécurité le plus critique du projet

**Ce qui n'est pas testé automatiquement et pourquoi :**

- Les tests E2E (Cypress, Playwright) n'ont pas été mis en place — le coût d'implémentation et de maintenance dépasse le bénéfice sur une période de sprint de 4 semaines
- L'interface graphique est testée manuellement à chaque sprint review

---

#### 3.2.9 Couverture, limites et bug détecté grâce aux tests

**Couverture actuelle :**
- Utilitaires `recipeUtils.js` et `timeParser.js` : couverture complète des cas nominaux et cas limites
- Routes API critiques : 7 suites de tests d'intégration
- Composants React : utilitaires et affichage conditionnel

**Limites identifiées :**
- Pas de tests automatisés sur les composants de formulaire complexes (CreateRecipe)
- Les tests d'intégration frappent la base de production — un seed de données de test dédié serait plus robuste

**Exemple concret de bug détecté grâce aux tests :**  
Un test unitaire sur `normalizeIngredientName` a révélé que le mot "bœuf" était incorrectement normalisé (le `œ` était mal géré par la règle de suppression du `s` final). Le bug aurait été invisible en tests manuels car aucun testeur n'avait saisi ce mot spécifiquement. La correction a été appliquée avant toute mise en production.

---

### 3.3 Documentation et déploiement

#### 3.3.1 Documentation technique

La documentation technique est répartie à plusieurs niveaux :

- **Ce dossier de projet** — architecture, choix techniques, modélisation, sécurité, tests, déploiement
- **Swagger UI (`/api-docs`)** — documentation interactive de toutes les routes API, accessible en production
- **3 fichiers README** — racine (stack + démarrage rapide), `api/` (routes + variables + scripts), `client/` (structure + dépannage)
- **Schéma Prisma (`schema.prisma`)** — source de vérité de la base de données, versionné avec le code
- **Annexes thématiques** — documentation détaillée des fonctions complexes (fuzzy search, parser temps, Sharp)

> ➡️ **Annexe V** — Guide de déploiement Railway complet  
> ➡️ **Annexe W** — Capture de l'interface Swagger UI en production

---

#### 3.3.2 Stratégie de déploiement — pipeline complet

**Architecture de déploiement Railway :**

```
GitHub (push sur main/perso)
  │
  ├── GitHub Actions (CI)
  │     ├── lint-client      → ESLint React/Vite
  │     ├── test-client      → Vitest (76 tests unitaires)
  │     ├── lint-api         → ESLint Node.js
  │     └── test-api-integration → node:assert (API Railway)
  │
  └── Railway (CD automatique)
        ├── service API    → Nixpacks → build Node.js → deploy
        ├── service Client → Nixpacks → build Vite → Caddy
        └── PostgreSQL     → persistant (volume Railway)
```

**Étapes manuelles vs automatisées :**

| Étape | Manuel | Automatisé |
|-------|--------|------------|
| Push du code | ✅ | |
| Lint et tests | | ✅ GitHub Actions |
| Build Docker/Nixpacks | | ✅ Railway |
| Migration Prisma | | ✅ (`prisma migrate deploy` au démarrage) |
| Déploiement API | | ✅ Railway webhook |
| Déploiement client | | ✅ Railway webhook |
| Seed initial | ✅ (une seule fois) | |

**Rollback :**  
Railway conserve l'historique des déploiements et permet de revenir à n'importe quelle version précédente en un clic depuis l'interface. Analogie : c'est le bouton "annuler" du déploiement — si la v2 casse, on revient à la v1 en 30 secondes.

---

#### 3.3.3 Configuration des environnements

La séparation des configurations est assurée par la variable `NODE_ENV` :

```javascript
// api/src/app.js — comportement adapté selon l'environnement
const isProduction = process.env.NODE_ENV === 'production';

// En production : logs minimalistes, pas de stack traces exposées
// En développement : logs détaillés, messages d'erreur complets
app.use((err, req, res, next) => {
  const code = err.statusCode || 500;
  res.status(code).json({
    error: err.statusCode ? err.message : 'Une erreur interne est survenue',
    ...(isProduction ? {} : { stack: err.stack }), // stack visible seulement en dev
  });
});
```

---

### 3.4 Démarche DevOps

#### 3.4.1 Pipeline CI/CD — GitHub Actions

J'ai mis en place le pipeline CI/CD après l'Apothose. Il s'exécute automatiquement à chaque push sur `main` ou `develop`, et sur chaque Pull Request vers ces branches.

**Architecture du pipeline (4 jobs) :**

```
push / PR        ┌─ ① lint-client      ESLint React/Vite    ┐
sur main ou      ├─ ② test-client      Vitest (76 tests)     ├── parallèles
develop          └─ ③ lint-api         ESLint Node.js        ┘
                          │
                          ▼ (si ①②③ verts)
push seulement   └─ ④ test-api-integration   node:assert sur API Railway
                          sleep 30s → seed → tests → sécurité
```

**Déclencheurs :**

| Événement | Jobs lancés |
|-----------|-------------|
| Push sur `main` ou `develop` | Jobs ①②③ en parallèle → job ④ si tous verts |
| Pull Request vers `main` ou `develop` | Jobs ①②③ uniquement (pas d'intégration) |
| Push sur autre branche | Aucun job |

Les tests d'intégration ne tournent pas sur les PRs pour éviter de polluer la base de données de production à chaque revue de code.

---

#### 3.4.2 Automatisations en place

Au moins **4 automatisations** sont actives dans le projet :

**① Lint automatique à chaque push :**  
ESLint vérifie la qualité du code côté API et client — une erreur de syntaxe ou une mauvaise pratique bloque le pipeline avant même les tests.

**② Tests automatiques à chaque push :**  
76 tests Vitest côté client + suites node:assert côté API tournent automatiquement. Un test qui échoue bloque le merge dans `main`.

**③ Déploiement continu Railway :**  
À chaque push sur la branche liée au service Railway, l'application est automatiquement reconstruite et redéployée — sans intervention manuelle.

**④ Migrations Prisma automatiques :**  
Au démarrage du service API en production, `prisma migrate deploy` applique automatiquement toutes les migrations en attente — la base de données est toujours synchronisée avec le code.

**⑤ Nettoyage des builds CI (concurrency) :**  
Si deux pushes arrivent rapidement, le pipeline annule automatiquement le run obsolète et ne garde que le plus récent :

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

#### 3.4.3 Gestion des versions et des releases

Le versioning suit la convention **Semantic Versioning** (SemVer) appliquée via les tags Git :

- `v1.0.0` — première version stable déployée sur Railway
- `v1.1.0` — ajout fuzzy search + merge ingrédients (Sprint 2)
- `v1.2.0` — optimisations Lighthouse + CI/CD (Sprint 3)

Chaque sprint review correspond à une version taguée, permettant un rollback précis si nécessaire.

---

#### 3.4.4 Sécurisation du pipeline de déploiement

**Secrets jamais dans le code :**  
Toutes les valeurs sensibles (clés API, `DATABASE_URL`, `JWT_SECRET`) sont stockées dans GitHub Secrets et Railway Variables — jamais dans le code source ni dans l'historique Git.

**Dépendances auditées :**  
```bash
npm audit          # vérifie les vulnérabilités connues
npm audit --fix    # corrige automatiquement les vulnérabilités non-breaking
```

L'audit des dépendances est exécuté manuellement avant chaque sprint review. Aucune vulnérabilité de niveau `high` ou `critical` n'est tolérée en production.

**Images Docker vérifiées :**  
Les images de base utilisées (`node:24-alpine`, `postgres:18-alpine`) sont des images officielles Docker Hub, régulièrement mises à jour par leurs mainteneurs.

**Principe de moindre privilège dans CI/CD :**  
Le secret `DATABASE_URL` exposé au job de test d'intégration est le `DATABASE_URL` public de Railway (accessible depuis l'extérieur), pas le `DATABASE_URL` interne. L'accès en écriture est limité au seed de test et aux tables de test uniquement.

> ➡️ **Annexe X** — Capture du pipeline GitHub Actions (jobs verts)  
> ➡️ **Annexe Y** — Résultats `npm audit` (Sprint 3)