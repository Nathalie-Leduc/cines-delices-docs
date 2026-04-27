## Bloc 1 — Développer une application sécurisée

### 1.1 Installation et configuration de l'environnement

#### 1.1.1 Description de l'environnement de développement

L'équipe a travaillé sur des postes Ubuntu 22.04 LTS (machines de l'école) 
ainsi que sur des environnements personnels (macOS / Windows + WSL2 Ubuntu). 
Ce choix d'un socle Linux commun garantit la cohérence entre les environnements 
de développement et de production (Railway tourne sur Linux).

| Outil | Version | Rôle |
|-------|---------|------|
| VS Code | 1.88+ | IDE principal |
| Node.js | 24 LTS | Runtime JavaScript backend |
| pnpm | 9.x | Gestionnaire de paquets |
| PostgreSQL | 16 | Base de données relationnelle |
| Docker / Docker Compose | 29.1.5 | Conteneurisation |
| Git | 2.x | Versioning |
| API Rest Client | — | Tests des routes API |
| DBeaver | 24.x | Interface graphique BDD |

**Extensions VS Code utilisées :**
- *Prisma* — coloration syntaxique du schéma `.prisma`
- *ESLint* — détection des erreurs JS en temps réel
- *Prettier* — formatage automatique du code
- *GitLens* — visualisation de l'historique Git par ligne
- *REST Client* — tests rapides d'API sans quitter l'éditeur

---

#### 1.1.2 Justification des choix techniques

> **Analogie :** choisir ses outils, c'est comme choisir sa cuisine avant 
> d'ouvrir un restaurant — chaque équipement a un rôle précis qui répond 
> à un besoin concret du projet.

**React 19 + Vite + React Router v7**

React est une bibliothèque de composants qui permet de construire des 
interfaces dynamiques sans rechargement de page. Pour Ciné Délices, 
cette approche SPA (Single Page Application) est particulièrement adaptée : 
la navigation entre le catalogue, la fiche recette et le back-office admin 
est instantanée, ce qui correspond à l'expérience fluide attendue pour 
une plateforme de consultation. Vite assure un démarrage du serveur de 
développement quasi-instantané et un hot reload réactif, ce qui a 
considérablement accéléré les cycles de développement de l'équipe.

**Node.js 24 + Express 5**

Node.js permet d'utiliser JavaScript côté serveur, ce qui signifie que 
toute l'équipe partage le même langage sur les deux couches de 
l'application. Express 5 fournit un cadre minimaliste pour construire 
l'API REST : routage, middlewares, gestion des erreurs. Sa légèreté 
nous a permis de structurer l'architecture selon nos besoins (découpage 
en routers thématiques : recettes, auth, admin, TMDB) sans être 
contraints par un framework plus rigide.

**Prisma 6 (ORM)**

Prisma joue le rôle de traducteur entre le code JavaScript et la base 
de données PostgreSQL. Le schéma `.prisma` est la source de vérité 
unique : il décrit toutes les tables, relations et contraintes, puis 
génère automatiquement les types TypeScript correspondants. En pratique, 
VS Code connaît la structure exacte de la base de données et signale 
immédiatement toute faute de frappe sur un nom de colonne — une erreur 
qui passerait inaperçue jusqu'à l'exécution avec un ORM classique. 
Les migrations (`prisma migrate dev`) maintiennent un historique versionné 
des évolutions du schéma, consultable dans Git comme n'importe quel fichier.

**PostgreSQL 18**

PostgreSQL est un système de gestion de base de données relationnelle 
qui répond précisément aux besoins de Ciné Délices : le modèle de données 
est fortement relationnel (une recette est liée à un média TMDB, 
des ingrédients, une catégorie, un auteur). Les contraintes d'intégrité 
référentielle (clés étrangères, contraintes composites `@@unique`) 
garantissent la cohérence des données — par exemple, qu'un même film 
TMDB ne soit pas enregistré deux fois, ou qu'un ingrédient ne puisse 
pas être supprimé s'il est utilisé dans une recette publiée.

**Docker 29.1.5**

