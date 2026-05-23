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
  | 'PHARMACIE'
  | 'ATELIER_ARTISAN'
  | 'AGENCE_TRANSPORT'
  | 'PRESTATAIRE_SERVICE';

export interface InformationsTypeEtablissement {
  type: TypeEtablissement;
  libelle: string;
  iconeSymbol: string; // Material Symbols Outlined
  /** Documents légaux exigés pour pouvoir encaisser */
  documentsRequis: string[];
}

export const TYPES_ETABLISSEMENT: Record<TypeEtablissement, InformationsTypeEtablissement> = {
  BOUTIQUE:           { type: 'BOUTIQUE',           libelle: 'Boutique',            iconeSymbol: 'storefront',    documentsRequis: ['NINEA', 'CNI'] },
  RESTAURANT:         { type: 'RESTAURANT',         libelle: 'Restaurant',          iconeSymbol: 'restaurant',    documentsRequis: ['NINEA', 'CNI', 'Agrément hygiène'] },
  HOTEL:              { type: 'HOTEL',              libelle: 'Hôtel / Auberge',     iconeSymbol: 'hotel',         documentsRequis: ['NINEA', 'Agrément tourisme'] },
  ENTREPOT:           { type: 'ENTREPOT',           libelle: 'Entrepôt / Grossiste', iconeSymbol: 'warehouse',    documentsRequis: ['NINEA', 'CNI'] },
  KIOSQUE:            { type: 'KIOSQUE',            libelle: 'Kiosque ambulant',    iconeSymbol: 'local_mall',    documentsRequis: ['CNI'] },
  PHARMACIE:          { type: 'PHARMACIE',          libelle: 'Pharmacie',           iconeSymbol: 'pill',          documentsRequis: ['NINEA', 'CNI', 'Ordre des pharmaciens'] },
  ATELIER_ARTISAN:    { type: 'ATELIER_ARTISAN',    libelle: 'Atelier d\'artisan',  iconeSymbol: 'handyman',      documentsRequis: ['CNI'] },
  AGENCE_TRANSPORT:   { type: 'AGENCE_TRANSPORT',   libelle: 'Agence de transport', iconeSymbol: 'local_shipping', documentsRequis: ['NINEA', 'CNI', 'Licence transport'] },
  PRESTATAIRE_SERVICE:{ type: 'PRESTATAIRE_SERVICE',libelle: 'Prestataire de services', iconeSymbol: 'work',     documentsRequis: ['CNI'] },
};
