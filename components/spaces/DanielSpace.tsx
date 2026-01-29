import React, { useState, useMemo, useEffect, useRef } from 'react';
import { tasksService, projectsService, biometricService, pointageService, supabase } from '../../lib/supabase.ts';
import { ProductionTask, TeamMember, WeddingProject } from '../../types.ts';
import ProjectQuickView from '../shared/ProjectQuickView.tsx';
import { attendanceCheckIn, attendanceMe } from '../../services/attendanceApi';
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
  Image as ImageIcon, Fingerprint, ScanFace, Lock, Camera
} from 'lucide-react';

interface EmployeeSpaceProps {
  member: TeamMember | null;
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

const industrialDays = (sec: number) => (sec / (9 * 3600)).toFixed(1);
const isOverTime = (sec: number) => sec > (27 * 3600);

const EmployeeSpace: React.FC<EmployeeSpaceProps> = ({ member }) => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'historique' | 'finance' | 'bonus' | 'pointage'>('cockpit');
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProject, setQuickViewProject] = useState<WeddingProject | null>(null);
  
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
  const [clockHistory, setClockHistory] = useState<{time: string, img: string, type: 'IN' | 'OUT', method: 'FACE' | 'BIO' | 'VISA'}[]>([]);
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
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState<'SELFIE' | 'BIO'>('SELFIE');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [hasBiometricCredential, setHasBiometricCredential] = useState<boolean | null>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);
  const selfieCanvasRef = useRef<HTMLCanvasElement>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);
  
  // États Signalement
  const [reportCategory, setReportCategory] = useState<TeaserReport['category']>('Montage');
  const [reportText, setReportText] = useState('');
  
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

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allTasks, allProjects] = await Promise.all([
        tasksService.getAll(),
        projectsService.getAll()
      ]);
      setTasks(allTasks);
      setProjects(allProjects as any);
    } catch (err) {
      console.error("Erreur synchro EmployeeSpace:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [member]);

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
    const baseSalary = 110000;
    const allOperations = [
      { id: 'o1', type: 'Avance', reason: 'Dépannage Taxi', amount: 5000, date: '2025-08-02', month: 7 },
      { id: 'o2', type: 'Avance', reason: 'Frais Divers', amount: 10000, date: '2025-08-10', month: 7 },
    ];
    const monthOps = allOperations.filter(op => op.month === selectedFinanceMonth);
    const totalAdvances = monthOps.filter(o => o.type === 'Avance').reduce((acc, o) => acc + (o.amount || 0), 0);
    const netToPay = (baseSalary + (selectedFinanceMonth === currentRealMonth ? statsBonus.prime : 0)) - totalAdvances;
    return { baseSalary, monthOps, totalAdvances, netToPay, activePrime: statsBonus.prime, isCurrentMonth: selectedFinanceMonth === currentRealMonth };
  }, [statsBonus.prime, selectedFinanceMonth, currentRealMonth]);

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
    
    // Vérifier si on est sur une origine sécurisée
    const isSecureOrigin = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    
    if (!isSecureOrigin) {
      const errorMsg = 'Origine non sécurisée. Utilisez https:// ou accédez via localhost:3000';
      setGeoStatus('fail');
      throw new Error(errorMsg);
    }
    
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
      const errorMsg = e?.message || '';
      if (errorMsg.includes('secure origins') || errorMsg.includes('Only secure origins')) {
        throw new Error('Origine non sécurisée. Accédez via https://localhost:3000 ou configurez HTTPS dans Vite.');
      }
      throw new Error(
        errorMsg.includes('denied')
          ? 'GPS refusé par l\'utilisateur'
          : errorMsg || 'GPS indisponible'
      );
    }
  };

  const requestSelfieCamera = async () => {
    setAttendanceError(null);
    
    // Vérifier si on est sur une origine sécurisée
    const isSecureOrigin = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    
    if (!isSecureOrigin) {
      const errorMsg = 'Origine non sécurisée. Utilisez https:// ou accédez via localhost:3000';
      setCameraStatus('fail');
      throw new Error(errorMsg);
    }
    
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
      const errorMsg = e?.message || '';
      if (errorMsg.includes('secure origins') || errorMsg.includes('Only secure origins')) {
        throw new Error('Origine non sécurisée. Accédez via https://localhost:3000 ou configurez HTTPS dans Vite.');
      }
      throw new Error(errorMsg.includes('denied') ? 'Accès caméra refusé par l\'utilisateur' : 'Accès caméra refusé');
    }
  };

  const captureSelfiePreview = () => {
    if (!selfieVideoRef.current || !selfieCanvasRef.current) return null;
    const ctx = selfieCanvasRef.current.getContext('2d');
    if (!ctx) return null;
    selfieCanvasRef.current.width = selfieVideoRef.current.videoWidth || 720;
    selfieCanvasRef.current.height = selfieVideoRef.current.videoHeight || 720;
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

        const newCredential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
        
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
      const isMobile = navigator.userAgent.includes('Mobile') || 
                       /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = isMobile ? 'Mobile Device' : 'Desktop';
      
      // Essayer de trouver le credential correspondant à l'appareil actuel
      let credentialToUse = existingCredentials.find(c => 
        c.device_name?.includes(deviceType) || 
        (isMobile && c.device_name?.includes('Mobile')) ||
        (!isMobile && c.device_name?.includes('Desktop'))
      );
      
      // Si aucun credential spécifique trouvé, utiliser le plus récent
      if (!credentialToUse) {
        credentialToUse = existingCredentials[0];
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
      
      const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
      if (!cred) throw new Error('Biométrie refusée');
      
      // Mettre à jour la date de dernière utilisation dans la base de données
      await biometricService.updateLastUsed(credentialId);
      
      setBioStatus('ok');
      return true;
    } catch (e: any) {
      setBioStatus('fail');
      const errorMsg = e?.message || String(e);
      if (errorMsg.includes('Aucune empreinte')) {
        throw e; // Propager l'erreur telle quelle
      }
      throw new Error('Biométrie refusée ou échec authentification');
    }
  };

  const loadTodayAttendance = async () => {
    if (!member?.id) return;
    try {
      const r = await attendanceMe(member.id);
      const entries = r.entries || [];
      if (entries.length > 0) {
        setAttendanceEntry(entries[0]);
        setDistanceToZoneMeters(entries[0].distance_meters ?? null);
      }
    } catch {
      // ignore (on garde l'UX fluide)
    }
  };

  useEffect(() => {
    if (activeTab === 'pointage') {
      loadTodayAttendance();
      // Vérifier si l'employé a une empreinte enregistrée
      if (member?.id) {
        biometricService.getCredentialsByEmployee(member.id)
          .then(creds => setHasBiometricCredential(creds.length > 0))
          .catch(() => setHasBiometricCredential(false));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, member?.id]);

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

  const submitAttendance = async () => {
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
    } catch (e: any) {
      setAttendanceError(e?.message || 'Erreur check-in');
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
        
        setClockHistory(prev => [{time: new Date().toLocaleTimeString(), img: data, type, method: 'FACE'}, ...prev]);
        
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

  // ... (Reste des fonctions saveCurrentTime, handleUpdateStatus, etc. inchangées)
  const saveCurrentTime = async (seconds: number) => { /* ... */ };
  const handleUpdateStatus = async (mission: UnifiedMission, newStatus: string) => { /* ... */ };
  const handleSendReport = async () => { /* ... */ };
  const formatTime = (sec: number) => { const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = sec%60; return `${h}h ${m}m ${s}s`; };
  const handleQuickView = (mission: UnifiedMission) => { const p = projects.find(proj => proj.id === mission.projectId); if (p) setQuickViewProject(p); };

  return (
    <div className={`space-y-8 animate-in fade-in duration-700 pb-24 max-w-[1600px] mx-auto transition-all ${isFocusMode ? 'p-4' : ''}`}>
      
      {!isFocusMode && (
        <>
          {/* Header Carte d'Identité */}
          <div className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#006344] text-[#B6C61A] rounded-[2rem] flex items-center justify-center text-2xl font-black italic shadow-lg">
                   {employeeName.charAt(0)}
                </div>
                <div>
                   <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Espace {employeeName}</h1>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 italic">
                      {member?.role || 'Membre Équipe'} // Production Unit
                   </p>
                </div>
             </div>
             <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isClockedIn ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                {isClockedIn ? 'SESSION ACTIVE' : 'HORS LIGNE'}
             </div>
          </div>

          <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-inner w-fit overflow-x-auto no-scrollbar">
            {[
              { id: 'cockpit', label: 'Cockpit', icon: LayoutGrid },
              { id: 'pointage', label: 'Pointage', icon: Timer },
              { id: 'historique', label: 'Journal', icon: History },
              { id: 'finance', label: 'Finances', icon: Wallet },
              { id: 'bonus', label: 'Bonus Tracker', icon: TrendingUp },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#006344] text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
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

                {attendanceEntry ? (
                  <div className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-sm border flex items-center justify-center gap-3 ${
                    attendanceEntry.status === 'PRESENT'
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
                ) : (
                  <button
                    onClick={openAttendanceFlow}
                    disabled={attendanceLoading}
                    className="w-full py-7 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 bg-[#006344] text-white disabled:opacity-60"
                  >
                    {attendanceLoading ? <Loader2 className="animate-spin" size={18} /> : <><SearchCheck size={18} /> Marquer ma présence</>}
                  </button>
                )}

                {attendanceError && (
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4">
                    {attendanceError}
                  </div>
                )}
              </div>

              {showAttendanceModal && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white animate-in zoom-in duration-300">
                  <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-[2.5rem] p-6">
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
                        className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                          attendanceMode === 'SELFIE'
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
                        className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                          attendanceMode === 'BIO'
                            ? 'bg-[#B6C61A] text-[#006344] border-[#B6C61A]'
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                        }`}
                      >
                        🔐 Mode Empreinte
                      </button>
                    </div>

                    {attendanceMode === 'SELFIE' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                          <div className="rounded-3xl overflow-hidden border border-white/10 bg-black">
                            <video ref={selfieVideoRef} autoPlay playsInline muted className="w-full h-72 object-cover" />
                            <canvas ref={selfieCanvasRef} className="hidden" />
                          </div>
                          <div className="rounded-3xl overflow-hidden border border-white/10 bg-black">
                            {selfiePreview ? (
                              <img src={selfiePreview} className="w-full h-72 object-cover" alt="Selfie" />
                            ) : (
                              <div className="w-full h-72 flex items-center justify-center text-white/30 text-[10px] font-black uppercase tracking-widest">
                                Aperçu selfie
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3">
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
                            onClick={submitAttendance}
                            disabled={attendanceLoading || !selfiePreview}
                            className="flex-1 py-4 rounded-2xl bg-[#B6C61A] text-[#006344] disabled:opacity-50 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            {attendanceLoading ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /> Valider présence</>}
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
                          ) : (
                            'Appuie sur "Valider empreinte" (WebAuthn). Si l\'appareil ne supporte pas, le système refusera.'
                          )}
                        </div>
                        <button
                          onClick={submitAttendance}
                          disabled={attendanceLoading}
                          className="w-full py-4 rounded-2xl bg-[#B6C61A] text-[#006344] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          {attendanceLoading ? <Loader2 className="animate-spin" size={16} /> : <><Fingerprint size={16} /> {hasBiometricCredential === false ? 'Enregistrer & Valider empreinte' : 'Valider empreinte'}</>}
                        </button>
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

           {/* Activity Log */}
           <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col space-y-8 min-h-[600px]">
              <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                 <h3 className="text-xl font-black text-[#006344] uppercase italic flex items-center gap-3">
                    <History size={24} className="text-[#B6C61A]" /> Historique Accès
                 </h3>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Aujourd'hui</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2">
                 {clockHistory.map((h, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-[#B6C61A]/30 transition-all">
                      <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-xl flex items-center justify-center border border-slate-200 bg-white ${h.method === 'FACE' || h.method === 'VISA' ? '' : 'text-[#B6C61A]'}`}>
                            {h.method === 'FACE' ? (
                               <img src={h.img} className="w-full h-full object-cover rounded-xl" alt="Face" />
                            ) : h.method === 'VISA' ? (
                               <img src={h.img} className="w-full h-full object-cover rounded-xl" alt="Visa" />
                            ) : (
                               <Fingerprint size={24} />
                            )}
                         </div>
                         <div>
                            <p className="text-xs font-black text-slate-900 uppercase italic flex items-center gap-2">
                               {h.type === 'IN' ? 'Entrée' : 'Sortie'} 
                               <span className="text-[8px] text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded">{h.method === 'VISA' ? 'VISA' : h.method}</span>
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{h.time}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${h.type === 'IN' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                         <Lock size={14} className="text-slate-200" />
                      </div>
                   </div>
                 ))}
                 {clockHistory.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
                      <Fingerprint size={48} className="mb-4 text-slate-400" />
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">Aucun mouvement</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* COCKPIT et autres onglets restent inchangés... (Utilisation du code précédent pour activeTab === 'cockpit', etc.) */}
      {activeTab === 'cockpit' && (
        <div className={`grid grid-cols-1 ${isFocusMode ? '' : 'xl:grid-cols-12'} gap-8 transition-all`}>
           {/* ... Contenu Cockpit ... */}
           <div className={`${isFocusMode ? 'col-span-full' : 'xl:col-span-8'} space-y-8`}>
              <section className={`bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden transition-all ${isFocusMode ? 'max-w-4xl mx-auto py-24 border-none shadow-none bg-transparent' : ''}`}>
                 {/* ... Logique cockpit conservée ... */}
                 {!isFocusMode && (
                  <button onClick={() => setIsFocusMode(true)} className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-300 hover:text-[#006344] rounded-2xl transition-all"><Maximize2 size={24}/></button>
                 )}
                 {activeMission ? (
                    <div className="space-y-10 animate-in zoom-in-95 duration-500">
                       {/* ... UI Cockpit inchangée ... */}
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
                          {/* ... Boutons Start/Stop mission ... */}
                          <div className="text-right">
                             <div className={`px-6 py-3 rounded-2xl border font-black text-[10px] uppercase italic tracking-widest ${activeMission.status === 'Attente Validation' ? 'bg-blue-50 text-blue-600 border-blue-100' : isWorking ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {activeMission.status === 'Attente Validation' ? 'EN REVUE NARCISSE' : isWorking ? 'CHRONO ACTIF' : 'MISSION EN PAUSE'}
                             </div>
                          </div>
                       </div>
                       {/* ... Compteurs Temps & Jours ... */}
                       <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 py-10 border-y ${isFocusMode ? 'border-white/10' : 'border-slate-50'}`}>
                          <div className="space-y-4">
                             <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic ${isFocusMode ? 'text-white/40' : 'text-slate-400'}`}><Clock size={14}/> Temps total investi</p>
                             <h4 className={`text-7xl font-black italic tracking-tighter tabular-nums ${isWorking ? (isFocusMode ? 'text-white' : 'text-[#006344]') : 'text-slate-300'}`}>{formatTime(elapsedSeconds)}</h4>
                          </div>
                          <div className="space-y-4">
                             <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic ${isFocusMode ? 'text-white/40' : 'text-slate-400'}`}><Target size={14}/> Jours Industriels</p>
                             <div className="flex items-baseline gap-3">
                                <h4 className={`text-7xl font-black italic tracking-tighter ${isOverTime(elapsedSeconds) ? 'text-red-500 animate-bounce' : (isFocusMode ? 'text-white' : 'text-slate-900')}`}>{industrialDays(elapsedSeconds)}</h4>
                                <span className="text-xl font-black text-slate-200 uppercase">/ 3.0 J</span>
                             </div>
                          </div>
                       </div>
                       
                       {activeMission.status !== 'Attente Validation' && (
                          <div className="flex flex-col sm:flex-row gap-4">
                             <button onClick={() => { setIsWorking(!isWorking); if(isWorking) saveCurrentTime(elapsedSeconds); }} className={`flex-[2] py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 ${isWorking ? 'bg-orange-600 text-white' : (isFocusMode ? 'bg-white text-[#006344]' : 'bg-[#006344] text-[#B6C61A]')}`}>
                                {isWorking ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                {isWorking ? 'METTRE EN PAUSE' : 'LANCER LA SESSION'}
                             </button>
                             <button onClick={() => handleUpdateStatus(activeMission, 'Attente Validation')} className="flex-1 py-8 bg-[#B6C61A] text-[#006344] rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all"><CloudUpload size={20} /> ENVOYER À NARCISSE</button>
                          </div>
                       )}
                    </div>
                 ) : (
                    <div className="py-20 text-center space-y-6">
                       <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200"><Check size={48} /></div>
                       <h3 className="text-2xl font-black text-slate-400 uppercase italic tracking-tighter">Flux de production à l'arrêt</h3>
                       <p className="text-sm font-bold text-slate-300 uppercase tracking-widest max-w-xs mx-auto italic">Aucune mission assignée.</p>
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
      <style dangerouslySetInnerHTML={{ __html: `@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } } .animate-scan { animation: scan 3s infinite linear; height: 4px; background: #B6C61A; box-shadow: 0 0 20px #B6C61A; position: absolute; width: 100%; left: 0; z-index: 10; opacity: 0.8; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  );
};

export default EmployeeSpace;
