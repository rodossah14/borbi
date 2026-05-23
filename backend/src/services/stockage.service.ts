import { env } from '../config/env';
import { journal } from '../config/logger';
import { chiffrerDocument } from '../utils/chiffrement';

/**
 * Wrapper S3/R2. Les documents d'identité passent OBLIGATOIREMENT par
 * chiffrerDocument() avant d'être téléversés (R23). Tant que le
 * fournisseur n'est pas configuré, on simule l'upload pour débloquer
 * le développement local.
 */

export interface ResultatTeleversement {
  cle: string;
  url: string | null;
  modeSimulation: boolean;
}

export async function televerserDocumentIdentite(
  contenuClair: Buffer,
  cleObjet: string,
): Promise<ResultatTeleversement> {
  const charge = chiffrerDocument(contenuClair);

  const fournisseurConfigure = env.STOCKAGE_ENDPOINT && env.STOCKAGE_BUCKET && env.STOCKAGE_ACCESS_KEY;
  if (!fournisseurConfigure) {
    journal.warn(
      { cle: cleObjet, octetsChiffres: charge.donneesChiffrees.length },
      '[STOCKAGE-SIMULATION] S3/R2 non configuré — document chiffré non envoyé',
    );
    return { cle: cleObjet, url: null, modeSimulation: true };
  }

  throw new Error('Téléversement S3/R2 non encore implémenté — installer @aws-sdk/client-s3 quand le bucket sera provisionné');
}
