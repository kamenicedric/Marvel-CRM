import React, { useState, useEffect } from 'react';
import { tasksService, projectsService, teamService } from '../../lib/supabase.ts';
import { ProductionTask, WeddingProject, TeamMember } from '../../types.ts';
import { FORMULA_WORKFLOWS } from '../../types/taskPlanning.ts';
import { 
  CheckSquare, Clock, AlertCircle, Filter, 
  Search, CheckCircle2, User, Calendar,
  ChevronRight, Info, Target, X, Star, MessageSquare,
  LayoutList, Workflow, Settings2, Check, ChevronDown, ChevronUp,
  AlertTriangle, RotateCcw, ListOrdered, Zap, ArrowRight, UserPlus,
  UserCheck, Loader2
} from 'lucide-react';

interface ProductionTasksModuleProps {
  viewMode?: 'standard' | 'workflow';
  onRefreshProject?: () => void;
}

const ProductionTasksModule: React.FC<ProductionTasksModuleProps> = ({ viewMode = 'standard', onRefreshProject }) => {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tData, pData, teamData] = await Promise.all([
        tasksService.getAll(),
        projectsService.getAll(),
        teamService.getAll()
      ]);
      setTasks(tData);
      setProjects(pData as any);
      setTeam(teamData.filter(m => m.status === 'Actif'));
    } catch (err) {
      console.error("Erreur de chargement des données de production:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateTask = async (taskId: string, updates: Partial<ProductionTask>) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      // 1. Mise à jour de la tâche physique
      await tasksService.update(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

      // 2. SYNCHRONISATION CRITIQUE : Si la tâche est terminée, on met à jour le projet
      if (updates.status === 'Terminé' && task.project_id) {
        const project = projects.find(p => p.id === task.project_id);
        if (project) {
          const formulaName = project.formula || "F. Classique - Photo + Film + Teaser";
          const referenceWorkflow = FORMULA_WORKFLOWS[formulaName] || [];
          
          // Trouver l'index de cette tâche dans le workflow théorique
          const poleSteps = referenceWorkflow.filter(s => s.pole === task.pole).sort((a, b) => a.day - b.day);
          const stepIdx = poleSteps.findIndex(s => s.title.toLowerCase().trim() === task.title.toLowerCase().trim());
          
          if (stepIdx !== -1) {
            const stepNumber = stepIdx + 1;
            // Corrected 'ALBUM' comparison to 'DVD' to match ProductionTask.pole type
            const dbKey = task.pole === 'PHOTO' ? 'pole_photo' : task.pole === 'FILM' ? 'pole_film' : task.pole === 'DVD' ? 'pole_dvd' : 'pole_com';
            const poleKey = task.pole === 'PHOTO' ? 'polePhoto' : task.pole === 'FILM' ? 'poleFilm' : task.pole === 'DVD' ? 'poleDVD' : 'poleCom';
            
            const currentPoleData = (project as any)[poleKey] || { currentStep: 0, assignedTo: '', status: 'pending' };
            
            // On ne met à jour le currentStep que si la tâche terminée est supérieure ou égale au step actuel
            if (stepNumber >= currentPoleData.currentStep) {
              await projectsService.update(project.id, {
                [dbKey]: { ...currentPoleData, currentStep: stepNumber, status: 'in_progress' }
              });
              if (onRefreshProject) onRefreshProject();
              fetchData(); // Recharger pour voir les changements de progression
            }
          }
        }
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la tâche:", err);
    }
  };

  const getSortedTasksForProject = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.project_id === projectId);
    const project = projects.find(p => p.id === projectId);
    if (!project) return projectTasks;

    const formulaName = project.formula || "F. Classique - Photo + Film + Teaser";
    const referenceWorkflow = FORMULA_WORKFLOWS[formulaName] || [];

    return [...projectTasks].sort((a, b) => {
      const indexA = referenceWorkflow.findIndex(step => step.title === a.title);
      const indexB = referenceWorkflow.findIndex(step => step.title === b.title);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      if (posA !== posB) return posA - posB;
      return (a.deadline || '').localeCompare(b.deadline || '');
    });
  };

  const taskMatchesFilter = (task: ProductionTask) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'Terminé';
    if (filter === 'overdue') {
      return !!task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Terminé';
    }
    return true;
  };

  const activeProjectsWithTasks = projects
    .filter(p => p.status !== 'Livré' && p.status !== 'Archivé')
    .filter(p => {
      const projectTasks = tasks.filter(t => t.project_id === p.id);
      return projectTasks.some(taskMatchesFilter);
    });

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center h-full gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#006344]"></div>
      <p className="font-black text-[#006344] uppercase italic tracking-[0.3em]">Synchro Séquence de Production...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-5xl font-black text-[#006344] uppercase italic tracking-tighter leading-none">
            {viewMode === 'workflow' ? 'PILOTAGE INDUSTRIEL' : 'OPÉRATIONS SÉQUENTIELLES'}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">
            Respect strict de la chaîne de valeur Marvel
          </p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
           {[
             { id: 'all', label: 'Toutes' },
             { id: 'pending', label: 'En cours' },
             { id: 'overdue', label: 'Retards' }
           ].map(f => (
             <button 
               key={f.id}
               onClick={() => setFilter(f.id as any)}
               className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                 filter === f.id ? 'bg-[#006344] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               {f.label}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeProjectsWithTasks.length > 0 ? (
          activeProjectsWithTasks.map(project => {
            const projectTasks = getSortedTasksForProject(project.id).filter(taskMatchesFilter);
            const isExpanded = expandedProject === project.id;
            const completed = projectTasks.filter(t => t.status === 'Terminé').length;
            const total = projectTasks.length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={project.id} className={`bg-white rounded-[3rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'shadow-2xl border-[#B6C61A]/30' : 'border-slate-100 shadow-sm'}`}>
                <div 
                  className={`p-8 flex flex-col lg:flex-row items-center justify-between gap-6 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#006344] rounded-[1.8rem] flex items-center justify-center text-[#B6C61A] font-black italic text-2xl shadow-lg">
                      {project.couple[0]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{project.couple}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-black text-[#006344] uppercase tracking-widest bg-[#B6C61A]/20 px-3 py-1 rounded-full italic">
                          {project.formula}
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <ListOrdered size={12} className="text-[#B6C61A]" /> {total} Étapes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 max-w-lg w-full">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Flux Temporel</span>
                        <span className="text-[#006344] italic">{progress}%</span>
                     </div>
                     <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                        <div className="h-full bg-[#B6C61A] transition-all duration-1000 shadow-[0_0_15px_#B6C61A80]" style={{ width: `${progress}%` }} />
                     </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-[#006344] text-white rotate-180 shadow-lg' : 'bg-slate-50 text-slate-300'}`}>
                       <ChevronDown size={24} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-8 border-t border-slate-50 bg-slate-50/20 space-y-4 animate-in slide-in-from-top-4 duration-500">
                    {projectTasks.map((task, idx) => {
                      const isLate = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Terminé';
                      const isAssigned = !!task.assigned_to;
                      
                      return (
                        <div 
                          key={task.id} 
                          className={`bg-white p-6 rounded-[2.5rem] border transition-all flex flex-col lg:flex-row items-center gap-6 group hover:shadow-xl ${
                            task.status === 'Terminé' ? 'border-[#B6C61A]/40 bg-[#B6C61A]/5' : 
                            (isLate ? 'border-red-500 bg-red-50' : 'border-slate-100')
                          }`}
                        >
                          <button 
                            onClick={() => handleUpdateTask(task.id, { status: task.status === 'Terminé' ? 'A faire' : 'Terminé' })}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                              task.status === 'Terminé' ? 'bg-[#006344] text-white shadow-xl scale-110' : 'bg-slate-50 text-slate-200 group-hover:bg-slate-100 group-hover:text-slate-400'
                            }`}
                          >
                            {task.status === 'Terminé' ? <CheckCircle2 size={32} /> : <div className="w-6 h-6 border-4 border-current rounded-full" />}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-3">
                               <span className="text-[10px] font-black text-[#B6C61A]">ORDRE #{idx + 1}</span>
                               <h5 className={`text-lg font-black uppercase italic tracking-tight truncate ${task.status === 'Terminé' ? 'line-through text-slate-300' : 'text-slate-800'}`}>
                                 {task.title}
                               </h5>
                             </div>
                             <div className="flex flex-wrap gap-4 mt-2">
                               {/* Corrected 'ALBUM' comparison to 'DVD' */}
                               <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest italic border ${
                                 task.pole === 'PHOTO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                 task.pole === 'FILM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                 task.pole === 'DVD' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                               }`}>
                                 {task.pole}
                               </span>
                               
                               <div className="relative">
                                  <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                                    isAssigned 
                                      ? 'bg-[#006344]/5 border-[#006344]/10 text-[#006344]' 
                                      : 'bg-red-50 border-red-100 text-red-500 animate-pulse'
                                  }`}>
                                     {isAssigned ? <UserCheck size={12} className="text-[#B6C61A]" /> : <UserPlus size={12} />}
                                     <select 
                                        value={task.assigned_to || ''}
                                        onChange={(e) => handleUpdateTask(task.id, { assigned_to: e.target.value })}
                                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none pr-6"
                                     >
                                        <option value="">NON ASSIGNÉ</option>
                                        {team.map(member => (
                                          <option key={member.id} value={member.full_name}>{member.full_name.toUpperCase()}</option>
                                        ))}
                                     </select>
                                     <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                  </div>
                               </div>

                               <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${
                                 isLate ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'text-slate-400 bg-slate-50 border-slate-100'
                               }`}>
                                 <Clock size={12} /> {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR') : 'J+X'}
                               </div>
                             </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                             <div className="w-full sm:w-24">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-2 text-center lg:text-left">Note /20</label>
                                <input 
                                  type="number" 
                                  min="0" max="20"
                                  value={task.evaluation || 0}
                                  onChange={(e) => handleUpdateTask(task.id, { evaluation: parseInt(e.target.value) || 0 })}
                                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-[#006344] italic text-center outline-none"
                                />
                             </div>
                             <div className="w-full sm:w-auto">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-2 text-center lg:text-left">Statut</label>
                                <select 
                                  value={task.status}
                                  onChange={(e) => handleUpdateTask(task.id, { status: e.target.value as any })}
                                  className={`w-full sm:w-32 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none border transition-all cursor-pointer ${
                                    task.status === 'Terminé' ? 'bg-[#006344] text-white border-[#006344]' :
                                    task.status === 'En cours' ? 'bg-[#B6C61A] text-[#006344] border-[#B6C61A]' :
                                    'bg-slate-50 text-slate-400 border-slate-100'
                                  }`}
                                >
                                  <option value="A faire">À Faire</option>
                                  <option value="En cours">En Cours</option>
                                  <option value="Terminé">Terminé</option>
                                </select>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[4rem] border border-dashed border-slate-200 space-y-8 animate-in zoom-in-95 duration-500">
             <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
                <Workflow size={48} />
             </div>
             <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-400 uppercase italic tracking-tighter">Pipeline de Production Vide</h3>
                <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                   Les tâches n'apparaissent ici qu'une fois le **Workflow Industriel** injecté dans un dossier projet actif.
                </p>
             </div>
             <div className="flex gap-4">
                <div className="px-6 py-4 bg-[#B6C61A]/10 text-[#006344] rounded-2xl flex items-center gap-3">
                   <Zap size={20} className="text-[#B6C61A]" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Allez dans l'onglet "PROJETS"</span>
                </div>
                <div className="px-6 py-4 bg-slate-900 text-white rounded-2xl flex items-center gap-3">
                   <Info size={20} className="text-[#B6C61A]" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Cliquez sur un couple et "Injecter Workflow"</span>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionTasksModule;