# Ciné Délices

## Présentation Générale

- **Quoi ?** Conception et développement d'un site web de recettes de cuisine inspirées du cinéma et des séries.
- **Qui ?** Une entreprise fictive de divertissement (streaming, production cinématographique...) souhaitant proposer une expérience innovante à ses utilisateurs.
- **Pour qui ?** Amateurs de cuisine et de cinéma, curieux gourmands, fans de films et de séries.
- **Comment ?** En équipe à définir (positionnement via un formulaire de voeux) par l'équipe pédagogique. Organisation en méthode agile pour la gestion de projet.
- **Quand ?** En plusieurs sprints qui inclueront des tâches de : conception, code, déploiement, recettage, etc.
- **Pourquoi ?** Pour la réalisation d'un projet fictif à but pédagogique visant l'obtention du Titre Professionnel.

## Présentation du Projet de Développement

### Besoins Fonctionnels (Minimum Viable Product - MVP)

- **Catalogue de recettes :** affichage, recherche (par titre de recette ou de film/série), filtre (par catégorie, entrée plat ou dessert par exemple).
- **Page recette :** ingrédients (sous forme de texte), instructions, film/série associé, informations complémentaires (anecdote par exemple).
- **Système d'authentification :** connexion, inscription, gestion de profil utilisateur.
- **Page ajout d’une recette :** accessible uniquement pour les personnes connectées.
- **Back-office (administration) :** gestion des recettes, des catégories, des utilisateurs.

### Propositions d’évolutions possibles

- **Fonctionnalités sociales :** commentaires (avec modération dans le back-office), likes, système de notation des recettes.
- **Gestion des ingrédients** (rappel : en MVP on gère les ingrédients sous forme de texte).
- **Catalogue de recettes :** ajouter un filtre supplémentaire (par ingrédient).
- **Liste de courses :** possibilité de générer une liste de courses à partir d'une ou plusieurs recettes séléctionnées par l'utilisateur.
- **Système de favoris :** possibilité de sauvegarder des recettes dans une liste de favoris.
- **Recommendations personnalisées :** système de recommandation de recettes en fonction des recettes, des films/séries, des favoris, des commentaires, etc.
- **Dashboard utilisateur :** statistiques sur les recettes des films/séries favoris, les recettes réalisées, les recettes commentées, etc.
- **Système de notifications :** pour les commentaires, les likes, les recettes similaires, etc.
- **Classement des recettes :** par popularité, par note, par date de publication, etc.
- **Moteur de recherche dynamique :** affichage des résultats pertinents au fur et à mesure de la saisie, classé par pertinence ou popularité.
- **Support multilingue :** au moins anglais et français.

### Contraintes Techniques (notamment liées au TP)

- **Technologies** : choix libres mais justifiés.
- **Sécurité :** authentification sécurisée, protection contre les failles courantes (XSS, injections SQL, etc.).
- **Déploiement :** rédaction a minima d'une procédure de déploiement (CI/CD en bonus).
- **Responsive :** application développée en mobile first et responsive.
- **Accessibilité :** respect des normes d'accessibilité web [WCAG](https://www.w3.org/Translations/WCAG20-fr/).
- **RGPD et mentions légales :** mettre en place les mentions légales liées au règlement général sur la protection des données (RGPD).
- **Versionning :** utilisation de Git et GitHub.
- **API** : en consommer au moins une (qu’elle soit interne ou externe). Un seul appel peut être suffisant, l’API ne doit pas forcément être utilisée pour tout le projet.
- **SEO** : appliquer les bonnes pratiques visant à maximiser le référencement du projet.
- **Tests** : plan de tests couvrant les fonctionnalités principales du projet.
- **Conteneurisation (Docker)** : pour l'environnement de développement voire pour le déploiement
- **Démarche d'éco-conception** (optimisation des images, minification des fichiers, etc.).

### Informations & Ressources complémentaires

- Ne pas hésiter à utiliser des contenus “lorem ipsum” au moins le temps d'avoir un MVP fonctionnel.
- Exemples de sites web pour des inspirations graphiques : [Marmiton](https://www.marmiton.org/), [750g](https://www.750g.com/).

## Pour terminer

- Le projet est libre d'interprétation, l'équipe peut proposer ses propres choix techniques et fonctionnels. Il est donc évolutif et il ne faut pas hésiter à se l'approprier.
- L'accent doit être mis sur l'apprentissage et la mise en pratique des compétences acquises pendant la formation (objectif TP).
- L'équipe pédagogique assure l'accompagnement et conseille tout au long du projet. Elle interviendra aussi lors de la validation des choix techniques et fonctionnels. Elle sera garante de l'évaluation de la progression en vue de se préparer au mieux pour le TP.
- L'équipe pédagogique n'est en aucun cas positionnée en tant que représentante du client fictif du projet proposé.

:arrow_right: [Attendus sur le sprint 0](../.github/ISSUE_TEMPLATE/sp0-suivi-conception.md), dédié à la conception.
