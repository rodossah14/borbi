import type { NextFunction, Request, Response } from 'express';
import { verifierAccessToken } from '../utils/jwt';

/**
 * Étend l'objet Request d'Express avec les informations d'identité
 * extraites du JWT. Le contrôleur consomme ces champs en aval sans
 * avoir à re-vérifier le jeton.
 */
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    typeCompte?: string;
  }
}

/**
 * Garde d'accès JWT. Doit être monté AVANT toute route protégée.
 *
 * Cas couverts :
 *  - Header `Authorization` absent ou mal formé → 401 "Authentification requise"
 *  - Jeton signature invalide ou expiré        → 401 "Session expirée, veuillez vous reconnecter"
 *  - Jeton valide → req.userId + req.typeCompte attachés, on continue
 *
 * Note : on ne distingue PAS "header absent" et "header mal formé" côté
 * message — un attaquant n'a rien à apprendre de cette distinction.
 */
export function verificationJWT(
  requete: Request,
  reponse: Response,
  suivant: NextFunction,
): void {
  const entete = requete.headers.authorization;

  if (!entete || !entete.startsWith('Bearer ')) {
    reponse.status(401).json({
      code: 'AUTH_REQUISE',
      erreur: 'Authentification requise',
    });
    return;
  }

  const jeton = entete.slice('Bearer '.length).trim();
  if (jeton.length === 0) {
    reponse.status(401).json({
      code: 'AUTH_REQUISE',
      erreur: 'Authentification requise',
    });
    return;
  }

  const charge = verifierAccessToken(jeton);
  if (!charge) {
    // Couvre signature invalide, expiration, type confusion — message
    // unique pour ne pas aider un attaquant à diagnostiquer
    reponse.status(401).json({
      code: 'SESSION_EXPIREE',
      erreur: 'Session expirée, veuillez vous reconnecter',
    });
    return;
  }

  requete.userId = charge.sub;
  requete.typeCompte = charge.typeCompte;
  suivant();
}
