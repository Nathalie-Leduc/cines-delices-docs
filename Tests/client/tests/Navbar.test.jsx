import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar.jsx';

const useAuthMock = vi.fn();
const getRecipesCatalogMock = vi.fn();
const getMoviesCatalogMock = vi.fn();
const getSeriesCatalogMock = vi.fn();

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../services/recipesService', () => ({
  getRecipesCatalog: (...args) => getRecipesCatalogMock(...args),
}));

vi.mock('../services/mediaService', () => ({
  getMoviesCatalog: (...args) => getMoviesCatalogMock(...args),
  getSeriesCatalog: (...args) => getSeriesCatalogMock(...args),
}));

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('affiche la navigation publique pour un visiteur', () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recettes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Film' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Série' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('conserve la navigation desktop publique pour un membre connecté', () => {
    useAuthMock.mockReturnValue({
      user: { prenom: 'nora', role: 'MEMBER' },
      isAuthenticated: true,
      isAdmin: false,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recettes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Film' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Série' })).toBeInTheDocument();
    expect(screen.getAllByText('Bonjour,').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nora').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('conserve la navigation desktop publique pour un administrateur connecté', () => {
    useAuthMock.mockReturnValue({
      user: { prenom: 'jade', role: 'ADMIN' },
      isAuthenticated: true,
      isAdmin: true,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recettes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Film' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Série' })).toBeInTheDocument();
    expect(screen.getAllByText('Bonjour,').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jade').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('affiche des résultats mixtes recettes, films et séries avec la bonne destination', async () => {
    vi.useFakeTimers();

    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      logout: vi.fn(),
    });

    getRecipesCatalogMock.mockResolvedValue({
      recipes: [
        {
          id: 1,
          slug: 'burger-breakfast-club',
          titre: 'Burger Breakfast Club',
          imageURL: '/img/hero-home.webp',
          media: { titre: 'The Breakfast Club' },
        },
      ],
    });

    getMoviesCatalogMock.mockResolvedValue({
      movies: [
        {
          id: 2,
          slug: 'the-breakfast-club',
          title: 'The Breakfast Club',
          poster: '/img/parrain-poster.webp',
        },
      ],
    });

    getSeriesCatalogMock.mockResolvedValue({
      series: [
        {
          id: 3,
          slug: 'breakfast-news',
          title: 'Breakfast News',
          poster: '/img/stranger-thing-poster.webp',
        },
      ],
    });

    renderNavbar();

    const desktopSearchInput = screen.getAllByRole('searchbox')[0];
    fireEvent.change(desktopSearchInput, { target: { value: 'breakfast' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(401);
    });

    expect(getRecipesCatalogMock).toHaveBeenCalledWith({
      q: 'breakfast',
      limit: 4,
      page: 1,
    });

    expect(getMoviesCatalogMock).toHaveBeenCalledWith({
      q: 'breakfast',
      limit: 3,
      page: 1,
    });

    expect(getSeriesCatalogMock).toHaveBeenCalledWith({
      q: 'breakfast',
      limit: 3,
      page: 1,
    });

    expect(screen.getAllByText('Burger Breakfast Club')[0].closest('a')).toHaveAttribute('href', '/recipes/burger-breakfast-club');
    expect(screen.getAllByText('The Breakfast Club')[0].closest('a')).toHaveAttribute('href', '/films/the-breakfast-club');
    expect(screen.getAllByText('Breakfast News')[0].closest('a')).toHaveAttribute('href', '/series/breakfast-news');
  });
});
