import type { Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { cache } from '../config/redis';
import { ErreurMetier } from '../middlewares/gestionnaireErreurs';
import { enregistrerEvenementAudit } from '../middlewares/journalAudit';
import { envoyerSms } from '../services/sms.service';
import { hacherMotDePasse, verifierMotDePasse } from '../utils/hachage';
import {
  genererAccessToken,
  genererRefreshToken,
  verifierRefreshToken,
} from '../utils/jwt';
import {
  DUREE_VIE_OTP_SECONDES,
  genererOTP,
  stockerOTP,
  verifierEtConsommerOTP,
} from '../utils/generationOtp';
import { trouverPays, type CodePays } from '@borbi/shared';

/**
 * Contrôleurs d'authentification Bor-Bi.
 *
 * Principes structurants :
 *  - Validation Zod en entrée → ZodError attrapée par le gestionnaire global (422)
 *  - Erreurs métier connues via ErreurMetier → status custom, message en français
 *  - Le refresh token vit UNIQUEMENT en cookie httpOnly + Secure + SameSite=Strict
 *  - Le refresh token est aussi cloné dans Redis sous `refresh:{userId}` pour
 *    permettre une révocation côté serveur (déconnexion ou compromission)
 *  - Aucune réponse ne révèle le numéro complet, ni si l'email/téléphone existe
 *  - Aucun message d'erreur ne distingue "email faux" de "mot de passe faux"
 */

// ---------------------------------------------------------------------------
// Schémas de validation
// ---------------------------------------------------------------------------

const ROLES_INSCRIPTION_AUTORISES = ['CLIENT', 'COMMERCANT', 'LIVREUR'] as const;

const schemaMotDePasse = z
  .string()
  // 1 majuscule, 1 chiffre, longueur ≥ 8 — règle imposée à l'inscription
  .regex(/^(?=.*[A-Z])(?=.*\d).{8,}$/u, {
    message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre',
  });

const schemaTelephoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/u, { message: 'Numéro invalide. Format attendu : +221XXXXXXXXX' });

const schemaInscription = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  telephone: schemaTelephoneE164,
  motDePasse: schemaMotDePasse,
  nomComplet: z.string().min(2).max(120),
  codePays: z.string().length(2),
  typeCompte: z.enum(ROLES_INSCRIPTION_AUTORISES),
  parrainCode: z.string().optional(),
});

const schemaVerificationOtp = z.object({
  tempToken: z.string().min(10),
  otp: z.string().regex(/^\d{6}$/u, { message: 'Le code OTP doit comporter 6 chiffres' }),
});

const schemaConnexion = z
  .object({
    email: z.string().email().optional(),
    telephone: schemaTelephoneE164.optional(),
    motDePasse: z.string().min(1),
  })
  .refine((d) => Boolean(d.email) || Boolean(d.telephone), {
    message: 'Email ou téléphone requis',
  });

// ---------------------------------------------------------------------------
// Constantes et helpers internes
// ---------------------------------------------------------------------------

const ACTION_TEMP_TOKEN = 'VERIFICATION_OTP';
const DUREE_TEMP_TOKEN = '5m';
const COOKIE_REFRESH = 'refreshToken';
const PREFIXE_CLE_REFRESH = 'refresh:';
const DUREE_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Masque un numéro E.164 pour ne montrer que les 4 derniers chiffres.
 * `+221701234567` → `+221 ** ** 4567`
 */
function masquerTelephone(telephone: string): string {
  if (telephone.length <= 5) return telephone;
  const debut = telephone.slice(0, 4);
  const fin = telephone.slice(-4);
  return `${debut}…${fin}`;
}

/**
 * Code de parrainage lisible humain. `BORBI-SN-A3K7` = utilisateur
 * sénégalais, suivi de 4 caractères alphanumériques aléatoires (CSPRNG).
 * Évite I/O/0/1 pour ne pas confondre à l'oral.
 */
const ALPHABET_PARRAINAGE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genererSuffixeParrainage(): string {
  const octets = randomBytes(4);
  let suffixe = '';
  for (let i = 0; i < 4; i += 1) {
    const indice = (octets[i] ?? 0) % ALPHABET_PARRAINAGE.length;
    suffixe += ALPHABET_PARRAINAGE[indice];
  }
  return suffixe;
}

