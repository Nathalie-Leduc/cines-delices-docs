import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/responseHelper.js';
import { generateUniqueSlug } from '../utils/slug.js';
import { downloadAndConvertPoster } from '../lib/posterService.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────────
// normalizeIngredientName — force le singulier + minuscule + trim
//
// Problème résolu : "citrons" et "citron" coexistaient en BDD
// comme deux ingrédients distincts alors qu'ils sont identiques.
//
// Règle : on retire le 's' final si le mot fait plus de 3 lettres
// et n'est pas dans la liste d'exceptions (mots naturellement en 's').
//
// Analogie : le carnet de recettes n'accepte qu'une orthographe
// par ingrédient — "citron" uniquement, jamais "Citrons".
//
// Exemples :
//   "Citrons"    → "citron"
//   "tomates"    → "tomate"
//   "oeufs"      → "oeuf"
//   "riz"        → "riz"     (exception, déjà singulier)
//   "noix"       → "noix"    (exception)
//   "ananas"     → "ananas"  (exception)
// ─────────────────────────────────────────────────────────────
function normalizeIngredientName(name) {
  const str = String(name || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const exceptions = new Set([
    'riz', 'noix', 'ananas', 'brocolis', 'radis', 'mais', 'pois',
    'fois', 'buis', 'tapas', 'papas', 'colis',
  ]);

  if (exceptions.has(str)) return str;

  // Retire le 's' final uniquement (pas 'x' ni 'z' — trop risqué)
  if (str.endsWith('s') && str.length > 3) {
    return str.slice(0, -1);
  }

  return str;
}

function buildRecipeLookupWhere(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  const orConditions = [{ slug: normalizedIdentifier }];

  if (UUID_REGEX.test(normalizedIdentifier)) {
    orConditions.unshift({ id: normalizedIdentifier });
  }

  return { OR: orConditions };
}

async function findRecipeByIdOrSlug(identifier, options = {}) {
  return prisma.recipe.findFirst({
    where: buildRecipeLookupWhere(identifier),
    ...options,
  });
}

function canManageRecipe(user, recipe) {
  if (!user || !recipe) {
    return false;
  }

  return user.role === 'ADMIN' || user.id === recipe.userId;
}

const recipeRelationsInclude = {
  category: true,
  media: true,
  ingredients: {
    include: {
      ingredient: true,
    },
  },
};

// ─────────────────────────────────────────────────────────
// resolveMediaFromTmdb — Résout ou crée un média depuis TMDB
// ─────────────────────────────────────────────────────────
async function resolveMediaFromTmdb({ tmdbId, title, mediaType }) {
  const tmdbType = mediaType === 'SERIES' ? 'tv' : 'movie';

  const existingMedia = await prisma.media.findUnique({
    where: {
      tmdbId_type: {
        tmdbId,
        type: mediaType,
      },
    },
  });

  if (existingMedia) {
    return existingMedia.id;
  }

  let tmdbData = null;
  try {
    const tmdbUrl = `${process.env.TMDB_BASE_URL}/${tmdbType}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=fr-FR&append_to_response=credits`;
    const response = await fetch(tmdbUrl);

    if (response.ok) {
      tmdbData = await response.json();
    } else {
      console.warn(`[TMDB] Impossible de récupérer le média ${tmdbId} (HTTP ${response.status})`);
    }
  } catch (error) {
    console.warn('[TMDB] Erreur appel API :', error.message);
  }

  const finalTitle = title || tmdbData?.title || tmdbData?.name || 'Sans titre';
  const synopsis = tmdbData?.overview || null;

  let realisateur = null;
  if (tmdbData) {
    const people = mediaType === 'MOVIE'
      ? (tmdbData.credits?.crew || [])
          .filter((person) => person.job === 'Director')
          .map((person) => person.name)
      : (tmdbData.created_by || [])
          .map((person) => person.name)
          .filter(Boolean);

    realisateur = people.length > 0 ? people.join(', ') : null;
  }

  const releaseYear = Number.parseInt(
    String(tmdbData?.release_date || tmdbData?.first_air_date || '').slice(0, 4),
    10,
  );

  const tmdbPosterUrl = tmdbData?.poster_path
    ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
    : null;
  const localPosterUrl = tmdbPosterUrl
    ? await downloadAndConvertPoster(tmdbPosterUrl)
    : null;

  const mediaSlug = await generateUniqueSlug(
    `${finalTitle}-${Number.isInteger(releaseYear) ? releaseYear : new Date().getFullYear()}`,
    (s) => prisma.media.findUnique({ where: { slug: s } }),
  );

  const createdMedia = await prisma.media.create({
    data: {
      tmdbId,
      titre: finalTitle,
      slug: mediaSlug,
      type: mediaType,
      posterUrl: localPosterUrl || tmdbPosterUrl,
      synopsis,
      annee: Number.isInteger(releaseYear) ? releaseYear : null,
      realisateur,
    },
  });

  return createdMedia.id;
}

/**
 * Crée une nouvelle recette
 * POST /api/recipes
 */
/**
 * Crée une nouvelle recette
 * POST /api/recipes
 *
 * ✅ NOUVEAU comportement avec rétablissement du brouillon :
 *   - Si submitForReview === true  → recette créée en PENDING (envoyée
 *     directement en modération admin + notification admin déclenchée)
 *   - Si submitForReview === false → recette créée en DRAFT (brouillon
 *     personnel, pas de notification admin, pas visible en modération)
 *   - Par défaut (champ absent) → DRAFT (on n'envoie en modération que
 *     si l'utilisateur l'a explicitement demandé via le bouton).
 *
 * Analogie 🍽️ : c'est comme la salle d'un restaurant. Le cuisinier
 * (membre) prépare son plat dans sa cuisine privée (DRAFT) puis décide
 * lui-même s'il veut le mettre à la carte (soumettre → PENDING).
 */
export const createRecipe = async (req, res) => {
  try {
    const {
      titre,
      instructions,
      etapes,
      categoryId: rawCategoryId,
      categorie,
      mediaId: rawMediaId,
      filmId,
      film,
      type,
      imageUrl,
      nombrePersonnes,
      nbPersonnes,
      tempsPreparation,
      tempsCuisson,
      ingredients,
      submitForReview,                                     // ✅ NOUVEAU
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const mergedSteps = Array.isArray(etapes)
      ? etapes.map((step) => String(step || '').trim()).filter(Boolean)
      : [];
    const normalizedInstructions = String(instructions || '').trim() || mergedSteps.join('\n');

    let categoryId = rawCategoryId;

    let category = null;
    if (categoryId) {
      category = await prisma.category.findUnique({ where: { id: categoryId } });
    } else if (categorie) {
      const normalizedCategoryName = String(categorie).trim();

      category = await prisma.category.findFirst({
        where: {
          nom: {
            equals: normalizedCategoryName,
            mode: 'insensitive',
          },
        },
      });

      if (!category && normalizedCategoryName) {
        category = await prisma.category.create({
          data: {
            nom: normalizedCategoryName,
          },
        });
      }

      categoryId = category?.id;
    }

    if (!category) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }

    let mediaId = rawMediaId;

    if (mediaId) {
      const existingMedia = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!existingMedia) {
        return res.status(404).json({ message: 'Média introuvable' });
      }
    } else {
      const tmdbId = Number(filmId);
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return res.status(400).json({ message: 'Média invalide. Sélectionne un film/série depuis la recherche.' });
      }

      const normalizedTitle = String(film || '').trim();
      if (!normalizedTitle) {
        return res.status(400).json({ message: 'Titre du média manquant.' });
      }

      const normalizedType = String(type || '').toLowerCase();
      const mediaType = (normalizedType === 's' || normalizedType === 'tv' || normalizedType === 'series')
        ? 'SERIES'
        : 'MOVIE';

      mediaId = await resolveMediaFromTmdb({
        tmdbId,
        title: normalizedTitle,
        mediaType,
      });
    }

    if (normalizedInstructions.length < 1) {
      return res.status(400).json({ message: 'Les instructions sont obligatoires.' });
    }

    // ✅ Validation des ingrédients côté back
    // Le front valide déjà, mais on vérifie ici aussi pour sécuriser
    // les appels directs à l'API (ex: via Postman ou un script).
    // Analogie 🍽️ : le serveur vérifie le bon de commande ET la cuisine
    // refuse de préparer un plat sans ingrédients listés.
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'Au moins un ingrédient est obligatoire.' });
    }

    const normalizedNombrePersonnes = nombrePersonnes ?? nbPersonnes;

    const recipeSlug = await generateUniqueSlug(
      titre,
      (s) => prisma.recipe.findUnique({ where: { slug: s } }),
    );

    // ✅ NOUVEAU — choix du statut initial selon le bouton cliqué côté front.
    // Par défaut DRAFT (sécurité : on n'envoie en modération que si demandé).
    // Analogie 🍽️ : "Enregistrer en brouillon" = je garde mon plat dans ma cuisine ;
    //               "Soumettre pour validation" = je l'envoie au chef-modérateur.
    const initialStatus = submitForReview === true ? 'PENDING' : 'DRAFT';

    const recipe = await prisma.recipe.create({
      data: {
        titre,
        slug: recipeSlug,
        imageURL: imageUrl || null,
        instructions: normalizedInstructions,
        userId,
        categoryId,
        mediaId,
        nombrePersonnes: normalizedNombrePersonnes,
        tempsPreparation,
        tempsCuisson,
        status: initialStatus,                             // ✅ NOUVEAU
      },
      include: recipeRelationsInclude,
    });

    const newlyCreatedIngredientNames = new Set();

    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        // ✅ CORRECTIF — normalizeIngredientName force le singulier + minuscule
        // AVANT : String(ing.nom || '').toLowerCase().trim() → "citrons" stocké tel quel
        // APRÈS : normalizeIngredientName(ing.nom) → "citrons" devient "citron"
        const ingredientName = normalizeIngredientName(ing.nom);
        const quantity = ing.quantity ?? ing.quantite ?? null;
        const unit = ing.unit ?? ing.unite ?? null;

        if (!ingredientName) {
          continue;
        }

        let ingredient = await prisma.ingredient.findUnique({
          where: { nom: ingredientName },
        });

        if (!ingredient) {
          ingredient = await prisma.ingredient.create({
            data: { nom: ingredientName },
          });
          newlyCreatedIngredientNames.add(ingredient.nom);
        }

        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: quantity !== null && quantity !== undefined ? String(quantity) : null,
            unit,
          },
        });
      }
    }

    // ✅ NOUVEAU — Les notifications admin sont envoyées UNIQUEMENT si la
    // recette part en modération (PENDING). Un brouillon (DRAFT) reste
    // privé : aucun admin n'est notifié tant que le membre n'a pas cliqué
    // sur "Soumettre" depuis "Mes recettes".
    // Note : les ingrédients nouvellement créés sont notifiés dans tous
    // les cas (le brouillon a quand même créé l'ingrédient en base, donc
    // l'admin doit pouvoir le modérer indépendamment de la recette).
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    if (adminUsers.length > 0) {
      const ingredientNotifications = Array.from(newlyCreatedIngredientNames).flatMap((ingredientName) =>
        adminUsers.map((admin) => ({
          type: 'RECIPE_SUBMITTED',
          message: `Nouvel ingrédient soumis: ${ingredientName}`,
          userId: admin.id,
          recipeId: recipe.id,
        }))
      );

      // Notification "recette soumise" UNIQUEMENT si la recette part en PENDING
      const recipeNotifications = initialStatus === 'PENDING'
        ? adminUsers.map((admin) => ({
            type: 'RECIPE_SUBMITTED',
            message: `Nouvelle recette soumise: ${titre}`,
            userId: admin.id,
            recipeId: recipe.id,
          }))
        : [];

      const allNotifications = [...recipeNotifications, ...ingredientNotifications];
      if (allNotifications.length > 0) {
        await prisma.notification.createMany({
          data: allNotifications,
        });
      }
    }

    // ✅ NOUVEAU — message de réponse adapté au statut
    const responseMessage = initialStatus === 'PENDING'
      ? 'Recette créée avec succès. Elle sera vérifiée par un administrateur.'
      : 'Recette enregistrée en brouillon. Vous pouvez la soumettre depuis "Mes recettes".';

    return res.status(201).json({
      message: responseMessage,
      recipe,
    });
  } catch (error) {
    console.error('[createRecipe]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création de la recette.' });
  }
};


