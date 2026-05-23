/**
 * URL racine de l'API backend. Configurable par environnement
 * via `VITE_URL_API` (cf. .env.example).
 */
export const URL_API = import.meta.env.VITE_URL_API ?? 'http://localhost:4000/api';