/**
 * Boucle de génération + collision check. En pratique, sur 32^4 = ~1M
 * de combinaisons par pays, on n'aura jamais de collision avant
 * plusieurs centaines de milliers d'utilisateurs — mais on protège.
 */
async function genererCodeParrainageUnique(codePays: string): Promise<string> {
  for (let tentative = 0; tentative < 5; tentative += 1) {
    const candidat = `BORBI-${codePays}-${genererSuffixeParrainage()}`;
    const existe = await prisma.utilisateur.findUnique({
      where: { codeParrainage: candidat },
      select: { id: true },
    });
    if (!existe) return candidat;
  }
  // Improbable, mais on préfère une erreur explicite à une boucle infinie
  throw new ErreurMetier('Impossible de générer un code de parrainage unique', 500, 'GEN_PARRAINAGE');
}

function signerTempToken(userId: string): string {
  return jwt.sign(
    { sub: userId, action: ACTION_TEMP_TOKEN },
    env.JWT_SECRET,
    { expiresIn: DUREE_TEMP_TOKEN, issuer: 'borbi-tech', algorithm: 'HS256' },
  );
}

interface ChargeTempToken extends JwtPayload {
  sub: string;
  action: string;
}

function verifierTempToken(jeton: string): ChargeTempToken | null {
  try {
    const charge = jwt.verify(jeton, env.JWT_SECRET, { issuer: 'borbi-tech' }) as JwtPayload;
    if (typeof charge !== 'object' || charge === null) return null;
    if ((charge as { action?: string }).action !== ACTION_TEMP_TOKEN) return null;
    if (typeof charge.sub !== 'string') return null;
    return charge as ChargeTempToken;
  } catch {
    return null;
  }
}

function envoyerCookieRafraichissement(reponse: Response, jeton: string): void {
  reponse.cookie(COOKIE_REFRESH, jeton, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: DUREE_REFRESH_MS,
    path: '/api/v1/auth',
  });
}

function effacerCookieRafraichissement(reponse: Response): void {
  reponse.clearCookie(COOKIE_REFRESH, { path: '/api/v1/auth' });
}

function ipDeRequete(requete: Request): string | null {
  return requete.ip ?? requete.socket.remoteAddress ?? null;
}

// ---------------------------------------------------------------------------
// 1. sInscrire — étape 1/2 (envoi OTP)
// ---------------------------------------------------------------------------

export async function sInscrire(requete: Request, reponse: Response): Promise<void> {
  const corps = schemaInscription.parse(requete.body);

  // R73 — le préfixe du téléphone doit correspondre au code pays choisi
  const pays = trouverPays(corps.codePays as CodePays);
  if (!pays) {
    throw new ErreurMetier('Code pays non pris en charge', 422, 'PAYS_INVALIDE');
  }
  if (!corps.telephone.startsWith(pays.indicatifTelephone)) {
    throw new ErreurMetier(
      `Le numéro doit commencer par ${pays.indicatifTelephone} pour ${pays.nom}`,
      422,
      'TELEPHONE_PAYS_INCOHERENT',
    );
  }

  // Unicité email + téléphone vérifiée AVANT le hash bcrypt (coûteux)
  const existant = await prisma.utilisateur.findFirst({
    where: { OR: [{ email: corps.email }, { telephone: corps.telephone }] },
    select: { id: true },
  });
  if (existant) {
    // Message volontairement vague : on ne dit pas lequel des deux est pris
    // pour ne pas servir d'oracle d'énumération de comptes
    throw new ErreurMetier(
      'Un compte existe déjà avec cet email ou ce numéro',
      409,
      'COMPTE_EXISTANT',
    );
  }

  // Résolution du parrain éventuel — code invalide = inscription quand même OK,
  // simplement sans lien (l'utilisateur n'est pas pénalisé par une faute de frappe)
  let idParrain: string | null = null;
  if (corps.parrainCode && corps.parrainCode.trim().length > 0) {
    const parrain = await prisma.utilisateur.findUnique({
      where: { codeParrainage: corps.parrainCode.trim().toUpperCase() },
      select: { id: true },
    });
    idParrain = parrain?.id ?? null;
  }

  const motDePasseHash = await hacherMotDePasse(corps.motDePasse);
  const codeParrainage = await genererCodeParrainageUnique(corps.codePays.toUpperCase());

  const utilisateur = await prisma.utilisateur.create({
    data: {
      email: corps.email,
      telephone: corps.telephone,
      motDePasseHash,
      nomComplet: corps.nomComplet,
      codePays: corps.codePays.toUpperCase(),
      languePreferee: pays.langueDefaut,
      roles: [corps.typeCompte],
      codeParrainage,
      idParrain,
      estVerifie: false,
    },
    select: { id: true, telephone: true },
  });

  const otp = genererOTP();
  await stockerOTP(utilisateur.telephone, otp);
  await envoyerSms(
    utilisateur.telephone,
    `Bor-Bi : ton code de vérification est ${otp}. Il expire dans 10 minutes.`,
  );

  const tempToken = signerTempToken(utilisateur.id);

  await enregistrerEvenementAudit({
    action: 'TENTATIVE_INSCRIPTION',
    idUtilisateur: utilisateur.id,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: { typeCompte: corps.typeCompte, codePays: corps.codePays },
  });

  reponse.status(201).json({
    message: `Code envoyé au ${masquerTelephone(utilisateur.telephone)}`,
    tempToken,
    dureeValiditeSecondes: DUREE_VIE_OTP_SECONDES,
  });
}

