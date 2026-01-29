
import React, { useState, useEffect, useMemo } from 'react';
import { projectsService } from '../../lib/supabase';
import { WeddingProject, TeamMember } from '../../types';
import ProjectQuickView from '../shared/ProjectQuickView.tsx';
import { 
  Disc, Trophy, Wallet, Play, Pause, 
  CheckCircle2, ListTodo, LayoutGrid, 
  Clock, Flame, BadgeCheck, ArrowRight,
  Loader2, Check, BookOpen, Layers, Activity,
  Package, History, MousePointer2, CalendarDays,
  ChevronLeftCircle,
  ChevronRightCircle,
  // Added missing Info import from lucide-react
  Info
} from 'lucide-react';

interface DvdEditorSpaceProps {
  member: TeamMember | null;
}

const DvdEditorSpace: React.FC<DvdEditorSpaceProps> = ({ member }) => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'missions' | 'historique'>('cockpit');
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [quickViewProject, setQuickViewProject] = useState<WeddingProject | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allProjects = await projectsService.getAll();
      const myProjects = (allProjects as any[]).filter(p => 
        p.pole_dvd?.assignedTo?.toLowerCase() === member?.full_name?.split(' ')[0].toLowerCase()
      );
      setProjects(myProjects);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [member]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleStatusUpdate = async (projectId: string, newStatus: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    try {
      await projectsService.update(projectId, { 
        pole_dvd: { ...project.poleDVD, status: newStatus } 
      });
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handleShiftMonth = async (projectId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
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
    }
  };

  const handleCycleStatus = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    // Cycle : pending -> in_progress -> completed
    const statuses = ['pending', 'in_progress', 'completed'];
    const currentStatus = project.poleDVD?.status || 'pending';
    const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    handleStatusUpdate(projectId, statuses[nextIdx]);
  };

  if (loading) return <div className="p-20 flex flex-col items-center justify-center bg-[#F4F6F3]"><Loader2 className="animate-spin text-blue-600" size={48} /><p className="mt-4 font-black uppercase text-blue-600 italic">Sync Matrix DVD...</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl text-white relative overflow-hidden flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20"><Trophy size={32} className="text-blue-200" /></div>
            <div><p className="text-[9px] font-black text-white/40 uppercase">Rang DVD</p><h3 className="text-4xl font-black italic">#1</h3></div>
         </div>
         <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Layers size={32} /></div>
            <div><p className="text-[9px] font-black text-slate-400 uppercase">Projets Actifs</p><h3 className="text-4xl font-black text-blue-600 italic">{projects.filter(p=>p.poleDVD?.status !== 'completed').length}</h3></div>
         </div>
         <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><Wallet size={32} /></div>
            <div><p className="text-[9px] font-black text-slate-400 uppercase">Capital Primes</p><h3 className="text-3xl font-black text-slate-900 italic">45.000 F</h3></div>
         </div>
         <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400"><Flame size={32} /></div>
            <div><p className="text-[9px] font-black text-white/40 uppercase">Objectif</p><h3 className="text-xl font-black text-blue-400 uppercase italic">ALPHA 100</h3></div>
         </div>
      </div>

      <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-inner w-fit overflow-x-auto no-scrollbar">
         {[{id:'cockpit', label:'Cockpit', icon:LayoutGrid}, {id:'missions', label:'Missions', icon:ListTodo}, {id:'historique', label:'Historique', icon:History}].map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}><tab.icon size={16} /> {tab.label}</button>
         ))}
      </div>

      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
           <div className="xl:col-span-8 bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden">
              {activeProject ? (
                <div className="space-y-10">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-lg"><Disc size={40} /></div>
                      <div>
                         <h2 
                           onClick={() => setQuickViewProject(activeProject)}
                           className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 hover:text-blue-600 hover:underline cursor-pointer"
                         >
                           {activeProject.couple}
                         </h2>
                         <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-3 italic text-blue-600 flex items-center gap-2"><ArrowRight size={14} className="text-blue-400" /> CONCEPTION ALBUM & DVD PHYSIQUE</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-y border-slate-50">
                      <div className="text-center md:text-left"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Production</p><h4 className="text-3xl font-black text-blue-600 italic uppercase">{isWorking ? 'DESIGNING' : 'READY'}</h4></div>
                      <div className="text-center border-x border-slate-50"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Prévue</p><h4 className="text-2xl font-black text-slate-900 italic uppercase">{new Date(activeProject.poleDVD?.planned_date || activeProject.weddingDate).toLocaleDateString()}</h4></div>
                      <div className="text-center md:text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capital Prime</p><h4 className="text-3xl font-black text-emerald-600 italic">+ 15.000 F</h4></div>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4">
                      <button onClick={() => setIsWorking(!isWorking)} className={`flex-[2] py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all ${isWorking ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>{isWorking ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />} {isWorking ? 'PAUSE PROD' : 'LANCER LA CONCEPTION'}</button>
                      <button onClick={() => handleStatusUpdate(activeProject.id, 'completed')} className="flex-1 py-8 bg-slate-900 text-blue-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-4"><CheckCircle2 size={20} /> LIVRER PROJET</button>
                   </div>
                </div>
              ) : (
                <div className="py-20 text-center opacity-30 italic flex flex-col items-center gap-6">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center"><Check size={48} /></div>
                   <h3 className="text-2xl font-black text-slate-400 uppercase italic tracking-tighter">File d'attente DVD libre</h3>
                   <p className="text-sm font-bold text-slate-300 uppercase tracking-widest max-w-xs mx-auto">Sélectionnez un dossier dans l'onglet Missions pour débuter la conception graphique.</p>
                </div>
              )}
           </div>
           <div className="xl:col-span-4 space-y-8">
              <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                 <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Disc size={120} /></div>
                 <div>
                    <h4 className="text-3xl font-black uppercase italic tracking-tighter mb-6">Capacité Matrix</h4>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-white/60">Charge Système</span><span className="text-blue-400">{( (projects.length/8)*100 ).toFixed(0)}%</span></div>
                       <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${(projects.length/8)*100}%`}}></div></div>
                    </div>
                 </div>
                 <button className="bg-blue-600 text-white w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest italic hover:bg-blue-500 transition-all">Consulter Normes Marvel</button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'missions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4">
           {projects.filter(p => p.status !== 'Archivé').map(p => {
             const currentStatus = p.poleDVD?.status || 'pending';
             const plannedDateStr = p.poleDVD?.planned_date || p.weddingDate;
             
             return (
               <div 
                key={p.id} 
                onClick={() => { setActiveProjectId(p.id); setActiveTab('cockpit'); }} 
                className={`p-8 rounded-[3rem] border transition-all group cursor-pointer relative overflow-hidden active:scale-95 ${currentStatus === 'completed' ? 'bg-emerald-50/50 border-emerald-100 opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-2xl'}`}
               >
                  <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${currentStatus === 'in_progress' ? 'bg-blue-600 animate-pulse' : currentStatus === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  <div className="flex justify-between items-start mb-6">
                     <div 
                      onClick={(e) => handleCycleStatus(p.id, e)}
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase italic border transition-all cursor-pointer relative z-10 ${currentStatus === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white' : currentStatus === 'completed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-blue-600 hover:text-white'}`}
                     >
                      {currentStatus === 'in_progress' ? 'EN COURS' : currentStatus === 'completed' ? 'OK' : 'A FAIRE'}
                     </div>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setQuickViewProject(p); }}
                        className="p-2 text-slate-200 hover:text-blue-600 transition-colors"
                     >
                       <Info size={18} />
                     </button>
                  </div>
                  <h4 className={`text-xl font-black uppercase italic tracking-tight mb-8 group-hover:text-blue-600 transition-colors ${currentStatus === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{p.couple}</h4>
                  <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-6">
                     <div className="flex items-center gap-1.5 relative z-10">
                        <button 
                          type="button"
                          onClick={(e) => handleShiftMonth(p.id, -1, e)}
                          className="p-1 text-slate-300 hover:text-blue-600 transition-colors"
                        >
                          <ChevronLeftCircle size={14} />
                        </button>

                        <div className="flex items-center gap-1 mx-0.5">
                           <Clock size={12} className={currentStatus === 'completed' ? 'text-emerald-400' : 'text-blue-400'} />
                           <span>{new Date(plannedDateStr).toLocaleDateString()}</span>
                        </div>

                        <button 
                          type="button"
                          onClick={(e) => handleShiftMonth(p.id, 1, e)}
                          className="p-1 text-slate-300 hover:text-blue-600 transition-colors"
                        >
                          <ChevronRightCircle size={14} />
                        </button>
                     </div>
                     <span className="flex items-center gap-1.5"><Package size={12} className={currentStatus === 'completed' ? 'text-emerald-400' : 'text-blue-400'} /> {p.packageType}</span>
                  </div>
               </div>
             );
           })}
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

export default DvdEditorSpace;
