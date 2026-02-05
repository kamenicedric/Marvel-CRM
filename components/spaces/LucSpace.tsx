
import React, { useState, useEffect, useRef } from 'react';
import { tasksService, projectsService } from '../../lib/supabase.ts';
import { ProductionTask, TeamMember, WeddingProject } from '../../types.ts';
// Added Heart and Check to the imports
import { 
  Clock, Square, Zap, TrendingUp, 
  CheckSquare, ListTodo, AlertCircle, 
  Camera, Target, Trophy, Star, ChevronRight,
  ShieldCheck, Flame, LayoutGrid, Calendar, 
  Layers, Activity, CheckCircle2,
  Image as ImageIcon, History, Shield,
  Settings, User, ExternalLink, HelpCircle,
  AlertTriangle, Timer, Play, Pause,
  Lock, BadgeCheck, Briefcase, Filter,
  Heart, Check
} from 'lucide-react';

interface LucSpaceProps {
  member: TeamMember | null;
}

const LucSpace: React.FC<LucSpaceProps> = ({ member }) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'pointage' | 'stats'>('missions');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [clockHistory, setClockHistory] = useState<{time: string, img: string, type: 'IN' | 'OUT'}[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (isClockedIn) {
        setElapsedTime(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isClockedIn]);

  useEffect(() => {
    const fetchData = async () => {
      if (!member) return;
      setLoading(true);
      try {
        const [allTasks, allProjects] = await Promise.all([
          tasksService.getAll(),
          projectsService.getAll()
        ]);
        
        // Filtrage strict par membre
        const myTasks = allTasks.filter(t => 
          t.assigned_to?.toLowerCase() === member.full_name?.toLowerCase() ||
          t.assigned_to?.toLowerCase() === member.full_name?.split(' ')[0].toLowerCase()
        );
        
        setTasks(myTasks);
        setProjects(allProjects as any);
      } catch (err) {
        console.error("Erreur synchronisation LucSpace:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [member]);

  const startCamera = async () => {
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
      setCameraError("Accès caméra requis pour le protocole de pointage.");
    }
  };

  const captureSelfie = (type: 'IN' | 'OUT') => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/png');
        
        setClockHistory(prev => [{time: new Date().toLocaleTimeString(), img: data, type}, ...prev]);
        
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
        
        if (type === 'IN') {
          setIsClockedIn(true);
          setElapsedTime(0);
        } else {
          setIsClockedIn(false);
        }
        
        setShowCamera(false);
      }
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER HUD */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="relative">
             <div className="w-20 h-20 bg-[#006344] rounded-[2rem] flex items-center justify-center text-[#B6C61A] font-black italic text-2xl shadow-xl">
               {member?.full_name?.substring(0,2).toUpperCase() || 'LU'}
             </div>
             <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#B6C61A] rounded-full border-4 border-white flex items-center justify-center">
                <BadgeCheck size={16} className="text-[#006344]" />
             </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                 {member?.full_name || 'LUC'}
               </h1>
               <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic border border-slate-200">
                 Niveau 04 // {member?.role}
               </span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 flex items-center gap-2 italic">
               <Activity size={12} className="text-[#B6C61A]" /> {isClockedIn ? 'TRANSMISSION ACTIVE' : 'MODE VEILLE OPTIMISÉE'}
            </p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <nav className="bg-slate-50 p-2 rounded-3xl border border-slate-100 flex gap-2 w-full lg:w-auto shadow-inner">
           {[
             { id: 'missions', label: 'Missions', icon: ListTodo },
             { id: 'pointage', label: 'Pointage', icon: Timer },
             { id: 'stats', label: 'Objectifs', icon: Trophy }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                 activeTab === tab.id 
                  ? 'bg-[#006344] text-white shadow-xl scale-105' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white'
               }`}
             >
               <tab.icon size={16} /> {tab.label}
             </button>
           ))}
        </nav>

        <div className="hidden xl:flex items-center gap-6 border-l border-slate-100 pl-8">
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Heure Locale</p>
              <p className="text-2xl font-black text-[#006344] italic tracking-tight">{currentTime.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</p>
           </div>
           <button className="p-4 bg-slate-50 rounded-2xl text-slate-300 hover:text-[#006344] transition-colors"><Settings size={24}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* VUE : MISSIONS (Onglet par défaut) */}
        {activeTab === 'missions' && (
          <div className="xl:col-span-12 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Résumé des Tâches */}
                <div className="lg:col-span-2 space-y-6">
                   <div className="flex items-center justify-between px-4">
                      <h3 className="text-xl font-black text-[#006344] uppercase italic tracking-tighter flex items-center gap-3">
                         <Layers size={24} className="text-[#B6C61A]" /> Dossier de Production personnel
                      </h3>
                      <div className="flex gap-2">
                         <span className="px-4 py-2 bg-white rounded-xl border border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">{tasks.length} UNITÉS</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tasks.filter(t => t.status !== 'Terminé').map((task) => {
                        const project = projects.find(p => p.id === task.project_id);
                        return (
                          <div key={task.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50/50 rounded-bl-full -mr-8 -mt-8 -z-10"></div>
                             
                             <div className="flex justify-between items-start mb-6">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic border ${
                                   task.priority === 'High' || task.priority === 'Urgent' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-[#B6C61A]/10 text-[#006344] border-[#B6C61A]/20'
                                }`}>
                                   Priorité {task.priority}
                                </span>
                                <div className="text-right">
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Deadline</p>
                                   <p className="text-xs font-black text-slate-900">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'ASAP'}</p>
                                </div>
                             </div>

                             <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tight leading-tight mb-2 group-hover:text-[#006344] transition-colors">{task.title}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 italic">
                                <Heart size={12} className="text-rose-500" /> {project?.couple || 'Projet Inconnu'}
                             </p>

                             <button className="w-full py-4 bg-slate-50 group-hover:bg-[#B6C61A] text-slate-400 group-hover:text-[#006344] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3">
                                <Check size={16} /> Marquer Terminé
                             </button>
                          </div>
                        );
                      })}
                      {tasks.filter(t => t.status !== 'Terminé').length === 0 && (
                        <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center opacity-40">
                           <BadgeCheck size={48} className="text-slate-200 mb-4" />
                           <p className="text-lg font-black text-slate-400 uppercase italic tracking-tighter">Tout est à jour !</p>
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2 italic">Aucune mission critique en attente.</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* Sidebar Infos */}
                <div className="space-y-8">
                   <div className="bg-[#006344] p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden border-b-[12px] border-[#B6C61A]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                      <div className="relative z-10 space-y-6">
                         <div className="flex items-center gap-4">
                            <Flame size={28} className="text-[#B6C61A]" />
                            <h4 className="text-2xl font-black uppercase italic tracking-tight">STREAK</h4>
                         </div>
                         <div className="text-5xl font-black italic tracking-tighter leading-none">12 <span className="text-xl opacity-40">JOURS</span></div>
                         <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed italic">
                           Vous êtes dans le Top 5% des contributeurs Marvel ce mois-ci. Continuez !
                         </p>
                      </div>
                   </div>

                   <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase italic tracking-widest flex items-center gap-3 border-b border-slate-50 pb-4">
                         <Activity size={18} className="text-[#B6C61A]" /> Charge Système
                      </h4>
                      <div className="space-y-4">
                         {[
                           { label: 'Projets Actifs', val: '04', color: 'text-[#006344]' },
                           { label: 'Heures / Semaine', val: '38h', color: 'text-[#D8A800]' },
                           { label: 'Score Qualité', val: '18.5/20', color: 'text-emerald-500' }
                         ].map((item, i) => (
                           <div key={i} className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                              <span className={`text-sm font-black italic ${item.color}`}>{item.val}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* VUE : CHRONOS (POINTAGE) */}
        {activeTab === 'pointage' && (
          <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-500">
             {/* Main Cockpit */}
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col items-center justify-center space-y-12 relative overflow-hidden min-h-[600px]">
                <div className="absolute top-10 left-10 text-[10px] font-black text-slate-200 uppercase tracking-[0.4em] italic">Lumina Timekit v.2.4</div>
                
                <div className="relative">
                   {/* CIRCULAR PROGRESS DECORATION */}
                   <svg className="w-80 h-80 -rotate-90">
                      <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-slate-50" />
                      <circle 
                        cx="160" cy="160" r="140" 
                        stroke="currentColor" strokeWidth="6" fill="transparent" 
                        strokeDasharray={880}
                        strokeDashoffset={isClockedIn ? 880 - (elapsedTime % 3600 / 3600 * 880) : 880}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ${isClockedIn ? 'text-[#B6C61A]' : 'text-slate-100'}`}
                      />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                      <p className={`text-[12px] font-black uppercase tracking-[0.4em] italic ${isClockedIn ? 'text-emerald-500 animate-pulse' : 'text-slate-300'}`}>
                         {isClockedIn ? 'SERVICE EN COURS' : 'VEILLE SYSTÈME'}
                      </p>
                      <h3 className={`text-7xl font-black italic tracking-tighter tabular-nums leading-none ${isClockedIn ? 'text-[#006344]' : 'text-slate-100 opacity-60'}`}>
                         {isClockedIn ? formatElapsedTime(elapsedTime) : '00:00:00'}
                      </h3>
                      {isClockedIn && (
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2 italic">START: {clockHistory[0]?.time}</p>
                      )}
                   </div>
                </div>

                <div className="w-full max-w-sm">
                   {!isClockedIn ? (
                      <button 
                        onClick={startCamera} 
                        className="w-full py-8 bg-[#006344] text-[#B6C61A] rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.35em] italic shadow-2xl shadow-[#006344]/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-5"
                      >
                        <Play size={24} fill="currentColor" /> DÉBUTER SERVICE
                      </button>
                   ) : (
                     <button 
                       onClick={() => startCamera()} 
                       className="w-full py-8 bg-[#BD3B1B] text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.35em] italic shadow-2xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-5"
                     >
                       <Square size={18} fill="currentColor" /> CLÔTURER SERVICE
                     </button>
                   )}
                </div>

                {/* CAMERA MODAL OVERLAY */}
                {showCamera && (
                  <div className="absolute inset-0 z-50 bg-[#006344]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white animate-in zoom-in duration-500">
                     <div className="text-center space-y-4 mb-10">
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter">Capture du Protocole</h4>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">Preuve visuelle requise pour synchronisation</p>
                     </div>
                     
                     <div className="w-72 h-72 rounded-[4rem] border-4 border-[#B6C61A] overflow-hidden relative mb-12 shadow-[0_0_80px_rgba(182,198,26,0.3)] bg-slate-900">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute inset-0 border-t-2 border-[#B6C61A] animate-scan shadow-[0_0_15px_#B6C61A]"></div>
                     </div>

                     <div className="flex gap-4 w-full max-w-sm">
                        <button onClick={() => setShowCamera(false)} className="flex-1 py-5 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10">Annuler</button>
                        <button 
                           onClick={() => captureSelfie(isClockedIn ? 'OUT' : 'IN')} 
                           className="flex-1 py-5 bg-[#B6C61A] text-[#006344] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#B6C61A]/20"
                        >
                           CAPTURER
                        </button>
                     </div>
                  </div>
                )}
             </div>

             {/* Activity Log */}
             <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col space-y-8">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                   <h3 className="text-xl font-black text-[#006344] uppercase italic flex items-center gap-3">
                      <History size={24} className="text-[#B6C61A]" /> Journal de Pointage
                   </h3>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">30 derniers jours</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2">
                   {clockHistory.map((h, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-[#B6C61A]/30 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all border border-slate-200">
                              <img src={h.img} className="w-full h-full object-cover" alt="Selfie" />
                           </div>
                           <div>
                              <p className="text-xs font-black text-slate-900 uppercase italic">Session {h.type}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.time} // OK</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${h.type === 'IN' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                           <ChevronRight size={14} className="text-slate-200" />
                        </div>
                     </div>
                   ))}
                   {clockHistory.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
                        <ImageIcon size={48} className="mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">Aucun historique stocké</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* VUE : STATS (OBJECTIFS) */}
        {activeTab === 'stats' && (
           <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10">
                 <h3 className="text-xl font-black text-[#006344] uppercase italic tracking-tighter">Progression Bonus Alpha</h3>
                 <div className="relative flex items-center justify-center">
                    <svg className="w-48 h-48 -rotate-90">
                       <circle cx="96" cy="96" r="80" stroke="#F1F5F9" strokeWidth="12" fill="transparent" />
                       <circle cx="96" cy="96" r="80" stroke="#B6C61A" strokeWidth="12" fill="transparent" strokeDasharray={502} strokeDashoffset={502 * 0.45} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-4xl font-black text-[#006344] italic">55%</span>
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Cible Finale</span>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase italic">Prime potentielle</span>
                       <span className="text-lg font-black text-[#006344] italic">137.500 F</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-[0.2em] italic leading-relaxed">
                      "La performance est le seul juge de la qualité Marvel."
                    </p>
                 </div>
              </div>

              <div className="bg-[#006344] p-10 rounded-[3.5rem] shadow-2xl text-white col-span-2 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                 <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-4">
                       <Trophy size={40} className="text-[#B6C61A]" />
                       <h4 className="text-4xl font-black uppercase italic tracking-tighter">Indicateurs de valeur</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-10">
                       {[
                         { label: 'Efficacité', val: '98%', sub: '+2.1%' },
                         { label: 'Retards', val: '00', sub: 'Standard OK' },
                         { label: 'Note Moy.', val: '19.2', sub: '/20' },
                         { label: 'Rang', val: '#03', sub: 'Global' }
                       ].map((k, i) => (
                         <div key={i} className="space-y-2">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{k.label}</p>
                            <p className="text-4xl font-black italic tabular-nums">{k.val}</p>
                            <p className="text-[9px] font-bold text-[#B6C61A] uppercase italic">{k.sub}</p>
                         </div>
                       ))}
                    </div>

                    <button className="bg-[#B6C61A] text-[#006344] px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl self-start hover:scale-105 transition-all">
                       Générer Rapport Analytique
                    </button>
                 </div>
              </div>
           </div>
        )}

      </div>

      <canvas ref={canvasRef} className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
        .animate-scan { animation: scan 3s infinite linear; height: 4px; background: #B6C61A; box-shadow: 0 0 20px #B6C61A; position: absolute; width: 100%; left: 0; z-index: 10; opacity: 0.8; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default LucSpace;
