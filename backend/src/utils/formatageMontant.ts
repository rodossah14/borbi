import { DEVISES, type CodeDevise } from '@borbi/shared';

/**
 * Format universel des montants côté Bor-Bi : espaces fines comme
 * séparateurs de milliers, symbole devise après le nombre.
 *   12500 XOF → "12 500 FCFA"
 *   1500.5 NGN → "1 500,50 ₦"
 */
export function formaterMontant(montant: number, devise: CodeDevise = 'XOF'): string {
  const infos = DEVISES[devise];
  const fixe = montant.toFixed(infos.decimales);
  const [partieEntiere, partieDecimale] = fixe.split('.');
  const partieEntiereFormatee = (partieEntiere ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const nombre = partieDecimale ? `${partieEntiereFormatee},${partieDecimale}` : partieEntiereFormatee;
  return `${nombre} ${infos.symbole}`;
}
