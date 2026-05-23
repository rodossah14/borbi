/**
 * Carte fidélité universelle Bor-Bi : 1 point gagné par tranche
 * de 500 FCFA dépensée. 100 points = 500 FCFA de réduction.
 * Quatre niveaux progressifs avec avantages cumulatifs.
 */

export type NiveauFidelite = 'BRONZE' | 'ARGENT' | 'OR' | 'PLATINE';

export interface PaliersFidelite {
  niveau: NiveauFidelite;
  pointsMinimum: number;
  /** Multiplicateur de points appliqué aux achats */
  multiplicateurPoints: number;
  avantages: string[];
}

export const PALIERS_FIDELITE: readonly PaliersFidelite[] = [
  {
    niveau: 'BRONZE',
    pointsMinimum: 0,
    multiplicateurPoints: 1,
    avantages: ['Carte fidélité activée', 'Promotions hebdomadaires'],
  },
  {
    niveau: 'ARGENT',
    pointsMinimum: 1_000,
    multiplicateurPoints: 1.2,
    avantages: ['+20% de points', 'Livraison réduite'],
  },
  {
    niveau: 'OR',
    pointsMinimum: 5_000,
    multiplicateurPoints: 1.5,
    avantages: ['+50% de points', 'Support prioritaire', 'Accès ventes privées'],
  },
  {
    niveau: 'PLATINE',
    pointsMinimum: 20_000,
    multiplicateurPoints: 2,
    avantages: ['Points doublés', 'Conciergerie 24/7', 'Cashback mensuel'],
  },
];

export const POINTS_PAR_TRANCHE_FCFA = 1;       // 1 point gagné…
export const TRANCHE_DEPENSE_FCFA   = 500;      // …par tranche de 500 FCFA
export const VALEUR_100_POINTS_FCFA = 500;      // 100 points → 500 FCFA de réduction
