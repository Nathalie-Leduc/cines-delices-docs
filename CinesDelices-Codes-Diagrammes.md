# ================================================================
# CINÉS DÉLICES — Codes des diagrammes v2
# Cohérent avec le projet réel (package.json + schema.prisma)
# ================================================================
# 1.  MCD Mocodo
# 2.  MLD (texte)
# 3.  MPD SQL (PostgreSQL 18)
# 4a. PlantUML — Use Cases Visiteur (UC01–UC09)
# 4b. PlantUML — Use Cases Membre (UC10–UC18)
# 4c. PlantUML — Use Cases Admin (UC20–UC25)
# 5.  PlantUML — Séquence : Ajout d'une recette
# 6.  PlantUML — Séquence : Association TMDB
# 7.  PlantUML — Diagramme de classes
# 8.  PlantUML — Diagramme d'états (RecipeStatus)
# 9.  PlantUML — Diagramme d'activité (workflow publication)
# 10. PlantUML — Diagramme de composants
# 11. Excalidraw — JSON complet (wireframes 7 pages D+M)
# 12. Figma — Guide maquettes
# ================================================================


# ╔══════════════════════════════════════════════════════════╗
# ║  1. MCD — Mocodo  →  https://mocodo.net                ║
# ╚══════════════════════════════════════════════════════════╝
# Règles : pas d'id, discriminants soulignés auto (1er champ),
# noms en français naturel, verbes à l'infinitif pour associations.
# Tip : coller le bloc entre les tirets dans l'éditeur Mocodo.
#
# Cardinalités :
#  UTILISATEUR (0,N)--CRÉER--(1,1) RECETTE
#    → un user crée 0..N recettes, une recette a 1 auteur
#  RECETTE (1,1)--APPARTENIR--(0,N) CATÉGORIE
#    → une recette a 1 catégorie, une catégorie regroupe 0..N recettes
#  RECETTE (1,1)--ÊTRE ASSOCIÉE--(0,N) MÉDIA
#    → une recette est liée à 1 média, un média inspire 0..N recettes
#  RECETTE (1,N)--CONTENIR--(0,N) INGRÉDIENT : quantité, unité
#    → 1 recette contient 1..N ingrédients (avec qty/unit)
#  UTILISATEUR (0,N)--RECEVOIR--(1,1) NOTIFICATION
#    → 1 user reçoit 0..N notifications
#  MÉDIA (0,N)--POSSÉDER--(0,N) GENRE
#    → Many-to-Many via media_genres

---MOCODO_CODE---
UTILISATEUR: email, pseudo, nom, rôle, dernière connexion
CRÉER, 0N UTILISATEUR, 11 RECETTE
RECETTE: titre, slug, statut, motif refus, nombre personnes, temps préparation, temps cuisson, photo

:
APPARTENIR, 11 RECETTE, 0N CATÉGORIE
CATÉGORIE: nom, description, couleur
:
ÊTRE ASSOCIÉE, 0N RECETTE, 11 MÉDIA
MÉDIA: identifiant TMDB, titre, type, slug, affiche, synopsis, année, réalisateur

:

CONTENIR, 1N RECETTE, 0N INGRÉDIENT: quantité, unité
INGRÉDIENT: nom, approuvé

:
RECEVOIR, 0N UTILISATEUR, 11 NOTIFICATION
NOTIFICATION: type, message, lu

:
POSSÉDER, 0N MÉDIA, 0N GENRE
GENRE: identifiant TMDB genre, nom

---FIN_MOCODO---


# ╔══════════════════════════════════════════════════════════╗
# ║  2. MLD — Modèle Logique de Données                    ║
# ╚══════════════════════════════════════════════════════════╝
# Notation : __champ__ = PK  |  #FK(table.champ) = FK

---MLD---
users (
  __id__,
  email,
  pseudo,
  nom,
  password_hash,
  role,
  created_at,
  last_login_at,
  reset_token,
  reset_token_expires
)

categories (
  __id__,
  nom,
  description,
  color
)

genres (
  __id__,
  nom,
  tmdb_genre_id
)

media (
  __id__,
  tmdb_id,
  titre,
  slug,
  type,
  poster_url,
  synopsis,
  annee,
  realisateur,
  created_at
)

media_genres [TABLE PIVOT] (
  __media_id__ #FK(media.id),
  __genre_id__  #FK(genres.id)
)

recipes (
  __id__,
  titre,
  slug,
  image_url,
  instructions,
  nombre_personnes,
  temps_preparation,
  temps_cuisson,
  status,
  rejection_reason,
  admin_edited_since_submission,
  admin_edited_ingredients_since_submission,
  admin_edited_fields_summary,
  user_id      #FK(users.id)      [nullable — SET NULL],
  category_id  #FK(categories.id) [RESTRICT],
  media_id     #FK(media.id)      [RESTRICT],
  created_at,
  updated_at
)

ingredients (
  __id__,
  nom,
  approved
)

recipe_ingredients [TABLE PIVOT avec attributs] (
  __recipe_id__     #FK(recipes.id)     [CASCADE],
  __ingredient_id__ #FK(ingredients.id) [RESTRICT],
  quantity,
  unit
)

notifications (
  __id__,
  type,
  message,
  is_read,
  user_id   #FK(users.id)   [CASCADE],
  recipe_id #FK(recipes.id) [nullable — SET NULL],
  created_at
)
---FIN_MLD---


# ╔══════════════════════════════════════════════════════════╗
# ║  3. MPD — PostgreSQL 18                                ║
# ╚══════════════════════════════════════════════════════════╝

---MPD_SQL---
-- Enums
CREATE TYPE "Role"             AS ENUM ('MEMBER', 'ADMIN');
CREATE TYPE "RecipeStatus"     AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED');
CREATE TYPE "MediaType"        AS ENUM ('MOVIE', 'SERIES');
CREATE TYPE "NotificationType" AS ENUM ('RECIPE_SUBMITTED');

-- users
CREATE TABLE users (
  id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email               VARCHAR(255) UNIQUE NOT NULL,
  pseudo              VARCHAR(100) UNIQUE NOT NULL,
  nom                 VARCHAR(255),
  password_hash       VARCHAR(255) NOT NULL,
  role                "Role"       NOT NULL DEFAULT 'MEMBER',
  created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
  last_login_at       TIMESTAMP,
  reset_token         VARCHAR(255),
  reset_token_expires TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);

-- categories
CREATE TABLE categories (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom         VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color       VARCHAR(7)
);

-- genres
CREATE TABLE genres (
  id           TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom          VARCHAR(100) NOT NULL,
  tmdb_genre_id INT    UNIQUE NOT NULL
);

-- media
CREATE TABLE media (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tmdb_id     INT         NOT NULL,
  titre       VARCHAR(255) NOT NULL,
  slug        VARCHAR(300) UNIQUE NOT NULL,
  type        "MediaType"  NOT NULL,
  poster_url  VARCHAR(500),
  synopsis    TEXT,
  annee       INT,
  realisateur VARCHAR(255),
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (tmdb_id, type)   -- @@unique([tmdbId, type]) Prisma
);
CREATE INDEX idx_media_slug ON media(slug);
CREATE INDEX idx_media_type ON media(type);

-- media_genres (pivot Many-to-Many)
CREATE TABLE media_genres (
  media_id TEXT NOT NULL REFERENCES media(id)   ON DELETE CASCADE,
  genre_id TEXT NOT NULL REFERENCES genres(id)  ON DELETE CASCADE,
  PRIMARY KEY (media_id, genre_id)
);

