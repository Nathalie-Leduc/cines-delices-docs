## Pourquoi utiliser `react-router-dom` plutôt que `react-router`

Dans un projet React web, il existe deux packages liés au routing :

| Package | Rôle |
|---|---|
| `react-router` | Le moteur de routing (logique interne, agnostique de la plateforme) |
| `react-router-dom` | L’adaptation de React Router pour les applications web utilisant le DOM |

### Différence entre les deux

- **`react-router`** contient uniquement la logique de navigation.
- **`react-router-dom`** fournit les composants nécessaires pour naviguer dans une application web (basée sur le navigateur).

Une application React qui s’exécute dans un navigateur doit donc utiliser **`react-router-dom`**, car ce package gère les interactions avec le **DOM** et l’historique du navigateur.

---

## Exemple d’import correct

Dans un projet web React, il faut importer les composants de routing depuis :

```javascript
import { Outlet } from "react-router-dom";
```
et non :

```javascript
import { Outlet } from "react-router";
```

### Rôle du composant Outlet

Outlet est un placeholder utilisé dans un layout pour afficher les routes enfants.

```jsx
import { Outlet } from "react-router-dom";

function PublicLayout() {
  return (
    <>
      <header>Header</header>

      <main>
        <Outlet />
      </main>

      <footer>Footer</footer>
    </>
  );
}

export default PublicLayout;
```

Exemple de configuration du router

```jsx
<Route element={<PublicLayout />}>
  <Route path="/" element={<Home />} />
</Route>
```
Résultat affiché dans l’application

```
Header
Home
Footer
```
Le composant Home est automatiquement injecté à l’emplacement du `<Outlet />`.

Bonne pratique

Pour toute application React exécutée dans un navigateur :

```
React Router pour le web = react-router-dom
```
Cela garantit :

	•	une navigation correcte dans le navigateur
	•	la gestion de l’historique (BrowserRouter)
	•	le fonctionnement des routes imbriquées (Outlet)
    