/**
 * Récupère une recette par ID ou slug
 * GET /api/recipes/:id
 */
export const getRecipe = async (req, res) => {
  try {
    const { id } = req.params;

    const recipe = await findRecipeByIdOrSlug(id, {
      include: {
        ...recipeRelationsInclude,
        user: {
          select: {
            id: true,
            pseudo: true,
            email: true,
          },
        },
      },
    });

    if (!recipe) {
      return res.status(404).json({ message: 'Recette introuvable' });
    }

    return res.json(recipe);
  } catch (error) {
    console.error('[getRecipe]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération de la recette.' });
  }
};

/**
 * Récupère toutes les recettes de l'utilisateur connecté
 * GET /api/recipes/mine
 */
export const getMyRecipes = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  const recipes = await prisma.recipe.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: recipeRelationsInclude,
  });

  return res.json(recipes);
});

/**
 * Met à jour une recette
 * PATCH /api/recipes/:id
 *
 * CORRECTIF NOTIFICATION :
 * Avant : shouldNotifyAdminsAboutResubmission = shouldResubmit && status !== 'PENDING'
 *   → Si la recette est déjà PENDING (après une 1ère modif), la 2ème modif
 *     ne déclenche AUCUNE notification. L'admin ne sait pas que ça a changé.
 *
 * Après : on notifie à chaque modification d'une recette PENDING ou re-soumise,
 *   en faisant un UPSERT pour éviter les doublons :
 *   - Si une notif non lue existe déjà pour ce couple (admin, recette) → on la MET À JOUR
 *   - Sinon → on la CRÉE
 *
 * Analogie : au lieu d'empiler des post-its sur le bureau de l'admin,
 * on efface l'ancien et on en colle un nouveau à la même place,
 * avec la date et le message les plus récents.
 */
