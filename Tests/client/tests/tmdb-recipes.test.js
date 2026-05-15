/**
 * tmdb-recipes.test.js
 * Tests unitaires — Services recettes et médias
 * Cinés Délices — Apothéose CDA O'Clock
 *
 * L'API est mockée via vi.mock — pas besoin d'un serveur démarré.
 * Analogie : on teste le script d'un acteur (le service),
 * pas le film en entier (l'API réelle).
 */

import { describe, test, expect, it, vi, beforeEach } from 'vitest';

// Mock de request — intercepte tous les appels réseau des services
const mockRequest = vi.fn();

vi.mock('../services/api.js', () => ({
  request: (...args) => mockRequest(...args),
}));

import { fetchMedia } from '../services/mediaService.js';
import {
  getPublishedRecipes,
  getRecipesCatalog,
  getMyRecipes,
} from '../services/recipesService.js';

const fakeRecipes = [
  { id: '1', titre: 'Ratatouille de Rémy', slug: 'ratatouille-de-remy' },
  { id: '2', titre: 'Burger Royale', slug: 'burger-royale' },
];

const fakeCatalog = {
  recipes: fakeRecipes,
  total: 2,
  page: 1,
  limit: 9,
};

const fakeMyRecipes = [
  { id: '3', titre: 'Ma recette perso', slug: 'ma-recette-perso', status: 'DRAFT' },
];

const fakeMedia = [
  { id: '1', titre: 'Ratatouille', type: 'FILM' },
  { id: '2', titre: 'The Bear', type: 'SERIES' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Test films', () => {
  test('fetchMedia retourne des données définies', async () => {
    mockRequest.mockResolvedValue(fakeMedia);
    const data = await fetchMedia();
    expect(data).toBeDefined();
  });

  test('fetchMedia appelle /api/tmdb/medias sans paramètres', async () => {
    mockRequest.mockResolvedValue(fakeMedia);
    await fetchMedia();
    expect(mockRequest).toHaveBeenCalledWith('/api/tmdb/medias');
  });

  test('fetchMedia appelle la bonne URL avec un type', async () => {
    mockRequest.mockResolvedValue(fakeMedia);
    await fetchMedia('movies');
    expect(mockRequest).toHaveBeenCalledWith('/api/tmdb/medias/movies');
  });

  test('fetchMedia gère les erreurs sans planter et retourne []', async () => {
    mockRequest.mockRejectedValue(new Error('Network error'));
    const result = await fetchMedia();
    expect(result).toEqual([]);
  });
});

describe('Test recettes', () => {
  it('getPublishedRecipes appelle /api/recipes et retourne un tableau', async () => {
    mockRequest.mockResolvedValue(fakeRecipes);
    const recipes = await getPublishedRecipes();
    expect(mockRequest).toHaveBeenCalledWith('/api/recipes');
    expect(recipes).toEqual(fakeRecipes);
    expect(Array.isArray(recipes)).toBe(true);
  });

  it('getRecipesCatalog appelle /api/recipes sans paramètres par défaut', async () => {
    mockRequest.mockResolvedValue(fakeCatalog);
    const catalog = await getRecipesCatalog();
    expect(mockRequest).toHaveBeenCalledWith('/api/recipes');
    expect(catalog).toEqual(fakeCatalog);
  });

  it('getRecipesCatalog construit correctement la query string', async () => {
    mockRequest.mockResolvedValue(fakeCatalog);
    await getRecipesCatalog({ page: 2, limit: 9, category: 'Plat' });
    const calledUrl = mockRequest.mock.calls[0][0];
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=9');
    expect(calledUrl).toContain('category=Plat');
  });

  it('getRecipesCatalog ignore les paramètres vides ou falsy', async () => {
    mockRequest.mockResolvedValue(fakeCatalog);
    await getRecipesCatalog({ page: 0, limit: 0, category: '' });
    const calledUrl = mockRequest.mock.calls[0][0];
    expect(calledUrl).toBe('/api/recipes');
  });

  it('getMyRecipes appelle /api/users/me/recipes', async () => {
    mockRequest.mockResolvedValue(fakeMyRecipes);
    const myRecipes = await getMyRecipes();
    expect(mockRequest).toHaveBeenCalledWith('/api/users/me/recipes');
    expect(myRecipes).toEqual(fakeMyRecipes);
    expect(Array.isArray(myRecipes)).toBe(true);
  });

  it('getPublishedRecipes propage les erreurs API', async () => {
    mockRequest.mockRejectedValue(new Error('Erreur serveur'));
    await expect(getPublishedRecipes()).rejects.toThrow('Erreur serveur');
  });
});

