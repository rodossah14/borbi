import type { Request, Response } from 'express';
import { z } from 'zod';
import { TYPES_ETABLISSEMENT, type TypeEtablissement } from '@borbi/shared';
import { prisma } from '../config/prisma';
import { ErreurMetier } from '../middlewares/gestionnaireErreurs';
import { enregistrerEvenementAudit } from '../middlewares/journalAudit';

/**
 * Contrôleurs Établissements — Étape 3.
 *
 * Règles métier appliquées :
 *  - R74 : un propriétaire peut piloter au maximum 20 établissements
 *  - R80 : suppression = soft delete avec dateSuppression, récupérable
 *          pendant 30 jours par un job cron à venir
 *  - Compte non vérifié (estVerifie=false) ne peut pas créer un établissement
 *    (un commerçant sans NINEA ni KYC ne peut pas encaisser)
 *  - Notion d'équipe non encore implémentée : seul le proprietaire accède
 *    aux endpoints "mes" / detail / modifier / basculerStatut
 *    TODO Étape ultérieure : ajouter un model MembreEquipe et étendre
 *    les vérifications d'accès ci-dessous.
 *  - SUSPENDU : sanction admin → réservé aux utilisateurs avec rôle
 *    ADMINISTRATEUR (pas de SUPER_ADMIN distinct dans le schéma actuel)
 */

const NOMBRE_MAX_ETABLISSEMENTS = 20;

const TYPES_ACCEPTES = [
  'BOUTIQUE',
  'RESTAURANT',
  'HOTEL',
  'ENTREPOT',
  'KIOSQUE',
  'SHOWROOM',
  'PRESTATAIRE',
  'PHARMACIE',
  'ARTISAN',
] as const satisfies readonly TypeEtablissement[];

// ---------------------------------------------------------------------------
// Schémas de validation
// ---------------------------------------------------------------------------

const schemaCreationEtablissement = z.object({
  type: z.enum(TYPES_ACCEPTES),
  nom: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  codePays: z.string().length(2),
  ville: z.string().trim().min(2).max(80),
  adresse: z.string().trim().max(300).optional(),
  telephone: z.string().trim().max(20).optional(),
  // Horaires : objet JSON libre. Validation stricte des clés viendra
  // quand on aura standardisé le format côté front (Étape UI).
  horaires: z.record(z.string()).optional(),
  logoUrl: z.string().url().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  numeroNinea: z.string().trim().max(40).optional(),
});

// Champs autorisés à la modification — volontairement plus restrictif que
// la création (le type, le pays et le NINEA ne sont pas modifiables une
// fois créés, ils impactent la fiscalité et l'historique).
const schemaModificationEtablissement = z.object({
  nom: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  adresse: z.string().trim().max(300).optional(),
  ville: z.string().trim().min(2).max(80).optional(),
  telephone: z.string().trim().max(20).optional(),
  horaires: z.record(z.string()).optional(),
  logoUrl: z.string().url().optional(),
});

