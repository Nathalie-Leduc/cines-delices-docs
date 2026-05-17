# Tarteaucitron.js — Guide d'installation Cinés Délices

## Étape 1 : Installer le package

```bash
cd client   # (ou le dossier de votre app React)
npm install tarteaucitronjs
```

## Étape 2 : Copier les fichiers statiques dans public/

Tarteaucitron a besoin de ses fichiers (JS, CSS, langues, services)
accessibles en statique. On les copie dans `public/` pour que Vite
les serve directement.

```bash
# Créer le dossier
mkdir -p public/tarteaucitron

# Copier les fichiers de la lib
cp node_modules/tarteaucitronjs/tarteaucitron.js public/tarteaucitron/
cp node_modules/tarteaucitronjs/tarteaucitron.min.js public/tarteaucitron/
cp -r node_modules/tarteaucitronjs/css public/tarteaucitron/
cp -r node_modules/tarteaucitronjs/lang public/tarteaucitron/
cp -r node_modules/tarteaucitronjs/advertising public/tarteaucitron/
```

## Étape 3 : Ajouter le thème CSS Cinés Délices

Copier le fichier `tarteaucitron-theme-cines-delices.css` dans :

```
public/tarteaucitron/css/tarteaucitron-theme-cines-delices.css
```

Puis l'importer dans votre `index.html` (dans `<head>`) :

```html
<link rel="stylesheet" href="/tarteaucitron/css/tarteaucitron-theme-cines-delices.css" />
```

## Étape 4 : Placer le composant CookieConsent

Copier `CookieConsent.jsx` dans `src/components/`.

Puis l'ajouter dans **App.jsx** (ou le composant racine du routeur),
PAS dans chaque Layout :

```jsx
// App.jsx
import CookieConsent from './components/CookieConsent';

function App() {
  return (
    <>
      <CookieConsent />
      {/* <RouterProvider router={router} /> ou vos routes */}
    </>
  );
}
```

Pourquoi dans App et pas dans les Layouts ?
→ Le bandeau doit s'afficher UNE SEULE FOIS quelle que soit la page.
   Si vous le mettez dans AdminLayout + MemberLayout + PublicLayout,
   il se rechargera à chaque changement de layout.

## Étape 5 : Vérifier

1. Lancez `npm run dev`
2. Ouvrez votre site
3. Le bandeau doit apparaître en bas de page
4. Vérifiez :
   - [ ] Le bouton "Tout accepter" est visible
   - [ ] Le bouton "Tout refuser" est visible (obligation CNIL)
   - [ ] Le lien vers les mentions légales fonctionne
   - [ ] Après choix, le bandeau disparaît
   - [ ] L'icône en bas à gauche permet de rouvrir les préférences
   - [ ] En supprimant le cookie "tarteaucitron" dans les DevTools,
         le bandeau réapparaît

## Étape 6 : Quand vous ajouterez un service tiers

Si plus tard vous ajoutez Google Analytics, YouTube, etc.,
il suffira d'ajouter le service dans CookieConsent.jsx :

```jsx
// Exemple : ajout de Google Analytics
script.onload = () => {
  // ... après tarteaucitron.init(...)

  // Déclarer Google Analytics
  window.tarteaucitron.user.gtagUa = 'G-XXXXXXXXXX';
  (window.tarteaucitron.job = window.tarteaucitron.job || []).push('gtag');
};
```

Tarteaucitron gère automatiquement le consentement :
le script GA ne se chargera QUE si l'utilisateur accepte.

## Structure finale

```
client/
├── public/
│   └── tarteaucitron/
│       ├── tarteaucitron.js
│       ├── tarteaucitron.min.js
│       ├── css/
│       │   ├── tarteaucitron.css (fichier d'origine)
│       │   └── tarteaucitron-theme-cines-delices.css (notre thème)
│       ├── lang/
│       │   ├── tarteaucitron.fr.js
│       │   └── ...
│       └── advertising/
│           └── ...
├── src/
│   └── components/
│       └── CookieConsent.jsx
└── index.html (avec le lien CSS du thème)
```
