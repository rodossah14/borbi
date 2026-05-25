import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ErreurMetier } from '../middlewares/gestionnaireErreurs';
import { enregistrerEvenementAudit } from '../middlewares/journalAudit';
import {
  alerterRupturePrevue,
  alerterStockFaible,
} from '../services/notifications.service';

/**
 * Contrôleurs Produits — Étape 3.
 *
 * Endpoints publics (sans auth) : rechercherProduits, obtenirProduit.
 * Endpoints commerçant (JWT requis) : ajouterProduit, mettreAJourStock.
 *
 * Règle clé : un commerçant ne peut écrire un produit que sur un
 * établissement dont il est propriétaire (les membres d'équipe seront
 * pris en charge quand le model MembreEquipe existera).
 */

const LIMITE_PAR_DEFAUT = 20;
const LIMITE_MAX = 50;
const SEUIL_ALERTE_RUPTURE_JOURS = 7;
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const schemaAjoutProduit = z.object({
  idEtablissement: z.string().min(1),
  nom: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  prixFCFA: z.number().int().positive(),
  categorie: z.string().trim().min(2).max(60),
  stockActuel: z.number().int().min(0),
  stockMinimum: z.number().int().min(0).default(5),
  imageUrls: z.array(z.string().url()).max(10).optional().default([]),
  estDisponible: z.boolean().optional().default(true),
});

const schemaMiseAJourStock = z.object({
  stockActuel: z.number().int().min(0),
});

