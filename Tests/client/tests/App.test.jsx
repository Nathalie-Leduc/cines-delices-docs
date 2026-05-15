import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../contexts/AuthContext.jsx';

vi.mock('../services/mediaService', () => ({
  fetchMedia: vi.fn(() => new Promise(() => {})),
}));

beforeEach(() => {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
});

describe('App', () => {
  it("affiche le titre de la page d'accueil", () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: 'Cuisine le cinéma, Savoure les séries.' })).toBeInTheDocument();
  });
});