-- recipes
CREATE TABLE recipes (
  id                                         TEXT           PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titre                                      VARCHAR(255)   NOT NULL,
  slug                                       VARCHAR(300)   UNIQUE NOT NULL,
  image_url                                  VARCHAR(500),
  instructions                               TEXT           NOT NULL,
  nombre_personnes                           INT,
  temps_preparation                          INT,           -- minutes
  temps_cuisson                              INT,           -- minutes
  status                                     "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
  rejection_reason                           TEXT,
  admin_edited_since_submission              BOOLEAN        NOT NULL DEFAULT FALSE,
  admin_edited_ingredients_since_submission  BOOLEAN        NOT NULL DEFAULT FALSE,
  admin_edited_fields_summary                TEXT,
  user_id                                    TEXT           REFERENCES users(id)      ON DELETE SET NULL,
  category_id                                TEXT           NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  media_id                                   TEXT           NOT NULL REFERENCES media(id)      ON DELETE RESTRICT,
  created_at                                 TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at                                 TIMESTAMP      NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recipes_slug              ON recipes(slug);
CREATE INDEX idx_recipes_status            ON recipes(status);
CREATE INDEX idx_recipes_status_category   ON recipes(status, category_id);
CREATE INDEX idx_recipes_user              ON recipes(user_id);
CREATE INDEX idx_recipes_category          ON recipes(category_id);
CREATE INDEX idx_recipes_media             ON recipes(media_id);

-- ingredients
CREATE TABLE ingredients (
  id       TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom      VARCHAR(255) UNIQUE NOT NULL,
  approved BOOLEAN      NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_ingredients_nom ON ingredients(nom);

-- recipe_ingredients (pivot avec attributs)
CREATE TABLE recipe_ingredients (
  recipe_id     TEXT NOT NULL REFERENCES recipes(id)     ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity      VARCHAR(100),
  unit          VARCHAR(50),
  PRIMARY KEY (recipe_id, ingredient_id)
);

-- notifications
CREATE TABLE notifications (
  id         TEXT              PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type       "NotificationType" NOT NULL,
  message    TEXT              NOT NULL,
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  user_id    TEXT              NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  recipe_id  TEXT              REFERENCES recipes(id)          ON DELETE SET NULL,
  created_at TIMESTAMP         NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notif_created   ON notifications(created_at);
---FIN_MPD---


# ╔══════════════════════════════════════════════════════════╗
# ║  4a. PlantUML — Use Cases Visiteur (UC01–UC09)         ║
# ║  URL : https://www.plantuml.com/plantuml/uml/          ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_UC_VISITEUR---
@startuml UC_Visiteur
skinparam backgroundColor #F6F1E8
skinparam actorBorderColor #4A3428
skinparam actorBackgroundColor #F6F1E8
skinparam usecaseBorderColor #C9A45C
skinparam usecaseBackgroundColor #FFFBEF
skinparam arrowColor #8E1F2F
skinparam packageBorderColor #4A3428
skinparam noteBackgroundColor #FFFBEF
skinparam noteBorderColor #C9A45C
title Use Cases 1/3 — Visiteur Anonyme · Cinés Délices

actor "Visiteur\nAnonyme" as V

rectangle "Espace Public (sans authentification)" {
  usecase "UC01\nVoir la page d'accueil" as UC01
  usecase "UC02\nConsulter le catalogue\ndes recettes" as UC02
  usecase "UC03\nConsulter le détail\nd'une recette" as UC03
  usecase "UC04\nConsulter le catalogue\ndes films" as UC04
  usecase "UC05\nConsulter le catalogue\ndes séries" as UC05
  usecase "UC06\nS'inscrire" as UC06
  usecase "UC07\nSe connecter" as UC07
  usecase "UC08\nRéinitialiser\nson mot de passe" as UC08
  usecase "UC09\nContacter l'équipe" as UC09
}

V --> UC01
V --> UC02
V --> UC03
V --> UC04
V --> UC05
V --> UC06
V --> UC07
V --> UC08
V --> UC09

UC03 .> UC06 : <<extend>>\n(invitation inscription)
UC03 .> UC07 : <<extend>>\n(invitation connexion)

note right of UC02
  Recherche temps réel
  (debounce 400ms)
  sur titre recette
  OU titre film/série
end note

note right of UC08
  POST /api/auth/forgot-password
  POST /api/auth/reset-password
  Token + expiration (Argon2)
end note

note right of UC09
  POST /api/contact
  Email via Nodemailer
end note
@enduml

---FIN_PLANTUML_UC_VISITEUR---


---PLANTUML_UC_MEMBRE---
@startuml UC_Membre
skinparam backgroundColor #F6F1E8
skinparam actorBorderColor #4A3428
skinparam actorBackgroundColor #F6F1E8
skinparam usecaseBorderColor #C9A45C
skinparam usecaseBackgroundColor #FFFBEF
skinparam arrowColor #8E1F2F
skinparam packageBorderColor #4A3428
skinparam noteBackgroundColor #FFFBEF
skinparam noteBorderColor #C9A45C
title Use Cases 2/3 — Membre Connecté · Cinés Délices

actor "Visiteur\nAnonyme" as V
actor "Membre\nConnecté" as M
V <|-- M

rectangle "Espace Public (hérité)" {
  usecase "Catalogue, détail,\nfilms, séries..." as UCH
}
V --> UCH

rectangle "Espace Membre (JWT requis)" {
  usecase "UC10\nVoir mes recettes" as UC10
  usecase "UC11\nCréer une recette" as UC11
  usecase "UC12\nModifier ma recette" as UC12
  usecase "UC13\nSoumettre pour\npublication" as UC13
  usecase "UC14\nSupprimer ma recette" as UC14
  usecase "UC15\nGérer mon profil" as UC15
  usecase "UC16\nVoir mes notifications" as UC16
  usecase "UC17\nSe déconnecter" as UC17
  usecase "UC18\nRechercher un média\nTMDB (autocomplétion)" as UC18
}

M --> UC10
M --> UC11
M --> UC12
M --> UC13
M --> UC14
M --> UC15
M --> UC16
M --> UC17
M --> UC18

UC11 .> UC18 : <<include>>\n(obligatoire)
UC12 .> UC10 : <<include>>\n(accès liste d'abord)
UC13 .> UC10 : <<include>>\n(accès liste d'abord)
UC14 .> UC10 : <<include>>\n(accès liste d'abord)

note right of UC11
  POST /api/recipes
  multipart/form-data
  Multer + Sharp → WebP
  status = DRAFT
end note

note right of UC13
  PATCH /api/recipes/:id/submit
  DRAFT → PENDING
  Notification admin créée
end note

note right of UC18
  GET /api/tmdb/medias/search?q=
  Debounce 400ms côté front
  Snapshot local + cache affiche
end note
@enduml
---FIN_PLANTUML_UC_MEMBRE---


---PLANTUML_UC_ADMIN---
@startuml UC_Admin
skinparam backgroundColor #F6F1E8
skinparam actorBorderColor #4A3428
skinparam actorBackgroundColor #F6F1E8
skinparam usecaseBorderColor #C9A45C
skinparam usecaseBackgroundColor #FFFBEF
skinparam arrowColor #8E1F2F
skinparam packageBorderColor #4A3428
skinparam noteBackgroundColor #FFFBEF
skinparam noteBorderColor #C9A45C
title Use Cases 3/3 — Administrateur · Cinés Délices

actor "Membre\nConnecté" as M
actor "Administrateur" as A
M <|-- A

rectangle "Droits Membre (hérités)" {
  usecase "Créer, modifier,\nsoumettre ses propres recettes" as UCM
}
M --> UCM

rectangle "Back-Office Admin (JWT + rôle ADMIN)" {
  usecase "UC20\nValider les recettes\nPENDING" as UC20
  usecase "UC21\nGérer toutes\nles recettes" as UC21
  usecase "UC22\nValider les ingrédients\nen attente" as UC22
  usecase "UC23\nGérer les catégories" as UC23
  usecase "UC24\nGérer les utilisateurs" as UC24
  usecase "UC25\nGérer les notifications\nadmin" as UC25
}

A --> UC20
A --> UC21
A --> UC22
A --> UC23
A --> UC24
A --> UC25

UC20 .> UC21 : <<include>>\n(accès liste d'abord)

note right of UC20
  PATCH .../publish → PUBLISHED
  PATCH .../reject  → DRAFT + motif
end note

note right of UC22
  PATCH .../approve
  POST  .../merge (doublons)
  onDelete: RESTRICT si utilisé
end note

note right of UC23
  CRUD complet
  DELETE bloqué si recettes liées
  (onDelete: RESTRICT en BDD)
end note

note bottom of A
  Double middleware :
  authMiddleware (JWT valide)
  adminMiddleware (role = ADMIN)
  → 403 Forbidden sinon
end note
@enduml

---FIN_PLANTUML_UC_ADMIN---


# ╔══════════════════════════════════════════════════════════╗
# ║  5. PlantUML — Séquence : Ajout d'une recette          ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_SEQ_RECETTE---
@startuml Sequence_AjoutRecette
skinparam backgroundColor #F6F1E8
skinparam sequenceArrowColor #8E1F2F
skinparam sequenceLifeLineBorderColor #4A3428
skinparam sequenceParticipantBorderColor #C9A45C
skinparam sequenceParticipantBackgroundColor #FFFBEF
skinparam noteBackgroundColor #FFFBEF
skinparam noteBorderColor #C9A45C
title Sequence - Ajout d'une recette (membre connecte)

actor "Membre" as U
participant "React 19\n(Frontend)" as F
participant "Express 5\n(RecipesController)" as API
participant "Middleware\nJWT" as JWT
participant "Zod 4\n(Validator)" as ZOD
participant "Multer+Sharp\n(Upload WebP)" as IMG
database "PostgreSQL 18\n(Prisma 7)" as DB

== 1. Saisie du formulaire ==
U -> F : Remplit titre, categorie,\nfilm TMDB, ingredients, photo
F -> F : Validation cote client\n(champs requis, taille photo)

== 2. Envoi POST multipart/form-data ==
F -> API : POST /api/recipes\nAuthorization: Bearer JWT
API -> JWT : Verification du token

alt JWT invalide
  JWT --> API : 401 Unauthorized
  API --> F : error: Non authentifie
  F --> U : Message d'erreur
else JWT valide
  JWT --> API : userId extrait
end

== 3. Traitement de l'image ==
API -> IMG : Multer recoit le buffer
IMG -> IMG : Sharp convertit en WebP\net redimensionne
IMG --> API : chemin /uploads/recipes/xxx.webp

== 4. Validation Zod ==
API -> ZOD : validate(createRecipeSchema)

alt Donnees invalides
  ZOD --> API : 400 errors
  API --> F : Erreurs par champ
  F --> U : Affiche les erreurs
else Donnees valides
  ZOD --> API : donnees propres
end

== 5. Creation en base (Prisma) ==
API -> DB : findOrCreate(ingredients)\nnormalisation (trim+lowercase)
DB --> API : ingredientIds[]

API -> DB : prisma.recipe.create(\n  titre, slug, imageURL,\n  userId, categoryId, mediaId,\n  status: DRAFT)
DB --> API : recipe { id, slug }

API -> DB : prisma.recipeIngredient.createMany(\n  [{ recipeId, ingredientId, qty, unit }])
DB --> API : OK

== 6. Reponse ==
API --> F : 201 Created\n{ data: { id, slug, status: DRAFT } }
F --> U : Redirect /membre/mes-recettes\nRecette enregistree en brouillon

@enduml
---FIN_PLANTUML_SEQ_RECETTE---


# ╔══════════════════════════════════════════════════════════╗
# ║  6. PlantUML — Séquence : Association TMDB             ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_SEQ_TMDB---
@startuml Sequence_TMDB
skinparam backgroundColor #F6F1E8
skinparam sequenceArrowColor #8E1F2F
skinparam sequenceLifeLineBorderColor #4A3428
skinparam sequenceParticipantBorderColor #C9A45C
skinparam sequenceParticipantBackgroundColor #FFFBEF
skinparam noteBackgroundColor #FFFBEF
skinparam noteBorderColor #C9A45C
title Séquence — Association film/série via TMDB

actor "Membre" as U
participant "React 19\n(Formulaire)" as F
participant "Express 5\n(TMDBController)" as API
participant "node-cache\n(Cache mémoire)" as CACHE
participant "API TMDB\n(externe)" as TMDB
participant "Sharp\n(PosterService)" as SHARP
database "PostgreSQL 18\n(Prisma 7)" as DB

== 1. Saisie dans le champ autocomplétion ==
U -> F : Tape "Ratatouille"
F -> F : Debounce 400ms

== 2. Recherche TMDB avec cache ==
F -> API : GET /api/tmdb/medias/search?q=ratatouille\nBearer JWT
API -> CACHE : get("search:ratatouille")
alt Cache hit
  CACHE --> API : résultats en cache
else Cache miss
  API -> TMDB : GET /search/multi?query=ratatouille
  TMDB --> API : résultats (films + séries)
  API -> CACHE : set("search:ratatouille", résultats, TTL)
end
API --> F : [{ tmdbId, titre, annee, type, posterPath }]
F --> U : Liste déroulante de résultats

== 3. Sélection d'un média ==
U -> F : Sélectionne "Ratatouille (2007) — MOVIE"
F -> API : GET /api/tmdb/medias/MOVIE/2062\nBearer JWT
API -> DB : SELECT * FROM media\nWHERE tmdb_id=2062 AND type='MOVIE'

alt Média déjà en base
  DB --> API : media { id: "uuid-existant" }
else Nouveau média
  API -> TMDB : GET /movie/2062 + /movie/2062/credits
  TMDB --> API : détails complets
  API -> SHARP : downloadAndCachePoster("/path/poster.jpg")
  SHARP --> API : "/public/posters/ratatouille-2007.webp"
  API -> DB : INSERT INTO media\n{ tmdbId, titre, slug, type,\n  posterUrl, synopsis, annee, realisateur }
  DB --> API : media { id: "uuid-nouveau" }
  API -> DB : INSERT INTO media_genres\npour chaque genre TMDB
end

== 4. Retour au formulaire ==
API --> F : { media: { id, titre, posterUrl, annee } }
F --> U : Affiche affiche + titre dans le formulaire\nmediaId mémorisé pour la soumission
@enduml

---FIN_PLANTUML_SEQ_TMDB---


# ╔══════════════════════════════════════════════════════════╗
# ║  7. PlantUML — Diagramme de classes                    ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_CLASSES---
@startuml Classes_CinesDelices

skinparam backgroundColor #F6F1E8
skinparam classBackgroundColor #FFFBEF
skinparam classBorderColor #C9A45C
skinparam classHeaderBackgroundColor #d4eb9e
skinparam classFontColor #1F1D1E
skinparam classStereotypeFontColor #d1273e
skinparam arrowColor #8E1F2F
skinparam packageBorderColor #d4eb9e
skinparam packageBackgroundColor #F6F1E8

title Diagramme de Classes -- Cines Delices (cote serveur)

' ── Enums ─────────────────────────────────────────────────
enum Role {
  MEMBER
  ADMIN
}

enum RecipeStatus {
  DRAFT
  PENDING
  PUBLISHED
}

enum MediaType {
  MOVIE
  SERIES
}

enum NotificationType {
  RECIPE_SUBMITTED
}

' ── Modeles Prisma ────────────────────────────────────────
class User <<model>> {
  + id : String
  + email : String
  + pseudo : String
  + nom : String
  - passwordHash : String
  + role : Role
  + createdAt : DateTime
  + lastLoginAt : DateTime
  + resetToken : String
  + resetTokenExpires : DateTime
}

class Category <<model>> {
  + id : String
  + nom : String
  + description : String
  + color : String
}

class Genre <<model>> {
  + id : String
  + nom : String
  + tmdbGenreId : Int
}

class Media <<model>> {
  + id : String
  + tmdbId : Int
  + titre : String
  + slug : String
  + type : MediaType
  + posterUrl : String
  + synopsis : String
  + annee : Int
  + realisateur : String
}

class Recipe <<model>> {
  + id : String
  + titre : String
  + slug : String
  + imageURL : String
  + instructions : String
  + nombrePersonnes : Int
  + tempsPreparation : Int
  + tempsCuisson : Int
  + status : RecipeStatus
  + rejectionReason : String
  + adminEditedSinceSubmission : Boolean
  + adminEditedIngredientsSinceSubmission : Boolean
  + adminEditedFieldsSummary : String
  + userId : String
  + categoryId : String
  + mediaId : String
}

class Ingredient <<model>> {
  + id : String
  + nom : String
  + approved : Boolean
}

class RecipeIngredient <<model>> {
  + recipeId : String
  + ingredientId : String
  + quantity : String
  + unit : String
}

class Notification <<model>> {
  + id : String
  + type : NotificationType
  + message : String
  + isRead : Boolean
  + userId : String
  + recipeId : String
}

' ── Controllers ──────────────────────────────────────────
class AuthController <<controller>> {
  + register(req, res)
  + login(req, res)
  + logout(req, res)
  + forgotPassword(req, res)
  + resetPassword(req, res)
}

class UserController <<controller>> {
  + getMe(req, res)
  + updateMe(req, res)
  + updatePassword(req, res)
  + deleteMe(req, res)
  + getMyNotifications(req, res)
  + markNotificationRead(req, res)
  + deleteNotification(req, res)
}

class RecipesController <<controller>> {
  + getAllPublished(req, res)
  + getOne(req, res)
  + getMyRecipes(req, res)
  + create(req, res)
  + update(req, res)
  + submit(req, res)
  + delete(req, res)
}

class AdminController <<controller>> {
  + getAllRecipes(req, res)
  + getPending(req, res)
  + publish(req, res)
  + reject(req, res)
  + adminDelete(req, res)
  + getUsers(req, res)
  + updateRole(req, res)
  + deleteUser(req, res)
  + getIngredients(req, res)
  + approve(req, res)
  + merge(req, res)
}

class TMDBController <<controller>> {
  + search(req, res)
  + getById(req, res)
}

class MediaController <<controller>> {
  + getMovies(req, res)
  + getMovieBySlug(req, res)
  + getSeries(req, res)
  + getSeriesBySlug(req, res)
}

' ── Middlewares ───────────────────────────────────────────
class AuthMiddleware <<middleware>> {
  + authMiddleware(req, res, next)
}

class AdminMiddleware <<middleware>> {
  + adminMiddleware(req, res, next)
}

' ── Services ──────────────────────────────────────────────
class PosterService <<service>> {
  + downloadAndCachePoster(path) : String
}

class TMDBCache <<service>> {
  + search(query) : Object[]
  + getById(type, id) : Object
}

class InactivityJob <<job>> {
  + run() : void
}

' ── Relations modeles ─────────────────────────────────────
User       "1" *-- "0..*" Recipe           : cree (SetNull)
Category   "1" *-- "0..*" Recipe           : classifie (Restrict)
Media      "1" *-- "0..*" Recipe           : inspire (Restrict)
Recipe     "1" *-- "0..*" RecipeIngredient : contient (Cascade)
Ingredient "1" *-- "0..*" RecipeIngredient : utilise (Restrict)
Media      "0..*" -- "0..*" Genre          : via MediaGenre
User       "1" *-- "0..*" Notification     : recoit (Cascade)
Recipe     "0..1" *-- "0..*" Notification  : liee (SetNull)

' ── Relations enums ───────────────────────────────────────
User         ..> Role
Recipe       ..> RecipeStatus
Media        ..> MediaType
Notification ..> NotificationType

' ── Relations controllers ─────────────────────────────────
AuthController    ..> User         : uses
UserController    ..> User         : uses
UserController    ..> Notification : uses
RecipesController ..> Recipe       : uses
RecipesController ..> AuthMiddleware : depends
AdminController   ..> Recipe       : uses
AdminController   ..> Ingredient   : uses
AdminController   ..> AdminMiddleware : depends
TMDBController    ..> TMDBCache    : uses
TMDBCache         ..> PosterService : uses
InactivityJob     ..> User         : uses

@enduml

---FIN_PLANTUML_CLASSES---


# ╔══════════════════════════════════════════════════════════╗
# ║  8. PlantUML — Diagramme d'états (RecipeStatus)        ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_ETATS---
@startuml Etats_RecipeStatus
skinparam backgroundColor #F6F1E8
skinparam stateBackgroundColor #FFFBEF
skinparam stateBorderColor #C9A45C
skinparam arrowColor #8E1F2F
skinparam noteBackgroundColor #FFFBEF
title États d'une recette — RecipeStatus

[*] --> DRAFT : Membre crée\nPOST /api/recipes

state DRAFT {
  DRAFT : Brouillon personnel
  DRAFT : Visible uniquement\npar le propriétaire et les admins
}
state PENDING {
  PENDING : En attente de validation
  PENDING : Visible par les admins
  PENDING : Notification admin créée
}
state PUBLISHED {
  PUBLISHED : Visible dans le catalogue public
  PUBLISHED : userId peut être NULL\n(SetNull si compte supprimé)
}

DRAFT --> DRAFT     : Membre modifie\nPATCH /api/recipes/:id
DRAFT --> PENDING   : Membre soumet\nPATCH /api/recipes/:id/submit
PENDING --> PUBLISHED : Admin publie\nPATCH /api/admin/recipes/:id/publish
PENDING --> DRAFT   : Admin refuse\n+ rejectionReason\nPATCH .../reject
PUBLISHED --> DRAFT : Admin dépublie\n(si nécessaire)
DRAFT --> [*]       : Membre supprime\nDELETE /api/recipes/:id
PUBLISHED --> [*]   : Admin supprime\nDELETE /api/admin/recipes/:id

note right of PENDING
  Côté front : badge
  de comptage dans la
  sidebar admin.
end note
@enduml
---FIN_PLANTUML_ETATS---


# ╔══════════════════════════════════════════════════════════╗
# ║  9. PlantUML — Diagramme d'activité                    ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_ACTIVITE---
@startuml Activite_Publication
skinparam backgroundColor #F6F1E8
skinparam activityBackgroundColor #FFFBEF
skinparam activityBorderColor #C9A45C
skinparam arrowColor #8E1F2F
title Activité — Workflow de publication d'une recette

|Membre|
start
:Remplit le formulaire de création\n(titre, catégorie, film, ingrédients, photo);
if (Champs valides ?) then (oui)
  :POST /api/recipes → status = DRAFT;
  :Recette enregistrée en brouillon;
  if (Soumet maintenant ?) then (oui)
    :PATCH .../submit → DRAFT à PENDING;
  else (plus tard)
    :Reste en DRAFT, modifiable;
    stop
  endif
else (non)
  :Zod retourne les erreurs;
  stop
endif

|Admin|
:Reçoit notification RECIPE_SUBMITTED\n(badge dans sidebar);
:Consulte la recette PENDING\n(titre, ingrédients, photo, film associé);
if (Conforme aux règles ?) then (oui)
  :PATCH .../publish → PUBLISHED;
  :Recette visible dans le catalogue;
  |Membre|
  :Notification "Publiée" (optionnel);
else (non)
  :PATCH .../reject + rejectionReason;
  :Recette repasse en DRAFT;
  |Membre|
  :Peut corriger et resoumettre;
endif
stop
@enduml
---FIN_PLANTUML_ACTIVITE---


# ╔══════════════════════════════════════════════════════════╗
# ║ 10. PlantUML — Diagramme de composants                 ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_COMPOSANTS---
@startuml Composants_CinesDelices
skinparam backgroundColor #F6F1E8
skinparam componentBackgroundColor #FFFBEF
skinparam componentBorderColor #C9A45C
skinparam arrowColor #8E1F2F
skinparam packageBorderColor #4A3428
title Composants — Cinés Délices

node "Navigateur (Railway)" {
  package "Client React 19 + Vite 6" {
    [Pages Publiques\n(Home, Recipes, Films, Series)] as PUB
    [Pages Membre\n(MemberRecipes, CreateRecipe, Profile)] as MEM
    [Pages Admin\n(Dashboard, Recettes, Catégories...)] as ADM
    [AuthContext + React Router v7\n(ProtectedRoute · AdminRoute)] as AUTH_CTX
    [SCSS Modules + tarteaucitronjs] as STYLE
  }
}

node "Serveur API (Railway)" {
  package "Express 5" {
    [Middlewares\n(Helmet · CORS · Rate-limit\nJWT · Admin)] as MW
    [Controllers\n(Auth · User · Recipes\nAdmin · TMDB · Media)] as CTRL
    [Validators Zod 4] as ZOD
    [Multer 2 + Sharp 0.34\n(Upload → WebP)] as UPLOAD
    [Nodemailer\n(Reset MDP · Contact)] as MAIL
  }
  package "Services" {
    [TMDBCache\n(node-cache · /search · /movie · /tv)] as TMDB_SVC
    [PosterService\n(download → WebP local)] as POSTER
    [InactivityJob\n(node-cron · RGPD)] as JOB
  }
  package "Prisma 7 ORM" {
    [Prisma Client\n(requêtes typées)] as PRISMA
    [Migrations\n(schema.prisma)] as MIGR
  }
  [Swagger JSDoc + UI\n(/api-docs)] as SWAGGER
}

database "PostgreSQL 18 (Railway)" {
  [9 tables · UUIDs\nonDelete policies] as PG
}

cloud "TMDB API (externe)" {
  [api.themoviedb.org v3\n/search/multi · /movie · /tv] as TMDB_EXT
}

' Relations
PUB --> AUTH_CTX
MEM --> AUTH_CTX : JWT requis
ADM --> AUTH_CTX : JWT + rôle ADMIN
AUTH_CTX --> MW : HTTP/JSON + Bearer JWT
MW --> ZOD : validation corps
MW --> CTRL : délègue
CTRL --> UPLOAD : images recettes
CTRL --> TMDB_SVC : recherche médias
CTRL --> PRISMA : CRUD BDD
CTRL --> MAIL : emails transac.
TMDB_SVC --> TMDB_EXT : requêtes avec cache
TMDB_SVC --> POSTER : affiches
POSTER --> PRISMA : chemin WebP stocké
PRISMA --> PG : SQL + transactions
MIGR --> PG : migrations schema
JOB --> PRISMA : nettoyage inactifs
SWAGGER --> CTRL : documentation

note bottom of PG
  onDelete :
  CASCADE : media_genres, recipe_ingredients.recipeId, notifications.userId
  SET NULL : recipes.userId, notifications.recipeId
  RESTRICT : recipes.categoryId, recipes.mediaId, recipe_ingredients.ingredientId
end note
@enduml
---FIN_PLANTUML_COMPOSANTS---


# ╔══════════════════════════════════════════════════════════╗
# ║ 10. PlantUML — Diagramme de déploiement                 ║
# ╚══════════════════════════════════════════════════════════╝

---PLANTUML_DEPLOIEMENT---
@startuml Deploiement_CinesDelices

skinparam backgroundColor #F6F1E8
skinparam nodeBackgroundColor #FFFBEF
skinparam nodeBorderColor #C9A45C
skinparam nodeFontColor #1F1D1E
skinparam nodeFontStyle bold
skinparam databaseBackgroundColor #FFFBEF
skinparam databaseBorderColor #C9A45C
skinparam artifactBackgroundColor #F6F1E8
skinparam artifactBorderColor #4A3428
skinparam arrowColor #8E1F2F
skinparam packageBorderColor #4A3428
skinparam packageBackgroundColor #F6F1E8
skinparam cloudBackgroundColor #E8F4F8
skinparam cloudBorderColor #3A8A9A

title Diagramme de Deploiement -- Cines Delices

' ── Poste developpeur ─────────────────────────────────────
node "Poste Developpeur" <<machine locale>> {

  package "Docker Compose" {
    node "Container : api\n(node:24-alpine)" <<Docker>> {
      artifact "Node.js 24\nExpress 5\nPrisma 7" as API_ART
    }

    node "Container : client\n(node:24-alpine)" <<Docker>> {
      artifact "React 19\nVite 6\nSCSS" as CLIENT_ART
    }

    node "Container : db\n(postgres:18-alpine)" <<Docker>> {
      database "PostgreSQL 18\ncinesdelices" as DB_LOCAL
    }
  }

  note right of API_ART
    http://localhost:3000
    Swagger : /api-docs
    Health  : /api/health
  end note

  note right of CLIENT_ART
    http://localhost:5173
    HMR Vite actif
  end note
}

' ── GitHub ────────────────────────────────────────────────
node "GitHub" <<depot distant>> {
  artifact "Repository\ncines-delices\n(main + develop\n+ feature/*)" as REPO
}

' ── Railway Production ────────────────────────────────────
node "Railway" <<PaaS cloud>> {

  node "Service : API" <<Railway Service>> {
    artifact "Node.js 24\nExpress 5\nPrisma 7\n(build prod)" as API_PROD
  }

  node "Service : PostgreSQL" <<Railway Service>> {
    database "PostgreSQL 18\n(Railway DB)\nVariables env\nsecurisees" as DB_PROD
  }

  note right of API_PROD
    https://cines-delices.railway.app
    Variables d'env :
    DATABASE_URL
    JWT_SECRET
    TMDB_API_KEY
    SMTP_*
  end note
}

' ── TMDB API externe ──────────────────────────────────────
cloud "TMDB API\n(externe)" <<api.themoviedb.org>> {
  artifact "REST API v3\n/search/multi\n/movie/:id\n/tv/:id" as TMDB
}

' ── Navigateur utilisateur ────────────────────────────────
node "Navigateur\nUtilisateur" <<client>> {
  artifact "SPA React 19\n(fichiers statiques\nservis par Railway)" as SPA
}

' ── Relations developpement ───────────────────────────────
API_ART    --> DB_LOCAL   : Prisma ORM\n(SQL/TCP)
CLIENT_ART --> API_ART    : HTTP/JSON\nlocalhost:3000

' ── CI/CD ─────────────────────────────────────────────────
REPO --> API_PROD  : push GitHub\n→ webhook Railway\n(deploy auto)

' ── Relations production ─────────────────────────────────
API_PROD --> DB_PROD  : Prisma ORM\n(SSL/TCP)
API_PROD --> TMDB     : HTTPS GET\n(node-cache TTL)
SPA      --> API_PROD : HTTPS/JSON\nBearer JWT

' ── Dev vers GitHub ──────────────────────────────────────
API_ART    --> REPO : git push\nfeature/* -> develop -> main
CLIENT_ART --> REPO : git push

@enduml

---FIN_PLANTUML_DEPLOIEMENT---

# ╔══════════════════════════════════════════════════════════╗
# ║ 12. EXCALIDRAW — JSON Wireframes                       ║
# ╚══════════════════════════════════════════════════════════╝
# Instructions :
# 1. Aller sur https://excalidraw.com
# 2. Menu ☰ → Open → "Load from JSON"
# 3. Coller le JSON de la page souhaitée
# 4. Exporter en PNG (Ctrl+Shift+E)
#
# Convention : noir/blanc/gris uniquement (wireframe pur)
# Chaque page = 1 cadre Desktop (1200px) + 1 cadre Mobile (390px)

# ─── PAGE 1 : Accueil (/) ──────────────────────────────────
# Coller sur excalidraw.com → Load from JSON

---EXCALIDRAW_HOME---
{
  "type": "excalidraw",
  "version": 2,
  "source": "cinés-délices-wireframe",
  "elements": [
    {"id":"frame-d","type":"frame","x":0,"y":0,"width":1200,"height":900,"label":{"text":"Desktop — Accueil (/)"},"strokeColor":"#000000","backgroundColor":"transparent","roughness":0,"roundness":null},
    {"id":"header-d","type":"rectangle","x":20,"y":20,"width":1160,"height":60,"label":{"text":"HEADER · [Logo Cinés Délices]   Films   Séries   Recettes   [Connexion] [Inscription]"},"strokeColor":"#333333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"hero-d","type":"rectangle","x":20,"y":100,"width":1160,"height":200,"label":{"text":"HERO IMAGE — pleine largeur\n\"Recettes inspirées du cinéma et des séries\"\n[Découvrir le catalogue]"},"strokeColor":"#555555","backgroundColor":"#cccccc","roughness":0},
    {"id":"sec1-d","type":"text","x":20,"y":320,"width":300,"height":30,"text":"RECETTES VEDETTES","fontSize":18,"fontFamily":1},
    {"id":"card1-d","type":"rectangle","x":20,"y":360,"width":270,"height":180,"label":{"text":"□ Photo\nTitre recette\n🎬 Film associé\n[Plat]"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"card2-d","type":"rectangle","x":310,"y":360,"width":270,"height":180,"label":{"text":"□ Photo\nTitre recette\n🎬 Film associé\n[Dessert]"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"card3-d","type":"rectangle","x":600,"y":360,"width":270,"height":180,"label":{"text":"□ Photo\nTitre recette\n🎬 Film associé\n[Entrée]"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"card4-d","type":"rectangle","x":890,"y":360,"width":270,"height":180,"label":{"text":"□ Photo\nTitre recette\n🎬 Film associé\n[Boisson]"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"sec2-d","type":"text","x":20,"y":570,"width":300,"height":30,"text":"FILMS À L'HONNEUR","fontSize":18,"fontFamily":1},
    {"id":"film1-d","type":"rectangle","x":20,"y":610,"width":160,"height":200,"label":{"text":"□ Affiche\nTitre\n2007"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"film2-d","type":"rectangle","x":200,"y":610,"width":160,"height":200,"label":{"text":"□ Affiche\nTitre\n2023"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"film3-d","type":"rectangle","x":380,"y":610,"width":160,"height":200,"label":{"text":"□ Affiche\nTitre\n2019"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"footer-d","type":"rectangle","x":20,"y":840,"width":1160,"height":40,"label":{"text":"Cinés Délices · Mentions légales · Politique cookies · Contact"},"strokeColor":"#333333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"frame-m","type":"frame","x":1260,"y":0,"width":390,"height":900,"label":{"text":"Mobile — Accueil (/)"},"strokeColor":"#000000","backgroundColor":"transparent","roughness":0,"roundness":null},
    {"id":"header-m","type":"rectangle","x":1280,"y":20,"width":350,"height":50,"label":{"text":"[Logo]    ≡"},"strokeColor":"#333333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"hero-m","type":"rectangle","x":1280,"y":90,"width":350,"height":140,"label":{"text":"HERO\nTitre H1\n[CTA]"},"strokeColor":"#555555","backgroundColor":"#cccccc","roughness":0},
    {"id":"card1-m","type":"rectangle","x":1280,"y":250,"width":350,"height":130,"label":{"text":"□ Photo\nTitre recette · 🎬 Film · [Catégorie]"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"card2-m","type":"rectangle","x":1280,"y":400,"width":350,"height":130,"label":{"text":"□ Photo\nTitre recette · 🎬 Film · [Catégorie]"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"films-m","type":"rectangle","x":1280,"y":550,"width":350,"height":80,"label":{"text":"← FILMS ·□· □· □ →  (carrousel)"},"strokeColor":"#777777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"footer-m","type":"rectangle","x":1280,"y":850,"width":350,"height":30,"label":{"text":"Footer"},"strokeColor":"#333333","backgroundColor":"#e8e8e8","roughness":0}
  ],
  "appState":{"viewBackgroundColor":"#ffffff","gridSize":null}
}
---FIN_EXCALIDRAW_HOME---


# ─── PAGE 2 : Catalogue (/recipes) ────────────────────────

---EXCALIDRAW_CATALOGUE---
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {"id":"frame-d","type":"frame","x":0,"y":0,"width":1200,"height":900,"label":{"text":"Desktop — Catalogue (/recipes)"},"strokeColor":"#000000","backgroundColor":"transparent","roughness":0},
    {"id":"hdr","type":"rectangle","x":20,"y":20,"width":1160,"height":50,"label":{"text":"HEADER"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"title","type":"text","x":20,"y":90,"width":400,"height":30,"text":"CATALOGUE DES RECETTES","fontSize":20,"fontFamily":1},
    {"id":"search","type":"rectangle","x":20,"y":130,"width":1160,"height":44,"label":{"text":"🔍  Rechercher une recette ou un film...  (recherche temps réel, debounce 400ms)"},"strokeColor":"#555","backgroundColor":"#ffffff","roughness":0,"roundness":{"type":3}},
    {"id":"filters","type":"rectangle","x":20,"y":185,"width":700,"height":36,"label":{"text":"[Toutes]  [Entrée]  [Plat]  [Dessert]  [Boisson]   ← chips filtrantes"},"strokeColor":"#555","backgroundColor":"#ffffff","roughness":0},
    {"id":"c1","type":"rectangle","x":20,"y":240,"width":270,"height":190,"label":{"text":"□ Photo\nTitre\n🎬 Film · [Plat]"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"c2","type":"rectangle","x":310,"y":240,"width":270,"height":190,"label":{"text":"□ Photo\nTitre\n🎬 Film · [Dessert]"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"c3","type":"rectangle","x":600,"y":240,"width":270,"height":190,"label":{"text":"□ Photo\nTitre\n🎬 Film · [Entrée]"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"c4","type":"rectangle","x":890,"y":240,"width":270,"height":190,"label":{"text":"□ Photo\nTitre\n🎬 Film · [Boisson]"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"c5","type":"rectangle","x":20,"y":450,"width":270,"height":190,"label":{"text":"□ Photo\nTitre\n🎬 Film"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"c6","type":"rectangle","x":310,"y":450,"width":270,"height":190,"label":{"text":"□ Photo"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"c7","type":"rectangle","x":600,"y":450,"width":270,"height":190,"label":{"text":"□ Photo"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"c8","type":"rectangle","x":890,"y":450,"width":270,"height":190,"label":{"text":"□ Photo"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"pagination","type":"rectangle","x":450,"y":660,"width":300,"height":40,"label":{"text":"[< Préc]  [1]  [2]  [3]  [Suiv >]"},"strokeColor":"#555","backgroundColor":"#ffffff","roughness":0},
    {"id":"ftr","type":"rectangle","x":20,"y":850,"width":1160,"height":40,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"frame-m","type":"frame","x":1260,"y":0,"width":390,"height":900,"label":{"text":"Mobile — Catalogue (/recipes)"},"strokeColor":"#000000","backgroundColor":"transparent","roughness":0},
    {"id":"hm","type":"rectangle","x":1280,"y":20,"width":350,"height":50,"label":{"text":"HEADER  ≡"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"sm","type":"rectangle","x":1280,"y":85,"width":350,"height":40,"label":{"text":"🔍 Recherche..."},"strokeColor":"#555","backgroundColor":"#fff","roughness":0,"roundness":{"type":3}},
    {"id":"fm","type":"rectangle","x":1280,"y":135,"width":350,"height":36,"label":{"text":"[Toutes][Entrée][Plat][Dessert]→"},"strokeColor":"#555","backgroundColor":"#fff","roughness":0},
    {"id":"cm1","type":"rectangle","x":1280,"y":182,"width":165,"height":160,"label":{"text":"□ Photo\nTitre\n[Plat]"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"cm2","type":"rectangle","x":1458,"y":182,"width":165,"height":160,"label":{"text":"□ Photo\nTitre\n[Dessert]"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"cm3","type":"rectangle","x":1280,"y":355,"width":165,"height":160,"label":{"text":"□ Photo"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"cm4","type":"rectangle","x":1458,"y":355,"width":165,"height":160,"label":{"text":"□ Photo"},"strokeColor":"#777","backgroundColor":"#f5f5f5","roughness":0},
    {"id":"pgm","type":"rectangle","x":1350,"y":530,"width":200,"height":36,"label":{"text":"[< 1 2 3 >]"},"strokeColor":"#555","backgroundColor":"#fff","roughness":0},
    {"id":"ftm","type":"rectangle","x":1280,"y":860,"width":350,"height":30,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0}
  ],
  "appState":{"viewBackgroundColor":"#ffffff"}
}
---FIN_EXCALIDRAW_CATALOGUE---


# ─── PAGE 3 : Détail recette (/recipes/:slug) ─────────────

---EXCALIDRAW_DETAIL---
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {"id":"fd","type":"frame","x":0,"y":0,"width":1200,"height":1000,"label":{"text":"Desktop — Détail recette (/recipes/:slug)"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hd","type":"rectangle","x":20,"y":20,"width":1160,"height":50,"label":{"text":"HEADER"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"photo","type":"rectangle","x":20,"y":90,"width":680,"height":360,"label":{"text":"□□□ GRANDE PHOTO DE LA RECETTE □□□"},"strokeColor":"#777","backgroundColor":"#cccccc","roughness":0},
    {"id":"info","type":"rectangle","x":720,"y":90,"width":460,"height":360,"label":{"text":"TITRE DE LA RECETTE\n[Badge Catégorie]\n⏱ 20min prép · 🔥 30min cuisson\n👥 4 personnes\n\n🎬 FILM ASSOCIÉ\n□ Affiche  Ratatouille (2007)\n         Pixar · Animation"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"anec","type":"rectangle","x":20,"y":470,"width":1160,"height":80,"label":{"text":"📖 Anecdote cinématographique — contexte du film/série lié à la recette ···"},"strokeColor":"#777","backgroundColor":"#fffbef","roughness":0},
    {"id":"ingr","type":"rectangle","x":20,"y":570,"width":530,"height":280,"label":{"text":"🧂 INGRÉDIENTS\n• 200g tomates cerises\n• 1 aubergine\n• 2 courgettes\n• 2 c.s. huile d'olive\n• Sel, poivre\n• Herbes de Provence"},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"inst","type":"rectangle","x":570,"y":570,"width":610,"height":280,"label":{"text":"📋 INSTRUCTIONS\n1. Préchauffez le four à 180°C\n2. Lavez et découpez les légumes\n3. Disposez-les dans un plat\n4. Arrosez d'huile d'olive\n5. Enfournez 45 minutes..."},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"ftd","type":"rectangle","x":20,"y":870,"width":1160,"height":40,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"fm","type":"frame","x":1260,"y":0,"width":390,"height":1000,"label":{"text":"Mobile — Détail recette"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hm","type":"rectangle","x":1280,"y":20,"width":350,"height":50,"label":{"text":"HEADER  ≡"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"pm","type":"rectangle","x":1280,"y":90,"width":350,"height":200,"label":{"text":"□□ PHOTO PLEINE LARGEUR □□"},"strokeColor":"#777","backgroundColor":"#cccccc","roughness":0},
    {"id":"im","type":"rectangle","x":1280,"y":310,"width":350,"height":100,"label":{"text":"TITRE  [Catégorie]\n⏱ 30min  🔥 45min  👥 4 pers"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"fm2","type":"rectangle","x":1280,"y":430,"width":350,"height":80,"label":{"text":"🎬 Ratatouille (2007)\n□ Affiche  Pixar · Animation"},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"am","type":"rectangle","x":1280,"y":530,"width":350,"height":60,"label":{"text":"📖 Anecdote ···"},"strokeColor":"#777","backgroundColor":"#fffbef","roughness":0},
    {"id":"ingrm","type":"rectangle","x":1280,"y":610,"width":350,"height":150,"label":{"text":"🧂 INGRÉDIENTS\n• 200g tomates · • 1 aubergine\n• 2 courgettes · • huile"},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"instm","type":"rectangle","x":1280,"y":780,"width":350,"height":150,"label":{"text":"📋 ÉTAPES\n1. Préchauffe le four...\n2. Découpe les légumes..."},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"ftm","type":"rectangle","x":1280,"y":950,"width":350,"height":30,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0}
  ],
  "appState":{"viewBackgroundColor":"#ffffff"}
}
---FIN_EXCALIDRAW_DETAIL---


# ─── PAGE 4 : Connexion / Inscription ─────────────────────

---EXCALIDRAW_AUTH---
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {"id":"fd","type":"frame","x":0,"y":0,"width":1200,"height":750,"label":{"text":"Desktop — Connexion (/login) & Inscription (/signup)"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hd","type":"rectangle","x":20,"y":20,"width":1160,"height":50,"label":{"text":"HEADER"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"login-box","type":"rectangle","x":360,"y":100,"width":480,"height":380,"label":{"text":"[Logo]\n\nSE CONNECTER\n\nEmail *\n[_________________________]\n\nMot de passe *\n[_________________________]\n\n[Se connecter]\n\nMot de passe oublié ?  |  S'inscrire"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0,"roundness":{"type":3}},
    {"id":"signup-box","type":"rectangle","x":700,"y":100,"width":480,"height":420,"label":{"text":"[Logo]\n\nCRÉER UN COMPTE\n\nPseudo *\n[_________________________]\n\nEmail *\n[_________________________]\n\nMot de passe *\n[_________________________]\n\n[Créer mon compte]\n\nDéjà inscrit ?  Se connecter"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0,"roundness":{"type":3}},
    {"id":"sep-d","type":"line","x":690,"y":100,"width":0,"height":420,"strokeColor":"#cccccc","roughness":0},
    {"id":"ftd","type":"rectangle","x":20,"y":700,"width":1160,"height":40,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"fm","type":"frame","x":1260,"y":0,"width":390,"height":750,"label":{"text":"Mobile — Auth"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hm","type":"rectangle","x":1280,"y":20,"width":350,"height":50,"label":{"text":"HEADER  ≡"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"lm","type":"rectangle","x":1310,"y":100,"width":290,"height":340,"label":{"text":"[Logo]\n\nSE CONNECTER\n\nEmail *\n[__________________]\n\nMDP *\n[__________________]\n\n[Se connecter]\n\nMot de passe oublié ? S'inscrire"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0,"roundness":{"type":3}}
  ],
  "appState":{"viewBackgroundColor":"#ffffff"}
}
---FIN_EXCALIDRAW_AUTH---


# ─── PAGE 5 : Espace Membre — Mes Recettes ────────────────

---EXCALIDRAW_MEMBRE---
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {"id":"fd","type":"frame","x":0,"y":0,"width":1200,"height":800,"label":{"text":"Desktop — Espace Membre (/membre/mes-recettes)"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hd","type":"rectangle","x":20,"y":20,"width":1160,"height":50,"label":{"text":"HEADER · [Logo]    Films  Séries  Recettes    [Avatar] Nathalie  [Déconnexion]"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"sidebar","type":"rectangle","x":20,"y":90,"width":220,"height":650,"label":{"text":"SIDEBAR MEMBRE\n\n● Mes recettes\n○ En validation\n○ Notifications  [3]\n○ Mon profil\n○ Contact\n\n[+ Nouvelle recette]"},"strokeColor":"#555","backgroundColor":"#f0ede8","roughness":0},
    {"id":"content","type":"rectangle","x":260,"y":90,"width":920,"height":80,"label":{"text":"MES RECETTES   [+ Nouvelle recette]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"tabs","type":"rectangle","x":260,"y":185,"width":920,"height":40,"label":{"text":"[Toutes]  [DRAFT]  [EN VALIDATION]  [PUBLIÉES]"},"strokeColor":"#555","backgroundColor":"#ffffff","roughness":0},
    {"id":"r1","type":"rectangle","x":260,"y":240,"width":920,"height":80,"label":{"text":"Ratatouille de Rémy · Plat · Ratatouille (2007)    [DRAFT]    [Modifier]  [Soumettre]  [🗑]"},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"r2","type":"rectangle","x":260,"y":335,"width":920,"height":80,"label":{"text":"Butterscotch de Breaking Bad · Dessert · Breaking Bad   [PUBLIÉ]    [Modifier]  [🗑]"},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"r3","type":"rectangle","x":260,"y":430,"width":920,"height":80,"label":{"text":"Pasta Harry Potter · Plat · Harry Potter   [EN VALIDATION]    (en attente...)"},"strokeColor":"#777","backgroundColor":"#fffbef","roughness":0},
    {"id":"ftd","type":"rectangle","x":20,"y":760,"width":1160,"height":40,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"fm","type":"frame","x":1260,"y":0,"width":390,"height":800,"label":{"text":"Mobile — Mes Recettes"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hm","type":"rectangle","x":1280,"y":20,"width":350,"height":50,"label":{"text":"HEADER  ≡"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"ttm","type":"rectangle","x":1280,"y":85,"width":350,"height":44,"label":{"text":"MES RECETTES   [+ Nouvelle]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"tabm","type":"rectangle","x":1280,"y":140,"width":350,"height":36,"label":{"text":"[Toutes][DRAFT][PENDING]→"},"strokeColor":"#555","backgroundColor":"#fff","roughness":0},
    {"id":"rm1","type":"rectangle","x":1280,"y":190,"width":350,"height":100,"label":{"text":"Ratatouille de Rémy\nRatatouille (2007) · Plat\n[DRAFT]  [Modifier]  [Soumettre]  [🗑]"},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"rm2","type":"rectangle","x":1280,"y":305,"width":350,"height":100,"label":{"text":"Butterscotch BB\n[PUBLIÉ]  [Modifier]  [🗑]"},"strokeColor":"#777","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"rm3","type":"rectangle","x":1280,"y":420,"width":350,"height":100,"label":{"text":"Pasta Harry Potter\n[EN VALIDATION]  (attente admin)"},"strokeColor":"#777","backgroundColor":"#fffbef","roughness":0}
  ],
  "appState":{"viewBackgroundColor":"#ffffff"}
}
---FIN_EXCALIDRAW_MEMBRE---


# ─── PAGE 6 : Créer/Modifier une recette ──────────────────

---EXCALIDRAW_FORM---
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {"id":"fd","type":"frame","x":0,"y":0,"width":1200,"height":1100,"label":{"text":"Desktop — Créer une recette (/membre/creer-recette)"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hd","type":"rectangle","x":20,"y":20,"width":1160,"height":50,"label":{"text":"HEADER"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"breadcrumb","type":"text","x":20,"y":85,"width":600,"height":25,"text":"← Retour   CRÉER UNE RECETTE","fontSize":16,"fontFamily":1},
    {"id":"col1","type":"rectangle","x":20,"y":120,"width":580,"height":340,"label":{"text":"INFORMATIONS GÉNÉRALES\n\nTitre *\n[___________________________________]\n\nCatégorie *\n[▼ Entrée / Plat / Dessert / Boisson]\n\nFilm ou Série * (TMDB)\n[🔍 Rechercher un film ou une série...]\n→ Liste autocomplétion (debounce 400ms)\n→ [Ratatouille (2007) - ✓ sélectionné]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"col2","type":"rectangle","x":620,"y":120,"width":560,"height":200,"label":{"text":"PHOTO (optionnel)\n□□□ Zone upload □□□\n[Choisir un fichier]\nFormats : jpg, png, webp · Max 5Mo\n→ Convertie en WebP par Sharp"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"col2b","type":"rectangle","x":620,"y":340,"width":560,"height":120,"label":{"text":"TEMPS & PORTIONS\nPréparation :  [__] min\nCuisson :      [__] min\nPersonnes :    [__]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"ingr","type":"rectangle","x":20,"y":480,"width":1160,"height":140,"label":{"text":"INGRÉDIENTS\n[Nom ingrédient...]   [Quantité]   [Unité ▼]   [+ Ajouter]\n• Tomates cerises   200   g   [🗑]\n• Aubergine         1     pièce  [🗑]\n• Huile d'olive     2     c.s.   [🗑]\n[+ Ajouter un ingrédient]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"inst","type":"rectangle","x":20,"y":640,"width":1160,"height":150,"label":{"text":"INSTRUCTIONS *\n┌───────────────────────────────────────────────────────────────┐\n│  Étape 1 : Préchauffez le four à 180°C...                     │\n│  Étape 2 : Découpez les légumes en fines lamelles...          │\n│  ...                                                          │\n└───────────────────────────────────────────────────────────────┘"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"anec","type":"rectangle","x":20,"y":810,"width":1160,"height":80,"label":{"text":"ANECDOTE (optionnel)\n[Dans le film, Rémy le rat cuisine ce plat pour impressionner le critique...]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"btns","type":"rectangle","x":600,"y":910,"width":580,"height":50,"label":{"text":"[Enregistrer comme brouillon]        [Soumettre pour validation]"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"ftd","type":"rectangle","x":20,"y":1050,"width":1160,"height":40,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"fm","type":"frame","x":1260,"y":0,"width":390,"height":1100,"label":{"text":"Mobile — Créer une recette"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hm","type":"rectangle","x":1280,"y":20,"width":350,"height":50,"label":{"text":"← Créer une recette"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"f1m","type":"rectangle","x":1280,"y":85,"width":350,"height":44,"label":{"text":"Titre *  [___________________]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"f2m","type":"rectangle","x":1280,"y":143,"width":350,"height":44,"label":{"text":"Catégorie *  [Sélectionner ▼]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"f3m","type":"rectangle","x":1280,"y":200,"width":350,"height":60,"label":{"text":"Film/Série *  [🔍 Recherche TMDB...]\n→ autocomplétion debounce"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"f4m","type":"rectangle","x":1280,"y":275,"width":350,"height":80,"label":{"text":"□ PHOTO\n[Choisir un fichier]  → WebP"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"f5m","type":"rectangle","x":1280,"y":370,"width":350,"height":70,"label":{"text":"⏱ Prép. [__] min\n🔥 Cuisson [__] min · 👥 [__] pers"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"f6m","type":"rectangle","x":1280,"y":455,"width":350,"height":100,"label":{"text":"INGRÉDIENTS\n[Nom][Qté][Unité▼][+]\n• Tomate  200  g  [🗑]"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"f7m","type":"rectangle","x":1280,"y":570,"width":350,"height":120,"label":{"text":"INSTRUCTIONS *\n┌────────────────────────────┐\n│ Étape 1 : ...              │\n└────────────────────────────┘"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"f8m","type":"rectangle","x":1280,"y":705,"width":350,"height":50,"label":{"text":"[Enregistrer brouillon]"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"f9m","type":"rectangle","x":1280,"y":768,"width":350,"height":50,"label":{"text":"[Soumettre pour validation]"},"strokeColor":"#555","backgroundColor":"#e0ddd8","roughness":0}
  ],
  "appState":{"viewBackgroundColor":"#ffffff"}
}
---FIN_EXCALIDRAW_FORM---


# ─── PAGE 7 : Back-Office Admin ───────────────────────────

---EXCALIDRAW_ADMIN---
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {"id":"fd","type":"frame","x":0,"y":0,"width":1200,"height":800,"label":{"text":"Desktop — Back-Office Admin (/admin/validation-recettes)"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hd","type":"rectangle","x":20,"y":20,"width":1160,"height":50,"label":{"text":"HEADER ADMIN · [Logo]    [Badge ADMIN]    [Déconnexion]"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"sidebar","type":"rectangle","x":20,"y":90,"width":220,"height":650,"label":{"text":"NAVIGATION ADMIN\n\n● Validation recettes [3]\n○ Toutes les recettes\n○ Catégories\n○ Ingrédients\n○ Validation ingr. [5]\n○ Utilisateurs\n○ Notifications [2]\n\n[+ Créer une recette]"},"strokeColor":"#555","backgroundColor":"#f0ede8","roughness":0},
    {"id":"content-title","type":"rectangle","x":260,"y":90,"width":920,"height":60,"label":{"text":"VALIDATION DES RECETTES   Recettes en attente : 3"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"r1","type":"rectangle","x":260,"y":168,"width":920,"height":100,"label":{"text":"Ratatouille de Rémy  [EN ATTENTE]  · Par : Nathalie · Plat · 4 pers · Ratatouille (2007)\nSoumis le 10/04/2026                [Voir le détail]   [✓ Publier]   [✗ Refuser]"},"strokeColor":"#C9A45C","backgroundColor":"#fffbef","roughness":0},
    {"id":"r2","type":"rectangle","x":260,"y":283,"width":920,"height":100,"label":{"text":"Pasta Poudlard  [EN ATTENTE]  · Par : Vincent · Plat · 6 pers · Harry Potter\nSoumis le 11/04/2026                [Voir le détail]   [✓ Publier]   [✗ Refuser]"},"strokeColor":"#C9A45C","backgroundColor":"#fffbef","roughness":0},
    {"id":"r3","type":"rectangle","x":260,"y":398,"width":920,"height":100,"label":{"text":"Butterscotch BB  [EN ATTENTE]  · Par : Orianne · Dessert · Breaking Bad\nSoumis le 12/04/2026               [Voir le détail]   [✓ Publier]   [✗ Refuser]"},"strokeColor":"#C9A45C","backgroundColor":"#fffbef","roughness":0},
    {"id":"empty","type":"text","x":260,"y":520,"width":900,"height":30,"text":"— Aucune autre recette en attente —","fontSize":14,"fontFamily":1},
    {"id":"ftd","type":"rectangle","x":20,"y":760,"width":1160,"height":40,"label":{"text":"Footer"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"fm","type":"frame","x":1260,"y":0,"width":390,"height":800,"label":{"text":"Mobile — Admin validation"},"strokeColor":"#000","backgroundColor":"transparent","roughness":0},
    {"id":"hm","type":"rectangle","x":1280,"y":20,"width":350,"height":50,"label":{"text":"ADMIN  ≡  [Badge 3]"},"strokeColor":"#333","backgroundColor":"#e8e8e8","roughness":0},
    {"id":"ttm","type":"rectangle","x":1280,"y":85,"width":350,"height":44,"label":{"text":"VALIDATION  ·  3 en attente"},"strokeColor":"#555","backgroundColor":"#f9f9f9","roughness":0},
    {"id":"am1","type":"rectangle","x":1280,"y":143,"width":350,"height":120,"label":{"text":"Ratatouille de Rémy  [EN ATTENTE]\nNathalie · Plat · Ratatouille (2007)\n[Voir]     [✓ Publier]     [✗ Refuser]"},"strokeColor":"#C9A45C","backgroundColor":"#fffbef","roughness":0},
    {"id":"am2","type":"rectangle","x":1280,"y":278,"width":350,"height":120,"label":{"text":"Pasta Poudlard  [EN ATTENTE]\nVincent · Plat · Harry Potter\n[Voir]     [✓ Publier]     [✗ Refuser]"},"strokeColor":"#C9A45C","backgroundColor":"#fffbef","roughness":0},
    {"id":"am3","type":"rectangle","x":1280,"y":413,"width":350,"height":120,"label":{"text":"Butterscotch BB  [EN ATTENTE]\nOrianne · Dessert · Breaking Bad\n[Voir]     [✓ Publier]     [✗ Refuser]"},"strokeColor":"#C9A45C","backgroundColor":"#fffbef","roughness":0}
  ],
  "appState":{"viewBackgroundColor":"#ffffff"}
}
---FIN_EXCALIDRAW_ADMIN---


# ╔══════════════════════════════════════════════════════════╗
# ║ 13. FIGMA — Guide maquettes design (Mockups)           ║
# ╚══════════════════════════════════════════════════════════╝
# Les maquettes Figma complètes sont à réaliser sur :
# https://www.figma.com
#
# STRUCTURE DE FICHIER RECOMMANDÉE :
#
# Page Figma "Cinés Délices — Mockups"
#   └── Section "1. Design System"
#       ├── Colors : #C9A45C (or) · #8E1F2F (rouge) · #1F1D1E · #F6F1E8 · #4A3428 · #6E8B5B · #3A8A9A
#       ├── Typography : Playfair Display (titres) · Inter (corps)
#       └── Components : Button · Card · Badge · Input · Modal
#   └── Section "2. Pages Desktop (1440×900)"
#       ├── Home /
#       ├── Catalogue /recipes
#       ├── Détail /recipes/:slug
#       ├── Films /films  &  /films/:slug
#       ├── Séries /series  &  /series/:slug
#       ├── Login /login  &  Signup /signup
#       ├── Reset Password /reset-password
#       ├── Contact /contact
#       ├── Membre — Mes recettes /membre/mes-recettes
#       ├── Membre — Créer recette /membre/creer-recette
#       ├── Membre — Profil /membre/profil
#       └── Admin — Validation /admin/validation-recettes
#   └── Section "3. Pages Mobile (390×844)"
#       └── (mêmes pages en version mobile)
#
# TOKENS DE DESIGN (à configurer dans Figma Variables) :
#   color/primary    : #C9A45C
#   color/danger     : #8E1F2F
#   color/surface    : #F6F1E8
#   color/dark       : #1F1D1E
#   color/accent     : #3A8A9A
#   color/text       : #1F1D1E
#   radius/card      : 8px
#   radius/button    : 6px
#   shadow/card      : 0 2px 8px rgba(0,0,0,0.08)
#
# GRILLES FIGMA :
#   Desktop 1440px : 12 colonnes · gutter 24px · margin 80px
#   Tablet  768px  : 8 colonnes  · gutter 16px · margin 32px
#   Mobile  390px  : 4 colonnes  · gutter 16px · margin 20px
#
# COMPOSANTS PRIORITAIRES À CRÉER :
#   1. RecipeCard (photo, titre, film, badge catégorie)
#   2. MediaCard (affiche, titre, année, type)
#   3. Navbar (logo, liens, avatar, recherche)
#   4. StatusBadge (DRAFT=gris, PENDING=or, PUBLISHED=vert)
#   5. Button (primary=or, secondary=transparent, danger=rouge)
#   6. FormInput (label, champ, message d'erreur)
#   7── SearchDropdown (résultats autocomplétion TMDB)
