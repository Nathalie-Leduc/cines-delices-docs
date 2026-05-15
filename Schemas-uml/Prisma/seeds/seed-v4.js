import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// fix import PrismaClient dans le seed Node.js25 avec ESM
// ne supporte pas l'import nommé de Common.js (problème deploiement avec Render)
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import argon2 from 'argon2';
import fs from 'node:fs';
import path from 'node:path';
import { generateUniqueSlug } from '../src/utils/slug.js';

// ─────────────────────────────────────────────────────────
// CONNEXION
// ─────────────────────────────────────────────────────────
const connectionString = process.env.DATABASE_URL;
const isLocalDatabase = /@(localhost|127\.0\.0\.1|db):\d+/i.test(connectionString || '');
const pool = new pg.Pool({
  connectionString,
  ...(isLocalDatabase ? {} : { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────
// DOSSIERS D'UPLOAD
// ─────────────────────────────────────────────────────────
const UPLOADS_DIR   = path.resolve(process.cwd(), 'public', 'uploads');
const POSTERS_DIR   = path.join(UPLOADS_DIR, 'posters');
const RECIPES_DIR   = path.join(UPLOADS_DIR, 'recipes');
const API_BASE_URL  = process.env.API_BASE_URL || 'http://localhost:3000';

for (const dir of [UPLOADS_DIR, POSTERS_DIR, RECIPES_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// ─────────────────────────────────────────────────────────
// downloadAndConvertImage — télécharge + convertit en WebP
//
// Analogie : le préparateur télécharge l'affiche d'un film
// ou la photo d'un plat, la retouche en WebP et la classe
// dans le bon dossier (posters/ ou recipes/).
//
// @param url      URL source (TMDB ou Unsplash)
// @param dir      Dossier de destination (POSTERS_DIR ou RECIPES_DIR)
// @param prefix   Préfixe du nom de fichier ('poster-' ou 'recipe-')
// @returns        URL publique locale ou null si échec
// ─────────────────────────────────────────────────────────
async function downloadAndConvertImage(url, dir, prefix) {
  if (!url) return null;

  try {
    // Charger sharp en lazy (même pattern que recipeImageUploadMiddleware)
    const sharpModule = await import('sharp').catch(() => null);
    const sharp = sharpModule?.default || sharpModule;

    // Construire un nom de fichier unique depuis l'URL
    const urlPath = new URL(url).pathname;
    const originalName = path.basename(urlPath, path.extname(urlPath))
      .replace(/[^a-z0-9_-]/gi, '-')
      .slice(0, 40);
    const filename = `${prefix}${originalName}.webp`;
    const outputPath = path.join(dir, filename);
    const subdir = dir === POSTERS_DIR ? 'posters' : 'recipes';
    const publicUrl = `${API_BASE_URL}/uploads/${subdir}/${filename}`;

    // Déjà converti → retourner l'URL directement
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  ${filename} (déjà présent)`);
      return publicUrl;
    }

    // Télécharger
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  ⚠️  Impossible de télécharger : ${url} (HTTP ${response.status})`);
      return url; // fallback sur l'URL originale
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (sharp) {
      // Convertir en WebP avec Sharp
      await sharp(buffer)
        .resize({ width: 800, height: 600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const originalSize = buffer.length;
      const newSize      = fs.statSync(outputPath).size;
      const savings      = Math.round((1 - newSize / originalSize) * 100);
      console.log(`  ✅  ${filename} (${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB, -${savings}%)`);
    } else {
      // Sharp absent → écrire le buffer brut
      fs.writeFileSync(outputPath.replace('.webp', path.extname(url) || '.jpg'), buffer);
      console.warn(`  ⚠️  Sharp absent, image sauvegardée sans conversion : ${filename}`);
    }

    return publicUrl;
  } catch (err) {
    console.error(`  ❌  Erreur conversion image ${url} :`, err.message);
    return url; // fallback URL originale
  }
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Démarrage du seed Cinés Délices v4...\n');
  console.log('📦 Images : téléchargement + conversion WebP activés\n');

  // ── 1. Catégories ─────────────────────────────────────
  const [catEntree, catPlat, catDessert, catBoisson] = await Promise.all([
    prisma.category.upsert({ where: { nom: 'Entrée' },  update: {}, create: { nom: 'Entrée',  description: 'Amuse-bouches et entrées' } }),
    prisma.category.upsert({ where: { nom: 'Plat' },    update: {}, create: { nom: 'Plat',    description: 'Plats principaux' } }),
    prisma.category.upsert({ where: { nom: 'Dessert' }, update: {}, create: { nom: 'Dessert', description: 'Douceurs sucrées' } }),
    prisma.category.upsert({ where: { nom: 'Boisson' }, update: {}, create: { nom: 'Boisson', description: 'Boissons et cocktails' } }),
  ]);
  console.log('✅ Catégories :', [catEntree, catPlat, catDessert, catBoisson].map(c => c.nom).join(', '));

  // ── 2. Genres ─────────────────────────────────────────
  const [genreDrame, genreComedy, genreAnimation, genreAction, genreThriller, genreFantasy, genreCrime, genreRomance] = await Promise.all([
    prisma.genre.upsert({ where: { tmdbGenreId: 18    }, update: {}, create: { nom: 'Drame',     tmdbGenreId: 18    } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 35    }, update: {}, create: { nom: 'Comédie',   tmdbGenreId: 35    } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 16    }, update: {}, create: { nom: 'Animation', tmdbGenreId: 16    } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 28    }, update: {}, create: { nom: 'Action',    tmdbGenreId: 28    } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 53    }, update: {}, create: { nom: 'Thriller',  tmdbGenreId: 53    } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 14    }, update: {}, create: { nom: 'Fantasy',   tmdbGenreId: 14    } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 80    }, update: {}, create: { nom: 'Crime',     tmdbGenreId: 80    } }),
    prisma.genre.upsert({ where: { tmdbGenreId: 10749 }, update: {}, create: { nom: 'Romance',   tmdbGenreId: 10749 } }),
  ]);
  console.log('✅ Genres OK');

  // ── 3. Médias avec synopsis TMDB réels ────────────────
  console.log('\n🎬 Médias (posters WebP)...');

  const mediaDefs = [
  {
    tmdbId: 2062, titre: 'Ratatouille', realisateur: 'Brad Bird', annee: 2007, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-iFcWBdTPeHQDS3OQxBcH3QaYXYv.webp`,
    synopsis: "Rémy est un jeune rat qui rêve de devenir un grand chef français. Ni l'opposition de sa famille, ni le fait d'être un rongeur dans une profession qui les déteste ne le démotivent. Rémy est prêt à tout pour vivre sa passion de la cuisine — et le fait d'habiter dans les égouts du restaurant ultra-coté d'Auguste Gusteau va lui en donner l'occasion.",
    genres: [genreAnimation.id, genreComedy.id],
  },
  {
    tmdbId: 392, titre: 'Le Chocolat', realisateur: 'Lasse Hallström', annee: 2000, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-7RBG3RzAqQvF6XtTsQqLzdsyAvR.webp`,
    synopsis: "Dans un village tranquille de la France profonde, une mystérieuse étrangère, Vianne Thierry, ouvre une chocolaterie juste au début du Carême. Ses chocolats semblent avoir des vertus magiques qui bouleversent la vie des habitants et défient l'ordre moral établi par le comte de Reynaud.",
    genres: [genreDrame.id, genreRomance.id],
  },
  {
    tmdbId: 1396, titre: 'Breaking Bad', realisateur: 'Vince Gilligan', annee: 2008, type: 'SERIES',
    poster: `${API_BASE_URL}/uploads/posters/poster-4YLQj5XRrMJ7gp8eb0h6umd0iNx.webp`,
    synopsis: "Walter White, professeur de chimie au lycée d'Albuquerque, apprend qu'il est atteint d'un cancer du poumon en phase terminale. Désespéré, il s'associe à Jesse Pinkman, un ancien élève devenu petit dealer, pour fabriquer et vendre de la méthamphétamine de haute qualité afin d'assurer l'avenir financier de sa famille.",
    genres: [genreDrame.id, genreThriller.id],
  },
  {
    tmdbId: 24094, titre: 'Julie & Julia', realisateur: 'Nora Ephron', annee: 2009, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-rtZquHKuEntFq3YTO3v4L5RtANw.webp`,
    synopsis: "En 2002, Julie Powell, secrétaire à New York, décide de cuisiner en un an les 524 recettes du livre emblématique de Julia Child, « Mastering the Art of French Cooking », et de tenir un blog sur ses aventures culinaires. Le film entrecroise son histoire avec celle de Julia Child dans le Paris des années 1950.",
    genres: [genreDrame.id, genreComedy.id],
  },
  {
    tmdbId: 11832, titre: 'Le Festin de Babette', realisateur: 'Gabriel Axel', annee: 1987, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-zuZT3kE2Eb6Ln7ec5Ln4IcDwynf.webp`,
    synopsis: "Au XIXe siècle, au Jutland danois, deux vieilles sœurs dévotes recueillent Babette, une réfugiée française. Cuisinière de talent, Babette gagne à la loterie et décide de dépenser toute sa fortune pour offrir à la communauté austère un somptueux festin gastronomique français — le repas de sa vie.",
    genres: [genreDrame.id],
  },
  {
    tmdbId: 31175, titre: 'Soul Kitchen', realisateur: 'Fatih Akin', annee: 2009, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-9UZIiJtPxNonMtIWisXm8O7zgnX.webp`,
    synopsis: "Zinos Kazantsakis gère tant bien que mal son restaurant hambourgeois « Soul Kitchen » quand un chef étoilé et excentrique débarque dans sa cuisine. Entre galères financières, problèmes de dos, petite amie partie à Shanghaï et frère à peine sorti de prison, Zinos va devoir se battre pour garder son établissement.",
    genres: [genreComedy.id],
  },
  {
    tmdbId: 136315, titre: 'The Bear', realisateur: 'Christopher Storer', annee: 2022, type: 'SERIES',
    poster: `${API_BASE_URL}/uploads/posters/poster-pjQUpBEsg89EbL4QWcjfH0s7Txz.webp`,
    synopsis: "Carmen Berzatto, dit « Carmy », chef étoilé formé dans les plus grands restaurants du monde, rentre à Chicago pour reprendre l'Original Beef, le sandwich shop familial laissé par son frère décédé. Il doit apprendre à gérer une équipe chaotique tout en tentant de transformer l'établissement en restaurant digne de son talent.",
    genres: [genreDrame.id],
  },
  {
    tmdbId: 680, titre: 'Pulp Fiction', realisateur: 'Quentin Tarantino', annee: 1994, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-4TBdF7nFw2aKNM0gPOlDNq3v3se.webp`,
    synopsis: "Les destins croisés de plusieurs personnages gravitant autour du monde du crime à Los Angeles : deux tueurs à gages philosophes, leur patron gangster et sa femme, un boxeur qui trahit son commanditaire, et deux petits braqueurs impulsifs. Une plongée dans une Amérique pop, violente et décalée.",
    genres: [genreDrame.id, genreThriller.id, genreCrime.id],
  },
  {
    tmdbId: 120, titre: 'Le Seigneur des Anneaux', realisateur: 'Peter Jackson', annee: 2001, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-5OPg6M0yHr21Ovs1fni2H1xpKuF.webp`,
    synopsis: "Le hobbit Frodon Sacquet hérite d'un anneau magique qui s'avère être l'Anneau Unique, forgé par le Seigneur des Ténèbres Sauron pour asservir tous les peuples de la Terre du Milieu. Accompagné de la Communauté de l'Anneau, Frodon entreprend un voyage périlleux pour détruire l'anneau dans les feux de la Montagne du Destin.",
    genres: [genreAction.id, genreFantasy.id],
  },
  {
    tmdbId: 475557, titre: 'Joker', realisateur: 'Todd Phillips', annee: 2019, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-tWjJ3ILjsbTwKgXxEv48QAbYZ19.webp`,
    synopsis: "À Gotham City dans les années 1980, Arthur Fleck, humoriste raté atteint d'un trouble neurologique qui le fait rire de façon incontrôlable, est marginalisé et maltraité par la société. Sa descente aux enfers progressive le conduit à embrasser le chaos et à devenir le Joker, symbole de la révolte des laissés-pour-compte.",
    genres: [genreDrame.id, genreThriller.id, genreCrime.id],
  },
  {
    tmdbId: 120467, titre: 'The Grand Budapest Hotel', realisateur: 'Wes Anderson', annee: 2014, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-qcWTuWPu6x6t2MKt0MTfbResJiV.webp`,
    synopsis: "Les aventures de Gustave H., concierge légendaire d'un grand hôtel européen de l'entre-deux-guerres, et de Zero Moustafa, le groom qui devient son fidèle ami. L'histoire tourne autour du vol d'une précieuse peinture Renaissance et d'une bataille pour un immense héritage familial.",
    genres: [genreComedy.id, genreDrame.id],
  },
  {
    tmdbId: 38167, titre: 'Mange, Prie, Aime', realisateur: 'Ryan Murphy', annee: 2010, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-yoOyDKXjJIDBdnzQUrUjP0EtcZo.webp`,
    synopsis: "Après un divorce douloureux et une dépression, Elizabeth Gilbert décide de tout quitter pour un voyage initiatique d'un an à travers trois pays : l'Italie pour les plaisirs de la table, l'Inde pour la spiritualité, et Bali pour trouver l'équilibre entre les deux et peut-être l'amour.",
    genres: [genreDrame.id, genreRomance.id],
  },
  {
    tmdbId: 238, titre: 'Le Parrain', realisateur: 'Francis Ford Coppola', annee: 1972, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-k3uIbYtiuK8pwbCcbma29nTqmgG.webp`,
    synopsis: "Vito Corleone, vieux parrain d'une puissante famille de la mafia new-yorkaise, tente de conserver son empire criminel pendant que ses fils se battent pour prendre sa succession. Son fils cadet Michael, d'abord étranger au monde du crime, va progressivement s'y plonger jusqu'à en devenir le nouveau parrain.",
    genres: [genreDrame.id, genreCrime.id],
  },
  {
    tmdbId: 671, titre: "Harry Potter à l'école des sorciers", realisateur: 'Chris Columbus', annee: 2001, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-fbxQ44VRdM2PVzHSNajUseUteem.webp`,
    synopsis: "Harry Potter, orphelin élevé par son oncle et sa tante qui lui rendent la vie impossible, découvre le jour de ses onze ans qu'il est un sorcier. Admis à l'école Poudlard, il y apprend la magie, se lie d'amitié avec Ron et Hermione, et découvre la vérité sur la mort de ses parents et sur la mystérieuse cicatrice en éclair sur son front.",
    genres: [genreFantasy.id, genreAction.id],
  },
  {
    tmdbId: 1668, titre: 'Friends', realisateur: 'Marta Kauffman', annee: 1994, type: 'SERIES',
    poster: `${API_BASE_URL}/uploads/posters/poster-2koX1xLkpTQM4IZebYvKysFW1Nh.webp`,
    synopsis: "La vie quotidienne de six amis inséparables vivant à New York : Rachel, Monica, Phoebe, Ross, Chandler et Joey. Pendant dix saisons, ils partagent amours, ruptures, carrières et fous rires dans leurs appartements du Village et au Central Perk, leur café habituel.",
    genres: [genreComedy.id, genreRomance.id],
  },
  {
    tmdbId: 129, titre: 'Le Voyage de Chihiro', realisateur: 'Hayao Miyazaki', annee: 2001, type: 'MOVIE',
    poster: `${API_BASE_URL}/uploads/posters/poster-12TAqK0AUgdcYE9ZYZ9r7ASbH5Q.webp`,
    synopsis: "Chihiro, une fillette de dix ans, se retrouve piégée dans un monde fantastique peuplé d'esprits et de dieux lorsque ses parents sont transformés en cochons par la sorcière Yubaba. Pour les sauver, elle doit travailler dans les thermes de Yubaba et apprendre à se débrouiller seule dans ce monde mystérieux et dangereux.",
    genres: [genreAnimation.id, genreFantasy.id],
  },
];

  const medias = {};
for (const def of mediaDefs) {
  process.stdout.write(`  → ${def.titre} : poster...`);

  const slug = await generateUniqueSlug(
    `${def.titre} ${def.annee}`,
    (s) => prisma.media.findUnique({ where: { slug: s } }),
  );

  medias[def.tmdbId] = await prisma.media.upsert({
    where: { tmdbId_type: { tmdbId: def.tmdbId, type: def.type } },
    update: {
      synopsis: def.synopsis,
      posterUrl: def.poster, // ← URL directe, pas de fetch !
      realisateur: def.realisateur,
    },
    create: {
      tmdbId: def.tmdbId, titre: def.titre, slug, type: def.type,
      posterUrl: def.poster, // ← URL directe, pas de fetch !
      synopsis: def.synopsis, annee: def.annee, realisateur: def.realisateur,
      genres: { create: def.genres.map(gId => ({ genreId: gId })) },
    },
  });
  process.stdout.write(` ✅\n`);
}
  console.log(`✅ ${Object.keys(medias).length} médias créés/mis à jour\n`);

  // ── 4. Utilisateurs ───────────────────────────────────
  console.log('👤 Utilisateurs...');
  const adminHash  = await argon2.hash('Admin1234!');
  const memberHash = await argon2.hash('Member1234!');

  // ── 3 Admins ──
  const _userAdmin = await prisma.user.upsert({
    where: { email: 'admin@cinesdelices.fr' },
    update: { nom: 'Delices', pseudo: 'Admin', passwordHash: adminHash, role: 'ADMIN' },
    create: { email: 'admin@cinesdelices.fr', nom: 'Delices', pseudo: 'Admin', passwordHash: adminHash, role: 'ADMIN' },
  });
  const _userSophie = await prisma.user.upsert({
    where: { email: 'sophie.martin@cinesdelices.fr' },
    update: { nom: 'Martin', pseudo: 'SophieAdmin', passwordHash: adminHash, role: 'ADMIN' },
    create: { email: 'sophie.martin@cinesdelices.fr', nom: 'Martin', pseudo: 'SophieAdmin', passwordHash: adminHash, role: 'ADMIN' },
  });
  const _userLuca = await prisma.user.upsert({
    where: { email: 'luca.bernard@cinesdelices.fr' },
    update: { nom: 'Bernard', pseudo: 'LucaAdmin', passwordHash: adminHash, role: 'ADMIN' },
    create: { email: 'luca.bernard@cinesdelices.fr', nom: 'Bernard', pseudo: 'LucaAdmin', passwordHash: adminHash, role: 'ADMIN' },
  });

  // ── Membres avec recettes (existants) ──
  const userMarie = await prisma.user.upsert({
    where: { email: 'marie@cinesdelices.fr' },
    update: { nom: 'Dubois', pseudo: 'Marie', passwordHash: memberHash, role: 'MEMBER' },
    create: { email: 'marie@cinesdelices.fr', nom: 'Dubois', pseudo: 'Marie', passwordHash: memberHash, role: 'MEMBER' },
  });
  const userRemy = await prisma.user.upsert({
    where: { email: 'remy@cinesdelices.fr' },
    update: { nom: 'Martin', pseudo: 'ReMyChef', passwordHash: memberHash, role: 'MEMBER' },
    create: { email: 'remy@cinesdelices.fr', nom: 'Martin', pseudo: 'ReMyChef', passwordHash: memberHash, role: 'MEMBER' },
  });

  // ── 8 Membres sans recettes ──
  const membresSupp = [
    { email: 'clara.dupont@mail.fr',    nom: 'Dupont',    pseudo: 'ClaraFood',     },
    { email: 'theo.rousseau@mail.fr',   nom: 'Rousseau',  pseudo: 'TheoGourmet',   },
    { email: 'ines.lefevre@mail.fr',    nom: 'Lefevre',   pseudo: 'InesCuisine',   },
    { email: 'hugo.moreau@mail.fr',     nom: 'Moreau',    pseudo: 'HugoChef',      },
    { email: 'camille.simon@mail.fr',   nom: 'Simon',     pseudo: 'CamilleRecette',},
    { email: 'noemie.gerard@mail.fr',   nom: 'Gerard',    pseudo: 'NoemieFood',    },
    { email: 'maxime.petit@mail.fr',    nom: 'Petit',     pseudo: 'MaximeCook',    },
    { email: 'lea.fontaine@mail.fr',    nom: 'Fontaine',  pseudo: 'LeaDelices',    },
  ];

  for (const m of membresSupp) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: { nom: m.nom, pseudo: m.pseudo, passwordHash: memberHash, role: 'MEMBER' },
      create: { email: m.email, nom: m.nom, pseudo: m.pseudo, passwordHash: memberHash, role: 'MEMBER' },
    });
  }

  console.log('✅ 3 admins + 2 membres actifs + 8 membres sans recettes\n');

  // ── 5. Ingrédients ────────────────────────────────────
  const nomsIngredients = [
    'courgette', 'aubergine', 'tomate', 'oignon', 'poivron rouge', 'poivron vert',
    "huile d'olive", 'herbes de provence', 'sel', 'poivre', 'ail',
    'lait entier', 'chocolat noir 70%', 'cannelle', 'piment de cayenne', 'sucre',
    'boeuf paleron', 'vin rouge', 'lardons', 'champignon', 'carotte', 'farine',
    'beurre', 'creme fraiche', 'oeuf', 'fromage rape', 'mozzarella',
    'basilic', 'thym', 'laurier', 'persil', 'ciboulette',
    'poulet', 'saumon', 'crevette', 'moule', 'pate', 'riz',
    'pomme de terre', 'citron', 'orange', 'pomme', 'fraise', 'framboise',
    'levure chimique', 'extrait de vanille', 'miel', 'vinaigre balsamique',
    'sauce soja', 'gingembre', 'cumin', 'paprika', 'curry',
    'jambon', 'anchois', 'capre', 'olive noire',
    'bouillon de poulet', 'bouillon de legume', 'concentre de tomate',
    'amande', 'noix', 'noisette', 'raisin sec', 'chapelure', 'semoule',
    'rhum', 'whisky', 'vin blanc', 'champagne',
    'sirop de grenadine', 'jus de citron', 'eau gazeuse', 'the', 'cafe',
    'lentille', 'pois chiche', 'mangue',
    'ricotta', 'parmesan', 'pancetta', 'mascarpone', 'pesto',
    'citronnelle', 'lait de coco', 'tofu', 'nouille de riz',
    'biere', 'menthe',
  ];

  const allIngredients = await Promise.all(
    nomsIngredients.map(nom =>
      prisma.ingredient.upsert({
        where:  { nom: nom.trim().toLowerCase() },
        update: {},
        create: { nom: nom.trim().toLowerCase(), approved: true },
      })
    )
  );
  console.log(`✅ ${allIngredients.length} ingrédients créés/vérifiés`);

  const ing = (nom) => {
    const n = nom.trim().toLowerCase();
    const found = allIngredients.find(i => i.nom === n);
    if (!found) throw new Error(`Ingrédient introuvable : "${nom}" — ajoute-le dans nomsIngredients`);
    return found;
  };

  // ── 6. Recettes ───────────────────────────────────────
  console.log('\n🍽️  Recettes (images WebP)...');

  const createRecipe = async (data, imageUrl) => {
    const existing = await prisma.recipe.findFirst({ where: { titre: data.titre } });
    if (existing) {
      console.log(`  ⏭️  ${data.titre} (déjà présente)`);
      return existing;
    }

    // Télécharger et convertir l'image de la recette en WebP
    process.stdout.write(`  → ${data.titre} : image...`);
    const localImageUrl = await downloadAndConvertImage(imageUrl, RECIPES_DIR, 'recipe-');
    process.stdout.write(` ✅\n`);

    const slug = await generateUniqueSlug(
      data.titre,
      (s) => prisma.recipe.findUnique({ where: { slug: s } }),
    );
    const created = await prisma.recipe.create({
      data: { ...data, slug, imageURL: localImageUrl || imageUrl },
    });
    return created;
  };

  // ════════════════════════════════════════════════════
  // ENTRÉES — 12 recettes
  // ════════════════════════════════════════════════════
  console.log('\n📋 Entrées...');

  await createRecipe({
    titre: 'Bruschetta façon Ratatouille',
    instructions: "1. Griller des tranches de pain au four à 200°C (5 min).\n2. Frotter chaque tranche avec une gousse d'ail.\n3. Déposer des dés de tomates, aubergine et basilic frais.\n4. Arroser d'huile d'olive et assaisonner.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('tomate').id,         quantity: '3',  unit: 'pièces'  },
      { ingredientId: ing('aubergine').id,      quantity: '1',  unit: 'pièce'   },
      { ingredientId: ing('ail').id,            quantity: '2',  unit: 'gousses' },
      { ingredientId: ing('basilic').id,        quantity: '1',  unit: 'poignée' },
      { ingredientId: ing("huile d'olive").id,  quantity: '3',  unit: 'c.à.s'   },
      { ingredientId: ing('sel').id,            quantity: null, unit: null      },
    ]},
  }, 'https://images.unsplash.com/photo-1594978583693-8dfdfc93f052?w=800');

  await createRecipe({
    titre: 'Gaspacho de Breaking Bad',
    instructions: "1. Mixer tomates, poivron rouge, oignon, ail et concombre.\n2. Ajouter huile d'olive, vinaigre balsamique, sel.\n3. Réfrigérer 2h minimum.\n4. Servir bien frais avec des croûtons grillés.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('tomate').id,              quantity: '6',  unit: 'pièces' },
      { ingredientId: ing('poivron rouge').id,       quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('oignon').id,              quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('ail').id,                 quantity: '1',  unit: 'gousse' },
      { ingredientId: ing('vinaigre balsamique').id, quantity: '2',  unit: 'c.à.s'  },
      { ingredientId: ing("huile d'olive").id,       quantity: '4',  unit: 'c.à.s'  },
    ]},
  }, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800');

  await createRecipe({
    titre: 'Velouté de champignons de The Bear',
    instructions: "1. Faire revenir champignons et oignon dans le beurre (10 min).\n2. Ajouter bouillon de légumes et cuire 20 min.\n3. Mixer finement jusqu'à texture soyeuse.\n4. Incorporer la crème fraîche, assaisonner et servir.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 30,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('champignon').id,          quantity: '500', unit: 'g'    },
      { ingredientId: ing('oignon').id,              quantity: '1',   unit: 'pièce'},
      { ingredientId: ing('beurre').id,              quantity: '30',  unit: 'g'    },
      { ingredientId: ing('creme fraiche').id,       quantity: '20',  unit: 'cl'   },
      { ingredientId: ing('bouillon de legume').id,  quantity: '50',  unit: 'cl'   },
    ]},
  }, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800');

  await createRecipe({
    titre: 'Salade César de Julie Child',
    instructions: "1. Préparer la sauce : mixer anchois, ail, citron, fromage râpé, huile.\n2. Griller les croûtons au beurre jusqu'à dorure.\n3. Couper la laitue romaine en morceaux et assaisonner.\n4. Garnir de croûtons, fromage râpé et servir.",
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('anchois').id,        quantity: '4',  unit: 'filets' },
      { ingredientId: ing('ail').id,            quantity: '1',  unit: 'gousse' },
      { ingredientId: ing('citron').id,         quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('fromage rape').id,   quantity: '60', unit: 'g'      },
      { ingredientId: ing('beurre').id,         quantity: '30', unit: 'g'      },
      { ingredientId: ing("huile d'olive").id,  quantity: '5',  unit: 'c.à.s'  },
    ]},
  }, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800');

  await createRecipe({
    titre: 'Tartare de saumon du Festin de Babette',
    instructions: "1. Couper le saumon très frais en petits dés réguliers.\n2. Assaisonner avec jus de citron, câpres et ciboulette ciselée.\n3. Ajouter une cuillère d'huile d'olive, sel, poivre.\n4. Dresser dans un emporte-pièce et servir immédiatement.",
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('saumon').id,         quantity: '400', unit: 'g'     },
      { ingredientId: ing('citron').id,         quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('capre').id,          quantity: '2',   unit: 'c.à.s' },
      { ingredientId: ing('ciboulette').id,     quantity: '1',   unit: 'botte' },
      { ingredientId: ing("huile d'olive").id,  quantity: '2',   unit: 'c.à.s' },
    ]},
  }, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800');

  await createRecipe({
    titre: "Soupe à l'oignon de Soul Kitchen",
    instructions: "1. Émincer les oignons et les caraméliser 30 min à feu doux dans le beurre.\n2. Déglacer au vin blanc et laisser évaporer.\n3. Ajouter le bouillon et mijoter 15 min.\n4. Verser en cocotte sur des croûtons, recouvrir de fromage râpé et gratiner 5 min.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 50,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('oignon').id,             quantity: '6',   unit: 'pièces' },
      { ingredientId: ing('beurre').id,             quantity: '50',  unit: 'g'      },
      { ingredientId: ing('vin blanc').id,          quantity: '15',  unit: 'cl'     },
      { ingredientId: ing('bouillon de legume').id, quantity: '1',   unit: 'litre'  },
      { ingredientId: ing('fromage rape').id,       quantity: '100', unit: 'g'      },
    ]},
  }, 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=800');

  await createRecipe({
    titre: 'Ceviche de crevettes de Pulp Fiction',
    instructions: "1. Décortiquer les crevettes et les couper en morceaux.\n2. Faire mariner dans le jus de citron vert 20 min — elles 'cuisent' à l'acide.\n3. Ajouter oignon rouge émincé, tomate, piment et coriandre.\n4. Assaisonner et servir immédiatement avec des chips.",
    nombrePersonnes: 4, tempsPreparation: 30, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('crevette').id,           quantity: '400', unit: 'g'     },
      { ingredientId: ing('citron').id,             quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('oignon').id,             quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('tomate').id,             quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('piment de cayenne').id,  quantity: '1',   unit: 'pincée'},
    ]},
  }, 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=800');

  await createRecipe({
    titre: 'Gougères au fromage du Hobbit',
    instructions: "1. Porter à ébullition eau, beurre et sel.\n2. Hors du feu, incorporer la farine d'un coup et dessécher 2 min.\n3. Ajouter les oeufs un par un puis le fromage râpé.\n4. Dresser des petites boules sur plaque et cuire 20 min à 180°C.",
    nombrePersonnes: 6, tempsPreparation: 20, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,      quantity: '125', unit: 'g'      },
      { ingredientId: ing('beurre').id,      quantity: '80',  unit: 'g'      },
      { ingredientId: ing('oeuf').id,        quantity: '3',   unit: 'pièces' },
      { ingredientId: ing('fromage rape').id,quantity: '100', unit: 'g'      },
      { ingredientId: ing('sel').id,         quantity: null,  unit: null     },
    ]},
  }, 'https://images.unsplash.com/photo-1767016452826-815c7b4765ed?w=800');

  await createRecipe({
    titre: 'Rillettes de saumon du Bear',
    instructions: "1. Pocher le saumon 10 min dans de l'eau frémissante salée.\n2. Effeuiller et mélanger avec crème fraîche, citron et câpres.\n3. Assaisonner généreusement et réfrigérer 1h.\n4. Servir sur des toasts grillés avec de la ciboulette.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('saumon').id,       quantity: '300', unit: 'g'    },
      { ingredientId: ing('creme fraiche').id,quantity: '10',  unit: 'cl'   },
      { ingredientId: ing('citron').id,       quantity: '1',   unit: 'pièce'},
      { ingredientId: ing('capre').id,        quantity: '1',   unit: 'c.à.s'},
      { ingredientId: ing('ciboulette').id,   quantity: '1',   unit: 'botte'},
    ]},
  }, 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800');

  await createRecipe({
    titre: 'Tartines chèvre-miel du Joker',
    instructions: "1. Griller les tranches de pain de campagne.\n2. Écraser le fromage de chèvre frais et le répartir.\n3. Arroser de miel et parsemer de noix concassées et de thym.\n4. Passer 3 min sous le gril du four jusqu'à légère dorure.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('miel').id,        quantity: '3',   unit: 'c.à.s'  },
      { ingredientId: ing('noix').id,        quantity: '50',  unit: 'g'      },
      { ingredientId: ing('thym').id,        quantity: '1',   unit: 'branche'},
      { ingredientId: ing('fromage rape').id,quantity: '150', unit: 'g'      },
    ]},
  }, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800');

  await createRecipe({
    titre: 'Antipasti du Grand Budapest Hotel',
    instructions: "1. Disposer joliment sur un plateau : tranches de jambon, olives noires, tomates cerises.\n2. Ajouter des billes de mozzarella et des feuilles de basilic.\n3. Arroser d'huile d'olive et de vinaigre balsamique.\n4. Servir avec des gressins.",
    nombrePersonnes: 6, tempsPreparation: 15, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[120467].id,
    ingredients: { create: [
      { ingredientId: ing('jambon').id,              quantity: '200', unit: 'g'      },
      { ingredientId: ing('olive noire').id,         quantity: '100', unit: 'g'      },
      { ingredientId: ing('mozzarella').id,          quantity: '200', unit: 'g'      },
      { ingredientId: ing('tomate').id,              quantity: '4',   unit: 'pièces' },
      { ingredientId: ing('vinaigre balsamique').id, quantity: '2',   unit: 'c.à.s'  },
    ]},
  }, 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800');

  await createRecipe({
    titre: 'Soupe miso du Voyage de Chihiro',
    instructions: "1. Porter le bouillon de légumes à ébullition douce.\n2. Couper le tofu en dés et émincer les champignons.\n3. Ajouter la sauce soja et le gingembre râpé.\n4. Verser dans des bols et garnir de ciboulette ciselée.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catEntree.id, mediaId: medias[129].id,
    ingredients: { create: [
      { ingredientId: ing('bouillon de legume').id, quantity: '1',   unit: 'litre' },
      { ingredientId: ing('tofu').id,               quantity: '200', unit: 'g'     },
      { ingredientId: ing('champignon').id,         quantity: '100', unit: 'g'     },
      { ingredientId: ing('sauce soja').id,         quantity: '3',   unit: 'c.à.s' },
      { ingredientId: ing('gingembre').id,          quantity: '2',   unit: 'cm'    },
      { ingredientId: ing('ciboulette').id,         quantity: '1',   unit: 'botte' },
    ]},
  }, 'https://images.unsplash.com/photo-1591224876006-be862c0f1d7a?w=800');

  // ════════════════════════════════════════════════════
  // PLATS — 12 recettes
  // ════════════════════════════════════════════════════
  console.log('\n🍽️  Plats...');

  await createRecipe({
    titre: 'Ratatouille de Rémy',
    instructions: "1. Préchauffer le four à 180°C.\n2. Couper courgette, aubergine, tomates et poivron en rondelles fines (3mm).\n3. Faire revenir l'oignon dans l'huile, ajouter les tomates en dés, sel, poivre — mijoter 15 min et mixer.\n4. Étaler la sauce en fond de plat à gratin.\n5. Disposer les rondelles en rosace en alternant les légumes.\n6. Arroser d'huile, saupoudrer d'herbes, couvrir de papier sulfurisé.\n7. Cuire 40 min puis 10 min à découvert pour dorer.",
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 50,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('courgette').id,          quantity: '2',  unit: 'pièces' },
      { ingredientId: ing('aubergine').id,          quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('tomate').id,             quantity: '5',  unit: 'pièces' },
      { ingredientId: ing('poivron rouge').id,      quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('oignon').id,             quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing("huile d'olive").id,      quantity: '4',  unit: 'c.à.s'  },
      { ingredientId: ing('herbes de provence').id, quantity: '1',  unit: 'c.à.c'  },
    ]},
  }, 'https://plus.unsplash.com/premium_photo-1713635953194-ab8a625b2477?w=800');

  await createRecipe({
    titre: 'Boeuf bourguignon de Julia Child',
    instructions: "1. Couper le boeuf en morceaux et les faire dorer par fournées dans une cocotte.\n2. Faire revenir lardons, oignons et carottes dans la même cocotte.\n3. Remettre la viande, saupoudrer de farine, verser le vin rouge et le bouillon.\n4. Ajouter thym et laurier, couvrir et cuire 2h30 à 160°C.\n5. Ajouter les champignons sautés 30 min avant la fin.",
    nombrePersonnes: 6, tempsPreparation: 30, tempsCuisson: 150,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('boeuf paleron').id,      quantity: '1.5', unit: 'kg'    },
      { ingredientId: ing('vin rouge').id,          quantity: '75',  unit: 'cl'    },
      { ingredientId: ing('lardons').id,            quantity: '200', unit: 'g'     },
      { ingredientId: ing('carotte').id,            quantity: '3',   unit: 'pièces'},
      { ingredientId: ing('champignon').id,         quantity: '300', unit: 'g'     },
      { ingredientId: ing('bouillon de legume').id, quantity: '30',  unit: 'cl'    },
      { ingredientId: ing('farine').id,             quantity: '2',   unit: 'c.à.s' },
    ]},
  }, 'https://images.unsplash.com/photo-1608500218987-0f2b3be34b47?w=800');

  await createRecipe({
    titre: 'Poulet rôti du Festin de Babette',
    instructions: "1. Sortir le poulet 30 min à température ambiante.\n2. Badigeonner de beurre mou mélangé à thym et ail haché.\n3. Saler, poivrer intérieur et extérieur, farcir avec thym et laurier.\n4. Rôtir 1h20 à 200°C en arrosant toutes les 20 min.\n5. Laisser reposer 15 min sous alu avant de découper.",
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 80,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('poulet').id,  quantity: '1.5', unit: 'kg'      },
      { ingredientId: ing('beurre').id,  quantity: '80',  unit: 'g'       },
      { ingredientId: ing('ail').id,     quantity: '4',   unit: 'gousses' },
      { ingredientId: ing('thym').id,    quantity: '4',   unit: 'branches'},
      { ingredientId: ing('laurier').id, quantity: '2',   unit: 'feuilles'},
    ]},
  }, 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=800');

  await createRecipe({
    titre: 'Pasta al Forno de Soul Kitchen',
    instructions: "1. Cuire les pâtes al dente et égoutter.\n2. Faire revenir les lardons, ajouter concentré de tomates et basilic.\n3. Mélanger pâtes et sauce, transférer dans un plat à gratin.\n4. Couvrir de mozzarella tranchée et gratiner 20 min à 180°C.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 35,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('pate').id,                 quantity: '400', unit: 'g'      },
      { ingredientId: ing('lardons').id,              quantity: '150', unit: 'g'      },
      { ingredientId: ing('concentre de tomate').id,  quantity: '3',   unit: 'c.à.s'  },
      { ingredientId: ing('mozzarella').id,           quantity: '250', unit: 'g'      },
      { ingredientId: ing('basilic').id,              quantity: '1',   unit: 'poignée'},
    ]},
  }, 'https://images.unsplash.com/photo-1629115916087-7e8c114a24ed?w=800');

  await createRecipe({
    titre: 'Risotto parmesan de The Bear',
    instructions: "1. Faire revenir l'oignon haché dans le beurre à feu doux.\n2. Ajouter le riz à risotto et nacrer 2 min.\n3. Verser le vin blanc et laisser absorber.\n4. Incorporer le bouillon chaud louche par louche en remuant constamment (18-20 min).\n5. Hors du feu, mantecare avec beurre froid et parmesan. Poivrer.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 25,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('riz').id,                quantity: '320', unit: 'g'     },
      { ingredientId: ing('oignon').id,             quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('beurre').id,             quantity: '80',  unit: 'g'     },
      { ingredientId: ing('vin blanc').id,          quantity: '10',  unit: 'cl'    },
      { ingredientId: ing('bouillon de legume').id, quantity: '1.2', unit: 'litre' },
      { ingredientId: ing('parmesan').id,           quantity: '80',  unit: 'g'     },
    ]},
  }, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800');

  await createRecipe({
    titre: 'Burger Royale de Pulp Fiction',
    instructions: "1. Former 4 steaks avec la viande hachée, saler et poivrer.\n2. Griller 3 min de chaque côté sur plancha très chaude.\n3. Toaster les pains au beurre dans la même plancha.\n4. Monter : pain, salade, steak, fromage fondu, tomate, oignon et sauce au choix.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('boeuf paleron').id, quantity: '600', unit: 'g'     },
      { ingredientId: ing('tomate').id,        quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('fromage rape').id,  quantity: '100', unit: 'g'     },
      { ingredientId: ing('oignon').id,        quantity: '1',   unit: 'pièce' },
      { ingredientId: ing('beurre').id,        quantity: '30',  unit: 'g'     },
    ]},
  }, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800');

  await createRecipe({
    titre: 'Ragoût du Comté de Hobbiton',
    instructions: "1. Faire dorer les morceaux de boeuf en cocotte, réserver.\n2. Faire revenir oignon, ail et carottes 5 min.\n3. Remettre la viande, ajouter pommes de terre, thym, laurier et bouillon.\n4. Mijoter 2h à feu très doux jusqu'à ce que la viande soit fondante.",
    nombrePersonnes: 6, tempsPreparation: 25, tempsCuisson: 120,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('boeuf paleron').id,      quantity: '1',   unit: 'kg'      },
      { ingredientId: ing('pomme de terre').id,     quantity: '4',   unit: 'pièces'  },
      { ingredientId: ing('carotte').id,            quantity: '3',   unit: 'pièces'  },
      { ingredientId: ing('oignon').id,             quantity: '2',   unit: 'pièces'  },
      { ingredientId: ing('bouillon de legume').id, quantity: '50',  unit: 'cl'      },
      { ingredientId: ing('thym').id,               quantity: '2',   unit: 'branches'},
    ]},
  }, 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800');

  await createRecipe({
    titre: 'Saumon en papillote du Festin',
    instructions: "1. Déposer le filet de saumon sur une feuille d'alu.\n2. Assaisonner avec citron, herbes de Provence, sel et poivre.\n3. Fermer hermétiquement la papillote.\n4. Cuire 20 min au four à 180°C — la vapeur garde tout le moelleux.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('saumon').id,             quantity: '600', unit: 'g'     },
      { ingredientId: ing('citron').id,             quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('herbes de provence').id, quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing("huile d'olive").id,      quantity: '2',   unit: 'c.à.s' },
    ]},
  }, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800');

  await createRecipe({
    titre: 'Tacos au poulet épicé de Breaking Bad',
    instructions: "1. Mariner le poulet 1h avec citron, cumin, paprika, ail et huile.\n2. Griller 6-7 min de chaque côté sur plancha chaude.\n3. Laisser reposer 5 min puis trancher en lamelles.\n4. Garnir les tortillas avec poulet, tomate, crème fraîche et coriandre.",
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 15,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('poulet').id,       quantity: '600', unit: 'g'     },
      { ingredientId: ing('citron').id,       quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('cumin').id,        quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('paprika').id,      quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('creme fraiche').id,quantity: '10',  unit: 'cl'    },
      { ingredientId: ing('tomate').id,       quantity: '2',   unit: 'pièces'},
    ]},
  }, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800');

  await createRecipe({
    titre: 'Moules marinières du Joker',
    instructions: "1. Gratter et laver soigneusement les moules.\n2. Faire revenir échalote et ail dans le beurre 2 min.\n3. Verser le vin blanc, ajouter les moules, couvrir.\n4. Cuire à feu vif 5 min en secouant la casserole.\n5. Jeter les moules fermées et parsemer de persil ciselé.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('moule').id,    quantity: '2',  unit: 'kg'     },
      { ingredientId: ing('vin blanc').id,quantity: '20', unit: 'cl'     },
      { ingredientId: ing('ail').id,      quantity: '3',  unit: 'gousses'},
      { ingredientId: ing('oignon').id,   quantity: '2',  unit: 'pièces' },
      { ingredientId: ing('beurre').id,   quantity: '40', unit: 'g'      },
      { ingredientId: ing('persil').id,   quantity: '1',  unit: 'botte'  },
    ]},
  }, 'https://plus.unsplash.com/premium_photo-1707695882668-5dc6f92e6f70?w=800');

  await createRecipe({
    titre: 'Pâtes à la Corleone',
    instructions: "1. Faire revenir la pancetta coupée en dés dans l'huile d'olive.\n2. Ajouter l'ail et le concentré de tomates, cuire 2 min.\n3. Verser le vin rouge, laisser réduire de moitié.\n4. Cuire les pâtes al dente, les ajouter à la sauce.\n5. Servir avec du parmesan fraîchement râpé et du basilic.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catPlat.id, mediaId: medias[238].id,
    ingredients: { create: [
      { ingredientId: ing('pate').id,                quantity: '400', unit: 'g'      },
      { ingredientId: ing('pancetta').id,            quantity: '150', unit: 'g'      },
      { ingredientId: ing('concentre de tomate').id, quantity: '3',   unit: 'c.à.s'  },
      { ingredientId: ing('vin rouge').id,           quantity: '10',  unit: 'cl'     },
      { ingredientId: ing('parmesan').id,            quantity: '80',  unit: 'g'      },
      { ingredientId: ing('basilic').id,             quantity: '1',   unit: 'poignée'},
    ]},
  }, 'https://images.unsplash.com/photo-1611270629569-8b357cb88da9?w=800');

  await createRecipe({
    titre: "Pad thaï d'Eat Pray Love",
    instructions: "1. Faire tremper les nouilles de riz 15 min dans l'eau tiède.\n2. Faire sauter les crevettes dans l'huile avec l'ail et le gingembre.\n3. Ajouter les nouilles égouttées, la sauce soja et le jus de citron.\n4. Mélanger vigoureusement, ajouter les oeufs brouillés.\n5. Servir avec des cacahuètes concassées et de la ciboulette.",
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catPlat.id, mediaId: medias[38167].id,
    ingredients: { create: [
      { ingredientId: ing('nouille de riz').id, quantity: '300', unit: 'g'     },
      { ingredientId: ing('crevette').id,       quantity: '300', unit: 'g'     },
      { ingredientId: ing('sauce soja').id,     quantity: '4',   unit: 'c.à.s' },
      { ingredientId: ing('citron').id,         quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('oeuf').id,           quantity: '2',   unit: 'pièces'},
      { ingredientId: ing('gingembre').id,      quantity: '3',   unit: 'cm'    },
    ]},
  }, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800');

  // ════════════════════════════════════════════════════
  // DESSERTS — 12 recettes
  // ════════════════════════════════════════════════════
  console.log('\n🍰 Desserts...');

  await createRecipe({
    titre: 'Crème brûlée de Babette',
    instructions: "1. Fouetter 5 jaunes d'oeufs avec 80g de sucre jusqu'au ruban.\n2. Chauffer la crème avec la vanille et verser doucement sur les oeufs.\n3. Filtrer et répartir dans des ramequins.\n4. Cuire au bain-marie 45 min à 150°C.\n5. Réfrigérer 3h minimum, saupoudrer de sucre et caraméliser au chalumeau.",
    nombrePersonnes: 4, tempsPreparation: 20, tempsCuisson: 45,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('creme fraiche').id,      quantity: '50',  unit: 'cl'     },
      { ingredientId: ing('oeuf').id,               quantity: '5',   unit: 'jaunes' },
      { ingredientId: ing('sucre').id,              quantity: '120', unit: 'g'      },
      { ingredientId: ing('extrait de vanille').id, quantity: '1',   unit: 'gousse' },
    ]},
  }, 'https://images.unsplash.com/photo-1676300184943-09b2a08319a3?w=800');

  await createRecipe({
    titre: 'Mousse au chocolat de Ratatouille',
    instructions: "1. Faire fondre le chocolat au bain-marie avec le beurre, laisser tiédir.\n2. Incorporer les jaunes d'oeufs un par un.\n3. Monter les blancs en neige très ferme avec une pincée de sel.\n4. Incorporer 1/3 des blancs énergiquement puis le reste délicatement.\n5. Réfrigérer minimum 2h avant de servir.",
    nombrePersonnes: 6, tempsPreparation: 25, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('chocolat noir 70%').id, quantity: '200', unit: 'g'     },
      { ingredientId: ing('beurre').id,            quantity: '40',  unit: 'g'     },
      { ingredientId: ing('oeuf').id,              quantity: '6',   unit: 'pièces'},
      { ingredientId: ing('sucre').id,             quantity: '30',  unit: 'g'     },
    ]},
  }, 'https://images.unsplash.com/photo-1673551494277-92204546b504?w=800');

  await createRecipe({
    titre: 'Tarte aux pommes normande de Julie Child',
    instructions: "1. Préparer la pâte brisée : sabler farine et beurre, ajouter oeuf et eau froide.\n2. Foncer un moule à tarte, piquer le fond et précuire 10 min à blanc.\n3. Peler et émincer les pommes en fines lamelles.\n4. Les disposer en rosace, saupoudrer de sucre et cannelle.\n5. Cuire 35 min à 180°C jusqu'à belle dorure.",
    nombrePersonnes: 6, tempsPreparation: 30, tempsCuisson: 45,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('pomme').id,    quantity: '6',   unit: 'pièces'},
      { ingredientId: ing('farine').id,   quantity: '250', unit: 'g'     },
      { ingredientId: ing('beurre').id,   quantity: '125', unit: 'g'     },
      { ingredientId: ing('sucre').id,    quantity: '80',  unit: 'g'     },
      { ingredientId: ing('cannelle').id, quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('oeuf').id,     quantity: '1',   unit: 'pièce' },
    ]},
  }, 'https://images.unsplash.com/photo-1562007908-17c67e878c88?w=800');

  await createRecipe({
    titre: 'Fondant au chocolat coulant de Breaking Bad',
    instructions: "1. Faire fondre chocolat et beurre au bain-marie.\n2. Fouetter oeufs et sucre jusqu'au ruban.\n3. Incorporer la préparation chocolatée puis la farine tamisée.\n4. Beurrer et fariner des moules individuels, verser la pâte.\n5. Cuire exactement 10-12 min à 200°C — le coeur doit rester coulant.",
    nombrePersonnes: 6, tempsPreparation: 15, tempsCuisson: 12,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('chocolat noir 70%').id, quantity: '200', unit: 'g'     },
      { ingredientId: ing('beurre').id,            quantity: '150', unit: 'g'     },
      { ingredientId: ing('sucre').id,             quantity: '150', unit: 'g'     },
      { ingredientId: ing('farine').id,            quantity: '60',  unit: 'g'     },
      { ingredientId: ing('oeuf').id,              quantity: '4',   unit: 'pièces'},
    ]},
  }, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800');

  await createRecipe({
    titre: 'Profiteroles de Soul Kitchen',
    instructions: "1. Préparer la pâte à choux : bouillir eau, beurre, sel, incorporer farine, dessécher, ajouter les oeufs.\n2. Dresser des petites boules à la poche, cuire 20 min à 180°C.\n3. Préparer une ganache : verser crème chaude sur le chocolat, émulsionner.\n4. Garnir les choux de glace vanille et napper de ganache chaude.",
    nombrePersonnes: 6, tempsPreparation: 30, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,            quantity: '125', unit: 'g'     },
      { ingredientId: ing('beurre').id,            quantity: '100', unit: 'g'     },
      { ingredientId: ing('oeuf').id,              quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('chocolat noir 70%').id, quantity: '150', unit: 'g'     },
      { ingredientId: ing('creme fraiche').id,     quantity: '15',  unit: 'cl'    },
    ]},
  }, 'https://images.unsplash.com/photo-1761637588199-ecd32fea8325?w=800');

  await createRecipe({
    titre: 'Tiramisu du Bear',
    instructions: "1. Séparer les oeufs. Fouetter jaunes et sucre jusqu'au ruban.\n2. Incorporer le mascarpone en 3 fois, puis les blancs montés en neige.\n3. Tremper rapidement les biscuits dans le café froid.\n4. Alterner couches de crème et biscuits (2 fois).\n5. Réfrigérer 6h minimum. Saupoudrer de cacao avant de servir.",
    nombrePersonnes: 8, tempsPreparation: 30, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('mascarpone').id,        quantity: '500', unit: 'g'     },
      { ingredientId: ing('oeuf').id,              quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('sucre').id,             quantity: '100', unit: 'g'     },
      { ingredientId: ing('cafe').id,              quantity: '30',  unit: 'cl'    },
      { ingredientId: ing('chocolat noir 70%').id, quantity: '30',  unit: 'g'     },
    ]},
  }, 'https://images.unsplash.com/photo-1766232333746-b0a2697d6d0d?w=800');

  await createRecipe({
    titre: 'Banoffee Pie de Pulp Fiction',
    instructions: "1. Écraser les biscuits et mélanger avec le beurre fondu, tasser dans un moule.\n2. Faire un caramel avec sucre et beurre, incorporer la crème — laisser épaissir.\n3. Verser le caramel sur la base biscuitée, réfrigérer 30 min.\n4. Recouvrir de chantilly et râper du chocolat noir dessus.",
    nombrePersonnes: 8, tempsPreparation: 25, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('creme fraiche').id,     quantity: '30',  unit: 'cl'  },
      { ingredientId: ing('beurre').id,            quantity: '100', unit: 'g'   },
      { ingredientId: ing('sucre').id,             quantity: '150', unit: 'g'   },
      { ingredientId: ing('chocolat noir 70%').id, quantity: '50',  unit: 'g'   },
    ]},
  }, 'https://images.unsplash.com/photo-1660485039650-eb9b3896c62c?w=800');

  await createRecipe({
    titre: 'Lembas du Comté (shortbread aux amandes)',
    instructions: "1. Mélanger farine, sucre glace et amandes en poudre.\n2. Incorporer le beurre froid en morceaux et sabler.\n3. Ajouter miel et extrait de vanille, former une boule.\n4. Étaler à 1cm, couper en carrés et marquer une croix.\n5. Cuire 18-20 min à 175°C — dorés mais pas trop cuits.",
    nombrePersonnes: 12, tempsPreparation: 20, tempsCuisson: 20,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,             quantity: '250', unit: 'g'    },
      { ingredientId: ing('beurre').id,             quantity: '150', unit: 'g'    },
      { ingredientId: ing('sucre').id,              quantity: '80',  unit: 'g'    },
      { ingredientId: ing('amande').id,             quantity: '100', unit: 'g'    },
      { ingredientId: ing('miel').id,               quantity: '2',   unit: 'c.à.s'},
      { ingredientId: ing('extrait de vanille').id, quantity: '1',   unit: 'c.à.c'},
    ]},
  }, 'https://images.unsplash.com/photo-1703249180507-4e68999f7760?w=800');

  await createRecipe({
    titre: 'Panna cotta chocolat du Joker',
    instructions: "1. Faire tremper la gélatine dans l'eau froide.\n2. Chauffer crème, lait, sucre et chocolat en morceaux — remuer jusqu'à fonte.\n3. Hors du feu, incorporer la gélatine essorée.\n4. Verser dans des ramequins et réfrigérer minimum 4h.\n5. Démouler sur assiette et décorer d'un coulis de framboise.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('creme fraiche').id,     quantity: '40',  unit: 'cl'},
      { ingredientId: ing('lait entier').id,       quantity: '10',  unit: 'cl'},
      { ingredientId: ing('chocolat noir 70%').id, quantity: '120', unit: 'g' },
      { ingredientId: ing('sucre').id,             quantity: '50',  unit: 'g' },
      { ingredientId: ing('framboise').id,         quantity: '100', unit: 'g' },
    ]},
  }, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800');

  await createRecipe({
    titre: 'Madeleines au citron de Julie Child',
    instructions: "1. Fouetter oeufs et sucre 5 min jusqu'au ruban.\n2. Incorporer farine, levure, zeste de citron et beurre fondu.\n3. Laisser reposer la pâte 1h au réfrigérateur — c'est le secret de la bosse.\n4. Beurrer les moules à madeleines, remplir aux 3/4.\n5. Cuire 12 min à 200°C — sortir dès que les bords sont dorés.",
    nombrePersonnes: 12, tempsPreparation: 20, tempsCuisson: 12,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,          quantity: '200', unit: 'g'     },
      { ingredientId: ing('beurre').id,          quantity: '150', unit: 'g'     },
      { ingredientId: ing('sucre').id,           quantity: '150', unit: 'g'     },
      { ingredientId: ing('oeuf').id,            quantity: '3',   unit: 'pièces'},
      { ingredientId: ing('levure chimique').id, quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('citron').id,          quantity: '1',   unit: 'zeste' },
    ]},
  }, 'https://images.unsplash.com/photo-1631978931011-a033b99bce1e?w=800');

  await createRecipe({
    titre: 'Cheesecake de Friends',
    instructions: "1. Écraser les biscuits, mélanger avec le beurre fondu, tasser au fond du moule.\n2. Fouetter la ricotta avec le mascarpone, le sucre et les oeufs.\n3. Ajouter l'extrait de vanille et le jus de citron.\n4. Verser sur la base biscuitée.\n5. Cuire 50 min à 160°C. Laisser refroidir lentement dans le four éteint.",
    nombrePersonnes: 8, tempsPreparation: 25, tempsCuisson: 50,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catDessert.id, mediaId: medias[1668].id,
    ingredients: { create: [
      { ingredientId: ing('ricotta').id,           quantity: '400', unit: 'g'     },
      { ingredientId: ing('mascarpone').id,        quantity: '200', unit: 'g'     },
      { ingredientId: ing('sucre').id,             quantity: '150', unit: 'g'     },
      { ingredientId: ing('oeuf').id,              quantity: '3',   unit: 'pièces'},
      { ingredientId: ing('extrait de vanille').id,quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('beurre').id,            quantity: '80',  unit: 'g'     },
    ]},
  }, 'https://images.unsplash.com/photo-1578775887804-699de7086ff9?w=800');

  await createRecipe({
    titre: 'Choux à la crème de Poudlard',
    instructions: "1. Préparer la pâte à choux : porter eau, beurre et sel à ébullition.\n2. Incorporer la farine d'un coup, dessécher 2 min en remuant.\n3. Ajouter les oeufs un par un hors du feu.\n4. Dresser en boules et cuire 25 min à 180°C sans ouvrir le four.\n5. Garnir de crème pâtissière et saupoudrer de sucre glace.",
    nombrePersonnes: 8, tempsPreparation: 30, tempsCuisson: 25,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[671].id,
    ingredients: { create: [
      { ingredientId: ing('farine').id,             quantity: '150', unit: 'g'     },
      { ingredientId: ing('beurre').id,             quantity: '100', unit: 'g'     },
      { ingredientId: ing('oeuf').id,               quantity: '4',   unit: 'pièces'},
      { ingredientId: ing('lait entier').id,        quantity: '50',  unit: 'cl'    },
      { ingredientId: ing('sucre').id,              quantity: '100', unit: 'g'     },
      { ingredientId: ing('extrait de vanille').id, quantity: '1',   unit: 'c.à.c' },
    ]},
  }, 'https://images.unsplash.com/photo-1643311927292-46c6478ad4e8?w=800');

  // ════════════════════════════════════════════════════
  // BOISSONS — 12 recettes
  // ════════════════════════════════════════════════════
  console.log('\n🥤 Boissons...');

  await createRecipe({
    titre: 'Chocolat chaud épicé de Vianne',
    instructions: "1. Casser le chocolat en petits morceaux.\n2. Chauffer le lait à feu moyen sans laisser bouillir.\n3. Hors du feu, incorporer le chocolat en fouettant jusqu'à fonte complète.\n4. Ajouter cannelle, piment de Cayenne et sucre selon goût.\n5. Remettre à feu doux et fouetter vigoureusement pour faire mousser. Servir chaud.",
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 10,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[392].id,
    ingredients: { create: [
      { ingredientId: ing('lait entier').id,       quantity: '500', unit: 'ml'    },
      { ingredientId: ing('chocolat noir 70%').id, quantity: '100', unit: 'g'     },
      { ingredientId: ing('cannelle').id,          quantity: '1',   unit: 'c.à.c' },
      { ingredientId: ing('piment de cayenne').id, quantity: '1',   unit: 'pincée'},
      { ingredientId: ing('sucre').id,             quantity: '2',   unit: 'c.à.s' },
    ]},
  }, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800');

  await createRecipe({
    titre: 'Pour-over café de The Bear',
    instructions: "1. Moudre 20g de café à mouture moyenne-fine.\n2. Chauffer l'eau à exactement 93°C.\n3. Rincer le filtre, verser le café, faire un 'bloom' : verser 40ml d'eau, attendre 30s.\n4. Verser le reste de l'eau en cercles réguliers sur 3-4 min.\n5. Déguster noir.",
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[136315].id,
    ingredients: { create: [
      { ingredientId: ing('cafe').id, quantity: '20', unit: 'g' },
    ]},
  }, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800');

  await createRecipe({
    titre: 'Milkshake fraise de Pulp Fiction',
    instructions: "1. Laver et équeuter les fraises fraîches.\n2. Mixer fraises, lait entier froid et sirop de grenadine à pleine puissance.\n3. Ajouter 2-3 boules de glace vanille, mixer à nouveau rapidement.\n4. Verser dans un grand verre givré, garnir de chantilly et d'une fraise entière.",
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[680].id,
    ingredients: { create: [
      { ingredientId: ing('lait entier').id,       quantity: '200', unit: 'ml'   },
      { ingredientId: ing('fraise').id,            quantity: '150', unit: 'g'    },
      { ingredientId: ing('sirop de grenadine').id,quantity: '2',   unit: 'c.à.s'},
      { ingredientId: ing('creme fraiche').id,     quantity: '10',  unit: 'cl'   },
    ]},
  }, 'https://images.unsplash.com/photo-1711546911972-45c534fe5b1f?w=800');

  await createRecipe({
    titre: "Thé de l'Après-midi au Comté",
    instructions: "1. Porter l'eau à 90°C (ne pas faire bouillir).\n2. Préchauffer la théière avec un peu d'eau chaude puis vider.\n3. Mettre 1 cuillère à café de thé par tasse, infuser exactement 3 min.\n4. Filtrer dans des tasses, ajouter miel et une tranche de citron.\n5. Servir avec des biscuits sablés.",
    nombrePersonnes: 4, tempsPreparation: 5, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[120].id,
    ingredients: { create: [
      { ingredientId: ing('the').id,   quantity: '4', unit: 'c.à.c' },
      { ingredientId: ing('miel').id,  quantity: '2', unit: 'c.à.s' },
      { ingredientId: ing('citron').id,quantity: '1', unit: 'pièce' },
    ]},
  }, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800');

  await createRecipe({
    titre: 'Mojito de Soul Kitchen',
    instructions: "1. Déposer les feuilles de menthe et le sucre dans un verre.\n2. Presser le citron vert, verser le jus et piler doucement.\n3. Remplir le verre de glace pilée.\n4. Verser le rhum blanc, compléter d'eau gazeuse très froide.\n5. Mélanger délicatement et garnir d'un brin de menthe.",
    nombrePersonnes: 1, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[31175].id,
    ingredients: { create: [
      { ingredientId: ing('rhum').id,        quantity: '5',  unit: 'cl'     },
      { ingredientId: ing('citron').id,      quantity: '1',  unit: 'pièce'  },
      { ingredientId: ing('sucre').id,       quantity: '2',  unit: 'c.à.c'  },
      { ingredientId: ing('eau gazeuse').id, quantity: '10', unit: 'cl'     },
      { ingredientId: ing('menthe').id,      quantity: '10', unit: 'feuilles'},
    ]},
  }, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800');

  await createRecipe({
    titre: 'Whisky Sour de Breaking Bad',
    instructions: "1. Verser whisky, jus de citron, sucre et blanc d'oeuf dans un shaker.\n2. Shaker sans glace 15 sec (dry shake).\n3. Ajouter des glaçons et reshaker vigoureusement 15 sec.\n4. Double-filtrer dans un verre à cocktail refroidi.\n5. Décorer d'un zeste de citron.",
    nombrePersonnes: 1, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[1396].id,
    ingredients: { create: [
      { ingredientId: ing('whisky').id,      quantity: '5', unit: 'cl'   },
      { ingredientId: ing('jus de citron').id,quantity: '2', unit: 'cl'  },
      { ingredientId: ing('sucre').id,       quantity: '1', unit: 'c.à.c'},
      { ingredientId: ing('oeuf').id,        quantity: '1', unit: 'blanc' },
    ]},
  }, 'https://images.unsplash.com/photo-1713720441159-466472b29b54?w=800');

  await createRecipe({
    titre: 'Champagne rosé du Festin de Babette',
    instructions: "1. Réfrigérer la bouteille 3h minimum.\n2. Ouvrir délicatement sans faire sauter le bouchon.\n3. Incliner légèrement les flûtes pour verser doucement.\n4. Déposer une framboise fraîche dans chaque flûte.\n5. Servir immédiatement, très froid.",
    nombrePersonnes: 6, tempsPreparation: 2, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[11832].id,
    ingredients: { create: [
      { ingredientId: ing('champagne').id, quantity: '75', unit: 'cl'    },
      { ingredientId: ing('framboise').id, quantity: '12', unit: 'pièces'},
    ]},
  }, 'https://images.unsplash.com/photo-1659729683174-84f48ad87a94?w=800');

  await createRecipe({
    titre: 'Limonade du Joker',
    instructions: "1. Presser tous les citrons, récupérer le jus.\n2. Préparer un sirop : chauffer 100ml d'eau avec le sucre.\n3. Mélanger jus de citron et sirop dans un pichet.\n4. Compléter d'eau gazeuse très froide, ajouter des glaçons.\n5. Décorer de tranches de citron et feuilles de menthe.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[475557].id,
    ingredients: { create: [
      { ingredientId: ing('citron').id,      quantity: '6',   unit: 'pièces'},
      { ingredientId: ing('sucre').id,       quantity: '100', unit: 'g'     },
      { ingredientId: ing('eau gazeuse').id, quantity: '1',   unit: 'litre' },
    ]},
  }, 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800');

  await createRecipe({
    titre: 'Kir champêtre de Ratatouille',
    instructions: "1. Placer les verres à vin au congélateur 10 min pour les givrer légèrement.\n2. Verser environ 1 c.à.s de sirop de grenadine au fond de chaque verre.\n3. Verser délicatement le vin blanc bien frais en inclinant le verre.\n4. Servir avec des gougères.",
    nombrePersonnes: 4, tempsPreparation: 2, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('vin blanc').id,         quantity: '75', unit: 'cl'   },
      { ingredientId: ing('sirop de grenadine').id,quantity: '4',  unit: 'c.à.s'},
    ]},
  }, 'https://images.unsplash.com/photo-1567759131595-5e952a1b9a4e?w=800');

  await createRecipe({
    titre: 'Smoothie vert détox de Julie Child',
    instructions: "1. Éplucher et vider la pomme, peler et trancher le gingembre.\n2. Presser le citron.\n3. Tout mettre dans le blender avec 150ml d'eau froide.\n4. Mixer à pleine puissance 1 min.\n5. Goûter et ajuster avec le miel si trop acide. Servir immédiatement.",
    nombrePersonnes: 2, tempsPreparation: 5, tempsCuisson: 0,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[24094].id,
    ingredients: { create: [
      { ingredientId: ing('pomme').id,    quantity: '2', unit: 'pièces'},
      { ingredientId: ing('citron').id,   quantity: '1', unit: 'pièce' },
      { ingredientId: ing('gingembre').id,quantity: '3', unit: 'cm'    },
      { ingredientId: ing('miel').id,     quantity: '1', unit: 'c.à.s' },
    ]},
  }, 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800');

  await createRecipe({
    titre: 'Bièraubeurre de Poudlard',
    instructions: "1. Chauffer la bière doucement sans la faire bouillir.\n2. Faire fondre le beurre avec le sucre et la cannelle.\n3. Verser le mélange beurre-sucre dans la bière chaude en fouettant.\n4. Ajouter l'extrait de vanille et remuer.\n5. Servir dans des chopes avec une mousse de crème fraîche fouettée.",
    nombrePersonnes: 4, tempsPreparation: 10, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userRemy.id, categoryId: catBoisson.id, mediaId: medias[671].id,
    ingredients: { create: [
      { ingredientId: ing('biere').id,              quantity: '1',  unit: 'litre' },
      { ingredientId: ing('beurre').id,             quantity: '30', unit: 'g'     },
      { ingredientId: ing('sucre').id,              quantity: '50', unit: 'g'     },
      { ingredientId: ing('cannelle').id,           quantity: '1',  unit: 'c.à.c' },
      { ingredientId: ing('extrait de vanille').id, quantity: '1',  unit: 'c.à.c' },
    ]},
  }, 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800');

  await createRecipe({
    titre: 'Café du Central Perk',
    instructions: "1. Préparer un café filtre bien corsé.\n2. Faire chauffer le lait sans le faire bouillir.\n3. Verser le café dans une grande tasse.\n4. Ajouter le lait chaud moussé et le sucre.\n5. Saupoudrer de cannelle et servir avec un cookie.",
    nombrePersonnes: 1, tempsPreparation: 5, tempsCuisson: 5,
    status: 'PUBLISHED', userId: userMarie.id, categoryId: catBoisson.id, mediaId: medias[1668].id,
    ingredients: { create: [
      { ingredientId: ing('cafe').id,      quantity: '15', unit: 'g'    },
      { ingredientId: ing('lait entier').id,quantity: '15', unit: 'cl'  },
      { ingredientId: ing('sucre').id,     quantity: '2',  unit: 'c.à.c'},
      { ingredientId: ing('cannelle').id,  quantity: '1',  unit: 'pincée'},
    ]},
  }, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800');

  // ── Recettes PENDING / DRAFT ───────────────────────
  console.log('\n📋 Recettes PENDING / DRAFT...');

  await createRecipe({
    titre: 'Soupe exotique',
    instructions: "1. Couper mangue et papaye.\n2. Mixer avec lait de coco et citron vert.\n3. Servir frais avec feuilles de menthe.",
    nombrePersonnes: 4, tempsPreparation: 15, tempsCuisson: 0,
    status: 'PENDING', userId: userMarie.id, categoryId: catEntree.id, mediaId: medias[2062].id,
    ingredients: { create: [
      { ingredientId: ing('mangue').id,      quantity: '1',  unit: 'pièce' },
      { ingredientId: ing('lait entier').id, quantity: '20', unit: 'cl'    },
      { ingredientId: ing('citron').id,      quantity: '1',  unit: 'pièce' },
    ]},
  }, 'https://images.unsplash.com/photo-1605909388460-74ec8b204127?w=800');

  await createRecipe({
    titre: 'Dessert chocolaté',
    instructions: "1. Mélanger chocolat fondu et lait.\n2. Ajouter sucre et oeufs.\n3. Verser dans moules et réfrigérer.",
    nombrePersonnes: 2, tempsPreparation: 10, tempsCuisson: 0,
    status: 'DRAFT', userId: userRemy.id, categoryId: catDessert.id, mediaId: medias[392].id,
    // @ts-ignore — rejectionReason est un champ valide sur Recipe
    rejectionReason: 'La recette est incomplète, il manque la cuisson exacte.',
    ingredients: { create: [
      { ingredientId: ing('chocolat noir 70%').id, quantity: '100', unit: 'g'     },
      { ingredientId: ing('lait entier').id,       quantity: '50',  unit: 'cl'    },
      { ingredientId: ing('oeuf').id,              quantity: '2',   unit: 'pièces'},
    ]},
  }, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800');

  // ── Résumé ─────────────────────────────────────────
  const [nEntree, nPlat, nDessert, nBoisson, nTotal] = await Promise.all([
    prisma.recipe.count({ where: { categoryId: catEntree.id } }),
    prisma.recipe.count({ where: { categoryId: catPlat.id } }),
    prisma.recipe.count({ where: { categoryId: catDessert.id } }),
    prisma.recipe.count({ where: { categoryId: catBoisson.id } }),
    prisma.recipe.count(),
  ]);

  console.log('\n\n🎬 Seed v4 terminé !\n');
  console.log('──────────────────────────────────────────────────────');
  console.log(`  Entrées  : ${nEntree}  recettes`);
  console.log(`  Plats    : ${nPlat}  recettes`);
  console.log(`  Desserts : ${nDessert} recettes`);
  console.log(`  Boissons : ${nBoisson} recettes`);
  console.log(`  TOTAL    : ${nTotal} recettes`);
  console.log('──────────────────────────────────────────────────────');
  console.log('  Médias   : 16 (films + séries) — posters WebP locaux');
  console.log('  Images   : recettes converties en WebP via Sharp');
  console.log('──────────────────────────────────────────────────────');
  console.log('  ADMINS   :');
  console.log('    admin@cinesdelices.fr          / Admin1234!');
  console.log('    sophie.martin@cinesdelices.fr  / Admin1234!');
  console.log('    luca.bernard@cinesdelices.fr   / Admin1234!');
  console.log('  MEMBRES actifs :');
  console.log('    marie@cinesdelices.fr          / Member1234!');
  console.log('    remy@cinesdelices.fr           / Member1234!');
  console.log('  MEMBRES sans recettes :');
  console.log('    clara.dupont@mail.fr           / Member1234!');
  console.log('    theo.rousseau@mail.fr          / Member1234!');
  console.log('    ines.lefevre@mail.fr           / Member1234!');
  console.log('    hugo.moreau@mail.fr            / Member1234!');
  console.log('    camille.simon@mail.fr          / Member1234!');
  console.log('    noemie.gerard@mail.fr          / Member1234!');
  console.log('    maxime.petit@mail.fr           / Member1234!');
  console.log('    lea.fontaine@mail.fr           / Member1234!');
  console.log('──────────────────────────────────────────────────────\n');
}

main()
  .catch(e => { console.error('❌ Erreur seed :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
