## Intégration front du catalogue recettes connecté à l’API

Dans cette étape, le front a été branché sur les vraies données issues de l’API et donc de la base de données, afin de rendre le catalogue recettes dynamique et exploitable côté utilisateur.

### 1. Connexion du catalogue front à l’API

La page `RecipesPage` ne repose plus uniquement sur des données statiques ou locales. Elle interroge maintenant l’endpoint backend du catalogue recettes via le service `recipesService`.

Le front appelle désormais l’API avec les paramètres suivants :
- `page`
- `limit`
- `category`
- `q`

Exemple d’appel :
```http
GET /api/recipes?page=1&limit=6&category=Plat&q=ratatouille
```
Cela permet au catalogue d’être alimenté par les données réellement stockées en BDD.

### 2. Affichage des recettes de la BDD

Les recettes récupérées depuis l’API sont transformées dans le front pour être compatibles avec le composant RecipeCard.

Le mapping permet notamment de récupérer :
- l’identifiant ou le slug,
-	le titre de la recette,
-   la catégorie,
-    le titre du film ou de la série associé,
- 	le type de média,
-	la durée totale,
-	l’image du poster.

Ainsi, les cartes visibles dans le catalogue correspondent désormais aux données réelles venant de la base.

### 3. Mise en place de la pagination côté front

Le catalogue lit maintenant les métadonnées de pagination renvoyées par l’API, ou les reconstitue temporairement si l’API renvoie encore un tableau brut.

Le front exploite :
-	page
-	limit
-	totalItems
-	totalPages
-	hasNextPage
-	hasPreviousPage

Grâce à cela, l’interface affiche :
-	le nombre total de recettes trouvées,
-	la page courante,
-	le nombre total de pages,
-	les boutons Précédent et Suivant.

Le nombre de recettes affichées par page peut aussi être modifié via un sélecteur (6, 9, 12).

### 4. Ajout des filtres catégorie et recherche texte

Le catalogue supporte désormais deux types de filtres :
-	les filtres par catégorie (Tous, Entrée, Plat, Dessert, Boisson)
-	la recherche texte par mot-clé

Ces filtres sont stockés dans l’URL via les query params, ce qui permet :
-	de conserver l’état du catalogue,
-	de partager un lien filtré,
-	de recharger la page sans perdre les critères.

Exemple :

```
/recipes?page=1&limit=6&category=plat&q=ratatouille
```
### 5. Gestion de la compatibilité avec l’état actuel du backend

Le front a été rendu compatible avec deux formats de réponse possibles de l’API.

Nouveau format attendu :
```
{
  "recipes": [...],
  "pagination": {...}
}
```
Ancien format encore présent sur certaines branches :

```
[
  {...},
  {...}
]
```
Si l’API renvoie déjà recipes + pagination, le front l’utilise directement.

Si l’API renvoie encore un tableau brut, le service recipesService applique localement :
-	le filtrage par catégorie,
-	la recherche texte,
-	la pagination.

Cela permet d’avoir un comportement fonctionnel côté UI même si le backend n’est pas encore complètement aligné.

### 6. Clarification de l’expérience utilisateur sur les filtres

Une confusion était apparue car la recherche texte et la catégorie se cumulaient.

Exemple :
-	recherche : ratatouille
-	filtre catégorie : Entrée

Dans ce cas, le front ne montre pas “toutes les entrées”, mais seulement “les entrées qui correspondent aussi à ratatouille”.

Pour rendre cela plus clair, plusieurs améliorations UX ont été ajoutées :
-	affichage explicite du résumé des filtres actifs,
-	bouton Réinitialiser les filtres,
-	bouton × pour effacer rapidement la recherche.

Cela permet à l’utilisateur de comprendre qu’il peut cumuler ou vider les filtres.

### 7. Amélioration de la barre de recherche du header

La recherche du header a été branchée sur la même logique que le catalogue.

Elle interroge désormais les recettes stockées en BDD via getRecipesCatalog() et propose :
-	des suggestions en direct,
-	le nom de la recette,
-	le nom du film ou de la série associé,
	•	une miniature d’image,
	•	un clic direct vers la page détail de la recette.

Le formulaire du header permet aussi une redirection directe vers /recipes?q=... si l’utilisateur valide sa recherche.

### 8. Amélioration de la barre de recherche de la page Recipes

La barre de recherche principale de la page Recipes a été enrichie de la même manière que celle du header.

Elle propose maintenant :
-	des suggestions live,
-	une miniature,
-	le titre de la recette,
-	le média associé,
-	un lien direct vers la recette sélectionnée.

Le comportement entre le header et la page catalogue est donc désormais cohérent.

### 9. Résultat obtenu

À ce stade, le front permet :
-	d’afficher les recettes réelles stockées en base,
-	de les filtrer par catégorie,
-	de les rechercher par mot-clé,
-	de naviguer entre les pages,
-	de limiter le nombre de résultats par page,
-	d’utiliser des suggestions de recherche dans le header et dans la page catalogue,
-	de cliquer directement sur une recette depuis les suggestions.

En résumé, le catalogue recettes est maintenant fonctionnel côté front, connecté à la BDD via l’API, et suffisamment outillé pour offrir une vraie expérience utilisateur de recherche, filtrage et navigation.