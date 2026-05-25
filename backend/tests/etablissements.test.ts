/**
 * Tests Étape 3 — Établissements & Produits.
 *
 * Couvre les 6 garanties imposées :
 *   1. Créer un établissement → 201 avec les bons champs
 *   2. 21ème établissement → 400 'Limite de 20 établissements atteinte' (R74)
 *   3. Utilisateur non vérifié → 403
 *   4. Modifier l'établissement d'un autre utilisateur → 403
 *   5. rechercherProduits filtre bien par ville et categorie
 *   6. mettreAJourStock déclenche l'alerte si joursRestants ≤ 7
 *
 * Prisma et le service notifications sont entièrement mockés.
 */

import request from 'supertest';
import type { Express } from 'express';

// ---------------------------------------------------------------------------
// Mocks — déclarés AVANT tout import qui résoudrait les modules réels
// ---------------------------------------------------------------------------

jest.mock('../src/config/prisma', () => ({
  prisma: {
    utilisateur: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    etablissement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    produit: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    evenementAudit: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
  },
}));

jest.mock('../src/services/notifications.service', () => ({
  alerterStockFaible: jest.fn().mockResolvedValue(undefined),
  alerterRupturePrevue: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Imports — APRÈS les mocks
// ---------------------------------------------------------------------------

import { prisma } from '../src/config/prisma';
import { genererAccessToken } from '../src/utils/jwt';
import * as notifications from '../src/services/notifications.service';

// Helpers de typage pour les mocks — on liste explicitement les méthodes
// utilisées pour que TypeScript valide les accès (noUncheckedIndexedAccess
// rend dangereux le Record<string, jest.Mock>).
interface MocksUtilisateur {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
}
interface MocksEtablissement {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
}
interface MocksProduit {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
}
interface MocksAudit {
  create: jest.Mock;
  findFirst: jest.Mock;
}

const utilisateur = prisma.utilisateur as unknown as MocksUtilisateur;
const etablissement = prisma.etablissement as unknown as MocksEtablissement;
const produit = prisma.produit as unknown as MocksProduit;
const evenementAudit = prisma.evenementAudit as unknown as MocksAudit;

const alerterStockFaibleMock = notifications.alerterStockFaible as jest.Mock;
const alerterRupturePrevueMock = notifications.alerterRupturePrevue as jest.Mock;

function nouvelleApp(): Express {
  let app!: Express;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../src/app') as typeof import('../src/app');
    app = mod.construireApplication();
  });
  return app;
}

function jetonBearer(userId: string, typeCompte: string = 'COMMERCANT'): string {
  return `Bearer ${genererAccessToken(userId, typeCompte)}`;
}

const corpsEtablissementValide = {
  type: 'BOUTIQUE' as const,
  nom: 'Boutique Khadim',
  description: 'Épicerie de quartier',
  codePays: 'SN',
  ville: 'Dakar',
  adresse: 'Sicap Liberté 6, villa 1234',
  telephone: '+221701234567',
  numeroNinea: 'SN-2026-001',
};

// ---------------------------------------------------------------------------
// 1. Créer un établissement → 201 avec les bons champs
// ---------------------------------------------------------------------------

describe('POST /api/v1/etablissements — création', () => {
  beforeEach(() => {
    utilisateur.findUnique.mockReset();
    etablissement.count.mockReset();
    etablissement.create.mockReset();
    evenementAudit.create.mockResolvedValue({});
  });

  it('renvoie 201 avec l\'établissement créé et statut ACTIF', async () => {
    utilisateur.findUnique.mockResolvedValue({
      id: 'patron-1',
      estVerifie: true,
      estSuspendu: false,
    });
    etablissement.count.mockResolvedValue(0);
    etablissement.create.mockResolvedValue({
      id: 'etab-1',
      idProprietaire: 'patron-1',
      type: 'BOUTIQUE',
      statut: 'ACTIF',
      nom: corpsEtablissementValide.nom,
      codePays: 'SN',
      ville: 'Dakar',
      adresse: corpsEtablissementValide.adresse,
      telephone: corpsEtablissementValide.telephone,
      numeroNinea: corpsEtablissementValide.numeroNinea,
      dateCreation: new Date('2026-05-25T10:00:00Z'),
    });

    const reponse = await request(nouvelleApp())
      .post('/api/v1/etablissements')
      .set('Authorization', jetonBearer('patron-1'))
      .send(corpsEtablissementValide);

    expect(reponse.status).toBe(201);
    expect(reponse.body.etablissement).toMatchObject({
      id: 'etab-1',
      type: 'BOUTIQUE',
      statut: 'ACTIF',
      nom: 'Boutique Khadim',
      codePays: 'SN',
      ville: 'Dakar',
    });
    expect(etablissement.create).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 2. R74 — 21ème établissement → 400
// ---------------------------------------------------------------------------

describe('R74 — limite de 20 établissements par propriétaire', () => {
  beforeEach(() => {
    utilisateur.findUnique.mockResolvedValue({
      id: 'patron-2',
      estVerifie: true,
      estSuspendu: false,
    });
    etablissement.count.mockReset();
    etablissement.create.mockReset();
  });

  it('bloque la 21ème création avec 400 et le message attendu', async () => {
    etablissement.count.mockResolvedValue(20);

    const reponse = await request(nouvelleApp())
      .post('/api/v1/etablissements')
      .set('Authorization', jetonBearer('patron-2'))
      .send(corpsEtablissementValide);

    expect(reponse.status).toBe(400);
    expect(reponse.body.message).toBe('Limite de 20 établissements atteinte');
    expect(reponse.body.code).toBe('LIMITE_ETABLISSEMENTS_ATTEINTE');
    expect(etablissement.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Utilisateur non vérifié → 403
// ---------------------------------------------------------------------------

describe('Utilisateur non vérifié — création interdite', () => {
  it('renvoie 403 avec le message exact de la spec', async () => {
    utilisateur.findUnique.mockResolvedValue({
      id: 'patron-3',
      estVerifie: false,
      estSuspendu: false,
    });

    const reponse = await request(nouvelleApp())
      .post('/api/v1/etablissements')
      .set('Authorization', jetonBearer('patron-3'))
      .send(corpsEtablissementValide);

    expect(reponse.status).toBe(403);
    expect(reponse.body.message).toBe('Vérifiez votre identité avant de créer un établissement');
    expect(reponse.body.code).toBe('COMPTE_NON_VERIFIE');
    expect(etablissement.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Modifier l'établissement d'un autre utilisateur → 403
// ---------------------------------------------------------------------------

describe("PATCH /:id — modifier l'établissement d'un autre utilisateur", () => {
  beforeEach(() => {
    etablissement.findUnique.mockReset();
    etablissement.update.mockReset();
  });

  it('renvoie 403 ACCES_REFUSE sans détailler à qui appartient l\'établissement', async () => {
    etablissement.findUnique.mockResolvedValue({
      id: 'etab-rival',
      idProprietaire: 'autre-user',
      statut: 'ACTIF',
    });

    const reponse = await request(nouvelleApp())
      .patch('/api/v1/etablissements/etab-rival')
      .set('Authorization', jetonBearer('patron-4'))
      .send({ nom: 'Nouveau nom forcé' });

    expect(reponse.status).toBe(403);
    expect(reponse.body.code).toBe('ACCES_REFUSE');
    // Aucune fuite sur l'identité du vrai propriétaire
    expect(JSON.stringify(reponse.body)).not.toContain('autre-user');
    expect(etablissement.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. rechercherProduits — filtres ville + categorie
// ---------------------------------------------------------------------------

describe('GET /api/v1/produits/catalogue — filtres ville + categorie', () => {
  beforeEach(() => {
    produit.findMany.mockReset();
    produit.count.mockReset();
  });

  it('applique categorie (lowercase) ET filtre établissement.ville', async () => {
    produit.findMany.mockResolvedValue([]);
    produit.count.mockResolvedValue(0);

    const reponse = await request(nouvelleApp())
      .get('/api/v1/produits/catalogue')
      .query({ ville: 'Dakar', categorie: 'Alimentation' });

    expect(reponse.status).toBe(200);

    // Le where doit contenir categorie='alimentation' (toLowerCase appliqué)
    // ET un filtre établissement.ville case-insensitive
    expect(produit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categorie: 'alimentation',
          etablissement: expect.objectContaining({
            ville: expect.objectContaining({ equals: 'Dakar', mode: 'insensitive' }),
            statut: expect.objectContaining({ in: ['ACTIF', 'EN_PAUSE'] }),
          }),
        }),
      }),
    );

    // Et le count utilise le MÊME where (même comptage que la page)
    expect(produit.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categorie: 'alimentation',
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// 6. mettreAJourStock — alerte J-7 si joursRestants ≤ 7
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/produits/:id/stock — alerte rupture J-7', () => {
  beforeEach(() => {
    produit.findUnique.mockReset();
    produit.update.mockReset();
    alerterStockFaibleMock.mockClear();
    alerterRupturePrevueMock.mockClear();
  });

  it("déclenche alerterRupturePrevue quand vélocité × 7 ≥ stock restant", async () => {
    // Setup : produit créé il y a 10 jours, stockInitial=100, on passe à 30
    // → unitesVendues = 70, vélocité = 7/jour, joursRestants = ceil(30/7) = 5 → alerte
    const dateCreation = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    produit.findUnique.mockResolvedValue({
      id: 'prod-1',
      idEtablissement: 'etab-1',
      nom: 'Sac de riz 25kg',
      stockActuel: 50,
      stockMinimum: 5,
      stockInitial: 100,
      dateCreation,
      etablissement: {
        id: 'etab-1',
        idProprietaire: 'patron-5',
        statut: 'ACTIF',
        nom: 'Boutique Khadim',
      },
    });

    produit.update.mockResolvedValue({
      id: 'prod-1',
      idEtablissement: 'etab-1',
      nom: 'Sac de riz 25kg',
      stockActuel: 30, // nouveau stock
      stockMinimum: 5,
      stockInitial: 100,
      dateCreation,
    });

    const reponse = await request(nouvelleApp())
      .patch('/api/v1/produits/prod-1/stock')
      .set('Authorization', jetonBearer('patron-5'))
      .send({ stockActuel: 30 });

    expect(reponse.status).toBe(200);

    // Stock 30 > stockMinimum 5 → pas d'alerte stock faible
    expect(alerterStockFaibleMock).not.toHaveBeenCalled();

    // joursRestants = ceil(30 / 7) = 5 ≤ 7 → alerte rupture prévue
    expect(alerterRupturePrevueMock).toHaveBeenCalledTimes(1);
    const contexte = alerterRupturePrevueMock.mock.calls[0]?.[0];
    expect(contexte).toMatchObject({
      idProduit: 'prod-1',
      idEtablissement: 'etab-1',
      idProprietaire: 'patron-5',
      nomProduit: 'Sac de riz 25kg',
      stockActuel: 30,
      joursRestants: 5,
    });
    expect(contexte.velociteParJour).toBeCloseTo(7, 5);
  });

  it("ne déclenche PAS l'alerte si la vélocité donne plus de 7 jours d'autonomie", async () => {
    // Produit jeune (2 jours), vendu très peu → vélocité faible → joursRestants énorme
    const dateCreation = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    produit.findUnique.mockResolvedValue({
      id: 'prod-2',
      idEtablissement: 'etab-2',
      nom: 'Pagne wax',
      stockActuel: 100,
      stockMinimum: 5,
      stockInitial: 102,
      dateCreation,
      etablissement: {
        id: 'etab-2',
        idProprietaire: 'patron-6',
        statut: 'ACTIF',
        nom: 'Boutique Khadim',
      },
    });

    produit.update.mockResolvedValue({
      id: 'prod-2',
      idEtablissement: 'etab-2',
      nom: 'Pagne wax',
      stockActuel: 99, // une vente de plus
      stockMinimum: 5,
      stockInitial: 102,
      dateCreation,
    });

    const reponse = await request(nouvelleApp())
      .patch('/api/v1/produits/prod-2/stock')
      .set('Authorization', jetonBearer('patron-6'))
      .send({ stockActuel: 99 });

    expect(reponse.status).toBe(200);
    // vélocité = 3/2 = 1.5/jour, joursRestants = ceil(99/1.5) = 66 → pas d'alerte
    expect(alerterRupturePrevueMock).not.toHaveBeenCalled();
    expect(alerterStockFaibleMock).not.toHaveBeenCalled();
  });
});
