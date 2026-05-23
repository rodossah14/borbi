import bcrypt from 'bcrypt';
import { env } from '../config/env';

/**
 * R20 — bcrypt coût 12 minimum. Cette fonction est le seul point
 * d'entrée légitime pour hacher un mot de passe côté Bor-Bi.
 */
export async function hacherMotDePasse(motDePasseClair: string): Promise<string> {
  return bcrypt.hash(motDePasseClair, env.BCRYPT_ROUNDS);
}

export async function verifierMotDePasse(motDePasseClair: string, empreinte: string): Promise<boolean> {
  return bcrypt.compare(motDePasseClair, empreinte);
}
