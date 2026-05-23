import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { journal } from '../config/logger';

/**
 * Erreur métier connue qu'on accepte de propager au client.
 * Tout ce qui n'hérite pas d'ErreurMetier devient un 500 anonyme.
 */
export class ErreurMetier extends Error {
  public readonly statusHttp: number;
  public readonly code: string;

  constructor(message: string, statusHttp = 400, code = 'ERREUR_METIER') {
    super(message);
    this.statusHttp = statusHttp;
    this.code = code;
  }
}

export function gestionnaireErreurs(
  erreur: unknown,
  requete: Request,
  reponse: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _suivant: NextFunction,
): void {
  if (erreur instanceof ZodError) {
    reponse.status(422).json({
      code: 'VALIDATION',
      message: 'Données invalides',
      details: erreur.flatten().fieldErrors,
    });
    return;
  }

  if (erreur instanceof ErreurMetier) {
    reponse.status(erreur.statusHttp).json({
      code: erreur.code,
      message: erreur.message,
    });
    return;
  }

  // Erreur imprévue : on log tout côté serveur, on renvoie un message
  // générique au client pour ne fuiter aucun détail interne.
  journal.error({ err: erreur, url: requete.originalUrl }, 'Erreur non gérée');
  reponse.status(500).json({
    code: 'ERREUR_INTERNE',
    message: 'Une erreur est survenue. Réessaie dans un instant.',
  });
}
