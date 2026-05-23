import { LANGUES_SUPPORTEES, LANGUE_DEFAUT, type CodeLangue } from '@borbi/shared';

/**
 * Phase 1A : UI 100% française. Cette constante existe pour qu'il
 * suffise d'ajouter 'en', 'ar', 'wo', 'dyu', 'ff' à la liste
 * lorsque DeepL sera branché et que les fichiers de traduction
 * seront prêts.
 */
export const languesUiActives: readonly CodeLangue[] = LANGUES_SUPPORTEES;
export const langueParDefaut: CodeLangue = LANGUE_DEFAUT;
