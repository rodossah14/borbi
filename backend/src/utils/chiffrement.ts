import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env';

/**
 * R23 — chiffrement AES-256-GCM pour les documents d'identité
 * avant envoi vers S3/R2. Format de sortie : iv|tag|cipher en base64
 * concaténés par des deux-points, lisibles d'un coup d'œil.
 */

const ALGO = 'aes-256-gcm';
const TAILLE_IV_OCTETS = 12; // GCM recommande 12

function obtenirCle(): Buffer {
  // La clé en env est hex 64 caractères = 32 octets exactement
  return Buffer.from(env.CHIFFREMENT_CLE_AES, 'hex');
}

export interface PayloadChiffre {
  iv: string;
  tag: string;
  donneesChiffrees: string;
}

export function chiffrerDocument(contenuClair: Buffer): PayloadChiffre {
  const iv = randomBytes(TAILLE_IV_OCTETS);
  const chiffreur = createCipheriv(ALGO, obtenirCle(), iv);
  const donneesChiffrees = Buffer.concat([chiffreur.update(contenuClair), chiffreur.final()]);
  const tag = chiffreur.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    donneesChiffrees: donneesChiffrees.toString('base64'),
  };
}

export function dechiffrerDocument(payload: PayloadChiffre): Buffer {
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const donnees = Buffer.from(payload.donneesChiffrees, 'base64');

  const dechiffreur = createDecipheriv(ALGO, obtenirCle(), iv);
  dechiffreur.setAuthTag(tag);
  return Buffer.concat([dechiffreur.update(donnees), dechiffreur.final()]);
}
