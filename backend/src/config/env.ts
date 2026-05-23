import { config as chargerDotenv } from 'dotenv';
import { z } from 'zod';

chargerDotenv();

/**
 * Validation stricte des variables d'environnement au démarrage.
 * Mieux vaut planter immédiatement avec un message clair que
 * découvrir un secret manquant en pleine transaction.
 */
const schemaEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  TZ: z.string().default('Africa/Dakar'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CHIFFREMENT_CLE_AES: z.string().length(64, 'CHIFFREMENT_CLE_AES doit faire 64 caractères hex (32 octets)'),

  URL_FRONTEND: z.string().url().default('http://localhost:5173'),

  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_NUMERO_EXPEDITEUR: z.string().optional().default(''),

  WAVE_API_KEY: z.string().optional().default(''),
  WAVE_WEBHOOK_SECRET: z.string().optional().default(''),
  WAVE_BASE_URL: z.string().url().default('https://api.wave.com'),

  CINETPAY_API_KEY: z.string().optional().default(''),
  CINETPAY_SITE_ID: z.string().optional().default(''),
  CINETPAY_SECRET_KEY: z.string().optional().default(''),

  STOCKAGE_FOURNISSEUR: z.enum(['s3', 'r2']).default('r2'),
  STOCKAGE_ENDPOINT: z.string().optional().default(''),
  STOCKAGE_BUCKET: z.string().optional().default(''),
  STOCKAGE_ACCESS_KEY: z.string().optional().default(''),
  STOCKAGE_SECRET_KEY: z.string().optional().default(''),
  STOCKAGE_REGION: z.string().default('auto'),

  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODELE: z.string().default('claude-haiku-4-5-20251001'),

  DEEPL_API_KEY: z.string().optional().default(''),

  GOD_MODE_IPS_AUTORISEES: z.string().optional().default(''),
});

const resultat = schemaEnv.safeParse(process.env);

if (!resultat.success) {
  // Affichage lisible des erreurs avant de planter — un dev qui démarre
  // le backend la première fois doit comprendre ce qu'il lui manque.
  // eslint-disable-next-line no-console
  console.error('❌ Variables d\'environnement invalides :');
  // eslint-disable-next-line no-console
  console.error(resultat.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = resultat.data;

export const ipsGodMode: readonly string[] = env.GOD_MODE_IPS_AUTORISEES
  .split(',')
  .map((ip) => ip.trim())
  .filter((ip) => ip.length > 0);
