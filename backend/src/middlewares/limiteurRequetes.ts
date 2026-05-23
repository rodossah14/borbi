import rateLimit from 'express-rate-limit';

/**
 * R22 — 5 requêtes par fenêtre de 15 minutes sur les routes
 * sensibles d'authentification. Un fraudeur qui tente du brute force
 * sur /auth/connexion sera bloqué bien avant d'obtenir un succès.
 */
export const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    code: 'TROP_DE_TENTATIVES',
    message: 'Trop de tentatives. Patiente 15 minutes avant de réessayer.',
  },
});

/**
 * Limiteur générique pour toutes les autres routes : 100 req/min/IP.
 * Largement suffisant pour un usage humain et freine les scrappers.
 */
export const limiteurGlobal = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
