// Filet de sécurité global pour toutes les erreurs non catchées
// A la fin dans le fichier index, après toutes les routes

export const errorMiddleware = (err, req, res, _next) => {
  console.error('❌ Erreur non gérée :', err);

  const status  = err.statusCode || 500;
  const message = err.message    || 'Erreur interne du serveur';

  res.status(status).json({ error: message });
};
