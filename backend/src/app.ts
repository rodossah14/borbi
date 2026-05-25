import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { journal } from './config/logger';
import { gestionnaireErreurs } from './middlewares/gestionnaireErreurs';
import { limiteurGlobal } from './middlewares/limiteurRequetes';
import { routesAuth } from './routes/auth.routes';
import { routesEtablissements } from './routes/etablissements.routes';
import { routesProduits } from './routes/produits.routes';
import { routesSante } from './routes/sante.routes';

/**
 * Construction de l'application Express. Séparée de `index.ts` pour
 * pouvoir l'importer dans les tests d'intégration sans démarrer
 * réellement le serveur HTTP.
 */
export function construireApplication(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render et Vercel sont derrière un proxy

  app.use(helmet());
  app.use(cors({ origin: env.URL_FRONTEND, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  // cookie-parser doit être monté AVANT toute route qui lit req.cookies
  // (en particulier /api/v1/auth/rafraichir-token)
  app.use(cookieParser());
  app.use(pinoHttp({ logger: journal }));
  app.use(limiteurGlobal);

  app.use('/api', routesSante);
  app.use('/api/v1/auth', routesAuth);
  app.use('/api/v1/etablissements', routesEtablissements);
  app.use('/api/v1/produits', routesProduits);

  // Toujours le dernier middleware monté
  app.use(gestionnaireErreurs);

  return app;
}
