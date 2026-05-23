import type { CodeDevise } from '../constantes/devises';

export type TypeTransaction =
  | 'VENTE'
  | 'LIVRAISON'
  | 'TRANSFERT_NATIONAL'
  | 'TRANSFERT_INTERNATIONAL'
  | 'REMBOURSEMENT'
  | 'ABONNEMENT_MENSUEL';

export type StatutTransaction =
  | 'EN_ATTENTE'
  | 'VALIDEE'
  | 'ECHOUEE'
  | 'REMBOURSEE'
  | 'LITIGE';

export interface Transaction {
  id: string;
  type: TypeTransaction;
  statut: StatutTransaction;
  /** Montant total payé par l'acheteur, dans sa devise locale */
  montantBrut: number;
  devise: CodeDevise;
  /** Conversion en XOF pour la comptabilité interne */
  montantBrutXof: number;
  /** Commission invisible prélevée par Bor-Bi (en XOF) */
  commissionXof: number;
  /** Montant reversé au commerçant ou bénéficiaire (en XOF) */
  montantNetXof: number;
  /** Empreinte SHA-256 pour conformité OHADA (R-OHADA) */
  empreinteSha256: string;
  idEmetteur: string;
  idDestinataire: string | null;
  dateCreation: Date;
}
