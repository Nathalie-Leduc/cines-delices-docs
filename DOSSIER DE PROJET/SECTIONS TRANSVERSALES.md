# Dossier de Projet — Cinés Délices
### Titre Professionnel CDA RNCP Niveau 6 — O'Clock 2026
**Équipe :** Nathalie Leduc · Hameni Abanya · Vincent Duverger · Orianne Jaunet · Emilie Vatelin

---

## Éléments transversaux

### T.1 Qualité du code et sécurité

#### T.1.1 Respect des standards de code

Le code source respecte des conventions strictes appliquées via ESLint et Prettier, configurés dans les deux services (API et client). Ces outils sont intégrés au pipeline CI — une violation bloque le merge.

**Conventions appliquées :**
- Nommage en camelCase pour les variables et fonctions, PascalCase pour les composants React
- Modules ES (`import`/`export`) uniformément côté API et client
- Une fonction = une responsabilité (principe SRP)
- Composants React : un fichier par composant, dans un dossier éponyme
- SCSS : méthodologie BEM stricte (`.block__element--modifier`)
- Commits en anglais, convention Conventional Commits (`feat:`, `fix:`, `refactor:`)

**Revue de code systématique :**  
Chaque Pull Request nécessite l'approbation d'au moins un autre membre avant le merge. Les revues de code ont permis de détecter plusieurs bugs avant qu'ils n'atteignent la branche `develop` — notamment un appel `localStorage.removeItem()` direct dans un composant (contournant le state React), corrigé lors d'une revue.

---

#### T.1.2 Gestion des erreurs et exceptions

La gestion des erreurs est centralisée et cohérente à deux niveaux.

**Back-end — classe AppError et handler global :**

```javascript
// Classe d'erreur métier — distingue les erreurs attendues des erreurs techniques
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Handler Express global — dernière ligne de défense
app.use((err, req, res, next) => {
  const code = err.statusCode || 500;
  res.status(code).json({
    error: err.statusCode
      ? err.message                        // erreur métier : message lisible
      : 'Une erreur interne est survenue', // erreur technique : message générique
    // stack trace jamais exposée au client
  });
});
```

Les codes HTTP sont sémantiquement corrects : `400` (données invalides), `401` (non authentifié), `403` (non autorisé), `404` (ressource introuvable), `409` (conflit — email ou pseudo déjà utilisé).

**Front-end — états d'erreur explicites :**  
Chaque appel API est encapsulé dans un `try/catch`. Les états d'erreur sont affichés à l'utilisateur avec un message clair — jamais un écran vide. Les formulaires affichent les erreurs de validation champ par champ via `aria-live="polite"` pour les lecteurs d'écran.

---

#### T.1.3 Protection contre les vulnérabilités courantes (OWASP Top 10)

La sécurité a été intégrée dès la conception comme une préoccupation constante, et non ajoutée en fin de projet.

| Vulnérabilité OWASP | Contre-mesure implémentée |
|---------------------|--------------------------|
| **A01 — Broken Access Control** | Middlewares `authMiddleware` + `adminMiddleware` sur toutes les routes sensibles. Vérification ownership (RG-03) sur chaque modification de recette. |
| **A02 — Cryptographic Failures** | Mots de passe hashés avec Argon2id (résistant GPU, OWASP first choice 2024). JWT signé HS256, expiration 7 jours. Aucune donnée sensible en clair en base. |
| **A03 — Injection** | Prisma ORM paramétrise toutes les requêtes — injection SQL impossible par construction. Zod valide et assainit toutes les entrées côté serveur. |
| **A04 — Insecure Design** | Architecture découplée API/SPA. Proxy TMDB : la clé API n'est jamais exposée au client. Variables d'environnement pour tous les secrets. |
| **A05 — Security Misconfiguration** | Helmet.js configure automatiquement les headers HTTP de sécurité (X-Frame-Options, X-Content-Type-Options, HSTS, CSP). CORS restreint à `CLIENT_URL`. |
| **A07 — Auth Failures** | Rate-limit sur les routes auth (5 tentatives / 15 min par IP). Tokens JWT vérifiés à chaque requête protégée. |
| **A08 — Data Integrity** | Validation Zod systématique côté serveur. Contraintes d'intégrité référentielle en base (onDelete RESTRICT, CASCADE, SET NULL selon les règles métier). |
| **A09 — Logging Failures** | Logs Express en développement. Messages d'erreur génériques en production (pas de stack traces exposées). |
| **A10 — SSRF** | Proxy TMDB : seules les requêtes vers `api.themoviedb.org` sont autorisées — aucun appel à une URL arbitraire fournie par le client. |

