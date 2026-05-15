import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { sendPasswordChangedMail } from '../lib/mailer.js';

// Helper : signe un JWT
function signToken(user) {
  return jwt.sign(
    { id: user.id, pseudo: user.pseudo, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7h'}
  );
}

// Helper : formate un user sans passwordHash
function safeUser(user) {
  const rest = { ...user };
  delete rest.passwordHash;
  return rest;
}

function normalizePseudoBase(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');

  return normalized;
}

async function generateUniquePseudo({ prenom }) {
  const base = normalizePseudoBase(prenom) || 'membre';
  const maxLength = 30;

  let candidate = base.slice(0, maxLength);
  if (candidate.length < 2) {
    candidate = `membre${Date.now().toString().slice(-4)}`;
  }

  let suffix = 1;
  while (await prisma.user.findUnique({ where: { pseudo: candidate } })) {
    const suffixText = String(suffix);
    const trimmedBase = base.slice(0, Math.max(2, maxLength - suffixText.length - 1));
    candidate = `${trimmedBase}-${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

// POST / api/auth/register
// ZOD va validé et normalisé email, pseudo et password
export const register = async (req, res) => {
  try {
    const { email, password, nom, prenom, pseudo: optionalPseudo } = req.body;

    const normalizedNom = String(nom || '').trim();
    const normalizedPrenom = String(prenom || '').trim();
    const providedPseudo = optionalPseudo ? String(optionalPseudo).trim() : null;
    const pseudo = providedPseudo || await generateUniquePseudo({ prenom: normalizedPrenom });

       // Vérification de l'unicité email + pseudo en une seule requête
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { pseudo }] },
    });

    if (existing) {
      const field = existing.email === email ? 'email' : 'pseudo';
      return res.status(409).json({ error: `Ce ${field} est déjà utilisé` });
    }

    // Hashage du MDP avec argon2
    const passwordHash = await argon2.hash(password);

    // 4. Création de l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        nom: normalizedNom,
        pseudo,
        passwordHash,
      },
    });

    // Génération du JWT et renvoi sans le hash
    const token = signToken(user);
    res.status(201).json({
      message: `Compte créé avec succès 🎬 `,
      token,
      user: safeUser(user),
    });
  } catch (error) {
    console.error('[register]', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// POST / api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Récupération de l'utilisateur
    const user = await prisma.user.findUnique({ where: { email } });

    // Vérification du MDP avec argon2
    const isValid = user && await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // La connexion ne doit pas échouer si l'audit lastLoginAt n'est pas disponible.
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (auditError) {
      console.warn('[login] impossible de mettre à jour lastLoginAt:', auditError.message);
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
    
  } catch (error) {
    console.error(`[login]`, error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
  

// GET / api/auth/logout
export const logout = (_req, res) => {
  res.json({ message: 'Déconnecté avec succès' })
};


// GET / api/auth/me
// Route protégée - req.user injecté par authMiddleware
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: {
        id:        true,
        email:     true,
        nom:       true,
        pseudo:    true,
        role:      true,
        createdAt: true,
        _count:    { select: { recipes: true } },
      },
    });

    if (!user) return res.status(404).json({ error : 'Utilisateur introuvable' }); 

    res.json(user);
    
  } catch (error) {
    console.error('[getMe]', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message })
  };
};

// PATCH / api/auth/me
// Zod valide au - un champ présent et email normalisé
export const updateMe = async (req, res) => {
  try {
    const { nom, pseudo, email } = req.body;

    const data = {};
    if (nom !== undefined) data.nom = nom;
    if (pseudo) data.pseudo = pseudo;
    if (email) data.email = email;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id:        true,
        email:     true,
        nom:       true,
        pseudo:    true,
        role:      true,
        createdAt: true,
        },
      });

      res.json({ message: 'Profil mis à jour', user: updated });

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email ou pseudo déjà utilisé' });
    }
    console.error('[updateMe]', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// PUT /api/auth/me/password
export const updateMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const isCurrentPasswordValid = await argon2.verify(user.passwordHash, currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Le mot de passe actuel est incorrect' });
    }

    const passwordHash = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    await sendPasswordChangedMail(req.user.email);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (error) {
    console.error('[updateMyPassword]', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// DELETE /api/auth/me
// Sécurisation de deleteMe

export const deleteMe = async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      // Supprimer les recettes DRAFT et PENDING (plus utiles sans auteur)
      await tx.recipe.deleteMany({
        where: {
          userId: req.user.id,
          status: { in: ['DRAFT', 'PENDING'] },
        },
      });

      // Supprimer le user
      // → SetNull sur les recettes PUBLISHED (userId → null)
      // → Cascade sur les notifications
      await tx.user.delete({ where: { id: req.user.id } });
    });

    res.json({ message: 'Compte supprimé' });

  } catch (error) {
    console.error('[deleteMe]', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
