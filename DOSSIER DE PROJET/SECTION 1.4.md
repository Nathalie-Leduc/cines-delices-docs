# Dossier de Projet — Cinés Délices
### Titre Professionnel CDA RNCP Niveau 6 — O'Clock 2026
**Équipe :** Nathalie Leduc · Hameni Abanya · Vincent Duverger · Orianne Jaunet · Emilie Vatelin

---

## Bloc 1 — Développer une application sécurisée

### 1.4 Gestion de projet

#### 1.4.1 Méthodologie — Scrum adapté

L'équipe a adopté la méthodologie **Scrum** adaptée au contexte pédagogique de la formation O'Clock.

Analogie : Scrum, c'est comme préparer un grand repas à 5 cuisiniers. On divise le menu en plats (sprints), chaque cuisinier prend en charge sa partie, et on goûte ensemble à la fin de chaque service (revue de sprint). Si un plat rate, on ajuste la recette au sprint suivant — sans tout recommencer depuis le début.

La règle adoptée par l'équipe : **chaque sprint se termine par un livrable déployé**. Tests et déploiement font partie intégrante de la définition de "fini" (Definition of Done) — pas seulement du code qui tourne en local.

**Cérémonies Scrum pratiquées :**

| Cérémonie | Fréquence | Mon rôle (Scrum Master) |
|-----------|-----------|-------------------------|
| Sprint Planning | Début de chaque sprint (vendredi) | Animation, création des issues avec labels, attribution |
| Daily Standup | Quotidien (15 min) | Facilitation, identification des blocages |
| Sprint Review / Démo | Fin de sprint (vendredi) | Présentation du travail accompli, démo live devant l'équipe pédagogique |
| Rétrospective | Fin de sprint | Identification des améliorations (Keep / Stop / Start) |

---

#### 1.4.2 Planning et suivi des tâches

**Calendrier officiel de l'Apothéose (fourni par O'Clock) :**

| Jalon | Date | Événement |
|-------|------|-----------|
| Lancement S0 | Lundi 09/03/2026 | Matinée certif + lancement Apothéose (Sprint 0 — conception) |
| Suivi hebdo | Mercredi 11/03/2026 | Point de suivi intermédiaire |
| Lancement S1 + rétro S0 | Vendredi 13/03/2026 | Démarrage Sprint 1 + rétrospective Sprint 0 |
| Suivi hebdo | Mercredi 18/03/2026 | Point de suivi intermédiaire |
| Lancement S2 + rétro S1 | Vendredi 20/03/2026 | Démarrage Sprint 2 + rétrospective Sprint 1 |
| Suivi hebdo | Mercredi 25/03/2026 | Point de suivi intermédiaire |
| Lancement S3 + rétro S2 | Vendredi 27/03/2026 | Démarrage Sprint 3 + rétrospective Sprint 2 |
| Jour des démos | Vendredi 03/04/2026 | Présentation finale devant jury |

> ➡️ **Annexe J** — Planning Apothéose complet

**Organisation en 4 sprints :**

| Sprint | Période | Focus principal | Ma contribution |
|--------|---------|-----------------|-----------------|
| Sprint 0 | Mars 2026 | Conception, architecture, maquettes, MCD/MLD/MPD | Dossier de conception, User Stories MoSCoW, MCD Mocodo, rôles équipe |
| Sprint 1 | 13 → 19/03/2026 | Back-end + Front-end + tests + déploiement | Schéma Prisma + seed, auth JWT+Argon2, middlewares, RGPD 3 volets, Sharp, déploiement Render |
| Sprint 2 | 20 → 26/03/2026 | Finalisation fonctionnalités + correctifs + tests + déploiement | Fuzzy search, merge ingrédients, parser temps, notifications, seed v4, migration Railway |
| Sprint 3 | 27/03 → 03/04/2026 | Polish, correctifs finaux, déploiement production stable | Correctifs images/ingrédients, déconnexion, refactoring, CI/CD GitHub Actions, 3 READMEs |

**Organisation du Kanban — mon rôle (Sprint 2) :**

Pour le Sprint 2, j'ai pris en charge la création et l'organisation complète du board : toutes les issues ont été créées et labellisées. Chaque membre s'est ensuite auto-assigné les tâches selon ses disponibilités et compétences au fil de la semaine — sans attribution forcée top-down.

**Labels structurés utilisés :**

| Label | Signification |
|-------|---------------|
| `BACK` | Tâche back-end (API, base de données) |
| `FRONT` | Tâche front-end (React, SCSS) |
| `CRITIQUE` | Bloquant — à traiter en priorité absolue |
| `CORRECTION` | Correctif sur du code existant |
| `NEW` | Nouvelle fonctionnalité |
| `DEPLOY` | Tâche de déploiement |
| `SWAGGER` | Documentation API Swagger |
| `DOCUMENTATION` | Documentation non-technique |
| `LUNDI` / `MARDI` / `MERCREDI` / `JEUDI` / `VENDREDI` | Jour cible dans le sprint |

