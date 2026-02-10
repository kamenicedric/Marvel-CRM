import React, { useState, useMemo, useEffect, useRef } from 'react';
import { tasksService, projectsService, biometricService, pointageService, payrollService, supabase } from '../../lib/supabase.ts';
import { ProductionTask, TeamMember, WeddingProject } from '../../types.ts';
import ProjectQuickView from '../shared/ProjectQuickView.tsx';
import { attendanceCheckIn, attendanceCheckOut, attendanceMe, attendanceHistory, AttendanceEntry } from '../../services/attendanceApi';
import {
  ATTENDANCE_ZONE_RADIUS_METERS,
} from '../../lib/attendanceConfig';
import {
  Zap, Trophy, Wallet, AlertTriangle, Play, Pause,
  CheckCircle2, ListTodo, LayoutGrid,
  CalendarDays, Clock, MessageSquare,
  Flame, BadgeCheck, ChevronRight, ArrowRight,
  Video, PlayCircle, Heart, Check, Loader2,
  CalendarRange, Quote, BarChart3, Save, Plus, Trash2,
  Square, CheckSquare, Coins, Medal, Target, Info,
  Sparkles, Timer, PlayCircle as StartIcon,
  BookCheck, Maximize2, Minimize2, RotateCcw, Eye,
  History, TrendingUp, DollarSign, ShieldCheck, Star,
  TrendingUp as GrowthIcon, ArrowUpCircle, TrendingDown,
  AlertCircle, PartyPopper, CloudUpload, Wrench,
  HandCoins, Banknote, Receipt, ArrowDownCircle,
  Landmark, Calendar as CalendarIcon, ChevronLeft,
  Scissors, Film, Mic2, AlertOctagon, Send, ChevronRight as ChevronRightIcon,
  SearchCheck, Briefcase, ArrowUpRight, Award,
  Image as ImageIcon, Fingerprint, ScanFace, Lock, Camera,
  Bell, LogOut
} from 'lucide-react';

interface EmployeeSpaceProps {
  member: TeamMember | null;
  onLogout?: () => void;
  onNotificationTrigger?: number;
  onNotificationSummaryChange?: (summary: { unreadCount: number }) => void;
}

interface TeaserReport {
  id: string;
  category: 'Cadrage' | 'Montage' | 'Rush' | 'Son';
  message: string;
  date: string;
  status: 'Open' | 'Resolved';
}

interface UnifiedMission {
  id: string;
  type: 'task' | 'module';
  title: string;
  couple: string;
  projectId: string;
  status: string;
  priority: string;
  deadline: string;
  moduleId?: 'intro' | 'pose' | 'soiree';
  time_spent?: number; // en secondes
  evaluation_comment?: string;
  reports?: TeaserReport[];
}

interface AppNotification {
  id: string;
  type: 'new_mission' | 'overdue' | 'validation' | 'comment' | 'reminder';
  title: string;
  message: string;
  date: Date;
  read: boolean;
  missionId?: string;
  projectId?: string;
}

