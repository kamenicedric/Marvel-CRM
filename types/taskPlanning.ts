
import { WeddingProject, ProductionTask } from '../types';

export interface DetailedTaskTemplate {
  title: string;
  day: number;
  assignedTo: string;
  pole: 'PHOTO' | 'FILM' | 'DVD' | 'COM';
}

// --- BLOCS DE TÂCHES PAR COMPOSANTE ---

const PHOTO_CLASSIC_BASE: DetailedTaskTemplate[] = [
  { title: "Envoi photos brutes pour sélection", day: 10, assignedTo: "damien", pole: "PHOTO" },
  { title: "Vérification envoi photos brutes", day: 15, assignedTo: "marvel", pole: "PHOTO" },
  { title: "Vérification sélection classiques par les mariés", day: 24, assignedTo: "marvel", pole: "PHOTO" },
  { title: "Début retouches photos classiques", day: 25, assignedTo: "retoucheur", pole: "PHOTO" },
  { title: "Livraison photos classiques aux mariés", day: 38, assignedTo: "marvel", pole: "PHOTO" },
];

const ALBUM_EXTRAS: DetailedTaskTemplate[] = [
  { title: "Envoi modèles covers pour album", day: -45, assignedTo: "marvel", pole: "DVD" },
  { title: "Choix modèles covers pour album", day: -30, assignedTo: "marvel", pole: "DVD" },
  { title: "Vérification sélection Album par les mariés", day: 24, assignedTo: "marvel", pole: "DVD" },
  { title: "Conception graphique covers pour album", day: 26, assignedTo: "marvel", pole: "DVD" },
  { title: "Début retouches Album", day: 27, assignedTo: "retoucheur", pole: "DVD" },
  { title: "Fabrication album vistaprint ou ZNO", day: 35, assignedTo: "marvel", pole: "DVD" },
  { title: "Control album en interne", day: 40, assignedTo: "marvel", pole: "DVD" },
  { title: "Envoyer page album aux mariés", day: 42, assignedTo: "marvel", pole: "DVD" },
  { title: "Commande Album sur vistaprint ou ZNO", day: 50, assignedTo: "marvel", pole: "DVD" },
  { title: "Livraison Album aux mariés", day: 70, assignedTo: "marvel", pole: "DVD" },
];

const FILM_LONG_BASE: DetailedTaskTemplate[] = [
  { title: "Demande musiques film long", day: -30, assignedTo: "marvel", pole: "FILM" },
  { title: "Film brute ou résumé audio ?", day: 7, assignedTo: "marvel", pole: "FILM" },
  { title: "Envoi des proxies", day: 10, assignedTo: "narcisse", pole: "FILM" },
  { title: "Pluraleyes + multicam", day: 15, assignedTo: "marvel", pole: "FILM" },
  { title: "Montage film long", day: 24, assignedTo: "bruce", pole: "FILM" },
  { title: "Vérification interne film long", day: 34, assignedTo: "marvel", pole: "FILM" },
  { title: "Envoi film long aux mariés pour validation", day: 38, assignedTo: "marvel", pole: "FILM" },
  { title: "Modifs film long des mariés", day: 43, assignedTo: "marvel", pole: "FILM" },
  { title: "Étalonnage film long", day: 50, assignedTo: "etalonneur", pole: "FILM" },
  { title: "Livraison film long aux mariés", day: 60, assignedTo: "marvel", pole: "FILM" },
];

const TEASER_EXTRAS: DetailedTaskTemplate[] = [
  { title: "Montage teaser vidéo", day: 20, assignedTo: "luc", pole: "FILM" },
  { title: "Vérification interne Teaser", day: 25, assignedTo: "marvel", pole: "FILM" },
  { title: "Envoi teaser aux mariés pour validation", day: 28, assignedTo: "marvel", pole: "FILM" },
  { title: "Modifs teaser des mariés", day: 33, assignedTo: "marvel", pole: "FILM" },
  { title: "Étalonnage Teaser", day: 40, assignedTo: "etalonneur", pole: "FILM" },
  { title: "Livraison Teaser aux mariés", day: 45, assignedTo: "marvel", pole: "FILM" },
];