export const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre,
      instructions,
      etapes,
      categoryId: rawCategoryId,
      categorie,
      mediaId: rawMediaId,
      filmId,
      film,
      type,
      imageUrl,
      nombrePersonnes,
      nbPersonnes,
      tempsPreparation,
      tempsCuisson,
      ingredients,
    } = req.body;
    const user = req.user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const recipe = await findRecipeByIdOrSlug(id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recette introuvable' });
    }

    if (!canManageRecipe(user, recipe)) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette recette' });
    }

    const isAdminEditing = user.role === 'ADMIN';

    // La recette doit repasser en modération si un membre modifie une recette
    // qui est PUBLISHED, PENDING, ou qui a un motif de rejet.
    const shouldResubmitForModeration = !isAdminEditing && (
      recipe.status === 'PUBLISHED'
      || recipe.status === 'PENDING'
      || Boolean(recipe.rejectionReason)
    );

    // ✅ CORRECTIF — on notifie si la recette doit repasser en modération,
    // QUE la recette soit déjà PENDING ou non.
    // AVANT : && recipe.status !== 'PENDING'  → bloquait la 2ème notification
    // APRÈS : on notifie dans tous les cas où shouldResubmitForModeration est vrai
    const shouldNotifyAdminsAboutResubmission = shouldResubmitForModeration;

    const mergedSteps = Array.isArray(etapes)
      ? etapes.map((step) => String(step || '').trim()).filter(Boolean)
      : [];
    const normalizedInstructions = instructions !== undefined
      ? String(instructions || '').trim()
      : mergedSteps.join('\n');
    const normalizedNombrePersonnes = nombrePersonnes ?? nbPersonnes;

    let categoryId = rawCategoryId;

    if (categoryId || categorie !== undefined) {
      let category = null;

      if (categoryId) {
        category = await prisma.category.findUnique({ where: { id: categoryId } });
      } else {
        const normalizedCategoryName = String(categorie || '').trim();

        category = await prisma.category.findFirst({
          where: {
            nom: {
              equals: normalizedCategoryName,
              mode: 'insensitive',
            },
          },
        });

        if (!category && normalizedCategoryName) {
          category = await prisma.category.create({
            data: { nom: normalizedCategoryName },
          });
        }

        categoryId = category?.id;
      }

      if (!categoryId || !category) {
        return res.status(404).json({ message: 'Catégorie introuvable' });
      }
    }

    let mediaId = rawMediaId;

    if (mediaId) {
      const media = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!media) {
        return res.status(404).json({ message: 'Média introuvable' });
      }
    } else if (filmId !== undefined) {
      const tmdbId = Number(filmId);

      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return res.status(400).json({ message: 'Média invalide. Sélectionne un film/série depuis la recherche.' });
      }

      const normalizedTitle = String(film || '').trim();
      if (!normalizedTitle) {
        return res.status(400).json({ message: 'Titre du média manquant.' });
      }

      const normalizedType = String(type || '').toLowerCase();
      const mediaType = (normalizedType === 's' || normalizedType === 'tv' || normalizedType === 'series')
        ? 'SERIES'
        : 'MOVIE';

      mediaId = await resolveMediaFromTmdb({
        tmdbId,
        title: normalizedTitle,
        mediaType,
      });
    }

    const data = {};
    if (titre !== undefined) data.titre = titre;
    if (instructions !== undefined || Array.isArray(etapes)) data.instructions = normalizedInstructions;
    if (categoryId !== undefined) {
      data.category = {
        connect: { id: categoryId },
      };
    }
    if (mediaId !== undefined) {
      data.media = {
        connect: { id: mediaId },
      };
    }
    if (normalizedNombrePersonnes !== undefined) data.nombrePersonnes = normalizedNombrePersonnes;
    if (tempsPreparation !== undefined) data.tempsPreparation = tempsPreparation;
    if (tempsCuisson !== undefined) data.tempsCuisson = tempsCuisson;
    if (imageUrl !== undefined) data.imageURL = imageUrl || null;
    if (!isAdminEditing) {
      data.adminEditedSinceSubmission = false;
      data.adminEditedIngredientsSinceSubmission = false;
      data.adminEditedFieldsSummary = null;
    }
    if (shouldResubmitForModeration) {
      data.status = 'PENDING';
      data.rejectionReason = null;
    }

    const newlyCreatedIngredientNames = new Set();

    // Récupérer les admins avant la transaction (nécessaire pour l'upsert notif)
    let adminUsers = [];
    if (shouldNotifyAdminsAboutResubmission) {
      adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id: recipe.id },
        data,
      });

      if (ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });

        for (const ing of ingredients) {
          // ✅ CORRECTIF — normalizeIngredientName force le singulier + minuscule
          // AVANT : String(ing.nom || '').toLowerCase().trim() → "citrons" stocké tel quel
          // APRÈS : normalizeIngredientName(ing.nom) → "citrons" devient "citron"
          const ingredientName = normalizeIngredientName(ing.nom);

          if (!ingredientName) {
            continue;
          }

          const quantity = ing.quantity ?? ing.quantite ?? null;
          const unit = ing.unit ?? ing.unite ?? null;

          let ingredient = await tx.ingredient.findUnique({
            where: { nom: ingredientName },
          });

          if (!ingredient) {
            ingredient = await tx.ingredient.create({
              data: { nom: ingredientName },
            });
            newlyCreatedIngredientNames.add(ingredient.nom);
          }

          await tx.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              ingredientId: ingredient.id,
              quantity: quantity !== null && quantity !== undefined ? String(quantity) : null,
              unit,
            },
          });
        }
      }

      // ✅ CORRECTIF NOTIFICATION — upsert pour chaque admin :
      // Si une notif non lue existe déjà → mise à jour du message + date
      // Sinon → création d'une nouvelle notif
      // Résultat : l'admin ne voit jamais qu'une seule notif par recette,
      // toujours à jour avec la dernière modification.
      if (shouldNotifyAdminsAboutResubmission && adminUsers.length > 0) {
        const notifMessage = `Recette modifiée à valider de nouveau : ${titre ?? recipe.titre}`;

        for (const admin of adminUsers) {
          const existing = await tx.notification.findFirst({
            where: {
              userId: admin.id,
              recipeId: recipe.id,
              type: 'RECIPE_SUBMITTED',
              isRead: false,
            },
          });

          if (existing) {
            // Mettre à jour la notif existante avec le nouveau message
            await tx.notification.update({
              where: { id: existing.id },
              data: { message: notifMessage },
            });
          } else {
            // Pas de notif non lue → en créer une nouvelle
            await tx.notification.create({
              data: {
                type: 'RECIPE_SUBMITTED',
                message: notifMessage,
                userId: admin.id,
                recipeId: recipe.id,
              },
            });
          }
        }
      }
    });

    // Notifier les admins des nouveaux ingrédients créés à la volée
    if (newlyCreatedIngredientNames.size > 0) {
      if (adminUsers.length === 0) {
        adminUsers = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });
      }

      if (adminUsers.length > 0) {
        await prisma.notification.createMany({
          data: Array.from(newlyCreatedIngredientNames).flatMap((ingredientName) =>
            adminUsers.map((admin) => ({
              type: 'RECIPE_SUBMITTED',
              message: `Nouvel ingrédient soumis: ${ingredientName}`,
              userId: admin.id,
              recipeId: id,
            }))
          ),
        });
      }
    }

    const updated = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: recipeRelationsInclude,
    });

    return res.json({
      message: shouldResubmitForModeration
        ? 'Recette mise à jour et renvoyée en validation.'
        : 'Recette mise à jour',
      recipe: updated,
    });
  } catch (error) {
    console.error('[updateRecipe]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la recette.' });
  }
};

