import { construireApplication } from './app';
import { env } from './config/env';
import { journal } from './config/logger';

/**
 * Point d'entrée du backend Bor-Bi Tech. Démarre Express, écoute
 * les signaux pour s'arrêter proprement (important sur Render qui
 * envoie SIGTERM lors d'un redéploiement).
 */

const app = construireApplication();

const serveur = app.listen(env.PORT, () => {
  journal.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 Backend Bor-Bi démarré');
});

function arreterProprement(signal: string): void {
  journal.info({ signal }, 'Arrêt en cours…');
  serveur.close(() => {
    journal.info('Serveur arrêté — au revoir');
    process.exit(0);
  });
}

process.on('SIGTERM', () => arreterProprement('SIGTERM'));
process.on('SIGINT', () => arreterProprement('SIGINT'));
