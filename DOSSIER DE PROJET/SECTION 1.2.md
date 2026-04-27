### 1.2 Développement des interfaces utilisateur

#### 1.2.1 Charte graphique

La charte graphique de Ciné Délices s'inspire de l'univers du cinéma 
classique : salle obscure, projecteur doré, rideau bordeaux. Elle 
définit un langage visuel cohérent sur l'ensemble de l'application, 
conciliant atmosphère cinématographique, chaleur gastronomique et 
lisibilité optimale sur fond sombre.

**Palette de couleurs — couleurs principales :**

| Rôle | Couleur | Hex | Usage |
|------|---------|-----|-------|
| Fond principal | ⬛ Noir cinéma | `#1F1D1E` | Fond de page, header, footer |
| Accent primaire | 🟨 Or projecteur | `#C9A45C` | Titres, logo, boutons secondaires |
| Accent secondaire | 🟥 Bordeaux rideau | `#8E1F2F` | Boutons principaux, alertes |
| Texte sur fond sombre | 🟫 Crème parchemin | `#F6F1E8` | Corps de texte, fond ingrédients |
| Texte foncé | 🟫 Brun profond | `#4A3428` | Texte sur fond clair |

**Palette de couleurs — couleurs secondaires :**

| Rôle | Couleur | Hex | Usage |
|------|---------|-----|-------|
| Numérotation étapes | 🟩 Vert | `#6E8B5B` | Fond ronds de numérotation, texte blanc |
| Accent chaud | 🟨 Sable doré | `#FBDCA6` | Tags, highlights légers |
| Fond neutre | 🟫 Beige lin | `#E8DCC8` | Fonds alternatifs, séparateurs |
| Accent froid | 🟦 Bleu-vert | `#3A8A9A` | Éléments d'information, liens |

**Règles d'utilisation :**

- Fond principal → `#1F1D1E`
- Texte sur fond sombre → `#F6F1E8`
- Boutons principaux → background `#8E1F2F`, texte blanc, border-radius 10px
- Boutons secondaires → background transparent, border `1px solid #C9A45C`, 
  texte `#C9A45C`
- Titres → `#C9A45C`

**Typographie :**

| Police | Usage | Caractéristiques |
|--------|-------|-----------------|
| **Playfair Display** | Titres, titres de sections, éléments visuels importants | Élégante, inspiration éditoriale / cinéma, contraste fort |
| **Inter** | Texte courant, descriptions, navigation, informations recettes | Très lisible, moderne, optimisée pour UI |

**Hiérarchie typographique :**

| Niveau | Taille | Police |
|--------|--------|--------|
| H1 | 48 à 64 px | Playfair Display |
| H2 | 32 à 40 px | Playfair Display |
| H3 | 24 à 28 px | Playfair Display |
| Corps | 16 à 18 px | Inter |
| Petits labels | 12 à 14 px | Inter |

> ➡️ **Annexe A** — Charte graphique complète (palette, typographie, 
> boutons, cards, icônes, logo)

---

#### 1.2.2 Maquettes et wireframes

La conception visuelle a suivi une progression en trois étapes — 
comme au cinéma, on ne tourne pas sans storyboard :

**Étape 1 — Zoning :** découpage en grandes zones fonctionnelles 
(header, contenu, sidebar, footer) sans aucun détail visuel. 
L'objectif est de valider la structure avant d'y investir du temps.

**Étape 2 — Wireframes :** structure en noir et blanc. 
On positionne les éléments, on définit la hiérarchie d'information 
et on valide la navigation sans se laisser distraire par les couleurs. 
C'est le plan d'architecte avant de choisir la peinture des murs.

**Étape 3 — Maquettes (Mockups) :** application de la charte 
graphique sur la structure validée : vraies couleurs, typographies 
Playfair / Inter, images de référence, icônes définitives.

**22 pages modélisées, en version Desktop (1200px) et Mobile (390px) :**

| # | Page | Public cible |
|---|------|-------------|
| 01 | Accueil | Tous |
| 02 | Catalogue des recettes | Tous |
| 03 | Détail d'une recette | Tous |
| 04 | Catalogue des films | Tous |
| 05 | Catalogue des séries | Tous |
| 06 | Connexion | Visiteur |
| 07 | Inscription | Visiteur |
| 08 | Réinitialisation du mot de passe | Visiteur |
| 09 | Contact | Tous |
| 10 | Mes recettes | Membre |
| 11 | Créer / modifier une recette | Membre |
| 12 | Profil membre | Membre |
| 13 | Notifications | Membre / Admin |
| 14 | Admin — Validation des recettes | Admin |
| 15 | Admin — Toutes les recettes | Admin |
| 16 | Mentions légales | Tous |
| 17 | Catégorie de recettes | Tous |
| 18 | Détail film / série | Tous |
| 19 | Membre — Validation (retour soumission) | Membre |
| 20 | Admin — Gérer | Admin |
| 21 | Admin — Détail validation | Admin |
| 22 | Admin — Ajouter une catégorie | Admin |