/**
 * Soumet une recette en attente de validation admin
 * PATCH /api/recipes/:id/submit
 */
export const submitRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      titre: true,
      userId: true,
      status: true,
    },
  });

  if (!recipe) {
    return res.status(404).json({ message: 'Recette introuvable' });
  }

  if (recipe.userId !== userId) {
    return res.status(403).json({ message: "Vous n'êtes pas autorisé à soumettre cette recette" });
  }

  if (recipe.status === 'PENDING') {
    return res.status(400).json({ message: 'Cette recette est deja en attente de validation.' });
  }

  if (recipe.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Seules les recettes en brouillon peuvent etre soumises.' });
  }

  const adminUsers = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const updatedRecipe = await prisma.$transaction(async (tx) => {
    const pendingRecipe = await tx.recipe.update({
      where: { id },
      data: {
        status: 'PENDING',
        rejectionReason: null,
        adminEditedSinceSubmission: false,
        adminEditedIngredientsSinceSubmission: false,
        adminEditedFieldsSummary: null,
      },
      include: recipeRelationsInclude,
    });

    if (adminUsers.length > 0) {
      await tx.notification.createMany({
        data: adminUsers.map((admin) => ({
          type: 'RECIPE_SUBMITTED',
          message: `Nouvelle recette soumise: ${recipe.titre}`,
          userId: admin.id,
          recipeId: recipe.id,
        })),
      });
    }

    return pendingRecipe;
  });

  return res.json({ message: 'Recette soumise pour validation.', recipe: updatedRecipe });
});

