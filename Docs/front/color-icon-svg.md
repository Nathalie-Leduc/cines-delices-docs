# Modifier directement la couleur d’une icône SVG en éditant son XML

Dans notre projet, lorsque nous utilisons une icône SVG avec une balise :

```jsx
<img src="/icon/Menu.svg" alt="Menu" />
```

le SVG est chargé comme une **image externe**.

Dans ce cas, les propriétés CSS comme :

```scss
color: #c9a45c;
fill: #c9a45c;
stroke: #c9a45c;
```

ne permettent **pas** de changer la couleur interne du SVG depuis le composant parent.

## Conclusion

Si nous utilisons les SVG avec `<img />`, la méthode la plus simple et la plus fiable consiste à :

- ouvrir le fichier `.svg`
- modifier directement son code XML
- remplacer les valeurs de `stroke` et/ou `fill` par la couleur souhaitée

---

# Quand utiliser cette méthode

Cette méthode est recommandée si :

- on veut aller vite
- on utilise les SVG via `<img src="...">`
- on ne veut pas mettre en place une gestion avancée des SVG comme composants React
- on veut une couleur fixe et cohérente avec la charte graphique

---

# Étapes dans VS Code

## 1. Ouvrir le fichier SVG

Dans l’explorateur VS Code :

```text
client/public/icon/Menu.svg
client/public/icon/close_menu.svg
```

Double-cliquer sur le fichier.

---

## 2. Si VS Code affiche seulement l’image

Faire un clic droit sur le fichier puis :

```text
Open With → Text Editor
```

ou :

```text
Ouvrir avec → Éditeur de texte
```

L’objectif est de voir le **code XML** du fichier SVG.

---

## 3. Repérer les attributs `stroke` et `fill`

Dans le code, on peut trouver par exemple :

```xml
<svg width="30" height="30" viewBox="0 0 30 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M6.25 8.75H23.75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 15H23.75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 21.25H23.75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>
```

---

## 4. Remplacer `currentColor` par la couleur voulue

Dans notre projet Ciné-Délices, la couleur dorée de la charte est :

```text
#c9a45c
```

On remplace donc :

- `stroke="currentColor"` → `stroke="#c9a45c"`
- `fill="currentColor"` → `fill="#c9a45c"`

---

# Exemple concret : icône burger

## Avant

```xml
<svg width="30" height="30" viewBox="0 0 30 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M6.25 8.75H23.75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 15H23.75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 21.25H23.75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>
```

## Après

```xml
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6.25 8.75H23.75" stroke="#c9a45c" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 15H23.75" stroke="#c9a45c" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 21.25H23.75" stroke="#c9a45c" stroke-width="3" stroke-linecap="round"/>
</svg>
```

### Pourquoi `fill="none"` ici ?

Pour une icône burger faite uniquement de traits, `fill="none"` est plus propre car l’icône n’a pas besoin de surface remplie.

---

# Exemple concret : icône de fermeture

## Avant

```xml
<svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M15.5 1L1 15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M1 1L15.5 15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

## Après

```xml
<svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M15.5 1L1 15.5" stroke="#c9a45c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M1 1L15.5 15.5" stroke="#c9a45c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

---

# Astuce pratique dans VS Code

Pour aller plus vite :

## Rechercher

Sur Mac :

```text
Cmd + F
```

Sur Windows :

```text
Ctrl + F
```

Chercher :

```text
currentColor
```

Puis remplacer par :

```text
#c9a45c
```

---

# Quand modifier `stroke` ou `fill` ?

## Utiliser `stroke`
Quand l’icône est dessinée avec des lignes ou des contours.

Exemples :
- burger
- croix de fermeture
- flèches fines

## Utiliser `fill`
Quand l’icône contient des surfaces remplies.

Exemples :
- pictogrammes pleins
- formes pleines
- logos simples

## Parfois il faut modifier les deux
Certaines icônes utilisent à la fois :
- `stroke`
- `fill`

Dans ce cas, il faut remplacer les deux si l’on veut une couleur uniforme.

---

# Limites de cette méthode

Cette méthode est très pratique, mais il faut savoir qu’elle :

- fixe la couleur directement dans le fichier
- ne permet pas facilement de changer la couleur au hover via CSS
- est moins flexible qu’un SVG importé comme composant React

---

# Pourquoi nous choisissons cette méthode

Dans notre projet, nous avons choisi cette méthode car elle est :

- simple
- rapide
- fiable
- suffisante pour les besoins actuels

Elle permet d’obtenir une icône visuellement cohérente avec la charte sans ajouter de complexité inutile.

---

# Résumé

Si nous utilisons un SVG avec :

```jsx
<img src="/icon/Menu.svg" alt="Menu" />
```

alors la couleur doit être définie directement dans le fichier `.svg`.

## Règle simple

- ouvrir le fichier SVG dans VS Code
- remplacer `stroke="currentColor"` par `stroke="#c9a45c"`
- remplacer `fill="currentColor"` par `fill="#c9a45c"` si nécessaire
- enregistrer
- recharger l’application

---

# Exemple final minimal

```xml
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6.25 8.75H23.75" stroke="#c9a45c" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 15H23.75" stroke="#c9a45c" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.25 21.25H23.75" stroke="#c9a45c" stroke-width="3" stroke-linecap="round"/>
</svg>
```

Cette méthode est celle que nous retenons pour le moment dans l’équipe.