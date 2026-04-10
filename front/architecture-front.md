# Architecture Frontend React — Projet Ciné-Délices

## Objectif

Ce document explique une structure de projet React propre et maintenable pour un travail en équipe.

L'idée principale est de séparer les responsabilités du code afin que chaque développeur sache où placer :
- les composants
- les pages
- les layouts
- la logique applicative

L'objectif est d'obtenir une architecture claire, évolutive et facile à maintenir dans un projet collaboratif.

---

# Structure recommandée

```
src/
  assets/

  components/
    Navbar/
      Navbar.jsx
      Navbar.module.scss
      index.js

    Footer/
      Footer.jsx
      Footer.module.scss
      index.js

    RecipeCard/
      RecipeCard.jsx
      RecipeCard.module.scss
      index.js

    SearchBar/
      SearchBar.jsx
      SearchBar.module.scss
      index.js

  layouts/
    PublicLayout/
      PublicLayout.jsx
      PublicLayout.module.scss
      index.js

    MemberLayout/
      MemberLayout.jsx
      MemberLayout.module.scss
      index.js

  pages/
    Home/
      Home.jsx
      Home.module.scss
      index.js

    Recipes/
      Recipes.jsx
      Recipes.module.scss
      index.js

    RecipeDetail/
      RecipeDetail.jsx
      RecipeDetail.module.scss
      index.js

    Login/
      Login.jsx
      Login.module.scss
      index.js

    Membre/
      Membre.jsx
      Membre.module.scss
      index.js

    MesRecettes/
      MesRecettes.jsx
      MesRecettes.module.scss
      index.js

    Profil/
      Profil.jsx
      Profil.module.scss
      index.js

  router/
    index.jsx

  services/
    api.js
    recipes.service.js
    auth.service.js

  hooks/
    useAuth.js
    useRecipes.js

  utils/
    formatDate.js
    slugify.js

  styles/
    global.scss
    variables.scss

  App.jsx
  main.jsx
```

---

# Principe de séparation des responsabilités

## components
Contient les composants réutilisables dans plusieurs pages.

Exemples :
- Navbar
- Footer
- cartes de recettes
- boutons
- barres de recherche

Ces composants ne doivent **pas dépendre directement des routes**.

---

## layouts

Les layouts représentent les structures globales des pages.

Ils contiennent généralement :

- header
- navigation
- footer
- zone principale de contenu

Exemples :

- `PublicLayout`
- `MemberLayout`
- `AdminLayout`

Les layouts utilisent **React Router avec `<Outlet />`** pour afficher les pages.

---

## pages

Les pages correspondent aux **écrans accessibles par une URL**.

Chaque page correspond généralement à une route :

Exemples :

```
/ -> Home
/recipes -> Recipes
/recipes/:id -> RecipeDetail
/login -> Login
```

Chaque page possède son propre dossier.

---

## router

Le dossier `router` contient la configuration de **React Router**.

Cela permet de centraliser toute la configuration de navigation de l'application.

---

## services

Le dossier `services` contient les fonctions qui communiquent avec l'API backend.

Exemples :

- récupération des recettes
- authentification
- gestion des utilisateurs

Cela permet de **séparer la logique réseau de l'interface utilisateur**.

---

## hooks

Les hooks contiennent de la logique réutilisable.

Exemples :

- gestion de l'authentification
- récupération de données
- logique métier partagée

---

## utils

Les utilitaires contiennent des fonctions génériques :

Exemples :

- formatage de date
- génération de slug
- transformations de données

---

## styles

Le dossier `styles` contient les styles globaux :

- variables SCSS
- styles généraux
- mixins

---

# Exemple de configuration du router

```javascript
import { createBrowserRouter } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import Home from "../pages/Home";
import Recipes from "../pages/Recipes";
import RecipeDetail from "../pages/RecipeDetail";
import Login from "../pages/Login";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "recipes", element: <Recipes /> },
      { path: "recipes/:id", element: <RecipeDetail /> },
      { path: "login", element: <Login /> },
    ],
  },
]);

export default router;
```

---

# Bonnes pratiques pour le projet

Pour garder un projet maintenable en équipe, respecter les règles suivantes :

### 1️⃣ Un dossier par composant ou par page

Exemple :

```
Navbar/
  Navbar.jsx
  Navbar.module.scss
  index.js
```

---

### 2️⃣ Utiliser un fichier `index.js`

Le fichier `index.js` permet de simplifier les imports.

Au lieu de :

```javascript
import Navbar from "../../components/Navbar/Navbar";
```

on peut écrire :

```javascript
import Navbar from "../../components/Navbar";
```

---

### 3️⃣ Séparer clairement les responsabilités

Ne pas mélanger :

- logique API
- logique métier
- affichage

Chaque responsabilité doit être dans le bon dossier.

---

### 4️⃣ Maintenir une architecture cohérente

Toute l'équipe doit suivre les mêmes conventions :

- structure des dossiers
- nommage des composants
- organisation du code

---

### 5️⃣ Favoriser les composants réutilisables

Avant de recréer un composant, vérifier si un composant existant peut être réutilisé.

Cela permet de :

- réduire la duplication de code
- simplifier la maintenance
- améliorer la cohérence visuelle de l'application

---

# Conclusion

Une bonne architecture React permet :

- un projet plus lisible
- un code plus maintenable
- un travail d'équipe plus efficace
- une évolution plus simple du projet

En structurant correctement les dossiers et les responsabilités, l'application reste claire même lorsque le projet grandit.