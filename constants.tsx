
import { Space, Formula, QuoteExtra } from './types.ts';

export const PIN_LENGTH = 4;

export const ACCESSORIES: QuoteExtra[] = [
  { id: 'ext-1', label: 'Drone 4K', price: 45000, icon: '🚁' },
  { id: 'ext-2', label: 'Diffusion Jour-J', price: 75000, icon: '📺' },
  { id: 'ext-3', label: 'Magazine Box', price: 35000, icon: '📚' },
  { id: 'ext-4', label: 'Photobooth Digital', price: 120000, icon: '📸' },
  { id: 'ext-5', label: 'Phone Box', price: 50000, icon: '📞' },
  { id: 'ext-6', label: 'Save the Date', price: 30000, icon: '💌' },
  { id: 'ext-7', label: 'Backdrop Géant', price: 150000, icon: '🖼️' },
  { id: 'ext-8', label: 'Machine à Bulles', price: 15000, icon: '🫧' },
];

export const FORMULAS: Formula[] = [
  {
    id: 'f-classique',
    name: 'Pack Classique',
    category: 'Mariage',
    status: 'Populaire',
    description: 'La solution équilibrée pour un reportage complet.',
    basePrice: 450000,
    includedAccessoryIds: ['ext-1', 'ext-6'],
    defaultDays: [
      {
        id: 'd1',
        title: 'Mairie & Soirée',
        photographers: 1,
        videographers: 1,
        cameras: 2,
        hasDrone: true,
        hasInterviews: true,
        hasZoom: true,
        hasStabilizer: true,
        photoQuota: '400 photos',
        filmDuration: '1h 30min',
        basePrice: 450000
      }
    ]
  },
  {
    id: 'f-prestige',
    name: 'Pack Prestige',
    category: 'Mariage',
    status: 'Luxe',
    description: 'L\'excellence Marvel pour les mariages d\'exception.',
    basePrice: 850000,
    includedAccessoryIds: ['ext-1', 'ext-2', 'ext-3', 'ext-6'],
    defaultDays: [
      {
        id: 'd1',
        title: 'Dote & Préparatifs',
        photographers: 1,
        videographers: 1,
        cameras: 2,
        hasDrone: false,
        hasInterviews: true,
        hasZoom: true,
        hasStabilizer: true,
        photoQuota: '300 photos',
        filmDuration: '45min',
        basePrice: 250000
      },
      {
        id: 'd2',
        title: 'Cérémonie & Grande Soirée',
        photographers: 2,
        videographers: 2,
        cameras: 4,
        hasDrone: true,
        hasInterviews: true,
        hasZoom: true,
        hasStabilizer: true,
        photoQuota: '800 photos',
        filmDuration: '2h 30min',
        basePrice: 600000
      }
    ]
  },
  {
    id: 'f-studio',
    name: 'Séance Studio Pro',
    category: 'Autre',
    status: 'Essentiel',
    description: 'Séance haut de gamme en environnement contrôlé.',
    basePrice: 75000,
    includedAccessoryIds: [],
    defaultDays: [
      {
        id: 'd1',
        title: 'Session Studio',
        photographers: 1,
        videographers: 0,
        cameras: 1,
        hasDrone: false,
        hasInterviews: false,
        hasZoom: false,
        hasStabilizer: false,
        photoQuota: '25 photos retouchées',
        filmDuration: 'N/A',
        basePrice: 75000
      }
    ]
  }
];

// LISTE DES ESPACES STATIQUES (INFRASTRUCTURE)
// Les espaces employés (Luc, Sacha, etc.) sont maintenant chargés dynamiquement depuis la base de données.
export const SPACES: Space[] = [
  { id: 'nar6', code: '8585', name: 'Narcisse', icon: '💎' },
  { id: 'sandra', code: '1111', name: 'Sandra', icon: '🎨' },
  { id: 'manager', code: '2222', name: 'Manaja', icon: '⚙️' },
  { id: 'salaires', code: '5050', name: 'Salaires', icon: '💰' },
  { id: 'com', code: '8888', name: 'Com & Marketing', icon: '📢' },
  { id: 'cyril', code: '3333', name: 'Cyril', icon: '🔒' },
  { id: 'dvd', code: '9999', name: 'DVD (Admin)', icon: '💿' },
  { id: 'teaser', code: '7777', name: 'Teaser', icon: '🎬' },
];
