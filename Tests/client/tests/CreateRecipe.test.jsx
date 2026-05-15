import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreateRecipe from '../pages/CreateRecipe/CreateRecipe.jsx';

describe('CreateRecipe', () => {
  it('accepte les fichiers WEBP dans le champ image', () => {
    render(
      <MemoryRouter>
        <CreateRecipe />
      </MemoryRouter>
    );

    const input = screen.getByLabelText("Choisir une image PNG, JPG ou WEBP");
    const webpFile = new File(['webp-image'], 'recette-test.webp', { type: 'image/webp' });

    fireEvent.change(input, {
      target: {
        files: [webpFile],
      },
    });

    expect(input).toHaveAttribute('accept', '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp');
    expect(screen.getByText('recette-test.webp')).toBeInTheDocument();
    expect(screen.queryByText(/Veuillez utiliser une image/i)).not.toBeInTheDocument();
  });

  it('préremplit le titre depuis la navigation', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/membre/creer-recette', state: { initialTitle: 'Tarte maison' } }]}>
        <CreateRecipe />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Titre de la recette')).toHaveValue('Tarte maison');
  });
});