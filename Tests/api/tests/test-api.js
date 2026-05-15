import assert from 'node:assert/strict';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const timestamp = Date.now();
const createdCategoryName = `Test Category ${timestamp}`;
const createdUserEmail = `integration-admin-${timestamp}@cinesdelices.fr`;
const visitorContactMessage = `Message visiteur integration ${timestamp}`;
const memberContactMessage = `Message membre integration ${timestamp}`;

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await parseJson(response);
  return { response, payload };
}

async function login(email, password) {
  const { response, payload } = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200, `Login failed for ${email}`);
  assert.ok(payload?.token, `Missing token for ${email}`);

  return payload.token;
}

async function getAdminNotifications(token) {
  const { response, payload } = await request('/api/admin/notifications', {
    headers: authHeaders(token),
  });

  assert.equal(response.status, 200, 'GET /api/admin/notifications should allow admins');

  return {
    unreadCount: Number(payload?.unreadCount || 0),
    notifications: Array.isArray(payload?.notifications) ? payload.notifications : [],
  };
}

function authHeaders(token, includeJson = false) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function registerUser() {
  const { response, payload } = await request('/api/auth/register', {
    method: 'POST',
    headers: authHeaders(null, true),
    body: JSON.stringify({
      email: createdUserEmail,
      nom: 'Integration',
      prenom: 'Admin',
      password: 'Test1234!',
      acceptedPolicies: true,
    }),
  });

  assert.equal(response.status, 201, 'Registering the integration user should succeed');
  assert.ok(payload?.user?.id, 'Registered integration user should expose an id');

  return payload.user;
}

async function deleteUserAsAdmin(adminToken, userId) {
  if (!userId) {
    return;
  }

  await request(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(adminToken),
  });
}

// Recrée les comptes de test s'ils ont été supprimés lors d'un run précédent.
// Analogie : comme un régisseur qui remet les décors en place avant chaque tournage.
async function ensureTestUsers() {
  const usersToEnsure = [
    { email: 'admin@cinesdelices.fr',         password: 'Admin1234!', nom: 'Delices',  prenom: 'Admin',   pseudo: 'Admin',    role: 'ADMIN'  },
    { email: 'sophie.martin@cinesdelices.fr', password: 'Admin1234!', nom: 'Martin',   prenom: 'Sophie',  pseudo: 'Sophie',   role: 'ADMIN'  },
    { email: 'luca.bernard@cinesdelices.fr',  password: 'Admin1234!', nom: 'Bernard',  prenom: 'Luca',    pseudo: 'Luca',     role: 'ADMIN'  },
    { email: 'marie@cinesdelices.fr',         password: 'Member1234!', nom: 'Dubois',  prenom: 'Marie',   pseudo: 'Marie',    role: 'MEMBER' },
    { email: 'remy@cinesdelices.fr',          password: 'Member1234!', nom: 'Martin',  prenom: 'Rémy',    pseudo: 'ReMyChef', role: 'MEMBER' },
  ];

  // On cherche un admin fonctionnel pour promouvoir les autres et supprimer/recréer les comptes
  let bootstrapToken = null;
  for (const u of usersToEnsure.filter(u => u.role === 'ADMIN')) {
    try {
      const { response, payload } = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, password: u.password }),
      });
      if (response.status === 200 && payload?.token) {
        bootstrapToken = payload.token;
        break;
      }
    } catch { /* continuer */ }
  }

  for (const u of usersToEnsure) {
    // Tenter le login
    const { response: loginRes } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, password: u.password }),
    });

    if (loginRes.status === 200) continue; // Le compte existe avec le bon mot de passe ✅

    // FIX : si 401 (compte existant mais mauvais mot de passe),
    // on supprime le compte via l'API admin puis on le recrée.
    // C'est le cas quand un testeur a modifié son mot de passe en prod.
    if (loginRes.status === 401 && bootstrapToken) {
      console.log(`  → Mot de passe incorrect pour ${u.email}, suppression et recréation...`);

      // Trouver l'ID du compte via la liste admin
      const { payload: usersPayload } = await request('/api/admin/users', {
        headers: authHeaders(bootstrapToken),
      });
      const users = Array.isArray(usersPayload) ? usersPayload : (usersPayload?.users ?? []);
      const existingUser = users.find(usr => usr.email === u.email);

      if (existingUser?.id) {
        await request(`/api/admin/users/${existingUser.id}`, {
          method: 'DELETE',
          headers: authHeaders(bootstrapToken),
        });
        console.log(`  → Compte supprimé, recréation en cours...`);
      }
    }

    // Créer le compte (qu'il ait été supprimé à l'étape précédente ou qu'il n'existait pas)
    console.log(`  → Recréation de ${u.email}...`);
    const { response: regRes, payload: regPayload } = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: u.email,
        nom: u.nom,
        prenom: u.prenom,
        pseudo: u.pseudo,
        password: u.password,
        acceptedPolicies: true,
      }),
    });

    if (regRes.status !== 201) {
      console.warn(`  ⚠️  Impossible de recréer ${u.email} (${regRes.status})`);
      continue;
    }

    // Si c'est un admin et qu'on a un token bootstrap, on le promeut
    if (u.role === 'ADMIN' && bootstrapToken) {
      const userId = regPayload?.user?.id;
      if (userId) {
        await request(`/api/admin/users/${userId}/role`, {
          method: 'PATCH',
          headers: authHeaders(bootstrapToken, true),
          body: JSON.stringify({ role: 'ADMIN' }),
        });
        console.log(`  ✅ ${u.email} recréé et promu ADMIN`);
      }
    } else {
      console.log(`  ✅ ${u.email} recréé`);
    }
  }
}

