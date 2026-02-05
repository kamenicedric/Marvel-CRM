
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, projectsService, teamService } from '../../lib/supabase';
import { WeddingProject, TeamMember } from '../../types';
import { FORMULA_WORKFLOWS } from '../../types/taskPlanning';
import ProjectQuickView from '../shared/ProjectQuickView.tsx';
import { 
  Activity, Zap, Search, 
  Loader2, CheckCircle2, Clock, 
  ShieldCheck, Calendar, ChevronLeft, ChevronRight,
  Disc, GripVertical, RotateCcw, Play, Layers,
  Trash2, Coins, AlertTriangle, Eye, EyeOff,
  Trophy, Medal, Star, Flame, Award, BookOpen,
  ArrowRight, Inbox, AlertCircle, Timer, MousePointer2,
  CalendarDays,
  ChevronLeftCircle,
  ChevronRightCircle,
  PanelLeftClose,
  PanelLeftOpen,
  GripHorizontal,
  Ban,
  Bell
} from 'lucide-react';

interface DvdNotif {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
}

interface DvdAdminSpaceProps {
  member: TeamMember | null;
  onNotificationTrigger?: number;
  onNotificationSummaryChange?: (summary: { unreadCount: number }) => void;
}

const MAX_WEEKLY_CAPACITY = 3; // Limite de projets par semaine par monteur

const DVD_VISUAL_CONFIG: Record<string, { color: string, textColor: string, light: string }> = {
  // Experts DVD
  'ALEX': { color: 'bg-blue-600', textColor: 'text-white', light: 'bg-blue-50' }, 
  'BRUCE': { color: 'bg-indigo-600', textColor: 'text-white', light: 'bg-indigo-50' },  
  'CÉLINE': { color: 'bg-purple-600', textColor: 'text-white', light: 'bg-purple-50' },
  'DILANE': { color: 'bg-emerald-600', textColor: 'text-white', light: 'bg-emerald-50' },
  'RAPHAËL': { color: 'bg-slate-700', textColor: 'text-white', light: 'bg-slate-50' },
  // Experts Teaser (Renforts)
  'DANIEL': { color: 'bg-amber-500', textColor: 'text-white', light: 'bg-amber-50' }, 
  'SACHA': { color: 'bg-fuchsia-600', textColor: 'text-white', light: 'bg-fuchsia-50' },  
  'LUC': { color: 'bg-cyan-600', textColor: 'text-white', light: 'bg-cyan-50' },
  'OSCAR': { color: 'bg-teal-600', textColor: 'text-white', light: 'bg-teal-50' },
};

