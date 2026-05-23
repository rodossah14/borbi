import { TAUX_COMMISSION } from '@borbi/shared';

/**
 * Commission invisible : prélevée sur le montant brut payé par le
 * client. Le résultat est arrondi au franc CFA entier supérieur,
 * car aucune devise africaine prise en charge ici n'accepte de
 * décimales pour le franc — et on préfère qu'un arrondi favorise
 * légèrement la plateforme plutôt que créer un découvert.
 */

export interface ResultatCommission {
  /** Montant total payé par le client */
  montantBrutXof: number;
  /** Commission prélevée par Bor-Bi (invisible côté client) */
  commissionXof: number;
  /** Montant reversé au vendeur ou bénéficiaire */
  montantNetXof: number;
}

function arrondirAuFrancSuperieur(valeur: number): number {
  return Math.ceil(valeur);
}

function appliquerTaux(montantBrutXof: number, taux: number): ResultatCommission {
  const commissionXof = arrondirAuFrancSuperieur(montantBrutXof * taux);
  return {
    montantBrutXof,
    commissionXof,
    montantNetXof: montantBrutXof - commissionXof,
  };
}

export function calculerCommissionVente(montantBrutXof: number): ResultatCommission {
  return appliquerTaux(montantBrutXof, TAUX_COMMISSION.vente);
}

export function calculerCommissionLivraison(montantBrutXof: number): ResultatCommission {
  return appliquerTaux(montantBrutXof, TAUX_COMMISSION.livraison);
}

export function calculerCommissionTransfertNational(montantBrutXof: number): ResultatCommission {
  return appliquerTaux(montantBrutXof, TAUX_COMMISSION.transfertNational);
}

/**
 * Transfert international = commission de base + surcharge de change
 * appliquée en cascade sur le brut.
 */
export function calculerCommissionTransfertInternational(montantBrutXof: number): ResultatCommission {
  const tauxTotal = TAUX_COMMISSION.transfertInternational + TAUX_COMMISSION.changeInternational;
  return appliquerTaux(montantBrutXof, tauxTotal);
}
