import { journal } from '../config/logger';
import { enregistrerEvenementAudit } from '../middlewares/journalAudit';

/**
 * Service de notifications vendeur — stub Étape 3.
 *
 * Pour l'instant on combine deux canaux passifs :
 *   1. journal.info structuré — visible côté logs serveur et observable
 *   2. ligne EvenementAudit action=ALERTE_STOCK — auditable par le
 *      vendeur via son historique de notifications
 *
 * À brancher dans une étape ultérieure :
 *   - Push notifications mobiles (FCM/APNS)
 *   - WebSocket temps réel via Socket.IO (déjà prévu côté stack)
 *   - SMS d'urgence sur rupture critique
 *
 * L'API publique de ce module ne changera pas : seule l'implémentation
 * interne enrichira les canaux.
 */

export interface ContexteAlerteStock {
  idEtablissement: string;
  idProprietaire: string;
  idProduit: string;
  nomProduit: string;
  stockActuel: number;
  stockMinimum: number;
}

export interface ContexteRupturePrevue extends ContexteAlerteStock {
  /** Estimation arrondie au jour entier */
  joursRestants: number;
  velociteParJour: number;
}

export async function alerterStockFaible(contexte: ContexteAlerteStock): Promise<void> {
  const message = `Stock faible pour "${contexte.nomProduit}" : ${contexte.stockActuel} unité(s) restantes (seuil ${contexte.stockMinimum}).`;
  journal.info({ ...contexte, message }, '[NOTIFICATION] Alerte stock faible vendeur');

  await enregistrerEvenementAudit({
    action: 'ALERTE_STOCK',
    idUtilisateur: contexte.idProprietaire,
    donnees: {
      type: 'STOCK_FAIBLE',
      idEtablissement: contexte.idEtablissement,
      idProduit: contexte.idProduit,
      nomProduit: contexte.nomProduit,
      stockActuel: contexte.stockActuel,
      stockMinimum: contexte.stockMinimum,
      message,
    },
  });
}

export async function alerterRupturePrevue(contexte: ContexteRupturePrevue): Promise<void> {
  const message = `Rupture de stock prévue dans ${contexte.joursRestants} jour(s) pour "${contexte.nomProduit}".`;
  journal.info({ ...contexte, message }, '[NOTIFICATION] Alerte rupture prévue vendeur');

  await enregistrerEvenementAudit({
    action: 'ALERTE_STOCK',
    idUtilisateur: contexte.idProprietaire,
    donnees: {
      type: 'RUPTURE_PREVUE_J7',
      idEtablissement: contexte.idEtablissement,
      idProduit: contexte.idProduit,
      nomProduit: contexte.nomProduit,
      stockActuel: contexte.stockActuel,
      joursRestants: contexte.joursRestants,
      velociteParJour: Number(contexte.velociteParJour.toFixed(2)),
      message,
    },
  });
}
