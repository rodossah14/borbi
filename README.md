# Bor-Bi Tech

Place de marché panafricaine universelle — 25 pays d'Afrique de l'Ouest et Centrale.
Fait par des Africains, pour des Africains.

## Architecture monorepo

```
shared/    types et constantes partagés (TypeScript)
backend/   API Express + Prisma + PostgreSQL
frontend/  React + Vite + Tailwind (PWA)
```

## Pré-requis

- Node.js 20+ (`nvm use`)
- PostgreSQL (NeonDB en prod)
- Redis (Upstash en prod — optionnel en dev)

## Démarrage rapide

```bash
# 1. Installer toutes les dépendances
npm install

# 2. Copier les fichiers d'environnement
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Préparer la base de données
npm run prisma:generate
npm run prisma:migrate

# 4. Lancer le backend
npm run dev:back

# 5. Dans un autre terminal, lancer le frontend
npm run dev:front
```

## Commandes utiles

| Commande | Action |
|---|---|
| `npm run typecheck` | Vérifie les types sur les trois workspaces |
| `npm run build` | Build production (shared puis backend puis frontend) |
| `npm run lint` | Lint backend + frontend |
| `npm run prisma:migrate` | Applique les migrations Prisma |

## Déploiement

- **Frontend** : Vercel — `bor-bi-tech.vercel.app`
- **Backend** : Render — `borbi-backend-v2.onrender.com`
  - Build : `cd backend && npm install && npm run build`
  - Start : `cd backend && npm run start`

## Documentation interne

Voir le brief produit complet (règles R1–R135, modèle économique, design system)
dans le canal interne de l'équipe.

## Conformité

- OHADA : signature SHA-256 sur chaque transaction, journal d'audit append-only 5 ans
- RGPD/loi sénégalaise : documents d'identité chiffrés AES-256 avant stockage
