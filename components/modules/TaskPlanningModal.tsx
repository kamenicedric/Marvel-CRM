
import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle2, Zap, AlertCircle, Clock, ShieldCheck, User } from 'lucide-react';
import { WeddingProject, ProductionTask } from '../../types';
import { generateTasksForProject } from '../../types/taskPlanning';
import { tasksService } from '../../lib/supabase';

interface TaskPlanningModalProps {
  isOpen: boolean;
  project: WeddingProject | null;
  onClose: () => void;
  onConfirm: () => void;
}

const TaskPlanningModal: React.FC<TaskPlanningModalProps> = ({ isOpen, project, onClose, onConfirm }) => {
  const [generatedTasks, setGeneratedTasks] = useState<Partial<ProductionTask>[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setGeneratedTasks(generateTasksForProject(project));
    }
  }, [project, isOpen]);

  const formatDateFR = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleDeploy = async () => {
    if (!project) return;
    setIsDeploying(true);
    try {
      await Promise.all(generatedTasks.map(task => tasksService.create(task)));
      onConfirm();
      onClose();
    } catch (error) {
      console.error("Deploy failed:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#006344]/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#006344] text-white flex items-center justify-center rounded-2xl shadow-lg">
              <Zap size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#006344] uppercase italic tracking-tighter">Planificateur de Workflow</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Génération automatique // {project.formula}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="bg-[#B6C61A]/10 border border-[#B6C61A]/30 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-start gap-4">
              <ShieldCheck className="text-[#006344] shrink-0" size={24} />
              <div>
                <p className="text-sm font-black text-[#006344] uppercase italic">Standard Marvel Actif</p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                  Injection de <strong>{generatedTasks.length} tâches nominatives</strong> basées sur le contrat.
                </p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-[9px] font-black text-slate-400 uppercase">Couple</p>
               <p className="text-lg font-black text-slate-900 uppercase italic leading-none">{project.couple}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedTasks.map((task, idx) => {
              const weddingDate = new Date(project.weddingDate);
              const deadlineDate = new Date(task.deadline!);
              const diffTime = deadlineDate.getTime() - weddingDate.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
              const label = diffDays === 0 ? "Jour J" : diffDays > 0 ? `J+${diffDays}` : `J${diffDays}`;

              return (
                <div key={idx} className="flex items-center gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-[#006344]/30 transition-all group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black italic text-xs shadow-sm shrink-0 ${
                    task.pole === 'PHOTO' ? 'bg-emerald-100 text-[#006344]' : 
                    task.pole === 'FILM' ? 'bg-amber-100 text-amber-700' : 
                    task.pole === 'DVD' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 uppercase italic text-sm tracking-tight truncate">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <User size={10} className="text-[#B6C61A]" /> {task.assigned_to}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10} /> {formatDateFR(task.deadline!)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 rounded-2xl bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-200">Abandonner</button>
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex-[2] py-5 rounded-2xl bg-[#006344] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#006344]/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isDeploying ? 'Déploiement en cours...' : <><Zap size={16} className="text-[#B6C61A]" /> Injecter le planning industriel</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskPlanningModal;
