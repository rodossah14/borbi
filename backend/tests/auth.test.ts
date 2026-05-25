/**
 * Tests d'authentification — Étape 2.
 *
 * Couvre les 6 garanties imposées :
 *   1. bcrypt coût 12 (R20) — vérifié dans le hash produit
 *   2. accessToken JWT expire après 15 min (R21) — clock simulée
 *   3. 6ème tentative de connexion → 429 (R22) — rate limiter
 *   4. OTP usage unique — deuxième vérification renvoie false
 *   5. Mot de passe invalide → 401 générique sans dire si email ou mdp
 *   6. Erreur interne → réponse sans stack trace (production-safe)
 *
 * Prisma est entièrement mocké : aucun accès BDD requis pour faire
 * tourner la suite. Le cache Redis utilise le client factice mémoire
 * activé par `REDIS_URL=...fictif.upstash.io...` dans setup.ts.
 */

import request from 'supertest';
import type { Express } from 'express';
import type { NextFunction, Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock complet du client Prisma — défini AVANT tout import qui pourrait
// résoudre `config/prisma`.
jest.mock('../src/config/prisma', () => ({
  prisma: {
    utilisateur: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    evenementAudit: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
  },
}));

// ---------------------------------------------------------------------------
// Imports — APRÈS les mocks
// ---------------------------------------------------------------------------

import { prisma } from '../src/config/prisma';
import { hacherMotDePasse, verifierMotDePasse } from '../src/utils/hachage';
import { genererAccessToken, verifierAccessToken } from '../src/utils/jwt';
import { stockerOTP, verifierEtConsommerOTP } from '../src/utils/generationOtp';
import { gestionnaireErreurs, ErreurMetier } from '../src/middlewares/gestionnaireErreurs';

// Helper de typage pour accéder facilement aux mocks
const utilisateurMock = prisma.utilisateur as unknown as {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

/**
 * Crée une instance d'app fraîche à chaque appel. Indispensable pour le
 * test de rate limiter : sinon le compteur d'IP est partagé entre les
 * tests, le 6ème call peut tomber sur 429 prématurément.
 */
function nouvelleApp(): Express {
  let app!: Express;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../src/app') as typeof import('../src/app');
    app = mod.construireApplication();
  });
  return app;
}

// ---------------------------------------------------------------------------
// 1. bcrypt coût 12
// ---------------------------------------------------------------------------

