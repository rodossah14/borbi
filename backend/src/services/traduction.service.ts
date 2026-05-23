import { env } from '../config/env';
import { journal } from '../config/logger';
import type { CodeLangue } from '@borbi/shared';

/**
 * Wrapper DeepL. En Phase 1A, l'UI est en français uniquement
 * donc ce service n'est utilisé que pour traduire les conversations
 * et fiches produit à la volée. Sans clé API, on renvoie le texte
 * original pour ne pas casser le flux d'affichage.
 */

export interface ResultatTraduction {
  texteTraduit: string;
  langueDetectee: CodeLangue | null;
  modeSimulation: boolean;
}

export async function traduireTexte(
  texteSource: string,
  langueCible: CodeLangue,
): Promise<ResultatTraduction> {
  if (!env.DEEPL_API_KEY) {
    journal.debug({ langueCible, longueur: texteSource.length }, '[TRADUCTION-SIMULATION] DeepL non configuré');
    return { texteTraduit: texteSource, langueDetectee: null, modeSimulation: true };
  }

  throw new Error('Intégration DeepL à implémenter quand la clé API sera disponible');
}