const COM_POLE_TASKS: DetailedTaskTemplate[] = [
  { title: "J-15: Appel de calage final", day: -15, assignedTo: "tech", pole: "COM" },
  { title: "J+0: Stories Backstage", day: 0, assignedTo: "cm", pole: "COM" },
  { title: "J+1: SMS remerciement", day: 1, assignedTo: "marvel", pole: "COM" },
  { title: "J+2: POST INSTAGRAM (Photo Hero)", day: 2, assignedTo: "cm", pole: "COM" },
  { title: "J+7: Envoi 3 photos coup de cœur WhatsApp", day: 7, assignedTo: "marvel", pole: "COM" },
  { title: "J+45: PUBLICATION REEL (Teaser)", day: 45, assignedTo: "cm", pole: "COM" },
  { title: "J+90: Demande AVIS témoignage", day: 90, assignedTo: "marvel", pole: "COM" },
];

// --- MAPPING DES WORKFLOWS (FORMAT EXACT DEMANDÉ) ---

export const FORMULA_WORKFLOWS: Record<string, DetailedTaskTemplate[]> = {
  "📦 workflow : Photo + Film long + Album + Teaser": [...PHOTO_CLASSIC_BASE, ...ALBUM_EXTRAS, ...FILM_LONG_BASE, ...TEASER_EXTRAS, ...COM_POLE_TASKS],
  "📦 workflow : Photo + Film long + Album": [...PHOTO_CLASSIC_BASE, ...ALBUM_EXTRAS, ...FILM_LONG_BASE, ...COM_POLE_TASKS],
  "📦 workflow : Photo + Film long + Teaser": [...PHOTO_CLASSIC_BASE, ...FILM_LONG_BASE, ...TEASER_EXTRAS, ...COM_POLE_TASKS],
  "📦 workflow : Photo + Film long": [...PHOTO_CLASSIC_BASE, ...FILM_LONG_BASE, ...COM_POLE_TASKS],
  "📦 workflow : Film long + Teaser": [...FILM_LONG_BASE, ...TEASER_EXTRAS, ...COM_POLE_TASKS],
  "📦 workflow : Photo + Album": [...PHOTO_CLASSIC_BASE, ...ALBUM_EXTRAS, ...COM_POLE_TASKS],
  "📦 workflow : Photo classiques uniquement": [...PHOTO_CLASSIC_BASE, ...COM_POLE_TASKS],
  "📦 workflow : Film long uniquement": [...FILM_LONG_BASE, ...COM_POLE_TASKS],

  // Rétrocompatibilité (pour que les dossiers sans le pack de départ fonctionnent)
  "Photo + Film long + Album + Teaser": [...PHOTO_CLASSIC_BASE, ...ALBUM_EXTRAS, ...FILM_LONG_BASE, ...TEASER_EXTRAS, ...COM_POLE_TASKS],
  "Photo + Film long + Album": [...PHOTO_CLASSIC_BASE, ...ALBUM_EXTRAS, ...FILM_LONG_BASE, ...COM_POLE_TASKS],
  "Photo + Film long + Teaser": [...PHOTO_CLASSIC_BASE, ...FILM_LONG_BASE, ...TEASER_EXTRAS, ...COM_POLE_TASKS],
  "Photo + Film long": [...PHOTO_CLASSIC_BASE, ...FILM_LONG_BASE, ...COM_POLE_TASKS],
  "Film long + Teaser": [...FILM_LONG_BASE, ...TEASER_EXTRAS, ...COM_POLE_TASKS],
  "Photo + Album": [...PHOTO_CLASSIC_BASE, ...ALBUM_EXTRAS, ...COM_POLE_TASKS],
  "Photo classiques uniquement": [...PHOTO_CLASSIC_BASE, ...COM_POLE_TASKS],
  "Film long uniquement": [...FILM_LONG_BASE, ...COM_POLE_TASKS],
};

export const generateTasksForProject = (project: WeddingProject): Partial<ProductionTask>[] => {
  const weddingDate = new Date(project.weddingDate);
  const formula = project.formula || "📦 workflow : Photo + Film long";
  
  const workflow = FORMULA_WORKFLOWS[formula] || FORMULA_WORKFLOWS["📦 workflow : Photo + Film long"];
  
  return workflow.map(template => {
    const dueDate = new Date(weddingDate);
    dueDate.setDate(weddingDate.getDate() + template.day);

    return {
      title: template.title,
      pole: template.pole,
      phase: template.day < 0 ? 'pre_prod' : (template.day > 60 ? 'delivery' : 'post_prod'),
      deadline: dueDate.toISOString().split('T')[0],
      status: 'A faire',
      priority: (template.day >= 0 && template.day <= 15) ? 'High' : (template.day < 0 ? 'Medium' : 'Low'),
      project_id: project.id,
      assigned_to: template.assignedTo,
      archived: false
    };
  });
};