> ➡️ **Annexe B** — 22 wireframes Desktop (WFD-01 à WFD-22)  
> ➡️ **Annexe C** — 22 wireframes Mobile (WFM-01 à WFM-22)  
> ➡️ **Annexe D** — 22 maquettes Desktop (MQD-01 à MQD-22)  
> ➡️ **Annexe E** — 22 maquettes Mobile (MQM-01 à MQM-22)

---

#### 1.2.3 Choix ergonomiques et UX/UI

**Navigation persistante avec badge dynamique :**
La barre de navigation est présente sur toutes les pages et adapte 
son contenu au rôle de l'utilisateur connecté (visiteur / membre / 
admin). L'administrateur voit un badge numérique indiquant le nombre 
de recettes en attente de modération — il ne peut pas manquer 
une action à traiter.

**Catalogue avec recherche temps réel :**
Un debounce de 400ms est appliqué sur le champ de recherche. 
L'application n'envoie pas une requête à chaque frappe, mais attend 
que l'utilisateur ait fini de taper. Analogie : c'est comme un 
serveur qui laisse le client finir sa commande avant de filer 
en cuisine.

**Workflow de création de recette (DRAFT → PENDING → PUBLISHED) :**
Le formulaire de création est découpé en sections thématiques. 
L'utilisateur peut sauvegarder en brouillon (DRAFT) à tout moment 
et soumet à publication uniquement quand il est prêt. Ce statut 
est visible en temps réel sur la page "Mes recettes" via des badges 
colorés — l'utilisateur sait toujours où en est sa recette.

**Cards de recettes immersives :**
Chaque card affiche : image culinaire, tag catégorie, titre, 
film ou série associé, temps de préparation, icône type (Film/Série).
Le fond semi-transparent `rgba(0,0,0,0.6)` sur l'image préserve 
la lisibilité du texte quelle que soit l'image.

**Feedback utilisateur :**
Chaque action (soumission, suppression, connexion) déclenche 
un retour visuel immédiat. L'utilisateur n'est jamais dans 
l'incertitude sur l'état de sa requête.

---

#### 1.2.4 Technologies front-end

Le frontend est une **SPA (Single Page Application)** construite 
avec React 19 et Vite. React Router v7 gère l'intégralité du 
routing côté client, ce qui produit une navigation instantanée 
entre les pages — sans rechargement, sans clignotement, 
comme une application native.

**Structure des styles — SCSS + méthodologie BEM :**

BEM (Block Element Modifier) impose une convention de nommage qui 
rend chaque classe auto-documentée :

```scss
.recipe-card { }              /* Bloc */
.recipe-card__image { }       /* Élément : l'image de la card */
.recipe-card__title { }       /* Élément : le titre */
.recipe-card--featured { }    /* Modificateur : card mise en avant */
```

En lisant `.recipe-card__image`, on sait immédiatement que c'est 
l'image appartenant au composant `recipe-card`, sans avoir à 
chercher dans le code. Cela élimine les conflits de styles entre 
composants dans un projet à cinq développeurs.

**Variables CSS globales issues de la charte :**

```scss
:root {
  /* Palette officielle */
  --color-noir:     #1F1D1E;
  --color-or:       #C9A45C;
  --color-bordeaux: #8E1F2F;
  --color-creme:    #F6F1E8;
  --color-brun:     #4A3428;
  --color-vert:     #6E8B5B;
  --color-sable:    #FBDCA6;
  --color-beige:    #E8DCC8;
  --color-teal:     #3A8A9A;

  /* Typographie */
  --font-titre: 'Playfair Display', Georgia, serif;
  --font-corps: 'Inter', sans-serif;
}
```

---

#### 1.2.5 Responsive — approche Mobile First

L'application est pensée **Mobile First** : on conçoit d'abord 
pour le plus petit écran (390px), puis on enrichit pour les écrans 
plus larges. C'est plus robuste que l'inverse — retirer des 
éléments d'un design desktop sur mobile génère souvent des 
incohérences.