**Colonnes du board Kanban :**

```
Backlog → Todo → In Progress → PR (Pull Request ouverte) → Test → Done
```

**Répartition des tâches par membre (Sprints 1 & 2) :**

Les rôles ci-dessous correspondent aux responsabilités définies lors du Sprint 0. Hameni Abanya a participé exclusivement au Sprint 0 (conception et wireframes).

| Membre | Rôle | Responsabilités |
|--------|------|-----------------|
| **Nathalie Leduc** | Fullstack / Scrum Master | Animation des cérémonies Scrum (sprint planning, daily, rétrospective), facilitation de la communication, supervision du backlog. Conception et développement de l'architecture serveur, définition du schéma de base de données, développement fullstack, rédaction des tests unitaires et d'intégration côté API. |
| **Hameni Abanya** | Lead Backend (Sprint 0 uniquement) | A participé exclusivement au Sprint 0. |
| **Vincent Duverger** | Lead Frontend | Mise en place de l'architecture frontend, création du design system (composants réutilisables, tokens visuels SCSS/BEM), garantie du responsive et de la conformité accessibilité WCAG/RGAA. |
| **Orianne Jaunet** | Fullstack | Développement de fonctionnalités couvrant toute la pile technique, intégration des services externes, tests automatisés (Vitest + Testing Library), audits qualité, implémentation de la sécurité (authentification, autorisation). |
| **Emilie Vatelin** | Fullstack | Développement de fonctionnalités fullstack, contribution à toutes les couches de l'application (UI, logique métier, API), participation aux revues de code. |

> ➡️ **Annexe K** — Kanban complet Cinés Délices (Sprints 1, 2 et 3)

---

#### 1.4.3 Gestion des versions Git

**Stratégie de branches — Trunk-based adapté :**

```
main          ← production uniquement (Railway auto-deploy sur push)
  └── develop ← branche de travail commune — base de toutes les features
        ├── feat/auth-jwt              ← Authentification JWT + Argon2
        ├── feat/recipes-crud          ← CRUD recettes back-end
        ├── feat/tmdb-proxy            ← Intégration API TMDB
        ├── feat/front-catalogue       ← Catalogue + fiche recette React
        ├── feat/front-create-recipe   ← Formulaire création recette
        ├── fix/fuzzy-ingredients      ← Correctif fuzzy search
        ├── refactor/recipe-utils      ← Centralisation utils
        └── chore/ci-github-actions    ← Pipeline CI/CD
```

Analogie : `main` c'est le livre publié, `develop` c'est le brouillon commun de l'équipe, et chaque branche `feat/` c'est un auteur qui rédige son chapitre en parallèle — sans perturber les autres.

**Convention de commits (Conventional Commits) :**

| Préfixe | Usage | Exemple |
|---------|-------|---------|
| `feat:` | Nouvelle fonctionnalité | `feat: add fuzzy search on ingredients` |
| `fix:` | Correction de bug | `fix: prevent duplicate ingredient creation` |
| `refactor:` | Refactoring sans changement de comportement | `refactor: centralize recipe utils` |
| `chore:` | Config, dépendances, outillage | `chore: add github actions workflow` |
| `docs:` | Documentation uniquement | `docs: update README deployment section` |
| `test:` | Ajout ou modification de tests | `test: add vitest for CreateRecipe component` |

Cette convention rend l'historique Git lisible comme un journal de bord : en parcourant les commits, on comprend l'évolution du projet sans ouvrir un seul fichier.

**Workflow Pull Request :**

1. Créer une branche depuis `develop` : `git checkout -b feat/nom-feature`
2. Développer et tester localement
3. Ouvrir une Pull Request vers `develop` sur GitHub
4. Review obligatoire par au moins un autre membre de l'équipe
5. Merge uniquement si la review est approuvée et les checks CI sont verts
6. Suppression de la branche après merge

**Remotes configurés :**

L'école fournit un repo partagé pour toute la promotion Francfort (Pas de fork possible). J'ai configuré un second remote personnel pointant vers mon fork pour pouvoir pousser et déclencher les déploiements Railway :

```bash
# Remote de l'équipe O'Clock 
git remote add origin https://github.com/O-clock-Francfort/cines-delices.git

# Remote personnel — mon fork (push + déploiement Railway)
git remote add perso https://github.com/Nathalie-Leduc/cines-delices.git

# Flux typique :
git pull origin develop           # récupérer les changements de l'équipe
git checkout -b feat/ma-feature   # créer sa branche
# ... développement ...
git push perso feat/ma-feature    # pousser sur mon fork
# → ouvrir une PR depuis le fork vers origin/develop sur GitHub
```

---

#### 1.4.4 Collaboration et communication

