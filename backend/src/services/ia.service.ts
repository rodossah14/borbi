import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { journal } from '../config/logger';

/**
 * Façade Claude (Haiku) — utilisée par l'assistant vocal commerçant,
 * la prédiction de ruptures stock J-7 et la suggestion de prix
 * optimaux. Singleton paresseux : on n'instancie le client qu'au
 * premier appel pour ne pas planter au boot si la clé manque.
 */

let clientAnthropic: Anthropic | null = null;

function obtenirClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY manquante — impossible d\'appeler Claude');
  }
  if (!clientAnthropic) {
    clientAnthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return clientAnthropic;
}

export interface OptionsCompletion {
  promptSysteme: string;
  promptUtilisateur: string;
  maxTokens?: number;
}

export async function completer(options: OptionsCompletion): Promise<string> {
  const client = obtenirClient();
  const reponse = await client.messages.create({
    model: env.ANTHROPIC_MODELE,
    max_tokens: options.maxTokens ?? 1024,
    system: options.promptSysteme,
    messages: [{ role: 'user', content: options.promptUtilisateur }],
  });

  const premierBloc = reponse.content[0];
  if (!premierBloc || premierBloc.type !== 'text') {
    journal.warn({ reponse }, 'Réponse Claude inattendue (pas de bloc text)');
    return '';
  }
  return premierBloc.text;
}
