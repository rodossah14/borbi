import { DEVISES, type CodeDevise } from '@borbi/shared';

/**
 * Version frontend du formatage de montant. Identique au backend
 * (espaces fines + symbole devise) afin qu'un montant copié-collé
 * d'un écran à un email ait toujours la même tête.
 *   12500 XOF → "12 500 FCFA"
 */
export function formaterMontant(montant: number, devise: CodeDevise = 'XOF'): string {
  const infos = DEVISES[devise];
  const fixe = montant.toFixed(infos.decimales);
  const [partieEntiere, partieDecimale] = fixe.split('.');
  const partieEntiereFormatee = (partieEntiere ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const nombre = partieDecimale ? `${partieEntiereFormatee},${partieDecimale}` : partieEntiereFormatee;
  return `${nombre} ${infos.symbole}`;
}