Docker permet à chaque membre de l'équipe de démarrer un environnement 
de développement identique en une seule commande, quelle que soit sa 
machine. Sans Docker, chaque développeur aurait dû installer et configurer 
PostgreSQL manuellement, avec des risques de divergences de version ou 
de configuration. Avec Docker Compose, les trois services (API, client, 
base de données) démarrent ensemble avec leurs dépendances et leurs 
variables d'environnement, dans le bon ordre (grâce au `healthcheck` 
sur PostgreSQL).

---

#### 1.1.3 Processus d'installation et de configuration

La documentation d'installation complète est disponible dans le `README.md` 
à la racine du dépôt. Elle permet à tout développeur de reproduire 
l'environnement en moins de 10 minutes sur une machine vierge.

**Démarrage rapide :**

```bash
# 1. Cloner le dépôt
git clone https://github.com/O-clock-Fusion/cines-delices.git
cd cines-delices

# 2. Configurer les variables d'environnement
cp api/.env.example api/.env
# → Renseigner TMDB_API_KEY et JWT_SECRET (voir section ci-dessous)

# 3. Démarrer tous les services
docker compose up
# → API   : http://localhost:3000
# → Client: http://localhost:5173
# → Swagger: http://localhost:3000/api-docs
```

> Docker Compose s'occupe du reste automatiquement : installation des 
> dépendances npm, génération des types Prisma, création des tables 
> (`db push`), puis démarrage des serveurs de développement.

**Variables d'environnement requises (`api/.env`) :**

| Variable | Exemple | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://cinesdelices:cinesdelices@db:5432/cinesdelices` | Connexion PostgreSQL (injectée par Docker Compose) |
| `JWT_SECRET` | `(64 chars aléatoires)` | Signature et vérification des tokens JWT |
| `TMDB_API_KEY` | `(clé v3 TMDB gratuite)` | Accès à l'API films/séries TMDB |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` | URL de base de l'API TMDB |
| `NODE_ENV` | `development` | Comportement du serveur Express |
| `CLIENT_URL` | `http://localhost:5173` | URL autorisée par le middleware CORS |

---

#### 1.1.4 Conteneurisation Docker

> **Analogie :** Docker, c'est livrer non seulement la recette, mais toute 
> la cuisine équipée — garantissant que le plat sera identique sur 
> n'importe quel plan de travail.

Le fichier `docker-compose.yml` orchestre trois services avec une 
attention particulière à l'ordre de démarrage :

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: cinesdelices
      POSTGRES_PASSWORD: cinesdelices
      POSTGRES_DB: cinesdelices
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cinesdelices"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    image: node:24-alpine
    working_dir: /app
    volumes:
      - ./api:/app
      - api_node_modules:/app/node_modules
    env_file:
      - ./api/.env
    environment:
      DATABASE_URL: postgresql://cinesdelices:cinesdelices@db:5432/cinesdelices
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    command: >
      sh -c "npm install && npx prisma generate 
             && npx prisma db push && npm run dev"

  client:
    image: node:24-alpine
    working_dir: /app
    volumes:
      - ./client:/app
      - client_node_modules:/app/node_modules
    environment:
      VITE_API_PROXY_TARGET: http://api:3000
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev -- --host"

volumes:
  api_node_modules:
  client_node_modules:
  db_data:
```

**Points notables de cette configuration :**

- Le service `api` utilise `depends_on` avec `condition: service_healthy` : 
  il ne démarre qu'une fois PostgreSQL prêt à accepter des connexions 
  (vérifié par `pg_isready`). Sans ça, Prisma tenterait de se connecter 
  avant que la base soit initialisée — comme essayer d'ouvrir un restaurant 
  avant que la cuisine soit allumée.
- Les volumes nommés `api_node_modules` et `client_node_modules` évitent 
  d'écraser les `node_modules` du conteneur avec ceux de la machine hôte, 
  qui peuvent différer (notamment si la machine hôte est Windows).
- `VITE_API_PROXY_TARGET` permet au client de contacter l'API via le nom 
  de service Docker (`http://api:3000`) plutôt qu'une IP, qui peut changer.
- Le volume `db_data` est persistant : `docker compose down` ne supprime 
  pas les données de la base (`docker compose down -v` le ferait).