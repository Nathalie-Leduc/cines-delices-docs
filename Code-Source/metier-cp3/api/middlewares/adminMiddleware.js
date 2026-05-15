// Vérification que l'utilisateur a le rôle ADMIN
// Dois toujours être utilisé APRES authMidlleware
// car il a besoin de req.user (injecté par authMiddleware)
// Utilisation dans un router

export const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs'});
  }
  next();
};