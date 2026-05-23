/**
 * Devises locales acceptées. Le XOF (franc CFA Ouest) est la devise
 * interne de référence : tous les calculs de commission, fidélité et
 * comptabilité interne se font en XOF, peu importe la devise affichée.
 */

export type CodeDevise =
  | 'XOF' | 'XAF' | 'NGN' | 'GHS' | 'CDF' | 'AOA'
  | 'GNF' | 'GMD' | 'LRD' | 'SLL' | 'MRU' | 'CVE' | 'STN';

export interface Devise {
  code: CodeDevise;
  symbole: string;
  nom: string;
  /** Nombre de décimales à afficher (la plupart des devises africaines : 0) */
  decimales: number;
}

export const DEVISES: Record<CodeDevise, Devise> = {
  XOF: { code: 'XOF', symbole: 'FCFA', nom: 'Franc CFA Ouest', decimales: 0 },
  XAF: { code: 'XAF', symbole: 'FCFA', nom: 'Franc CFA Centrale', decimales: 0 },
  NGN: { code: 'NGN', symbole: '₦',    nom: 'Naira',         decimales: 2 },
  GHS: { code: 'GHS', symbole: '₵',    nom: 'Cedi',          decimales: 2 },
  CDF: { code: 'CDF', symbole: 'FC',   nom: 'Franc congolais', decimales: 0 },
  AOA: { code: 'AOA', symbole: 'Kz',   nom: 'Kwanza',        decimales: 2 },
  GNF: { code: 'GNF', symbole: 'FG',   nom: 'Franc guinéen', decimales: 0 },
  GMD: { code: 'GMD', symbole: 'D',    nom: 'Dalasi',        decimales: 2 },
  LRD: { code: 'LRD', symbole: 'L$',   nom: 'Dollar libérien', decimales: 2 },
  SLL: { code: 'SLL', symbole: 'Le',   nom: 'Leone',         decimales: 0 },
  MRU: { code: 'MRU', symbole: 'UM',   nom: 'Ouguiya',       decimales: 2 },
  CVE: { code: 'CVE', symbole: '$',    nom: 'Escudo capverdien', decimales: 2 },
  STN: { code: 'STN', symbole: 'Db',   nom: 'Dobra',         decimales: 2 },
};

/** Devise de référence pour toute la comptabilité interne. */
export const DEVISE_REFERENCE: CodeDevise = 'XOF';