---

#### T.1.4 Journalisation et audit (optionnel)

Les logs applicatifs en développement utilisent le middleware Morgan (format `dev`). En production sur Railway, les logs sont accessibles via l'interface Railway et conservés 7 jours. Les notifications in-app constituent un journal d'audit des événements métier (soumissions, validations, refus) persisté en base de données.

---

### T.2 Documentation et présentation

#### T.2.1 Clarté et structure du rapport

Ce dossier est structuré en suivant les trois blocs du référentiel CDA RNCP Niveau 6 :
- **Bloc 1** — Développer une application sécurisée (interfaces, composants métier, gestion de projet)
- **Bloc 2** — Concevoir et développer une application organisée en couches (architecture, BDD, documentation)
- **Bloc 3** — Préparer le déploiement d'une application sécurisée (tests, déploiement, DevOps)
- **Éléments transversaux** — Qualité, sécurité, RGPD, veille, éco-conception

Chaque section renvoie vers les annexes correspondantes pour les éléments visuels (wireframes, maquettes, diagrammes, captures d'écran) — le corps du dossier argumente et explique, les annexes illustrent.

---

#### T.2.2 Illustrations pertinentes

Les éléments visuels sont regroupés en annexes thématiques :

| Annexes | Contenu |
|---------|---------|
| A | Charte graphique complète |
| B–E | 22 wireframes et maquettes Desktop + Mobile |
| F | Rapports Lighthouse (Desktop et Mobile) |
| G | Diagramme d'architecture des couches |
| H | Diagramme de séquence — création d'une recette |
| I | Tableau des routes API avec niveaux d'accès |
| J | Planning Apothéose |
| K | Kanban complet (Sprints 1, 2, 3) |
| L | Graphe de l'historique Git |
| M | Cahier des charges Sprint 0 |
| N | User Stories complètes (MoSCoW) |
| O | Diagramme d'architecture complet |
| P | MCD (Mocodo) |
| Q | MLD + MPD / schéma Prisma |
| R | Capture Swagger UI en production |
| S–U | Documentation technique : fuzzy search, parser temps, pipeline Sharp |
| V | Guide de déploiement Railway |
| W | Capture Swagger UI production |
| X | Capture pipeline GitHub Actions |
| Y | Résultats npm audit |

---

#### T.2.3 Glossaire des termes techniques

| Terme | Définition |
|-------|-----------|
| **API REST** | Interface de programmation qui expose des ressources via des URLs et les verbes HTTP (GET, POST, PATCH, DELETE). Les données sont échangées en JSON. |
| **Argon2id** | Algorithme de hashage de mots de passe recommandé par l'OWASP. Résistant aux attaques GPU grâce à une consommation mémoire intentionnellement élevée. |
| **BEM** | Block Element Modifier — convention de nommage CSS. Ex : `.recipe-card__title--featured` = élément `title` du bloc `recipe-card` avec le modificateur `featured`. |
| **CI/CD** | Intégration Continue / Déploiement Continu. Automatisation des étapes de vérification (tests, lint) et de mise en production à chaque push de code. |
| **CORS** | Cross-Origin Resource Sharing. Mécanisme qui contrôle quels domaines peuvent faire des requêtes à une API. Configuré pour n'autoriser que l'URL du client. |
| **CRON** | Planificateur de tâches Unix. Ici utilisé via `node-cron` pour déclencher le nettoyage RGPD des comptes inactifs chaque lundi à 3h. |
| **Docker Compose** | Outil qui orchestre plusieurs conteneurs Docker. Ici : API + client + PostgreSQL démarrés ensemble avec une seule commande. |
| **Helmet.js** | Middleware Express qui configure automatiquement les headers HTTP de sécurité (protection XSS, clickjacking, MIME sniffing). |
| **JWT** | JSON Web Token. Jeton signé contenant l'identité de l'utilisateur (id, email, rôle). Envoyé à chaque requête dans le header `Authorization: Bearer`. |
| **Levenshtein** | Mesure de distance entre deux chaînes de caractères. "citon" → "citron" = distance 1 (une insertion). Utilisé pour le fuzzy search des ingrédients. |
| **MCD** | Modèle Conceptuel de Données. Représentation abstraite des entités métier et de leurs associations, sans considération technique. |
| **MLD** | Modèle Logique de Données. Traduction du MCD en tables relationnelles avec clés primaires et étrangères, indépendant du SGBD. |
| **MPD** | Modèle Physique de Données. Implémentation concrète du MLD pour un SGBD spécifique (ici PostgreSQL 18). |
| **Nixpacks** | Système de build de Railway. Détecte automatiquement le langage et construit l'image de déploiement sans Dockerfile. |
| **OWASP Top 10** | Liste des 10 vulnérabilités web les plus critiques, publiée par l'Open Web Application Security Project. Référence mondiale en sécurité applicative. |
| **Prisma** | ORM (Object-Relational Mapping) pour Node.js. Traduit les opérations JavaScript en requêtes SQL paramétrées et génère les types TypeScript. |
| **Rate-limit** | Limitation du nombre de requêtes par IP et par fenêtre de temps. Protège contre les attaques par force brute sur les routes d'authentification. |
| **RGAA** | Référentiel Général d'Amélioration de l'Accessibilité. Standard français d'accessibilité numérique basé sur les WCAG 2.1. |
| **RGPD** | Règlement Général sur la Protection des Données. Cadre européen réglementant la collecte et le traitement des données personnelles. |
| **Sharp** | Bibliothèque Node.js de traitement d'images. Utilisée pour convertir les images uploadées en WebP (−70% de poids) via Multer en mémoire. |
| **SPA** | Single Page Application. Application web dont le routing est géré côté client (React Router) — pas de rechargement de page entre les vues. |
| **Swagger / OpenAPI** | Standard de documentation des APIs REST. Swagger UI génère une interface interactive permettant de consulter et tester les endpoints. |
| **TMDB** | The Movie Database. API externe gratuite fournissant les métadonnées de films et séries (titre, affiche, synopsis, année). |
| **Trunk-based** | Stratégie Git où toutes les branches convergent rapidement vers une branche principale commune (`develop`), en évitant les branches longues. |
| **UUID** | Universally Unique Identifier. Identifiant de 128 bits garantissant l'unicité sans compteur auto-incrémental. Utilisé pour toutes les clés primaires. |
| **Vite** | Bundler JavaScript moderne. Démarrage quasi-instantané en développement et build optimisé avec code splitting automatique en production. |
| **WebP** | Format d'image moderne de Google offrant une compression supérieure au JPEG/PNG. Supporté par tous les navigateurs modernes. |
| **Zod** | Bibliothèque de validation de schémas TypeScript. Valide et assainit les données reçues côté serveur avant tout traitement. |

---

#### T.2.4 Démonstration fonctionnelle

Une démonstration live de l'application est disponible à l'adresse de production :

- **Frontend** : `https://graceful-quietude-production.up.railway.app`
- **API / Swagger** : `https://cines-delices-production.up.railway.app/api-docs`

**Parcours de démonstration prévu :**

1. Consultation du catalogue en tant que visiteur (recherche, filtres, détail recette)
2. Inscription d'un nouveau compte membre
3. Création d'une recette avec image, ingrédients (fuzzy search), média TMDB, temps
4. Soumission à validation (DRAFT → PENDING)
5. Connexion en tant qu'admin — notification reçue
6. Validation de la recette (PENDING → PUBLISHED)
7. Vérification de la notification reçue par le membre

> ➡️ **Annexe Z** — Captures d'écran des écrans clés de l'application en production

---

### T.3 Compétences en anglais — Executive Summary

**Cinés Délices — Project Summary**

Cinés Délices is a community recipe-sharing web application where each recipe is linked to a film or TV series. Users can browse a searchable, filterable catalogue of published recipes, create their own, and submit them for editorial review.

The application follows a decoupled architecture: a React 19 single-page application communicates with a Node.js/Express REST API backed by a PostgreSQL database managed through Prisma ORM. Authentication relies on JWT tokens and Argon2id password hashing. The TMDB external API is consumed server-side through a proxy to protect the API key.

Key technical achievements include: a real-time fuzzy ingredient search using Levenshtein distance, Sharp-powered WebP image compression reducing file sizes by 70%, a GDPR-compliant account deletion workflow with automated CRON jobs, and a four-job CI/CD pipeline on GitHub Actions.

The project was delivered in four one-week sprints by a five-developer team using Scrum methodology, deployed on Railway, and scored 98/97/96/92 on Lighthouse desktop metrics.

---

### T.4 Compétences transversales RNCP

#### T.4.1 Éco-conception

L'éco-conception a été intégrée comme une contrainte du projet dès le Sprint 0, et non ajoutée en post-production.

**Optimisation des images :**  
Le pipeline Multer → Sharp → WebP réduit le poids des images de 70% en moyenne par rapport au JPEG original. Les images sont redimensionnées à 800×600px maximum, évitant le transfert de résolutions inutiles vers des écrans mobiles.

**Code splitting par route :**  
React `lazy()` + `Suspense` divise le bundle JavaScript en chunks chargés à la demande. Un visiteur qui consulte uniquement le catalogue ne télécharge jamais le code du back-office admin.

```javascript
// Chargement différé — le code admin n'est téléchargé que si l'utilisateur y accède
const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));
```

**Pagination serveur :**  
Le catalogue retourne 12 recettes par page — jamais la totalité. Une requête coûteuse n'est exécutée que si l'utilisateur demande la page suivante.

**Cache HTTP (Caddyfile) :**  
Les assets statiques (JS, CSS, WebP) sont servis avec des headers `Cache-Control` longue durée (`max-age=31536000, immutable`). Un asset déjà téléchargé n'est plus retransféré lors des visites suivantes.

**Images Alpine :**  
Les images Docker utilisent la variante `alpine` (`node:24-alpine`, `postgres:18-alpine`) — plusieurs fois plus légères que les images complètes, réduisant la consommation de stockage et les temps de build.

**Requêtes Prisma optimisées :**  
Les requêtes `findMany` n'incluent que les champs nécessaires via `select` — jamais un `SELECT *` implicite. Les relations sont chargées uniquement quand elles sont nécessaires (`include`).

---

#### T.4.2 Veille technologique et sécuritaire

La veille a influencé directement plusieurs choix techniques du projet.

**Sources de veille utilisées :**

| Source | Fréquence | Utilisation concrète |
|--------|-----------|---------------------|
| OWASP (owasp.org) | Ponctuelle | Choix Argon2id (OWASP Password Storage Cheat Sheet), implémentation rate-limit |
| npm audit | À chaque sprint | Détection de vulnérabilités dans les dépendances |
| MDN Web Docs | Continue | Référence HTML/CSS/JS, attributs ARIA |
| Prisma Changelog | À chaque version | Migration Prisma 6 → 7 (adapter-pg natif, suppression champ `url` dans datasource) |
| Zod Changelog | À chaque version | Migration Zod 3 → 4 (correctif vulnérabilité ReDoS) |
| CNIL (cnil.fr) | Ponctuelle | Implémentation RGPD : durée de conservation des données (12 mois), consentement cookies |
| Tarteaucitron.js docs | Ponctuelle | Intégration bandeau CNIL, déclaration des cookies techniques |

**Impact concret de la veille :**
- La lecture du OWASP Password Storage Cheat Sheet a orienté le choix d'**Argon2id** plutôt que bcrypt, plus répandu mais moins recommandé
- La CVE sur **Zod 3** (vulnérabilité ReDoS sur les validations de chaînes longues) a déclenché la migration vers Zod 4 en Sprint 2
- La lecture de la documentation **Prisma 7** a révélé le changement de configuration du datasource, évitant un bug de déploiement Railway

---

#### T.4.3 Mentions légales et conformité RGPD

L'application implémente une conformité RGPD complète, conformément aux recommandations de la CNIL.

**Pages légales disponibles :**
- Mentions légales (responsable de traitement, hébergeur, coordonnées)
- Politique de confidentialité (données collectées, durée de conservation, droits des utilisateurs)
- Politique de cookies (liste des cookies, finalité, durée)
- Charte de modération (règles de publication, motifs de refus)

**Données personnelles collectées et traitées :**

| Donnée | Finalité | Durée de conservation |
|--------|----------|----------------------|
| Email | Authentification, notifications, RGPD | Durée du compte + 12 mois inactivité |
| Pseudo | Affichage public sur les recettes | Durée du compte |
| Mot de passe (hashé Argon2id) | Authentification | Durée du compte |
| Date de dernière connexion | Détection inactivité RGPD | Durée du compte |
| Recettes publiées | Contenu public | Conservées après suppression compte (userId → NULL) |
| Recettes DRAFT/PENDING | Contenu privé | Supprimées avec le compte |

**Consentement cookies — Tarteaucitron.js :**  
Le bandeau de consentement CNIL est géré par Tarteaucitron.js. Le cookie JWT d'authentification est déclaré comme cookie technique (ne nécessite pas de consentement car strictement nécessaire au service). Aucun cookie analytique ou publicitaire n'est déposé.

**Droit à l'oubli — suppression de compte :**  
La suppression d'un compte efface email, pseudo et mot de passe hashé. Les recettes PUBLISHED sont conservées avec `userId` mis à NULL et l'auteur affiché comme "Ancien membre" — le contenu communautaire n'est pas censuré, mais l'identité personnelle est protégée. Les recettes DRAFT et PENDING sont supprimées avec le compte.

**Automatisation RGPD — job CRON :**  
Un job planifié tourne chaque lundi à 3h00 et applique automatiquement la politique de durée de conservation : avertissement à 11 mois d'inactivité, suppression automatique à 12 mois.

---

#### T.4.4 Démarche structurée de résolution de problèmes

Plusieurs incidents techniques majeurs ont été résolus pendant le projet en suivant une démarche structurée : observation → diagnostic → hypothèse → correction → vérification.

**Exemple 1 — VITE_API_URL non injectée en production**

| Étape | Contenu |
|-------|---------|
| **Observation** | En production Railway, toutes les requêtes API échouent. La console affiche des erreurs `fetch` vers `localhost:3000`. |
| **Diagnostic** | Vite injecte les variables `VITE_*` au moment du build, pas au runtime. Si la variable n'est pas définie avant le build, elle est substituée par `undefined`. |
| **Hypothèse** | La variable `VITE_API_URL` a été ajoutée dans Railway après le premier build, qui s'est déclenché sans elle. |
| **Correction** | Ajout de la variable Railway + déclenchement manuel d'un rebuild complet (commit vide `git commit --allow-empty`). |
| **Vérification** | Inspection du bundle JS pour confirmer la présence de l'URL Railway (`grep` sur le fichier `index-[hash].js`). |

**Exemple 2 — Fusion d'ingrédients bloquée par contrainte FK RESTRICT**

| Étape | Contenu |
|-------|---------|
| **Observation** | L'admin tente de fusionner "citrons" dans "citron". L'API retourne une erreur 500 avec `Foreign key constraint failed`. |
| **Diagnostic** | La table `recipe_ingredients` a une contrainte `onDelete: RESTRICT` sur `ingredientId`. Supprimer "citrons" directement est impossible tant qu'il est utilisé. |
| **Hypothèse** | Il faut d'abord rediriger toutes les `recipe_ingredients` de l'ingrédient source vers l'ingrédient cible, puis supprimer la source. Et tout cela dans une transaction atomique. |
| **Correction** | Transaction Prisma `$transaction([updateMany, delete])` — les deux opérations réussissent ou aucune ne s'applique. |
| **Vérification** | Test d'intégration automatisé sur la route `/api/admin/ingredients/merge` avec les deux cas (succès et ingrédient inexistant). |

**Exemple 3 — Conflits Git récurrents sur CreateRecipe.jsx**

| Étape | Contenu |
|-------|---------|
| **Observation** | Plusieurs membres travaillent simultanément sur `CreateRecipe.jsx`. Les merges produisent des conflits complexes à résoudre. |
| **Diagnostic** | Le fichier (1800+ lignes) concentre trop de responsabilités — formulaire, gestion des ingrédients, TMDB, états, validation — attirant de nombreuses modifications en parallèle. |
| **Hypothèse** | Découper le fichier en composants thématiques réduira la surface de conflit. |
| **Correction** | Refactoring en Sprint 3 : extraction de `IngredientManager`, `MediaSearch`, `RecipeForm` en composants séparés + `recipeUtils.js` pour les fonctions partagées. |
| **Vérification** | Plus aucun conflit Git sur ces fichiers lors des merges suivants. Couverture de tests sur `recipeUtils.js` maintenue à 100%. |

> ➡️ **Annexe AA** — Journal des difficultés rencontrées et solutions apportées (tableau complet)