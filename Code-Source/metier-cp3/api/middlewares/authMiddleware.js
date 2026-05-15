// Vérification du token JWT dans le header Authorization
// Utilisation dans un router

import jwt from 'jsonwebtoken';
import { prisma } from '../api/lib/prisma.js';

export const authMiddleware = async (req, res, next) => {
  // Recherche du header Authorization au format attendu
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou mal formaté' });
  }

  const token = authHeader.split(' ')[1]; //partie après Bearer

  try {
    // Vérification de la signature et de l'expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Le token peut rester valide après un reset DB: on vérifie que le user existe encore.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        pseudo: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Session invalide. Merci de vous reconnecter.' });
    }

    // Injection des infos dans req.user, qui sera ensuite accessible dans tous les controllers :
    // req.user.id, req.user.role
    req.user = user;

    next();
  } catch {
    // jwt.verify lance une erreur si :
    // - la signature est invalide (token faslsifié)
    // - le token est expiré
    return res.status(401).json({ error: 'Token invalide ou expiré'})
  }
};
