import { randomInt } from 'node:crypto';
import { cache } from '../config/redis';

/**
 * Code OTP à 6 chiffres pour validation d'inscription, de paiement
 * et de changement d'email (R24). Source d'entropie : `crypto.randomInt`
 * (CSPRNG) — empêche toute prédiction par un attaquant ayant observé
 * suffisamment de codes précédents.
 */

export const DUREE_VIE_OTP_SECONDES = 10 * 60; // 10 minutes — généreux mais raisonnable

/**
 * Préfixe pour les clés Redis stockant un OTP en attente de vérification.
 * Format final : `otp:+221701234567`
 */
const PREFIXE_CLE_OTP = 'otp:';

export function genererOTP(): string {
  // randomInt(0, 1_000_000) donne un entier dans [0, 999 999]. On force
  // le padding à 6 chiffres pour éviter de divulguer la longueur réelle
  // (ex: '042157' au lieu de '42157').
  const code = randomInt(0, 1_000_000);
  return code.toString().padStart(6, '0');
}

export async function stockerOTP(telephone: string, otp: string): Promise<void> {
  await cache.set(`${PREFIXE_CLE_OTP}${telephone}`, otp, 'EX', DUREE_VIE_OTP_SECONDES);
}

/**
 * Compare l'OTP reçu avec celui stocké côté serveur. En cas de
 * correspondance, la clé est SUPPRIMÉE immédiatement — un OTP ne
 * peut servir qu'une seule fois. Si l'OTP est expiré ou inexistant,
 * la fonction retourne `false` sans détailler la raison (un attaquant
 * n'a pas à savoir si un code a expiré ou s'il n'a jamais existé).
 */
export async function verifierEtConsommerOTP(telephone: string, otp: string): Promise<boolean> {
  const cle = `${PREFIXE_CLE_OTP}${telephone}`;
  const otpStocke = await cache.get(cle);

  if (otpStocke === null) {
    // OTP expiré ou jamais émis pour ce numéro
    return false;
  }

  if (otpStocke !== otp) {
    // Mauvais code — on ne supprime pas tout de suite, l'utilisateur a
    // droit à plusieurs essais avant expiration naturelle (rate limiter
    // R22 en amont empêche le brute force massif)
    return false;
  }

  // OTP usage unique — consommé dès la première vérification correcte
  await cache.del(cle);
  return true;
}