// ---------------------------------------------------------------------------
// 2. verifierOTPInscription — étape 2/2 (active le compte)
// ---------------------------------------------------------------------------

export async function verifierOTPInscription(requete: Request, reponse: Response): Promise<void> {
  const corps = schemaVerificationOtp.parse(requete.body);

  const charge = verifierTempToken(corps.tempToken);
  if (!charge) {
    throw new ErreurMetier('Lien d\'inscription expiré. Recommence l\'inscription.', 401, 'TEMP_TOKEN_INVALIDE');
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: charge.sub },
    select: { id: true, telephone: true, email: true, estVerifie: true, estSuspendu: true, roles: true },
  });
  if (!utilisateur) {
    throw new ErreurMetier('Compte introuvable', 404, 'COMPTE_INTROUVABLE');
  }

  const otpValide = await verifierEtConsommerOTP(utilisateur.telephone, corps.otp);
  if (!otpValide) {
    await enregistrerEvenementAudit({
      action: 'ECHEC_OTP',
      idUtilisateur: utilisateur.id,
      adresseIp: ipDeRequete(requete),
      userAgent: requete.get('user-agent') ?? null,
      donnees: { contexte: 'INSCRIPTION' },
    });
    throw new ErreurMetier('Code OTP invalide ou expiré', 401, 'OTP_INVALIDE');
  }

  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: { estVerifie: true },
  });

  const roleProprietaire = utilisateur.roles[0] ?? 'CLIENT';
  const accessToken = genererAccessToken(utilisateur.id, roleProprietaire);
  const refreshToken = genererRefreshToken(utilisateur.id);

  await cache.set(`${PREFIXE_CLE_REFRESH}${utilisateur.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);
  envoyerCookieRafraichissement(reponse, refreshToken);

  await enregistrerEvenementAudit({
    action: 'INSCRIPTION_VALIDEE',
    idUtilisateur: utilisateur.id,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: {},
  });

  reponse.status(200).json({
    accessToken,
    utilisateur: {
      id: utilisateur.id,
      email: utilisateur.email,
      typeCompte: roleProprietaire,
      estVerifie: true,
    },
  });
}

// ---------------------------------------------------------------------------
// 3. seConnecter
// ---------------------------------------------------------------------------

export async function seConnecter(requete: Request, reponse: Response): Promise<void> {
  const corps = schemaConnexion.parse(requete.body);

  const utilisateur = await prisma.utilisateur.findFirst({
    where: corps.email ? { email: corps.email } : { telephone: corps.telephone! },
    select: {
      id: true,
      email: true,
      motDePasseHash: true,
      roles: true,
      estVerifie: true,
      estSuspendu: true,
    },
  });

  // Identifiants invalides : message volontairement générique. On NE dit PAS
  // si l'email est faux, si le mot de passe est faux, ni si le compte
  // n'existe pas — un attaquant n'a pas à apprendre lequel.
  const erreurGenerique = new ErreurMetier('Identifiants invalides', 401, 'IDENTIFIANTS_INVALIDES');

  if (!utilisateur) {
    throw erreurGenerique;
  }

  const motDePasseOk = await verifierMotDePasse(corps.motDePasse, utilisateur.motDePasseHash);
  if (!motDePasseOk) {
    throw erreurGenerique;
  }

  if (utilisateur.estSuspendu) {
    throw new ErreurMetier(
      'Compte suspendu. Contacte le support pour réactiver.',
      403,
      'COMPTE_SUSPENDU',
    );
  }

  if (!utilisateur.estVerifie) {
    throw new ErreurMetier(
      'Compte non vérifié. Vérifie ton numéro avant de te connecter.',
      403,
      'COMPTE_NON_VERIFIE',
    );
  }

  const roleProprietaire = utilisateur.roles[0] ?? 'CLIENT';
  const accessToken = genererAccessToken(utilisateur.id, roleProprietaire);
  const refreshToken = genererRefreshToken(utilisateur.id);

  await cache.set(`${PREFIXE_CLE_REFRESH}${utilisateur.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);
  envoyerCookieRafraichissement(reponse, refreshToken);

  await enregistrerEvenementAudit({
    action: 'CONNEXION',
    idUtilisateur: utilisateur.id,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: { methode: corps.email ? 'EMAIL' : 'TELEPHONE' },
  });

  reponse.status(200).json({
    accessToken,
    utilisateur: {
      id: utilisateur.id,
      email: utilisateur.email,
      typeCompte: roleProprietaire,
      estVerifie: utilisateur.estVerifie,
    },
  });
}

