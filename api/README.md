# API Pointage (Vercel Serverless)

Ces routes sont utilisées **en production sur Vercel**. En développement local, le middleware dans `vite.config.ts` gère les mêmes endpoints.

## Routes

- **GET** `/api/attendance/me?employeeId=xxx` — Liste des pointages du jour pour un employé
- **POST** `/api/attendance/check-in` — Enregistrer un pointage (body: `employeeId`, `lat`, `lng`, `mode`, `selfieDataUrl` si mode SELFIE)

## Variables d'environnement (Vercel)

Dans **Settings → Environment Variables** de votre projet Vercel, assurez-vous d’avoir :

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase (déjà utilisée par le front) |
| `VITE_SUPABASE_ANON_KEY` | Clé anon (suffit pour lecture/écriture si RLS le permet) |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Recommandé)* Clé service_role pour bypass RLS côté API (ne pas exposer au client) |

Si `SUPABASE_SERVICE_ROLE_KEY` est définie, elle sera utilisée en priorité pour les appels API (insert pointage, storage).