| Outil | Usage |
|-------|-------|
| **GitHub Projects** (Kanban) | Board avec colonnes : Backlog / Todo / In Progress / PR / Test / Done |
| **GitHub Issues + Labels** | Une tâche = une issue. Labels structurés (BACK/FRONT/CRITIQUE/NEW/JOUR) pour l'auto-assignation |
| **GitHub Pull Requests** | Code review — 1 approbation minimum avant merge dans `develop` |
| **Discord** | Communication quotidienne, partage de liens, résolution de blocages |
| **Swagger UI** (`/api-docs`) | Documentation vivante de l'API — consultable par toute l'équipe sans installation |

---

#### 1.4.5 Mise en place du repository GitHub

La structure du repository a été construite progressivement au fil des sprints.

**Sprint 0 — structure initiale :**
- Dossiers `api/` et `client/`
- `.gitignore` complet (`.env`, `node_modules/`, `dist/`, images WebP générées)
- `.env.example` dans chaque service pour documenter les variables sans exposer leurs valeurs
- `README.md` racine : présentation du projet, stack, commandes de démarrage

**Sprint 3 — documentation complète (réalisée par moi) :**
- `api/README.md` — documentation de l'API (routes, variables, scripts, sécurité)
- `client/README.md` — documentation du frontend (structure, rôles des dossiers, dépannage)
- `.github/workflows/ci.yml` — pipeline CI/CD (4 jobs : lint-client, test-client, lint-api, test-api-integration)

```
cines-delices/
├── .github/
│   └── workflows/
│       └── ci.yml            ← créé par moi (Sprint 3)
├── api/
│   ├── .env.example
│   ├── README.md             ← créé par moi (Sprint 3)
│   └── src/
├── client/
│   ├── .env.example
│   ├── README.md             ← créé par moi (Sprint 3)
│   └── src/
├── .gitignore
├── docker-compose.yml
└── README.md                 ← présent dès le Sprint 0
```

---

#### 1.4.6 Workflow Git choisi

Le workflow retenu est un **trunk-based development simplifié**, adapté à une équipe de 5 personnes sur 4 semaines :

- `main` stable, déployé automatiquement sur Railway à chaque push
- `develop` intègre le travail continu de toute l'équipe
- Branches courtes (2–3 jours max) par feature ou correctif
- Pas de branches `release/` ou `hotfix/` — la cadence des sprints suffit

Ce choix a été préféré à Gitflow, trop lourd en branches parallèles pour une période aussi courte, et au commit direct sur `main`, trop risqué sans filet de sécurité. Analogie : c'est un restaurant avec une cuisine de préparation (`develop`) et un comptoir de service (`main`) — on ne sert jamais directement depuis les plans de travail.

---

#### 1.4.7 Gestion des secrets et fichiers sensibles

Aucun secret n'est versionné dans Git. La protection opère à trois niveaux :

**Niveau 1 — `.gitignore` (développement) :**
```bash
.env          # variables d'environnement locales
node_modules/ # dépendances installées
dist/         # build généré
*.webp        # images converties par Sharp
```

**Niveau 2 — Variables Railway (production) :**  
Les secrets sont injectés directement dans l'interface Railway, par service (API et Client séparément), sans jamais toucher le code source.

**Niveau 3 — GitHub Secrets (CI/CD) :**
```yaml
# ci.yml — la valeur réelle n'apparaît jamais dans les logs
env:
  API_BASE_URL: ${{ secrets.API_BASE_URL }}
```

---

#### 1.4.8 Historique Git — évolution du projet

L'historique Git reflète fidèlement l'évolution sprint par sprint. Quelques commits représentatifs :

```bash
# Sprint 0 — Fondations
chore: initial project setup with Docker and Prisma schema
docs:  add conception dossier, MCD, user stories

# Sprint 1 — Back-end + premières features front
feat:  add JWT auth with Argon2 password hashing
feat:  add recipe CRUD with ownership check RG-03
feat:  add RGPD inactivity CRON with Nodemailer
feat:  add rate limiter on all routes
feat:  add Sharp WebP image pipeline (-70% weight)

# Sprint 2 — Correctifs + features avancées
feat:  add fuzzy search on ingredients (Levenshtein)
feat:  add ingredient merge for admin
fix:   force singular on ingredient names
fix:   admin notification upsert
feat:  add time parser (45min / 1h30 / 1:30 → minutes)
chore: seed v4 with real TMDB data

# Sprint 3 — Polish + déploiement final
chore: add GitHub Actions CI pipeline (4 jobs)
fix:   lighthouse mobile — code splitting + lazy loading
docs:  add api/README.md and client/README.md
chore: add Caddyfile HTTP cache headers for Railway
```

> ➡️ **Annexe J** — Planning Apothéose complet  
> ➡️ **Annexe K** — Kanban complet (Sprints 1, 2, 3)  
> ➡️ **Annexe L** — Graphe de l'historique Git (branches et merges)