const schemaRecherche = z.object({
  categorie: z.string().trim().optional(),
  paysCode: z.string().length(2).optional(),
  ville: z.string().trim().optional(),
  prixMin: z.coerce.number().int().min(0).optional(),
  prixMax: z.coerce.number().int().min(0).optional(),
  enStock: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAX).optional().default(LIMITE_PAR_DEFAUT),
  tri: z
    .enum(['pertinence', 'prix_asc', 'prix_desc', 'nouveaute', 'score_confiance'])
    .optional()
    .default('pertinence'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exigerUtilisateurAuthentifie(requete: Request): string {
  if (!requete.userId) {
    throw new ErreurMetier('Authentification requise', 401, 'AUTH_REQUISE');
  }
  return requete.userId;
}

function ipDeRequete(requete: Request): string | null {
  return requete.ip ?? requete.socket.remoteAddress ?? null;
}

/**
 * Vérifie que l'établissement existe, n'est ni SUSPENDU ni SUPPRIME,
 * et que l'utilisateur authentifié en est propriétaire.
 */
async function verifierAccesEcritureEtablissement(
  idEtablissement: string,
  idUtilisateur: string,
): Promise<{ id: string; nom: string; idProprietaire: string }> {
  const etablissement = await prisma.etablissement.findUnique({
    where: { id: idEtablissement },
    select: { id: true, nom: true, idProprietaire: true, statut: true },
  });
  if (!etablissement) {
    throw new ErreurMetier('Établissement introuvable', 404, 'ETABLISSEMENT_INTROUVABLE');
  }
  if (etablissement.idProprietaire !== idUtilisateur) {
    throw new ErreurMetier('Accès refusé à cet établissement', 403, 'ACCES_REFUSE');
  }
  if (etablissement.statut === 'SUSPENDU') {
    throw new ErreurMetier(
      'Cet établissement est suspendu. Contacte le support.',
      403,
      'ETABLISSEMENT_SUSPENDU',
    );
  }
  if (etablissement.statut === 'SUPPRIME') {
    throw new ErreurMetier('Établissement supprimé', 410, 'ETABLISSEMENT_SUPPRIME');
  }
  return etablissement;
}

// ---------------------------------------------------------------------------
// 1. ajouterProduit (privé, commerçant)
// ---------------------------------------------------------------------------

export async function ajouterProduit(requete: Request, reponse: Response): Promise<void> {
  const idUtilisateur = exigerUtilisateurAuthentifie(requete);
  const corps = schemaAjoutProduit.parse(requete.body);

  const etablissement = await verifierAccesEcritureEtablissement(
    corps.idEtablissement,
    idUtilisateur,
  );

  const produit = await prisma.produit.create({
    data: {
      idEtablissement: corps.idEtablissement,
      nom: corps.nom,
      description: corps.description ?? null,
      prixFCFA: corps.prixFCFA,
      categorie: corps.categorie.toLowerCase(),
      // Snapshot stockInitial = stockActuel à la création (immuable)
      stockInitial: corps.stockActuel,
      stockActuel: corps.stockActuel,
      stockMinimum: corps.stockMinimum,
      estDisponible: corps.estDisponible,
      imageUrls: corps.imageUrls ?? [],
    },
  });

  // Alerte immédiate si le commerçant ajoute un produit déjà sous seuil —
  // utile pour qu'il prévoie son réassort avant même la première vente.
  if (produit.stockActuel <= produit.stockMinimum) {
    await alerterStockFaible({
      idEtablissement: etablissement.id,
      idProprietaire: idUtilisateur,
      idProduit: produit.id,
      nomProduit: produit.nom,
      stockActuel: produit.stockActuel,
      stockMinimum: produit.stockMinimum,
    });
  }

  await enregistrerEvenementAudit({
    action: 'AJOUT_PRODUIT',
    idUtilisateur,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: {
      idEtablissement: etablissement.id,
      idProduit: produit.id,
      nom: produit.nom,
      prixFCFA: produit.prixFCFA,
      stockInitial: produit.stockInitial,
    },
  });

  reponse.status(201).json({ produit });
}

// ---------------------------------------------------------------------------
// 2. mettreAJourStock (privé, commerçant)
// ---------------------------------------------------------------------------

export async function mettreAJourStock(requete: Request, reponse: Response): Promise<void> {
  const idUtilisateur = exigerUtilisateurAuthentifie(requete);
  const idProduit = requete.params.id;
  if (!idProduit) {
    throw new ErreurMetier('Identifiant manquant', 400, 'ID_MANQUANT');
  }
  const { stockActuel: nouveauStock } = schemaMiseAJourStock.parse(requete.body);

  const produit = await prisma.produit.findUnique({
    where: { id: idProduit },
    include: { etablissement: { select: { id: true, idProprietaire: true, statut: true, nom: true } } },
  });
  if (!produit) {
    throw new ErreurMetier('Produit introuvable', 404, 'PRODUIT_INTROUVABLE');
  }
  if (produit.etablissement.idProprietaire !== idUtilisateur) {
    throw new ErreurMetier('Accès refusé à ce produit', 403, 'ACCES_REFUSE');
  }
  if (produit.etablissement.statut === 'SUSPENDU' || produit.etablissement.statut === 'SUPPRIME') {
    throw new ErreurMetier('Établissement indisponible', 403, 'ETABLISSEMENT_INDISPONIBLE');
  }

  const stockAvant = produit.stockActuel;
  const produitAJour = await prisma.produit.update({
    where: { id: idProduit },
    data: { stockActuel: nouveauStock },
  });

  // Alertes — calculées APRÈS l'update pour s'assurer que l'écriture
  // a bien eu lieu avant de notifier le vendeur
  if (produitAJour.stockActuel <= produitAJour.stockMinimum) {
    await alerterStockFaible({
      idEtablissement: produitAJour.idEtablissement,
      idProprietaire: idUtilisateur,
      idProduit: produitAJour.id,
      nomProduit: produitAJour.nom,
      stockActuel: produitAJour.stockActuel,
      stockMinimum: produitAJour.stockMinimum,
    });
  }

  // Prédiction J-7 : vélocité = (stockInitial - stockActuel) / joursDepuisCreation
  // Si vélocité > 0 et stock restant divisé par vélocité ≤ 7 jours → alerte
  const joursDepuisCreation = Math.max(
    1, // évite division par 0 le jour même de création
    (Date.now() - produitAJour.dateCreation.getTime()) / MS_PAR_JOUR,
  );
  const unitesVendues = produitAJour.stockInitial - produitAJour.stockActuel;
  const velociteParJour = unitesVendues / joursDepuisCreation;

  if (velociteParJour > 0 && produitAJour.stockActuel > 0) {
    const joursRestants = Math.ceil(produitAJour.stockActuel / velociteParJour);
    if (joursRestants <= SEUIL_ALERTE_RUPTURE_JOURS) {
      await alerterRupturePrevue({
        idEtablissement: produitAJour.idEtablissement,
        idProprietaire: idUtilisateur,
        idProduit: produitAJour.id,
        nomProduit: produitAJour.nom,
        stockActuel: produitAJour.stockActuel,
        stockMinimum: produitAJour.stockMinimum,
        joursRestants,
        velociteParJour,
      });
    }
  }

  await enregistrerEvenementAudit({
    action: 'MISE_A_JOUR_STOCK',
    idUtilisateur,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: {
      idProduit: produitAJour.id,
      idEtablissement: produitAJour.idEtablissement,
      stockAvant,
      stockApres: produitAJour.stockActuel,
    },
  });

  reponse.status(200).json({ produit: produitAJour });
}

// ---------------------------------------------------------------------------
// 3. rechercherProduits (PUBLIC)
// ---------------------------------------------------------------------------

export async function rechercherProduits(requete: Request, reponse: Response): Promise<void> {
  const filtres = schemaRecherche.parse(requete.query);

  // Construction du where Prisma. On exclut systématiquement les
  // établissements SUSPENDUS et SUPPRIMES — ces produits ne doivent
  // pas apparaître publiquement même si la BDD les contient encore.
  const where: Prisma.ProduitWhereInput = {
    estDisponible: true,
    etablissement: {
      statut: { in: ['ACTIF', 'EN_PAUSE'] },
      ...(filtres.paysCode && { codePays: filtres.paysCode.toUpperCase() }),
      ...(filtres.ville && { ville: { equals: filtres.ville, mode: 'insensitive' } }),
    },
    ...(filtres.categorie && { categorie: filtres.categorie.toLowerCase() }),
    ...(filtres.enStock && { stockActuel: { gt: 0 } }),
    ...(filtres.prixMin !== undefined || filtres.prixMax !== undefined
      ? {
          prixFCFA: {
            ...(filtres.prixMin !== undefined && { gte: filtres.prixMin }),
            ...(filtres.prixMax !== undefined && { lte: filtres.prixMax }),
          },
        }
      : {}),
  };

  // Mapping tri demandé → orderBy Prisma.
  // 'pertinence' : pas de moteur de recherche full-text à ce stade ;
  // on combine score_confiance puis nouveauté comme proxy raisonnable.
  // À remplacer par un vrai scoring (vues + ventes + reviews) plus tard.
  const orderBy: Prisma.ProduitOrderByWithRelationInput | Prisma.ProduitOrderByWithRelationInput[] =
    filtres.tri === 'prix_asc'
      ? { prixFCFA: 'asc' }
      : filtres.tri === 'prix_desc'
        ? { prixFCFA: 'desc' }
        : filtres.tri === 'nouveaute'
          ? { dateCreation: 'desc' }
          : filtres.tri === 'score_confiance'
            ? { etablissement: { proprietaire: { scoreConfiance: 'desc' } } }
            : [
                // pertinence (défaut)
                { etablissement: { proprietaire: { scoreConfiance: 'desc' } } },
                { dateCreation: 'desc' },
              ];

  const skip = (filtres.page - 1) * filtres.limite;

  const [produits, nombreTotal] = await Promise.all([
    prisma.produit.findMany({
      where,
      orderBy,
      skip,
      take: filtres.limite,
      include: {
        etablissement: {
          select: {
            id: true,
            nom: true,
            ville: true,
            type: true,
            proprietaire: { select: { scoreConfiance: true } },
          },
        },
      },
    }),
    prisma.produit.count({ where }),
  ]);

  reponse.status(200).json({
    pagination: {
      page: filtres.page,
      limite: filtres.limite,
      nombreTotal,
      nombrePages: Math.ceil(nombreTotal / filtres.limite),
    },
    produits: produits.map((p) => ({
      id: p.id,
      nom: p.nom,
      description: p.description,
      prixFCFA: p.prixFCFA,
      categorie: p.categorie,
      stockActuel: p.stockActuel,
      imageUrls: p.imageUrls,
      dateCreation: p.dateCreation,
      etablissement: {
        id: p.etablissement.id,
        nom: p.etablissement.nom,
        ville: p.etablissement.ville,
        type: p.etablissement.type,
        scoreConfiance: p.etablissement.proprietaire.scoreConfiance,
      },
    })),
  });
}

// ---------------------------------------------------------------------------
// 4. obtenirProduit (PUBLIC)
// ---------------------------------------------------------------------------

export async function obtenirProduit(requete: Request, reponse: Response): Promise<void> {
  const idProduit = requete.params.id;
  if (!idProduit) {
    throw new ErreurMetier('Identifiant manquant', 400, 'ID_MANQUANT');
  }

  const produit = await prisma.produit.findUnique({
    where: { id: idProduit },
    include: {
      etablissement: {
        select: {
          id: true,
          nom: true,
          ville: true,
          type: true,
          statut: true,
          logoUrl: true,
          proprietaire: { select: { scoreConfiance: true } },
        },
      },
    },
  });

  if (!produit) {
    throw new ErreurMetier('Produit introuvable', 404, 'PRODUIT_INTROUVABLE');
  }
  // Les produits d'établissements SUSPENDU/SUPPRIME ne doivent pas être
  // exposés publiquement, même par accès direct via l'id
  if (produit.etablissement.statut === 'SUSPENDU' || produit.etablissement.statut === 'SUPPRIME') {
    throw new ErreurMetier('Produit indisponible', 404, 'PRODUIT_INTROUVABLE');
  }

  // TODO Fichier 6 — décommenter quand le champ Produit.vues sera ajouté :
  // await prisma.produit.update({
  //   where: { id: idProduit },
  //   data: { vues: { increment: 1 } },
  // });

  reponse.status(200).json({
    produit: {
      id: produit.id,
      nom: produit.nom,
      description: produit.description,
      prixFCFA: produit.prixFCFA,
      categorie: produit.categorie,
      stockActuel: produit.stockActuel,
      stockMinimum: produit.stockMinimum,
      imageUrls: produit.imageUrls,
      estDisponible: produit.estDisponible,
      dateCreation: produit.dateCreation,
      etablissement: {
        id: produit.etablissement.id,
        nom: produit.etablissement.nom,
        ville: produit.etablissement.ville,
        type: produit.etablissement.type,
        logoUrl: produit.etablissement.logoUrl,
        scoreConfiance: produit.etablissement.proprietaire.scoreConfiance,
      },
    },
  });
}