describe('hacherMotDePasse — R20 bcrypt coût 12', () => {
  it('produit un hash bcrypt dont le coût encodé est 12', async () => {
    const empreinte = await hacherMotDePasse('Borbi2026Test');
    // Format bcrypt : $2a|2b|2y$NN$... où NN est le coût
    expect(empreinte).toMatch(/^\$2[aby]\$12\$/);
  });

  it('vérifie correctement un mot de passe', async () => {
    const empreinte = await hacherMotDePasse('Borbi2026Test');
    expect(await verifierMotDePasse('Borbi2026Test', empreinte)).toBe(true);
    expect(await verifierMotDePasse('AutreMotDePasse1', empreinte)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. JWT accessToken expire après 15 min
// ---------------------------------------------------------------------------

describe('genererAccessToken — R21 expiration 15 min', () => {
  // Heure de référence arbitraire — l'important est de pouvoir avancer
  // l'horloge sans que la suite courante soit affectée par le vrai temps.
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-15T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('est valide juste avant 15 minutes, expiré juste après', () => {
    const jeton = genererAccessToken('utilisateur-1', 'COMMERCANT');

    // Encore valide à T+14:59
    jest.setSystemTime(new Date('2026-01-15T12:14:59Z'));
    const chargeAvant = verifierAccessToken(jeton);
    expect(chargeAvant).not.toBeNull();
    expect(chargeAvant?.sub).toBe('utilisateur-1');
    expect(chargeAvant?.typeCompte).toBe('COMMERCANT');

    // Expiré à T+15:01
    jest.setSystemTime(new Date('2026-01-15T12:15:01Z'));
    expect(verifierAccessToken(jeton)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. OTP usage unique
// ---------------------------------------------------------------------------

describe('verifierEtConsommerOTP — usage unique', () => {
  it('renvoie true à la première vérification, false à la seconde', async () => {
    const telephone = '+221701234567';
    const otp = '654321';

    await stockerOTP(telephone, otp);

    expect(await verifierEtConsommerOTP(telephone, otp)).toBe(true);
    // Deuxième appel : la clé Redis a été DEL, plus rien à consommer
    expect(await verifierEtConsommerOTP(telephone, otp)).toBe(false);
  });

  it('renvoie false si le code est faux (sans le consommer)', async () => {
    const telephone = '+221701112233';
    await stockerOTP(telephone, '111111');

    expect(await verifierEtConsommerOTP(telephone, '999999')).toBe(false);
    // L'OTP correct est toujours utilisable (l'utilisateur a droit à réessayer)
    expect(await verifierEtConsommerOTP(telephone, '111111')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Connexion — message générique sur identifiants invalides
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/connexion — identifiants invalides', () => {
  beforeEach(() => {
    utilisateurMock.findFirst.mockReset();
  });

  it('renvoie 401 avec un message générique qui ne mentionne ni email ni mot de passe', async () => {
    // Pas de compte trouvé en BDD → message générique attendu
    utilisateurMock.findFirst.mockResolvedValue(null);

    const reponse = await request(nouvelleApp())
      .post('/api/v1/auth/connexion')
      .send({ email: 'inconnu@borbi.sn', motDePasse: 'NimporteQuoi1' });

    expect(reponse.status).toBe(401);
    expect(reponse.body.message).toBe('Identifiants invalides');
    expect(reponse.body.code).toBe('IDENTIFIANTS_INVALIDES');

    const corpsBrut = JSON.stringify(reponse.body).toLowerCase();
    expect(corpsBrut).not.toContain('email');
    expect(corpsBrut).not.toContain('mot de passe');
    expect(corpsBrut).not.toContain('inconnu');
  });

  it('renvoie le MÊME message générique quand le mot de passe est faux', async () => {
    const empreinte = await hacherMotDePasse('VraiMotDePasse1');
    utilisateurMock.findFirst.mockResolvedValue({
      id: 'u-42',
      email: 'connu@borbi.sn',
      motDePasseHash: empreinte,
      roles: ['CLIENT'],
      estVerifie: true,
      estSuspendu: false,
    });

    const reponse = await request(nouvelleApp())
      .post('/api/v1/auth/connexion')
      .send({ email: 'connu@borbi.sn', motDePasse: 'MauvaisMotDePasse9' });

    expect(reponse.status).toBe(401);
    // Indistinguable de "email inconnu" : c'est exactement le but
    expect(reponse.body.message).toBe('Identifiants invalides');
    expect(reponse.body.code).toBe('IDENTIFIANTS_INVALIDES');
  });
});

// ---------------------------------------------------------------------------
// 3. Rate limiter — 6ème tentative → 429
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/connexion — R22 rate limiter', () => {
  beforeEach(() => {
    utilisateurMock.findFirst.mockReset();
    utilisateurMock.findFirst.mockResolvedValue(null);
  });

  it('bloque la 6ème tentative avec 429 après 5 échecs', async () => {
    const app = nouvelleApp();
    const payload = { email: 'attaquant@borbi.sn', motDePasse: 'BruteForce1' };

    for (let tentative = 1; tentative <= 5; tentative += 1) {
      const reponse = await request(app).post('/api/v1/auth/connexion').send(payload);
      expect(reponse.status).toBe(401);
    }

    const sixieme = await request(app).post('/api/v1/auth/connexion').send(payload);
    expect(sixieme.status).toBe(429);
    expect(sixieme.body.code).toBe('TROP_DE_TENTATIVES');
  });
});

// ---------------------------------------------------------------------------
// 6. Aucune fuite de stack trace en cas d'erreur interne
// ---------------------------------------------------------------------------

describe('gestionnaireErreurs — pas de stack trace dans la réponse client', () => {
  function reponseMock(): { status: jest.Mock; json: jest.Mock } {
    const reponse = { status: jest.fn(), json: jest.fn() } as { status: jest.Mock; json: jest.Mock };
    reponse.status.mockReturnValue(reponse);
    return reponse;
  }

  it("ne renvoie ni stack trace ni détail interne quand une erreur imprévue remonte", () => {
    const reponse = reponseMock();
    const erreurAvecDetail = new Error('détail interne ultra sensible avec mot de passe');

    gestionnaireErreurs(
      erreurAvecDetail,
      {} as Request,
      reponse as unknown as Response,
      jest.fn() as NextFunction,
    );

    expect(reponse.status).toHaveBeenCalledWith(500);
    const payload = reponse.json.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(payload).toEqual({
      code: 'ERREUR_INTERNE',
      message: 'Une erreur est survenue. Réessaie dans un instant.',
    });
    expect(payload).not.toHaveProperty('stack');
    expect(payload).not.toHaveProperty('details');
    // Aucun fragment de l'erreur originale ne doit fuiter
    expect(JSON.stringify(payload)).not.toContain('détail interne');
    expect(JSON.stringify(payload)).not.toContain('mot de passe');
  });

  it('expose le message d\'une ErreurMetier (erreur connue, message contrôlé)', () => {
    const reponse = reponseMock();
    const erreurMetier = new ErreurMetier('Compte suspendu', 403, 'COMPTE_SUSPENDU');

    gestionnaireErreurs(
      erreurMetier,
      {} as Request,
      reponse as unknown as Response,
      jest.fn() as NextFunction,
    );

    expect(reponse.status).toHaveBeenCalledWith(403);
    expect(reponse.json).toHaveBeenCalledWith({
      code: 'COMPTE_SUSPENDU',
      message: 'Compte suspendu',
    });
  });
});
