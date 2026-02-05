# Marvel CRM - Système de Gestion de Production

Système CRM complet pour la gestion de projets de mariage, équipe de production, pointage intelligent et finances.

## 🚀 Fonctionnalités Principales

### 📸 Gestion de Projets
- Création et suivi de projets de mariage
- Workflows personnalisés (Photo, Film, Album, Teaser)
- Gestion des pôles de production (PHOTO, FILM, DVD, COM)
- Suivi des tâches et deadlines

### 👥 Gestion d'Équipe
- Espaces personnalisés par membre
- Pointage intelligent avec vérification biométrique
- Suivi des performances et primes
- Gestion des salaires et avances

### 🔐 Pointage Intelligent
- **Capture de visa** : Photo du visa avec enregistrement en base de données
- **Pointage sécurisé** :
  - Vérification GPS (rayon de 50m autour de Maison Marvelous)
  - Authentification par selfie ou empreinte digitale
  - Vérification des empreintes dans `biometric_credentials`
  - Un seul pointage par jour
  - Statut automatique (PRÉSENT / EN RETARD après 9h00)

### 💰 Gestion Financière
- Suivi des transactions
- Gestion des salaires
- Calcul automatique des primes
- Export et rapports

## 🛠️ Technologies

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Storage)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: Google Gemini (insights)

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
# Créer un fichier .env.local avec :
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key

# Lancer le serveur de développement
npm run dev
```

## 🔧 Configuration

### Supabase

Le projet nécessite les tables suivantes dans Supabase :

- `wedding_projects` - Projets de mariage
- `team_members` - Membres de l'équipe
- `production_tasks` - Tâches de production
- `pointage_entries` - Entrées de pointage
- `biometric_credentials` - Empreintes digitales enregistrées
- `payroll_entries` - Entrées de paie
- `treasury_transactions` - Transactions financières

### Bucket Storage Supabase

- `documents` - Pour les visas et selfies de pointage
- `avatars` - Pour les photos de profil

## 📍 Configuration GPS Pointage

Les coordonnées du studio sont configurées dans `lib/attendanceConfig.ts` :
- **Centre**: Maison Marvelous (4.091933280363106, 9.741281074488526)
- **Rayon**: 50 mètres
- **Retard**: Après 9h00

## 🔒 Sécurité

- Row Level Security (RLS) activé sur Supabase
- Authentification biométrique WebAuthn
- Vérification GPS pour le pointage
- Validation côté serveur des empreintes digitales

## 📝 Structure du Projet

```
├── components/
│   ├── modules/          # Modules fonctionnels (CRM, Devis, etc.)
│   ├── spaces/          # Espaces personnels par membre
│   └── shared/          # Composants partagés
├── lib/
│   ├── supabase.ts      # Client Supabase et services
│   ├── geo.ts           # Calculs GPS (Haversine)
│   └── attendanceConfig.ts  # Configuration pointage
├── services/
│   └── attendanceApi.ts # API client pour le pointage
└── vite.config.ts       # Configuration Vite + middleware API
```

## 🚀 Déploiement

```bash
# Build de production
npm run build

# Preview du build
npm run preview
```

## 📄 Licence

Propriétaire - Maison Marvelous

## 👨‍💻 Auteur

Marvel CRM Team