| Breakpoint | Largeur | Adaptations principales |
|------------|---------|------------------------|
| Mobile | < 768px | Navigation hamburger, grille 1 colonne, formulaires pleine largeur |
| Tablette | 768px – 1024px | Grille 2 colonnes, sidebar réduite |
| Desktop | > 1024px | Grille 3–4 colonnes, sidebar complète, navbar horizontale |

```scss
/* Mobile first : base pour mobile */
.catalog-grid {
  display: grid;
  grid-template-columns: 1fr;   /* 1 colonne */
  gap: var(--gap-md);
}
/* On enrichit progressivement */
@media (min-width: 768px) {
  .catalog-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .catalog-grid { grid-template-columns: repeat(3, 1fr); }
}
```

---

#### 1.2.6 Accessibilité (RGAA / WCAG 2.1 AA)

Le RGAA a été intégré dès la phase de conception, pas ajouté 
en fin de projet.

**Contrastes :**
Le ratio entre le texte crème `#F6F1E8` et le fond noir `#1F1D1E` 
atteint **14.8:1**, bien au-delà du minimum WCAG de 4.5:1. 
Les boutons bordeaux `#8E1F2F` sur fond crème respectent également 
ce critère.

**Autres mesures implémentées :**
- Alternatives textuelles (`alt`) sur toutes les images ; 
  `alt=""` pour les images décoratives
- Navigation clavier complète (Tab, Entrée, Échap)
- Labels de formulaire associés via `htmlFor` / `id`
- Attributs ARIA : `aria-label`, `aria-live` (messages d'erreur), 
  `aria-expanded` (menu hamburger)

```jsx
<label htmlFor="recipe-title">Titre de la recette *</label>
<input
  id="recipe-title"
  type="text"
  aria-required="true"
  aria-describedby="title-error"
/>
{error && (
  <span id="title-error" role="alert" aria-live="polite">
    {error}
  </span>
)}
```

---

#### 1.2.7 Performances — résultats Lighthouse (27 avril 2026)

Les performances ont fait l'objet d'un travail d'optimisation 
spécifique, notamment sur mobile : conversion des images en WebP 
avec Sharp, code splitting par route (React `lazy` / `Suspense`), 
et headers de cache HTTP via Caddyfile en production.

**Scores obtenus sur l'URL de production :**

| Métrique | Desktop | Mobile |
|----------|---------|--------|
| Performances | 98 | 78 |
| Accessibilité | 97 | 96 |
| Bonnes pratiques | 96 | 100 |
| SEO | 92 | 92 |

Le score de performance mobile (78) est plus bas que le desktop 
(98), ce qui est habituel : le simulateur Lighthouse mobile 
applique une limitation CPU et réseau qui pénalise les 
applications riches. Les pistes d'amélioration identifiées 
sont la réduction du LCP (Largest Contentful Paint) et 
l'optimisation du TBT (Total Blocking Time).

> ➡️ **Annexe F** — Captures d'écran complètes des rapports 
> Lighthouse Desktop et Mobile

---

#### 1.2.8 Validation des champs et sécurité front-end

**Validation côté client :**
La validation côté client offre un retour immédiat à l'utilisateur 
sans aller-retour serveur. Elle ne remplace pas la validation 
serveur (voir section 1.3) — elle la précède.

| Champ | Règle | Message affiché |
|-------|-------|-----------------|
| Titre recette | Requis, 3–100 caractères | "Le titre doit contenir entre 3 et 100 caractères" |
| Catégorie | Sélection obligatoire | "Veuillez choisir une catégorie" |
| Temps (préparation/cuisson) | Entier positif, max 9999 min | "Valeur invalide" |
| Ingrédients | Au moins 1 requis | "Ajoutez au moins un ingrédient" |
| Email | Format RFC 5322 | "Format d'email invalide" |
| Mot de passe | Min 8 chars, 1 majuscule, 1 chiffre | "Le mot de passe ne respecte pas les critères" |

**Protection XSS :**
React échappe automatiquement tout contenu affiché via JSX — 
`{variable}` est converti en entités HTML avant rendu, ce qui 
neutralise les tentatives d'injection de scripts. 
Le projet n'utilise `dangerouslySetInnerHTML` nulle part, 
éliminant ce vecteur d'attaque par conception.

**Affichage conditionnel selon le rôle :**
Les composants sensibles (boutons admin, options de modération) 
ne sont rendus dans le DOM que si l'utilisateur possède 
le rôle `admin`. Un visiteur qui inspecterait le code source 
ne verrait pas ces éléments.

```jsx
{user?.role === 'admin' && (
  <AdminPanel />   // jamais rendu pour un membre ou visiteur
)}
```