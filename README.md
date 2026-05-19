# Cinés Délices — Documentation du projet

Dépôt complémentaire au dépôt principal [Nathalie-Leduc/cines-delices](https://github.com/Nathalie-Leduc/cines-delices) — il rassemble les livrables documentaires du projet pour la certification **Concepteur Développeur d'Applications (RNCP Niveau 6)**.

Le code source de l'application reste dans le dépôt principal — ici on trouve les documents, captures et spécifications.

---

## Sommaire

| Dossier / fichier                  | Contenu                                                                 |
|------------------------------------|-------------------------------------------------------------------------|
| [`dossier-projet/`](./dossier-projet/) | Dossier de projet complet (corps + 17 annexes) au format Word         |
| [`swagger.json`](./swagger.json)   | Spécification OpenAPI 3.0 de l'API Cinés Délices                        |
| [`captures-creation-recette/`](./captures-creation-recette/) | Captures du jeu d'essai — annexe 17 du dossier             |
| [`captures-desktop/`](./captures-desktop/) | 31 captures des pages en version desktop                          |
| [`captures-mobile/`](./captures-mobile/)   | 31 captures des pages en version mobile                           |

---

## Accès à l'application en production

| Service | URL |
|---------|-----|
| Front (React)   | https://graceful-quietude-production.up.railway.app          |
| API (Node/Express) | https://cines-delicesapi-production.up.railway.app        |
| Swagger UI      | https://cines-delicesapi-production.up.railway.app/api/docs |

### Comptes de test (seed v-4)

| Rôle    | Email                              | Mot de passe   |
|---------|------------------------------------|----------------|
| Admin   | `admin@cinesdelices.fr`            | `Admin1234!`   |
| Membre  | `marie@cinesdelices.fr`            | `Member1234!`  |
| Membre  | `remy@cinesdelices.fr`             | `Member1234!`  |

Pour tester une route protégée par JWT via Swagger :
1. Appeler `POST /api/auth/login` avec un compte ci-dessus
2. Copier la valeur `token` de la réponse
3. Cliquer sur **Authorize** (cadenas en haut à droite de Swagger UI)
4. Coller le token dans le champ `bearerAuth` et valider
5. Les routes protégées peuvent maintenant être testées

---

## À propos

Projet réalisé dans le cadre de la formation CDA — École O'Clock, promotion Francfort, 2026.
