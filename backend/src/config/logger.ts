import pino from 'pino';
import { env } from './env';

/**
 * Logger applicatif. En dev, sortie lisible ; en prod, JSON structuré
 * pour faciliter l'agrégation par Render / un futur SIEM.
 */
export const journal = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Anonymisation systématique des champs sensibles dans les logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.motDePasse',
      '*.motDePasseHash',
      '*.refreshToken',
      '*.codeOtp',
    ],
    censor: '[REDACTED]',
  },
});
