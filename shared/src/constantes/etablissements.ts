/**
 * Un même utilisateur peut piloter plusieurs établissements
 * de natures différentes (R1 — Multi-établissements).
 * Exemple : un patron de PME possède un restaurant + un entrepôt
 * + une boutique en ligne. Bascule via un sélecteur dans l'app.
 */

export type TypeEtablissement =
  | 'BOUTIQUE'
  | 'RESTAURANT'
  | 'HOTEL'
  | 'ENTREPOT'
  | 'KIOSQUE'
  | 'SHOWROOM'
  | 'PRESTATAIRE'
  | 'PHARMACIE'
  | 'ARTISAN';

export type StatutEtablissement = 'ACTIF' | 'EN_PAUSE' | 'SUSPENDU' | 'SUPPRIME';

export interface InformationsTypeEtablissement {
  type: TypeEtablissement;
  libelle: string;
  iconeSymbol: string; // Material Symbols Outlined
  /** Documents légaux exigés pour pouvoir encaisser */
  documentsRequis: string[];
}

export const TYPES_ETABLISSEMENT: Record<TypeEtablissement, InformationsTypeEtablissement> = {
  BOUTIQUE:    { type: 'BOUTIQUE',    libelle: 'Boutique',            iconeSymbol: 'storefront',     documentsRequis: ['NINEA', 'CNI'] },
  RESTAURANT:  { type: 'RESTAURANT',  libelle: 'Restaurant',          iconeSymbol: 'restaurant',     documentsRequis: ['NINEA', 'CNI', 'Agrément hygiène'] },
  HOTEL:       { type: 'HOTEL',       libelle: 'Hôtel / Auberge',     iconeSymbol: 'hotel',          documentsRequis: ['NINEA', 'Agrément tourisme'] },
  ENTREPOT:    { type: 'ENTREPOT',    libelle: 'Entrepôt / Grossiste', iconeSymbol: 'warehouse',     documentsRequis: ['NINEA', 'CNI'] },
  KIOSQUE:     { type: 'KIOSQUE',     libelle: 'Kiosque ambulant',    iconeSymbol: 'local_mall',     documentsRequis: ['CNI'] },
  SHOWROOM:    { type: 'SHOWROOM',    libelle: 'Showroom',            iconeSymbol: 'storefront',     documentsRequis: ['NINEA', 'CNI'] },
  PRESTATAIRE: { type: 'PRESTATAIRE', libelle: 'Prestataire de services', iconeSymbol: 'work',       documentsRequis: ['CNI'] },
  PHARMACIE:   { type: 'PHARMACIE',   libelle: 'Pharmacie',           iconeSymbol: 'pill',           documentsRequis: ['NINEA', 'CNI', 'Ordre des pharmaciens'] },
  ARTISAN:     { type: 'ARTISAN',     libelle: 'Artisan',             iconeSymbol: 'handyman',       documentsRequis: ['CNI'] },
};
