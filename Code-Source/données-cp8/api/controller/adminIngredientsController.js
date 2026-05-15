import { prisma } from '../lib/prisma.js';
import { formatIngredient, formatRecipe, sendError } from './adminHelpers.js';

const ingredientRelationsInclude = {
  _count: { select: { recipes: true } },
  recipes: {
    include: {
      recipe: {
        select: { createdAt: true, user: { select: { nom: true, pseudo: true } } },
      },
    },
  },
};

export async function getAdminIngredients(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    const ingredients = await prisma.ingredient.findMany({
      where: {
        approved: false,
        ...(search ? { nom: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: ingredientRelationsInclude,
      orderBy: { nom: 'asc' },
    });

    return res.json(ingredients.map(formatIngredient));
  } catch (error) {
    return sendError(res, error, 'Erreur lors de la récupération des ingrédients admin.');
  }
}

// L'admin crée un ingrédient directement approuvé (approved: true).
// Si l'ingrédient existe déjà non approuvé, il est approuvé en même temps.
export async function createAdminIngredient(req, res) {
  try {
    const name = String(req.body?.name || req.body?.nom || '').trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!name) {
      return res.status(400).json({ message: "Le nom de l'ingrédient est requis." });
    }

    const existing = await prisma.ingredient.findUnique({ where: { nom: name } });

    if (existing) {
      if (!existing.approved) {
        const approved = await prisma.ingredient.update({
          where: { id: existing.id },
          data: { approved: true },
          include: ingredientRelationsInclude,
        });
        return res.status(200).json(formatIngredient(approved));
      }
      const withCount = await prisma.ingredient.findUnique({
        where: { id: existing.id },
        include: ingredientRelationsInclude,
      });
      return res.status(200).json(formatIngredient(withCount));
    }

    const ingredient = await prisma.ingredient.create({
      data: { nom: name, approved: true },
      include: ingredientRelationsInclude,
    });

    return res.status(201).json(formatIngredient(ingredient));
  } catch (error) {
    return sendError(res, error, "Erreur lors de la création de l'ingrédient.");
  }
}

export async function updateIngredient(req, res) {
  try {
    const name = String(req.body.name || '').trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ message: "Le nom de l'ingrédient est requis." });
    }

    const ingredient = await prisma.ingredient.update({
      where: { id: req.params.id },
      data: { nom: name },
      include: ingredientRelationsInclude,
    });

    return res.json(formatIngredient(ingredient));
  } catch (error) {
    return sendError(res, error, "Erreur lors de la modification de l'ingrédient.");
  }
}

export async function approveIngredient(req, res) {
  try {
    const ingredient = await prisma.ingredient.update({
      where: { id: req.params.id },
      data: { approved: true },
      include: ingredientRelationsInclude,
    });

    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
        message: `Nouvel ingrédient soumis: ${ingredient.nom}`,
      },
      data: { isRead: true },
    });

    return res.json(formatIngredient(ingredient));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Ingrédient introuvable.' });
    }
    return sendError(res, error, "Erreur lors de la validation de l'ingrédient.");
  }
}

export async function deleteIngredient(req, res) {
  try {
    const ingredientId = req.params.id;
    const rejectionReason = String(req.body?.rejectionReason || '').trim();

    // Récupérer l'ingrédient + la première recette liée pour identifier le membre
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: {
        nom: true,
        approved: true,
        _count: { select: { recipes: true } },
        recipes: {
          take: 1,
          include: {
            recipe: { select: { id: true, titre: true, userId: true, status: true } },
          },
        },
      },
    });

    if (!ingredient) return res.status(404).json({ message: 'Ingrédient introuvable.' });

    // Seuls les ingrédients non approuvés ET non utilisés dans des recettes publiées
    // peuvent être supprimés via cette route.
    if (ingredient.approved && (ingredient._count?.recipes || 0) > 0) {
      return res.status(409).json({
        message: 'Impossible de supprimer un ingrédient approuvé utilisé dans une recette.',
      });
    }

    const linkedRecipe = ingredient.recipes[0]?.recipe || null;
    const memberUserId = linkedRecipe?.userId || null;

    await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { ingredientId } });
      await tx.ingredient.delete({ where: { id: ingredientId } });

      // Marquer la notif admin "Nouvel ingrédient soumis" comme lue
      await tx.notification.updateMany({
        where: {
          userId: req.user.id,
          isRead: false,
          message: `Nouvel ingrédient soumis: ${ingredient.nom}`,
        },
        data: { isRead: true },
      });

      // Notifier le membre si on a pu l'identifier via la recette liée
      // Le front envoie maintenant le message complet (textarea modifiable)
      if (memberUserId) {
        const message = rejectionReason && rejectionReason.trim()
          ? rejectionReason.trim()
          : `Votre ingrédient "${ingredient.nom}" a été refusé par l'administrateur. Veuillez modifier votre recette en sélectionnant un ingrédient existant.`;
        await tx.notification.create({
          data: {
            userId: memberUserId,
            recipeId: linkedRecipe?.id || null,
            type: 'RECIPE_SUBMITTED',
            message,
          },
        });
      }
    });

    return res.status(204).send();
  } catch (error) {
    return sendError(res, error, "Erreur lors de la suppression de l'ingrédient.");
  }
}

