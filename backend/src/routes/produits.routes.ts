import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import {
  ajouterProduit,
  mettreAJourStock,
  obtenirProduit,
  rechercherProduits,
} from '../controllers/produits.controller';
import { verificationJWT } from '../middlewares/verificationJWT';

/**
 * Routes Produits — montées sous `/api/v1/produits` dans app.ts.
 *
 * - POST /              : commerçant authentifié uniquement (JWT)
 * - PATCH /:id/stock    : commerçant authentifié uniquement (JWT)
 * - GET /catalogue      : PUBLIC — accessible sans compte (PWA browsing)
 * - GET /:id            : PUBLIC — fiche produit partageable par lien
 *
 * Note sur l'ordre : `/catalogue` est déclaré AVANT `/:id` sinon Express
 * capturerait "catalogue" comme un id (matching dans l'ordre déclaré).
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

export const routesProduits: Router = Router();

routesProduits.post('/',           verificationJWT, asynchroniser(ajouterProduit));
routesProduits.patch('/:id/stock', verificationJWT, asynchroniser(mettreAJourStock));
routesProduits.get('/catalogue',   asynchroniser(rechercherProduits));
routesProduits.get('/:id',         asynchroniser(obtenirProduit));
