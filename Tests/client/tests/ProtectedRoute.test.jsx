import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../router/ProtectedRoute.jsx';

const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock(),
}));

function renderProtectedRoute(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin" element={<div>Admin Home</div>} />
        <Route
          path="/membre"
          element={(
            <ProtectedRoute>
              <div>Member Home</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirige vers /login quand l’utilisateur n’est pas connecté', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
    });

    renderProtectedRoute('/membre');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirige vers /admin quand l’utilisateur connecté est administrateur', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
    });

    renderProtectedRoute('/membre');

    expect(screen.getByText('Admin Home')).toBeInTheDocument();
  });

  it('autorise l’accès à /membre pour un membre connecté', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
    });

    renderProtectedRoute('/membre');

    expect(screen.getByText('Member Home')).toBeInTheDocument();
  });
});
