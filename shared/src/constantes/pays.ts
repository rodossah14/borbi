/**
 * Pays couverts par Bor-Bi Tech, organisés par phase de lancement.
 * Le commerçant choisit son pays à l'inscription — cela détermine
 * la devise affichée, les régulateurs applicables et les opérateurs SMS.
 */

export type CodePays =
  | 'SN' | 'GA' | 'CI' | 'CM' | 'BJ'
  | 'BF' | 'TG' | 'NE' | 'ML' | 'GW' | 'TD' | 'CF' | 'CG'
  | 'NG' | 'GH' | 'CD' | 'AO' | 'GN' | 'GQ' | 'GM' | 'LR' | 'SL' | 'MR' | 'CV' | 'ST';

export interface Pays {
  code: CodePays;
  nom: string;
  capitale: string;
  indicatifTelephone: string;
  codeDevise: string;
  phase: '1A' | '1B' | '1C';
  langueDefaut: 'fr' | 'en' | 'pt';
}

// Phase 1A — lancement initial mois 1-3
const PHASE_1A: Pays[] = [
  { code: 'SN', nom: 'Sénégal',        capitale: 'Dakar',      indicatifTelephone: '+221', codeDevise: 'XOF', phase: '1A', langueDefaut: 'fr' },
  { code: 'GA', nom: 'Gabon',          capitale: 'Libreville', indicatifTelephone: '+241', codeDevise: 'XAF', phase: '1A', langueDefaut: 'fr' },
  { code: 'CI', nom: "Côte d'Ivoire",  capitale: 'Yamoussoukro', indicatifTelephone: '+225', codeDevise: 'XOF', phase: '1A', langueDefaut: 'fr' },
  { code: 'CM', nom: 'Cameroun',       capitale: 'Yaoundé',    indicatifTelephone: '+237', codeDevise: 'XAF', phase: '1A', langueDefaut: 'fr' },
  { code: 'BJ', nom: 'Bénin',          capitale: 'Porto-Novo', indicatifTelephone: '+229', codeDevise: 'XOF', phase: '1A', langueDefaut: 'fr' },
];

// Phase 1B — extension zone FCFA mois 4-6
const PHASE_1B: Pays[] = [
  { code: 'BF', nom: 'Burkina Faso',   capitale: 'Ouagadougou', indicatifTelephone: '+226', codeDevise: 'XOF', phase: '1B', langueDefaut: 'fr' },
  { code: 'TG', nom: 'Togo',           capitale: 'Lomé',        indicatifTelephone: '+228', codeDevise: 'XOF', phase: '1B', langueDefaut: 'fr' },
  { code: 'NE', nom: 'Niger',          capitale: 'Niamey',      indicatifTelephone: '+227', codeDevise: 'XOF', phase: '1B', langueDefaut: 'fr' },
  { code: 'ML', nom: 'Mali',           capitale: 'Bamako',      indicatifTelephone: '+223', codeDevise: 'XOF', phase: '1B', langueDefaut: 'fr' },
  { code: 'GW', nom: 'Guinée-Bissau',  capitale: 'Bissau',      indicatifTelephone: '+245', codeDevise: 'XOF', phase: '1B', langueDefaut: 'pt' },
  { code: 'TD', nom: 'Tchad',          capitale: "N'Djamena",   indicatifTelephone: '+235', codeDevise: 'XAF', phase: '1B', langueDefaut: 'fr' },
  { code: 'CF', nom: 'Centrafrique',   capitale: 'Bangui',      indicatifTelephone: '+236', codeDevise: 'XAF', phase: '1B', langueDefaut: 'fr' },
  { code: 'CG', nom: 'Congo-Brazza',   capitale: 'Brazzaville', indicatifTelephone: '+242', codeDevise: 'XAF', phase: '1B', langueDefaut: 'fr' },
];

// Phase 1C — ouverture hors FCFA mois 7-12
const PHASE_1C: Pays[] = [
  { code: 'NG', nom: 'Nigeria',        capitale: 'Abuja',       indicatifTelephone: '+234', codeDevise: 'NGN', phase: '1C', langueDefaut: 'en' },
  { code: 'GH', nom: 'Ghana',          capitale: 'Accra',       indicatifTelephone: '+233', codeDevise: 'GHS', phase: '1C', langueDefaut: 'en' },
  { code: 'CD', nom: 'RDC',            capitale: 'Kinshasa',    indicatifTelephone: '+243', codeDevise: 'CDF', phase: '1C', langueDefaut: 'fr' },
  { code: 'AO', nom: 'Angola',         capitale: 'Luanda',      indicatifTelephone: '+244', codeDevise: 'AOA', phase: '1C', langueDefaut: 'pt' },
  { code: 'GN', nom: 'Guinée',         capitale: 'Conakry',     indicatifTelephone: '+224', codeDevise: 'GNF', phase: '1C', langueDefaut: 'fr' },
  { code: 'GQ', nom: 'Guinée équatoriale', capitale: 'Malabo',  indicatifTelephone: '+240', codeDevise: 'XAF', phase: '1C', langueDefaut: 'fr' },
  { code: 'GM', nom: 'Gambie',         capitale: 'Banjul',      indicatifTelephone: '+220', codeDevise: 'GMD', phase: '1C', langueDefaut: 'en' },
  { code: 'LR', nom: 'Libéria',        capitale: 'Monrovia',    indicatifTelephone: '+231', codeDevise: 'LRD', phase: '1C', langueDefaut: 'en' },
  { code: 'SL', nom: 'Sierra Leone',   capitale: 'Freetown',    indicatifTelephone: '+232', codeDevise: 'SLL', phase: '1C', langueDefaut: 'en' },
  { code: 'MR', nom: 'Mauritanie',     capitale: 'Nouakchott',  indicatifTelephone: '+222', codeDevise: 'MRU', phase: '1C', langueDefaut: 'fr' },
  { code: 'CV', nom: 'Cap-Vert',       capitale: 'Praia',       indicatifTelephone: '+238', codeDevise: 'CVE', phase: '1C', langueDefaut: 'pt' },
  { code: 'ST', nom: 'São Tomé',       capitale: 'São Tomé',    indicatifTelephone: '+239', codeDevise: 'STN', phase: '1C', langueDefaut: 'pt' },
];

export const PAYS_SUPPORTES: readonly Pays[] = [...PHASE_1A, ...PHASE_1B, ...PHASE_1C];
export const PAYS_PHASE_1A: readonly Pays[] = PHASE_1A;

export function trouverPays(code: CodePays): Pays | undefined {
  return PAYS_SUPPORTES.find((p) => p.code === code);
}
