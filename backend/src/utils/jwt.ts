import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { journal } from '../config/logger';

/**
 * R21 — JWT à courte durée de vie (15 min) pour l'accès aux ressources
 * + Refresh Token longue durée (7 j) stocké en cookie httpOnly.
 *
 * Deux secrets DISTINCTS sont utilisés afin qu'un access token volé ne
 * permette pas de forger un refresh token, et inversement.
 */

const DUREE_VIE_ACCESS = '15m';
const DUREE_VIE_REFRESH = '7d';

/** Émetteur unique pour les deux types de jetons — facilite la traçabilité. */
const EMETTEUR = 'borbi-tech';

export interface ChargeJetonAcces extends JwtPayload {
  sub: string;            // identifiant utilisateur
  typeCompte: string;     // rôle principal (CLIENT, COMMERCANT, LIVREUR, ADMINISTRATEUR)
  type: 'acces';
}

export interface ChargeJetonRafraichissement extends JwtPayload {
  sub: string;
  type: 'rafraichissement';
}

function signer(charge: object, secret: string, dureeVie: SignOptions['expiresIn']): string {
  return jwt.sign(charge, secret, {
    expiresIn: dureeVie,
    issuer: EMETTEUR,
    algorithm: 'HS256',
  });
}

export function genererAccessToken(userId: string, typeCompte: string): string {
  return signer(
    { sub: userId, typeCompte, type: 'acces' },
    env.JWT_SECRET,
    DUREE_VIE_ACCESS,
  );
}

export function genererRefreshToken(userId: string): string {
  return signer(
    { sub: userId, type: 'rafraichissement' },
    env.JWT_REFRESH_SECRET,
    DUREE_VIE_REFRESH,
  );
}

/**
 * Vérifie la signature ET le `type` interne du jeton. Un refresh token
 * présenté comme access token est rejeté — ce contrôle bloque les
 * attaques par confusion de jeton.
 */
function verifier<T extends ChargeJetonAcces | ChargeJetonRafraichissement>(
  jeton: string,
  secret: string,
  typeAttendu: T['type'],
): T | null {
  try {
    const charge = jwt.verify(jeton, secret, { issuer: EMETTEUR }) as JwtPayload;
    if (typeof charge !== 'object' || charge === null || (charge as { type?: string }).type !== typeAttendu) {
      return null;
    }
    return charge as T;
  } catch (erreur) {
    // Token expiré, signature invalide, format corrompu — on ne distingue
    // pas pour ne pas aider un attaquant à diagnostiquer son problème.
    // Le débogage légitime se fait via les logs serveur.
    journal.debug({ err: (erreur as Error).name }, 'Échec vérification jeton');
    return null;
  }
}

export function verifierAccessToken(jeton: string): ChargeJetonAcces | null {
  return verifier<ChargeJetonAcces>(jeton, env.JWT_SECRET, 'acces');
}

export function verifierRefreshToken(jeton: string): ChargeJetonRafraichissement | null {
  return verifier<ChargeJetonRafraichissement>(jeton, env.JWT_REFRESH_SECRET, 'rafraichissement');
}
