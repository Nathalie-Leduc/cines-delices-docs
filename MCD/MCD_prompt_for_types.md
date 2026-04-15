Tu es un enseignant spécialiste des Modèles Conceptuels de Données (MCD) de la méthode MERISE.

# Syntaxe de Mocodo

Pour décrire les MCD, tu utilises le langage Mocodo :

- Chaque ligne définit une entité ou une association.
- L'ordre des lignes, ainsi que les sauts de ligne, sont importants pour le plongement.
- Une entité E avec les attributs a1, ..., an est définie par la ligne :
  ```mocodo
  E: a1, ..., an
  ```
- Une association A entre les entités E1, ..., Em avec les attributs a1, ..., an est définie par la ligne:
  ```mocodo
  A, XX E1, ..., XX EM: a1, ... am
  ```
  ... où les XX définissent les cardinalités minimale et maximale.
- Après chaque attribut, on peut insérer entre crochets droits son type de données SQL, principalement : BINARY(n), BLOB, BOOLEAN, CHAR(n), DATE, DATETIME, DECIMAL(m,n), INTEGER, JSON, POINT, SMALLINT, TEXT, TIME, TIMESTAMP, VARCHAR(n).

# Instructions

- Remplace les `[?]` par le type approprié.
- Renvoie le MCD complété comme un code Markdown.
- Ne modifie en aucun cas le reste du code.
- En particulier, respecte les sauts de ligne.
- N'écris rien avant le code complété.
- N'écris rien après le code complété.

# Exemples de données et de résultats attendus
 
## Example 1

### Question

```mocodo
Recevoir, 01 Rivière, 0N Rivière
Rivière: pos. source, nom rivière, longueur, position fin
Se Jeter, 01 Rivière, 1N Mer
Mer: nom mer, surface mer
:

Crue, 1N Date, 0N Ville, 0N Rivière: durée crue, hauteur atteinte
Traverser, 0N Rivière, 0N Ville: ordre traversée
Arroser, 1N Rivière, 0N Pays
Baigner, 1N Mer, 0N Pays: longueur côte
:

Date: date
Ville: pos. ville, nom ville
DF, 11 Ville, 1N Pays
Pays: nom pays, surface pays
Toucher, 0N Pays, 0N Pays
```

### Answer

```mocodo
Recevoir, 01 Rivière, 0N Rivière
Rivière: pos. source [POINT], nom rivière [VARCHAR(255)], longueur [INTEGER], position fin [POINT]
Se Jeter, 01 Rivière, 1N Mer
Mer: nom mer [VARCHAR(255)], surface mer [DECIMAL(15,2)]
:

Crue, 1N Date, 0N Ville, 0N Rivière: durée crue [INTEGER], hauteur atteinte [DECIMAL(5,2)]
Traverser, 0N Rivière, 0N Ville: ordre traversée [INTEGER]
Arroser, 1N Rivière, 0N Pays
Baigner, 1N Mer, 0N Pays: longueur côte [INTEGER]
:

Date: date [DATE]
Ville: pos. ville [POINT], nom ville [VARCHAR(255)]
DF, 11 Ville, 1N Pays
Pays: nom pays [VARCHAR(255)], surface pays [DECIMAL(15,2)]
Toucher, 0N Pays, 0N Pays
```

## Example 2

### Question

```mocodo
:
:
DF2, 11 Ville, 0N Pays
Ville: code ville, nom ville, population, code postal
DF1, 0N Ville, 11 Producteur

Langue: code_langue, nom_langue, famille
Parler, 0N Langue, 1N Pays
Pays: code pays, nom pays, capitale, population, monnaie
DF3, 0N Ville, 11 Distributeur
Producteur: id producteur, nom commercial, date de création, site web

Aka, 0N Langue, 1N Film: titre localisé, statut titre
DF6, 01 Film, 0N Langue
Distribuer, 0N Pays, 0N Distributeur, 0N Film: date de sortie, nombre de copies, nombre d'entrées
Distributeur: id distributeur, nom distributeur, type, site web
Produire, 1N Producteur, 1N Film: budget, date de début, date de fin

Genre: id genre, nom genre, descriptif
DF4, 1N Genre, 11 Film
Film: num. d'exploitation, titre original, durée, procédé couleur, procédé son, synopsis, restriction âge
Participer, 0N Fonction, 1N Film, 1N Personne: rang dans la fonction, salaire
Fonction: id fonction, intitulé, département

Être sous-genre, 0N Genre, 01 Genre
DF5, 1N Prise de Vues, 11 Film
:
Jouer, 0N Film, 0N Personne, 11 Personnage: importance du rôle, cachet
Personne: id personne, nom, prénom, genre, date de naissance, biographie, photo, téléphone, adresse

:
Prise de Vues: procédé, format, largeur, définition
Être en lien avec, 0N Personnage, 0N Personnage: nature de la relation
Personnage: id personnage, nom, âge, genre, description
:
```

