
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Info, Workflow, AlertTriangle, Globe, 
  Calendar, Users, Target, User, Trash2, 
  Archive, Save, CheckCircle2, ListChecks,
  Clock, PackageCheck, Timer, AlertCircle, Check, ChevronRight,
  Box, UserPlus, UserCheck, Loader2, FastForward, Heart, Map, MapPin, FileText, Package,
  MessageSquare, CalendarDays, Layers, BookOpen, ChevronDown, Sparkles, Camera
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WeddingProject, ProductionTask, TeamMember } from '../../types';
import { FORMULA_WORKFLOWS, generateTasksForProject } from '../../types/taskPlanning';
import { teamService, tasksService, projectsService } from '../../lib/supabase';

interface EditProjectModalProps {
  isOpen: boolean;
  project: WeddingProject | null;
  onClose: () => void;
  onSave: (project: WeddingProject) => Promise<void> | void;
  onArchive: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

const ALL_WORKFLOWS = [
  { id: 'f1', name: '📦 workflow : Photo + Film long + Album + Teaser', delivery: 80 },
  { id: 'f2', name: '📦 workflow : Photo + Film long + Album', delivery: 80 },
  { id: 'f3', name: '📦 workflow : Photo + Film long + Teaser', delivery: 80 },
  { id: 'f4', name: '📦 workflow : Photo + Film long', delivery: 80 },
  { id: 'f5', name: '📦 workflow : Film long + Teaser', delivery: 72 },
  { id: 'f6', name: '📦 workflow : Photo + Album', delivery: 70 },
  { id: 'f7', name: '📦 workflow : Photo classiques uniquement', delivery: 70 },
  { id: 'f8', name: '📦 workflow : Film long uniquement', delivery: 72 },
];

const WEDDING_OPTIONS = [
  "photo encadrée", "diffusion Jour-J", "préwedding", "magazine box", 
  "photobooth", "videoboth", "backdrop géant", "phone box", 
  "save the date", "shooting en studio", "drone", "manequin femme", 
  "peignoir", "lunettes", "machine a bulles", "parapluie", 
  "verre a champagne", "Tréteaux d'accueil", "canne"
];

const CLIENT_FORMULAS = ['Mini', 'Simple', 'Classique', 'Complète', 'Rêve'];

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
  onArchive,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'workflow' | 'danger'>('workflow');
  const [formData, setFormData] = useState<Partial<WeddingProject>>({});
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProductionTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingTasks, setSyncingTasks] = useState<Record<string, boolean>>({});
  const [showCamera, setShowCamera] = useState(false);
  const [isUploadingVisa, setIsUploadingVisa] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const fetchData = async () => {
    if (!project) return;
    try {
      const [teamData, tasksData] = await Promise.all([
        teamService.getAll(),
        tasksService.getAll()
      ]);
      setTeam(teamData.filter(m => m.status === 'Actif'));
      setProjectTasks(tasksData.filter(t => t.project_id === project.id));
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
  };

  useEffect(() => {
    if (project && isOpen) {
      setFormData({ 
        ...project, 
        options: project.options || [] 
      });
      fetchData();
    }
  }, [project, isOpen]);

  const totalOverdue = useMemo(() => {
    if (!project) return 0;
    const now = new Date();
    const weddingDate = new Date(formData.weddingDate || project.weddingDate);
    const formula = formData.formula || project.formula || "📦 workflow : Photo + Film long";
    const workflowSteps = (FORMULA_WORKFLOWS[formula] || FORMULA_WORKFLOWS["📦 workflow : Photo + Film long"]) as any[];
    let count = 0;

    workflowSteps.forEach(step => {
      const realTask = projectTasks.find(t => 
        t.title.toLowerCase().trim() === step.title.toLowerCase().trim() && 
        t.pole === step.pole
      );
      const isCompleted = realTask?.status === 'Terminé';
      if (!isCompleted) {
        const dl = new Date(weddingDate);
        dl.setDate(weddingDate.getDate() + step.day);
        if (dl < now) count++;
      }
    });
    return count;
  }, [formData, project, projectTasks]);

  const toggleOption = (option: string) => {
    setFormData(prev => {
      const currentOptions = prev.options || [];
      return {
        ...prev,
        options: currentOptions.includes(option) 
          ? currentOptions.filter(o => o !== option) 
          : [...currentOptions, option]
      };
    });
  };

  const getOrCreateTask = async (title: string, pole: string, stepNumber: number) => {
    if (!project) return null;
    let task = projectTasks.find(t => 
      t.title.toLowerCase().trim() === title.toLowerCase().trim() && t.pole === pole
    );
    if (!task) {
      const templates = generateTasksForProject(project);
      const template = templates.find(t => t.title?.toLowerCase().trim() === title.toLowerCase().trim() && t.pole === pole);
      const newTaskData = template || {
        title, pole: pole as any, project_id: project.id,
        status: 'A faire', priority: 'Medium', archived: false
      };
      const created = await tasksService.create(newTaskData);
      setProjectTasks(prev => [...prev, created]);
      return created;
    }
    return task;
  };

  const handleToggleStep = async (poleKey: string, stepTitle: string, stepNumber: number, poleDbName: string) => {
    if (!project) return;
    const syncKey = `${poleDbName}-${stepNumber}`;
    setSyncingTasks(prev => ({ ...prev, [syncKey]: true }));
    try {
      const task = await getOrCreateTask(stepTitle, poleDbName, stepNumber);
      if (!task) return;
      const isFinishing = task.status !== 'Terminé';
      const newStatus = isFinishing ? 'Terminé' : 'A faire';
      await tasksService.update(task.id, { status: newStatus });
      setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      const dbKey = poleKey === 'poleDVD' ? 'pole_dvd' : poleKey === 'poleFilm' ? 'pole_film' : poleKey === 'polePhoto' ? 'pole_photo' : 'pole_com';
      const currentPoleData = (formData as any)[poleKey] || { currentStep: 0, assignedTo: '', status: 'pending' };
      if (isFinishing && currentPoleData.currentStep < stepNumber) {
        const nextStepData = { ...currentPoleData, currentStep: stepNumber, status: 'in_progress' };
        await projectsService.update(project.id, { [dbKey]: nextStepData });
        setFormData(prev => ({ ...prev, [poleKey]: nextStepData }));
      }
    } finally {
      setSyncingTasks(prev => ({ ...prev, [syncKey]: false }));
    }
  };

  const handleAssignTask = async (stepTitle: string, poleDbName: string, stepNumber: number, memberName: string) => {
    if (!project) return;
    const syncKey = `assign-${poleDbName}-${stepNumber}`;
    setSyncingTasks(prev => ({ ...prev, [syncKey]: true }));
    try {
      const task = await getOrCreateTask(stepTitle, poleDbName, stepNumber);
      if (!task) return;
      await tasksService.update(task.id, { assigned_to: memberName });
      setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigned_to: memberName } : t));
    } finally {
      setSyncingTasks(prev => ({ ...prev, [syncKey]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!project || !formData.couple) return;
    setIsSubmitting(true);
    try {
      await onSave({
        ...project,
        ...formData,
        updatedAt: new Date().toISOString(),
      } as WeddingProject);
      onClose();
    } catch (err: any) {
      alert(
        "Erreur lors de la synchronisation du dossier: " +
          (err?.message || String(err)),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !project) return null;

  const formulaName = formData.formula || project.formula || "📦 workflow : Photo + Film long";
  const hasAlbumInWorkflow = formulaName.toLowerCase().includes('album');

  // Fonction pour démarrer la caméra
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert("Accès caméra requis pour la capture du visa.");
      setShowCamera(false);
    }
  };

  // Fonction pour capturer la photo du visa
  const captureVisa = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      
      setIsUploadingVisa(true);
      try {
        const fileName = `visa_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
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
        
        setFormData(prev => ({ ...prev, visaPhotoUrl: data.publicUrl }));
        
        // Arrêter la caméra
        const stream = videoRef.current?.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
        setShowCamera(false);
      } catch (error: any) {
        alert('Erreur lors de l\'enregistrement du visa: ' + error.message);
      } finally {
        setIsUploadingVisa(false);
      }
    }, 'image/jpeg', 0.9);
  };

  // Nettoyer la caméra lors de la fermeture
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const poleConfigs = [
    { id: 'polePhoto', db: 'PHOTO', label: 'PÔLE PHOTO', icon: '📸' },
    { id: 'poleFilm', db: 'FILM', label: 'PÔLE FILM', icon: '🎥' },
    { id: 'poleDVD', db: 'DVD', label: 'PÔLE ALBUM', icon: '💿' },
    { id: 'poleCom', db: 'COM', label: 'PÔLE COM', icon: '📱' }
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden text-slate-900">
      <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-2xl" onClick={onClose}></div>
      <div className="relative bg-white w-full h-full lg:w-[98vw] lg:h-[96vh] lg:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10">
        
        <div className="bg-white px-8 lg:px-12 py-6 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#006344] rounded-[2rem] flex items-center justify-center text-[#B6C61A] font-black italic text-2xl shadow-xl">
              {formData.couple ? formData.couple[0] : project.couple[0]}
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                {formData.couple || project.couple}
                {totalOverdue > 0 && <span className="ml-4 text-red-600 animate-pulse font-black text-xl italic">({totalOverdue} RETARDS)</span>}
              </h2>
              <p className="text-[10px] font-black text-[#006344] uppercase tracking-widest mt-1.5 italic">{formulaName}</p>
            </div>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner text-slate-900">
             <button onClick={() => setActiveTab('workflow')} className={`px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'workflow' ? 'bg-[#006344] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Production</button>
             <button onClick={() => setActiveTab('info')} className={`px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-[#006344] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Infos</button>
          </div>
          <button onClick={onClose} className="hidden lg:block p-3 hover:bg-slate-50 rounded-full transition-colors text-slate-300"><X size={36} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-12 bg-[#F8FAFC] no-scrollbar">
          {activeTab === 'workflow' && (
            <div className="space-y-16 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-20">
               {poleConfigs.map(pole => {
                 const workflowSteps = (FORMULA_WORKFLOWS[formulaName] || FORMULA_WORKFLOWS["📦 workflow : Photo + Film long"]) as any[];
                 const stepsTemplate = workflowSteps.filter(s => s.pole === pole.db);
                 if (stepsTemplate.length === 0) return null;
                 
                 const projectPoleTasks = projectTasks.filter(t => t.pole === pole.db);
                 const completedTasksCount = projectPoleTasks.filter(t => t.status === 'Terminé').length;
                 const progress = Math.round((completedTasksCount / stepsTemplate.length) * 100) || 0;
                 
                 return (
                   <div key={pole.id} className="space-y-8">
                      <div className="flex items-center gap-6 px-4">
                         <span className="text-4xl lg:text-6xl">{pole.icon}</span>
                         <h4 className="text-xl lg:text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{pole.label}</h4>
                         <span className="text-[10px] font-black text-[#006344] italic uppercase">{progress}% EFFECTUÉ</span>
                      </div>
                      <div className="flex gap-6 lg:gap-8 overflow-x-auto pb-8 px-4 no-scrollbar snap-x">
                         {stepsTemplate.map((step, idx) => {
                            const stepNumber = idx + 1;
                            const realTask = projectTasks.find(t => 
                              t.title.toLowerCase().trim() === step.title.toLowerCase().trim() && 
                              t.pole === pole.db
                            );
                            const isCompleted = realTask?.status === 'Terminé';
                            const assignedName = realTask?.assigned_to || '';
                            const isSyncing = syncingTasks[`${pole.db}-${stepNumber}`] || syncingTasks[`assign-${pole.db}-${stepNumber}`];
                            
                            const deadlineDate = new Date(formData.weddingDate || project.weddingDate);
                            deadlineDate.setDate(deadlineDate.getDate() + step.day);
                            const isLate = !isCompleted && deadlineDate < new Date();

                            return (
                               <div key={idx} className="snap-center">
                                  <div className={`relative flex flex-col items-start p-6 lg:p-10 rounded-[3rem] border h-[240px] lg:h-[400px] w-[280px] lg:w-[420px] shrink-0 gap-4 lg:gap-6 group hover:shadow-xl transition-all ${isCompleted ? 'bg-[#B6C61A]/5 border-[#B6C61A]/30 text-[#006344]' : (isLate ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100 text-slate-400')} ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}>
                                      
                                      {isLate && (
                                        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-bounce shadow-lg z-10">
                                          <AlertTriangle size={12} /> RETARD CRITIQUE
                                        </div>
                                      )}

                                      <div className="absolute top-8 right-8">
                                        {isCompleted ? (
                                          <button onClick={() => handleToggleStep(pole.id, step.title, stepNumber, pole.db)} className="w-10 h-10 bg-[#B6C61A] text-[#006344] rounded-full flex items-center justify-center border-2 border-white hover:scale-110 transition-transform">
                                            {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Check size={20} strokeWidth={4} />}
                                          </button>
                                        ) : (
                                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${isLate ? 'bg-red-100 border-red-300 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                             {isSyncing ? <Loader2 className="animate-spin" size={16} /> : (isLate ? <AlertTriangle size={16} /> : null)}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <span className={`text-sm lg:text-2xl font-black italic ${isCompleted ? 'text-[#B6C61A]' : (isLate ? 'text-red-300' : 'text-slate-200')}`}>{stepNumber.toString().padStart(2, '0')}</span>
                                      
                                      <div className="flex-1 w-full">
                                        <h5 className={`text-base lg:text-2xl font-black uppercase tracking-tight leading-tight italic line-clamp-2 ${isCompleted ? 'text-[#006344]' : (isLate ? 'text-red-700' : 'text-slate-700')}`}>
                                          {step.title}
                                        </h5>
                                      </div>

                                      {!isCompleted && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleToggleStep(pole.id, step.title, stepNumber, pole.db); }} 
                                          className={`w-full py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all ${isLate ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#B6C61A] text-[#006344]'}`}
                                        >
                                          {isSyncing ? <Loader2 className="animate-spin" size={16} /> : (isLate ? 'RÉSOUDRE RETARD' : 'VALIDER UNITÉ')}
                                        </button>
                                      )}

                                      <div className="w-full space-y-4 text-slate-900">
                                         <div className="relative w-full">
                                            <UserCheck size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${assignedName ? 'text-white' : 'text-slate-300'}`} />
                                            <select 
                                              value={assignedName}
                                              onChange={(e) => handleAssignTask(step.title, pole.db, stepNumber, e.target.value)}
                                              className={`w-full pl-12 pr-10 py-4 rounded-3xl border transition-all appearance-none outline-none font-black text-[10px] uppercase tracking-widest cursor-pointer ${assignedName ? 'bg-[#006344] text-white border-[#006344]' : 'bg-slate-50 border-slate-100 text-slate-400 focus:ring-4 focus:ring-[#B6C61A]/10'}`}
                                            >
                                              <option value="">NON ASSIGNÉ</option>
                                              {team.map(m => (
                                                <option key={m.id} value={m.full_name}>{m.full_name.toUpperCase()}</option>
                                              ))}
                                            </select>
                                            <ChevronDown size={14} className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none ${assignedName ? 'text-white' : 'text-slate-300'}`} />
                                         </div>
                                         <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border text-center transition-all ${isLate ? 'bg-red-600 border-red-700 text-white animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                            DLC: {deadlineDate.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'})} {isLate && ' (EXPIRÉ)'}
                                         </div>
                                      </div>
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </div>
                 );
               })}
            </div>
          )}
          
          {activeTab === 'info' && (
            <div className="max-w-[1400px] mx-auto space-y-12 animate-in slide-in-from-right-4 duration-500 pb-20">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8 text-slate-900">
                    <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[11px] flex items-center gap-3 italic border-b border-slate-50 pb-4"><Heart size={20} className="text-[#B6C61A]" /> Identité & Dates</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Nom du Couple</label>
                        <input type="text" value={formData.couple || ''} onChange={e => setFormData({...formData, couple: e.target.value})} className="w-full px-8 py-5 rounded-[1.8rem] bg-slate-50 border-2 border-transparent focus:border-[#006344]/20 font-black uppercase italic transition-all text-lg outline-none text-[#006344]" />
                      </div>
                      {/* Capture de Visa */}
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Capture Visa</label>
                        {formData.visaPhotoUrl || project.visaPhotoUrl ? (
                          <div className="relative">
                            <img src={formData.visaPhotoUrl || project.visaPhotoUrl} alt="Visa" className="w-full h-48 object-cover rounded-2xl border-2 border-[#B6C61A]" />
                            <button 
                              onClick={() => setFormData({...formData, visaPhotoUrl: ''})}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={startCamera}
                            className="w-full py-6 rounded-2xl bg-[#006344] text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#005233] transition-colors"
                          >
                            <Camera size={20} /> Capturer le Visa
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Date Religieux</label>
                          <input type="date" value={formData.weddingDate || ''} onChange={e => setFormData({...formData, weddingDate: e.target.value})} className="w-full px-6 py-5 rounded-[1.8rem] bg-slate-50 border-none font-black text-[#006344] outline-none appearance-none" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Nombre d'Invités</label>
                          <input type="number" value={formData.guestCount || 0} onChange={e => setFormData({...formData, guestCount: parseInt(e.target.value)})} className="w-full px-6 py-5 rounded-[1.8rem] bg-slate-50 border-none font-black text-[#006344] outline-none" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <input type="checkbox" id="sameDayCheck" checked={formData.sameDay} onChange={e => setFormData({...formData, sameDay: e.target.checked})} className="w-5 h-5 rounded-lg accent-[#006344] cursor-pointer" />
                        <label htmlFor="sameDayCheck" className="text-xs font-black text-slate-600 uppercase tracking-tight italic cursor-pointer">Mairie le même jour ?</label>
                      </div>
                      {!formData.sameDay && (
                        <div className="animate-in slide-in-from-top-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Date Mairie</label>
                          <input type="date" value={formData.cityHallDate || ''} onChange={e => setFormData({...formData, cityHallDate: e.target.value})} className="w-full px-6 py-5 rounded-[1.8rem] bg-slate-50 border-none font-black text-[#006344] outline-none appearance-none" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8 text-slate-900">
                    <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[11px] flex items-center gap-3 italic border-b border-slate-50 pb-4"><Map size={20} className="text-[#B6C61A]" /> Origines & Dote</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Origine Mariée</label><input type="text" value={formData.brideOrigin || ''} onChange={e => setFormData({...formData, brideOrigin: e.target.value})} className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase outline-none" /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Origine Marié</label><input type="text" value={formData.groomOrigin || ''} onChange={e => setFormData({...formData, groomOrigin: e.target.value})} className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase outline-none" /></div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-5 bg-[#B6C61A]/10 rounded-2xl border border-[#B6C61A]/20">
                        <input type="checkbox" id="hasDowry" checked={formData.hasDowry} onChange={e => setFormData({...formData, hasDowry: e.target.checked})} className="w-5 h-5 rounded-lg accent-[#006344] cursor-pointer" />
                        <label htmlFor="hasDowry" className="text-xs font-black text-[#006344] uppercase tracking-tight italic cursor-pointer">Prestation Dote incluse ?</label>
                      </div>
                      {formData.hasDowry && (
                        <div className="animate-in slide-in-from-top-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Date de la Dote</label>
                          <input type="date" value={formData.dowryDate || ''} onChange={e => setFormData({...formData, dowryDate: e.target.value})} className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-none font-black text-[#006344] outline-none" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8 text-slate-900 lg:col-span-2">
                    <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[11px] flex items-center gap-3 italic border-b border-slate-50 pb-4"><Package size={20} className="text-[#B6C61A]" /> Formule Industrielle</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Pays</label><select value={formData.country || 'Cameroun'} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] outline-none"><option>Cameroun</option><option>France</option><option>Autre</option></select></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Priorité</label><select value={formData.priority || 'low'} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] outline-none"><option value="low">Normale</option><option value="medium">Élevée</option><option value="high">Urgente</option></select></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Gamme Client</label><select value={formData.packageType || 'Classique'} onChange={e => setFormData({...formData, packageType: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase italic outline-none">{CLIENT_FORMULAS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Workflow Sélectionné</label>
                        <select value={formData.packageDetail || 'f3'} onChange={e => {
                          const w = ALL_WORKFLOWS.find(x => x.id === e.target.value);
                          setFormData({...formData, packageDetail: e.target.value, formula: w?.name, deliveryTime: w?.delivery});
                        }} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase italic outline-none">{ALL_WORKFLOWS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                      </div>
                      {hasAlbumInWorkflow && (
                        <div className="animate-in slide-in-from-left-4">
                          <label className="text-[9px] font-black text-[#B6C61A] uppercase ml-4 mb-2 block tracking-widest italic">Fabricant Album</label>
                          <select value={formData.albumTeaser || ''} onChange={e => setFormData({...formData, albumTeaser: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-900 border-none font-black text-[#B6C61A] uppercase italic outline-none"><option value="">CHOISIR...</option><option value="Vistaprint">VISTAPRINT</option><option value="ZNO">ZNO (LUXE)</option></select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NOUVELLE SECTION : OPTIONS & ACCESSOIRES (ÉDITION) */}
                  <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8 text-slate-900 lg:col-span-2">
                    <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[11px] flex items-center gap-3 italic border-b border-slate-50 pb-4"><Sparkles size={20} className="text-[#B6C61A]" /> Options & Accessoires</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {WEDDING_OPTIONS.map(opt => {
                        const isSelected = (formData.options || []).includes(opt);
                        return (
                          <button 
                            key={opt}
                            onClick={() => toggleOption(opt)}
                            className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase italic transition-all border text-left flex items-center gap-3 ${
                              isSelected 
                                ? 'bg-[#006344] text-[#B6C61A] border-[#006344] shadow-xl scale-[1.03]' 
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#B6C61A]/50'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-[#B6C61A]' : 'bg-slate-200'}`} />
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-6 text-slate-900 lg:col-span-2">
                    <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[11px] flex items-center gap-3 italic border-b border-slate-50 pb-4"><MessageSquare size={20} className="text-[#B6C61A]" /> Notes & Informations Supplémentaires</h3>
                    <textarea value={formData.clientNotes || ''} onChange={e => setFormData({...formData, clientNotes: e.target.value})} placeholder="Détails du contrat, demandes spéciales..." className="w-full h-40 px-8 py-6 rounded-[2rem] bg-slate-50 border-none font-medium text-slate-600 outline-none resize-none italic" />
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="bg-white px-8 lg:px-12 py-8 border-t border-slate-100 flex gap-6 shrink-0 z-[100] shadow-2xl">
          <button onClick={onClose} className="flex-1 py-5 bg-slate-50 text-slate-400 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">ABANDONNER</button>
          <button onClick={handleSubmit} className="flex-[3] py-5 bg-[#006344] text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-95 transition-all">
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={24} className="text-[#B6C61A]" /> SYNCHRONISER LE DOSSIER</>}
          </button>
        </div>

        {/* Modal de capture de visa */}
        {showCamera && (
          <div className="fixed inset-0 z-[10000] bg-[#006344]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white">
            <div className="text-center space-y-4 mb-6">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 justify-center">
                <Camera size={28} className="text-[#B6C61A]" /> Capture du Visa
              </h4>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">Positionnez le visa dans le cadre</p>
            </div>
            <div className="relative w-full max-w-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full rounded-3xl border-4 border-[#B6C61A] shadow-2xl"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-4 mt-8 w-full max-w-2xl">
              <button 
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  if (stream) stream.getTracks().forEach(track => track.stop());
                  setShowCamera(false);
                }} 
                className="flex-1 py-5 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/20"
              >
                Annuler
              </button>
              <button 
                onClick={captureVisa}
                disabled={isUploadingVisa}
                className="flex-1 py-5 bg-[#B6C61A] text-[#006344] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-all disabled:opacity-50"
              >
                {isUploadingVisa ? <Loader2 className="animate-spin" size={16} /> : <><Camera size={16} /> Capturer</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProjectModal;
