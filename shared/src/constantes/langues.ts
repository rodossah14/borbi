/**
 * Phase 1A : UI en français uniquement.
 * DeepL sera branché ultérieurement pour traduire dynamiquement
 * les fiches produit, conversations et descriptions vers en/ar/wo/dyu/ff.
 */

export type CodeLangue = 'fr' | 'en' | 'ar' | 'wo' | 'dyu' | 'ff' | 'pt';

export interface Langue {
  code: CodeLangue;
  nom: string;
  /** Activée dans l'UI Phase 1A */
  activeUI: boolean;
}

export const LANGUES: Record<CodeLangue, Langue> = {
  fr:  { code: 'fr',  nom: 'Français',         activeUI: true },
  en:  { code: 'en',  nom: 'English',          activeUI: false },
  ar:  { code: 'ar',  nom: 'العربية',           activeUI: false },
  wo:  { code: 'wo',  nom: 'Wolof',            activeUI: false },
  dyu: { code: 'dyu', nom: 'Dioula',           activeUI: false },
  ff:  { code: 'ff',  nom: 'Peul (Pulaar)',    activeUI: false },
  pt:  { code: 'pt',  nom: 'Português',        activeUI: false },
};

export const LANGUES_SUPPORTEES: readonly CodeLangue[] = ['fr'];
export const LANGUE_DEFAUT: CodeLangue = 'fr';