/**
 * Supprime une recette
 * DELETE /api/recipes/:id
 */
export const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const recipe = await findRecipeByIdOrSlug(id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recette introuvable' });
    }

    if (!canManageRecipe(user, recipe)) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer cette recette' });
    }

    // Un membre ne peut pas supprimer une recette déjà publiée. Seul un admin le peut.
    if (user.role !== 'ADMIN' && recipe.status === 'PUBLISHED') {
      return res.status(403).json({
        message: 'Impossible de supprimer une recette déjà publiée. Contactez un administrateur.',
      });
    }

    await prisma.recipe.delete({ where: { id: recipe.id } });

    return res.json({ message: 'Recette supprimée' });
  } catch (error) {
    console.error('[deleteRecipe]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la suppression de la recette.' });
  }
};

/**
 * Récupère toutes les recettes publiées
 * GET /api/recipes
 */
export const getAllPublishedRecipes = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const requestedLimit = Number(req.query.limit || 12);
  const limit = Math.min(Math.max(requestedLimit, 1), 50);
  const skip = (page - 1) * limit;
  const categoryFilter = String(req.query.category || '').trim();
  const searchQuery = String(req.query.q || '').trim();
  const mediaSlug = String(req.query.mediaSlug || '').trim();

  const andFilters = [{ status: 'PUBLISHED' }];

  if (categoryFilter) {
    andFilters.push({
      OR: [
        { categoryId: categoryFilter },
        {
          category: {
            nom: {
              equals: categoryFilter,
              mode: 'insensitive',
            },
          },
        },
      ],
    });
  }

  if (searchQuery) {
    andFilters.push({
      OR: [
        {
          titre: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          category: {
            nom: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        },
        {
          media: {
            titre: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        },
      ],
    });
  }

  if (mediaSlug) {
    andFilters.push({
      media: {
        slug: mediaSlug,
      },
    });
  }

  const where = { AND: andFilters };

  const [recipes, totalItems] = await prisma.$transaction([
    prisma.recipe.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        ...recipeRelationsInclude,
        user: {
          select: {
            id: true,
            pseudo: true,
          },
        },
      },
    }),
    prisma.recipe.count({ where }),
  ]);

  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  const pagination = {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };

  res.json({
    recipes,
    pagination,
  });
});
