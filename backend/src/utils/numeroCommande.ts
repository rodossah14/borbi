import { randomInt } from 'node:crypto';
import { prisma } from '../config/prisma';
import { ErreurMetier } from '../middlewares/gestionnaireErreurs';

/**
 * Numéro de commande lisible humain — format BB-2026-XXXXXX.
 * Format lisible sur les reçus et les SMS de confirmation
 * (le client peut le dicter au support sans confondre des caractères).
 *
 * 1 000 000 combinaisons par année calendaire. Si jamais on dépasse
 * 100 000 commandes/an, on étendra à 7 chiffres — pour l'instant la
 * boucle de retry suffit largement à éviter les collisions.
 */

const PREFIXE = 'BB';
const MAX_TENTATIVES = 8;

function genererCandidat(): string {
  const annee = new Date().getFullYear();
  // randomInt(0, 1_000_000) ∈ [0, 999 999] → padding à 6 chiffres
  const suffixe = randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `${PREFIXE}-${annee}-${suffixe}`;
}

/**
 * Génère un numéro unique en vérifiant l'absence de collision en BDD.
 * Boucle bornée pour ne jamais bloquer indéfiniment — au-delà de
 * MAX_TENTATIVES on lève une erreur 500 explicite.
 */
export async function genererNumeroCommande(): Promise<string> {
  for (let tentative = 0; tentative < MAX_TENTATIVES; tentative += 1) {
    const candidat = genererCandidat();
    const existe = await prisma.commande.findUnique({
      where: { numeroCommande: candidat },
      select: { id: true },
    });
    if (!existe) return candidat;
  }
  // Improbable mais on préfère échouer fort qu'entrer en boucle infinie
  throw new ErreurMetier(
    'Impossible de générer un numéro de commande unique',
    500,
    'GEN_NUMERO_COMMANDE',
  );
}
