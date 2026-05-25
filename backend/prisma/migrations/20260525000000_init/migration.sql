-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('CLIENT', 'COMMERCANT', 'LIVREUR', 'ADMINISTRATEUR');

-- CreateEnum
CREATE TYPE "TypeEtablissement" AS ENUM ('BOUTIQUE', 'RESTAURANT', 'HOTEL', 'ENTREPOT', 'KIOSQUE', 'SHOWROOM', 'PRESTATAIRE', 'PHARMACIE', 'ARTISAN');

-- CreateEnum
CREATE TYPE "StatutEtablissement" AS ENUM ('ACTIF', 'EN_PAUSE', 'SUSPENDU', 'SUPPRIME');

-- CreateEnum
CREATE TYPE "NiveauFidelite" AS ENUM ('BRONZE', 'ARGENT', 'OR', 'PLATINE');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('PANIER', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE', 'LITIGE');

-- CreateEnum
CREATE TYPE "TypeTransaction" AS ENUM ('VENTE', 'LIVRAISON', 'TRANSFERT_NATIONAL', 'TRANSFERT_INTERNATIONAL', 'REMBOURSEMENT', 'ABONNEMENT_MENSUEL');

-- CreateEnum
CREATE TYPE "StatutTransaction" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'ECHOUEE', 'REMBOURSEE', 'LITIGE');

-- CreateEnum
CREATE TYPE "ActionAudit" AS ENUM ('CONNEXION', 'DECONNEXION', 'CREATION_COMPTE', 'TENTATIVE_INSCRIPTION', 'INSCRIPTION_VALIDEE', 'CHANGEMENT_MOT_DE_PASSE', 'CHANGEMENT_EMAIL', 'CREATION_ETABLISSEMENT', 'MODIFICATION_ETABLISSEMENT', 'BASCULEMENT_STATUT_ETABLISSEMENT', 'SUPPRESSION_ETABLISSEMENT', 'RESTAURATION_ETABLISSEMENT', 'AJOUT_PRODUIT', 'MODIFICATION_PRODUIT', 'MISE_A_JOUR_STOCK', 'ALERTE_STOCK', 'CREATION_TRANSACTION', 'VALIDATION_TRANSACTION', 'ECHEC_OTP', 'ACCES_GOD_MODE', 'DECLENCHEMENT_SOS');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "codePays" TEXT NOT NULL,
    "languePreferee" TEXT NOT NULL DEFAULT 'fr',
    "roles" "RoleUtilisateur"[],
    "niveauFidelite" "NiveauFidelite" NOT NULL DEFAULT 'BRONZE',
    "pointsFidelite" INTEGER NOT NULL DEFAULT 0,
    "estVerifie" BOOLEAN NOT NULL DEFAULT false,
    "estSuspendu" BOOLEAN NOT NULL DEFAULT false,
    "scoreConfiance" INTEGER NOT NULL DEFAULT 100,
    "codeParrainage" TEXT NOT NULL,
    "idParrain" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL,
    "idProprietaire" TEXT NOT NULL,
    "type" "TypeEtablissement" NOT NULL,
    "statut" "StatutEtablissement" NOT NULL DEFAULT 'ACTIF',
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "codePays" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "horaires" JSONB,
    "logoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "numeroNinea" TEXT,
    "dateSuppression" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" TEXT NOT NULL,
    "idEtablissement" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "prixUnitaireFcfa" INTEGER NOT NULL,
    "stockDisponible" INTEGER NOT NULL DEFAULT 0,
    "seuilAlerteStock" INTEGER NOT NULL DEFAULT 5,
    "estDisponible" BOOLEAN NOT NULL DEFAULT true,
    "urlsPhotos" TEXT[],
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commande" (
    "id" TEXT NOT NULL,
    "numeroCommande" TEXT NOT NULL,
    "idClient" TEXT NOT NULL,
    "idEtablissement" TEXT NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'PANIER',
    "montantTotalFcfa" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCommande" (
    "id" TEXT NOT NULL,
    "idCommande" TEXT NOT NULL,
    "idProduit" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaireFcfa" INTEGER NOT NULL,

    CONSTRAINT "LigneCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TypeTransaction" NOT NULL,
    "statut" "StatutTransaction" NOT NULL DEFAULT 'EN_ATTENTE',
    "montantBrutXof" INTEGER NOT NULL,
    "montantBrutLocal" INTEGER NOT NULL,
    "codeDeviseLocal" TEXT NOT NULL DEFAULT 'XOF',
    "commissionXof" INTEGER NOT NULL,
    "montantNetXof" INTEGER NOT NULL,
    "empreinteSha256" TEXT NOT NULL,
    "idEmetteur" TEXT NOT NULL,
    "idDestinataire" TEXT,
    "idCommande" TEXT,
    "donneesFournisseur" JSONB,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementAudit" (
    "id" TEXT NOT NULL,
    "action" "ActionAudit" NOT NULL,
    "idUtilisateur" TEXT,
    "adresseIp" TEXT,
    "userAgent" TEXT,
    "donnees" JSONB NOT NULL,
    "empreinteSha256" TEXT NOT NULL,
    "horodatage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_telephone_key" ON "Utilisateur"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_codeParrainage_key" ON "Utilisateur"("codeParrainage");

