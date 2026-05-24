import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import {
  rafraichirToken,
  seConnecter,
  seDeconnecter,
  sInscrire,
  verifierOTPInscription,
} from '../controllers/auth.controller';
import { limiteurAuth } from '../middlewares/limiteurRequetes';
import { verificationJWT } from '../middlewares/verificationJWT';

/**
 * Routes d'authentification montées sous `/api/v1/auth` dans app.ts.
 *
 * Stratégie de rate limiting :
 *  - `limiteurAuth` (R22 : 5 req / 15 min / IP) appliqué aux endpoints
 *    publics sensibles au brute force : inscription, vérif OTP, connexion.
 *  - `rafraichirToken` n'est PAS rate-limité agressivement : un usage
 *    légitime peut le déclencher toutes les 15 min sur une session active.
 *    Le limiteur global (100 req/min) reste cependant en place.
 *  - `seDeconnecter` est déjà tracé à l'utilisateur via JWT : pas de
 *    limiteur dédié.
 */

/**
 * Express 4 ne propage PAS automatiquement les rejets de Promise au
 * middleware d'erreur. Sans wrapper, un throw asynchrone dans un
 * contrôleur fait pendre la requête jusqu'au timeout. Ce helper
 * intercepte les rejets et les passe à `next(erreur)` pour que
 * `gestionnaireErreurs` les traite proprement.
 */
function asynchroniser(
  fonction: (requete: Request, reponse: Response, suivant: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (requete, reponse, suivant) => {
    Promise.resolve(fonction(requete, reponse, suivant)).catch(suivant);
  };
}

export const routesAuth: Router = Router();

routesAuth.post('/inscription',      limiteurAuth, asynchroniser(sInscrire));
routesAuth.post('/verification-otp', limiteurAuth, asynchroniser(verifierOTPInscription));
routesAuth.post('/connexion',        limiteurAuth, asynchroniser(seConnecter));
routesAuth.post('/deconnexion',      verificationJWT, asynchroniser(seDeconnecter));
routesAuth.post('/rafraichir-token', asynchroniser(rafraichirToken));
