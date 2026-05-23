import { env } from '../config/env';
import { journal } from '../config/logger';

/**
 * Façade unifiée Wave + CinetPay. L'appelant n'a pas à savoir
 * quel agrégateur sera utilisé — la sélection se fait selon le pays
 * et le moyen de paiement choisi par le client.
 */

export type MoyenPaiement = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'CARTE_BANCAIRE';

export interface DemandePaiement {
  moyen: MoyenPaiement;
  montantXof: number;
  numeroPayeurE164: string;
  reference: string;
  description: string;
}

export interface ResultatPaiement {
  succes: boolean;
  identifiantTransactionFournisseur: string;
  urlRedirection?: string;
  modeSimulation: boolean;
}

export async function initierPaiement(demande: DemandePaiement): Promise<ResultatPaiement> {
  if (demande.moyen === 'WAVE') {
    if (!env.WAVE_API_KEY) {
      journal.warn(demande, '[PAIEMENT-SIMULATION] Wave non configuré');
      return {
        succes: true,
        identifiantTransactionFournisseur: `WAVE-SIM-${demande.reference}`,
        modeSimulation: true,
      };
    }
    throw new Error('Intégration Wave réelle à implémenter — Étape 3 (paiements)');
  }

  // Orange Money / MTN / Carte bancaire passent par CinetPay
  if (!env.CINETPAY_API_KEY) {
    journal.warn(demande, '[PAIEMENT-SIMULATION] CinetPay non configuré');
    return {
      succes: true,
      identifiantTransactionFournisseur: `CINETPAY-SIM-${demande.reference}`,
      modeSimulation: true,
    };
  }
  throw new Error('Intégration CinetPay réelle à implémenter — Étape 3 (paiements)');
}
