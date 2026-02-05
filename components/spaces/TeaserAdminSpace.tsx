
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase, projectsService, teamService } from '../../lib/supabase.ts';
import { WeddingProject, TeamMember } from '../../types';
import { FORMULA_WORKFLOWS } from '../../types/taskPlanning.ts';
import ProjectQuickView from '../shared/ProjectQuickView.tsx';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Activity, Zap, TrendingUp, Search, 
  Loader2, CheckCircle2, Clock, 
  ShieldCheck, Calendar, ChevronLeft, ChevronRight,
  Clapperboard, GripVertical, RotateCcw, Play, Layers,
  ShieldAlert, Video, Target, Trash2, Coins, AlertTriangle, Eye, EyeOff,
  Trophy, Medal, Star, Flame, Award, Info,
  ChevronLeftCircle,
  ChevronRightCircle,
  Bell
} from 'lucide-react';

interface TeaserNotif {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
}

interface TeaserAdminSpaceProps {
  member: TeamMember | null;
  onNotificationTrigger?: number;
  onNotificationSummaryChange?: (summary: { unreadCount: number }) => void;
}

const TEASER_VISUAL_CONFIG: Record<string, { color: string, textColor: string, light: string }> = {
  'DANIEL': { color: 'bg-amber-500', textColor: 'text-white', light: 'bg-amber-50' }, 
  'SACHA': { color: 'bg-purple-500', textColor: 'text-white', light: 'bg-purple-50' },  
  'LUC': { color: 'bg-blue-500', textColor: 'text-white', light: 'bg-blue-50' },
  'OSCAR': { color: 'bg-emerald-500', textColor: 'text-white', light: 'bg-emerald-50' },
};

const MODULE_CONFIG: Record<string, { label: string, color: string, border: string, bg: string, text: string, ring: string }> = {
  'intro': { 
    label: 'INTRO / PUB', 
    color: 'bg-blue-500', 
    border: 'border-blue-500', 
    bg: 'bg-blue-50', 
    text: 'text-blue-700',
    ring: 'ring-blue-100'
  },
  'pose': { 
    label: 'PARTIE POSÉE', 
    color: 'bg-amber-500', 
    border: 'border-amber-500', 
    bg: 'bg-amber-50', 
    text: 'text-amber-700',
    ring: 'ring-amber-100'
  },
  'soiree': { 
    label: 'PARTIE SOIRÉE', 
    color: 'bg-purple-500', 
    border: 'border-purple-500', 
    bg: 'bg-purple-50', 
    text: 'text-purple-700',
    ring: 'ring-purple-100'
  }
};

const getDefaultMonteurForModule = (moduleId: string, packageType: string = ''): string => {
  const type = (packageType || '').toLowerCase();
  switch (moduleId) {
    case 'pose': return 'Oscar';
    case 'soiree': return 'Sacha';
    case 'intro': 
      const isBasic = type.includes('mini') || type.includes('simple');
      return isBasic ? 'Luc' : 'Daniel';
    default: return 'TBD';
  }
};

const getTeaserTargetDate = (project: WeddingProject): Date => {
  if ((project as any).teaser_data?.planned_date) {
    return new Date((project as any).teaser_data.planned_date);
  }
  const weddingDateStr = (project as any).wedding_date || project.weddingDate;
  if (!weddingDateStr) return new Date();
  const weddingDate = new Date(weddingDateStr);
  const formula = project.formula || "";
  const workflow = FORMULA_WORKFLOWS[formula] || FORMULA_WORKFLOWS["📦 workflow : Photo + Film long + Teaser"];
  const teaserStep = workflow.find(s => s.pole === 'FILM' && s.title.toLowerCase().includes('teaser'));
  const offsetDays = teaserStep ? teaserStep.day : 20; 
  const targetDate = new Date(weddingDate);
  targetDate.setDate(weddingDate.getDate() + offsetDays);
  return targetDate;
};