const DvdAdminSpace: React.FC<DvdAdminSpaceProps> = ({ member, onNotificationTrigger, onNotificationSummaryChange }) => {
  const [activeTab, setActiveTab] = useState<'pilotage' | 'matrice' | 'performance'>('matrice');
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [viewDate, setViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isPipelineCollapsed, setIsPipelineCollapsed] = useState(false);
  const [quickViewProject, setQuickViewProject] = useState<WeddingProject | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<DvdNotif[]>([]);

  const safeFormatDate = (dateStr: any) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'TBD' : date.toLocaleDateString('fr-FR');
  };

  const fetchData = useCallback(async () => {
    try {
      const [allProjects, allTeam] = await Promise.all([ projectsService.getAll(), teamService.getAll() ]);
      const mappedProjects = (allProjects as any[]).map(p => ({
        id: p.id,
        couple: p.couple,
        weddingDate: p.wedding_date || p.weddingDate,
        country: p.country,
        amount: Number(p.amount) || 0,
        progress: p.progress || 0,
        delayDays: p.delay_days || 0,
        isLegacy: !!p.is_legacy,
        requiresSync: !!p.requires_sync,
        formula: p.formula,
        packageType: p.package_type || p.packageType,
        packageDetail: p.package_detail,
        options: p.selected_options || [],
        clientNotes: p.client_notes,
        clientFeedbacks: p.client_feedbacks || [],
        status: p.status,
        poleDVD: p.pole_dvd || p.poleDVD || { currentStep: 0, assignedTo: 'Non assigné', status: 'pending' },
        poleFilm: p.pole_film || { currentStep: 0, assignedTo: '', status: 'pending' },
        polePhoto: p.pole_photo || { currentStep: 0, assignedTo: '', status: 'pending' },
        poleCom: p.pole_com || { currentStep: 0, assignedTo: '', status: 'pending' },
        createdAt: p.created_at,
        updatedAt: p.updated_at || new Date().toISOString()
      }));
      setProjects(mappedProjects);
      
      const dvdExpertNames = ['ALEX', 'BRUCE', 'CÉLINE', 'DILANE', 'RAPHAËL'];
      const teaserSupportNames = ['DANIEL', 'LUC', 'OSCAR', 'SACHA'];
      
      const dvdExperts = allTeam.filter(m => dvdExpertNames.includes(m.full_name.trim().split(' ')[0].toUpperCase()));
      const teaserExperts = allTeam.filter(m => teaserSupportNames.includes(m.full_name.trim().split(' ')[0].toUpperCase()));
      
      setTeam([...dvdExperts, ...teaserExperts]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const now = new Date();
    const list: DvdNotif[] = [];
    projects.forEach(p => {
      if (p.status === 'Archivé' || p.status === 'Livré') return;
      const planned = p.poleDVD?.planned_date ? new Date(p.poleDVD.planned_date) : null;
      if (planned && planned < now) {
        list.push({
          id: `dvd-overdue-${p.id}`,
          title: 'DVD / Teaser en retard',
          message: `${p.couple} — prévu le ${planned.toLocaleDateString('fr-FR')}`,
          date: planned,
          read: false
        });
      }
    });
    setNotifications(list);
  }, [projects]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  useEffect(() => {
    if (onNotificationSummaryChange) onNotificationSummaryChange({ unreadCount });
  }, [unreadCount, onNotificationSummaryChange]);

  useEffect(() => {
    if (onNotificationTrigger === undefined) return;
    setShowNotifications(prev => !prev);
  }, [onNotificationTrigger]);

  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleShiftMonth = async (projectId: string, delta: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    setSyncing(true);
    try {
      const current = project.poleDVD?.planned_date ? new Date(project.poleDVD.planned_date) : new Date(project.weddingDate);
      const newDate = new Date(current);
      newDate.setMonth(newDate.getMonth() + delta);
      const dateStr = newDate.toISOString().split('T')[0];
      
      await projectsService.update(projectId, { 
        pole_dvd: { ...project.poleDVD, planned_date: dateStr } 
      });
      await fetchData();
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleSetStatus = async (projectId: string, newStatus: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    setSyncing(true);
    try {
      await projectsService.update(projectId, { 
        pole_dvd: { ...project.poleDVD, status: newStatus } 
      });
      await fetchData();
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ projectId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Logique pour compter les projets par monteur et par semaine
  const countProjectsForEditorInWeek = (editorName: string, weekIdx: number) => {
    const targetEditor = editorName.trim().split(' ')[0].toUpperCase();
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const startOfView = new Date(currentYear, currentMonth, 1);
    const endOfView = new Date(currentYear, currentMonth + 1, 0);

    return projects.filter(p => {
      // Filtrer par monteur
      if (p.poleDVD?.assignedTo?.toUpperCase() !== targetEditor) return false;
      
      const plannedDate = p.poleDVD?.planned_date ? new Date(p.poleDVD.planned_date) : new Date(p.weddingDate);
      
      // Filtrer par mois courant
      if (plannedDate < startOfView || plannedDate > endOfView) return false;
      
      // Filtrer par semaine
      const day = plannedDate.getDate();
      const pWeek = day > 28 ? 4 : Math.min(Math.floor((day - 1) / 7), 3);
      
      return pWeek === weekIdx && p.status !== 'Archivé';
    }).length;
  };

  const handleDrop = async (e: React.DragEvent, monteurFullName: string, weekIdx: number) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    
    try {
      const { projectId } = JSON.parse(rawData);
      
      // VÉRIFICATION DE CAPACITÉ AVANT DÉPLACEMENT
      const currentLoad = countProjectsForEditorInWeek(monteurFullName, weekIdx);
      if (currentLoad >= MAX_WEEKLY_CAPACITY) {
        alert(`⚠️ SEMAINE PLEINE POUR ${monteurFullName.split(' ')[0].toUpperCase()} !\nCapacité maximale atteinte (${MAX_WEEKLY_CAPACITY} projets).`);
        return;
      }

      setSyncing(true);
      
      const dayMap = [4, 11, 18, 25, 28]; 
      const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayMap[weekIdx]);
      
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const monteurName = monteurFullName.trim().split(' ')[0];
      const updatedPoleDvd = { 
        ...project.poleDVD, 
        assignedTo: monteurName, 
        status: project.poleDVD?.status === 'completed' ? 'completed' : 'in_progress',
        planned_date: newDate.toISOString().split('T')[0] 
      };
      
      await projectsService.update(projectId, { pole_dvd: updatedPoleDvd });
      await fetchData();
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSyncing(false); 
    }
  };

  const currentMonthProjectCount = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    return projects.filter(p => {
      const d = p.poleDVD?.planned_date ? new Date(p.poleDVD.planned_date) : new Date(p.weddingDate);
      return d.getMonth() === m && d.getFullYear() === y && p.status !== 'Archivé';
    }).length;
  }, [projects, viewDate]);

  const todoPool = useMemo(() => {
    return projects
      .filter(p => {
        const isNotAssigned = !p.poleDVD?.planned_date || !p.poleDVD?.assignedTo || p.poleDVD?.assignedTo === 'Non assigné';
        const notFinished = p.poleDVD?.status !== 'completed' && p.status !== 'Archivé';
        const matchSearch = p.couple.toLowerCase().includes(matrixSearch.toLowerCase());
        return notFinished && isNotAssigned && matchSearch;
      })
      .sort((a, b) => new Date(a.weddingDate).getTime() - new Date(b.weddingDate).getTime());
  }, [projects, matrixSearch]);

  const projectUnits = useMemo(() => {
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const startOfView = new Date(currentYear, currentMonth, 1);
    const endOfView = new Date(currentYear, currentMonth + 1, 0);

    return projects
      .filter(p => p.status !== 'Archivé')
      .map((p) => {
        const plannedDate = p.poleDVD?.planned_date ? new Date(p.poleDVD.planned_date) : new Date(p.weddingDate);
        return { ...p, assignedTo: p.poleDVD?.assignedTo, plannedDate };
      })
      .filter(p => {
        const isCurrentMonth = p.plannedDate >= startOfView && p.plannedDate <= endOfView;
        const isPastUnfinished = p.plannedDate < startOfView && p.poleDVD?.status !== 'completed';
        const matchesDate = (showOverdue && isPastUnfinished) || isCurrentMonth;
        const matchesSearch = p.couple.toLowerCase().includes(matrixSearch.toLowerCase());
        const isAssigned = p.poleDVD?.assignedTo && p.poleDVD.assignedTo !== 'Non assigné';
        return matchesDate && matchesSearch && isAssigned;
      });
  }, [projects, viewDate, matrixSearch, showOverdue]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /><p className="mt-4 font-black uppercase text-blue-600 italic">Alignement des spécialités DVD...</p></div>;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-24 text-slate-900">
      {showNotifications && (
        <div className="fixed top-20 right-4 z-50 w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-sm font-black text-[#006344] uppercase italic">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-black text-[#006344] hover:underline">Tout marquer comme lu</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-black text-slate-400 uppercase italic">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`w-full p-4 border-b border-slate-50 ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notif.read ? 'bg-[#006344]' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black uppercase ${!notif.read ? 'text-[#006344]' : 'text-slate-600'}`}>{notif.title}</p>
                      <p className="text-sm font-medium text-slate-700 italic truncate">{notif.message}</p>
                      <span className="text-[9px] font-bold text-slate-400">{notif.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: 'Efficacité DVD', val: '94%', icon: Activity, color: 'bg-blue-600 text-white' },
           { label: 'Pipeline Alpha', val: todoPool.length, icon: Layers, color: 'bg-white' },
           { label: 'Dossiers Livrés', val: projects.filter(p => p.poleDVD?.status === 'completed').length, icon: CheckCircle2, color: 'bg-white' },
           { label: 'Standard Sync', val: 'V4.2', icon: ShieldCheck, color: 'bg-white' }
         ].map((k, i) => (
            <div key={i} className={`${k.color} p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4`}>
               <div className={`p-2 rounded-xl ${k.color.includes('white') ? 'bg-blue-50 text-blue-600' : 'bg-white/10 text-blue-200'}`}><k.icon size={20} /></div>
               <div><p className={`text-[8px] font-black uppercase tracking-widest ${k.color.includes('white') ? 'text-slate-400' : 'text-white/40'}`}>{k.label}</p><h3 className="text-xl font-black italic">{k.val}</h3></div>
            </div>
         ))}
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-inner overflow-x-auto no-scrollbar">
          {['Gouvernance', 'Matrice Industrielle', 'Performance'].map((label, idx) => {
            const ids = ['pilotage', 'matrice', 'performance'];
            const id = ids[idx];
            return (
              <button key={id} onClick={() => setActiveTab(id as any)} className={`flex-1 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic whitespace-nowrap ${activeTab === id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
            );
          })}
      </div>

      {activeTab === 'matrice' && (
        <div className="flex flex-col xl:flex-row gap-6 animate-in slide-in-from-right-4 items-start relative">
           
           <div 
             className={`bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[850px] transition-all duration-500 ease-in-out relative shrink-0 ${isPipelineCollapsed ? 'w-20' : 'w-full xl:w-80'}`}
           >
              <button 
                onClick={() => setIsPipelineCollapsed(!isPipelineCollapsed)}
                className="absolute top-6 -right-1 z-50 bg-white border border-slate-100 shadow-md p-2 rounded-full text-blue-600 hover:scale-110 transition-transform active:scale-95"
                title={isPipelineCollapsed ? "Ouvrir le pipeline" : "Réduire le pipeline"}
              >
                {isPipelineCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>

              <div className={`p-6 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0 transition-opacity duration-300 ${isPipelineCollapsed ? 'flex-col gap-4' : 'flex-row'}`}>
                 <div className={isPipelineCollapsed ? 'rotate-90 origin-center whitespace-nowrap my-8' : ''}>
                    <h3 className="text-xs font-black uppercase italic tracking-widest text-blue-800">Pipeline Alpha</h3>
                    {!isPipelineCollapsed && <p className="text-[8px] font-black text-blue-400 uppercase mt-1">Dossiers à sequencer</p>}
                 </div>
                 <span className={`bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-md transition-all ${isPipelineCollapsed ? 'scale-125' : ''}`}>
                    {todoPool.length}
                 </span>
              </div>

              <div className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50/30 transition-opacity duration-300 ${isPipelineCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                 {todoPool.map(p => (
                   <div 
                    key={p.id} 
                    draggable 
                    onDragStart={e => handleDragStart(e, p.id)} 
                    className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden active:scale-95"
                   >
                      <div className="flex justify-between items-start mb-2"><span className="text-[7px] font-black text-blue-400 uppercase tracking-widest">{p.packageType || 'PACK'}</span><ArrowRight size={12} className="text-blue-200 group-hover:text-blue-500 transition-colors" /></div>
                      <h4 
                        onClick={() => setQuickViewProject(p)}
                        className="text-[11px] font-black text-slate-900 uppercase italic leading-tight mb-4 hover:text-blue-600 hover:underline cursor-pointer"
                      >
                        {p.couple}
                      </h4>
                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 border-t border-slate-50 pt-3"><span className="flex items-center gap-1"><Calendar size={10}/> {safeFormatDate(p.weddingDate)}</span></div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="flex-1 w-full flex flex-col gap-6">
              <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full md:w-auto">
                    <button onClick={handlePrevMonth} className="p-2 bg-white hover:bg-slate-100 rounded-xl transition-all border border-slate-200"><ChevronLeft size={20} /></button>
                    <div className="flex flex-col items-center min-w-[150px]">
                      <h3 className="text-[10px] font-black uppercase italic tracking-widest text-blue-600">
                        ({currentMonthProjectCount}) {viewDate.toLocaleString('fr-FR', {month:'long', year:'numeric'}).toUpperCase()}
                      </h3>
                      <button onClick={() => setShowOverdue(!showOverdue)} className={`text-[7px] font-black uppercase mt-1 px-2 py-0.5 rounded-full ${showOverdue ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>{showOverdue ? 'Masquer Retards' : 'Voir Retards'}</button>
                    </div>
                    <button onClick={handleNextMonth} className="p-2 bg-white hover:bg-slate-100 rounded-xl transition-all border border-slate-200"><ChevronRight size={20} /></button>
                 </div>
                 <div className="relative flex-1 w-full max-sm"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="RECHERCHER DANS LA MATRICE..." value={matrixSearch} onChange={(e) => setMatrixSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest italic outline-none focus:ring-4 focus:ring-blue-100" /></div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl overflow-x-auto no-scrollbar relative min-h-[600px]">
                 {syncing && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center"><div className="bg-blue-600 text-white px-8 py-4 rounded-full font-black text-xs italic flex items-center gap-4 shadow-2xl animate-bounce"><Loader2 className="animate-spin" size={16} /> SYNC...</div></div>}
                 <table className="w-full border-collapse table-fixed">
                    <thead>
                       <tr>
                          <th className="p-6 bg-blue-800 text-white font-black italic uppercase text-[10px] text-left w-32 border-b-4 border-blue-900">SÉQUENCE</th>
                          {team.map(m => {
                            const firstName = m.full_name.trim().split(' ')[0].toUpperCase();
                            const isTeaserSupport = ['DANIEL', 'LUC', 'OSCAR', 'SACHA'].includes(firstName);
                            const cfg = DVD_VISUAL_CONFIG[firstName] || { color: 'bg-slate-500', textColor: 'text-white' };
                            
                            return (
                              <th key={m.id} className={`p-6 border-b-4 border-slate-200 text-center ${cfg.color} ${cfg.textColor} w-72`}>
                                 <p className="font-black italic uppercase text-xs leading-none">{m.full_name}</p>
                                 <span className="text-[7px] font-black uppercase tracking-widest opacity-60 italic mt-1 block">
                                   {isTeaserSupport ? 'Expert Teaser (Support DVD)' : 'Expert DVD / Album'}
                                 </span>
                              </th>
                            );
                          })}
                       </tr>
                    </thead>
                    <tbody>
                       {["SEMAINE 1", "SEMAINE 2", "SEMAINE 3", "SEMAINE 4", "PROJET EN PRIME"].map((week, wIdx) => {
                         const isPrimeRow = wIdx === 4;
                         return (
                           <tr key={week} className={`group h-40 ${isPrimeRow ? 'bg-amber-50/10' : ''}`}>
                             <td className={`p-6 border border-slate-100 font-black italic uppercase text-[9px] align-top transition-colors ${isPrimeRow ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                {isPrimeRow ? (
                                  <div className="flex flex-col gap-2 items-start">
                                     <Coins size={16} className="text-amber-500 animate-bounce" />
                                     <span>PROJET EN PRIME</span>
                                  </div>
                                ) : week}
                             </td>
                             {team.map(m => {
                                 const firstName = m.full_name.trim().split(' ')[0].toUpperCase();
                                 const assignedProjects = projectUnits.filter(p => {
                                   if (p.assignedTo?.toUpperCase() !== firstName) return false;
                                   const day = p.plannedDate.getDate();
                                   const weekOfTask = day > 28 ? 4 : Math.min(Math.floor((day - 1) / 7), 3);
                                   return weekOfTask === wIdx;
                                 });
                                 
                                 const weeklyLoad = assignedProjects.length;
                                 const isFull = weeklyLoad >= MAX_WEEKLY_CAPACITY;

                                 return (
                                   <td 
                                    key={m.id} 
                                    onDragOver={e => { 
                                      e.preventDefault(); 
                                      if (!isFull) e.currentTarget.classList.add(isPrimeRow ? 'bg-amber-100/50' : 'bg-blue-50/50'); 
                                      else e.currentTarget.classList.add('bg-red-50/50');
                                    }} 
                                    onDragLeave={e => { 
                                      e.currentTarget.classList.remove(isPrimeRow ? 'bg-amber-100/50' : 'bg-blue-50/50', 'bg-red-50/50'); 
                                    }}
                                    onDrop={e => { 
                                      e.currentTarget.classList.remove(isPrimeRow ? 'bg-amber-100/50' : 'bg-blue-50/50', 'bg-red-50/50'); 
                                      handleDrop(e, m.full_name, wIdx); 
                                    }} 
                                    className={`p-4 border border-slate-100 align-top transition-all min-w-[200px] ${isPrimeRow ? 'bg-amber-50/5' : ''} relative`}
                                   >
                                     <div className="absolute top-2 right-2 flex items-center gap-1 opacity-50">
                                        <span className={`text-[8px] font-black ${isFull ? 'text-red-500' : 'text-slate-300'}`}>{weeklyLoad}/{MAX_WEEKLY_CAPACITY}</span>
                                        {isFull && <Ban size={10} className="text-red-500"/>}
                                     </div>

                                     <div className="space-y-4 pt-4">
                                         {assignedProjects.map((p) => {
                                           const currentStatus = p.poleDVD?.status || 'pending';
                                           const plannedDateStr = p.poleDVD?.planned_date || p.weddingDate;
                                           
                                           // Calcul du retard : Si pas terminé et date prévue < aujourd'hui (minuit)
                                           const isLate = currentStatus !== 'completed' && new Date(plannedDateStr) < new Date(new Date().setHours(0,0,0,0));

                                           return (
                                             <div 
                                               key={p.id} 
                                               draggable
                                               onDragStart={e => handleDragStart(e, p.id)}
                                               className={`p-5 bg-white border-2 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group/item relative overflow-hidden cursor-grab active:cursor-grabbing 
                                                 ${currentStatus === 'completed' ? 'border-emerald-100' : 
                                                   isLate ? 'border-red-500 ring-4 ring-red-500/10' : 
                                                   isPrimeRow ? 'border-amber-200' : 'border-blue-100'}`}
                                             >
                                                <div className={`absolute top-0 left-0 w-full h-1.5 
                                                  ${currentStatus === 'completed' ? 'bg-emerald-500' : 
                                                    isLate ? 'bg-red-500' : 
                                                    isPrimeRow ? 'bg-amber-500' : 
                                                    currentStatus === 'in_progress' ? 'bg-blue-600' : 'bg-slate-200'}`} 
                                                />
                                                
                                                {isLate && (
                                                  <div className="absolute top-3 right-4 z-10 bg-red-100 text-red-600 p-1.5 rounded-full animate-pulse">
                                                    <AlertTriangle size={14} />
                                                  </div>
                                                )}

                                                <div className="flex justify-between items-start mb-2 pr-6">
                                                  <p className={`text-[7px] font-black uppercase ${isLate ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {p.packageType || 'CLASSIQUE'}
                                                  </p>
                                                  {!isLate && <GripHorizontal size={14} className="text-slate-100 group-hover:text-blue-200 transition-colors" />}
                                                </div>
                                                <h4 
                                                  onClick={() => setQuickViewProject(p)}
                                                  className={`text-[11px] font-black uppercase italic mb-4 leading-tight hover:text-blue-600 hover:underline cursor-pointer ${currentStatus === 'completed' ? 'text-slate-400' : 'text-slate-900'}`}
                                                >
                                                  {p.couple}
                                                </h4>
                                                
                                                <div className="flex gap-1.5 mb-4">
                                                   {[
                                                     { key: 'pending', label: 'TODO', active: 'bg-slate-900 text-white' }, 
                                                     { key: 'in_progress', label: 'RUN', active: 'bg-blue-600 text-white' }, 
                                                     { key: 'completed', label: 'OK', active: 'bg-emerald-600 text-white' }
                                                   ].map(st => (
                                                     <button 
                                                        key={st.key} 
                                                        onClick={(e) => { e.stopPropagation(); handleSetStatus(p.id, st.key); }}
                                                        className={`flex-1 py-1.5 rounded-lg text-[7px] font-black uppercase text-center transition-all hover:scale-105 active:scale-95 ${currentStatus === st.key ? st.active : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                                                     >
                                                       {st.label}
                                                     </button>
                                                   ))}
                                                </div>

                                                <div className="flex items-center justify-between text-[7px] font-black text-slate-400 border-t border-slate-50 pt-3">
                                                   <div className="flex items-center gap-1">
                                                     <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleShiftMonth(p.id, -1); }}
                                                        className="p-1 hover:text-blue-600 transition-colors"
                                                     >
                                                        <ChevronLeftCircle size={14} />
                                                     </button>
                                                     
                                                     <span className={`flex items-center gap-1 mx-1 ${isLate ? 'text-red-600' : ''}`}>
                                                        <Clock size={9} className={currentStatus === 'completed' ? 'text-emerald-400' : isLate ? 'text-red-500' : 'text-blue-400'}/> 
                                                        {safeFormatDate(plannedDateStr)}
                                                     </span>

                                                     <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleShiftMonth(p.id, 1); }}
                                                        className="p-1 hover:text-blue-600 transition-colors"
                                                     >
                                                        <ChevronRightCircle size={14} />
                                                     </button>
                                                   </div>
                                                   {currentStatus === 'completed' && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                </div>
                                             </div>
                                           );
                                         })}
                                     </div>
                                   </td>
                                 );
                             })}
                           </tr>
                         );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* QUICK VIEW MODAL */}
      <ProjectQuickView 
        isOpen={!!quickViewProject} 
        onClose={() => setQuickViewProject(null)} 
        project={quickViewProject} 
      />
    </div>
  );
};

export default DvdAdminSpace;
