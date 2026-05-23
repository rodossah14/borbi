import { randomInt } from 'node:crypto';

/**
 * Code OTP à 6 chiffres pour validation de paiement et changement
 * d'email (R24). On utilise `crypto.randomInt` (CSPRNG) pour
 * empêcher toute prédiction par un attaquant ayant observé
 * suffisamment de codes.
 */
export function genererCodeOtp(): string {
  const code = randomInt(0, 1_000_000);
  return code.toString().padStart(6, '0');
}

export const DUREE_VIE_OTP_SECONDES = 5 * 60; // 5 minutes
