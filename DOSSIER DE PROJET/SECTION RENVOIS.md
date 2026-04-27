# Dossier de Projet — Cinés Délices
### Titre Professionnel CDA RNCP Niveau 6 — O'Clock 2026

---

## Renvois — Éléments transversaux complémentaires

Les sections suivantes de la checklist CDA sont traitées dans les blocs
déjà rédigés de ce dossier. Les renvois ci-dessous permettent au jury
de les localiser rapidement.

---

### Organisation et architecture

**Organisation en couches de l'application**
→ Voir **section 2.2.1** — Architecture logicielle : description des trois
couches (présentation / logique métier / accès aux données) avec schéma ASCII
et justification des choix.

**Mécanismes d'intégration et d'interopérabilité**
→ Voir **section 2.6.2** — API REST (JSON), proxy TMDB, format des réponses.
Les échanges entre le frontend React et l'API Express utilisent exclusivement
le format JSON via HTTP/HTTPS. L'API externe TMDB est consommée côté serveur
via un proxy Express (protection de la clé API).

---

### Modèles de données

**Modèle Conceptuel de Données (MCD)**
→ Voir **section 2.3.1** et **Annexe P** — MCD réalisé avec Mocodo lors du
Sprint 0 : entités, associations et cardinalités.

**Modèle Logique de Données (MLD)**
→ Voir **section 2.3.2** — MLD textuel complet des 9 tables avec clés
primaires, clés étrangères et règles onDelete justifiées.

**Modèle Physique de Données (MPD)**
→ Voir **Annexe Q** — Schéma Prisma (`schema.prisma`) constituant le MPD
pour PostgreSQL 18, avec types, contraintes et migrations versionnées.

**Scripts de création de la base de données**
→ Voir **Annexe Q** — Le schéma Prisma et les migrations (`prisma/migrations/`)
constituent les scripts de création versionés. La commande
`prisma migrate deploy` applique les migrations en production.

**Sécurisation des accès à la base de données**
→ Voir **sections 2.2.2 et 2.3.3** — Principe de moindre privilège (variables
d'environnement Railway, `DATABASE_URL` jamais dans le code), requêtes
paramétrées via Prisma (injection SQL impossible par construction), aucun
identifiant en dur dans le code source.

---

### Accès aux données

**Stratégie d'accès aux données (ORM)**
→ Voir **section 2.4.1** — Prisma 7 comme ORM unique. Le pattern Repository
est appliqué : les controllers délèguent l'accès aux données à des fonctions
dédiées, jamais de requêtes Prisma directement dans les routes.

**Implémentation des requêtes**
→ Voir **section 2.4.1** — Exemple de requête catalogue avec pagination,
filtres et relations chargées. Voir **section 2.4.2** — Exemple de transaction
atomique pour le merge d'ingrédients.

**Intégration de bases NoSQL**
→ Non applicable. Le projet utilise exclusivement PostgreSQL (relationnel).
Ce choix est justifié par la nature fortement relationnelle des données
(recettes ↔ médias TMDB ↔ ingrédients ↔ catégories ↔ utilisateurs) qui
bénéficient des contraintes d'intégrité référentielle d'un SGBD relationnel.

---

### Validation des besoins

**Validation des besoins avec les parties prenantes**
→ Les besoins ont été validés lors du Sprint 0 en équipe de 5 développeurs,
en présence du référent pédagogique O'Clock lors des suivis hebdomadaires
(mercredis). Les User Stories ont été affinées après chaque sprint review
(vendredi) qui constituait le moment de validation par l'équipe et le
formateur. Voir **section 2.1.2** et **Annexe N**.