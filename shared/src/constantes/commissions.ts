/**
 * Modèle économique invisible : l'acheteur ne voit JAMAIS la commission.
 * Elle est intégrée au prix affiché par le vendeur ou prélevée sur
 * le montant transféré côté plateforme.
 *
 * Taux exprimés en décimal (0.015 = 1,5 %).
 */

export const TAUX_COMMISSION = {
  /** Commission sur chaque vente conclue dans la marketplace */
  vente: 0.015,
  /** Commission sur les courses de livraison */
  livraison: 0.02,
  /** Transfert P2P national */
  transfertNational: 0.005,
  /** Transfert P2P international (FCFA → FCFA cross-zone, ou autre devise) */
  transfertInternational: 0.015,
  /** Surcharge de change appliquée en plus pour les transferts cross-devise */
  changeInternational: 0.005,
  /** Parrainage : cashback versé au parrain sur les achats du filleul */
  parrainage: 0.02,
} as const;

export const DUREE_PARRAINAGE_MOIS = 3;

/**
 * Forfaits récurrents proposés aux commerçants (montants en FCFA / mois).
 */
export const FORFAITS_MENSUELS_FCFA = {
  standardTelephonique: 1_000,
  cvPremium: 2_000,
  cvDesigner: 15_000,
} as const;
