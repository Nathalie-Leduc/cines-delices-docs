/**
 * recipeUtils.test.js
 * Tests unitaires — Fonctions utilitaires recettes
 * Cinés Délices — Apothéose CDA O'Clock
 *
 * Couvre :
 * - formatMinutes (RecipeCard)
 * - normalizeCategoryLabel (recipeCatalog.shared)
 * - mapApiRecipeToCard (recipeCatalog.shared)
 * - parsePositiveInt (recipeCatalog.shared)
 * - buildCategoryFilters (recipeCatalog.shared)
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeCategoryLabel,
  mapApiRecipeToCard,
  buildCategoryFilters,
  parsePositiveInt,
  toCategoryFilterKey,
} from '../components/RecipeCatalogView/recipeCatalog.shared.js';
import { parseTimeToMinutes } from '../utils/recipeUtils.js';

// ─────────────────────────────────────────────
// Reproduction locale de formatMinutes
// (définie dans RecipeCard.jsx, non exportée)
// On la reteste ici en l'extrayant manuellement
// pour garantir son comportement futur
// ─────────────────────────────────────────────

function formatMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  const mins = Math.round(totalMinutes);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

// ─────────────────────────────────────────────
// 1. formatMinutes
// Analogie : comme une horloge de cuisine —
// sous 60min elle affiche "30 min",
// au-dessus elle bascule en "1h30min"
// ─────────────────────────────────────────────

describe('formatMinutes', () => {
  it('retourne null pour une valeur nulle ou zéro', () => {
    expect(formatMinutes(0)).toBeNull();
    expect(formatMinutes(null)).toBeNull();
    expect(formatMinutes(undefined)).toBeNull();
    expect(formatMinutes(-5)).toBeNull();
  });

  it('retourne null pour une valeur non numérique', () => {
    expect(formatMinutes(NaN)).toBeNull();
    expect(formatMinutes(Infinity)).toBeNull();
    expect(formatMinutes('30')).toBeNull(); // string, pas un nombre fini
  });

  it('formate correctement les minutes sous 60', () => {
    expect(formatMinutes(30)).toBe('30 min');
    expect(formatMinutes(1)).toBe('1 min');
    expect(formatMinutes(59)).toBe('59 min');
  });

  it('formate correctement les heures pile', () => {
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(180)).toBe('3h');
  });

  it('formate correctement les heures et minutes', () => {
    expect(formatMinutes(90)).toBe('1h30min');
    expect(formatMinutes(75)).toBe('1h15min');
    expect(formatMinutes(125)).toBe('2h5min');
  });

  it('arrondit les valeurs décimales', () => {
    expect(formatMinutes(30.4)).toBe('30 min');
    expect(formatMinutes(30.6)).toBe('31 min');
    expect(formatMinutes(59.9)).toBe('1h'); // arrondi à 60 → 1h
  });
});

// ─────────────────────────────────────────────
// 2. normalizeCategoryLabel
// Analogie : comme un traducteur de menu —
// "entrée", "Entrée", "ENTREE" → toujours "Entrée"
// ─────────────────────────────────────────────

describe('normalizeCategoryLabel', () => {
  it('normalise les variantes de "Entrée"', () => {
    expect(normalizeCategoryLabel('entree')).toBe('Entrée');
    expect(normalizeCategoryLabel('entrée')).toBe('Entrée');
    expect(normalizeCategoryLabel('Entrée')).toBe('Entrée');
    expect(normalizeCategoryLabel('ENTREE')).toBe('Entrée');
  });

  it('normalise "Plat"', () => {
    expect(normalizeCategoryLabel('plat')).toBe('Plat');
    expect(normalizeCategoryLabel('PLAT')).toBe('Plat');
    expect(normalizeCategoryLabel('Plat')).toBe('Plat');
  });

  it('normalise "Dessert"', () => {
    expect(normalizeCategoryLabel('dessert')).toBe('Dessert');
    expect(normalizeCategoryLabel('DESSERT')).toBe('Dessert');
  });

  it('normalise "Boisson"', () => {
    expect(normalizeCategoryLabel('boisson')).toBe('Boisson');
    expect(normalizeCategoryLabel('BOISSON')).toBe('Boisson');
  });

  it('retourne "Autre" pour une valeur vide ou nulle', () => {
    expect(normalizeCategoryLabel('')).toBe('Autre');
    expect(normalizeCategoryLabel(null)).toBe('Autre');
    expect(normalizeCategoryLabel(undefined)).toBe('Autre');
  });

  it('met en majuscule la première lettre pour une catégorie inconnue', () => {
    expect(normalizeCategoryLabel('apéritif')).toBe('Apéritif');
    expect(normalizeCategoryLabel('snack')).toBe('Snack');
  });
});

// ─────────────────────────────────────────────
// 3. mapApiRecipeToCard
// Analogie : comme un traducteur de menu API
// vers une fiche recette lisible par RecipeCard
// ─────────────────────────────────────────────

describe('mapApiRecipeToCard', () => {
  const recipeBase = {
    id: 42,
    slug: 'ratatouille-de-remy',
    titre: 'Ratatouille de Rémy',
    tempsPreparation: 30,
    tempsCuisson: 45,
    imageURL: '/uploads/recipes/ratatouille.webp',
    category: { nom: 'Plat' },
    media: { titre: 'Ratatouille', type: 'FILM' },
  };

  it('mappe correctement une recette complète', () => {
    const card = mapApiRecipeToCard(recipeBase);
    expect(card.id).toBe(42);
    expect(card.slug).toBe('ratatouille-de-remy');
    expect(card.title).toBe('Ratatouille de Rémy');
    expect(card.category).toBe('Plat');
    expect(card.mediaTitle).toBe('Ratatouille');
    expect(card.mediaType).toBe('film');
    expect(card.duration).toBe(75); // 30 + 45
    expect(card.image).toBe('/uploads/recipes/ratatouille.webp');
  });

  it('calcule la durée totale correctement', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, tempsPreparation: 15, tempsCuisson: 30 });
    expect(card.duration).toBe(45);
  });

  it('retourne 0 si aucune durée n\'est fournie', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, tempsPreparation: null, tempsCuisson: null });
    expect(card.duration).toBe(0);
  });

  it('utilise l\'image de fallback si imageURL est absente', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, imageURL: null, imageUrl: null });
    expect(card.image).toBeNull();
  });

  it('retourne "Recette sans titre" si le titre est absent', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, titre: null });
    expect(card.title).toBe('Recette sans titre');
  });

  it('retourne "Sans média" si le média est absent', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, media: null });
    expect(card.mediaTitle).toBe('Sans média');
  });

  it('identifie correctement le type "série"', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, media: { titre: 'Breaking Bad', type: 'SERIES' } });
    expect(card.mediaType).toBe('série');
  });

  it('identifie correctement le type "film" par défaut', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, media: { titre: 'Le Parrain', type: 'FILM' } });
    expect(card.mediaType).toBe('film');
  });

  it('normalise la catégorie via normalizeCategoryLabel', () => {
    const card = mapApiRecipeToCard({ ...recipeBase, category: { nom: 'dessert' } });
    expect(card.category).toBe('Dessert');
  });

  it('gère une recette null ou undefined sans planter', () => {
    const card = mapApiRecipeToCard(null);
    expect(card.title).toBe('Recette sans titre');
    expect(card.duration).toBe(0);
  });
});

// ─────────────────────────────────────────────
// 4. parsePositiveInt
// ─────────────────────────────────────────────

describe('parsePositiveInt', () => {
  it('parse un entier positif correctement', () => {
    expect(parsePositiveInt('6', 9)).toBe(6);
    expect(parsePositiveInt(12, 9)).toBe(12);
  });

  it('retourne le fallback pour une valeur invalide', () => {
    expect(parsePositiveInt('abc', 9)).toBe(9);
    expect(parsePositiveInt('', 9)).toBe(9);
    expect(parsePositiveInt(null, 9)).toBe(9);
    expect(parsePositiveInt(undefined, 9)).toBe(9);
    expect(parsePositiveInt(0, 9)).toBe(9); // 0 n'est pas > 0
    expect(parsePositiveInt(-5, 9)).toBe(9);
  });

  it('parse correctement une string numérique avec espaces', () => {
    expect(parsePositiveInt('  6  ', 9)).toBe(6);
  });
});

// ─────────────────────────────────────────────
// 5. buildCategoryFilters
// ─────────────────────────────────────────────

describe('buildCategoryFilters', () => {
  it('commence toujours par "Tous"', () => {
    const filters = buildCategoryFilters([]);
    expect(filters[0].value).toBe('Tous');
  });

  it('retourne uniquement "Tous" pour un tableau vide', () => {
    const filters = buildCategoryFilters([]);
    expect(filters).toHaveLength(1);
  });

  it('déduplique les catégories', () => {
    const filters = buildCategoryFilters(['Plat', 'Plat', 'plat']);
    const plats = filters.filter(f => f.value === 'Plat');
    expect(plats).toHaveLength(1);
  });

  it('respecte l\'ordre Entrée > Plat > Dessert > Boisson', () => {
    const filters = buildCategoryFilters(['Boisson', 'Plat', 'Dessert', 'Entrée']);
    const values = filters.slice(1).map(f => f.value);
    expect(values).toEqual(['Entrée', 'Plat', 'Dessert', 'Boisson']);
  });

  it('normalise les catégories passées en minuscules', () => {
    const filters = buildCategoryFilters(['plat', 'dessert']);
    const values = filters.map(f => f.value);
    expect(values).toContain('Plat');
    expect(values).toContain('Dessert');
  });
});

// ─────────────────────────────────────────────
// 6. toCategoryFilterKey
// ─────────────────────────────────────────────

describe('toCategoryFilterKey', () => {
  it('convertit "Entrée" en "entree"', () => {
    expect(toCategoryFilterKey('Entrée')).toBe('entree');
  });

  it('convertit "Plat" en "plat"', () => {
    expect(toCategoryFilterKey('Plat')).toBe('plat');
  });

  it('gère les espaces et caractères spéciaux', () => {
    expect(toCategoryFilterKey('Plat principal')).toBe('plat-principal');
  });

  it('retourne une chaîne vide pour une valeur nulle', () => {
    expect(toCategoryFilterKey(null)).toBe('');
    expect(toCategoryFilterKey(undefined)).toBe('');
  });
});

// ─────────────────────────────────────────────
// 7. parseTimeToMinutes
// Analogie : un assistant qui comprend toutes les façons
// de dire un temps (1h30, 1:30, 90min, 90, 1.5h)
// et répond toujours en minutes pour la BDD.
// ─────────────────────────────────────────────

describe('parseTimeToMinutes', () => {
  // ─── Pattern 1 : format "h" (heures + minutes optionnelles) ───
  it('comprend "1h30" → 90', () => {
    expect(parseTimeToMinutes('1h30')).toBe(90);
  });

  it('comprend "1h" → 60 (sans minutes)', () => {
    expect(parseTimeToMinutes('1h')).toBe(60);
  });

  it('comprend "2h" → 120', () => {
    expect(parseTimeToMinutes('2h')).toBe(120);
  });

  it('comprend "1.5h" → 90 (heures décimales)', () => {
    expect(parseTimeToMinutes('1.5h')).toBe(90);
  });

  it('comprend "1,5h" → 90 (virgule acceptée)', () => {
    expect(parseTimeToMinutes('1,5h')).toBe(90);
  });

  it('comprend "1h10min" → 70 (suffixe min explicite)', () => {
    expect(parseTimeToMinutes('1h10min')).toBe(70);
  });

  // ─── Pattern 2 : format "h:m" ───
  it('comprend "1:30" → 90', () => {
    expect(parseTimeToMinutes('1:30')).toBe(90);
  });

  it('comprend "01:30" → 90 (zéro de tête)', () => {
    expect(parseTimeToMinutes('01:30')).toBe(90);
  });

  it('comprend "2:00" → 120', () => {
    expect(parseTimeToMinutes('2:00')).toBe(120);
  });

  // ─── Pattern 3 : format "min" (minutes seules) ───
  it('comprend "30" → 30 (entier seul)', () => {
    expect(parseTimeToMinutes('30')).toBe(30);
  });

  it('comprend "30min" → 30', () => {
    expect(parseTimeToMinutes('30min')).toBe(30);
  });

  it('comprend "30mn" → 30 (suffixe français)', () => {
    expect(parseTimeToMinutes('30mn')).toBe(30);
  });

  it('comprend "30m" → 30 (suffixe court)', () => {
    expect(parseTimeToMinutes('30m')).toBe(30);
  });

  // ─── Normalisation ───
  it('ignore les espaces autour et au milieu', () => {
    expect(parseTimeToMinutes('  1h 30  ')).toBe(90);
    expect(parseTimeToMinutes(' 30 min ')).toBe(30);
  });

  it('accepte les majuscules', () => {
    expect(parseTimeToMinutes('1H30')).toBe(90);
    expect(parseTimeToMinutes('30MIN')).toBe(30);
  });

  // ─── Cas invalides → undefined ───
  it('rejette une chaîne vide', () => {
    expect(parseTimeToMinutes('')).toBeUndefined();
  });

  it('rejette null', () => {
    expect(parseTimeToMinutes(null)).toBeUndefined();
  });

  it('rejette undefined', () => {
    expect(parseTimeToMinutes(undefined)).toBeUndefined();
  });

  it('rejette une valeur non numérique', () => {
    expect(parseTimeToMinutes('abc')).toBeUndefined();
    expect(parseTimeToMinutes('truc')).toBeUndefined();
  });

  it('rejette "0" (durée nulle)', () => {
    expect(parseTimeToMinutes('0')).toBeUndefined();
  });

  it('rejette "0h" (durée nulle en heures)', () => {
    expect(parseTimeToMinutes('0h')).toBeUndefined();
  });

  it('rejette les formats invalides', () => {
    expect(parseTimeToMinutes('1h30m45s')).toBeUndefined();   // pas pattern reconnu
    expect(parseTimeToMinutes('--30')).toBeUndefined();
    expect(parseTimeToMinutes('30x')).toBeUndefined();        // suffixe inconnu
  });
});
