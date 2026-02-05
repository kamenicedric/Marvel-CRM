
import React, { useState, useEffect } from 'react';
import { 
  Settings2, Plus, Trash2, Save, 
  ChevronRight, Clock, User, 
  Layout, ListOrdered
} from 'lucide-react';
import { FORMULA_WORKFLOWS, DetailedTaskTemplate } from '../../types/taskPlanning.ts';
import { workflowsService } from '../../lib/supabase.ts';

const STORAGE_KEY = 'marvel_workflows_v1';

const WorkflowConfigModule: React.FC = () => {
  const [selectedFormula, setSelectedFormula] = useState<string>(Object.keys(FORMULA_WORKFLOWS)[0]);
  const [workflows, setWorkflows] = useState<Record<string, DetailedTaskTemplate[]>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Impossible de charger la configuration des workflows depuis le stockage local.', e);
      }
    }
    return FORMULA_WORKFLOWS;
  });

  // Surcharge initiale par les workflows venant de Supabase (si disponibles)
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const rows = await workflowsService.getAll();
        if (rows && rows.length > 0) {
          const merged: Record<string, DetailedTaskTemplate[]> = { ...FORMULA_WORKFLOWS };
          rows.forEach((row: any) => {
            if (row.formula && Array.isArray(row.steps)) {
              merged[row.formula] = row.steps as DetailedTaskTemplate[];
            }
          });
          setWorkflows(merged);
          if (!merged[selectedFormula]) {
            const firstKey = Object.keys(merged)[0];
            if (firstKey) setSelectedFormula(firstKey);
          }
        }
      } catch (e) {
        console.warn('Impossible de charger les workflows depuis Supabase.', e);
      }
    };
    loadFromSupabase();
  }, []);

  const formulas = Object.keys(workflows);
  const currentSteps = workflows[selectedFormula] || [];

  const handleUpdateStep = (idx: number, updates: Partial<DetailedTaskTemplate>) => {
    const updated = [...currentSteps];
    updated[idx] = { ...updated[idx], ...updates };
    setWorkflows({ ...workflows, [selectedFormula]: updated });
  };

  const handleAddStep = () => {
    const newStep: DetailedTaskTemplate = {
      title: "Nouvelle étape de production",
      day: 10,
      assignedTo: "marvel",
      pole: "PHOTO"
    };
    setWorkflows({ ...workflows, [selectedFormula]: [...currentSteps, newStep] });
  };

  const handleAddFormula = () => {
    if (typeof window === 'undefined') return;
    const name = window.prompt("Nom de la nouvelle formule (ex: Photo + Film Luxe) ?");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (workflows[trimmed]) {
      alert("Cette formule existe déjà dans le catalogue.");
      return;
    }
    const baseStep: DetailedTaskTemplate = {
      title: "Nouvelle étape de production",
      day: 10,
      assignedTo: "marvel",
      pole: "PHOTO",
    };
    const updated = { ...workflows, [trimmed]: [baseStep] };
    setWorkflows(updated);
    setSelectedFormula(trimmed);
  };

  const handleDeleteStep = (idx: number) => {
    const updated = currentSteps.filter((_, i) => i !== idx);
    setWorkflows({ ...workflows, [selectedFormula]: updated });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar : Les Recettes Marvel (8 Formules) */}
        <div className="w-80 bg-white border-r border-slate-100 flex flex-col shrink-0">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
             <div className="flex items-center gap-2 mb-4">
                <Layout size={16} className="text-[#006344]" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Catalogue Formules</h3>
             </div>
             <button
               onClick={handleAddFormula}
               className="w-full py-4 bg-[#006344] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
             >
               <Plus size={16} /> Nouveau Template
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            {formulas.map(formula => (
              <button
                key={formula}
                onClick={() => setSelectedFormula(formula)}
                className={`w-full p-5 rounded-[1.8rem] text-left transition-all group border ${
                  selectedFormula === formula 
                    ? 'bg-[#006344] border-[#006344] shadow-lg text-white' 
                    : 'hover:bg-slate-50 border-transparent text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${selectedFormula === formula ? 'bg-[#B6C61A]' : 'bg-slate-200'}`} />
                   <span className={`text-[8px] font-black uppercase tracking-widest ${selectedFormula === formula ? 'text-[#B6C61A]' : 'text-slate-300'}`}>
                    {workflows[formula].length} Étapes de production
                   </span>
                </div>
                <h4 className={`text-xs font-black uppercase italic tracking-tight leading-tight transition-colors`}>
                  {formula}
                </h4>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Zone : Séquençage J+X */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-10 relative no-scrollbar">
          <div className="max-w-5xl mx-auto space-y-10 pb-32">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                   <span className="bg-[#B6C61A] text-[#006344] px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic mb-4 inline-block">Configuration Industrielle</span>
                   <h2 className="text-4xl md:text-5xl font-black text-[#006344] uppercase italic tracking-tighter leading-none">{selectedFormula}</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 italic flex items-center gap-2">
                     <ListOrdered size={14} className="text-[#B6C61A]" /> Définition de la séquence temporelle J+X
                   </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      // Sauvegarde locale pour fallback
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
                      }

                      // Sauvegarde dans Supabase (toutes les formules)
                      const payload = Object.entries(workflows).map(([formula, steps]) => ({
                        formula,
                        steps,
                      }));
                      await workflowsService.upsertMany(payload);

                      alert('Loi de workflow sauvegardée dans Supabase pour toutes les formules.');
                    } catch (e) {
                      console.error('Erreur lors de la sauvegarde des workflows', e);
                      alert('Erreur lors de la sauvegarde de la loi de workflow.');
                    }
                  }}
                  className="px-10 py-5 bg-[#006344] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-[#006344]/30 flex items-center gap-3 hover:scale-105 transition-all"
                >
                  <Save size={18} /> Sauvegarder la Loi
                </button>
             </div>

             {/* Workflow Timeline Visualization */}
             <div className="flex items-center gap-2 overflow-x-auto py-8 px-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm no-scrollbar">
                {currentSteps.map((step, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex flex-col items-center gap-2 shrink-0 group`}>
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] italic shadow-sm transition-all group-hover:scale-110 ${
                          step.pole === 'PHOTO' ? 'bg-emerald-100 text-[#006344]' : 
                          step.pole === 'FILM' ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-900 text-white'
                       }`}>
                         J+{step.day}
                       </div>
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{step.title.split(' ')[0]}</span>
                    </div>
                    {i < currentSteps.length - 1 && <ChevronRight size={14} className="text-slate-200 shrink-0" />}
                  </React.Fragment>
                ))}
             </div>

             {/* Steps Table Editor */}
             <div className="space-y-4">
                {currentSteps.map((step, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col lg:flex-row items-center gap-6">
                     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-[#006344] italic shadow-inner group-hover:bg-[#B6C61A] transition-colors shrink-0">
                       {idx + 1}
                     </div>
                     
                     <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center w-full">
                        <div className="md:col-span-4">
                           <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-2">Intitulé de la tâche</label>
                           <input 
                             value={step.title}
                             onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                             className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-tight outline-none focus:ring-2 focus:ring-[#B6C61A]"
                           />
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-2">Délai (J+X)</label>
                           <div className="relative">
                              <Clock size={12} className="absolute left-3 top-3.5 text-slate-300" />
                              <input 
                                type="number"
                                value={step.day}
                                onChange={(e) => handleUpdateStep(idx, { day: parseInt(e.target.value) })}
                                className="w-full pl-9 pr-3 py-3 bg-slate-50 border-none rounded-xl text-[11px] font-black italic outline-none text-[#006344]"
                              />
                           </div>
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-2">Département</label>
                           <select 
                             value={step.pole}
                             onChange={(e) => handleUpdateStep(idx, { pole: e.target.value as any })}
                             className="w-full p-3 bg-slate-50 border-none rounded-xl text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer"
                           >
                              <option value="PHOTO">PHOTO</option>
                              <option value="FILM">FILM</option>
                              <option value="DVD">DVD</option>
                              <option value="COM">COM</option>
                           </select>
                        </div>
                        <div className="md:col-span-3">
                           <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-2">Assigné par défaut</label>
                           <div className="relative">
                              <User size={12} className="absolute left-3 top-3.5 text-slate-300" />
                              <input 
                                value={step.assignedTo}
                                onChange={(e) => handleUpdateStep(idx, { assignedTo: e.target.value })}
                                className="w-full pl-9 pr-3 py-3 bg-slate-50 border-none rounded-xl text-[9px] font-black uppercase tracking-widest outline-none"
                              />
                           </div>
                        </div>
                        <div className="md:col-span-1 flex justify-end pt-4 md:pt-0">
                           <button onClick={() => handleDeleteStep(idx)} className="p-3 text-slate-200 hover:text-red-500 transition-colors">
                              <Trash2 size={18} />
                           </button>
                        </div>
                     </div>
                  </div>
                ))}

                <button 
                  onClick={handleAddStep}
                  className="w-full py-10 bg-white border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-[#B6C61A]/50 hover:text-[#006344] transition-all group"
                >
                   <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#B6C61A]/20 transition-all">
                      <Plus size={28} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest italic">Insérer une nouvelle unité de travail dans le pipeline</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowConfigModule;