const industrialDays = (sec: number) => (sec / (9 * 3600)).toFixed(1);
const isOverTime = (sec: number) => sec > (27 * 3600);

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const EmployeeSpace: React.FC<EmployeeSpaceProps> = ({
  member,
  onLogout,
  onNotificationTrigger,
  onNotificationSummaryChange
}) => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'historique' | 'finance' | 'bonus' | 'pointage'>('cockpit');
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProject, setQuickViewProject] = useState<WeddingProject | null>(null);
  const [payrollEntries, setPayrollEntries] = useState<any[]>([]);

  // États Finance
  const currentRealMonth = new Date().getMonth();
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState(currentRealMonth);

  // États Cockpit & Chrono Missions
  const [isWorking, setIsWorking] = useState(false);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- ÉTATS POUR LE POINTAGE ---
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showVisaCamera, setShowVisaCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploadingVisa, setIsUploadingVisa] = useState(false);
  const [clockHistory, setClockHistory] = useState<{ time: string, img: string, type: 'IN' | 'OUT', method: 'FACE' | 'BIO' | 'VISA' }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedPointageSeconds, setElapsedPointageSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visaVideoRef = useRef<HTMLVideoElement>(null);
  const visaCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // --- POINTAGE INTELLIGENT (UX + règles) ---
  const [geoStatus, setGeoStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [bioStatus, setBioStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToZoneMeters, setDistanceToZoneMeters] = useState<number | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceEntry, setAttendanceEntry] = useState<any | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceEntry[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState<'SELFIE' | 'BIO'>('SELFIE');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [hasBiometricCredential, setHasBiometricCredential] = useState<boolean | null>(null);
  const [isBiometricActive, setIsBiometricActive] = useState(false);
  const [isWaitingFingerprint, setIsWaitingFingerprint] = useState(false);
  const [biometricTimeoutReached, setBiometricTimeoutReached] = useState(false);
  const biometricTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);
  const selfieCanvasRef = useRef<HTMLCanvasElement>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);

  // Détection entrée/sortie du jour pour adapter le bouton (entrée d'abord, puis sortie)
  const todayKey = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const { hasTodayIn, hasTodayOut } = useMemo(() => {
    const todayEntries = monthlyAttendance.filter(e => e.timestamp.slice(0, 10) === todayKey);
    return {
      hasTodayIn: todayEntries.some(e => e.type === 'IN'),
      hasTodayOut: todayEntries.some(e => e.type === 'OUT'),
    };
  }, [monthlyAttendance, todayKey]);

  // États Signalement
  const [reportCategory, setReportCategory] = useState<TeaserReport['category']>('Montage');
  const [reportText, setReportText] = useState('');
  const [teaserReports, setTeaserReports] = useState<TeaserReport[]>([]);

  // États Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [previousMissionsCount, setPreviousMissionsCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Synchroniser le panneau de notifications avec la cloche globale du header
  // On ne doit JAMAIS ouvrir automatiquement à l'entrée dans l'espace,
  // donc on compare avec la valeur précédente.
  const notifTriggerRef = useRef(onNotificationTrigger ?? 0);
  useEffect(() => {
    if (typeof onNotificationTrigger !== 'number') return;
    if (onNotificationTrigger > notifTriggerRef.current) {
      setShowNotifications(prev => !prev);
    }
    notifTriggerRef.current = onNotificationTrigger;
  }, [onNotificationTrigger]);

  // Détection mobile (pour le bouton de déconnexion et l'UX)
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculer les compteurs et rapports filtrés
  const reportCounts = useMemo(() => {
    const counts: Record<string, number> = { Cadrage: 0, Montage: 0, Rush: 0, Son: 0 };
    teaserReports.forEach(r => {
      if (r.status === 'Open') counts[r.category]++;
    });
    return counts;
  }, [teaserReports]);

  const filteredReports = useMemo(() => {
    return teaserReports.filter(r => r.category === reportCategory).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [teaserReports, reportCategory]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nom de l'employé pour le filtrage (prend le premier mot du nom complet ou "Employé" par défaut)
  const employeeName = useMemo(() => {
    if (!member?.full_name) return "Daniel"; // Fallback pour dev
    return member.full_name.split(' ')[0];
  }, [member]);

  // Timer pour l'heure réelle et le pointage
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
      if (isClockedIn) {
        setElapsedPointageSeconds(prev => prev + 1);
      }
    }, 1000);

    // Vérification disponibilité biométrie
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsBiometricAvailable(available))
        .catch(() => setIsBiometricAvailable(false));
    }

    return () => clearInterval(clockTimer);
  }, [isClockedIn]);

  // Timer pour le chrono du cockpit (mission active)
  useEffect(() => {
    if (!isWorking || !activeMissionId) return;

    const missionTimer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(missionTimer);
  }, [isWorking, activeMissionId]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allTasks, allProjects, allPayroll] = await Promise.all([
        tasksService.getAll(),
        projectsService.getAll(),
        payrollService.getAll()
      ]);
      setTasks(allTasks);
      setProjects(allProjects as any);
      setPayrollEntries(allPayroll || []);
    } catch (err: any) {
      // Ignorer les erreurs AbortError (requêtes annulées)
      if (err?.name !== 'AbortError' && !err?.message?.includes('aborted') && !err?.message?.includes('signal is aborted')) {
        console.error("Erreur synchro EmployeeSpace:", err);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [member]);

  const combinedMissions = useMemo(() => {
    // ... (Logique inchangée)
    const missions: UnifiedMission[] = [];
    const searchName = employeeName;

    projects.forEach(p => {
      const teaserData = p.teaser_data as any;
      ['intro', 'pose', 'soiree'].forEach(mod => {
        if (teaserData?.modules?.[mod]?.toLowerCase().includes(searchName.toLowerCase())) {
          missions.push({
            id: `mod-${mod}-${p.id}`,
            type: 'module',
            moduleId: mod as any,
            title: mod === 'intro' ? 'MONTAGE INTRO / PUB' : mod === 'pose' ? 'MONTAGE PARTIE POSÉE' : 'MONTAGE PARTIE SOIRÉE',
            couple: p.couple,
            projectId: p.id,
            status: teaserData.module_status?.[mod] || 'A faire',
            priority: 'High',
            deadline: teaserData.planned_date || p.weddingDate,
            time_spent: teaserData.time_spent?.[mod] || 0,
            evaluation_comment: teaserData.evaluation_comment || "",
            reports: teaserData.reports?.[mod] || []
          });
        }
      });
    });

    tasks.filter(t => t.assigned_to?.toLowerCase().includes(searchName.toLowerCase())).forEach(t => {
      const p = projects.find(proj => proj.id === t.project_id);
      missions.push({
        id: t.id,
        type: 'task',
        title: t.title,
        couple: p?.couple || 'Tâche Interne',
        projectId: t.project_id || '',
        status: t.status,
        priority: t.priority,
        deadline: t.deadline || '',
        time_spent: (t as any).time_spent || 0,
        evaluation_comment: t.evaluation_comment,
        reports: (t as any).reports || []
      });
    });

    return missions.sort((a, b) => {
      if (a.status === 'En cours') return -1;
      if (a.status === 'Attente Validation') return 1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks, projects, employeeName]);

  const activeMission = useMemo(() => combinedMissions.find(m => m.id === activeMissionId), [combinedMissions, activeMissionId]);

  // Charger le temps investi quand une mission est sélectionnée
  useEffect(() => {
    if (activeMission) {
      const timeSpent = activeMission.time_spent || 0;
      setElapsedSeconds(timeSpent);
    } else {
      setElapsedSeconds(0);
    }
  }, [activeMission]);

  // Système de notifications
  useEffect(() => {
    const newNotifications: AppNotification[] = [];
    const now = new Date();

    // Détecter nouvelles missions
    const currentMissionsCount = combinedMissions.filter(m =>
      m.status !== 'Terminé' && m.status !== 'Livré S++' && m.status !== 'LIVRÉ S++'
    ).length;

    if (previousMissionsCount > 0 && currentMissionsCount > previousMissionsCount) {
      const newMissions = combinedMissions.filter(m =>
        m.status !== 'Terminé' && m.status !== 'Livré S++' && m.status !== 'LIVRÉ S++'
      ).slice(previousMissionsCount);

      newMissions.forEach(mission => {
        newNotifications.push({
          id: `new-${mission.id}-${Date.now()}`,
          type: 'new_mission',
          title: 'Nouvelle mission assignée',
          message: `${mission.couple} - ${mission.title}`,
          date: now,
          read: false,
          missionId: mission.id,
          projectId: mission.projectId
        });
      });
    }
    setPreviousMissionsCount(currentMissionsCount);

    // Détecter missions en retard
    combinedMissions.forEach(mission => {
      if (mission.status !== 'Terminé' && mission.status !== 'Livré S++' && mission.deadline) {
        const deadline = new Date(mission.deadline);
        if (deadline < now && mission.status !== 'Attente Validation') {
          newNotifications.push({
            id: `overdue-${mission.id}-${Date.now()}`,
            type: 'overdue',
            title: 'Mission en retard',
            message: `${mission.couple} - ${mission.title} (DLC: ${deadline.toLocaleDateString('fr-FR')})`,
            date: now,
            read: false,
            missionId: mission.id,
            projectId: mission.projectId
          });
        }
      }
    });

    // Détecter missions en attente de validation (retour de Narcisse)
    combinedMissions.forEach(mission => {
      if (mission.status === 'Attente Validation') {
        newNotifications.push({
          id: `validation-${mission.id}-${Date.now()}`,
          type: 'validation',
          title: 'Mission en validation',
          message: `${mission.couple} - ${mission.title} est en cours de validation par Narcisse`,
          date: now,
          read: false,
          missionId: mission.id,
          projectId: mission.projectId
        });
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => {
        // Éviter les doublons
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        return [...uniqueNew, ...prev].slice(0, 50); // Limiter à 50 notifications
      });
    }
  }, [combinedMissions, previousMissionsCount]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Remonter le résumé des notifications au parent (MasterDashboard)
  useEffect(() => {
    if (onNotificationSummaryChange) {
      onNotificationSummaryChange({ unreadCount });
    }
  }, [unreadCount, onNotificationSummaryChange]);

  const handleNotificationClick = (notification: AppNotification) => {
    // Marquer comme lu
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );

    // Si c'est une mission, la sélectionner
    if (notification.missionId) {
      setActiveMissionId(notification.missionId);
      setActiveTab('cockpit');
    }

    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // IMPORTANT UX: le panneau de notifications ne doit JAMAIS s'ouvrir automatiquement.
  // Ouverture/fermeture uniquement via clic utilisateur sur la cloche dans l'UI.

  // ... (Calculs statsBonus et financeData inchangés) ...
  const statsBonus = useMemo(() => {
    const finishedCount = combinedMissions.filter(m => m.status === 'Terminé').length;
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const idealProgress = (currentDay / daysInMonth) * 8;

    let displayPrime = 10000;
    let message = "Mola, tes 10.000 F sont là. Garde-les jalousement !";
    let status: 'safe' | 'warning' | 'danger' = 'safe';

    if (finishedCount < 8) {
      if (finishedCount < idealProgress) {
        const gap = idealProgress - finishedCount;
        const penalty = (gap / 8) * 10000;
        displayPrime = Math.max(0, Math.round(10000 - penalty));
        if (displayPrime < 5000) { message = "Père, l'argent là s'envole ! Fini vite tes travaux !"; status = 'danger'; }
        else { message = "Attention mola, la prime veut paniquer... Valide tes parties !"; status = 'warning'; }
      } else {
        message = "Tu gères le ndjem mola ! On ne blague pas avec le montage S++ !";
        status = 'safe';
      }
    } else {
      displayPrime = 10000 + ((finishedCount - 8) * 5000);
      message = "C'est la magie ? Tu as déjà bouffé les 8 ! Le ndjem est sucré !";
      status = 'safe';
    }

    return { count: finishedCount, prime: displayPrime, message, status, idealProgress };
  }, [combinedMissions]);

  const financeData = useMemo(() => {
    // 1. Trouver la fiche de paie du mois sélectionné pour l'utilisateur connecté
    const currentPayroll = payrollEntries.find(p =>
      p.employee_id === member?.id &&
      p.month === MONTHS[selectedFinanceMonth] &&
      p.year === new Date().getFullYear() // Suppose année courante pour l'instant
    );

    // 2. Si fiche trouvée, utiliser ses données. Sinon par défaut / vide.
    const baseSalary = currentPayroll ? currentPayroll.base_salary : 110000;
    const advances = currentPayroll ? (currentPayroll.advances || 0) : 0;
    const deductions = currentPayroll ? (currentPayroll.deductions || 0) : 0;

    // 3. Reconstruire les opérations pour l'affichage (Simulation basée sur le total)
    const allOperations = [];
    if (advances > 0) {
      allOperations.push({ id: 'adv-1', type: 'Avance', reason: 'Avance sur Salaire', amount: advances, date: currentPayroll?.created_at || new Date().toISOString(), month: selectedFinanceMonth });
    }
    if (deductions > 0) {
      allOperations.push({ id: 'ded-1', type: 'Dette', reason: 'Remboursement Dette', amount: deductions, date: currentPayroll?.created_at || new Date().toISOString(), month: selectedFinanceMonth });
    }

    const totalAdvances = advances + deductions;

    // 4. Calcul du Net à Payer : Base + Prime (Live) - Avances/Dettes
    // NOTE : On utilise 'statsBonus.prime' (calculé en live) pour la prime, et non celle figée en base, pour garder la gamification.
    const activePrime = selectedFinanceMonth === currentRealMonth ? statsBonus.prime : (currentPayroll?.bonus || 0);

    const netToPay = (baseSalary + activePrime) - totalAdvances;

    return { baseSalary, monthOps: allOperations, totalAdvances, netToPay, activePrime, isCurrentMonth: selectedFinanceMonth === currentRealMonth };
  }, [statsBonus.prime, selectedFinanceMonth, currentRealMonth, payrollEntries, member]);

  // --- LOGIQUE POINTAGE AMÉLIORÉE ---

  const startCameraPointage = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 640 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError("Accès caméra requis.");
    }
  };

  const stopSelfieStream = () => {
    if (selfieStreamRef.current) {
      selfieStreamRef.current.getTracks().forEach(t => t.stop());
      selfieStreamRef.current = null;
    }
    if (selfieVideoRef.current) selfieVideoRef.current.srcObject = null;
  };

  const requestGeolocation = async () => {
    setAttendanceError(null);

    // Browsers natively block Geolocation on insecure origins (HTTP) except localhost.
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation non supportée'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setGpsCoords({ lat, lng });
      setGeoStatus('ok');
      return { lat, lng };
    } catch (e: any) {
      setGeoStatus('fail');
      console.error("Geolocation error:", e);
      const errorMsg = e?.message || '';

      if (errorMsg.includes('secure origins') || errorMsg.includes('Only secure origins')) {
        // This comes from the browser itself, so we can't bypass it, but we can give a clear message
        throw new Error('La géolocalisation nécessite une connexion sécurisée (HTTPS) ou Localhost.');
      }

      throw new Error(
        errorMsg.includes('denied') || errorMsg.includes('User denied')
          ? 'Accès GPS refusé par l\'utilisateur. Veuillez autoriser la localisation.'
          : errorMsg || 'GPS indisponible'
      );
    }
  };

  /* REMOVED STRICT SECURE ORIGIN CHECK FOR CAMERA - BROWSERS WILL BLOCK ANYWAY IF NOT SECURE, BUT WE LET THEM HANDLE IT TO AVOID FALSE POSITIVES ON LOCAL IPs */
  const requestSelfieCamera = async () => {
    setAttendanceError(null);
    setCameraStatus('idle');

    // Browsers natively block getUserMedia on insecure origins (HTTP) except localhost.
    // Instead of pre-checking and blocking, we try and catch the specific error.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 720, height: 720 },
        audio: false,
      });
      selfieStreamRef.current = stream;
      if (selfieVideoRef.current) selfieVideoRef.current.srcObject = stream;
      setCameraStatus('ok');
    } catch (e: any) {
      setCameraStatus('fail');
      console.error("Camera error:", e);
      const errorMsg = e?.message || e?.name || 'Erreur inconnue';

      if (errorMsg.includes('PermissionDenied') || errorMsg.includes('NotAllowedError')) {
        throw new Error('Accès caméra refusé. Vérifiez les permissions de votre navigateur (cadenas dans la barre d\'adresse).');
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('DevicesNotFoundError')) {
        throw new Error('Aucune caméra trouvée.');
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('TrackStartError')) {
        throw new Error('La caméra est déjà utilisée par une autre application.');
      } else if (errorMsg.includes('OverconstrainedError')) {
        throw new Error('La caméra ne supporte pas la résolution demandée.');
      } else if (!window.isSecureContext) {
        throw new Error('L\'accès caméra nécessite une connexion sécurisée (HTTPS) ou Localhost. Votre connexion actuelle n\'est pas sécurisée.');
      } else {
        throw new Error(`Erreur caméra: ${errorMsg}`);
      }
    }
  };

  const captureSelfiePreview = () => {
    if (!selfieVideoRef.current || !selfieCanvasRef.current) return null;
    const ctx = selfieCanvasRef.current.getContext('2d');
    if (!ctx) return null;
    selfieCanvasRef.current.width = selfieVideoRef.current.videoWidth || 720;
    selfieCanvasRef.current.height = selfieVideoRef.current.videoHeight || 720;

    // Miroir horizontal pour selfie plus naturel
    ctx.translate(selfieCanvasRef.current.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(selfieVideoRef.current, 0, 0);
    return selfieCanvasRef.current.toDataURL('image/jpeg', 0.9);
  };

  const runBiometricStep = async (allowRegistration: boolean = false) => {
    setAttendanceError(null);
    if (!member?.id) {
      setBioStatus('fail');
      throw new Error('Employé non identifié');
    }

    if (!window.PublicKeyCredential) {
      setBioStatus('fail');
      throw new Error('Biométrie non supportée');
    }

    const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .catch(() => false);
    if (!ok) {
      setBioStatus('fail');
      throw new Error('Biométrie non disponible sur cet appareil');
    }

    try {
      // VÉRIFIER QUE L'EMPLOYÉ A DES EMPREINTES ENREGISTRÉES DANS LA BASE DE DONNÉES
      const existingCredentials = await biometricService.getCredentialsByEmployee(member.id);
      const hasCredentials = existingCredentials && existingCredentials.length > 0;

      // Si aucun credential et qu'on autorise l'enregistrement, créer un nouveau credential
      if (!hasCredentials && allowRegistration) {
        setIsBiometricActive(true);
        setIsWaitingFingerprint(true);
        setBiometricTimeoutReached(false);
        if (biometricTimeoutRef.current) {
          clearTimeout(biometricTimeoutRef.current);
          biometricTimeoutRef.current = null;
        }
        biometricTimeoutRef.current = setTimeout(() => {
          setBiometricTimeoutReached(true);
          biometricTimeoutRef.current = null;
        }, 60000);

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const publicKey: PublicKeyCredentialCreationOptions = {
          challenge,
          rp: { name: "Marvel CRM", id: window.location.hostname },
          user: {
            id: Uint8Array.from(member.id.slice(0, 64), (c: string) => c.charCodeAt(0)),
            name: member.email || `${member.full_name}@marvel.com`,
            displayName: member.full_name || "Employee"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          timeout: 60000,
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          attestation: "direct"
        };

        let newCredential: PublicKeyCredential | null = null;
        try {
          newCredential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
        } finally {
          if (biometricTimeoutRef.current) {
            clearTimeout(biometricTimeoutRef.current);
            biometricTimeoutRef.current = null;
          }
          setIsWaitingFingerprint(false);
          setIsBiometricActive(false);
        }

        if (newCredential && 'response' in newCredential) {
          const response = newCredential.response as AuthenticatorAttestationResponse;
          const credentialId = btoa(String.fromCharCode(...new Uint8Array(newCredential.rawId)));
          const publicKeyPem = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey() || [])));

          // Enregistrer dans Supabase
          await biometricService.registerCredential(
            member.id,
            credentialId,
            publicKeyPem,
            navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop'
          );

          // Mettre à jour le statut pour l'UI
          setHasBiometricCredential(true);
          setBioStatus('ok');
          return true; // Enregistrement réussi, on peut maintenant pointer
        }
      }

      // Si toujours pas de credentials après tentative d'enregistrement
      if (!hasCredentials) {
        setBioStatus('fail');
        throw new Error('ENREGISTREMENT_REQUIRED'); // Code spécial pour déclencher l'enregistrement
      }

      // Détecter le type d'appareil actuel pour utiliser le bon credential
      const deviceIsMobile = navigator.userAgent.includes('Mobile') ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = deviceIsMobile ? 'Mobile Device' : 'Desktop';

      // Essayer de trouver le credential correspondant à l'appareil actuel
      let credentialToUse = existingCredentials.find(c =>
        c.device_name?.includes(deviceType) ||
        (deviceIsMobile && c.device_name?.includes('Mobile')) ||
        (!deviceIsMobile && c.device_name?.includes('Desktop'))
      );

      // Si aucun credential spécifique trouvé pour CET appareil, on demande l'enregistrement
      if (!credentialToUse) {
        setBioStatus('fail');
        // Important : on ne fallback plus sur existingCredentials[0] car la clé ne marcherait pas sur ce device
        throw new Error('ENREGISTREMENT_REQUIRED');
      }

      const credentialId = credentialToUse.credential_id;
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Si plusieurs credentials existent, permettre au navigateur de choisir automatiquement
      // en ne limitant pas aux transports 'internal' uniquement
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        rpId: window.location.hostname,
        allowCredentials: existingCredentials.map(cred => ({
          id: Uint8Array.from(atob(cred.credential_id), (c: string) => c.charCodeAt(0)),
          type: 'public-key' as const,
          // Ne pas limiter les transports pour permettre au navigateur de choisir automatiquement
        })),
        userVerification: 'required',
      };

      // Garder la session biométrique active : états UI + timeout 60s côté interface
      setIsBiometricActive(true);
      setIsWaitingFingerprint(true);
      setBiometricTimeoutReached(false);
      if (biometricTimeoutRef.current) {
        clearTimeout(biometricTimeoutRef.current);
        biometricTimeoutRef.current = null;
      }
      biometricTimeoutRef.current = setTimeout(() => {
        setBiometricTimeoutReached(true);
        biometricTimeoutRef.current = null;
      }, 60000);

      let cred: PublicKeyCredential | null = null;
      try {
        cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
      } catch (getErr) {
        if (biometricTimeoutRef.current) {
          clearTimeout(biometricTimeoutRef.current);
          biometricTimeoutRef.current = null;
        }
        setIsWaitingFingerprint(false);
        setIsBiometricActive(false);
        // Sur mobile, si l'authentification échoue (ex: pas de clé trouvée), on propose l'enregistrement
        if (deviceIsMobile) {
          throw new Error('ENREGISTREMENT_REQUIRED');
        }
        throw new Error('Aucune empreinte détectée, veuillez réessayer.');
      } finally {
        if (biometricTimeoutRef.current) {
          clearTimeout(biometricTimeoutRef.current);
          biometricTimeoutRef.current = null;
        }
        setIsWaitingFingerprint(false);
        setIsBiometricActive(false);
      }
      if (!cred) throw new Error('Aucune empreinte détectée, veuillez réessayer.');

      // Mettre à jour la date de dernière utilisation dans la base de données
      await biometricService.updateLastUsed(credentialId);

      setBioStatus('ok');
      return true;
    } catch (e: any) {
      setBioStatus('fail');
      const errorMsg = e?.message || String(e);
      if (errorMsg.includes('Aucune empreinte') || errorMsg.includes('ENREGISTREMENT_REQUIRED')) {
        throw e; // Propager l'erreur telle quelle
      }
      throw new Error('Biométrie refusée ou échec authentification');
    }
  };

  // Cache simple pour éviter les requêtes répétées
  const attendanceCacheRef = useRef<{ employeeId: string; data: any; timestamp: number } | null>(null);
  const CACHE_DURATION = 30000; // 30 secondes de cache

  const loadTodayAttendance = async () => {
    if (!member?.id) return;

    // Vérifier le cache
    const cached = attendanceCacheRef.current;
    if (cached && cached.employeeId === member.id && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      const entries = cached.data.entries || [];
      if (entries.length > 0) {
        setAttendanceEntry(entries[0]);
        setDistanceToZoneMeters(entries[0].distance_meters ?? null);
      }
      return;
    }

    try {
      const r = await attendanceMe(member.id);
      // Mettre en cache
      attendanceCacheRef.current = {
        employeeId: member.id,
        data: r,
        timestamp: Date.now()
      };

      const entries = r.entries || [];
      if (entries.length > 0) {
        setAttendanceEntry(entries[0]);
        setDistanceToZoneMeters(entries[0].distance_meters ?? null);
      } else {
        setAttendanceEntry(null);
        setDistanceToZoneMeters(null);
      }
      // Recharger l'historique mensuel après mise à jour de l'entrée du jour
      loadMonthlyAttendance();
    } catch (err: any) {
      // Ignorer les erreurs AbortError (requêtes annulées)
      if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
        console.warn('Erreur chargement pointage:', err);
      }
      // On garde l'UX fluide même en cas d'erreur
    }
  };

  // Charger l'historique du mois courant pour l'employé
  const loadMonthlyAttendance = async () => {
    if (!member?.id) return;
    try {
      const { entries } = await attendanceHistory(member.id, 0);
      setMonthlyAttendance(entries || []);
    } catch (err: any) {
      console.warn('Erreur chargement historique pointage:', err?.message || String(err));
      setMonthlyAttendance([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'pointage') {
      // Invalider le cache si l'employé change
      if (attendanceCacheRef.current?.employeeId !== member?.id) {
        attendanceCacheRef.current = null;
      }

      loadTodayAttendance();
      loadMonthlyAttendance();
      // Vérifier si l'employé a une empreinte enregistrée
      if (member?.id) {
        biometricService.getCredentialsByEmployee(member.id)
          .then(creds => setHasBiometricCredential(creds.length > 0))
          .catch(() => setHasBiometricCredential(false));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, member?.id]);

  // Nettoyage du timeout biométrique au démontage
  useEffect(() => {
    return () => {
      if (biometricTimeoutRef.current) {
        clearTimeout(biometricTimeoutRef.current);
        biometricTimeoutRef.current = null;
      }
    };
  }, []);

  const openAttendanceFlow = async () => {
    setAttendanceError(null);
    setSelfiePreview(null);
    setShowAttendanceModal(true);
    try {
      await requestGeolocation();
      if (attendanceMode === 'SELFIE') {
        await requestSelfieCamera();
      } else {
        // on ne force pas ici, on déclenche au clic "Valider empreinte"
        setBioStatus('idle');
      }
    } catch (e: any) {
      setAttendanceError(e?.message || 'Erreur permission');
    }
  };

  const submitAttendanceIn = async () => {
    if (!member?.id) {
      setAttendanceError('Employé non identifié');
      return;
    }
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const coords = gpsCoords || (await requestGeolocation());

      if (attendanceMode === 'SELFIE') {
        const dataUrl = selfiePreview || captureSelfiePreview();
        if (!dataUrl) throw new Error('Selfie requis');
        const r = await attendanceCheckIn({
          employeeId: member.id,
          lat: coords.lat,
          lng: coords.lng,
          mode: 'SELFIE',
          selfieDataUrl: dataUrl,
        });
        setAttendanceEntry(r.entry);
        setDistanceToZoneMeters(r.entry.distance_meters ?? null);
        setSelfiePreview(null);
        stopSelfieStream();
        setShowAttendanceModal(false);
      } else {
        // Mode BIO : vérifier si l'employé a une empreinte, sinon l'enregistrer automatiquement
        try {
          await runBiometricStep(false); // Essayer d'abord sans enregistrement
        } catch (e: any) {
          // Si erreur "ENREGISTREMENT_REQUIRED", proposer l'enregistrement
          if (e?.message === 'ENREGISTREMENT_REQUIRED') {
            const confirmRegister = window.confirm(
              'Aucune empreinte digitale enregistrée.\n\n' +
              'Voulez-vous enregistrer votre empreinte maintenant ?\n\n' +
              'Cliquez sur OK pour enregistrer votre empreinte digitale.'
            );

            if (confirmRegister) {
              // Enregistrer automatiquement l'empreinte
              await runBiometricStep(true); // Autoriser l'enregistrement
              alert('✅ Empreinte digitale enregistrée avec succès ! Vous pouvez maintenant pointer.');
            } else {
              throw new Error('Enregistrement de l\'empreinte annulé. Utilisez le mode Selfie pour pointer.');
            }
          } else {
            throw e; // Propager les autres erreurs
          }
        }

        // Maintenant pointer avec l'empreinte
        const r = await attendanceCheckIn({
          employeeId: member.id,
          lat: coords.lat,
          lng: coords.lng,
          mode: 'BIO',
        });
        setAttendanceEntry(r.entry);
        setDistanceToZoneMeters(r.entry.distance_meters ?? null);
        setShowAttendanceModal(false);
      }
      // Après chaque pointage, rafraîchir l'historique du mois
      await loadMonthlyAttendance();
    } catch (e: any) {
      setAttendanceError(e?.message || 'Erreur check-in');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const submitAttendanceOut = async () => {
    if (!member?.id) {
      setAttendanceError('Employé non identifié');
      return;
    }
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const coords = gpsCoords || (await requestGeolocation());

      if (attendanceMode === 'SELFIE') {
        const dataUrl = selfiePreview || captureSelfiePreview();
        if (!dataUrl) throw new Error('Selfie requis');
        const r = await attendanceCheckOut({
          employeeId: member.id,
          lat: coords.lat,
          lng: coords.lng,
          mode: 'SELFIE',
          selfieDataUrl: dataUrl,
        });
        setAttendanceEntry(r.entry);
        setDistanceToZoneMeters(r.entry.distance_meters ?? null);
        setSelfiePreview(null);
        stopSelfieStream();
        setShowAttendanceModal(false);
      } else {
        // Mode BIO : réutiliser le même flux d'enregistrement/vérification que pour l'entrée
        try {
          await runBiometricStep(false); // Essayer d'abord sans enregistrement
        } catch (e: any) {
          if (e?.message === 'ENREGISTREMENT_REQUIRED') {
            const confirmRegister = window.confirm(
              'Aucune empreinte digitale enregistrée.\n\n' +
              'Voulez-vous enregistrer votre empreinte maintenant ?\n\n' +
              'Cliquez sur OK pour enregistrer votre empreinte digitale.'
            );

            if (confirmRegister) {
              await runBiometricStep(true); // Autoriser l'enregistrement
              alert('✅ Empreinte digitale enregistrée avec succès ! Vous pouvez maintenant pointer.');
            } else {
              throw new Error('Enregistrement de l\'empreinte annulé. Utilisez le mode Selfie pour pointer.');
            }
          } else {
            throw e; // Propager les autres erreurs
          }
        }

        const r = await attendanceCheckOut({
          employeeId: member.id,
          lat: coords.lat,
          lng: coords.lng,
          mode: 'BIO',
        });
        setAttendanceEntry(r.entry);
        setDistanceToZoneMeters(r.entry.distance_meters ?? null);
        setShowAttendanceModal(false);
      }
      // Après chaque pointage, rafraîchir l'historique du mois
      await loadMonthlyAttendance();
    } catch (e: any) {
      setAttendanceError(e?.message || 'Erreur check-out');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const captureFace = (type: 'IN' | 'OUT') => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/png');

        setClockHistory(prev => [{ time: new Date().toLocaleTimeString(), img: data, type, method: 'FACE' }, ...prev]);

        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());

        if (type === 'IN') {
          setIsClockedIn(true);
          setElapsedPointageSeconds(0);
        } else {
          setIsClockedIn(false);
        }
        setShowCamera(false);
      }
    }
  };

  // Fonction pour démarrer la caméra pour capturer le visa
  const startVisaCamera = async () => {
    setCameraError(null);
    setShowVisaCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      });
      if (visaVideoRef.current) {
        visaVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError("Accès caméra requis pour la capture du visa.");
      setShowVisaCamera(false);
    }
  };

  // Fonction pour capturer le visa et l'enregistrer
  const captureVisa = async () => {
    if (!visaVideoRef.current || !visaCanvasRef.current || !member?.id) return;

    const context = visaCanvasRef.current.getContext('2d');
    if (!context) return;

    visaCanvasRef.current.width = visaVideoRef.current.videoWidth;
    visaCanvasRef.current.height = visaVideoRef.current.videoHeight;
    context.drawImage(visaVideoRef.current, 0, 0);

    visaCanvasRef.current.toBlob(async (blob) => {
      if (!blob) return;

      setIsUploadingVisa(true);
      try {
        const fileName = `visa_${member.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `visas/${fileName}`;

        // Upload vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Obtenir l'URL publique
        const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
        const visaPhotoUrl = data.publicUrl;

        // Sauvegarder le pointage avec visa dans la base de données
        const type = isClockedIn ? 'OUT' : 'IN';
        await pointageService.createPointage(member.id, type, 'VISA', visaPhotoUrl);

        // Ajouter à l'historique local
        setClockHistory(prev => [{
          time: new Date().toLocaleTimeString(),
          img: visaPhotoUrl,
          type,
          method: 'VISA'
        }, ...prev]);

        // Mettre à jour l'état de pointage
        if (type === 'IN') {
          setIsClockedIn(true);
          setElapsedPointageSeconds(0);
        } else {
          setIsClockedIn(false);
        }

        // Arrêter la caméra
        const stream = visaVideoRef.current?.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
        setShowVisaCamera(false);
      } catch (error: any) {
        alert('Erreur lors de l\'enregistrement du visa: ' + error.message);
      } finally {
        setIsUploadingVisa(false);
      }
    }, 'image/jpeg', 0.9);
  };

  // Fonction pour évaluer la géolocalisation et le statut (utilisée par l'ancien système de pointage)
  const evaluateGeoAndStatus = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      // Ici vous pouvez ajouter une logique pour vérifier si la position est dans une zone autorisée
      return { allowed: true, status: 'PRESENT' as const, note: undefined };
    } catch (error) {
      // Si la géolocalisation échoue, on autorise quand même le pointage
      return { allowed: true, status: 'PRESENT' as const, note: 'Géolocalisation non disponible' };
    }
  };

  const handleBiometricAuth = async () => {
    if (!window.PublicKeyCredential || !member?.id) {
      alert("Biométrie non supportée ou membre non identifié.");
      return;
    }

    try {
      // Vérifier si l'employé a déjà des credentials enregistrés
      const existingCredentials = await biometricService.getCredentialsByEmployee(member.id);
      const hasCredentials = existingCredentials.length > 0;

      let credential: PublicKeyCredential | null = null;

      if (!hasCredentials) {
        // PREMIER ENREGISTREMENT : Créer un nouveau credential
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const publicKey: PublicKeyCredentialCreationOptions = {
          challenge,
          rp: { name: "Marvel CRM", id: window.location.hostname },
          user: {
            id: Uint8Array.from(member.id.slice(0, 64), (c: string) => c.charCodeAt(0)),
            name: member.email || `${member.full_name}@marvel.com`,
            displayName: member.full_name || "Employee"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          timeout: 60000,
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          attestation: "direct"
        };

        credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;

        if (credential && 'response' in credential) {
          const response = credential.response as AuthenticatorAttestationResponse;
          const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          const publicKeyPem = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey() || [])));

          // Enregistrer dans Supabase
          await biometricService.registerCredential(
            member.id,
            credentialId,
            publicKeyPem,
            navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop'
          );

          alert("Empreinte biométrique enregistrée avec succès !");
        }
      } else {
        // AUTHENTIFICATION : Utiliser un credential existant
        const credentialId = existingCredentials[0].credential_id;
        const challenge = crypto.getRandomValues(new Uint8Array(32));

        const publicKey: PublicKeyCredentialRequestOptions = {
          challenge,
          timeout: 60000,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: Uint8Array.from(atob(credentialId), (c: string) => c.charCodeAt(0)),
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: "required"
        };

        credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;

        if (credential) {
          // Mettre à jour la date de dernière utilisation
          await biometricService.updateLastUsed(credentialId);
        }
      }

      if (credential) {
        // Vérifier la géolocalisation si c'est une entrée
        const type = isClockedIn ? 'OUT' : 'IN';
        let status: 'PRESENT' | 'EN_RETARD' | 'REFUSE' = 'PRESENT';
        let note: string | undefined;

        if (type === 'IN') {
          const result = await evaluateGeoAndStatus();
          status = result.status;
          note = result.note;

          if (!result.allowed) {
            setClockHistory(prev => [{
              time: new Date().toLocaleTimeString(),
              img: 'https://cdn-icons-png.flaticon.com/512/3843/3843027.png',
              type,
              method: 'BIO',
              status,
              note,
            }, ...prev]);
            alert("Pointage refusé (zone ou géolocalisation).");
            return;
          }
        }

        setClockHistory(prev => [{
          time: new Date().toLocaleTimeString(),
          img: 'https://cdn-icons-png.flaticon.com/512/3843/3843027.png',
          type,
          method: 'BIO',
          status,
          note,
        }, ...prev]);

        if (type === 'IN') {
          setIsClockedIn(true);
          setElapsedPointageSeconds(0);
        } else {
          setIsClockedIn(false);
        }

        alert(hasCredentials ? "Authentification biométrique réussie !" : "Empreinte enregistrée et authentification réussie !");
      }

    } catch (e: any) {
      console.error("Erreur biométrique:", e);
      const errorMsg = e?.message || String(e);

      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('NotSupportedError')) {
        alert("Authentification biométrique refusée ou non supportée sur cet appareil.");
      } else {
        alert(`Erreur biométrique: ${errorMsg}`);
      }
    }
  };

  const formatPointageTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sauvegarder le temps investi dans la mission
  const saveCurrentTime = async (seconds: number) => {
    if (!activeMission) return;
    try {
      if (activeMission.type === 'task') {
        await tasksService.update(activeMission.id, {
          time_spent: seconds
        } as any);
      } else if (activeMission.type === 'module' && activeMission.moduleId) {
        const project = projects.find(p => p.id === activeMission.projectId);
        if (project) {
          const teaserData = { ...(project.teaser_data as any) };
          if (!teaserData.time_spent) teaserData.time_spent = {};
          teaserData.time_spent[activeMission.moduleId] = seconds;
          await projectsService.update(project.id, { teaser_data: teaserData });
        }
      }
      await fetchData(true); // Recharger silencieusement
    } catch (err) {
      console.error('Erreur sauvegarde temps:', err);
    }
  };

  // Mettre à jour le statut d'une mission
  const handleUpdateStatus = async (mission: UnifiedMission, newStatus: string) => {
    setIsSyncing(true);
    try {
      if (mission.type === 'task') {
        await tasksService.update(mission.id, { status: newStatus as any });
      } else if (mission.type === 'module' && mission.moduleId) {
        const project = projects.find(p => p.id === mission.projectId);
        if (project) {
          const teaserData = { ...(project.teaser_data as any) };
          if (!teaserData.module_status) teaserData.module_status = {};
          teaserData.module_status[mission.moduleId] = newStatus;

          // Si tous les modules sont terminés, mettre le statut global à "Terminé"
          const allDone = Object.values(teaserData.module_status).every(v => v === 'Terminé' || v === 'Livré S++');
          if (allDone) {
            teaserData.status = 'Terminé';
          } else if (newStatus === 'En cours') {
            teaserData.status = 'En cours';
          }

          await projectsService.update(project.id, { teaser_data: teaserData });
        }
      }
      await fetchData();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    } finally {
      setIsSyncing(false);
    }
  };
  const handleSendReport = async () => {
    if (!reportText.trim() || !activeMission) return;
    setIsSyncing(true);
    try {
      const newReport: TeaserReport = {
        id: Date.now().toString(),
        category: reportCategory,
        message: reportText.trim(),
        date: new Date().toISOString(),
        status: 'Open'
      };
      setTeaserReports(prev => [newReport, ...prev]);
      setReportText('');
      // Ici, tu pourrais sauvegarder dans Supabase si nécessaire
    } catch (err) {
      console.error('Erreur envoi rapport:', err);
    } finally {
      setIsSyncing(false);
    }
  };
  const formatTime = (sec: number) => { const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60; return `${h}h ${m}m ${s}s`; };
  const handleQuickView = (mission: UnifiedMission) => { const p = projects.find(proj => proj.id === mission.projectId); if (p) setQuickViewProject(p); };

  return (
    <div className={`space-y-8 animate-in fade-in duration-700 pb-24 max-w-[1600px] mx-auto transition-all ${isFocusMode ? 'p-4' : ''}`}>
      {/* Panneau de notifications (ouvert/fermé par la cloche du header principal) */}
      {showNotifications && (
        <div className="fixed top-20 right-4 z-50">
          <div className="w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-[#006344] uppercase italic">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-black text-[#006344] hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-black text-slate-400 uppercase italic">
                    Aucune notification
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full p-4 border-b border-slate-50 hover:bg-slate-50 transition-all text-left ${!notif.read ? 'bg-blue-50/50' : ''
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${!notif.read ? 'bg-[#006344]' : 'bg-transparent'
                          }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p
                            className={`text-xs font-black uppercase ${!notif.read ? 'text-[#006344]' : 'text-slate-600'
                              }`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[9px] font-bold text-slate-400">
                            {notif.date.toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 italic">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!isFocusMode && (
        <>
          {/* Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* PERFORMANCE Card */}
            <div className="bg-[#006344] p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#B6C61A]"></div>
              <div className="relative z-10">
                <Trophy size={32} className="text-yellow-400 mb-4" />
                <p className="text-[10px] font-black text-[#B6C61A] uppercase tracking-widest mb-2">PERFORMANCE</p>
                <p className="text-2xl font-black text-[#B6C61A] uppercase italic">NIVEAU S++</p>
              </div>
            </div>

            {/* CAPITAL PRIME Card */}
            <div className="bg-pink-50 p-6 rounded-[2rem] shadow-lg border border-pink-100">
              <div className="relative mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center relative">
                  <Coins size={24} className="text-white" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-[8px] font-black text-white">1</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CAPITAL PRIME</p>
              <p className="text-3xl font-black text-red-600 tabular-nums">{statsBonus.prime.toLocaleString('fr-FR')} F</p>
            </div>

            {/* MODULES FINIS Card */}
            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
              <Target size={32} className="text-[#006344] mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MODULES FINIS</p>
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-black text-slate-900">{statsBonus.count}</p>
                <span className="text-2xl font-black text-slate-400">/</span>
                <p className="text-4xl font-black text-slate-900">8</p>
              </div>
            </div>

            {/* OBJECTIF STATUS ALPHA Card */}
            <div className="bg-blue-900 p-6 rounded-[2rem] shadow-xl">
              <Flame size={32} className="text-yellow-400 mb-4" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">OBJECTIF</p>
              <p className="text-2xl font-black text-[#B6C61A] uppercase italic">STATUS ALPHA</p>
            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-inner flex items-center justify-around">
            {[
              { id: 'cockpit', label: 'Cockpit', icon: LayoutGrid },
              { id: 'pointage', label: 'Pointage', icon: Timer },
              { id: 'historique', label: 'Journal', icon: RotateCcw },
              { id: 'finance', label: 'Finances', icon: Wallet },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${activeTab === tab.id
                  ? 'bg-[#006344] text-white'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <tab.icon size={20} />
                <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
            <button
              onClick={() => setActiveTab('bonus')}
              className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === 'bonus'
                ? 'bg-[#006344] text-white shadow-lg'
                : 'bg-[#006344] text-white shadow-md hover:shadow-lg'
                }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={18} />
                <span>BONUS TRACKER</span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* VUE POINTAGE MODIFIÉE */}
      {activeTab === 'pointage' && (
        <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-500">
          {/* Main Cockpit */}
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col items-center justify-center space-y-12 relative overflow-hidden min-h-[600px]">
            <div className="absolute top-10 left-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#B6C61A]" /> SECURE ACCESS V3
            </div>

            <div className="relative">
              {/* CIRCULAR PROGRESS DECORATION */}
              <svg className="w-80 h-80 -rotate-90">
                <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-slate-50" />
                <circle
                  cx="160" cy="160" r="140"
                  stroke="currentColor" strokeWidth="6" fill="transparent"
                  strokeDasharray={880}
                  strokeDashoffset={isClockedIn ? 880 - (elapsedPointageSeconds % 3600 / 3600 * 880) : 880}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ${isClockedIn ? 'text-[#B6C61A]' : 'text-slate-100'}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                <p className={`text-[12px] font-black uppercase tracking-[0.4em] italic ${isClockedIn ? 'text-emerald-500 animate-pulse' : 'text-slate-300'}`}>
                  {isClockedIn ? 'SERVICE EN COURS' : 'VEILLE SYSTÈME'}
                </p>
                <h3 className={`text-7xl font-black italic tracking-tighter tabular-nums leading-none ${isClockedIn ? 'text-[#006344]' : 'text-slate-100 opacity-60'}`}>
                  {isClockedIn ? formatPointageTime(elapsedPointageSeconds) : '00:00:00'}
                </h3>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                  {currentTime.toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-4">
              <div className="bg-slate-50/70 border border-slate-100 rounded-[2rem] p-6 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400 flex items-center gap-2">
                    📍 Localisation
                  </span>
                  <span className={geoStatus === 'ok' ? 'text-emerald-600' : geoStatus === 'fail' ? 'text-red-600' : 'text-slate-400'}>
                    {geoStatus === 'ok' ? 'OK' : geoStatus === 'fail' ? 'REFUSÉ' : '…'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400 flex items-center gap-2">
                    📷 Caméra (Selfie)
                  </span>
                  <span className={cameraStatus === 'ok' ? 'text-emerald-600' : cameraStatus === 'fail' ? 'text-red-600' : 'text-slate-400'}>
                    {cameraStatus === 'ok' ? 'OK' : cameraStatus === 'fail' ? 'REFUSÉ' : '…'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400 flex items-center gap-2">
                    🔐 Biométrie
                  </span>
                  <span className={bioStatus === 'ok' ? 'text-emerald-600' : bioStatus === 'fail' ? 'text-red-600' : 'text-slate-400'}>
                    {bioStatus === 'ok' ? 'OK' : bioStatus === 'fail' ? 'REFUSÉ' : isBiometricAvailable ? 'DISPO' : 'N/A'}
                  </span>
                </div>
                {typeof distanceToZoneMeters === 'number' && (
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 pt-2 border-t border-slate-100">
                    Distance zone: <span className="text-slate-700">{Math.round(distanceToZoneMeters)}m</span> / {ATTENDANCE_ZONE_RADIUS_METERS}m
                  </div>
                )}
              </div>

              {attendanceEntry && (
                <div className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-sm border flex items-center justify-center gap-3 mb-4 ${attendanceEntry.status === 'PRESENT'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : attendanceEntry.status === 'EN_RETARD'
                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                    : 'bg-red-50 border-red-100 text-red-700'
                  }`}>
                  ✅ Statut : {attendanceEntry.status === 'PRESENT' ? 'PRÉSENT' : attendanceEntry.status === 'EN_RETARD' ? 'EN RETARD' : 'REFUSÉ'}
                  <span className="opacity-60">
                    {attendanceEntry.timestamp ? `à ${new Date(attendanceEntry.timestamp).toLocaleTimeString()}` : ''}
                  </span>
                </div>
              )}

              {!hasTodayOut && (
                <button
                  onClick={openAttendanceFlow}
                  disabled={attendanceLoading}
                  className={`w-full py-7 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 ${hasTodayIn ? 'bg-[#BD3B1B] text-white' : 'bg-[#006344] text-white'
                    } disabled:opacity-60`}
                >
                  {attendanceLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      {hasTodayIn ? <LogOut size={18} /> : <SearchCheck size={18} />}
                      {hasTodayIn ? 'Valider ma sortie' : 'Marquer ma présence'}
                    </>
                  )}
                </button>
              )}

              {attendanceError && (
                <div className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4">
                  {attendanceError}
                </div>
              )}
            </div>

            {showAttendanceModal && (
              <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white animate-in zoom-in duration-300 overflow-y-auto">
                <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-[2.5rem] p-6 my-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-widest italic">Pointage intelligent</h4>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic mt-1">
                        Selfie ou biométrie + GPS (≤ {ATTENDANCE_ZONE_RADIUS_METERS}m)
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        stopSelfieStream();
                        setShowAttendanceModal(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={async () => {
                        setAttendanceMode('SELFIE');
                        setSelfiePreview(null);
                        try {
                          await requestSelfieCamera();
                          setCameraStatus('ok');
                        } catch (e: any) {
                          setAttendanceError(e?.message || 'Caméra refusée');
                        }
                      }}
                      className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${attendanceMode === 'SELFIE'
                        ? 'bg-[#B6C61A] text-[#006344] border-[#B6C61A]'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                        }`}
                    >
                      📷 Mode Selfie
                    </button>
                    <button
                      onClick={() => {
                        stopSelfieStream();
                        setAttendanceMode('BIO');
                        setSelfiePreview(null);
                      }}
                      className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${attendanceMode === 'BIO'
                        ? 'bg-[#B6C61A] text-[#006344] border-[#B6C61A]'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                        }`}
                    >
                      🔐 Mode Empreinte
                    </button>
                  </div>

                  {attendanceMode === 'SELFIE' ? (
                    <div className="space-y-4">
                      {/* Disposition horizontale sur mobile, verticale sur desktop */}
                      <div className="flex flex-row md:grid md:grid-cols-2 gap-4 items-start overflow-x-auto">
                        <div className="rounded-3xl overflow-hidden border border-white/10 bg-black flex-shrink-0 w-[calc(50%-0.5rem)] md:w-full">
                          <video ref={selfieVideoRef} autoPlay playsInline muted className="w-full h-40 md:h-72 object-cover" />
                          <canvas ref={selfieCanvasRef} className="hidden" />
                        </div>
                        <div className="rounded-3xl overflow-hidden border border-white/10 bg-black flex-shrink-0 w-[calc(50%-0.5rem)] md:w-full">
                          {selfiePreview ? (
                            <img src={selfiePreview} className="w-full h-40 md:h-72 object-cover" alt="Selfie" />
                          ) : (
                            <div className="w-full h-40 md:h-72 flex items-center justify-center text-white/30 text-[10px] font-black uppercase tracking-widest">
                              Aperçu selfie
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Boutons sticky en bas sur mobile */}
                      <div className="flex gap-3 sticky bottom-0 bg-transparent pt-2 md:pt-0 md:sticky md:relative">
                        <button
                          onClick={() => {
                            const snap = captureSelfiePreview();
                            if (snap) setSelfiePreview(snap);
                          }}
                          className="flex-1 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest"
                        >
                          Prendre photo
                        </button>
                        <button
                          onClick={hasTodayIn && !hasTodayOut ? submitAttendanceOut : submitAttendanceIn}
                          disabled={attendanceLoading || !selfiePreview}
                          className="flex-1 py-4 rounded-2xl bg-[#B6C61A] text-[#006344] disabled:opacity-50 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          {attendanceLoading ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <>
                              <Check size={16} />{' '}
                              {hasTodayIn && !hasTodayOut ? 'Valider sortie' : 'Valider entrée'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">
                        {hasBiometricCredential === false ? (
                          <span className="text-amber-300">
                            ⚠️ Première utilisation : Cliquez sur "Valider empreinte" pour enregistrer votre empreinte digitale. Le système vous guidera automatiquement.
                          </span>
                        ) : isWaitingFingerprint ? (
                          <span className="text-[#B6C61A] flex items-center gap-2">
                            <Loader2 className="animate-spin flex-shrink-0" size={14} />
                            En attente de l&apos;empreinte digitale...
                          </span>
                        ) : (
                          'Appuie sur "Valider empreinte" (WebAuthn). Si l\'appareil ne supporte pas, le système refusera.'
                        )}
                      </div>
                      {(biometricTimeoutReached || (attendanceError && !isWaitingFingerprint)) ? (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                            {biometricTimeoutReached ? 'Aucune empreinte détectée, veuillez réessayer.' : attendanceError}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setBiometricTimeoutReached(false);
                              setAttendanceError(null);
                              (hasTodayIn && !hasTodayOut ? submitAttendanceOut : submitAttendanceIn)();
                            }}
                            className="w-full py-4 rounded-2xl bg-[#B6C61A] text-[#006344] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Fingerprint size={16} /> Relancer la biométrie
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={hasTodayIn && !hasTodayOut ? submitAttendanceOut : submitAttendanceIn}
                          disabled={attendanceLoading || isWaitingFingerprint}
                          className="w-full py-4 rounded-2xl bg-[#B6C61A] text-[#006344] disabled:opacity-60 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          {attendanceLoading && !isWaitingFingerprint ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : isWaitingFingerprint ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="animate-spin" size={16} /> En attente de l&apos;empreinte...
                            </span>
                          ) : (
                            <>
                              <Fingerprint size={16} />{' '}
                              {hasTodayIn && !hasTodayOut
                                ? 'Valider empreinte (sortie)'
                                : hasBiometricCredential === false
                                  ? 'Enregistrer & Valider empreinte'
                                  : 'Valider empreinte'}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {attendanceError && (
                    <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                      {attendanceError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Activity Log - Historique mensuel */}
          <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col space-y-8 min-h-[600px]">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <h3 className="text-xl font-black text-[#006344] uppercase italic flex items-center gap-3">
                <History size={24} className="text-[#B6C61A]" /> Historique Pointage (mois en cours)
              </h3>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2">
              {monthlyAttendance.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-60 italic">
                  <Fingerprint size={40} className="mb-3 text-slate-300" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400 text-center">
                    Aucun pointage enregistré pour ce mois
                  </p>
                </div>
              )}

              {monthlyAttendance.length > 0 &&
                // Regrouper par jour et constituer les couples Entrée/Sortie
                Object.values(
                  monthlyAttendance.reduce<Record<string, { date: string; in?: AttendanceEntry; out?: AttendanceEntry }>>(
                    (acc, entry) => {
                      const d = new Date(entry.timestamp);
                      const dateKey = d.toISOString().split('T')[0];
                      if (!acc[dateKey]) {
                        acc[dateKey] = { date: dateKey };
                      }
                      if (entry.type === 'IN' && !acc[dateKey].in) {
                        acc[dateKey].in = entry;
                      } else if (entry.type === 'OUT' && !acc[dateKey].out) {
                        acc[dateKey].out = entry;
                      }
                      return acc;
                    },
                    {}
                  )
                )
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((day) => {
                    const inTime = day.in ? new Date(day.in.timestamp) : null;
                    const outTime = day.out ? new Date(day.out.timestamp) : null;
                    const durationMs =
                      inTime && outTime ? Math.max(0, outTime.getTime() - inTime.getTime()) : null;
                    const hours = durationMs ? Math.floor(durationMs / (1000 * 60 * 60)) : 0;
                    const minutes = durationMs
                      ? Math.floor((durationMs / (1000 * 60)) % 60)
                      : 0;

                    const selfieThumb =
                      day.in?.selfie_url || day.out?.selfie_url || undefined;

                    return (
                      <div
                        key={day.date}
                        className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-[#B6C61A]/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-slate-200 bg-white overflow-hidden">
                            {selfieThumb ? (
                              <img
                                src={selfieThumb}
                                alt="Selfie pointage"
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => window.open(selfieThumb, '_blank')}
                              />
                            ) : (
                              <Fingerprint size={24} className="text-[#B6C61A]" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase italic flex items-center gap-2">
                              {new Date(day.date).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                              Entrée:{' '}
                              {inTime
                                ? inTime.toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                : '—'}
                              {'  ·  '}
                              Sortie:{' '}
                              {outTime
                                ? outTime.toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                : '—'}
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                              Durée:{' '}
                              {durationMs ? `${hours}h${minutes.toString().padStart(2, '0')}` : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {day.in && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
                              IN {day.in.method}
                            </span>
                          )}
                          {day.out && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                              OUT {day.out.method}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      )}

      {/* VUE BONUS TRACKER */}
      {activeTab === 'bonus' && (
        <div className="xl:col-span-12 space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Carte Prime du mois */}
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 rounded-[1.5rem] bg-[#006344] text-[#B6C61A] flex items-center justify-center shadow-lg">
                  <Trophy size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#006344]">
                    Prime du mois
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Objectif : 8 missions terminées
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prime actuelle</p>
                <p className="text-5xl font-black italic text-[#006344] tabular-nums">
                  {statsBonus.prime.toLocaleString('fr-FR')} F
                </p>
                <p className="text-sm font-bold text-slate-500 mt-2">
                  {statsBonus.count < 8 ? `Base 10 000 F − pénalité` : statsBonus.count === 8 ? `Prime pleine` : `+ ${((statsBonus.count - 8) * 5000).toLocaleString('fr-FR')} F bonus`}
                </p>
              </div>
              <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className={`text-sm font-black uppercase italic text-center ${statsBonus.status === 'safe' ? 'text-[#006344]' : statsBonus.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                  {statsBonus.message}
                </p>
              </div>
            </div>

            {/* Progression objectif */}
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 rounded-[1.5rem] bg-[#B6C61A]/20 text-[#006344] flex items-center justify-center">
                  <Target size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#006344]">
                    Progression
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {statsBonus.count} / 8 missions livrées
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    <span>Missions terminées</span>
                    <span>{Math.min(statsBonus.count, 8)} / 8</span>
                  </div>
                  <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${statsBonus.count >= 8 ? 'bg-[#B6C61A]' : statsBonus.status === 'danger' ? 'bg-red-500' : 'bg-[#006344]'
                        }`}
                      style={{ width: `${Math.min((statsBonus.count / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                  <span>Courbe idéale ce mois : {statsBonus.idealProgress.toFixed(1)} missions à ce jour</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-2xl font-black italic text-[#006344]">{statsBonus.count}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Livrées</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-2xl font-black italic text-slate-600">{Math.max(0, 8 - statsBonus.count)}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Restantes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Règles & missions comptabilisées */}
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <Coins size={24} className="text-[#B6C61A]" />
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-[#006344]">
                Règles bonus
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="font-black uppercase text-emerald-800">Prime de base</p>
                <p className="text-slate-600 mt-1">10 000 F si 8 missions livrées dans le mois.</p>
              </div>
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="font-black uppercase text-amber-800">Pénalité</p>
                <p className="text-slate-600 mt-1">Si tu es en retard sur la courbe idéale du mois, la prime diminue.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#006344]/10 border border-[#006344]/20">
                <p className="font-black uppercase text-[#006344]">Bonus au-delà de 8</p>
                <p className="text-slate-600 mt-1">+ 5 000 F par mission livrée au-delà de 8.</p>
              </div>
            </div>
            <div className="mt-8">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Missions comptabilisées ce mois</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {combinedMissions
                  .filter(m => m.status === 'Terminé' || m.status === 'Livré S++' || m.status === 'LIVRÉ S++')
                  .sort((a, b) => new Date(b.deadline || 0).getTime() - new Date(a.deadline || 0).getTime())
                  .slice(0, 20)
                  .map((m, i) => (
                    <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 size={18} className="text-[#B6C61A] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black uppercase italic text-slate-800 truncate">{m.couple}</p>
                        <p className="text-[10px] font-bold text-slate-500">{m.title}</p>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 shrink-0">
                        {m.deadline ? new Date(m.deadline).toLocaleDateString('fr-FR') : '—'}
                      </span>
                    </div>
                  ))}
                {combinedMissions.filter(m => m.status === 'Terminé' || m.status === 'Livré S++' || m.status === 'LIVRÉ S++').length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-sm font-black uppercase italic">
                    Aucune mission terminée encore ce mois
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VUE JOURNAL DES MISSIONS */}
      {activeTab === 'historique' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10 pb-8 border-b border-slate-50">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center text-[#B6C61A]">
                <RotateCcw size={32} className="text-[#B6C61A]" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#006344]">
                JOURNAL DES MISSIONS {employeeName.toUpperCase()}
              </h2>
            </div>

            {/* Liste des missions */}
            <div className="space-y-4">
              {combinedMissions
                .filter(m =>
                  m.status === 'Terminé' ||
                  m.status === 'Livré S++' ||
                  m.status === 'Attente Validation' ||
                  m.status === 'LIVRÉ S++'
                )
                .sort((a, b) => {
                  // Trier par date de deadline décroissante (plus récent en premier)
                  const dateA = new Date(a.deadline || 0).getTime();
                  const dateB = new Date(b.deadline || 0).getTime();
                  return dateB - dateA;
                })
                .map((mission, index) => {
                  const project = projects.find(p => p.id === mission.projectId);
                  const missionDate = mission.deadline
                    ? new Date(mission.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '';

                  const displayStatus = mission.status === 'Terminé' || mission.status === 'Livré S++' || mission.status === 'LIVRÉ S++'
                    ? 'LIVRÉ S++'
                    : mission.status === 'Attente Validation'
                      ? 'EN REVUE'
                      : mission.status;

                  return (
                    <div
                      key={mission.id}
                      className="flex items-center justify-between p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:border-[#006344]/20 hover:shadow-md transition-all group cursor-pointer"
                      onClick={() => handleQuickView(mission)}
                    >
                      {/* Numéro et détails */}
                      <div className="flex items-center gap-6 flex-1">
                        {/* Numéro d'index */}
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#006344] font-black text-lg shadow-sm flex-shrink-0">
                          {index + 1}
                        </div>

                        {/* Informations mission */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 mb-1">
                            {mission.couple}
                          </h3>
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                            {mission.title} {missionDate && `• ${missionDate}`}
                          </p>
                        </div>
                      </div>

                      {/* Statut et temps */}
                      <div className="flex items-center gap-8 flex-shrink-0">
                        {/* Statut */}
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">STATUS</p>
                          <p className="text-base font-black uppercase italic text-[#006344] leading-tight">
                            {displayStatus}
                          </p>
                        </div>

                        {/* Temps investi */}
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TEMPS</p>
                          <p className="text-base font-black uppercase italic text-[#B6C61A] tabular-nums leading-tight">
                            {formatTime(mission.time_spent || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* État vide */}
              {combinedMissions.filter(m =>
                m.status === 'Terminé' ||
                m.status === 'Livré S++' ||
                m.status === 'Attente Validation' ||
                m.status === 'LIVRÉ S++'
              ).length === 0 && (
                  <div className="py-20 text-center">
                    <History size={64} className="mx-auto mb-4 text-slate-200" />
                    <p className="text-lg font-black text-slate-400 uppercase italic tracking-tight">
                      Aucune mission terminée
                    </p>
                    <p className="text-sm font-bold text-slate-300 uppercase tracking-widest mt-2">
                      Vos missions terminées apparaîtront ici
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* VUE FINANCES */}
      {activeTab === 'finance' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header Gouvernance Financière */}
          <div className="bg-white p-8 rounded-[4rem] shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[2rem] bg-[#006344] text-[#B6C61A] flex items-center justify-center shadow-lg">
                  <Landmark size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#006344]">
                    GOUVERNANCE FINANCIÈRE
                  </h2>
                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest mt-2 italic">
                    SALAIRE {employeeName.toUpperCase()} // BASE {financeData.baseSalary.toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>

              {/* Navigation mois */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedFinanceMonth(Math.max(0, selectedFinanceMonth - 1))}
                  className="p-2 text-slate-400 hover:text-[#006344] transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl">
                  <CalendarIcon size={18} className="text-[#006344]" />
                  <span className="text-base font-black uppercase italic text-[#006344]">
                    {new Date(2025, selectedFinanceMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFinanceMonth(Math.min(11, selectedFinanceMonth + 1))}
                  className="p-2 text-slate-400 hover:text-[#006344] transition-all"
                >
                  <ChevronRightIcon size={20} />
                </button>
              </div>
            </div>

            {/* Cartes résumé */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Échéance Dettes */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ÉCHÉANCE DETTES</p>
                <p className="text-4xl font-black text-orange-600 tabular-nums">
                  -{financeData.totalAdvances.toLocaleString('fr-FR')} F
                </p>
              </div>

              {/* Net à Percevoir */}
              <div className="bg-[#006344] p-6 rounded-[2rem] shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <DollarSign size={128} className="text-white" />
                </div>
                <p className="text-[10px] font-black text-[#B6C61A] uppercase tracking-widest mb-3 relative z-10">NET À PERCEVOIR</p>
                <p className="text-4xl font-black text-white tabular-nums relative z-10">
                  {financeData.netToPay.toLocaleString('fr-FR')} F
                </p>
              </div>
            </div>

            {/* Panneaux Salaire et Avances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Salaire + Prime */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">SALAIRE + PRIME</p>
                <p className="text-5xl font-black text-slate-900 tabular-nums">
                  {(financeData.baseSalary + (financeData.isCurrentMonth ? financeData.activePrime : 0)).toLocaleString('fr-FR')} F
                </p>
              </div>

              {/* Avances */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AVANCES (MOIS)</p>
                <p className={`text-5xl font-black tabular-nums ${financeData.totalAdvances > 0 ? 'text-red-600' : 'text-red-500'}`}>
                  -{financeData.totalAdvances.toLocaleString('fr-FR')} F
                </p>
              </div>
            </div>

            {/* Journal des Opérations Financières */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                <DollarSign size={24} className="text-[#006344]" />
                <h3 className="text-xl font-black uppercase italic text-[#006344]">
                  JOURNAL DES OPÉRATIONS FINANCIÈRES
                </h3>
              </div>

              {/* En-têtes du tableau */}
              <div className="grid grid-cols-4 gap-4 mb-4 pb-3 border-b border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DATE / ÉCHÉANCE</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TYPE</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DÉTAILS</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">MONTANT</p>
              </div>

              {/* Ligne Prime de Performance */}
              {financeData.isCurrentMonth && financeData.activePrime > 0 && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-emerald-50/30 rounded-2xl mb-2">
                  <p className="text-sm font-black text-slate-900 uppercase italic">M+0</p>
                  <span className="px-3 py-1 bg-[#B6C61A] text-white rounded-full text-[10px] font-black uppercase w-fit">
                    PRIME
                  </span>
                  <p className="text-sm font-black uppercase italic text-[#006344]">
                    PRIME DE PERFORMANCE {employeeName.toUpperCase()}
                  </p>
                  <p className="text-sm font-black text-[#006344] text-right tabular-nums">
                    +{financeData.activePrime.toLocaleString('fr-FR')} F
                  </p>
                </div>
              )}

              {/* Opérations du mois */}
              {financeData.monthOps.map((op) => (
                <div key={op.id} className="grid grid-cols-4 gap-4 p-4 bg-slate-50/50 rounded-2xl mb-2">
                  <p className="text-sm font-bold text-slate-600">
                    {new Date(op.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit ${op.type === 'Avance' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    {op.type}
                  </span>
                  <p className="text-sm font-bold text-slate-700">{op.reason}</p>
                  <p className={`text-sm font-black text-right tabular-nums ${op.type === 'Avance' ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                    {op.type === 'Avance' ? '-' : '+'}{op.amount.toLocaleString('fr-FR')} F
                  </p>
                </div>
              ))}

              {/* État vide */}
              {financeData.monthOps.length === 0 && !financeData.isCurrentMonth && (
                <div className="py-12 text-center">
                  <Receipt size={48} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-sm font-black text-slate-400 uppercase italic">
                    Aucune opération pour ce mois
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cockpit' && (
        <div className={`grid grid-cols-1 ${isFocusMode ? '' : 'xl:grid-cols-12'} gap-8 transition-all`}>
          {/* Sidebar Missions */}
          {!isFocusMode && (
            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-lg">
                <h3 className="text-lg font-black text-[#006344] uppercase italic mb-4 flex items-center gap-2">
                  <ListTodo size={20} /> File d'attente
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar">
                  {combinedMissions
                    .filter(m => m.status !== 'Terminé' && m.status !== 'Livré S++' && m.status !== 'LIVRÉ S++')
                    .map(mission => (
                      <button
                        key={mission.id}
                        onClick={() => setActiveMissionId(mission.id)}
                        className={`w-full p-4 rounded-2xl border transition-all text-left ${activeMissionId === mission.id
                          ? 'bg-[#006344] text-white border-[#006344] shadow-lg'
                          : 'bg-slate-50 border-slate-100 hover:border-[#006344]/30 hover:shadow-md'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`text-sm font-black uppercase italic truncate ${activeMissionId === mission.id ? 'text-white' : 'text-slate-900'
                            }`}>
                            {mission.couple}
                          </h4>
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${activeMissionId === mission.id
                            ? 'bg-white/20 text-white'
                            : mission.status === 'En cours'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-200 text-slate-500'
                            }`}>
                            {mission.status}
                          </span>
                        </div>
                        <p className={`text-xs font-bold truncate ${activeMissionId === mission.id ? 'text-white/80' : 'text-slate-500'
                          }`}>
                          {mission.title}
                        </p>
                        {mission.time_spent > 0 && (
                          <p className={`text-[10px] font-black mt-2 ${activeMissionId === mission.id ? 'text-white/60' : 'text-slate-400'
                            }`}>
                            {formatTime(mission.time_spent)}
                          </p>
                        )}
                      </button>
                    ))}
                  {combinedMissions.filter(m => m.status !== 'Terminé' && m.status !== 'Livré S++' && m.status !== 'LIVRÉ S++').length === 0 && (
                    <div className="py-12 text-center">
                      <Check size={48} className="mx-auto mb-4 text-slate-200" />
                      <p className="text-sm font-black text-slate-400 uppercase italic">
                        Aucune mission en attente
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className={`${isFocusMode ? 'col-span-full' : 'xl:col-span-8'} space-y-8`}>
            <section className={`bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden transition-all ${isFocusMode ? 'max-w-4xl mx-auto py-24 border-none shadow-none bg-transparent' : ''}`}>
              {!isFocusMode && (
                <button onClick={() => setIsFocusMode(true)} className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-300 hover:text-[#006344] rounded-2xl transition-all"><Maximize2 size={24} /></button>
              )}
              {activeMission ? (
                <div className="space-y-10 animate-in zoom-in-95 duration-500">
                  {isFocusMode && (
                    <button onClick={() => setIsFocusMode(false)} className="fixed top-8 right-8 p-4 bg-white/10 backdrop-blur-md text-slate-400 hover:text-white rounded-full transition-all z-50"><Minimize2 size={32} /></button>
                  )}

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-xl transition-all ${isFocusMode ? 'bg-white/10 text-white' : 'bg-[#006344] text-[#B6C61A]'}`}><Video size={40} /></div>
                      <div>
                        <h2
                          onClick={() => handleQuickView(activeMission)}
                          className={`text-4xl font-black uppercase italic tracking-tighter leading-none hover:underline cursor-pointer ${isFocusMode ? 'text-white hover:text-[#B6C61A]' : 'text-slate-900 hover:text-[#006344]'}`}
                        >
                          {activeMission.couple}
                        </h2>
                        <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-3 italic flex items-center gap-2 ${isFocusMode ? 'text-white/60' : 'text-[#006344]'}`}><ArrowRight size={14} className={isFocusMode ? 'text-white/40' : 'text-[#B6C61A]'} /> {activeMission.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-6 py-3 rounded-2xl border font-black text-[10px] uppercase italic tracking-widest ${activeMission.status === 'Attente Validation' ? 'bg-blue-50 text-blue-600 border-blue-100' : isWorking ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {activeMission.status === 'Attente Validation' ? 'EN REVUE NARCISSE' : isWorking ? 'CHRONO ACTIF' : 'MISSION EN PAUSE'}
                      </div>
                      {!isFocusMode && (
                        <button onClick={() => setIsFocusMode(true)} className="p-3 bg-slate-50 text-slate-300 hover:text-[#006344] rounded-2xl transition-all"><Maximize2 size={24} /></button>
                      )}
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 py-10 border-y ${isFocusMode ? 'border-white/10' : 'border-slate-50'}`}>
                    <div className="space-y-4">
                      <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic ${isFocusMode ? 'text-white/40' : 'text-slate-400'}`}><Clock size={14} /> Temps total investi</p>
                      <h4 className={`text-7xl font-black italic tracking-tighter tabular-nums ${isWorking ? (isFocusMode ? 'text-white' : 'text-[#006344]') : 'text-slate-300'}`}>{formatTime(elapsedSeconds)}</h4>
                    </div>
                    <div className="space-y-4">
                      <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic ${isFocusMode ? 'text-white/40' : 'text-slate-400'}`}><Target size={14} /> Jours Industriels (Base 9h)</p>
                      <div className="flex items-baseline gap-3">
                        <h4 className={`text-7xl font-black italic tracking-tighter ${isOverTime(elapsedSeconds) ? 'text-red-500 animate-bounce' : (isFocusMode ? 'text-white' : 'text-slate-900')}`}>{industrialDays(elapsedSeconds)}</h4>
                        <span className="text-xl font-black text-slate-200 uppercase">/ 3.0 J</span>
                      </div>
                    </div>
                  </div>

                  {activeMission.status !== 'Attente Validation' && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => {
                          if (isWorking) {
                            saveCurrentTime(elapsedSeconds);
                          }
                          setIsWorking(!isWorking);
                        }}
                        className={`flex-[2] py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 ${isWorking ? 'bg-orange-600 text-white' : (isFocusMode ? 'bg-white text-[#006344]' : 'bg-[#006344] text-[#B6C61A]')}`}
                      >
                        {isWorking ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        {isWorking ? 'METTRE EN PAUSE' : 'LANCER LA SESSION'}
                      </button>
                      <button
                        onClick={() => {
                          if (isWorking) {
                            saveCurrentTime(elapsedSeconds);
                            setIsWorking(false);
                          }
                          handleUpdateStatus(activeMission, 'Attente Validation');
                        }}
                        className="flex-1 py-8 bg-[#B6C61A] text-[#006344] rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all"
                      >
                        <CloudUpload size={20} /> ENVOYER À NARCISSE
                      </button>
                    </div>
                  )}

                  <div className="pt-10 space-y-6">
                    <div className="flex items-center gap-4 px-4">
                      <AlertOctagon size={24} className="text-red-500" />
                      <h4 className={`text-xl font-black uppercase italic ${isFocusMode ? 'text-white' : 'text-slate-900'}`}>SIGNALER UN INCIDENT TECHNIQUE</h4>
                    </div>

                    <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
                      <div className="flex flex-wrap gap-3">
                        {[
                          { id: 'Cadrage', icon: Film, label: 'Cadrage' },
                          { id: 'Montage', icon: Scissors, label: 'Montage' },
                          { id: 'Rush', icon: History, label: 'Rush' },
                          { id: 'Son', icon: Mic2, label: 'Audio/Son' }
                        ].map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setReportCategory(cat.id as any)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic flex items-center gap-3 transition-all border relative ${reportCategory === cat.id ? 'bg-[#006344] text-white border-[#006344] shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                          >
                            <cat.icon size={14} />
                            {cat.label}
                            {(reportCounts as any)[cat.id] > 0 && (
                              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                                {(reportCounts as any)[cat.id]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <textarea
                          value={reportText}
                          onChange={e => setReportText(e.target.value)}
                          placeholder={`Détaillez le problème de ${reportCategory.toUpperCase()}...`}
                          className="w-full h-32 px-8 py-6 rounded-[2rem] bg-white border border-slate-100 text-sm font-medium italic outline-none focus:ring-4 focus:ring-[#006344]/5 transition-all resize-none pr-16"
                        />
                        <button
                          onClick={handleSendReport}
                          disabled={!reportText.trim() || isSyncing}
                          className="absolute right-4 bottom-4 w-12 h-12 bg-[#B6C61A] text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
                        >
                          {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-200/50">
                        <div className="flex items-center justify-between px-4">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                            Historique {reportCategory.toUpperCase()} ({filteredReports.length})
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {filteredReports.length > 0 ? filteredReports.map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:shadow-md transition-all animate-in fade-in slide-in-from-left-2">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${report.status === 'Resolved' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                  {report.status === 'Resolved' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black uppercase text-[#006344]">{report.category}</span>
                                    <span className="text-[8px] font-bold text-slate-300">{new Date(report.date).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-600 mt-1 italic line-clamp-1">{report.message}</p>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase italic ${report.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                                {report.status === 'Resolved' ? 'FIXÉ' : 'EN ATTENTE'}
                              </span>
                            </div>
                          )) : (
                            <div className="py-10 text-center opacity-30 italic">
                              <SearchCheck size={32} className="mx-auto mb-2 text-slate-300" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Aucun incident de {reportCategory} signalé</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200"><Check size={48} /></div>
                  <h3 className="text-2xl font-black text-slate-400 uppercase italic tracking-tighter">Flux de production à l'arrêt</h3>
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest max-w-xs mx-auto italic">Sélectionnez une unité dans votre file d'attente pour activer le cockpit.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {isFocusMode && <div className="fixed inset-0 bg-slate-950 z-[-1] animate-in fade-in duration-1000"></div>}
      <ProjectQuickView isOpen={!!quickViewProject} onClose={() => setQuickViewProject(null)} project={quickViewProject} />
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={visaCanvasRef} className="hidden" />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } } .animate-scan { animation: scan 3s infinite linear; height: 4px; background: #B6C61A; box-shadow: 0 0 20px #B6C61A; position: absolute; width: 100%; left: 0; z-index: 10; opacity: 0.8; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }` }} />
    </div>
  );
};

export default EmployeeSpace;
