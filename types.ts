
export interface QuoteDay {
  id: string;
  title: string;
  photographers: number;
  videographers: number;
  cameras: number;
  hasDrone: boolean;
  hasInterviews: boolean;
  hasZoom: boolean;
  hasStabilizer: boolean;
  photoQuota: string;
  filmDuration: string;
  basePrice: number;
}

export interface QuoteTransport {
  segments: {
    maisonAgence: number;
    agenceVilleClient: number;
    villeLieux: number;
    lieuxVille: number;
    villeAgence: number;
    agenceMaison: number;
  };
  baggageAller: number;
  baggageRetour: number;
}

export interface QuoteLogistics {
  isOffsite: boolean;
  transport: QuoteTransport;
  accommodation: {
    pricePerNight: number;
    nightsCount: number;
  };
}

export interface QuoteExtra {
  id: string;
  label: string;
  price: number;
  icon: string;
}

export interface Formula {
  id: string;
  name: string;
  category: 'Mariage' | 'Autre';
  status: 'Essentiel' | 'Populaire' | 'Luxe';
  description: string;
  basePrice: number;
  includedAccessoryIds: string[];
  defaultDays: QuoteDay[];
}

export interface QuoteState {
  clientName: string;
  city: string;
  currentFormulaId: string | null;
  days: QuoteDay[];
  logistics: QuoteLogistics;
  selectedExtraIds: string[];
  includedExtraIds: string[];
  discount: number;
}

export interface Space {
  id: string;
  name: string;
  icon: string;
  code: string;
  description?: string;
  color?: string;
}

export interface SpaceInsight {
  title: string;
  content: string;
  category: string;
}

export interface PoleStatus {
  currentStep: number;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  planned_date?: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  specialty?: string;
  skills?: string;
  pole: 'PHOTO' | 'FILM' | 'DVD' | 'COM' | 'ADMIN';
  email: string;
  phone: string;
  pin: string;
  photo_url?: string; // URL de la photo pour reconnaissance faciale
  status: 'Actif' | 'Indisponible' | 'Externe';
  created_at?: string;
}

export interface WeddingProject {
  id: string;
  couple: string;
  weddingDate: string;
  country: string;
  amount: number;
  status: string;
  progress: number;
  delayDays: number;
  isLegacy: boolean;
  requiresSync: boolean;
  poleDVD: PoleStatus;
  poleFilm: PoleStatus;
  polePhoto: PoleStatus;
  poleCom: PoleStatus;
  clientFeedbacks: string[];
  formula?: string;
  packageType?: string;
  packageDetail?: string;
  clientNotes?: string;
  options?: string[];
  albumTeaser?: string;
  createdAt: string;
  updatedAt: string;
  deliveryTime?: number;
  teaser_data?: any;
  hasDowry?: boolean;
  dowryDate?: string;
  brideOrigin?: string;
  groomOrigin?: string;
  sameDay?: boolean;
  cityHallDate?: string;
  guestCount?: number;
  priority?: 'low' | 'medium' | 'high';
  visaPhotoUrl?: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  wedding_date: string;
  budget: number;
  source: string;
  status: string;
  notes: string[];
  country: string;
  city: string;
  created_at: string;
}

export interface ProductionTask {
  id: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'A faire' | 'En cours' | 'Terminé';
  pole: 'PHOTO' | 'FILM' | 'DVD' | 'COM';
  createdAt: string;
  deadline?: string;
  archived: boolean;
  project_id?: string;
  assigned_to?: string;
  evaluation?: number;
  phase?: 'pre_prod' | 'post_prod' | 'delivery';
  evaluation_comment?: string;
}

export type ApprovalStage = 'pending' | 'hr_review' | 'director_review' | 'completed';

export interface ApprovalInfo {
  currentStage: ApprovalStage;
}

export interface SalaryEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  salaryMonth: string;
  salaryYear: number;
  baseSalary: number;
  bonus: number;
  absenceDays: number;
  salaryAdvance: number;
  monthlyPayment: number;
  netSalary: number;
  remainingDebt: number;
  approvalInfo: ApprovalInfo;
  updatedAt: string;
}

export type BonusType = 'Performance' | 'Exceptionnel' | 'Ancienneté';
export type DebtType = 'Avance' | 'Prêt Equipment' | 'Prêt Personnel';

export interface Bonus {
  id: string;
  type: BonusType;
  amount: number;
  date: string;
}

export interface Debt {
  id: string;
  type: DebtType;
  amount: number;
  date: string;
}