-- CreateIndex
CREATE INDEX "Utilisateur_codePays_idx" ON "Utilisateur"("codePays");

-- CreateIndex
CREATE INDEX "Utilisateur_niveauFidelite_idx" ON "Utilisateur"("niveauFidelite");

-- CreateIndex
CREATE INDEX "Etablissement_idProprietaire_idx" ON "Etablissement"("idProprietaire");

-- CreateIndex
CREATE INDEX "Etablissement_codePays_ville_idx" ON "Etablissement"("codePays", "ville");

-- CreateIndex
CREATE INDEX "Etablissement_type_idx" ON "Etablissement"("type");

-- CreateIndex
CREATE INDEX "Etablissement_statut_idx" ON "Etablissement"("statut");

-- CreateIndex
CREATE INDEX "Produit_idEtablissement_idx" ON "Produit"("idEtablissement");

-- CreateIndex
CREATE UNIQUE INDEX "Commande_numeroCommande_key" ON "Commande"("numeroCommande");

-- CreateIndex
CREATE INDEX "Commande_idClient_idx" ON "Commande"("idClient");

-- CreateIndex
CREATE INDEX "Commande_idEtablissement_idx" ON "Commande"("idEtablissement");

-- CreateIndex
CREATE INDEX "Commande_statut_idx" ON "Commande"("statut");

-- CreateIndex
CREATE INDEX "Transaction_idEmetteur_idx" ON "Transaction"("idEmetteur");

-- CreateIndex
CREATE INDEX "Transaction_idDestinataire_idx" ON "Transaction"("idDestinataire");

-- CreateIndex
CREATE INDEX "Transaction_statut_idx" ON "Transaction"("statut");

-- CreateIndex
CREATE INDEX "Transaction_dateCreation_idx" ON "Transaction"("dateCreation");

-- CreateIndex
CREATE INDEX "EvenementAudit_action_idx" ON "EvenementAudit"("action");

-- CreateIndex
CREATE INDEX "EvenementAudit_idUtilisateur_idx" ON "EvenementAudit"("idUtilisateur");

-- CreateIndex
CREATE INDEX "EvenementAudit_horodatage_idx" ON "EvenementAudit"("horodatage");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_idParrain_fkey" FOREIGN KEY ("idParrain") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etablissement" ADD CONSTRAINT "Etablissement_idProprietaire_fkey" FOREIGN KEY ("idProprietaire") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_idEtablissement_fkey" FOREIGN KEY ("idEtablissement") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_idClient_fkey" FOREIGN KEY ("idClient") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_idEtablissement_fkey" FOREIGN KEY ("idEtablissement") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommande" ADD CONSTRAINT "LigneCommande_idCommande_fkey" FOREIGN KEY ("idCommande") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommande" ADD CONSTRAINT "LigneCommande_idProduit_fkey" FOREIGN KEY ("idProduit") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_idEmetteur_fkey" FOREIGN KEY ("idEmetteur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_idDestinataire_fkey" FOREIGN KEY ("idDestinataire") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_idCommande_fkey" FOREIGN KEY ("idCommande") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvenementAudit" ADD CONSTRAINT "EvenementAudit_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