const schemaBasculerStatut = z.object({
  statut: z.enum(['ACTIF', 'EN_PAUSE', 'SUSPENDU', 'SUPPRIME']),
  motif: z.string().trim().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exigerUtilisateurAuthentifie(requete: Request): string {
  // verificationJWT garantit la présence — défense en profondeur au cas où
  // la route serait montée sans le middleware par erreur.
  if (!requete.userId) {
    throw new ErreurMetier('Authentification requise', 401, 'AUTH_REQUISE');
  }
  return requete.userId;
}

function ipDeRequete(requete: Request): string | null {
  return requete.ip ?? requete.socket.remoteAddress ?? null;
}

interface OptionsAccesEtablissement {
  /** Inclure les établissements SUPPRIME ? Par défaut : non */
  inclureSupprimes?: boolean;
}

/**
 * Récupère un établissement et vérifie que l'utilisateur en est bien
 * propriétaire. Lève ErreurMetier 403 sinon, 404 si introuvable.
 *
 * TODO : élargir aux membres d'équipe quand le model existera.
 */
async function recupererEtablissementProprietaire(
  idEtablissement: string,
  idUtilisateur: string,
  options: OptionsAccesEtablissement = {},
): Promise<{
  id: string;
  idProprietaire: string;
  statut: 'ACTIF' | 'EN_PAUSE' | 'SUSPENDU' | 'SUPPRIME';
}> {
  const etablissement = await prisma.etablissement.findUnique({
    where: { id: idEtablissement },
    select: { id: true, idProprietaire: true, statut: true },
  });

  if (!etablissement) {
    throw new ErreurMetier('Établissement introuvable', 404, 'ETABLISSEMENT_INTROUVABLE');
  }
  if (etablissement.idProprietaire !== idUtilisateur) {
    // 403 sans détail pour ne pas servir d'oracle d'existence
    throw new ErreurMetier('Accès refusé à cet établissement', 403, 'ACCES_REFUSE');
  }
  if (!options.inclureSupprimes && etablissement.statut === 'SUPPRIME') {
    throw new ErreurMetier('Établissement supprimé', 410, 'ETABLISSEMENT_SUPPRIME');
  }
  return etablissement;
}

// ---------------------------------------------------------------------------
// 1. creerEtablissement
// ---------------------------------------------------------------------------

export async function creerEtablissement(requete: Request, reponse: Response): Promise<void> {
  const idUtilisateur = exigerUtilisateurAuthentifie(requete);
  const corps = schemaCreationEtablissement.parse(requete.body);

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: idUtilisateur },
    select: { id: true, estVerifie: true, estSuspendu: true },
  });
  if (!utilisateur) {
    throw new ErreurMetier('Compte introuvable', 404, 'COMPTE_INTROUVABLE');
  }
  if (utilisateur.estSuspendu) {
    throw new ErreurMetier('Compte suspendu', 403, 'COMPTE_SUSPENDU');
  }
  if (!utilisateur.estVerifie) {
    throw new ErreurMetier(
      'Vérifiez votre identité avant de créer un établissement',
      403,
      'COMPTE_NON_VERIFIE',
    );
  }

  // R74 — limite stricte de 20 établissements. Compte uniquement les
  // établissements non supprimés (les SUPPRIME pendant la fenêtre de
  // récupération de 30j ne bloquent pas la création d'un nouveau).
  const nombreEtablissements = await prisma.etablissement.count({
    where: { idProprietaire: idUtilisateur, statut: { not: 'SUPPRIME' } },
  });
  if (nombreEtablissements >= NOMBRE_MAX_ETABLISSEMENTS) {
    throw new ErreurMetier(
      `Limite de ${NOMBRE_MAX_ETABLISSEMENTS} établissements atteinte`,
      400,
      'LIMITE_ETABLISSEMENTS_ATTEINTE',
    );
  }

  // Vérification métier : certains types exigent des documents légaux
  // (NINEA, agrément hygiène, ordre des pharmaciens). Pour l'instant on
  // se contente d'avertir via le journal — la validation stricte des
  // documents viendra avec le module KYC.
  const informationsType = TYPES_ETABLISSEMENT[corps.type];
  const documentsManquants = informationsType.documentsRequis.filter((doc) => {
    if (doc === 'NINEA') return !corps.numeroNinea;
    return false; // CNI et agréments seront vérifiés ultérieurement
  });
  if (documentsManquants.length > 0 && documentsManquants.includes('NINEA')) {
    // Un commerçant sans NINEA ne peut pas encaisser légalement
    throw new ErreurMetier(
      `Le NINEA est obligatoire pour un établissement de type ${informationsType.libelle}`,
      400,
      'NINEA_OBLIGATOIRE',
    );
  }

  const etablissement = await prisma.etablissement.create({
    data: {
      idProprietaire: idUtilisateur,
      type: corps.type,
      statut: 'ACTIF',
      nom: corps.nom,
      description: corps.description ?? null,
      codePays: corps.codePays.toUpperCase(),
      ville: corps.ville,
      adresse: corps.adresse ?? null,
      telephone: corps.telephone ?? null,
      horaires: corps.horaires ? JSON.parse(JSON.stringify(corps.horaires)) : undefined,
      logoUrl: corps.logoUrl ?? null,
      latitude: corps.latitude ?? null,
      longitude: corps.longitude ?? null,
      numeroNinea: corps.numeroNinea ?? null,
    },
  });

  await enregistrerEvenementAudit({
    action: 'CREATION_ETABLISSEMENT',
    idUtilisateur,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: { idEtablissement: etablissement.id, type: corps.type, ville: corps.ville },
  });

  reponse.status(201).json({ etablissement });
}

// ---------------------------------------------------------------------------
// 2. listerMesEtablissements
// ---------------------------------------------------------------------------