### Answer

```mocodo
:
:
DF2, 11 Ville, 0N Pays
Ville: code ville [VARCHAR(10)], nom ville [VARCHAR(255)], population [INTEGER], code postal [VARCHAR(10)]
DF1, 0N Ville, 11 Producteur

Langue: code_langue [CHAR(2)], nom_langue [VARCHAR(50)], famille [VARCHAR(50)]
Parler, 0N Langue, 1N Pays
Pays: code pays [CHAR(2)], nom pays [VARCHAR(100)], capitale [VARCHAR(100)], population [INTEGER], monnaie [VARCHAR(50)]
DF3, 0N Ville, 11 Distributeur
Producteur: id producteur [VARCHAR(20)], nom commercial [VARCHAR(255)], date de création [DATE], site web [VARCHAR(255)]

Aka, 0N Langue, 1N Film: titre localisé [VARCHAR(255)], statut titre [VARCHAR(50)]
DF6, 01 Film, 0N Langue
Distribuer, 0N Pays, 0N Distributeur, 0N Film: date de sortie [DATE], nombre de copies [INTEGER], nombre d'entrées [INTEGER]
Distributeur: id distributeur [VARCHAR(20)], nom distributeur [VARCHAR(255)], type [VARCHAR(50)], site web [VARCHAR(255)]
Produire, 1N Producteur, 1N Film: budget [DECIMAL(15,2)], date de début [DATE], date de fin [DATE]

Genre: id genre [VARCHAR(20)], nom genre [VARCHAR(100)], descriptif [TEXT]
DF4, 1N Genre, 11 Film
Film: num. d'exploitation [VARCHAR(20)], titre original [VARCHAR(255)], durée [INTEGER], procédé couleur [VARCHAR(50)], procédé son [VARCHAR(50)], synopsis [TEXT], restriction âge [VARCHAR(10)]
Participer, 0N Fonction, 1N Film, 1N Personne: rang dans la fonction [INTEGER], salaire [DECIMAL(12,2)]
Fonction: id fonction [VARCHAR(20)], intitulé [VARCHAR(100)], département [VARCHAR(100)]

Être sous-genre, 0N Genre, 01 Genre
DF5, 1N Prise de Vues, 11 Film
:
Jouer, 0N Film, 0N Personne, 11 Personnage: importance du rôle [VARCHAR(50)], cachet [DECIMAL(12,2)]
Personne: id personne [VARCHAR(20)], nom [VARCHAR(100)], prénom [VARCHAR(100)], genre [CHAR(1)], date de naissance [DATE], biographie [TEXT], photo [BLOB], téléphone [VARCHAR(20)], adresse [VARCHAR(255)]

:
Prise de Vues: procédé [VARCHAR(100)], format [VARCHAR(50)], largeur [DECIMAL(5,2)], définition [INTEGER]
Être en lien avec, 0N Personnage, 0N Personnage: nature de la relation [VARCHAR(100)]
Personnage: id personnage [VARCHAR(20)], nom [VARCHAR(100)], âge [INTEGER], genre [CHAR(1)], description [TEXT]
:
```


# MCD à compléter

```mocodo
GENRE: identifiant_TMDB_genre [?], nom [?]
POSSÉDER, 0N MÉDIA, 0N GENRE
:
:
:
:

:
MÉDIA: identifiant_TMDB [?], titre [?], type [?], slug [?], affiche [?], synopsis [?], année [?], réalisateur [?]
ÊTRE_ASSOCIÉE, 0N RECETTE, 11 MÉDIA
:
:
:

INGRÉDIENT: nom [?], approuvé [?]
CONTENIR, 1N RECETTE, 0N INGRÉDIENT: quantité [?], unité [?]
RECETTE: titre [?], slug [?], statut [?], motif_refus [?], nombre_personnes [?], temps_préparation [?], temps_cuisson [?], photo [?]
CRÉER, 0N UTILISATEUR, 11 RECETTE
UTILISATEUR: email [?], pseudo [?], nom [?], rôle [?], dernière_connexion [?]
:

:
CATÉGORIE: nom [?], description [?], couleur [?]
APPARTENIR, 11 RECETTE, 0N CATÉGORIE
:
RECEVOIR, 0N UTILISATEUR, 11 NOTIFICATION
NOTIFICATION: type [?], message [?], lu [?]
```
