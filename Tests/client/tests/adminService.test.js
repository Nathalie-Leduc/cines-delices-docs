import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveAdminRecipe,
  getAdminRecipes,
  getAdminUsers,
  getPendingRecipes,
  rejectAdminRecipe,
  updateAdminUserRole,
} from '../services/adminService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL || `${API_BASE_URL}/api/admin`;

describe('adminService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => (key === 'token' ? 'fake-jwt-token' : null)),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    }));
  });

  it('appelle GET /recipes/pending avec token', async () => {
    await getPendingRecipes();

    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_API_URL}/recipes/pending`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      }),
    );
  });

  it('appelle PATCH /recipes/:id/publish', async () => {
    await approveAdminRecipe('recipe-123');

    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_API_URL}/recipes/recipe-123/publish`,
      expect.objectContaining({
        method: 'PATCH',
      }),
    );
  });

  it('appelle PATCH /recipes/:id/reject avec rejectionReason', async () => {
    await rejectAdminRecipe('recipe-456', 'Motif test');

    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_API_URL}/recipes/recipe-456/reject`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ rejectionReason: 'Motif test' }),
      }),
    );
  });

  it('appelle GET /recipes avec query params', async () => {
    await getAdminRecipes({ search: 'bear', category: 'Entrée', status: 'PENDING' });

    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_API_URL}/recipes?search=bear&category=Entr%C3%A9e&status=PENDING`,
      expect.any(Object),
    );
  });

  it('appelle GET /users avec query params', async () => {
    await getAdminUsers('marie');

    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_API_URL}/users?search=marie`,
      expect.any(Object),
    );
  });

  it('appelle PATCH /users/:id/role avec le bon payload', async () => {
    await updateAdminUserRole('user-123', 'ADMIN');

    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_API_URL}/users/user-123/role`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ role: 'ADMIN' }),
      }),
    );
  });
});
