import { describe, expect, it } from 'vitest';
import { sortHomeCategories } from '../components/HomeCategories/HomeCategories.jsx';

describe('sortHomeCategories', () => {
  it('place les categories dans l ordre Entree, Plat, Dessert, Boisson', () => {
    const categories = [
      { id: 1, name: 'Boisson', slug: 'boisson' },
      { id: 2, name: 'Dessert', slug: 'dessert' },
      { id: 3, name: 'Entrée', slug: 'entree' },
      { id: 4, name: 'Plat', slug: 'plat' },
    ];

    const sortedCategories = sortHomeCategories(categories);

    expect(sortedCategories.map((category) => category.name)).toEqual([
      'Entrée',
      'Plat',
      'Dessert',
      'Boisson',
    ]);
  });
});
