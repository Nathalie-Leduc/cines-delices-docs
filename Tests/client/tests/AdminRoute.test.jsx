import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import AdminRoute from '../router/AdminRoute.jsx';

const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock(),
}));

function renderAdminRoute(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/membre" element={<div>Member Home</div>} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route path="utilisateurs" element={<div>Admin Users</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminRoute', () => {
  it('redirige vers /login quand l’utilisateur n’est pas connecté', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
    });

    renderAdminRoute('/admin/utilisateurs');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirige vers /membre quand l’utilisateur connecté n’est pas admin', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
    });

    renderAdminRoute('/admin/utilisateurs');

    expect(screen.getByText('Member Home')).toBeInTheDocument();
  });

  it('autorise l’accès aux sous-routes /admin/* pour un admin', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
    });

    renderAdminRoute('/admin/utilisateurs');

    expect(screen.getByText('Admin Users')).toBeInTheDocument();
  });
});