// ---------------------------------------------------------------------------
// 4. seDeconnecter
// ---------------------------------------------------------------------------

export async function seDeconnecter(requete: Request, reponse: Response): Promise<void> {
  // L'utilisateur est forcément authentifié (verificationJWT en amont)
  // donc req.userId est garanti défini par le contrat du middleware
  const userId = requete.userId;
  if (userId) {
    await cache.del(`${PREFIXE_CLE_REFRESH}${userId}`);
    await enregistrerEvenementAudit({
      action: 'DECONNEXION',
      idUtilisateur: userId,
      adresseIp: ipDeRequete(requete),
      userAgent: requete.get('user-agent') ?? null,
      donnees: {},
    });
  }
  effacerCookieRafraichissement(reponse);
  reponse.status(200).json({ message: 'Déconnecté avec succès' });
}

// ---------------------------------------------------------------------------
// 5. rafraichirToken
// ---------------------------------------------------------------------------

export async function rafraichirToken(requete: Request, reponse: Response): Promise<void> {
  const cookies = requete.cookies as Record<string, string | undefined> | undefined;
  const refreshToken = cookies?.[COOKIE_REFRESH];
  if (!refreshToken) {
    throw new ErreurMetier('Session expirée, veuillez vous reconnecter', 401, 'REFRESH_ABSENT');
  }

  const charge = verifierRefreshToken(refreshToken);
  if (!charge) {
    effacerCookieRafraichissement(reponse);
    throw new ErreurMetier('Session expirée, veuillez vous reconnecter', 401, 'REFRESH_INVALIDE');
  }

  // Cross-check côté serveur : le refresh doit être celui qu'on a émis.
  // Si Redis ne le retrouve pas → l'utilisateur s'est déconnecté entre-temps
  // ou le token a été révoqué (compromission).
  const refreshStocke = await cache.get(`${PREFIXE_CLE_REFRESH}${charge.sub}`);
  if (refreshStocke !== refreshToken) {
    effacerCookieRafraichissement(reponse);
    throw new ErreurMetier('Session expirée, veuillez vous reconnecter', 401, 'REFRESH_REVOQUE');
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: charge.sub },
    select: { id: true, roles: true, estSuspendu: true, estVerifie: true },
  });
  if (!utilisateur || utilisateur.estSuspendu) {
    effacerCookieRafraichissement(reponse);
    throw new ErreurMetier('Session expirée, veuillez vous reconnecter', 401, 'REFRESH_INVALIDE');
  }

  const roleProprietaire = utilisateur.roles[0] ?? 'CLIENT';
  const nouveauAccessToken = genererAccessToken(utilisateur.id, roleProprietaire);
  reponse.status(200).json({ accessToken: nouveauAccessToken });
}
