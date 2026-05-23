import type { NextFunction, Request, Response } from 'express';
import { ipsGodMode } from '../config/env';
import { enregistrerEvenementAudit } from './journalAudit';

/**
 * R105 — God Mode renvoie 404 (et non 403) si l'IP n'est pas
 * whitelistée. Aucun attaquant ne doit deviner que la route existe.
 * Toute tentative non-autorisée est tracée dans le journal d'audit.
 */
export async function verifierAccesGodMode(
  requete: Request,
  reponse: Response,
  suivant: NextFunction,
): Promise<void> {
  const ip = requete.ip ?? requete.socket.remoteAddress ?? '';
  const autorise = ipsGodMode.includes(ip);

  if (!autorise) {
    // On loggue l'accès suspect — sans le dire à l'attaquant
    await enregistrerEvenementAudit({
      action: 'ACCES_GOD_MODE',
      adresseIp: ip,
      userAgent: requete.get('user-agent') ?? null,
      donnees: { autorise: false, chemin: requete.originalUrl },
    });
    reponse.status(404).send('Not Found');
    return;
  }

  await enregistrerEvenementAudit({
    action: 'ACCES_GOD_MODE',
    adresseIp: ip,
    userAgent: requete.get('user-agent') ?? null,
    donnees: { autorise: true, chemin: requete.originalUrl },
  });

  suivant();
}
