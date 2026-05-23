import { Router } from 'express';
import { prisma } from '../config/prisma';
import { cache } from '../config/redis';

/**
 * Healthcheck à destination de Render et des monitorings externes.
 * Vérifie que Postgres répond et que Redis (ou son client factice)
 * ping correctement. Renvoie 200 si tout va bien, 503 sinon.
 */

export const routesSante: Router = Router();

routesSante.get('/sante', async (_requete, reponse) => {
  const debut = Date.now();
  const verifications: Record<string, 'ok' | 'ko'> = {
    postgres: 'ko',
    redis: 'ko',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    verifications.postgres = 'ok';
  } catch {
    verifications.postgres = 'ko';
  }

  try {
    await cache.ping();
    verifications.redis = 'ok';
  } catch {
    verifications.redis = 'ko';
  }

  const toutEstOk = Object.values(verifications).every((v) => v === 'ok');
  reponse.status(toutEstOk ? 200 : 503).json({
    statut: toutEstOk ? 'OK' : 'DEGRADE',
    verifications,
    dureeMs: Date.now() - debut,
    horodatage: new Date().toISOString(),
  });
});
