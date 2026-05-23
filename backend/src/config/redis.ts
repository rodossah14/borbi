import Redis from 'ioredis';
import { env } from './env';
import { journal } from './logger';

/**
 * Client Redis (Upstash en production). Tant que l'URL pointe vers le
 * hôte fictif `fictif.upstash.io`, on retourne un client factice en
 * mémoire (avec TTL respecté) — pratique pour développer le flow
 * d'inscription/OTP sans dépendre d'un service externe.
 *
 * À NE PAS UTILISER EN PRODUCTION : la mémoire est perdue à chaque
 * redémarrage et ne se partage pas entre instances.
 */

export interface ClientRedisCompatible {
  get(cle: string): Promise<string | null>;
  /**
   * Signature compatible ioredis : `set(cle, valeur, 'EX', secondes)`.
   * Si `mode` vaut 'EX', la clé expire automatiquement après `duree` secondes.
   */
  set(cle: string, valeur: string, mode?: string, duree?: number): Promise<'OK'>;
  del(cle: string): Promise<number>;
  incr(cle: string): Promise<number>;
  expire(cle: string, secondes: number): Promise<number>;
  ping(): Promise<'PONG'>;
}

function creerClientFactice(): ClientRedisCompatible {
  journal.warn(
    'Redis : URL fictive détectée, utilisation d\'un client en mémoire ' +
      '(à NE JAMAIS activer en production)',
  );

  // Mappe clé → { valeur, expireA (ms epoch) | null }
  const reserve = new Map<string, { valeur: string; expireA: number | null }>();

  function entreeValide(cle: string): { valeur: string; expireA: number | null } | null {
    const entree = reserve.get(cle);
    if (!entree) return null;
    if (entree.expireA !== null && entree.expireA <= Date.now()) {
      reserve.delete(cle);
      return null;
    }
    return entree;
  }

  return {
    async get(cle) {
      return entreeValide(cle)?.valeur ?? null;
    },
    async set(cle, valeur, mode, duree) {
      const expireA = mode === 'EX' && typeof duree === 'number' ? Date.now() + duree * 1000 : null;
      reserve.set(cle, { valeur, expireA });
      return 'OK';
    },
    async del(cle) {
      return reserve.delete(cle) ? 1 : 0;
    },
    async incr(cle) {
      const entree = entreeValide(cle);
      const courant = entree ? Number.parseInt(entree.valeur, 10) || 0 : 0;
      const suivant = courant + 1;
      reserve.set(cle, { valeur: suivant.toString(), expireA: entree?.expireA ?? null });
      return suivant;
    },
    async expire(cle, secondes) {
      const entree = reserve.get(cle);
      if (!entree) return 0;
      entree.expireA = Date.now() + secondes * 1000;
      return 1;
    },
    async ping() {
      return 'PONG';
    },
  };
}

const utiliserClientFactice = env.REDIS_URL.includes('fictif.upstash.io');

export const cache: ClientRedisCompatible = utiliserClientFactice
  ? creerClientFactice()
  : (new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    }) as unknown as ClientRedisCompatible);