export async function getValidatedIngredients(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    const ingredients = await prisma.ingredient.findMany({
      where: {
        approved: true,
        ...(search ? { nom: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: ingredientRelationsInclude,
      orderBy: { nom: 'asc' },
    });

    return res.json(ingredients.map(formatIngredient));
  } catch (error) {
    return sendError(res, error, 'Erreur lors de la récupération des ingrédients validés.');
  }
}

export async function getIngredientRecipes(req, res) {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { recipes: true } },
        recipes: {
          include: {
            recipe: {
              include: {
                category: true,
                media: true,
                user: { select: { nom: true, pseudo: true } },
                ingredients: { include: { ingredient: true } },
              },
            },
          },
        },
      },
    });

    if (!ingredient) {
      return res.status(404).json({ message: 'Ingrédient introuvable.' });
    }

    const recipes = ingredient.recipes
      .map((relation) => relation.recipe)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(formatRecipe);

    return res.json({ ingredient: formatIngredient(ingredient), recipes });
  } catch (error) {
    return sendError(res, error, "Erreur lors de la récupération des recettes liées à l'ingrédient.");
  }
}

export async function mergeIngredients(req, res) {
  try {
    const sourceId = String(req.body.sourceId || '').trim();
    const targetId = String(req.body.targetId || '').trim();

    if (!sourceId || !targetId) {
      return res.status(400).json({ message: 'sourceId et targetId sont requis.' });
    }

    if (sourceId === targetId) {
      return res.status(400).json({ message: 'Impossible de fusionner un ingrédient avec lui-même.' });
    }

    const [source, target] = await Promise.all([
      prisma.ingredient.findUnique({ where: { id: sourceId } }),
      prisma.ingredient.findUnique({ where: { id: targetId } }),
    ]);

    if (!source) return res.status(404).json({ message: 'Ingrédient source introuvable.' });
    if (!target) return res.status(404).json({ message: 'Ingrédient cible introuvable.' });

    const updatedTarget = await prisma.$transaction(async (tx) => {
      const sourceLinks = await tx.recipeIngredient.findMany({
        where: { ingredientId: sourceId },
        select: { recipeId: true, quantity: true, unit: true },
      });

      for (const link of sourceLinks) {
        const existingTargetLink = await tx.recipeIngredient.findFirst({
          where: { recipeId: link.recipeId, ingredientId: targetId },
        });

        if (existingTargetLink) {
          await tx.recipeIngredient.deleteMany({
            where: { recipeId: link.recipeId, ingredientId: sourceId },
          });
        } else {
          await tx.recipeIngredient.updateMany({
            where: { recipeId: link.recipeId, ingredientId: sourceId },
            data: { ingredientId: targetId },
          });
        }
      }

      await tx.notification.updateMany({
        where: {
          userId: req.user.id,
          isRead: false,
          message: `Nouvel ingrédient soumis: ${source.nom}`,
        },
        data: { isRead: true },
      });

      await tx.ingredient.delete({ where: { id: sourceId } });

      return tx.ingredient.findUnique({
        where: { id: targetId },
        include: ingredientRelationsInclude,
      });
    });

    return res.json(formatIngredient(updatedTarget));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Ingrédient introuvable.' });
    }
    return sendError(res, error, 'Erreur lors de la fusion des ingrédients.');
  }
}
