import rateLimit from 'express-rate-limit';

// ============================================================
// RATE LIMITER — Routes TMDB uniquement
// ============================================================
//
// Pourquoi un limiter dédié aux routes TMDB ?
//   - Le quota TMDB est limité (environ 40 req/s sur le plan gratuit)
//   - Un bot ou un utilisateur malveillant pourrait spammer /api/medias/search
//     et épuiser le quota pour tout le monde
//   - Le rate limit global de l'app (si tu en as un) peut être plus permissif
//     car les routes internes (auth, recipes) sont moins coûteuses
//
// Configuration :
//   - windowMs : fenêtre de 1 minute
//   - max : 30 requêtes par fenêtre par IP
//   - standardHeaders : envoie les headers RateLimit-* (RateLimit-Remaining, etc.)
//   - legacyHeaders : désactive les vieux headers X-RateLimit-*
// ============================================================

const tmdbRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requêtes max par IP par fenêtre
  standardHeaders: true,
  legacyHeaders: false,

  // Message renvoyé quand la limite est atteinte
  message: {
    message: 'La salle de cinéma est pleine. Revenez dans quelques instants pour une autre séance.',
  },
});

export default tmdbRateLimiter;
