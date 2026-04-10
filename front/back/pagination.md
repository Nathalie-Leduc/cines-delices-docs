### Implémentation de la pagination et des filtres sur le catalogue recettes

Pour répondre au besoin du sprint, j’ai mis en place un endpoint backend dédié au catalogue public des recettes : `GET /api/recipes`.

L’objectif était de permettre au front de :
- récupérer uniquement les recettes publiques,
- limiter le nombre de recettes affichées par page,
- naviguer entre plusieurs pages,
- filtrer les recettes par catégorie,
- rechercher des recettes par mot-clé.

---

### 1. Création de la route `/api/recipes`

J’ai ajouté une route backend dédiée aux recettes dans un fichier `recipesRoutes.js`.

Cette route expose plusieurs endpoints autour des recettes, notamment :
- `GET /api/recipes` pour le catalogue paginé,
- `GET /api/recipes/:id` pour récupérer une recette précise,
- `POST /api/recipes` pour créer une recette,
- `PATCH /api/recipes/:id` pour modifier une recette,
- `DELETE /api/recipes/:id` pour supprimer une recette.

Ensuite, j’ai branché cette route dans le routeur principal, puis dans le point d’entrée du serveur afin que l’API réponde bien sur `/api/recipes`.

Sans cette étape, même si le contrôleur existait, le endpoint n’était pas réellement accessible.

---

### 2. Mise en place de la pagination dans le contrôleur

Dans le contrôleur `recipesController.js`, j’ai modifié la récupération des recettes pour qu’elle prenne en compte les paramètres de query suivants :
- `page`
- `limit`
- `category`
- `q`

#### Fonctionnement :
- `page` indique la page demandée
- `limit` indique le nombre maximum de recettes à renvoyer
- `category` permet de filtrer par catégorie
- `q` permet de rechercher par mot-clé

J’ai calculé :
- `skip = (page - 1) * limit`
- `take = limit`

Ce mécanisme permet à Prisma de ne renvoyer qu’un morceau des résultats, correspondant à la page demandée.

---

### 3. Filtrage des recettes

J’ai ajouté un filtre qui ne récupère que les recettes publiées :
- `status = PUBLISHED`

C’est important car le catalogue public ne doit afficher que les recettes visibles par les utilisateurs.

Ensuite, j’ai ajouté deux filtres complémentaires :

#### Filtre catégorie
Le paramètre `category` permet de filtrer :
- soit par `categoryId`,
- soit par nom de catégorie, de manière insensible à la casse.

#### Filtre de recherche
Le paramètre `q` permet de chercher un mot-clé dans :
- le titre de la recette,
- le nom de la catégorie,
- le titre du média associé.

Cela permet au front d’avoir une recherche simple sur le catalogue.

---

### 4. Réponse structurée pour le front

Au lieu de retourner seulement un tableau de recettes, j’ai structuré la réponse sous cette forme :

```json
{
  "recipes": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalItems": 40,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```
Cette structure de réponse est essentielle pour le front, car elle permet d’afficher les recettes de la page courante, d’afficher le nombre total de pages, et d’activer ou désactiver les boutons “page suivante” / “page précédente”.

J’ai ensuite ajouté une validation des paramètres de requête avec Zod dans `recipesValidator.js` afin de sécuriser les données envoyées à l’endpoint. Les paramètres validés sont :
- `page` comme entier positif,
- `limit` comme entier positif,
- `category` comme chaîne optionnelle,
- `q` comme chaîne optionnelle.

Cela permet d’éviter des valeurs invalides, de nettoyer les entrées et de fiabiliser le comportement du backend.

J’ai également ajouté un helper manquant. Le contrôleur des recettes utilisait `successResponse` et `asyncHandler`, mais le fichier correspondant n’existait pas réellement dans le projet. J’ai donc créé `responseHelper.js` afin de standardiser certaines réponses, d’encapsuler proprement les contrôleurs asynchrones et d’éviter de répéter le code de gestion d’erreur.

En parallèle, j’ai corrigé un import d’authentification dans `usersRoutes.js`. Une route importait un middleware `requireAuth` depuis un fichier inexistant. Je l’ai remplacé par le middleware déjà présent dans le projet, `authMiddleware`. Cette correction n’est pas directement liée à la pagination, mais elle sécurise le bon fonctionnement global des routes utilisateurs.

Côté base de données, j’ai ajouté dans `schema.prisma` un index combiné sur `status` et `categoryId`. L’objectif est d’optimiser les requêtes du catalogue, puisque ce sont précisément les champs utilisés pour filtrer les recettes publiées et, éventuellement, une catégorie. Cet index est donc cohérent avec le besoin de pagination et de filtres sur le catalogue.

Une fois l’implémentation terminée, j’ai effectué une première vérification technique de l’endpoint avec les commandes suivantes :

```bash
curl "http://localhost:3000/api/recipes"
curl "http://localhost:3000/api/recipes?page=1&limit=5"
curl "http://localhost:3000/api/recipes?page=1&limit=5&category=Plat&q=rat"
```
À ce stade, la route répondait correctement, mais retournait un tableau vide, ce qui était logique puisque la table `recipes` était encore vide.

Pour pouvoir tester réellement la pagination, j’ai ensuite injecté des données avec le seed :

```bash
docker exec -it cines-delices-api-1 npm run db:seed
```
Le seed a créé :

- 40 recettes,
- toutes en statut PUBLISHED,
- réparties sur plusieurs catégories.
- Cela a permis de tester la pagination dans des conditions réelles.

J’ai ensuite validé le comportement final avec plusieurs appels sur différentes pages :

```bash
curl "http://localhost:3000/api/recipes?page=1&limit=2"
curl "http://localhost:3000/api/recipes?page=2&limit=2"
curl "http://localhost:3000/api/recipes?page=3&limit=2"
```
Les résultats ont confirmé que :

- chaque page retourne bien un nombre limité de recettes,
- les recettes changent bien d’une page à l’autre,
- totalItems est cohérent,
- totalPages est cohérent,
- hasNextPage et hasPreviousPage sont correctement calculés.

Exemple observé :

- limit = 2
- totalItems = 40
- totalPages = 20

Cela confirme que la pagination fonctionne correctement.

Au final, le backend permet maintenant au front d’appeler un endpoint de catalogue capable de :

- récupérer uniquement les recettes publiées,
- filtrer par catégorie,
- rechercher par mot-clé,
- limiter le nombre de résultats par page,
- fournir toutes les métadonnées nécessaires à l’affichage de la pagination.

En résumé :

- les filtres déterminent quelles recettes sont éligibles,
- la pagination découpe ce résultat en pages,
- le front peut ensuite afficher N recettes par page et naviguer entre elles proprement.