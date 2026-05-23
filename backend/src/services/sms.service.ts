import { env } from '../config/env';
import { journal } from '../config/logger';

/**
 * Wrapper Twilio. Tant que les credentials Twilio ne sont pas fournis,
 * on bascule en mode "simulation" : le code OTP est loggé localement
 * — strictement utile en dev pour tester un flux d'inscription
 * sans grever le compte Twilio.
 */

export interface ResultatEnvoiSms {
  envoye: boolean;
  reference?: string;
  modeSimulation: boolean;
}

export async function envoyerSms(
  destinataireE164: string,
  message: string,
): Promise<ResultatEnvoiSms> {
  const credentialsManquants = !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_NUMERO_EXPEDITEUR;

  if (credentialsManquants) {
    journal.warn(
      { destinataire: destinataireE164, message },
      '[SMS-SIMULATION] Twilio non configuré — message journalisé au lieu d\'être envoyé',
    );
    return { envoye: true, modeSimulation: true };
  }

  // Branchement Twilio réel : sera implémenté à l'étape 2 (auth)
  // quand les credentials seront provisionnés. On laisse le squelette
  // pour qu'il n'y ait plus qu'à dropper le SDK et l'appel.
  throw new Error('Envoi SMS Twilio non encore implémenté — installer le SDK twilio à l\'Étape 2');
}