export async function listerMesEtablissements(requete: Request, reponse: Response): Promise<void> {
  const idUtilisateur = exigerUtilisateurAuthentifie(requete);

  // Exclut SUPPRIME par défaut. Un endpoint séparé "corbeille" affichera
  // les établissements supprimés récupérables (à venir).
  const etablissements = await prisma.etablissement.findMany({
    where: {
      idProprietaire: idUtilisateur,
      statut: { not: 'SUPPRIME' },
    },
    select: {
      id: true,
      type: true,
      statut: true,
      nom: true,
      ville: true,
      codePays: true,
      logoUrl: true,
      dateCreation: true,
      _count: { select: { produits: true } },
    },
    orderBy: { dateCreation: 'desc' },
  });

  reponse.status(200).json({
    etablissements: etablissements.map((etab) => ({
      id: etab.id,
      type: etab.type,
      statut: etab.statut,
      nom: etab.nom,
      ville: etab.ville,
      codePays: etab.codePays,
      logoUrl: etab.logoUrl,
      dateCreation: etab.dateCreation,
      nombreProduits: etab._count.produits,
    })),
  });
}

// ---------------------------------------------------------------------------
// 3. obtenirEtablissement
// ---------------------------------------------------------------------------

export async function obtenirEtablissement(requete: Request, reponse: Response): Promise<void> {
  const idUtilisateur = exigerUtilisateurAuthentifie(requete);
  const idEtablissement = requete.params.id;
  if (!idEtablissement) {
    throw new ErreurMetier('Identifiant manquant', 400, 'ID_MANQUANT');
  }

  // Vérifie l'accès propriétaire (équipe = TODO ultérieur)
  await recupererEtablissementProprietaire(idEtablissement, idUtilisateur);

  const etablissement = await prisma.etablissement.findUnique({
    where: { id: idEtablissement },
    include: {
      produits: {
        orderBy: { dateCreation: 'desc' },
        take: 10,
      },
      _count: { select: { produits: true } },
    },
  });

  // Le findUnique ne devrait jamais renvoyer null ici (déjà checké au-dessus)
  // mais TypeScript ne le sait pas — défense en profondeur.
  if (!etablissement) {
    throw new ErreurMetier('Établissement introuvable', 404, 'ETABLISSEMENT_INTROUVABLE');
  }

  const { _count, ...sansCount } = etablissement;
  reponse.status(200).json({
    etablissement: {
      ...sansCount,
      nombreProduits: _count.produits,
    },
  });
}

// ---------------------------------------------------------------------------
// 4. modifierEtablissement
// ---------------------------------------------------------------------------

export async function modifierEtablissement(requete: Request, reponse: Response): Promise<void> {
  const idUtilisateur = exigerUtilisateurAuthentifie(requete);
  const idEtablissement = requete.params.id;
  if (!idEtablissement) {
    throw new ErreurMetier('Identifiant manquant', 400, 'ID_MANQUANT');
  }
  const corps = schemaModificationEtablissement.parse(requete.body);

  // Vérifie l'accès et bloque la modification d'un établissement supprimé
  await recupererEtablissementProprietaire(idEtablissement, idUtilisateur);

  // Capture l'état AVANT pour l'audit (R60 — diff avant/après)
  const avant = await prisma.etablissement.findUnique({
    where: { id: idEtablissement },
    select: {
      nom: true,
      description: true,
      adresse: true,
      ville: true,
      telephone: true,
      horaires: true,
      logoUrl: true,
    },
  });

  // Construit la patch en excluant les undefined (PATCH sémantique :
  // un champ absent du corps ne doit pas écraser la valeur existante)
  const donneesPatch: Record<string, unknown> = {};
  if (corps.nom !== undefined) donneesPatch.nom = corps.nom;
  if (corps.description !== undefined) donneesPatch.description = corps.description;
  if (corps.adresse !== undefined) donneesPatch.adresse = corps.adresse;
  if (corps.ville !== undefined) donneesPatch.ville = corps.ville;
  if (corps.telephone !== undefined) donneesPatch.telephone = corps.telephone;
  if (corps.horaires !== undefined) donneesPatch.horaires = JSON.parse(JSON.stringify(corps.horaires));
  if (corps.logoUrl !== undefined) donneesPatch.logoUrl = corps.logoUrl;

  if (Object.keys(donneesPatch).length === 0) {
    throw new ErreurMetier('Aucun champ à modifier', 400, 'PATCH_VIDE');
  }

  const apres = await prisma.etablissement.update({
    where: { id: idEtablissement },
    data: donneesPatch,
  });

  // R60 — diff avant/après dans l'audit
  await enregistrerEvenementAudit({
    action: 'MODIFICATION_ETABLISSEMENT',
    idUtilisateur,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: {
      idEtablissement,
      avant: avant ?? {},
      apres: donneesPatch,
    },
  });

  reponse.status(200).json({ etablissement: apres });
}

