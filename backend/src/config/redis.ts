import Redis from 'ioredis';
import { env } from './env';
import { journal } from './logger';

/**
 * Client Redis (Upstash en production). Tant que l'URL pointe vers le
 * hôte fictif `fictif.upstash.io`, on retourne un client factice
 * qui no-op sur toutes les opérations — pratique pour développer
 * sans dépendre d'un service externe.
 */

interface ClientRedisFactice {
  get: (cle: string) => Promise<string | null>;
  set: (cle: string, valeur: string, mode?: string, duree?: number) => Promise<'OK'>;
  del: (cle: string) => Promise<number>;
  incr: (cle: string) => Promise<number>;
  expire: (cle: string, secondes: number) => Promise<number>;
  ping: () => Promise<'PONG'>;
}

function creerClientFactice(): ClientRedisFactice {
  journal.warn('Redis : URL fictive détectée, utilisation d\'un client factice (les caches sont désactivés)');
  return {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    incr: async () => 1,
    expire: async () => 1,
    ping: async () => 'PONG',
  };
}

const utiliserClientFactice = env.REDIS_URL.includes('fictif.upstash.io');

export const cache: Redis | ClientRedisFactice = utiliserClientFactice
  ? creerClientFactice()
  : new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
