/**
 * Journal d'audit append-only. Aucune ligne ne doit jamais être
 * supprimée ni modifiée (règle R25 — rétention 5 ans).
 */

export type ActionAudit =
  | 'CONNEXION'
  | 'DECONNEXION'
  | 'CREATION_COMPTE'
  | 'CHANGEMENT_MOT_DE_PASSE'
  | 'CHANGEMENT_EMAIL'
  | 'CREATION_ETABLISSEMENT'
  | 'MODIFICATION_ETABLISSEMENT'
  | 'CREATION_TRANSACTION'
  | 'VALIDATION_TRANSACTION'
  | 'ECHEC_OTP'
  | 'ACCES_GOD_MODE'
  | 'DECLENCHEMENT_SOS';

export interface EvenementAudit {
  id: string;
  action: ActionAudit;
  idUtilisateur: string | null;
  adresseIp: string | null;
  userAgent: string | null;
  /** Charge utile JSON arbitraire, anonymisée */
  donnees: Record<string, unknown>;
  /** Empreinte SHA-256 chaînée à l'événement précédent */
  empreinteSha256: string;
  horodatage: Date;
}
