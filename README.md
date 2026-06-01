# Cinés Délices — Documentation du projet

Dépôt complémentaire au dépôt principal **[Nathalie-Leduc/cines-delices](https://github.com/Nathalie-Leduc/cines-delices)** — il rassemble les livrables documentaires du projet pour la certification **Concepteur Développeur d'Applications (RNCP Niveau 6)**, École O'Clock, promotion Francfort, 2026.

Le code source de l'application reste dans le dépôt principal — ici on trouve les documents, captures, schémas et spécifications.

---

## Arborescence du dépôt

| Dossier / fichier | Contenu | Annexe(s) liée(s) |
|---|---|---|
| [`DOSSIER DE PROJET/`](./DOSSIER%20DE%20PROJET/) | Dossier de projet complet (corps + 17 annexes) au format Word | — |
| [`Captures-ecran/`](./Captures-ecran/) | Captures de l'application — desktop, mobile, parcours création de recette | Annexe 9, Annexe 17 |
| [`Documentations/`](./Documentations/) | Documents complémentaires : recaps, guide tarteaucitron, routes Frontend/Backend, stack technique | Annexes 1, 2, 13 |
| [`Déploiement/`](./D%C3%A9ploiement/) | Caddyfile, Dockerfile, workflow CI/CD GitHub Actions | Annexe 16 |
| [`Emails/`](./Emails/) | Captures Mailtrap des 4 emails RGPD (desktop + mobile) | Annexe 13, Annexe 15 |
| [`Gestion-de-projet/`](./Gestion-de-projet/) | Kanban GitHub (TSV exportés), planning Apothéose, planning Sprint 2 | Annexe 3 |
| [`Jeu-essai/`](./Jeu-essai/) | Captures du jeu d'essai T01 → T10 | Annexe 15 |
| [`Logo-cines-delices/`](./Logo-cines-delices/) | Logo officiel (PNG + WebP) | Annexe 7 |
| [`Maquettes/`](./Maquettes/) | 16 maquettes haute-fidélité (HTML interactif + PNG individuels) | Annexe 9 |
| [`Prisma/`](./Prisma/) | Schéma Prisma + migrations + seeds | Annexe 6 |
| [`Schemas/`](./Schemas/) | Diagrammes UML — sources PUML + rendus PNG (use cases, classes, séquences, packages, composants, déploiement) | Annexes 1, 4, 5 |
| [`Swagger/`](./Swagger/) | Spécification OpenAPI 3.0 (`swagger.json`) + capture de l'UI | Annexe 2 |
| [`Tests/`](./Tests/) | Tests API (`.http` + `.js`) et tests client (Vitest) | Annexe 14 |
| [`Wireframes/`](./Wireframes/) | 16 wireframes basse-fidélité (PNG) | Annexe 8 |

---

## Accès à l'application en production

| Service | URL |
|---|---|
| **Front (React)** | https://graceful-quietude-production.up.railway.app |
| **API (Node/Express)** | https://cines-delicesapi-production.up.railway.app |
| **Swagger UI** | https://cines-delicesapi-production.up.railway.app/api/doc?key=SWAGGER_API_KEY |

(Swagger — protégé par clé en production)
Pour tester l'API via Swagger : accéder à l'URL Swagger avec la clé fournie → 


### Comptes de test (seed v-4)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@cinesdelices.fr` | `Admin1234!` |
| Membre | `marie@cinesdelices.fr` | `Member1234!` |
| Membre | `remy@cinesdelices.fr` | `Member1234!` |

### Tester une route protégée via Swagger

1. Appeler `POST /api/auth/login` avec un compte ci-dessus
2. Copier la valeur `token` de la réponse JSON
3. Cliquer sur **Authorize** (cadenas en haut à droite de Swagger UI)
4. Coller le token dans le champ `bearerAuth` et valider
5. Les routes protégées peuvent maintenant être testées

---

## À propos

Projet réalisé dans le cadre de la formation **Concepteur Développeur d'Applications (RNCP Niveau 6)** — École O'Clock, promotion Francfort, 2026. Auteure : **Nathalie Leduc**.
