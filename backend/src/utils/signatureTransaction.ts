import { createHash } from 'node:crypto';

/**
 * R-OHADA — chaque transaction reçoit une empreinte SHA-256
 * calculée à partir de ses champs essentiels + l'empreinte de
 * la transaction précédente. Ce chaînage rend toute modification
 * a posteriori détectable lors d'un contrôle.
 */

export interface ChampsSignatureTransaction {
  id: string;
  type: string;
  montantBrutXof: number;
  commissionXof: number;
  idEmetteur: string;
  idDestinataire: string | null;
  horodatageIso: string;
}

export function calculerEmpreinteTransaction(
  champs: ChampsSignatureTransaction,
  empreintePrecedente: string | null,
): string {
  const charge = [
    champs.id,
    champs.type,
    champs.montantBrutXof.toString(),
    champs.commissionXof.toString(),
    champs.idEmetteur,
    champs.idDestinataire ?? 'AUCUN',
    champs.horodatageIso,
    empreintePrecedente ?? 'GENESIS',
  ].join('|');

  return createHash('sha256').update(charge, 'utf8').digest('hex');
}
