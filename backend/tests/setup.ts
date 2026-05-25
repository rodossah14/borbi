// Variables d'environnement minimales pour que `config/env.ts` (zod)
// ne plante pas au require. Chargées AVANT tout `import` des sources.

process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.TZ = 'Africa/Dakar';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
// L'URL fictive bascule notre wrapper Redis en mode mémoire — parfait pour
// les tests d'OTP et de refresh token sans dépendre d'Upstash.
process.env.REDIS_URL = 'redis://default:test@fictif.upstash.io:6379';
process.env.JWT_SECRET = 'test_secret_de_64_caracteres_minimum_pour_satisfaire_la_validation_zod';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_de_64_caracteres_minimum_pour_satisfaire_zod_xx';
process.env.BCRYPT_ROUNDS = '12';
process.env.CHIFFREMENT_CLE_AES = '0000000000000000000000000000000000000000000000000000000000000000';
process.env.URL_FRONTEND = 'http://localhost:5173';
