import { createHash } from 'node:crypto';
import { prisma } from '../config/prisma';
import { journal } from '../config/logger';
import type { ActionAudit } from '@prisma/client';

/**
 * R25 — append-only. Chaque insertion calcule son empreinte en
 * chaînant le SHA-256 du dernier événement enregistré : si quelqu'un
 * tente de supprimer ou modifier une ligne, la chaîne casse
 * et un audit ultérieur le détectera.
 */

export interface EntreeAudit {
  action: ActionAudit;
  idUtilisateur?: string | null;
  adresseIp?: string | null;
  userAgent?: string | null;
  donnees?: Record<string, unknown>;
}

export async function enregistrerEvenementAudit(entree: EntreeAudit): Promise<void> {
  try {
    const dernierEvenement = await prisma.evenementAudit.findFirst({
      orderBy: { horodatage: 'desc' },
      select: { empreinteSha256: true },
    });

    const empreintePrecedente = dernierEvenement?.empreinteSha256 ?? 'GENESIS';
    const horodatageIso = new Date().toISOString();

    const charge = [
      entree.action,
      entree.idUtilisateur ?? 'ANONYME',
      entree.adresseIp ?? 'INCONNUE',
      JSON.stringify(entree.donnees ?? {}),
      horodatageIso,
      empreintePrecedente,
    ].join('|');

    const empreinte = createHash('sha256').update(charge, 'utf8').digest('hex');

    await prisma.evenementAudit.create({
      data: {
        action: entree.action,
        idUtilisateur: entree.idUtilisateur ?? null,
        adresseIp: entree.adresseIp ?? null,
        userAgent: entree.userAgent ?? null,
        // Prisma attend un InputJsonValue : on sérialise/désérialise pour
        // garantir un objet JSON propre quelle que soit la valeur reçue
        donnees: JSON.parse(JSON.stringify(entree.donnees ?? {})),
        empreinteSha256: empreinte,
      },
    });
  } catch (erreur) {
    // Un échec d'audit ne doit JAMAIS bloquer la requête métier
    // — mais doit hurler dans les logs pour qu'un opérateur réagisse.
    journal.error({ err: erreur, action: entree.action }, 'Échec de l\'enregistrement audit');
  }
}
