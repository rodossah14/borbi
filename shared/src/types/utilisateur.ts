import type { CodePays } from '../constantes/pays';
import type { CodeLangue } from '../constantes/langues';
import type { NiveauFidelite } from '../constantes/fidelite';

/**
 * Rôles disponibles. Un utilisateur peut cumuler plusieurs rôles
 * (un commerçant est souvent aussi un client acheteur sur d'autres établissements).
 */
export type RoleUtilisateur =
  | 'CLIENT'
  | 'COMMERCANT'
  | 'LIVREUR'
  | 'ADMINISTRATEUR';

export interface Utilisateur {
  id: string;
  telephone: string;            // format E.164 : +221XXXXXXXXX
  email: string | null;
  nomComplet: string;
  pays: CodePays;
  languePreferee: CodeLangue;
  roles: RoleUtilisateur[];
  niveauFidelite: NiveauFidelite;
  pointsFidelite: number;
  estVerifie: boolean;          // OTP SMS validé
  estSuspendu: boolean;
  dateCreation: Date;
}