const TeaserAdminSpace: React.FC<TeaserAdminSpaceProps> = ({ member, onNotificationTrigger, onNotificationSummaryChange }) => {
  const [activeTab, setActiveTab] = useState<'pilotage' | 'attribution' | 'equipe' | 'remuneration'>('attribution');
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [quickViewProject, setQuickViewProject] = useState<WeddingProject | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<TeaserNotif[]>([]);
  
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [matrixSearch, setMatrixSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [allProjects, allTeam] = await Promise.all([ projectsService.getAll(), teamService.getAll() ]);
      const mappedProjects = allProjects.map((p: any) => ({ 
        ...p, 
        weddingDate: p.wedding_date || p.weddingDate,
        packageType: p.package_type || p.packageType || 'Classique', 
        teaser_data: p.teaser_data || { 
          status: 'A faire', 
          modules: { intro: null, pose: null, soiree: null },
          module_status: { intro: 'A faire', pose: 'A faire', soiree: 'A faire' },
          planned_date: null, 
          evaluation: 0 
        }
      }));
      setProjects(mappedProjects);
      const names = ['DANIEL', 'LUC', 'OSCAR', 'SACHA'];
      const teaserExperts = allTeam.filter(m => {
        const firstName = m.full_name.trim().split(' ')[0].toUpperCase();
        return names.includes(firstName);
      });
      setTeam(teaserExperts);
    } catch (err) { console.error("Fetch Error:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const channel = supabase
      .channel('teaser-admin-matrix-v15')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wedding_projects' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Notifications : projets Teaser en retard (date cible dépassée, non terminés)
  useEffect(() => {
    const now = new Date();
    const list: TeaserNotif[] = [];
    projects.forEach(p => {
      const formula = p.formula || "";
      const isTeaserProject = formula.toLowerCase().includes('teaser') || !!(p as any).teaser_data;
      if (!isTeaserProject) return;
      const status = (p as any).teaser_data?.status;
      if (status === 'Terminé') return;
      const targetDate = getTeaserTargetDate(p);
      if (targetDate < now) {
        list.push({
          id: `teaser-overdue-${p.id}`,
          title: 'Teaser en retard',
          message: `${(p as any).couple || p.couple} — prévu le ${targetDate.toLocaleDateString('fr-FR')}`,
          date: targetDate,
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

  // Empêcher l'ouverture automatique du panneau au premier rendu
  const notifFirstRenderRef = useRef(true);
  useEffect(() => {
    if (onNotificationTrigger === undefined) return;
    if (notifFirstRenderRef.current) {
      notifFirstRenderRef.current = false;
      return;
    }
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
      const currentTarget = getTeaserTargetDate(project);
      const newDate = new Date(currentTarget);
      newDate.setMonth(newDate.getMonth() + delta);
      const dateStr = newDate.toISOString().split('T')[0];
      
      const currentTeaserData = project.teaser_data || { status: 'A faire', modules: { intro: null, pose: null, soiree: null } };
      const updatedTeaserData = {
        ...currentTeaserData,
        planned_date: dateStr
      };
      
      await projectsService.update(projectId, { teaser_data: updatedTeaserData });
      await fetchData();
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleUpdateModuleStatus = async (projectId: string, moduleId: string, newStatus: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    setSyncing(true);
    try {
      const currentTeaserData = project.teaser_data || { status: 'A faire', modules: { intro: null, pose: null, soiree: null } };
      const currentModuleStatus = (currentTeaserData as any).module_status || { intro: 'A faire', pose: 'A faire', soiree: 'A faire' };
      const updatedTeaserData = { 
        ...currentTeaserData, 
        module_status: { ...currentModuleStatus, [moduleId]: newStatus } 
      };

      const allDone = Object.values(updatedTeaserData.module_status).every(v => v === 'Terminé');
      const updates: any = { teaser_data: updatedTeaserData };

      if (allDone) {
        updatedTeaserData.status = 'Terminé';
        const formulaName = project.formula || "Photo + Film long";
        const steps = FORMULA_WORKFLOWS[formulaName] || [];
        const filmSteps = steps.filter(s => s.pole === 'FILM').sort((a,b) => a.day - b.day);
        const teaserIdx = filmSteps.findIndex(s => s.title.toLowerCase().includes('teaser'));
        
        if (teaserIdx !== -1) {
          const stepNumber = teaserIdx + 1;
          const currentPoleFilm = project.poleFilm || { currentStep: 0, assignedTo: '', status: 'pending' };
          if (currentPoleFilm.currentStep < stepNumber) {
            updates.pole_film = { ...currentPoleFilm, currentStep: stepNumber, status: 'in_progress' };
          }
        }
      } else if (newStatus === 'En cours') {
        updatedTeaserData.status = 'En cours';
      }

      await projectsService.update(projectId, updates);
      await fetchData();
    } catch (err) { 
      console.error("Sync Error:", err); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm("Supprimer définitivement ce projet ?")) {
      setSyncing(true);
      try {
        await projectsService.delete(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } finally { setSyncing(false); }
    }
  };

  const currentMonthProjectCount = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    return projects.filter(p => {
      const targetDate = getTeaserTargetDate(p);
      return targetDate.getMonth() === m && targetDate.getFullYear() === y;
    }).length;
  }, [projects, viewDate]);

  const taskUnits = useMemo(() => {
    const units: any[] = [];
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const startOfView = new Date(currentYear, currentMonth, 1);
    const endOfView = new Date(currentYear, currentMonth + 1, 0);

    projects.filter(p => {
      const formula = p.formula || "";
      const isTeaserProject = formula.toLowerCase().includes('teaser') || !!p.teaser_data;
      if (!isTeaserProject) return false;

      const targetDate = getTeaserTargetDate(p);
      const isPastUnfinished = targetDate < startOfView && p.teaser_data?.status !== 'Terminé';
      const isCurrentMonth = targetDate >= startOfView && targetDate <= endOfView;
      
      const matchesDate = (showOverdue && isPastUnfinished) || isCurrentMonth;
      const matchesSearch = p.couple.toLowerCase().includes(matrixSearch.toLowerCase());
      
      return matchesDate && matchesSearch;
    }).forEach(p => {
      const targetDate = getTeaserTargetDate(p);
      ['intro', 'pose', 'soiree'].forEach(modId => {
        const monteur = p.teaser_data?.modules?.[modId] || getDefaultMonteurForModule(modId, p.packageType);
        units.push({
          projectId: p.id,
          project: p,
          couple: p.couple,
          packageType: p.packageType || 'Classique',
          moduleId: modId,
          monteur,
          status: (p.teaser_data as any)?.module_status?.[modId] || 'A faire',
          targetDate,
          plannedDate: p.teaser_data?.planned_date,
          isSpillover: targetDate < startOfView
        });
      });
    });
    return units;
  }, [projects, viewDate, matrixSearch, showOverdue]);

  const visibleTeamColumns = useMemo(() => {
    const names = ['DANIEL', 'LUC', 'OSCAR', 'SACHA'];
    return team.filter(m => {
      const firstName = m.full_name.trim().split(' ')[0].toUpperCase();
      return names.includes(firstName);
    }).sort((a, b) => {
      const nameA = a.full_name.trim().split(' ')[0].toUpperCase();
      const nameB = b.full_name.trim().split(' ')[0].toUpperCase();
      return names.indexOf(nameA) - names.indexOf(nameB);
    });
  }, [team]);

  const handleDragStart = (e: React.DragEvent, projectId: string, moduleId: string) => {
    const data = JSON.stringify({ projectId, moduleId });
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, monteurFullName: string, weekIdx: number) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    try {
      const { projectId, moduleId } = JSON.parse(rawData);
      setSyncing(true);
      const dayMap = [4, 11, 18, 25, 28]; 
      const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayMap[weekIdx]);
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      const monteurName = monteurFullName.trim().split(' ')[0];
      const currentTeaserData = project.teaser_data || { modules: {}, module_status: {} };
      const updatedTeaserData = {
        ...currentTeaserData,
        planned_date: newDate.toISOString().split('T')[0],
        modules: { ...currentTeaserData.modules, [moduleId]: monteurName }
      };
      await projectsService.update(projectId, { teaser_data: updatedTeaserData });
      await fetchData();
    } catch (err) { console.error(err); } finally { setSyncing(false); }
  };

  const statsGouvernance = useMemo(() => {
    const terminés = projects.filter(p => p.teaser_data?.status === 'Terminé').length;
    const total = projects.length;
    return { txSuccès: total > 0 ? Math.round((terminés / total) * 100) : 0, total, terminés };
  }, [projects]);

  const rankingData = useMemo(() => {
    return visibleTeamColumns.map(m => {
      const firstName = m.full_name.trim().split(' ')[0].toUpperCase();
      const completed = taskUnits.filter(t => t.monteur.toUpperCase().trim().split(' ')[0] === firstName && t.status === 'Terminé').length;
      const assigned = taskUnits.filter(t => t.monteur.toUpperCase().trim().split(' ')[0] === firstName).length;
      const yieldScore = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      return {
        id: m.id,
        name: m.full_name,
        firstName,
        completed,
        assigned,
        yield: yieldScore,
        streak: completed > 5 ? 12 : 4, // Mock streak logic
        points: completed * 10 + yieldScore
      };
    }).sort((a, b) => b.points - a.points);
  }, [visibleTeamColumns, taskUnits]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#006344]" size={40} /><p className="mt-4 font-black uppercase text-[#006344] italic">Alignement des spécialités Teaser...</p></div>;

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
      {/* KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: 'Efficacité Flux', val: `${statsGouvernance.txSuccès}%`, icon: Activity, color: 'bg-[#006344] text-white' },
           { label: 'Projets Actifs', val: statsGouvernance.total, icon: Clapperboard, color: 'bg-white' },
           { label: 'Unités Libérées', val: statsGouvernance.terminés * 3, icon: Zap, color: 'bg-white' },
           { label: 'Status Matrix', val: 'STRICT_SYNC_V4', icon: ShieldCheck, color: 'bg-white' }
         ].map((k, i) => (
            <div key={i} className={`${k.color} p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4`}>
               <div className={`p-2 rounded-xl ${k.color.includes('white') ? 'bg-slate-50 text-[#006344]' : 'bg-white/10 text-[#B6C61A]'}`}>
                 <k.icon size={20} />
               </div>
               <div>
                  <p className={`text-[8px] font-black uppercase tracking-widest ${k.color.includes('white') ? 'text-slate-400' : 'text-white/40'}`}>{k.label}</p>
                  <h3 className="text-xl font-black italic">{k.val}</h3>
               </div>
            </div>
         ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-inner overflow-x-auto no-scrollbar text-slate-900">
          {['Gouvernance', 'Matrice Industrielle', 'Performance', 'Primes'].map((label, idx) => {
            const ids = ['pilotage', 'attribution', 'equipe', 'remuneration'];
            const id = ids[idx];
            return (
              <button key={id} onClick={() => setActiveTab(id as any)} className={`flex-1 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic whitespace-nowrap ${activeTab === id ? 'bg-[#006344] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
            );
          })}
      </div>

      {activeTab === 'pilotage' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Projets Teaser actifs</p>
              <p className="text-3xl font-black italic text-[#006344]">{statsGouvernance.total}</p>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Teasers terminés</p>
              <p className="text-3xl font-black italic text-emerald-600">{statsGouvernance.terminés}</p>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Taux de succès</p>
              <p className="text-3xl font-black italic text-[#B6C61A]">{statsGouvernance.txSuccès}%</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#006344] mb-4 flex items-center gap-2">
              <Bell size={16} /> Dossiers critiques (notifications)
            </h3>
            {notifications.length === 0 ? (
              <div className="text-slate-400 text-sm font-black uppercase italic text-center py-8">
                Aucun retard détecté sur les teasers.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
                      n.read ? 'bg-slate-50 border-slate-100' : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {n.title}
                      </span>
                      <span className="font-medium text-slate-700">{n.message}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">
                      {n.date.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attribution' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           {/* Navigation Controls */}
           <div className="bg-white p-4 lg:p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full xl:w-auto relative z-[110]">
                    <button 
                      type="button" 
                      onClick={handlePrevMonth} 
                      className="p-3 bg-white hover:bg-slate-100 hover:shadow-md rounded-xl transition-all text-slate-600 active:scale-90 border border-slate-200"
                    >
                      <ChevronLeft size={24} strokeWidth={3} />
                    </button>
                    <div className="flex flex-col items-center min-w-[200px]">
                      <h3 className="text-xs font-black uppercase italic tracking-widest text-[#006344] flex items-center gap-3 justify-center select-none">
                         <Calendar size={18} className="text-[#B6C61A]"/> 
                         ({currentMonthProjectCount}) {viewDate.toLocaleString('fr-FR', {month:'long', year:'numeric'}).toUpperCase()}
                      </h3>
                      <button 
                        onClick={() => setShowOverdue(!showOverdue)}
                        className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all ${showOverdue ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                      >
                        {showOverdue ? <Eye size={10}/> : <EyeOff size={10}/>}
                        {showOverdue ? 'Masquer Retards' : 'Voir Retards'}
                      </button>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleNextMonth} 
                      className="p-3 bg-white hover:bg-slate-100 hover:shadow-md rounded-xl transition-all text-slate-600 active:scale-90 border border-slate-200"
                    >
                      <ChevronRight size={24} strokeWidth={3} />
                    </button>
                 </div>
                 <div className="flex-1 text-center hidden xl:block">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 italic">Lien Manaja Sync : ACTIF</p>
                    <p className="text-[10px] font-black text-[#006344] uppercase italic">
                      Affichage : <span className="text-[#B6C61A]">{showOverdue ? 'Tous les Dossiers Critiques' : 'Mois Sélectionné Uniquement'}</span>
                    </p>
                 </div>
                 <div className="relative flex-1 w-full max-w-md group">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#B6C61A] transition-colors" />
                    <input type="text" placeholder="RECHERCHER UN COUPLE..." value={matrixSearch} onChange={(e) => setMatrixSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest italic outline-none focus:ring-4 focus:ring-[#B6C61A]/10 transition-all" />
                 </div>
              </div>
           </div>

           {/* Grid Matrix */}
           <div className="bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl overflow-x-auto no-scrollbar relative min-h-[600px]">
              {syncing && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center"><div className="bg-[#006344] text-white px-8 py-4 rounded-full font-black text-xs italic flex items-center gap-4 shadow-2xl animate-bounce"><Loader2 className="animate-spin" size={16} /> SYNC...</div></div>}
              {taskUnits.length === 0 && !syncing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
                    <Clapperboard size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-300 uppercase italic">Aucun Teaser détecté</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Pour {viewDate.toLocaleString('fr-FR', {month:'long', year:'numeric'})}</p>
                  </div>
                </div>
              )}
              <table className="w-full border-collapse">
                 <thead>
                    <tr>
                       <th className="p-8 bg-[#BD3B1B] text-white font-black italic uppercase text-[11px] text-left min-w-[180px] border-b-4 border-red-800">SÉQUENCE</th>
                       {visibleTeamColumns.map(m => {
                         const firstName = m.full_name.trim().split(' ')[0].toUpperCase();
                         const cfg = TEASER_VISUAL_CONFIG[firstName] || { color: 'bg-slate-500', textColor: 'text-white' };
                         const label = firstName === 'DANIEL' ? 'EXPERT INTRO (LUXE)' : firstName === 'LUC' ? 'EXPERT INTRO (MINI)' : firstName === 'OSCAR' ? 'EXPERT POSÉ' : 'EXPERT SOIRÉE';
                         const finishedUnits = taskUnits.filter(t => t.monteur.toUpperCase().trim().split(' ')[0] === firstName && t.status === 'Terminé').length;
                         return (
                           <th key={m.id} className={`p-8 border-b-4 border-slate-200 min-w-[340px] text-center ${cfg.color} ${cfg.textColor}`}>
                              <p className="font-black italic uppercase text-sm leading-none">{m.full_name}</p>
                              <div className="flex items-center justify-center gap-2 mt-2">
                                <span className="text-[8px] font-black uppercase tracking-widest opacity-60 italic">{label}</span>
                                <span className={`px-2 py-0.5 rounded bg-white/20 text-[8px] font-black`}>{finishedUnits}/8</span>
                              </div>
                           </th>
                         );
                       })}
                    </tr>
                 </thead>
                 <tbody>
                    {["SEMAINE 1", "SEMAINE 2", "SEMAINE 3", "SEMAINE 4", "SEMAINE 5 - PRIME"].map((week, wIdx) => {
                      const isPrimeRow = wIdx === 4;
                      return (
                        <tr key={week} className={`h-auto group ${isPrimeRow ? 'bg-[#B6C61A]/5' : ''}`}>
                          <td className={`p-8 border border-slate-100 font-black italic uppercase text-[10px] align-top transition-colors ${isPrimeRow ? 'bg-gradient-to-br from-[#B6C61A] to-[#006344] text-white' : 'bg-slate-50 text-slate-400'}`}>
                            {isPrimeRow ? (
                              <div className="flex flex-col gap-2">
                                <Coins size={20} className="text-white animate-bounce" />
                                <span>ZONE PRIME</span>
                                <span className="text-[7px] opacity-70 normal-case italic">Quota Dépassé (+5k)</span>
                              </div>
                            ) : week}
                          </td>
                          {visibleTeamColumns.map(m => {
                              const firstName = m.full_name.trim().split(' ')[0].toUpperCase();
                              const assignedUnits = taskUnits.filter(t => {
                                const tMonteur = t.monteur.toUpperCase().trim().split(' ')[0];
                                if (tMonteur !== firstName) return false;
                                const day = t.plannedDate ? new Date(t.plannedDate).getDate() : t.targetDate.getDate();
                                const weekOfTask = day > 28 ? 4 : Math.min(Math.floor((day - 1) / 7), 3);
                                return weekOfTask === wIdx;
                              });

                              return (
                                <td 
                                  key={m.id} 
                                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(isPrimeRow ? 'bg-[#B6C61A]/20' : 'bg-emerald-50/50'); }} 
                                  onDragLeave={(e) => { e.currentTarget.classList.remove(isPrimeRow ? 'bg-[#B6C61A]/20' : 'bg-emerald-50/50'); }} 
                                  onDrop={(e) => { e.currentTarget.classList.remove(isPrimeRow ? 'bg-[#B6C61A]/20' : 'bg-emerald-50/50'); handleDrop(e, m.full_name, wIdx); }} 
                                  className={`p-5 border border-slate-100 align-top transition-all relative min-h-[300px] ${isPrimeRow ? 'bg-[#B6C61A]/5' : ''}`}
                                >
                                  <div className="space-y-6">
                                      {assignedUnits.map((t, idx) => {
                                        const cfg = MODULE_CONFIG[t.moduleId] || MODULE_CONFIG.intro;
                                        return (
                                          <div 
                                            key={`${t.projectId}-${t.moduleId}-${idx}`} 
                                            draggable 
                                            onDragStart={(e) => handleDragStart(e, t.projectId, t.moduleId)}
                                            className={`p-6 bg-white border-2 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all group/card relative overflow-hidden cursor-grab active:cursor-grabbing ${t.status === 'Terminé' ? 'opacity-50 grayscale' : ''} ${isPrimeRow ? 'border-[#B6C61A] shadow-lg scale-[0.98]' : (t.isSpillover && t.status !== 'Terminé' ? 'border-red-400 ring-4 ring-red-50' : cfg.border)} ${cfg.ring} hover:ring-8`}
                                          >
                                            <div className={`absolute top-0 left-0 w-full h-1.5 ${isPrimeRow ? 'bg-gradient-to-r from-[#B6C61A] to-[#006344]' : cfg.color}`} />
                                            {isPrimeRow && (
                                                <div className="absolute top-0 right-0 px-3 py-1 bg-[#B6C61A] text-[#006344] text-[7px] font-black uppercase italic rounded-bl-xl shadow-sm z-10">PRIME +5K</div>
                                            )}
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteProject(t.projectId); }} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors bg-white/80 rounded-lg shadow-sm"><Trash2 size={12} /></button>
                                                <div className="text-slate-200 group-hover/card:text-[#B6C61A] transition-colors"><GripVertical size={16} /></div>
                                            </div>
                                            <div className="mb-2">
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{t.packageType}</p>
                                                <h4 
                                                  onClick={(e) => { e.stopPropagation(); setQuickViewProject(t.project); }}
                                                  className="text-[11px] font-black text-slate-900 uppercase italic leading-tight hover:text-[#006344] hover:underline cursor-pointer"
                                                >
                                                  {t.couple}
                                                </h4>
                                            </div>
                                            <div className={`inline-block px-3 py-1 rounded-full ${cfg.bg} ${cfg.text} border border-current text-[8px] font-black uppercase tracking-widest italic mb-5`}>{cfg.label}</div>
                                            <div className="flex gap-1 mb-5">
                                                {[{ label: 'RUN', val: 'En cours', color: 'bg-blue-50 text-blue-600', icon: Play }, { label: 'OK', val: 'Terminé', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 }, { label: 'WAIT', val: 'Reporté', color: 'bg-amber-50 text-amber-600', icon: RotateCcw }].map((s) => (
                                                  <button key={s.val} type="button" onClick={(e) => { e.stopPropagation(); handleUpdateModuleStatus(t.projectId, t.moduleId, s.val); }} className={`flex-1 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-tighter flex flex-col items-center gap-1 transition-all ${t.status === s.val ? s.color + ' ring-2 ring-current shadow-md' : 'bg-slate-50 text-slate-300'}`}><s.icon size={10} /> {s.label}</button>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-4">
                                                <div className="flex items-center gap-1.5">
                                                  <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleShiftMonth(t.projectId, -1); }}
                                                    className="p-1 hover:text-blue-600 transition-colors"
                                                  >
                                                    <ChevronLeftCircle size={14} />
                                                  </button>
                                                  
                                                  <span className={`flex items-center gap-1.5 ${t.isSpillover ? 'text-red-500 font-black' : 'text-slate-600'}`}>
                                                    <Clock size={12} className={t.isSpillover ? 'text-red-500' : 'text-[#B6C61A]'}/> 
                                                    {t.targetDate.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'})}
                                                  </span>

                                                  <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleShiftMonth(t.projectId, 1); }}
                                                    className="p-1 hover:text-blue-600 transition-colors"
                                                  >
                                                    <ChevronRightCircle size={14} />
                                                  </button>
                                                </div>
                                                {t.status === 'Terminé' && <CheckCircle2 size={14} className="text-emerald-500" />}
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
      )}

      {activeTab === 'equipe' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {rankingData.map((r, idx) => (
              <div
                key={r.id}
                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Rang #{idx + 1}
                    </p>
                    <p className="text-sm font-black italic text-slate-900">
                      {r.name}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    {idx === 0 ? <Trophy className="text-yellow-500" size={20} /> : idx === 1 ? <Medal className="text-slate-400" size={20} /> : <Star className="text-amber-400" size={20} />}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{r.completed} unités OK</span>
                  <span>{r.assigned} assignées</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#006344]"
                    style={{ width: `${Math.min(100, r.yield)}%` }}
                  />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#006344]">
                  Rendement {r.yield}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'remuneration' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#006344] mb-4 flex items-center gap-2">
              <Coins size={16} /> Simulation des primes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="py-3 pr-4">Monteur</th>
                    <th className="py-3 pr-4 text-right">Unités OK</th>
                    <th className="py-3 pr-4 text-right">Rendement</th>
                    <th className="py-3 pr-4 text-right">Points</th>
                    <th className="py-3 pl-4 text-right">Prime estimée</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData.map((r) => {
                    const basePrime = 10000;
                    const bonus = Math.max(0, r.completed - 8) * 5000;
                    const yieldBonus = r.yield >= 100 ? 5000 : r.yield >= 80 ? 2500 : 0;
                    const totalPrime = basePrime + bonus + yieldBonus;
                    return (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="py-3 pr-4 font-bold text-slate-700">{r.name}</td>
                        <td className="py-3 pr-4 text-right font-mono">{r.completed}</td>
                        <td className="py-3 pr-4 text-right font-mono">{r.yield}%</td>
                        <td className="py-3 pr-4 text-right font-mono">{r.points}</td>
                        <td className="py-3 pl-4 text-right font-black text-emerald-600">
                          {totalPrime.toLocaleString()} F
                        </td>
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

export default TeaserAdminSpace;
