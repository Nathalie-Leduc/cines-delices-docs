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
