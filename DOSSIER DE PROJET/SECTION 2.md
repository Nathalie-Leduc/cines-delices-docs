# Dossier de Projet — Cinés Délices
### Titre Professionnel CDA RNCP Niveau 6 — O'Clock 2026
**Équipe :** Nathalie Leduc · Hameni Abanya · Vincent Duverger · Orianne Jaunet · Emilie Vatelin

---

## Bloc 2 — Concevoir et développer une application sécurisée organisée en couches

### 2.1 Analyse des besoins

#### 2.1.1 Besoins fonctionnels et techniques

L'analyse des besoins a été conduite lors du Sprint 0 à partir d'ateliers d'équipe et d'une étude du cahier des charges. Elle a permis d'identifier trois grandes catégories de besoins.

**Besoins des visiteurs (non connectés) :**
- Consulter le catalogue de recettes, le filtrer par catégorie et le rechercher par titre ou film/série associé
- Accéder au détail complet d'une recette (ingrédients, étapes, temps, média associé)
- Parcourir les catalogues de films et séries ayant des recettes associées
- Créer un compte et se connecter

**Besoins des membres (connectés) :**
- Créer, modifier et supprimer ses propres recettes
- Enregistrer une recette en brouillon (DRAFT) avant soumission
- Soumettre une recette à validation (PENDING)
- Suivre le statut de ses recettes et recevoir des notifications
- Gérer son profil et supprimer son compte (droit à l'oubli RGPD)

**Besoins de l'administrateur :**
- Valider ou refuser les recettes soumises, avec motif de refus
- Gérer les catégories, les ingrédients (validation, fusion de doublons), les membres
- Consulter les notifications de soumission en temps réel

**Contraintes techniques identifiées :**
- Application mobile-first, responsive sur 3 tailles d'écran
- Conformité RGPD (consentement cookies, droit à l'oubli, mentions légales)
- Intégration de l'API externe TMDB pour les données films/séries
- Protection de la clé API TMDB via proxy serveur
- Performances Lighthouse ≥ 90 en desktop

> ➡️ **Annexe M** — Cahier des charges complet (Sprint 0)

---

#### 2.1.2 Cahier des charges et spécifications

Les spécifications fonctionnelles ont été formalisées sous forme de **User Stories** classées selon la méthode MoSCoW (Must / Should / Could / Won't), permettant de prioriser le périmètre du MVP.

**Extrait des User Stories principales :**

| Priorité | Acteur | En tant que... je veux... afin de... |
|----------|--------|--------------------------------------|
| Must | Visiteur | Consulter le catalogue de recettes afin de découvrir les recettes disponibles |
| Must | Visiteur | Rechercher une recette par titre ou film afin de trouver rapidement ce que je cherche |
| Must | Visiteur | Créer un compte afin d'accéder à l'espace membre |
| Must | Membre | Créer une recette avec image, ingrédients et étapes afin de partager ma création |
| Must | Membre | Soumettre ma recette à validation afin qu'elle soit publiée sur le catalogue |
| Must | Admin | Valider ou refuser une recette soumise afin de modérer le contenu |
| Should | Membre | Recevoir une notification quand ma recette est publiée ou refusée afin d'être informé |
| Should | Membre | Associer un film ou une série à ma recette via TMDB afin d'enrichir le contenu |
| Should | Visiteur | Réinitialiser mon mot de passe par email afin de récupérer mon accès |
| Could | Admin | Fusionner des ingrédients en doublon afin de maintenir la cohérence de la base |

> ➡️ **Annexe N** — User Stories complètes avec critères d'acceptation (MoSCoW)

---

### 2.2 Architecture logicielle

#### 2.2.1 Description de l'architecture

Ciné Délices repose sur une **architecture multicouche découplée** : le frontend et le backend sont deux applications indépendantes qui communiquent exclusivement via une API REST. Cette séparation est fondamentale — elle permet de faire évoluer l'une sans impacter l'autre, et ouvre la possibilité d'une application mobile future consommant la même API.

Analogie : c'est comme un restaurant avec une salle et une cuisine séparées. Les clients (React) ne rentrent pas en cuisine (Node.js) — ils passent commande via le serveur (API REST) et reçoivent leur plat.

**Vue d'ensemble de l'architecture :**

```
┌─────────────────────────────────────────────────────┐
│  CLIENT — React 19 + Vite (SPA)                      │
│  React Router v7 · SCSS/BEM · AuthContext            │
│  Déployé sur Railway (service client)                │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS — JSON (API REST)
                     │ VITE_API_URL
┌────────────────────▼────────────────────────────────┐
│  API — Node.js 24 + Express 5                        │
│  Middlewares → Routers → Controllers → Prisma        │
│  Déployé sur Railway (service api)                   │
└────────────────────┬────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────▼────────────────────────────────┐
│  BASE DE DONNÉES — PostgreSQL 18                     │
│  9 tables · UUID · Migrations versionnées            │
│  Déployé sur Railway (service PostgreSQL)            │
└─────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  API EXTERNE — TMDB (The Movie Database)             │
│  Proxy via le serveur Node.js (clé jamais exposée)  │
└─────────────────────────────────────────────────────┘
```

**Architecture back-end en couches (MVC) :**

Chaque requête HTTP traverse une chaîne de responsabilités bien définie :

```
Requête HTTP
  │
  ├── app.js            Middlewares globaux : Helmet, CORS, rate-limit
  ├── routes/*.js       Déclaration des endpoints REST
  ├── middlewares/      authMiddleware, adminMiddleware, validation Zod
  ├── controllers/      Logique métier (une fonction = une responsabilité)
  └── lib/prisma.js     Accès base de données via Prisma ORM
                │
                └── PostgreSQL 18
```

> ➡️ **Annexe O** — Diagramme d'architecture complet (composants + déploiement)

---

#### 2.2.2 Aspects de sécurité dans l'architecture

La sécurité a été intégrée dès la conception, selon le principe de **défense en profondeur** : plusieurs couches de protection indépendantes, de sorte qu'une faille sur une couche ne compromette pas l'ensemble.

| Couche | Mesure | Menace couverte |
|--------|--------|-----------------|
| Réseau | HTTPS en production (Railway) | Interception des communications |
| Serveur | Helmet.js (headers HTTP sécurisés) | XSS, clickjacking, MIME sniffing |
| Accès | Rate-limit (5 tentatives/15min sur auth) | Brute force sur le login |
| Auth | JWT signé (HS256, expiration 7j) | Usurpation d'identité |
| Mot de passe | Argon2id (résistant GPU, OWASP recommandé) | Vol de base de données |
| Données | Zod (validation côté serveur) | Injection de données malformées |
| BDD | Prisma ORM (requêtes paramétrées) | Injection SQL |
| Secrets | Variables d'environnement Railway | Exposition de clés API |
| TMDB | Proxy serveur | Exposition de la clé API TMDB au client |
| RGPD | Tarteaucitron.js + mentions légales | Non-conformité CNIL |

---

### 2.3 Conception de la base de données

#### 2.3.1 MCD — Modèle Conceptuel de Données

Le MCD a été réalisé avec l'outil **Mocodo** lors du Sprint 0. Il modélise les entités métier et leurs associations au niveau conceptuel, sans aucune considération technique (pas d'identifiant, pas de type de données).

Les entités principales identifiées sont : **UTILISATEUR**, **RECETTE**, **CATEGORIE**, **MEDIA** (film ou série TMDB), **INGREDIENT**, **GENRE**, **NOTIFICATION**.

Les associations principales :
- Un UTILISATEUR crée 0 à N RECETTES ; une RECETTE est créée par 1 UTILISATEUR
- Une RECETTE appartient à 1 CATEGORIE ; une CATEGORIE regroupe 0 à N RECETTES
- Une RECETTE est inspirée de 0 ou 1 MEDIA ; un MEDIA inspire 0 à N RECETTES
- Une RECETTE contient 1 à N INGREDIENTS (association avec quantité et unité)
- Un MEDIA appartient à 0 à N GENRES ; un GENRE regroupe 0 à N MEDIAS

> ➡️ **Annexe P** — MCD complet (Mocodo)

---

#### 2.3.2 MLD — Modèle Logique de Données

Le MLD traduit le MCD en tables relationnelles avec clés primaires et étrangères, sans préciser les types de données (niveau technique SGBD).

```
users          (__id__, email, pseudo, nom, password_hash, role,
                created_at, last_login_at, reset_token, reset_token_expires)

categories     (__id__, nom, description, color)

genres         (__id__, nom, tmdb_id)

media          (__id__, tmdb_id, titre, type, slug, poster_url,
                synopsis, annee, realisateur, created_at)

media_genres   (__#media_id__, __#genre_id__)           ← pivot N:N

recipes        (__id__, titre, slug, image_url, instructions,
                nombre_personnes, temps_preparation, temps_cuisson,
                status, rejection_reason,
                #user_id → users (SET NULL),
                #category_id → categories (RESTRICT),
                #media_id → media (RESTRICT),
                created_at, updated_at)

ingredients    (__id__, nom, approved)

recipe_ingredients  (__#recipe_id → recipes (CASCADE)__,
                     __#ingredient_id → ingredients (RESTRICT)__,
                     quantity, unit)                    ← pivot N:N

notifications  (__id__, type, message, is_read,
                #user_id → users (CASCADE),
                #recipe_id → recipes (SET NULL),
                created_at)
```

**Règles de suppression (onDelete) :**

| Relation | Politique | Justification |
|----------|-----------|---------------|
| `users → recipes` (userId) | SET NULL | Les recettes PUBLISHED survivent à la suppression du compte — droit à l'oubli sans censure du contenu |
| `recipes → recipe_ingredients` | CASCADE | Pas d'ingrédient orphelin — cohérence logique |
| `categories → recipes` | RESTRICT | Impossible de supprimer une catégorie utilisée — intégrité référentielle |
| `media → recipes` | RESTRICT | Un film ne peut pas être supprimé tant qu'il a des recettes associées |
| `users → notifications` | CASCADE | Les notifications n'ont aucun sens sans leur destinataire — nettoyage RGPD automatique |
| `recipes → notifications` | SET NULL | L'historique de notification reste visible même si la recette est supprimée |

> ➡️ **Annexe Q** — MLD complet + MPD (schéma Prisma et script SQL)

---

#### 2.3.3 Sécurité et protection des données (RGPD)

La conformité RGPD a été traitée à trois niveaux :

**Niveau 1 — Consentement et cookies :**
La bibliothèque Tarteaucitron.js gère le bandeau de consentement CNIL. Le JWT d'authentification est déclaré comme cookie technique (ne nécessite pas de consentement), les autres cookies analytiques sont soumis à consentement explicite.

**Niveau 2 — Droit à l'oubli :**
La suppression de compte efface toutes les données personnelles (email, pseudo, mot de passe hashé). Les recettes PUBLISHED sont conservées avec `userId` mis à NULL et l'auteur affiché comme "Ancien membre" — le contenu public n'est pas censuré, mais l'identité est protégée.

**Niveau 3 — Gestion de l'inactivité (CRON) :**
Un job planifié vérifie chaque lundi à 3h00 les comptes inactifs. À 11 mois d'inactivité, un email de prévenance est envoyé. À 12 mois, le compte est automatiquement supprimé conformément aux recommandations CNIL.

**Stockage sécurisé des mots de passe :**
Les mots de passe sont hashés avec **Argon2id**, algorithme recommandé par l'OWASP comme premier choix en 2024. Aucun mot de passe n'est jamais stocké en clair. Argon2id est résistant aux attaques GPU grâce à sa consommation mémoire intentionnellement élevée (64 MiB par hash).

---

### 2.4 Composants d'accès aux données

#### 2.4.1 ORM Prisma — utilisation et implémentation

Prisma 7 est l'ORM utilisé pour abstraire l'accès à PostgreSQL. Le fichier `schema.prisma` constitue la **source de vérité unique** de la base de données : il décrit toutes les tables, relations et contraintes, et génère automatiquement les types TypeScript correspondants.

Analogie : Prisma est le traducteur entre le JavaScript et le SQL. Au lieu d'écrire `SELECT * FROM recipes WHERE id = $1`, on écrit `prisma.recipe.findUnique({ where: { id } })` — plus lisible, typé, et impossible à injecter.

```javascript
// Exemple : récupération du catalogue avec pagination et filtres
const recipes = await prisma.recipe.findMany({
  where: {
    status: 'PUBLISHED',
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { media: { title: { contains: search, mode: 'insensitive' } } },
      ]
    }),
  },
  include: {
    category: true,
    media:    true,
    user:     { select: { pseudo: true } },
  },
  orderBy: { createdAt: 'desc' },
  skip:  (page - 1) * limit,
  take:  limit,
});
```

**Avantages concrets de Prisma sur ce projet :**
- VS Code détecte immédiatement toute faute de frappe sur un nom de colonne
- Les migrations sont versionnées dans Git comme n'importe quel fichier
- Les relations sont déclarées une fois dans le schéma, jamais à réécrire dans les requêtes

---

#### 2.4.2 Gestion des transactions

Les opérations qui modifient plusieurs tables simultanément utilisent des transactions Prisma — si l'une des opérations échoue, toutes sont annulées. Analogie : c'est comme un virement bancaire — soit les deux comptes sont mis à jour, soit aucun ne l'est.

```javascript
// Exemple : fusion de deux ingrédients (merge admin)
// Toutes les recettes utilisant l'ancien ingrédient pointent vers le nouveau,
// puis l'ancien ingrédient est supprimé — en une seule transaction atomique.
await prisma.$transaction([
  prisma.recipeIngredient.updateMany({
    where:  { ingredientId: sourceId },
    data:   { ingredientId: targetId },
  }),
  prisma.ingredient.delete({
    where: { id: sourceId },
  }),
]);
```

---

### 2.5 Documentation technique

#### 2.5.1 Documentation de l'API (Swagger / OpenAPI)

L'API REST est documentée avec **Swagger UI** (OpenAPI 3.0), accessible à l'adresse `/api-docs` en développement et en production. La documentation est générée automatiquement à partir des commentaires JSDoc au-dessus de chaque route.

Elle permet à tout développeur de consulter et tester les endpoints sans outil externe :

```javascript
/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Catalogue des recettes publiées
 *     tags: [Recettes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste paginée des recettes PUBLISHED
 */
router.get('/', getCatalog);
```

> ➡️ **Annexe R** — Capture de l'interface Swagger UI (`/api-docs`)

#### 2.5.2 Documentation du code source

Le code source est documenté à trois niveaux :

**Commentaires inline** : les fonctions complexes sont documentées en détail, à la fois par des commentaires dans le code et par des documents dédiés placés en annexe :

- **Fuzzy search des ingrédients** — algorithme à deux requêtes (contains exact + contains préfixe) avec tri par distance de Levenshtein et normalisation au singulier
- **Parser de temps** — conversion de formats libres (`45min`, `1h30`, `1:30`) en minutes entières stockées en base, avec reconversion à l'affichage
- **Pipeline Sharp/WebP** — traitement Multer mémoire → Sharp → WebP avec redimensionnement et compression, sans écriture du fichier original sur le disque

> ➡️ **Annexe S** — Documentation technique : Fuzzy search des ingrédients  
> ➡️ **Annexe T** — Documentation technique : Parser de temps  
> ➡️ **Annexe U** — Documentation technique : Pipeline Sharp/WebP

**README par service** : trois fichiers README couvrent respectivement la racine du projet (stack, démarrage, déploiement), l'API (routes, variables d'environnement, scripts) et le client (structure, rôles des dossiers, dépannage).

**Schéma Prisma auto-documenté** : le fichier `schema.prisma` sert de documentation vivante de la base de données — chaque modèle, relation et contrainte y est déclaré explicitement.

---

### 2.6 Organisation en couches et interopérabilité

#### 2.6.1 Architecture multicouche

L'application respecte une **architecture multicouche** avec trois niveaux bien identifiés :

| Couche | Technologie | Responsabilité |
|--------|-------------|----------------|
| **Présentation** | React 19 + React Router v7 | Affichage, navigation, interactions utilisateur |
| **Logique métier** | Node.js + Express 5 + Controllers | Règles métier, workflow, validation, sécurité |
| **Accès aux données** | Prisma 7 + PostgreSQL 18 | Persistance, transactions, intégrité référentielle |

Chaque couche communique uniquement avec la couche adjacente : le frontend ne parle jamais directement à la base de données, et les controllers ne génèrent jamais de HTML.

#### 2.6.2 Mécanismes d'interopérabilité

**API REST (JSON) :**
L'interface entre frontend et backend est une API REST qui échange des données au format JSON. Chaque endpoint respecte les conventions HTTP : verbes (`GET`, `POST`, `PATCH`, `DELETE`), codes de statut (`200`, `201`, `400`, `401`, `403`, `404`, `409`), et headers appropriés (`Content-Type: application/json`).

**Proxy TMDB :**
L'API externe TMDB est consommée côté serveur via un proxy Express. Le frontend ne connaît jamais la clé API TMDB — il appelle `/api/tmdb/medias/search?q=matrix` et le serveur fait l'appel TMDB en arrière-plan. C'est comme un intermédiaire qui protège l'identité du fournisseur.

```javascript
// Route proxy TMDB — la clé API n'est jamais exposée au client
router.get('/medias/search', authMiddleware, async (req, res) => {
  const response = await fetch(
    `${process.env.TMDB_BASE_URL}/search/multi?query=${req.query.q}`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
  );
  const data = await response.json();
  res.json(data); // seules les données utiles sont retransmises
});
```

**Format des réponses API :**
Toutes les réponses suivent une structure cohérente, facilitant la consommation côté React :

```json
// Succès
{ "data": [...], "total": 42, "page": 1, "limit": 12 }

// Erreur
{ "error": "Message explicite pour le développeur" }
```