async function cleanupContactNotifications() {
// Nettoyage via HTTP — pas de connexion Prisma directe
  try {
    const adminToken = await login('admin@cinesdelices.fr', 'Admin1234!');
    const { payload } = await request('/api/admin/notifications', {
      headers: authHeaders(adminToken),
    });
    const notifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
    const toMark = notifications.filter(n =>
      String(n?.message || '').includes(visitorContactMessage) ||
      String(n?.message || '').includes(memberContactMessage)
    );
    for (const n of toMark) {
      await request(`/api/admin/notifications/${n.id}/read`, {
        method: 'PATCH',
        headers: authHeaders(adminToken),
      });
    }
  } catch {
    // Pas bloquant si le cleanup échoue
  }
}

async function run() {
  console.log(`Testing admin and categories API on ${API_BASE_URL}`);

  try {
    await ensureTestUsers();
    await cleanupContactNotifications();

    const memberToken = await login('marie@cinesdelices.fr', 'Member1234!');
    const adminToken = await login('admin@cinesdelices.fr', 'Admin1234!');

    const adminUsersResponse = await request('/api/admin/users', {
      headers: authHeaders(adminToken),
    });
    assert.equal(adminUsersResponse.response.status, 200, 'GET /api/admin/users should allow admins');
    assert.ok(Array.isArray(adminUsersResponse.payload), 'GET /api/admin/users should return an array');

    const unauthenticatedAdminUsers = await request('/api/admin/users');
    assert.equal(unauthenticatedAdminUsers.response.status, 401, 'GET /api/admin/users should reject missing token');

    const forbiddenAdminUsers = await request('/api/admin/users', {
      headers: authHeaders(memberToken),
    });
    assert.equal(forbiddenAdminUsers.response.status, 403, 'GET /api/admin/users should reject members');

    const createdUser = await registerUser();

    try {
      const unauthenticatedPromote = await request(`/api/admin/users/${createdUser.id}/role`, {
        method: 'PATCH',
        headers: authHeaders(null, true),
        body: JSON.stringify({ role: 'ADMIN' }),
      });
      assert.equal(
        unauthenticatedPromote.response.status,
        401,
        'PATCH /api/admin/users/:id/role should reject missing token',
      );

      const forbiddenPromote = await request(`/api/admin/users/${createdUser.id}/role`, {
        method: 'PATCH',
        headers: authHeaders(memberToken, true),
        body: JSON.stringify({ role: 'ADMIN' }),
      });
      assert.equal(
        forbiddenPromote.response.status,
        403,
        'PATCH /api/admin/users/:id/role should reject members',
      );

      const promoteResponse = await request(`/api/admin/users/${createdUser.id}/role`, {
        method: 'PATCH',
        headers: authHeaders(adminToken, true),
        body: JSON.stringify({ role: 'ADMIN' }),
      });
      assert.equal(promoteResponse.response.status, 200, 'PATCH /api/admin/users/:id/role should allow admins');
      assert.equal(promoteResponse.payload?.id, createdUser.id, 'Updated user id should match');
      assert.equal(promoteResponse.payload?.role, 'ADMIN', 'Updated user role should be ADMIN');

      const usersAfterPromotion = await request('/api/admin/users', {
        headers: authHeaders(adminToken),
      });
      assert.equal(usersAfterPromotion.response.status, 200, 'GET /api/admin/users should still succeed after role update');
      assert.equal(
        usersAfterPromotion.payload?.find((user) => user.id === createdUser.id)?.role,
        'ADMIN',
        'Updated role should be visible in the admin users list',
      );
    } finally {
      await deleteUserAsAdmin(adminToken, createdUser.id);
    }

    const publicGet = await request('/api/categories');
    assert.equal(publicGet.response.status, 200, 'GET /api/categories should be public');
    assert.ok(Array.isArray(publicGet.payload), 'GET /api/categories should return an array');

    const unauthenticatedAdminCategories = await request('/api/admin/categories');
    assert.equal(
      unauthenticatedAdminCategories.response.status,
      401,
      'GET /api/admin/categories should reject missing token',
    );

    const forbiddenAdminCategories = await request('/api/admin/categories', {
      headers: authHeaders(memberToken),
    });
    assert.equal(
      forbiddenAdminCategories.response.status,
      403,
      'GET /api/admin/categories should reject members',
    );

    const adminCategories = await request('/api/admin/categories', {
      headers: authHeaders(adminToken),
    });
    assert.equal(adminCategories.response.status, 200, 'GET /api/admin/categories should allow admins');
    assert.ok(Array.isArray(adminCategories.payload), 'GET /api/admin/categories should return an array');

    const notificationsBeforeVisitorContact = await getAdminNotifications(adminToken);

    const visitorContactResponse = await request('/api/contact', {
      method: 'POST',
      headers: authHeaders(null, true),
      body: JSON.stringify({
        nom: 'Visiteur',
        prenom: 'Test',
        email: `visiteur.${timestamp}@example.com`,
        demande: visitorContactMessage,
      }),
    });
    assert.equal(visitorContactResponse.response.status, 201, 'POST /api/contact should allow visitors');

    const notificationsAfterVisitorContact = await getAdminNotifications(adminToken);
    assert.equal(
      notificationsAfterVisitorContact.unreadCount,
      notificationsBeforeVisitorContact.unreadCount + 1,
      'A visitor contact message should create one unread admin notification',
    );

    const visitorNotification = notificationsAfterVisitorContact.notifications.find((notification) =>
      String(notification?.message || '').includes(visitorContactMessage),
    );
    assert.ok(visitorNotification, 'Visitor contact notification should be visible to the admin');
    assert.match(
      visitorNotification.message,
      /Visiteur Test Visiteur .*formulaire de contact/i,
      'Visitor contact notification should mention that the sender is a visitor',
    );

    const notificationsBeforeMemberContact = await getAdminNotifications(adminToken);

    const memberContactResponse = await request('/api/contact', {
      method: 'POST',
      headers: authHeaders(memberToken, true),
      body: JSON.stringify({
        nom: 'Dubois',
        prenom: 'Marie',
        email: 'marie@cinesdelices.fr',
        demande: memberContactMessage,
      }),
    });
    assert.equal(memberContactResponse.response.status, 201, 'POST /api/contact should allow authenticated members');

    const notificationsAfterMemberContact = await getAdminNotifications(adminToken);
    assert.equal(
      notificationsAfterMemberContact.unreadCount,
      notificationsBeforeMemberContact.unreadCount + 1,
      'A member contact message should create one unread admin notification',
    );

    const memberNotification = notificationsAfterMemberContact.notifications.find((notification) =>
      String(notification?.message || '').includes(memberContactMessage),
    );
    assert.ok(memberNotification, 'Member contact notification should be visible to the admin');
    assert.match(
      memberNotification.message,
      /Membre Marie Dubois .*formulaire de contact/i,
      'Member contact notification should mention that the sender is a member',
    );

    const unauthenticatedPost = await request('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createdCategoryName }),
    });
    assert.equal(unauthenticatedPost.response.status, 401, 'POST /api/categories should reject missing token');

    const forbiddenPost = await request('/api/categories', {
      method: 'POST',
      headers: authHeaders(memberToken, true),
      body: JSON.stringify({ name: createdCategoryName }),
    });
    assert.equal(forbiddenPost.response.status, 403, 'POST /api/categories should reject non-admin users');

    const createResponse = await request('/api/categories', {
      method: 'POST',
      headers: authHeaders(adminToken, true),
      body: JSON.stringify({ name: createdCategoryName, color: '#123456' }),
    });
    assert.equal(createResponse.response.status, 201, 'POST /api/categories should allow admins');
    assert.equal(createResponse.payload?.name, createdCategoryName, 'Created category name mismatch');

    const categoryId = createResponse.payload?.id;
    assert.ok(categoryId, 'Created category id is missing');

    const updateResponse = await request(`/api/categories/${categoryId}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken, true),
      body: JSON.stringify({ name: `${createdCategoryName} Updated`, color: '#654321' }),
    });
    assert.equal(updateResponse.response.status, 200, 'PATCH /api/categories/:id should allow admins');
    assert.equal(updateResponse.payload?.name, `${createdCategoryName} Updated`, 'Updated category name mismatch');

    const deleteResponse = await request(`/api/categories/${categoryId}`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
    });
    assert.equal(deleteResponse.response.status, 204, 'DELETE /api/categories/:id should allow admins');

    console.log('Admin users and categories API checks passed');
  } finally {
    await cleanupContactNotifications();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
