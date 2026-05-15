/**
 * ResetPassword.test.jsx
 * Tests unitaires — Page réinitialisation mot de passe
 * Cinés Délices — Apothéose CDA O'Clock
 *
 * Couvre :
 * - Affichage sans token dans l'URL
 * - Affichage du formulaire avec token
 * - Validation mots de passe non identiques
 * - Soumission réussie
 * - Erreur de l'API
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPassword from '../pages/ResetPassword/ResetPassword.jsx';

// Mock du service d'auth
const mockResetPassword = vi.fn();

vi.mock('../services/authService.js', () => ({
  resetPassword: (...args) => mockResetPassword(...args),
}));

// Utilitaire : rend le composant avec ou sans token dans l'URL
function renderResetPassword(token = null) {
  const url = token ? `/reset-password?token=${token}` : '/reset-password';
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<div>Page de connexion</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────
  // 1. Affichage sans token
  // ───────────────────────────────────────────

  it('affiche un message d\'erreur si aucun token n\'est présent dans l\'URL', () => {
    renderResetPassword(null);
    expect(screen.getByText(/lien invalide/i)).toBeInTheDocument();
  });

  it('n\'affiche pas le formulaire si le token est absent', () => {
    renderResetPassword(null);
    expect(screen.queryByLabelText(/nouveau mot de passe/i)).not.toBeInTheDocument();
  });

  // ───────────────────────────────────────────
  // 2. Affichage avec token valide
  // ───────────────────────────────────────────

  it('affiche le formulaire si un token est présent dans l\'URL', () => {
    renderResetPassword('token-valide-abc123');
    expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer/i)).toBeInTheDocument();
  });

  it('affiche le titre "Nouveau mot de passe"', () => {
    renderResetPassword('token-valide-abc123');
    expect(screen.getByRole('heading', { name: /nouveau mot de passe/i })).toBeInTheDocument();
  });

  // ───────────────────────────────────────────
  // 3. Validation — mots de passe non identiques
  // ───────────────────────────────────────────

  it('affiche une erreur si les mots de passe ne correspondent pas', async () => {
    renderResetPassword('token-valide-abc123');

    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
      target: { value: 'MonMotDePasse1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirmer/i), {
      target: { value: 'MotDePasseDifferent1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /valider|confirmer|réinitialiser|mettre à jour/i }));

    await waitFor(() => {
      expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument();
    });

    // L'API ne doit pas être appelée
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────
  // 4. Soumission réussie
  // ───────────────────────────────────────────

  it('affiche un message de succès après réinitialisation réussie', async () => {
    mockResetPassword.mockResolvedValue({ message: 'ok' });
    renderResetPassword('token-valide-abc123');

    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
      target: { value: 'NouveauMdp1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirmer/i), {
      target: { value: 'NouveauMdp1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /valider|confirmer|réinitialiser|mettre à jour/i }));

    await waitFor(() => {
      expect(screen.getByText(/mis à jour|réinitialis|redirection/i)).toBeInTheDocument();
    });

    expect(mockResetPassword).toHaveBeenCalledWith({
      token: 'token-valide-abc123',
      password: 'NouveauMdp1!',
    });
  });

  // ───────────────────────────────────────────
  // 5. Erreur retournée par l'API
  // ───────────────────────────────────────────

  it('affiche l\'erreur retournée par l\'API en cas d\'échec', async () => {
    mockResetPassword.mockRejectedValue(new Error('Token expiré ou invalide'));
    renderResetPassword('token-expire-xyz');

    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
      target: { value: 'MonMdp1234!' },
    });
    fireEvent.change(screen.getByLabelText(/confirmer/i), {
      target: { value: 'MonMdp1234!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /valider|confirmer|réinitialiser|mettre à jour/i }));

    await waitFor(() => {
      expect(screen.getByText(/token expiré ou invalide/i)).toBeInTheDocument();
    });
  });

  it('affiche un message d\'erreur générique si l\'API ne précise pas l\'erreur', async () => {
    mockResetPassword.mockRejectedValue(new Error(''));
    renderResetPassword('token-abc');

    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
      target: { value: 'MonMdp1234!' },
    });
    fireEvent.change(screen.getByLabelText(/confirmer/i), {
      target: { value: 'MonMdp1234!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /valider|confirmer|réinitialiser|mettre à jour/i }));

    await waitFor(() => {
      expect(screen.getByText(/erreur lors de la réinitialisation/i)).toBeInTheDocument();
    });
  });
});
