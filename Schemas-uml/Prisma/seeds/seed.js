import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { generateUniqueSlug } from '../src/utils/slug.js';


// adapter obligaoire avec Prisma V7
const connectionString = process.env.DATABASE_URL;
const isLocalDatabase = /@(localhost|127\.0\.0\.1|db):\d+/i.test(connectionString || '');

const pool = new pg.Pool({
  connectionString,
  ...(isLocalDatabase ? {} : { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('🌱 Démarrage du seed Cinés Délices v3...\n');
  
  //utilisation de "upsert" => crée si absent, ne touche pas si déjà présent

  // ── 1. Catégories ────────────────────────────────────────
  const [catEntree, catPlat, catDessert, catBoisson] = await Promise.all([
    prisma.category.upsert({ where: { nom: 'Entrée' },   update: {}, create: { nom: 'Entrée',   description: 'Amuse-bouches et entrées' } }),
    prisma.category.upsert({ where: { nom: 'Plat' },     update: {}, create: { nom: 'Plat',     description: 'Plats principaux' } }),
    prisma.category.upsert({ where: { nom: 'Dessert' },  update: {}, create: { nom: 'Dessert',  description: 'Douceurs sucrées' } }),
    prisma.category.upsert({ where: { nom: 'Boisson' },  update: {}, create: { nom: 'Boisson',  description: 'Boissons et cocktails' } }),
  ]);
  console.log('✅ Catégories :', [catEntree, catPlat, catDessert, catBoisson].map(c => c.nom).join(', '));

  // ── 2. Genres TMDB ───────────────────────────────────────
  const [genreDrame, genreComedy, genreAnimation, genreAction, genreThriller, genreFantasy, genreCrime, genreRomance] = await Promise.all([
    prisma.genre.upsert({ where: { tmdbGenreId: 18 }, update: {}, create: { nom: 'Drame',     tmdbGenreId: 18 } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 35 }, update: {}, create: { nom: 'Comédie',   tmdbGenreId: 35 } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 16 }, update: {}, create: { nom: 'Animation', tmdbGenreId: 16 } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 28 }, update: {}, create: { nom: 'Action',    tmdbGenreId: 28 } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 53 }, update: {}, create: { nom: 'Thriller',  tmdbGenreId: 53 } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 14 }, update: {}, create: { nom: 'Fantasy',   tmdbGenreId: 14 } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 80 }, update: {}, create: { nom: 'Crime',     tmdbGenreId: 80 } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 10749 }, update: {}, create: { nom: 'Romance', tmdbGenreId: 10749 } }),
  ]);
  console.log('✅ Genres :', [genreDrame, genreComedy, genreAnimation, genreAction, genreThriller, genreFantasy, genreCrime, genreRomance].map(g => g.nom).join(', '));

  // ── 3. Médias ─────────────────────────────────────────────
  // 16 médias variés (films + séries)
  // Poster URLs : format https://image.tmdb.org/t/p/w500/<poster_path>
  const mediaDefs = [
    // ── 10 médias existants (poster paths vérifiés) ──
    { tmdbId: 2062,   titre: 'Ratatouille', realisateur: 'Brad Bird',  annee: 2007, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/iFcWBdTPeHQDS3OQxBcH3QaYXYv.jpg', synopsis: 'Un rat doué pour la cuisine dans un restaurant parisien.',              genres: [genreAnimation.id, genreComedy.id]   },
    { tmdbId: 392,   titre: 'Le Chocolat',  realisateur: 'Lasse Hallström', annee: 2000, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/7RBG3RzAqQvF6XtTsQqLzdsyAvR.jpg', synopsis: 'Une femme ouvre une chocolaterie dans un village bourguignon.',        genres: [genreDrame.id, genreRomance.id]      },
    { tmdbId: 1396,   titre: 'Breaking Bad',  realisateur: 'Vince Gilligan',  annee: 2008, type: 'SERIES', poster: 'https://image.tmdb.org/t/p/w500/4YLQj5XRrMJ7gp8eb0h6umd0iNx.jpg', synopsis: 'Un prof de chimie reconverti dans la fabrication de drogue.',          genres: [genreDrame.id, genreThriller.id]     },
    { tmdbId: 24094,  titre: 'Julie & Julia', realisateur: 'Nora Ephron', annee: 2009, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/rtZquHKuEntFq3YTO3v4L5RtANw.jpg', synopsis: 'Une blogueuse cuisine toutes les recettes de Julia Child en un an.',  genres: [genreDrame.id, genreComedy.id]       },
    { tmdbId: 11832,  titre: 'Le Festin de Babette',  realisateur: 'Gabriel Axel',  annee: 1987, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/zuZT3kE2Eb6Ln7ec5Ln4IcDwynf.jpg', synopsis: 'Une réfugiée française prépare un festin gastronomique au Danemark.', genres: [genreDrame.id]                       },
    { tmdbId: 31175,  titre: 'Soul Kitchen',  realisateur: 'Fatih Akin',  annee: 2009, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/9UZIiJtPxNonMtIWisXm8O7zgnX.jpg', synopsis: 'Un restaurateur hambourgeois lutte pour garder son établissement.',   genres: [genreComedy.id]                      },
    { tmdbId: 136315, titre: 'The Bear',  realisateur: 'Christopher Storer',  annee: 2022, type: 'SERIES', poster: 'https://image.tmdb.org/t/p/w500/pjQUpBEsg89EbL4QWcjfH0s7Txz.jpg', synopsis: 'Un chef étoilé reprend le sandwich shop familial à Chicago.',        genres: [genreDrame.id]                       },
    { tmdbId: 680,    titre: 'Pulp Fiction',  realisateur: 'Quentin Tarantino', annee: 1994, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/4TBdF7nFw2aKNM0gPOlDNq3v3se.jpg', synopsis: 'Histoires entrelacées de criminels à Los Angeles.',                  genres: [genreDrame.id, genreThriller.id, genreCrime.id] },
    { tmdbId: 120,    titre: 'Le Seigneur des Anneaux', realisateur: 'Peter Jackson', annee: 2001, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/5OPg6M0yHr21Ovs1fni2H1xpKuF.jpg', synopsis: 'Un hobbit part en quête pour détruire l\'Anneau Unique.',            genres: [genreAction.id, genreFantasy.id]     },
    { tmdbId: 475557, titre: 'Joker', realisateur: 'Todd Phillips',annee: 2019, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/tWjJ3ILjsbTwKgXxEv48QAbYZ19.jpg', synopsis: 'La descente aux enfers d\'Arthur Fleck, futur Joker.',              genres: [genreDrame.id, genreThriller.id, genreCrime.id] },

    // ── 6 nouveaux médias ──
    { tmdbId: 120467, titre: 'The Grand Budapest Hotel',  realisateur: 'Wes Anderson',  annee: 2014, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/qcWTuWPu6x6t2MKt0MTfbResJiV.jpg', synopsis: 'Un concierge légendaire et son protégé dans un hôtel européen entre les deux guerres.', genres: [genreComedy.id, genreDrame.id] },
    { tmdbId: 38167,  titre: 'Mange, Prie, Aime', realisateur: 'Ryan Murphy', annee: 2010, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/yoOyDKXjJIDBdnzQUrUjP0EtcZo.jpg', synopsis: 'Après un divorce douloureux, une femme part à la découverte du monde et d\'elle-même.', genres: [genreDrame.id, genreRomance.id] },
    { tmdbId: 238,    titre: 'Le Parrain',  realisateur: 'Francis Ford Coppola',  annee: 1972, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/k3uIbYtiuK8pwbCcbma29nTqmgG.jpg', synopsis: 'L\'épopée de la famille Corleone, entre pouvoir et trahison.',         genres: [genreDrame.id, genreCrime.id]        },
    { tmdbId: 671,    titre: 'Harry Potter à l\'école des sorciers',  realisateur: 'Chris Columbus',  annee: 2001, type: 'MOVIE', poster: 'https://image.tmdb.org/t/p/w500/fbxQ44VRdM2PVzHSNajUseUteem.jpg', synopsis: 'Un orphelin découvre qu\'il est un sorcier et entre à Poudlard.', genres: [genreFantasy.id, genreAction.id] },
    { tmdbId: 1668,   titre: 'Friends', realisateur: 'Marta Kauffman',  annee: 1994, type: 'SERIES', poster: 'https://image.tmdb.org/t/p/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg', synopsis: 'Six amis inséparables vivent leurs aventures à New York.',             genres: [genreComedy.id, genreRomance.id]     },
    { tmdbId: 129,    titre: 'Le Voyage de Chihiro',  realisateur: 'Hayao Miyazaki', annee: 2001, type: 'MOVIE',  poster: 'https://image.tmdb.org/t/p/w500/12TAqK0AUgdcYE9ZYZ9r7ASbH5Q.jpg', synopsis: 'Une fillette se retrouve piégée dans un monde de esprits et de dieux.',genres: [genreAnimation.id, genreFantasy.id]  },
  ];

  const medias = {};
  for (const def of mediaDefs) {
    const slug = await generateUniqueSlug(`${def.titre} ${def.annee}`,
      (s) => prisma.media.findUnique({ where: { slug: s } }));
    medias[def.tmdbId] = await prisma.media.upsert({
      where: { tmdbId_type: { tmdbId: def.tmdbId, type: def.type } },  // ← MODIF
      update: {},
      create: {
        tmdbId: def.tmdbId, titre: def.titre, slug, type: def.type,
        posterUrl: def.poster, synopsis: def.synopsis, annee: def.annee,
        realisateur: def.realisateur, // ajout
        genres: { create: def.genres.map(gId => ({ genreId: gId })) },
      },
    });
  }
  console.log(`✅ ${Object.keys(medias).length} médias créés`);

  // ── 4. Utilisateurs ──────────────────────────────────────
  const adminHash  = await argon2.hash('Admin1234!');
  const memberHash = await argon2.hash('Member1234!');

  const userAdmin = await prisma.user.upsert({
    where: { email: 'admin@cinesdelices.fr' },
    update: {
      nom: 'Delices',
      pseudo: 'Admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
    create: { email: 'admin@cinesdelices.fr', nom: 'Delices', pseudo: 'Admin', passwordHash: adminHash, role: 'ADMIN' },
  });
  const userMarie = await prisma.user.upsert({
    where: { email: 'marie@cinesdelices.fr' },
    update: {
      nom: 'Dubois',
      pseudo: 'Marie',
      passwordHash: memberHash,
      role: 'MEMBER',
    },
    create: { email: 'marie@cinesdelices.fr', nom: 'Dubois', pseudo: 'Marie', passwordHash: memberHash, role: 'MEMBER' },
  });
  const userRemy = await prisma.user.upsert({
    where: { email: 'remy@cinesdelices.fr' },
    update: {
      nom: 'Martin',
      pseudo: 'ReMyChef',
      passwordHash: memberHash,
      role: 'MEMBER',
    },
    create: { email: 'remy@cinesdelices.fr', nom: 'Martin', pseudo: 'ReMyChef', passwordHash: memberHash, role: 'MEMBER' },
  });
  console.log('✅ Users :', [userAdmin, userMarie, userRemy].map(u => u.email).join(', '));

  // ── 5. Ingrédients ───────────────────────────────────────
  const nomsIngredients = [
    'courgette', 'aubergine', 'tomate', 'oignon', 'poivron rouge', 'poivron vert',
    'huile d\'olive', 'herbes de provence', 'sel', 'poivre', 'ail',
    'lait entier', 'chocolat noir 70%', 'cannelle', 'piment de cayenne', 'sucre',
    'bœuf (paleron)', 'vin rouge', 'lardons', 'champignon', 'carotte', 'farine',
    'beurre', 'crème fraîche', 'œuf', 'fromage râpé', 'mozzarella',
    'basilic', 'thym', 'laurier', 'persil', 'ciboulette',
    'poulet', 'saumon', 'crevettes', 'moules', 'pâtes', 'riz',
    'pomme de terre', 'citron', 'orange', 'pomme', 'fraise', 'framboises',
    'levure chimique', 'extrait de vanille', 'miel', 'vinaigre balsamique',
    'sauce soja', 'gingembre', 'cumin', 'paprika', 'curry',
    'jambon', 'anchois', 'câpres', 'olives noires',
    'bouillon de poulet', 'bouillon de légumes', 'concentré de tomates',
    'amandes', 'noix', 'noisettes', 'raisins secs', 'chapelure', 'semoule',
    'rhum', 'whisky', 'vin blanc', 'champagne',
    'sirop de grenadine', 'jus de citron', 'eau gazeuse', 'thé', 'café',
    'lentilles', 'pois chiches', 'mangue',
    // Nouveaux ingrédients pour les nouvelles recettes
    'ricotta', 'parmesan', 'pancetta', 'mascarpone', 'pesto',
    'citronnelle', 'lait de coco', 'tofu', 'nouilles de riz',
    'bière', 'menthe',
  ];

  const allIngredients = await Promise.all(
    nomsIngredients.map(nom =>
      prisma.ingredient.upsert({
        where:  { nom: nom.trim().toLowerCase() },
        update: {},
        create: { nom: nom.trim().toLowerCase() },
      })
    )
  );
  console.log(`✅ ${allIngredients.length} ingrédients créés`);

  // Helper — lance une erreur claire si l'ingrédient est introuvable
  const ing = (nom) => {
    const found = allIngredients.find(i => i.nom === nom.trim().toLowerCase());
    if (!found) throw new Error(`Ingrédient introuvable : "${nom}"`);
    return found;
  };

  // Helper — crée une recette seulement si elle n'existe pas encore (idempotent)
  const createRecipe = async (data) => {
    const existing = await prisma.recipe.findFirst({ where: { titre: data.titre } });
    if (existing) { console.log(`  ⏭️  ${data.titre} (déjà présente)`); return existing; }
    const slug = await generateUniqueSlug(data.titre,
      (s) => prisma.recipe.findUnique({ where: { slug: s } }));
    const created = await prisma.recipe.create({ data: { ...data, slug } });
    console.log(`  ✅ ${data.titre} (${slug})`);
    return created;
  };

  // ════════════════════════════════════════════════════════
  // ENTRÉES — 12 recettes
  // ════════════════════════════════════════════════════════
  console.log('\n📋 Entrées...');

  await createRecipe({
    titre: 'Bruschetta façon Ratatouille',
    imageURL: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?w=600',
    instructions: '1. Griller des tranches de pain au four à 200°C (5 min).\n2. Frotter chaque tranche avec une gousse d\'ail.\n3. Déposer des dés de tomates, aubergine et basilic frais.\n4. Arroser d\'huile d\'olive et assaisonner.',
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('tomate').id,         quantity: '3',  unit: 'pièces'  },
      { ingredientId: ing('aubergine').id,      quantity: '1',  unit: 'pièce'   },
      { ingredientId: ing('ail').id,            quantity: '2',  unit: 'gousses' },
      { ingredientId: ing('basilic').id,        quantity: '1',  unit: 'poignée' },
      { ingredientId: ing('huile d\'olive').id, quantity: '3',  unit: 'c.à.s'  },
      { ingredientId: ing('sel').id,            quantity: null, unit: null      },
    ]},
  });

  await createRecipe({
    titre: 'Gaspacho de Breaking Bad',
    imageURL: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600',
    instructions: '1. Mixer tomates, poivron rouge, oignon, ail et concombre.\n2. Ajouter huile d\'olive, vinaigre balsamique, sel.\n3. Réfrigérer 2h minimum.\n4. Servir bien frais avec des croûtons grillés.',
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('tomate').id,              quantity: '6',  unit: 'pièces' },
      { ingredientId: ing('poivron rouge').id,       quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('oignon').id,              quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('ail').id,                 quantity: '1',  unit: 'gousse' },
      { ingredientId: ing('vinaigre balsamique').id, quantity: '2',  unit: 'c.à.s'  },
      { ingredientId: ing('huile d\'olive').id,      quantity: '4',  unit: 'c.à.s'  },
    ]},
  });

  await createRecipe({
    titre: 'Velouté de champignons de The Bear',
    imageURL: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600',
    instructions: '1. Faire revenir champignons et oignon dans le beurre (10 min).\n2. Ajouter bouillon de légumes et cuire 20 min.\n3. Mixer finement jusqu\'à texture soyeuse.\n4. Incorporer la crème fraîche, assaisonner et servir.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 30,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('champignon').id,          quantity: '500', unit: 'g'    },
      { ingredientId: ing('oignon').id,              quantity: '1',   unit: 'pièce'},
      { ingredientId: ing('beurre').id,              quantity: '30',  unit: 'g'    },
      { ingredientId: ing('crème fraîche').id,       quantity: '20',  unit: 'cl'   },
      { ingredientId: ing('bouillon de légumes').id, quantity: '50',  unit: 'cl'   },
    ]},
  });

  await createRecipe({
    titre: 'Salade César de Julie Child',
    imageURL: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600',
    instructions: '1. Préparer la sauce : mixer anchois, ail, citron, fromage râpé, huile.\n2. Griller les croûtons au beurre jusqu\'à dorure.\n3. Couper la laitue romaine en morceaux et assaisonner.\n4. Garnir de croûtons, fromage râpé et servir.',
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('anchois').id,      quantity: '4',  unit: 'filets' },
      { ingredientId: ing('ail').id,          quantity: '1',  unit: 'gousse' },
      { ingredientId: ing('citron').id,       quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('fromage râpé').id, quantity: '60', unit: 'g'      },
      { ingredientId: ing('beurre').id,       quantity: '30', unit: 'g'      },
      { ingredientId: ing('huile d\'olive').id, quantity: '5', unit: 'c.à.s' },
    ]},
  });

  await createRecipe({
    titre: 'Tartare de saumon du Festin de Babette',
    imageURL: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600',
    instructions: '1. Couper le saumon très frais en petits dés réguliers.\n2. Assaisonner avec jus de citron, câpres et ciboulette ciselée.\n3. Ajouter une cuillère d\'huile d\'olive, sel, poivre.\n4. Dresser dans un emporte-pièce et servir immédiatement.',
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('saumon').id,         quantity: '400', unit: 'g'     },
      { ingredientId: ing('citron').id,         quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('câpres').id,         quantity: '2',   unit: 'c.à.s' },
      { ingredientId: ing('ciboulette').id,     quantity: '1',   unit: 'botte' },
      { ingredientId: ing('huile d\'olive').id, quantity: '2',   unit: 'c.à.s' },
    ]},
  });

  await createRecipe({
    titre: 'Soupe à l\'oignon de Soul Kitchen',
    imageURL: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=600',
    instructions: '1. Émincer les oignons et les caraméliser 30 min à feu doux dans le beurre.\n2. Déglacer au vin blanc et laisser évaporer.\n3. Ajouter le bouillon et mijoter 15 min.\n4. Verser en cocotte sur des croûtons, recouvrir de fromage râpé et gratiner 5 min.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 50,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('oignon').id,              quantity: '6',  unit: 'pièces' },
      { ingredientId: ing('beurre').id,              quantity: '50', unit: 'g'      },
      { ingredientId: ing('vin blanc').id,           quantity: '15', unit: 'cl'     },
      { ingredientId: ing('bouillon de légumes').id, quantity: '1',  unit: 'litre'  },
      { ingredientId: ing('fromage râpé').id,        quantity: '100',unit: 'g'      },
    ]},
  });

  await createRecipe({
    titre: 'Ceviche de crevettes de Pulp Fiction',
    imageURL: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600',
    instructions: '1. Décortiquer les crevettes et les couper en morceaux.\n2. Faire mariner dans le jus de citron vert 20 min — elles "cuisent" à l\'acide.\n3. Ajouter oignon rouge émincé, tomate, piment et coriandre.\n4. Assaisonner et servir immédiatement avec des chips.',
    nombrePersonnes: 4, tempsPreparation: 30, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('crevettes').id,         quantity: '400', unit: 'g'     },
      { ingredientId: ing('citron').id,            quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('oignon').id,            quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('tomate').id,            quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('piment de cayenne').id, quantity: '1',   unit: 'pincée'},
    ]},
  });

  await createRecipe({
    titre: 'Gougères au fromage du Hobbit',
    imageURL: 'https://images.unsplash.com/photo-1767016452826-815c7b4765ed?w=600',
    instructions: '1. Porter à ébullition eau, beurre et sel.\n2. Hors du feu, incorporer la farine d\'un coup et dessécher 2 min.\n3. Ajouter les œufs un par un puis le fromage râpé.\n4. Dresser des petites boules sur plaque et cuire 20 min à 180°C.',
    nombrePersonnes: 6, tempsPreparation: 20, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,       quantity: '125', unit: 'g'      },
      { ingredientId: ing('beurre').id,       quantity: '80',  unit: 'g'      },
      { ingredientId: ing('œuf').id,          quantity: '3',   unit: 'pièces' },
      { ingredientId: ing('fromage râpé').id, quantity: '100', unit: 'g'      },
      { ingredientId: ing('sel').id,          quantity: null,  unit: null     },
    ]},
  });

  await createRecipe({
    titre: 'Rillettes de saumon du Bear',
    imageURL: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600',
    instructions: '1. Pocher le saumon 10 min dans de l\'eau frémissante salée.\n2. Effeuiller et mélanger avec crème fraîche, citron et câpres.\n3. Assaisonner généreusement et réfrigérer 1h.\n4. Servir sur des toasts grillés avec de la ciboulette.',
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('saumon').id,         quantity: '300', unit: 'g'    },
      { ingredientId: ing('crème fraîche').id,  quantity: '10',  unit: 'cl'   },
      { ingredientId: ing('citron').id,         quantity: '1',   unit: 'pièce'},
      { ingredientId: ing('câpres').id,         quantity: '1',   unit: 'c.à.s'},
      { ingredientId: ing('ciboulette').id,     quantity: '1',   unit: 'botte'},
    ]},
  });

  await createRecipe({
    titre: 'Tartines chèvre-miel du Joker',
    imageURL: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600',
    instructions: '1. Griller les tranches de pain de campagne.\n2. Écraser le fromage de chèvre frais et le répartir.\n3. Arroser de miel et parsemer de noix concassées et de thym.\n4. Passer 3 min sous le gril du four jusqu\'à légère dorure.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('miel').id,   quantity: '3',  unit: 'c.à.s'  },
      { ingredientId: ing('noix').id,   quantity: '50', unit: 'g'      },
      { ingredientId: ing('thym').id,   quantity: '1',  unit: 'branche'},
      { ingredientId: ing('fromage râpé').id, quantity: '150', unit: 'g'},
      { ingredientId: ing('sel').id,    quantity: null, unit: null     },
    ]},
  });

  // ── Nouvelles entrées pour les nouveaux médias ──

  await createRecipe({
    titre: 'Antipasti du Grand Budapest Hotel',
    imageURL: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600',
    instructions: '1. Disposer joliment sur un plateau : tranches de jambon, olives noires, tomates cerises.\n2. Ajouter des billes de mozzarella et des feuilles de basilic.\n3. Arroser d\'huile d\'olive et de vinaigre balsamique.\n4. Servir avec des gressins.',
    nombrePersonnes: 6, tempsPreparation: 15, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[120467].id,
    ingredients: { create: [
      { ingredientId: ing('jambon').id,              quantity: '200', unit: 'g'      },
      { ingredientId: ing('olives noires').id,       quantity: '100', unit: 'g'      },
      { ingredientId: ing('mozzarella').id,          quantity: '200', unit: 'g'      },
      { ingredientId: ing('tomate').id,              quantity: '4',   unit: 'pièces' },
      { ingredientId: ing('vinaigre balsamique').id, quantity: '2',   unit: 'c.à.s'  },
      { ingredientId: ing('huile d\'olive').id,      quantity: '3',   unit: 'c.à.s'  },
    ]},
  });

  await createRecipe({
    titre: 'Soupe miso du Voyage de Chihiro',
    imageURL: 'https://images.unsplash.com/photo-1591224876006-be862c0f1d7a?w=600',
    instructions: '1. Porter le bouillon de légumes à ébullition douce.\n2. Couper le tofu en dés et émincer les champignons.\n3. Ajouter la sauce soja et le gingembre râpé.\n4. Verser dans des bols et garnir de ciboulette ciselée.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[129].id,
    ingredients: { create: [
      { ingredientId: ing('bouillon de légumes').id, quantity: '1',   unit: 'litre' },
      { ingredientId: ing('tofu').id,                quantity: '200', unit: 'g'     },
      { ingredientId: ing('champignon').id,          quantity: '100', unit: 'g'     },
      { ingredientId: ing('sauce soja').id,          quantity: '3',   unit: 'c.à.s' },
      { ingredientId: ing('gingembre').id,           quantity: '2',   unit: 'cm'    },
      { ingredientId: ing('ciboulette').id,          quantity: '1',   unit: 'botte' },
    ]},
  });

  console.log('✅ 12 entrées créées\n');

  // ════════════════════════════════════════════════════════
  // PLATS — 12 recettes
  // ════════════════════════════════════════════════════════
  console.log('🍽️  Plats...');

  await createRecipe({
    titre: 'Ratatouille de Rémy',
    imageURL: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?w=600',
    instructions: '1. Préchauffer le four à 180°C.\n2. Couper courgette, aubergine, tomates et poivron en rondelles fines (3mm).\n3. Faire revenir l\'oignon dans l\'huile, ajouter les tomates en dés, sel, poivre — mijoter 15 min et mixer.\n4. Étaler la sauce en fond de plat à gratin.\n5. Disposer les rondelles en rosace en alternant les légumes.\n6. Arroser d\'huile, saupoudrer d\'herbes, couvrir de papier sulfurisé.\n7. Cuire 40 min puis 10 min à découvert pour dorer.',
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 50,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('courgette').id,          quantity: '2',  unit: 'pièces' },
      { ingredientId: ing('aubergine').id,          quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('tomate').id,             quantity: '5',  unit: 'pièces' },
      { ingredientId: ing('poivron rouge').id,      quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('oignon').id,             quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('huile d\'olive').id,     quantity: '4',  unit: 'c.à.s'  },
      { ingredientId: ing('herbes de provence').id, quantity: '1',  unit: 'c.à.c'  },
      { ingredientId: ing('sel').id,                quantity: null, unit: null     },
      { ingredientId: ing('poivre').id,             quantity: null, unit: null     },
    ]},
  });

  await createRecipe({
    titre: 'Bœuf bourguignon de Julia Child',
    imageURL: 'https://images.unsplash.com/photo-1608500218987-0f2b3be34b47?w=600',
    instructions: '1. Couper le bœuf en morceaux et les faire dorer par fournées dans une cocotte.\n2. Faire revenir lardons, oignons et carottes dans la même cocotte.\n3. Remettre la viande, saupoudrer de farine, verser le vin rouge et le bouillon.\n4. Ajouter thym et laurier, couvrir et cuire 2h30 à 160°C.\n5. Ajouter les champignons sautés 30 min avant la fin.',
    nombrePersonnes: 6, tempsPreparation: 30, tempsCuisson: 150,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('bœuf (paleron)').id,      quantity: '1.5', unit: 'kg'    },
      { ingredientId: ing('vin rouge').id,           quantity: '75',  unit: 'cl'    },
      { ingredientId: ing('lardons').id,             quantity: '200', unit: 'g'     },
      { ingredientId: ing('carotte').id,             quantity: '3',   unit: 'pièces'},
      { ingredientId: ing('champignon').id,          quantity: '300', unit: 'g'     },
      { ingredientId: ing('bouillon de légumes').id, quantity: '30',  unit: 'cl'    },
      { ingredientId: ing('farine').id,              quantity: '2',   unit: 'c.à.s' },
    ]},
  });

  await createRecipe({
    titre: 'Poulet rôti du Festin de Babette',
    imageURL: 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=600',
    instructions: '1. Sortir le poulet 30 min à température ambiante.\n2. Badigeonner de beurre mou mélangé à thym et ail haché.\n3. Saler, poivrer intérieur et extérieur, farcir avec thym et laurier.\n4. Rôtir 1h20 à 200°C en arrosant toutes les 20 min.\n5. Laisser reposer 15 min sous alu avant de découper.',
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 80,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('poulet').id,  quantity: '1.5', unit: 'kg'      },
      { ingredientId: ing('beurre').id,  quantity: '80',  unit: 'g'       },
      { ingredientId: ing('ail').id,     quantity: '4',   unit: 'gousses' },
      { ingredientId: ing('thym').id,    quantity: '4',   unit: 'branches'},
      { ingredientId: ing('laurier').id, quantity: '2',   unit: 'feuilles'},
      { ingredientId: ing('sel').id,     quantity: null,  unit: null      },
    ]},
  });

  await createRecipe({
    titre: 'Pasta al Forno de Soul Kitchen',
    imageURL: 'https://images.unsplash.com/photo-1629115916087-7e8c114a24ed?w=600',
    instructions: '1. Cuire les pâtes al dente et égoutter.\n2. Faire revenir les lardons, ajouter concentré de tomates et basilic.\n3. Mélanger pâtes et sauce, transférer dans un plat à gratin.\n4. Couvrir de mozzarella tranchée et gratiner 20 min à 180°C.',
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 35,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('pâtes').id,                quantity: '400', unit: 'g'      },
      { ingredientId: ing('lardons').id,              quantity: '150', unit: 'g'      },
      { ingredientId: ing('concentré de tomates').id, quantity: '3',   unit: 'c.à.s'  },
      { ingredientId: ing('mozzarella').id,           quantity: '250', unit: 'g'      },
      { ingredientId: ing('basilic').id,              quantity: '1',   unit: 'poignée'},
    ]},
  });

  await createRecipe({
    titre: 'Risotto parmesan de The Bear',
    imageURL: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600',
    instructions: '1. Faire revenir l\'oignon haché dans le beurre à feu doux.\n2. Ajouter le riz à risotto et nacrer 2 min.\n3. Verser le vin blanc et laisser absorber.\n4. Incorporer le bouillon chaud louche par louche en remuant constamment (18-20 min).\n5. Hors du feu, mantecare avec beurre froid et fromage râpé. Poivrer.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 25,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('riz').id,                 quantity: '320', unit: 'g'     },
      { ingredientId: ing('oignon').id,              quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('beurre').id,              quantity: '80',  unit: 'g'     },
      { ingredientId: ing('vin blanc').id,           quantity: '10',  unit: 'cl'    },
      { ingredientId: ing('bouillon de légumes').id, quantity: '1.2', unit: 'litre' },
      { ingredientId: ing('fromage râpé').id,        quantity: '80',  unit: 'g'     },
    ]},
  });

  await createRecipe({
    titre: 'Burger Royale de Pulp Fiction',
    imageURL: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    instructions: '1. Former 4 steaks avec la viande hachée, saler et poivrer.\n2. Griller 3 min de chaque côté sur plancha très chaude.\n3. Toaster les pains au beurre dans la même plancha.\n4. Monter : pain, salade, steak, fromage fondu, tomate, oignon et sauce au choix.',
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('bœuf (paleron)').id, quantity: '600', unit: 'g'     },
      { ingredientId: ing('tomate').id,         quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('fromage râpé').id,   quantity: '100', unit: 'g'     },
      { ingredientId: ing('oignon').id,         quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('beurre').id,         quantity: '30',  unit: 'g'     },
      { ingredientId: ing('sel').id,            quantity: null,  unit: null    },
    ]},
  });

  await createRecipe({
    titre: 'Ragoût du Comté de Hobbiton',
    imageURL: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600',
    instructions: '1. Faire dorer les morceaux de bœuf en cocotte, réserver.\n2. Faire revenir oignon, ail et carottes 5 min.\n3. Remettre la viande, ajouter pommes de terre, thym, laurier et bouillon.\n4. Mijoter 2h à feu très doux jusqu\'à ce que la viande soit fondante.',
    nombrePersonnes: 6, tempsPreparation: 25, tempsCuisson: 120,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('bœuf (paleron)').id,      quantity: '1',   unit: 'kg'      },
      { ingredientId: ing('pomme de terre').id,      quantity: '4',   unit: 'pièces'  },
      { ingredientId: ing('carotte').id,             quantity: '3',   unit: 'pièces'  },
      { ingredientId: ing('oignon').id,              quantity: '2',   unit: 'pièces'  },
      { ingredientId: ing('bouillon de légumes').id, quantity: '50',  unit: 'cl'      },
      { ingredientId: ing('thym').id,                quantity: '2',   unit: 'branches'},
      { ingredientId: ing('laurier').id,             quantity: '2',   unit: 'feuilles'},
    ]},
  });

  await createRecipe({
    titre: 'Saumon en papillote du Festin',
    imageURL: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600',
    instructions: '1. Déposer le filet de saumon sur une feuille d\'alu.\n2. Assaisonner avec citron, herbes de Provence, sel et poivre.\n3. Fermer hermétiquement la papillote.\n4. Cuire 20 min au four à 180°C — la vapeur garde tout le moelleux.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('saumon').id,             quantity: '600', unit: 'g'    },
      { ingredientId: ing('citron').id,             quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('herbes de provence').id, quantity: '1',   unit: 'c.à.c'},
      { ingredientId: ing('huile d\'olive').id,     quantity: '2',   unit: 'c.à.s'},
      { ingredientId: ing('sel').id,                quantity: null,  unit: null  },
    ]},
  });

  await createRecipe({
    titre: 'Tacos au poulet épicé de Breaking Bad',
    imageURL: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
    instructions: '1. Mariner le poulet 1h avec citron, cumin, paprika, ail et huile.\n2. Griller 6-7 min de chaque côté sur plancha chaude.\n3. Laisser reposer 5 min puis trancher en lamelles.\n4. Garnir les tortillas avec poulet, tomate, crème fraîche et coriandre.',
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 15,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('poulet').id,         quantity: '600', unit: 'g'     },
      { ingredientId: ing('citron').id,         quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('cumin').id,          quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('paprika').id,        quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('crème fraîche').id,  quantity: '10',  unit: 'cl'    },
      { ingredientId: ing('tomate').id,         quantity: '2',   unit: 'pièces'},
    ]},
  });

  await createRecipe({
    titre: 'Moules marinières du Joker',
    imageURL: 'https://plus.unsplash.com/premium_photo-1707227204741-20ae518a357a?w=600',
    instructions: '1. Gratter et laver soigneusement les moules.\n2. Faire revenir échalote et ail dans le beurre 2 min.\n3. Verser le vin blanc, ajouter les moules, couvrir.\n4. Cuire à feu vif 5 min en secouant la casserole.\n5. Jeter les moules fermées et parsemer de persil ciselé.',
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('moules').id,    quantity: '2',  unit: 'kg'     },
      { ingredientId: ing('vin blanc').id, quantity: '20', unit: 'cl'     },
      { ingredientId: ing('ail').id,       quantity: '3',  unit: 'gousses'},
      { ingredientId: ing('oignon').id,    quantity: '2',  unit: 'pièces' },
      { ingredientId: ing('beurre').id,    quantity: '40', unit: 'g'      },
      { ingredientId: ing('persil').id,    quantity: '1',  unit: 'botte'  },
    ]},
  });

  // ── Nouveaux plats ──

  await createRecipe({
    titre: 'Pâtes à la Corleone',
    imageURL: 'https://images.unsplash.com/photo-1611270629569-8b357cb88da9?w=600',
    instructions: '1. Faire revenir la pancetta coupée en dés dans l\'huile d\'olive.\n2. Ajouter l\'ail et le concentré de tomates, cuire 2 min.\n3. Verser le vin rouge, laisser réduire de moitié.\n4. Cuire les pâtes al dente, les ajouter à la sauce.\n5. Servir avec du parmesan fraîchement râpé et du basilic.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[238].id,
    ingredients: { create: [
      { ingredientId: ing('pâtes').id,                quantity: '400', unit: 'g'     },
      { ingredientId: ing('pancetta').id,             quantity: '150', unit: 'g'     },
      { ingredientId: ing('concentré de tomates').id, quantity: '3',   unit: 'c.à.s' },
      { ingredientId: ing('vin rouge').id,            quantity: '10',  unit: 'cl'    },
      { ingredientId: ing('parmesan').id,             quantity: '80',  unit: 'g'     },
      { ingredientId: ing('basilic').id,              quantity: '1',   unit: 'poignée'},
    ]},
  });

  await createRecipe({
    titre: 'Pad thaï d\'Eat Pray Love',
    imageURL: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600',
    instructions: '1. Faire tremper les nouilles de riz 15 min dans l\'eau tiède.\n2. Faire sauter les crevettes dans l\'huile avec l\'ail et le gingembre.\n3. Ajouter les nouilles égouttées, la sauce soja et le jus de citron.\n4. Mélanger vigoureusement, ajouter les œufs brouillés.\n5. Servir avec des cacahuètes concassées et de la ciboulette.',
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[38167].id,
    ingredients: { create: [
      { ingredientId: ing('nouilles de riz').id, quantity: '300', unit: 'g'     },
      { ingredientId: ing('crevettes').id,       quantity: '300', unit: 'g'     },
      { ingredientId: ing('sauce soja').id,      quantity: '4',   unit: 'c.à.s' },
      { ingredientId: ing('citron').id,          quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('œuf').id,             quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('gingembre').id,       quantity: '3',   unit: 'cm'    },
    ]},
  });

  console.log('✅ 12 plats créés\n');

  // ════════════════════════════════════════════════════════
  // DESSERTS — 12 recettes
  // ════════════════════════════════════════════════════════
  console.log('🍰 Desserts...');

  await createRecipe({
    titre: 'Crème brûlée de Babette',
    imageURL: 'https://images.unsplash.com/photo-1676300184943-09b2a08319a3?w=600',
    instructions: '1. Fouetter 5 jaunes d\'œufs avec 80g de sucre jusqu\'au ruban.\n2. Chauffer la crème avec la vanille et verser doucement sur les œufs.\n3. Filtrer et répartir dans des ramequins.\n4. Cuire au bain-marie 45 min à 150°C.\n5. Réfrigérer 3h minimum, saupoudrer de sucre et caraméliser au chalumeau.',
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 45,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('crème fraîche').id,      quantity: '50',  unit: 'cl'     },
      { ingredientId: ing('œuf').id,                quantity: '5',   unit: 'jaunes' },
      { ingredientId: ing('sucre').id,              quantity: '120', unit: 'g'      },
      { ingredientId: ing('extrait de vanille').id, quantity: '1',   unit: 'gousse' },
    ]},
  });

  await createRecipe({
    titre: 'Mousse au chocolat de Ratatouille',
    imageURL: 'https://images.unsplash.com/photo-1673551494277-92204546b504?w=600',
    instructions: '1. Faire fondre le chocolat au bain-marie avec le beurre, laisser tiédir.\n2. Incorporer les jaunes d\'œufs un par un.\n3. Monter les blancs en neige très ferme avec une pincée de sel.\n4. Incorporer 1/3 des blancs énergiquement puis le reste délicatement.\n5. Réfrigérer minimum 2h avant de servir.',
    nombrePersonnes: 6, tempsPreparation: 25, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('chocolat noir 70%').id, quantity: '200', unit: 'g'     },
      { ingredientId: ing('beurre').id,            quantity: '40',  unit: 'g'     },
      { ingredientId: ing('œuf').id,               quantity: '6',   unit: 'pièces'},
      { ingredientId: ing('sucre').id,             quantity: '30',  unit: 'g'     },
      { ingredientId: ing('sel').id,               quantity: null,  unit: null    },
    ]},
  });

  await createRecipe({
    titre: 'Tarte aux pommes normande de Julie Child',
    imageURL: 'https://images.unsplash.com/photo-1562007908-17c67e878c88?w=600',
    instructions: '1. Préparer la pâte brisée : sabler farine et beurre, ajouter œuf et eau froide.\n2. Foncer un moule à tarte, piquer le fond et précuire 10 min à blanc.\n3. Peler et émincer les pommes en fines lamelles.\n4. Les disposer en rosace, saupoudrer de sucre et cannelle.\n5. Cuire 35 min à 180°C jusqu\'à belle dorure.',
    nombrePersonnes: 6, tempsPreparation: 30, tempsCuisson: 45,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('pomme').id,   quantity: '6',   unit: 'pièces'},
      { ingredientId: ing('farine').id,  quantity: '250', unit: 'g'     },
      { ingredientId: ing('beurre').id,  quantity: '125', unit: 'g'     },
      { ingredientId: ing('sucre').id,   quantity: '80',  unit: 'g'     },
      { ingredientId: ing('cannelle').id,quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('œuf').id,     quantity: '1',   unit: 'pièce' },
    ]},
  });

  await createRecipe({
    titre: 'Fondant au chocolat coulant de Breaking Bad',
    imageURL: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600',
    instructions: '1. Faire fondre chocolat et beurre au bain-marie.\n2. Fouetter œufs et sucre jusqu\'au ruban.\n3. Incorporer la préparation chocolatée puis la farine tamisée.\n4. Beurrer et fariner des moules individuels, verser la pâte.\n5. Cuire exactement 10-12 min à 200°C — le cœur doit rester coulant.',
    nombrePersonnes: 6, tempsPreparation: 15, tempsCuisson: 12,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('chocolat noir 70%').id, quantity: '200', unit: 'g'     },
      { ingredientId: ing('beurre').id,            quantity: '150', unit: 'g'     },
      { ingredientId: ing('sucre').id,             quantity: '150', unit: 'g'     },
      { ingredientId: ing('farine').id,            quantity: '60',  unit: 'g'     },
      { ingredientId: ing('œuf').id,               quantity: '4',   unit: 'pièces'},
    ]},
  });

  await createRecipe({
    titre: 'Profiteroles de Soul Kitchen',
    imageURL: 'https://images.unsplash.com/photo-1761637588199-ecd32fea8325?w=600',
    instructions: '1. Préparer la pâte à choux : bouillir eau, beurre, sel, incorporer farine, dessécher, ajouter les œufs.\n2. Dresser des petites boules à la poche, cuire 20 min à 180°C.\n3. Préparer une ganache : verser crème chaude sur le chocolat, émulsionner.\n4. Garnir les choux de glace vanille et napper de ganache chaude.',
    nombrePersonnes: 6, tempsPreparation: 30, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,            quantity: '125', unit: 'g'     },
      { ingredientId: ing('beurre').id,            quantity: '100', unit: 'g'     },
      { ingredientId: ing('œuf').id,               quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('chocolat noir 70%').id, quantity: '150', unit: 'g'     },
      { ingredientId: ing('crème fraîche').id,     quantity: '15',  unit: 'cl'    },
    ]},
  });

  await createRecipe({
    titre: 'Tiramisu du Bear',
    imageURL: 'https://images.unsplash.com/photo-1766232333746-b0a2697d6d0d?w=600',
    instructions: '1. Séparer les œufs. Fouetter jaunes et sucre jusqu\'au ruban.\n2. Incorporer le mascarpone en 3 fois, puis les blancs montés en neige.\n3. Tremper rapidement les biscuits dans le café froid.\n4. Alterner couches de crème et biscuits (2 fois).\n5. Réfrigérer 6h minimum. Saupoudrer de cacao avant de servir.',
    nombrePersonnes: 8, tempsPreparation: 30, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('mascarpone').id,        quantity: '500', unit: 'g'     },
      { ingredientId: ing('œuf').id,               quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('sucre').id,             quantity: '100', unit: 'g'     },
      { ingredientId: ing('café').id,              quantity: '30',  unit: 'cl'    },
      { ingredientId: ing('chocolat noir 70%').id, quantity: '30',  unit: 'g (cacao poudre)'},
    ]},
  });

  await createRecipe({
    titre: 'Banoffee Pie de Pulp Fiction',
    imageURL: 'https://images.unsplash.com/photo-1660485039650-eb9b3896c62c?w=600',
    instructions: '1. Écraser les biscuits et mélanger avec le beurre fondu, tasser dans un moule.\n2. Faire un caramel avec sucre et beurre, incorporer la crème — laisser épaissir.\n3. Verser le caramel sur la base biscuitée, réfrigérer 30 min.\n4. Disposer les tranches de banane.\n5. Recouvrir de chantilly et râper du chocolat noir dessus.',
    nombrePersonnes: 8, tempsPreparation: 25, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('crème fraîche').id,     quantity: '30',  unit: 'cl'     },
      { ingredientId: ing('beurre').id,            quantity: '100', unit: 'g'      },
      { ingredientId: ing('sucre').id,             quantity: '150', unit: 'g'      },
      { ingredientId: ing('chocolat noir 70%').id, quantity: '50',  unit: 'g'      },
    ]},
  });

  await createRecipe({
    titre: 'Lembas du Comté (shortbread aux amandes)',
    imageURL: 'https://images.unsplash.com/photo-1703249180507-4e68999f7760?w=600',
    instructions: '1. Mélanger farine, sucre glace et amandes en poudre.\n2. Incorporer le beurre froid en morceaux et sabler.\n3. Ajouter miel et extrait de vanille, former une boule.\n4. Étaler à 1cm, couper en carrés et marquer une croix.\n5. Cuire 18-20 min à 175°C — dorés mais pas trop cuits.',
    nombrePersonnes: 12, tempsPreparation: 20, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,             quantity: '250', unit: 'g'    },
      { ingredientId: ing('beurre').id,             quantity: '150', unit: 'g'    },
      { ingredientId: ing('sucre').id,              quantity: '80',  unit: 'g'    },
      { ingredientId: ing('amandes').id,            quantity: '100', unit: 'g'    },
      { ingredientId: ing('miel').id,               quantity: '2',   unit: 'c.à.s'},
      { ingredientId: ing('extrait de vanille').id, quantity: '1',   unit: 'c.à.c'},
    ]},
  });

  await createRecipe({
    titre: 'Panna cotta chocolat du Joker',
    imageURL: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
    instructions: '1. Faire tremper la gélatine dans l\'eau froide.\n2. Chauffer crème, lait, sucre et chocolat en morceaux — remuer jusqu\'à fonte.\n3. Hors du feu, incorporer la gélatine essorée.\n4. Verser dans des ramequins et réfrigérer minimum 4h.\n5. Démouler sur assiette et décorer d\'un coulis de framboise.',
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('crème fraîche').id,     quantity: '40',  unit: 'cl'},
      { ingredientId: ing('lait entier').id,       quantity: '10',  unit: 'cl'},
      { ingredientId: ing('chocolat noir 70%').id, quantity: '120', unit: 'g' },
      { ingredientId: ing('sucre').id,             quantity: '50',  unit: 'g' },
      { ingredientId: ing('framboises').id,        quantity: '100', unit: 'g' },
    ]},
  });

  await createRecipe({
    titre: 'Madeleines au citron de Julie Child',
    imageURL: 'https://images.unsplash.com/photo-1631978931011-a033b99bce1e?w=600',
    instructions: '1. Fouetter œufs et sucre 5 min jusqu\'au ruban.\n2. Incorporer farine, levure, zeste de citron et beurre fondu.\n3. Laisser reposer la pâte 1h au réfrigérateur — c\'est le secret de la bosse.\n4. Beurrer les moules à madeleines, remplir aux 3/4.\n5. Cuire 12 min à 200°C — sortir dès que les bords sont dorés.',
    nombrePersonnes: 12, tempsPreparation: 20, tempsCuisson: 12,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,           quantity: '200', unit: 'g'     },
      { ingredientId: ing('beurre').id,           quantity: '150', unit: 'g'     },
      { ingredientId: ing('sucre').id,            quantity: '150', unit: 'g'     },
      { ingredientId: ing('œuf').id,              quantity: '3',   unit: 'pièces'},
      { ingredientId: ing('levure chimique').id,  quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('citron').id,           quantity: '1',   unit: 'zeste' },
    ]},
  });

  // ── Nouveaux desserts ──

  await createRecipe({
    titre: 'Cheesecake de Friends',
    imageURL: 'https://images.unsplash.com/photo-1578775887804-699de7086ff9?w=600',
    instructions: '1. Écraser les biscuits, mélanger avec le beurre fondu, tasser au fond du moule.\n2. Fouetter la ricotta avec le mascarpone, le sucre et les œufs.\n3. Ajouter l\'extrait de vanille et le jus de citron.\n4. Verser sur la base biscuitée.\n5. Cuire 50 min à 160°C. Laisser refroidir lentement dans le four éteint.',
    nombrePersonnes: 8, tempsPreparation: 25, tempsCuisson: 50,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[1668].id,
    ingredients: { create: [
      { ingredientId: ing('ricotta').id,           quantity: '400', unit: 'g'     },
      { ingredientId: ing('mascarpone').id,        quantity: '200', unit: 'g'     },
      { ingredientId: ing('sucre').id,             quantity: '150', unit: 'g'     },
      { ingredientId: ing('œuf').id,               quantity: '3',   unit: 'pièces'},
      { ingredientId: ing('extrait de vanille').id,quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('beurre').id,            quantity: '80',  unit: 'g'     },
    ]},
  });

  await createRecipe({
    titre: 'Choux à la crème de Poudlard',
    imageURL: 'https://plus.unsplash.com/premium_photo-1764355119672-d37d2ba8efdb?w=600',
    instructions: '1. Préparer la pâte à choux : porter eau, beurre et sel à ébullition.\n2. Incorporer la farine d\'un coup, dessécher 2 min en remuant.\n3. Ajouter les œufs un par un hors du feu.\n4. Dresser en boules et cuire 25 min à 180°C sans ouvrir le four.\n5. Garnir de crème pâtissière et saupoudrer de sucre glace.',
    nombrePersonnes: 8, tempsPreparation: 30, tempsCuisson: 25,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[671].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,            quantity: '150', unit: 'g'     },
      { ingredientId: ing('beurre').id,            quantity: '100', unit: 'g'     },
      { ingredientId: ing('œuf').id,               quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('lait entier').id,       quantity: '50',  unit: 'cl'    },
      { ingredientId: ing('sucre').id,             quantity: '100', unit: 'g'     },
      { ingredientId: ing('extrait de vanille').id,quantity: '1',   unit: 'c.à.c' },
    ]},
  });

  console.log('✅ 12 desserts créés\n');

  // ════════════════════════════════════════════════════════
  // BOISSONS — 12 recettes
  // ════════════════════════════════════════════════════════
  console.log('🥤 Boissons...');

  await createRecipe({
    titre: 'Chocolat chaud épicé de Vianne',
    imageURL: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600',
    instructions: '1. Casser le chocolat en petits morceaux.\n2. Chauffer le lait à feu moyen sans laisser bouillir.\n3. Hors du feu, incorporer le chocolat en fouettant jusqu\'à fonte complète.\n4. Ajouter cannelle, piment de Cayenne et sucre selon goût.\n5. Remettre à feu doux et fouetter vigoureusement pour faire mousser. Servir chaud.',
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[392].id,
    ingredients: { create: [
      { ingredientId: ing('lait entier').id,       quantity: '500', unit: 'ml'    },
      { ingredientId: ing('chocolat noir 70%').id, quantity: '100', unit: 'g'     },
      { ingredientId: ing('cannelle').id,          quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('piment de cayenne').id, quantity: '1',   unit: 'pincée'},
      { ingredientId: ing('sucre').id,             quantity: '2',   unit: 'c.à.s' },
    ]},
  });

  await createRecipe({
    titre: 'Pour-over café de The Bear',
    imageURL: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
    instructions: '1. Moudre 20g de café à mouture moyenne-fine.\n2. Chauffer l\'eau à exactement 93°C (retirer du feu 30 sec après ébullition).\n3. Rincer le filtre, verser le café, faire un "bloom" : verser 40ml d\'eau, attendre 30s.\n4. Verser le reste de l\'eau en cercles réguliers sur 3-4 min.\n5. Le café doit couler lentement — déguster noir.',
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('café').id, quantity: '20', unit: 'g pour 300ml d\'eau' },
    ]},
  });

  await createRecipe({
    titre: 'Milkshake fraise de Pulp Fiction',
    imageURL: 'https://images.unsplash.com/photo-1711546911972-45c534fe5b1f?w=600',
    instructions: '1. Laver et équeuter les fraises fraîches.\n2. Mixer fraises, lait entier froid et sirop de grenadine à pleine puissance.\n3. Ajouter 2-3 boules de glace vanille, mixer à nouveau rapidement.\n4. Verser dans un grand verre givré, garnir de chantilly et d\'une fraise entière.',
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('lait entier').id,        quantity: '200', unit: 'ml'   },
      { ingredientId: ing('fraise').id,             quantity: '150', unit: 'g'    },
      { ingredientId: ing('sirop de grenadine').id, quantity: '2',   unit: 'c.à.s'},
      { ingredientId: ing('crème fraîche').id,      quantity: '10',  unit: 'cl'   },
    ]},
  });

  await createRecipe({
    titre: 'Thé de l\'Après-midi au Comté',
    imageURL: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600',
    instructions: '1. Porter l\'eau à 90°C (ne pas faire bouillir — cela rendrait le thé amer).\n2. Préchauffer la théière avec un peu d\'eau chaude puis vider.\n3. Mettre 1 cuillère à café de thé par tasse, infuser exactement 3 min.\n4. Filtrer dans des tasses, ajouter miel et une tranche de citron.\n5. Servir avec des biscuits sablés.',
    nombrePersonnes: 4, tempsPreparation: 5, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('thé').id,    quantity: '4',  unit: 'c.à.c' },
      { ingredientId: ing('miel').id,   quantity: '2',  unit: 'c.à.s' },
      { ingredientId: ing('citron').id, quantity: '1',  unit: 'pièce' },
    ]},
  });

  await createRecipe({
    titre: 'Mojito de Soul Kitchen',
    imageURL: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600',
    instructions: '1. Déposer les feuilles de menthe et le sucre dans un verre.\n2. Presser le citron vert, verser le jus et piler doucement (muddling) — sans brutaliser la menthe.\n3. Remplir le verre de glace pilée.\n4. Verser le rhum blanc, compléter d\'eau gazeuse très froide.\n5. Mélanger délicatement et garnir d\'un brin de menthe.',
    nombrePersonnes: 1, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('rhum').id,        quantity: '5',  unit: 'cl'   },
      { ingredientId: ing('citron').id,      quantity: '1',  unit: 'pièce'},
      { ingredientId: ing('sucre').id,       quantity: '2',  unit: 'c.à.c'},
      { ingredientId: ing('eau gazeuse').id, quantity: '10', unit: 'cl'   },
      { ingredientId: ing('menthe').id,      quantity: '10', unit: 'feuilles'},
    ]},
  });

  await createRecipe({
    titre: 'Whisky Sour de Breaking Bad',
    imageURL: 'https://images.unsplash.com/photo-1713720441159-466472b29b54?w=600',
    instructions: '1. Verser whisky, jus de citron fraîchement pressé, sucre et blanc d\'œuf dans un shaker.\n2. Shaker sans glace 15 sec (dry shake) pour émulsionner le blanc d\'œuf.\n3. Ajouter des glaçons et reshaker vigoureusement 15 sec.\n4. Double-filtrer dans un verre à cocktail refroidi.\n5. Décorer d\'un zeste de citron et de quelques gouttes d\'Angostura.',
    nombrePersonnes: 1, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('whisky').id,       quantity: '5',  unit: 'cl'   },
      { ingredientId: ing('jus de citron').id,quantity: '2',  unit: 'cl'   },
      { ingredientId: ing('sucre').id,        quantity: '1',  unit: 'c.à.c'},
      { ingredientId: ing('œuf').id,          quantity: '1',  unit: 'blanc'},
    ]},
  });

  await createRecipe({
    titre: 'Champagne rosé du Festin de Babette',
    imageURL: 'https://images.unsplash.com/photo-1659729683174-84f48ad87a94?w=600',
    instructions: '1. Réfrigérer la bouteille 3h minimum — idéalement toute une nuit.\n2. Ouvrir délicatement sans faire sauter le bouchon (tenir à 45°, faire tourner la bouteille).\n3. Incliner légèrement les flûtes pour verser doucement le long du verre.\n4. Déposer une framboise fraîche dans chaque flûte — elle libère des bulles.\n5. Servir immédiatement, très froid.',
    nombrePersonnes: 6, tempsPreparation: 2, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('champagne').id,  quantity: '75',  unit: 'cl'    },
      { ingredientId: ing('framboises').id, quantity: '12',  unit: 'pièces'},
    ]},
  });

  await createRecipe({
    titre: 'Limonade du Joker',
    imageURL: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600',
    instructions: '1. Presser tous les citrons, récupérer le jus (environ 20cl).\n2. Préparer un sirop : chauffer 100ml d\'eau avec le sucre jusqu\'à dissolution complète. Laisser refroidir.\n3. Mélanger jus de citron et sirop dans un pichet.\n4. Compléter d\'eau gazeuse très froide, ajouter des glaçons.\n5. Décorer de tranches de citron et feuilles de menthe. Servir immédiatement.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('citron').id,      quantity: '6',   unit: 'pièces'},
      { ingredientId: ing('sucre').id,       quantity: '100', unit: 'g'     },
      { ingredientId: ing('eau gazeuse').id, quantity: '1',   unit: 'litre' },
    ]},
  });

  await createRecipe({
    titre: 'Kir champêtre de Ratatouille',
    imageURL: 'https://plus.unsplash.com/premium_photo-1721929720315-379fc22f526a?w=600',
    instructions: '1. Placer les verres à vin au congélateur 10 min pour les givrer légèrement.\n2. Verser environ 1 c.à.s de sirop de grenadine (ou crème de cassis) au fond de chaque verre.\n3. Verser délicatement le vin blanc bien frais en inclinant le verre — ne pas mélanger.\n4. Les couleurs se marient naturellement à la dégustation. Servir avec des gougères.',
    nombrePersonnes: 4, tempsPreparation: 2, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('vin blanc').id,          quantity: '75',  unit: 'cl'   },
      { ingredientId: ing('sirop de grenadine').id, quantity: '4',   unit: 'c.à.s'},
    ]},
  });

  await createRecipe({
    titre: 'Smoothie vert détox de Julie Child',
    imageURL: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600',
    instructions: '1. Éplucher et vider la pomme, peler et trancher le gingembre.\n2. Presser le citron.\n3. Tout mettre dans le blender avec 150ml d\'eau froide.\n4. Mixer à pleine puissance 1 min.\n5. Goûter et ajuster avec le miel si trop acide. Servir immédiatement.',
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('pomme').id,     quantity: '2',  unit: 'pièces'},
      { ingredientId: ing('citron').id,    quantity: '1',  unit: 'pièce' },
      { ingredientId: ing('gingembre').id, quantity: '3',  unit: 'cm'    },
      { ingredientId: ing('miel').id,      quantity: '1',  unit: 'c.à.s' },
    ]},
  });

  // ── Nouvelles boissons ──

  await createRecipe({
    titre: 'Bièraubeurre de Poudlard',
    imageURL: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600',
    instructions: '1. Chauffer la bière doucement sans la faire bouillir.\n2. Dans une casserole, faire fondre le beurre avec le sucre et la cannelle.\n3. Verser le mélange beurre-sucre dans la bière chaude en fouettant.\n4. Ajouter l\'extrait de vanille et remuer.\n5. Servir dans des chopes avec une mousse de crème fraîche fouettée.',
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[671].id,
    ingredients: { create: [
      { ingredientId: ing('bière').id,              quantity: '1',   unit: 'litre' },
      { ingredientId: ing('beurre').id,             quantity: '30',  unit: 'g'     },
      { ingredientId: ing('sucre').id,              quantity: '50',  unit: 'g'     },
      { ingredientId: ing('cannelle').id,           quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('extrait de vanille').id, quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('crème fraîche').id,      quantity: '10',  unit: 'cl'    },
    ]},
  });

  await createRecipe({
    titre: 'Café du Central Perk',
    imageURL: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600',
    instructions: '1. Préparer un café filtre bien corsé avec du café fraîchement moulu.\n2. Faire chauffer le lait sans le faire bouillir.\n3. Verser le café dans une grande tasse.\n4. Ajouter le lait chaud moussé et le sucre.\n5. Saupoudrer de cannelle et servir avec un cookie.',
    nombrePersonnes: 1, tempsPreparation: 5, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[1668].id,
    ingredients: { create: [
      { ingredientId: ing('café').id,       quantity: '15', unit: 'g'    },
      { ingredientId: ing('lait entier').id,quantity: '15', unit: 'cl'   },
      { ingredientId: ing('sucre').id,      quantity: '2',  unit: 'c.à.c'},
      { ingredientId: ing('cannelle').id,   quantity: '1',  unit: 'pincée'},
    ]},
  });

  console.log('✅ 12 boissons créées\n')
  
  // RECETTES PENDING / DRAFT
  console.log('✅ recette PENDING')

  await createRecipe({
    titre: 'Soupe exotique',
    imageURL: 'https://images.unsplash.com/photo-1589308051-0b4c6b182b8c?w=600',
    instructions: '1. Couper mangue et papaye.\n2. Mixer avec lait de coco et citron vert.\n3. Servir frais avec feuilles de menthe.',
    nombrePersonnes: 4,
    tempsPreparation: 15,
    tempsCuisson: 0,
    status: 'PENDING',
    userId: userMarie.id,
    categoryId: catEntree.id,
    mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('mangue').id, quantity: '1', unit: 'pièce' },
      { ingredientId: ing('lait entier').id, quantity: '20', unit: 'cl' },
      { ingredientId: ing('citron').id, quantity: '1', unit: 'pièce' },
    ]},
  });


  console.log('✅ recette DRAFT');

  await createRecipe({
    titre: 'Dessert chocolaté',
    imageURL: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600',
    instructions: '1. Mélanger chocolat fondu et lait.\n2. Ajouter sucre et œufs.\n3. Verser dans moules et réfrigérer.',
    nombrePersonnes: 2,
    tempsPreparation: 10,
    tempsCuisson: 0,
    status: 'DRAFT',
    rejectionReason: 'La recette est incomplète, il manque la cuisson exacte.',
    userId: userRemy.id,
    categoryId: catDessert.id,
    mediaId: medias[392].id,
    ingredients: { create: [
      { ingredientId: ing('chocolat noir 70%').id, quantity: '100', unit: 'g' },
      { ingredientId: ing('lait entier').id, quantity: '50', unit: 'cl' },
      { ingredientId: ing('œuf').id, quantity: '2', unit: 'pièces' },
    ]},
  });

  // ── Résumé final ─────────────────────────────────────────
  const [nEntree, nPlat, nDessert, nBoisson] = await Promise.all([
    prisma.recipe.count({ where: { categoryId: catEntree.id } }),
    prisma.recipe.count({ where: { categoryId: catPlat.id } }),
    prisma.recipe.count({ where: { categoryId: catDessert.id } }),
    prisma.recipe.count({ where: { categoryId: catBoisson.id } }),
  ]);

  console.log('🎬 Seed v3 terminé !\n');
  console.log('────────────────────────────────────────────────');
  console.log(`  Entrées  : ${nEntree}  recettes`);
  console.log(`  Plats    : ${nPlat}  recettes`);
  console.log(`  Desserts : ${nDessert} recettes`);
  console.log(`  Boissons : ${nBoisson} recettes`);
  console.log(`  TOTAL    : ${nEntree + nPlat + nDessert + nBoisson} recettes`);
  console.log('────────────────────────────────────────────────');
  console.log('  Médias   : 16 (10 films + 3 séries + 3 nouveaux films)');
  console.log('────────────────────────────────────────────────');
  console.log('  ADMIN   : admin@cinesdelices.fr  / Admin1234!');
  console.log('  MEMBRE  : marie@cinesdelices.fr  / Member1234!');
  console.log('  MEMBRE  : remy@cinesdelices.fr   / Member1234!');
  console.log('────────────────────────────────────────────────\n');
}

main()
  .catch(e => { console.error('❌ Erreur seed :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
