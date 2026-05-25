import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import {
  basculerStatut,
  creerEtablissement,
  listerMesEtablissements,
  modifierEtablissement,
  obtenirEtablissement,
} from '../controllers/etablissements.controller';
import { verificationJWT } from '../middlewares/verificationJWT';

/**
 * Routes Établissements — montées sous `/api/v1/etablissements` dans app.ts.
 *
 * Toutes les routes exigent un JWT valide. La granularité d'accès
 * (propriétaire vs admin vs membre d'équipe) est gérée dans le contrôleur,
 * pas au niveau du routeur — pour rester souple quand on ajoutera les
 * membres d'équipe (TODO Étape ultérieure).
 *
 * Note sur l'ordre : `/mes` est déclaré AVANT `/:id` pour qu'Express
 * ne capture pas "mes" comme un id (Express matche dans l'ordre déclaré).
 */

/**
 * Wrapper async — voir routes/auth.routes.ts pour le contexte. Express 4
 * ne propage pas les rejets de Promise au middleware d'erreur sans aide.
 */
function asynchroniser(
  fonction: (requete: Request, reponse: Response, suivant: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (requete, reponse, suivant) => {
    Promise.resolve(fonction(requete, reponse, suivant)).catch(suivant);
  };
}

export const routesEtablissements: Router = Router();

routesEtablissements.post('/',            verificationJWT, asynchroniser(creerEtablissement));
routesEtablissements.get('/mes',          verificationJWT, asynchroniser(listerMesEtablissements));
routesEtablissements.get('/:id',          verificationJWT, asynchroniser(obtenirEtablissement));
routesEtablissements.patch('/:id',        verificationJWT, asynchroniser(modifierEtablissement));
routesEtablissements.patch('/:id/statut', verificationJWT, asynchroniser(basculerStatut));