// ---------------------------------------------------------------------------
// 5. basculerStatut
// ---------------------------------------------------------------------------

export async function basculerStatut(requete: Request, reponse: Response): Promise<void> {
  const idUtilisateur = exigerUtilisateurAuthentifie(requete);
  const idEtablissement = requete.params.id;
  if (!idEtablissement) {
    throw new ErreurMetier('Identifiant manquant', 400, 'ID_MANQUANT');
  }
  const { statut: statutCible, motif } = schemaBasculerStatut.parse(requete.body);

  // Cas spécial : SUSPENDU est une sanction admin, jamais l'utilisateur
  // ne peut basculer son propre établissement en SUSPENDU. À l'inverse,
  // un admin ne devrait normalement pas pouvoir SUPPRIME un établissement
  // qui n'est pas le sien — mais on permet le déblocage par l'admin (sortie
  // de SUSPENDU vers ACTIF/EN_PAUSE).
  const estAdmin = requete.typeCompte === 'ADMINISTRATEUR';

  if (statutCible === 'SUSPENDU' && !estAdmin) {
    throw new ErreurMetier(
      'Seul un administrateur peut suspendre un établissement',
      403,
      'RESERVE_ADMIN',
    );
  }

  // Récupère l'état actuel. On inclut les SUPPRIME pour permettre la
  // restauration (SUPPRIME → ACTIF dans la fenêtre de 30 jours).
  const etablissement = await prisma.etablissement.findUnique({
    where: { id: idEtablissement },
    select: { id: true, idProprietaire: true, statut: true, dateSuppression: true },
  });
  if (!etablissement) {
    throw new ErreurMetier('Établissement introuvable', 404, 'ETABLISSEMENT_INTROUVABLE');
  }

  // Vérification d'accès : propriétaire OU admin
  if (etablissement.idProprietaire !== idUtilisateur && !estAdmin) {
    throw new ErreurMetier('Accès refusé à cet établissement', 403, 'ACCES_REFUSE');
  }

  // Restauration depuis SUPPRIME : interdite après 30 jours
  if (etablissement.statut === 'SUPPRIME' && statutCible !== 'SUPPRIME') {
    if (etablissement.dateSuppression) {
      const joursDepuisSuppression = (Date.now() - etablissement.dateSuppression.getTime()) / 86400000;
      if (joursDepuisSuppression > 30) {
        throw new ErreurMetier(
          'Délai de récupération de 30 jours dépassé',
          410,
          'RECUPERATION_EXPIREE',
        );
      }
    }
  }

  // Un utilisateur non-admin ne peut pas sortir un établissement de SUSPENDU
  if (etablissement.statut === 'SUSPENDU' && !estAdmin) {
    throw new ErreurMetier(
      'Cet établissement est suspendu. Contacte le support pour le débloquer.',
      403,
      'ETABLISSEMENT_SUSPENDU',
    );
  }

  const statutAvant = etablissement.statut;
  const aJour = await prisma.etablissement.update({
    where: { id: idEtablissement },
    data: {
      statut: statutCible,
      // R80 : marque la date pour le cron de purge à 30 jours
      dateSuppression: statutCible === 'SUPPRIME' ? new Date() : null,
    },
  });

  // Choix de l'action audit selon la transition
  const actionAudit =
    statutCible === 'SUPPRIME'
      ? 'SUPPRESSION_ETABLISSEMENT'
      : statutAvant === 'SUPPRIME'
        ? 'RESTAURATION_ETABLISSEMENT'
        : 'BASCULEMENT_STATUT_ETABLISSEMENT';

  await enregistrerEvenementAudit({
    action: actionAudit,
    idUtilisateur,
    adresseIp: ipDeRequete(requete),
    userAgent: requete.get('user-agent') ?? null,
    donnees: {
      idEtablissement,
      statutAvant,
      statutApres: statutCible,
      motif: motif ?? null,
      parAdmin: estAdmin && etablissement.idProprietaire !== idUtilisateur,
    },
  });

  reponse.status(200).json({ etablissement: aJour });
}
