
import React, { useState, useMemo, useEffect } from 'react';
import { tasksService, projectsService } from '../../lib/supabase.ts';
import { ProductionTask, TeamMember, WeddingProject } from '../../types.ts';
import ProjectQuickView from '../shared/ProjectQuickView.tsx';
import {
  Zap, Trophy, Wallet, AlertTriangle, Play, Pause,
  Ban, CheckCircle2, ListTodo, TrendingUp, LayoutGrid,
  Calendar, Clock, Star, MessageSquare, History,
  Flame, BadgeCheck, User, Sparkles, HelpCircle,
  ChevronRight, ArrowRight, ShieldAlert, Dna,
  Video, Timer, Construction, ArrowUpRight, X, Layers,
  Clapperboard, PlayCircle, Heart, Check, Loader2
} from 'lucide-react';

interface OscarSpaceProps {
  member: TeamMember | null;
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
}

const OscarSpace: React.FC<OscarSpaceProps> = ({ member }) => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'planning' | 'performance' | 'primes'>('cockpit');
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [quickViewProject, setQuickViewProject] = useState<WeddingProject | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allTasks, allProjects] = await Promise.all([
        tasksService.getAll(),
        projectsService.getAll()
      ]);
      setTasks(allTasks);
      setProjects(allProjects as any);
    } catch (err) {
      console.error("Erreur synchro OscarSpace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [member]);

  const combinedMissions = useMemo(() => {
    const missions: UnifiedMission[] = [];
    const searchName = "Oscar";

    projects.forEach(p => {
      const teaserData = p.teaser_data as any;
      if (teaserData?.modules?.pose?.toLowerCase() === searchName.toLowerCase()) {
        missions.push({
          id: `mod-pose-${p.id}`,
          type: 'module',
          moduleId: 'pose',
          title: 'MONTAGE PARTIE POSÉE',
          couple: p.couple,
          projectId: p.id,
          status: teaserData.module_status?.pose || 'A faire',
          priority: 'High',
          deadline: teaserData.planned_date || p.weddingDate
        });
      }
    });

    tasks.filter(t => t.assigned_to?.toLowerCase().includes(searchName.toLowerCase())).forEach(t => {
      const p = projects.find(proj => proj.id === t.project_id);
      missions.push({
        id: t.id,
        type: 'task',
        title: t.title,
        couple: p?.couple || 'Projet Inconnu',
        projectId: t.project_id || '',
        status: t.status,
        priority: t.priority,
        deadline: t.deadline || ''
      });
    });

    return missions;
  }, [tasks, projects]);

  useEffect(() => {
    if (combinedMissions.length > 0 && !activeMissionId) {
      const firstPending = combinedMissions.find(m => m.status !== 'Terminé') || combinedMissions[0];
      setActiveMissionId(firstPending.id);
    }
  }, [combinedMissions]);

  const handleUpdateStatus = async (mission: UnifiedMission, newStatus: string) => {
    try {
      if (mission.type === 'task') {
        await tasksService.update(mission.id, { status: newStatus as any });
      } else if (mission.type === 'module' && mission.moduleId) {
        const p = projects.find(proj => proj.id === mission.projectId);
        if (p) {
          const teaserData = { ...(p.teaser_data as any) };
          teaserData.module_status = { ...teaserData.module_status, [mission.moduleId]: newStatus };
          const allDone = Object.values(teaserData.module_status).every(v => v === 'Terminé');
          if (allDone) teaserData.status = 'Terminé';
          await projectsService.update(p.id, { teaser_data: teaserData });
        }
      }
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handleQuickView = (mission: UnifiedMission) => {
    const p = projects.find(proj => proj.id === mission.projectId);
    if (p) setQuickViewProject(p);
  };

  const activeMission = combinedMissions.find(m => m.id === activeMissionId);

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center h-full gap-4 bg-[#F4F6F3]">
      <Loader2 className="animate-spin text-[#006344]" size={48} />
      <p className="font-black text-[#006344] uppercase italic tracking-[0.3em] animate-pulse">Scanning Matrix Oscar...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      {/* HUD SUPERIEUR */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-[#006344] p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
            <Trophy size={32} className="text-[#B6C61A]" />
          </div>
          <div>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Rang Oscar</p>
            <h3 className="text-4xl font-black italic tracking-tighter">#1</h3>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="w-16 h-16 bg-[#B6C61A]/10 rounded-2xl flex items-center justify-center shrink-0">
            <Zap size={32} className="text-[#006344]" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Rendement</p>
            <h3 className="text-4xl font-black text-[#006344] italic tracking-tighter">
              {combinedMissions.length > 0
                ? Math.round((combinedMissions.filter(m => m.status === 'Terminé').length / combinedMissions.length) * 100)
                : 0}%
            </h3>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet size={32} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Primes</p>
            <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">
              {(50000 + (combinedMissions.filter(m => m.status === 'Terminé').length * 5000)).toLocaleString('fr-FR')} F
            </h3>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
            <Flame size={32} className="text-orange-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Missions</p>
            <h3 className="text-xl font-black uppercase text-slate-900 leading-none">{combinedMissions.filter(m => m.status !== 'Terminé').length} UNITÉS</h3>
          </div>
        </div>
      </div>

      <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-inner w-fit">
        {[{ id: 'cockpit', label: 'Cockpit', icon: LayoutGrid }, { id: 'planning', label: 'Missions', icon: ListTodo }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === tab.id ? 'bg-[#006344] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="xl:col-span-8 bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden group">
            {activeMission ? (
              <>
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-[#006344] flex items-center justify-center text-white shadow-lg">
                    <Video size={32} />
                  </div>
                  <div>
                    <h3
                      onClick={() => handleQuickView(activeMission)}
                      className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none hover:text-[#006344] hover:underline cursor-pointer"
                    >
                      {activeMission.couple}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 italic flex items-center gap-2">
                      <ArrowRight size={14} className="text-[#B6C61A]" /> {activeMission.title}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-10 border-y border-slate-50">
                  <div className="text-center lg:text-left"><p className="text-[9px] font-black text-slate-400 uppercase">Status</p><h4 className="text-4xl font-black text-[#006344] italic uppercase">{isWorking ? 'RUNNING' : 'IDLE'}</h4></div>
                  <div className="text-center border-x border-slate-50"><p className="text-[9px] font-black text-slate-400 uppercase">Deadline</p><h4 className="text-2xl font-black text-slate-900 italic uppercase">{new Date(activeMission.deadline).toLocaleDateString()}</h4></div>
                  <div className="text-center lg:text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Prime Unité</p><h4 className="text-3xl font-black text-[#B6C61A] italic">+ 20.000 F</h4></div>
                </div>
                <div className="flex gap-4 mt-12">
                  <button onClick={() => { setIsWorking(!isWorking); handleUpdateStatus(activeMission, 'En cours'); }} className="flex-1 py-6 bg-[#006344] text-[#B6C61A] rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-4">{isWorking ? 'PAUSE' : 'LANCER'}</button>
                  <button onClick={() => handleUpdateStatus(activeMission, 'Terminé')} className="flex-1 py-6 bg-slate-900 text-[#B6C61A] rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-4">FINALISER</button>
                </div>
              </>
            ) : (
              <div className="py-20 text-center opacity-40"><BadgeCheck size={48} className="mx-auto text-emerald-500 mb-4" /><h3 className="text-xl font-black uppercase">Plus aucune tâche en attente</h3></div>
            )}
          </div>
          <div className="xl:col-span-4 space-y-8">
            <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden">
              <h4 className="text-2xl font-black uppercase italic tracking-tight mb-8">STATUT OSCAR</h4>
              <div className="text-5xl font-black italic tracking-tighter text-[#B6C61A]">15 <span className="text-xl text-white opacity-40">JOURS</span></div>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-6 italic">Expertise : PARTIE POSÉE NIVEAU S++</p>
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

export default OscarSpace;
