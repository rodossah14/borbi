/**
 * Réexporte les constantes pays partagées avec le backend,
 * et expose le sous-ensemble actuellement ouvert à l'inscription
 * (Phase 1A uniquement en attendant la généralisation).
 */
export {
  PAYS_SUPPORTES,
  PAYS_PHASE_1A as paysOuvertsInscription,
  trouverPays,
  type CodePays,
  type Pays,
} from '@borbi/shared';
