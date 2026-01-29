import React from 'react';
import { 
  ClipboardList, Plus, Check, X, Calendar, Users,
  Camera, Video, Share2, Edit3, Trash2, Copy,
  ChevronDown, ChevronRight, Clock, AlertCircle, Sparkles
} from 'lucide-react';

const RoutineModule: React.FC = () => {
  const templates = [
    { id: '1', title: 'Préparation Technique Photo', pole: 'PHOTO', steps: 12, complexity: 'Standard' },
    { id: '2', title: 'Checklist Jour J - Équipe Vidéo', pole: 'FILM', steps: 24, complexity: 'Haute' },
    { id: '3', title: 'Workflow Post-Production Standard', pole: 'DVD', steps: 8, complexity: 'Basse' },
    { id: '4', title: 'Protocole Livraison & Com', pole: 'COM', steps: 15, complexity: 'Standard' }
  ];

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-[#006344] uppercase italic tracking-tighter">Standards Opérationnels (SOP)</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Routines // Protocoles Qualité Marvel</p>
        </div>
        <button className="bg-[#006344] text-[#B6C61A] px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95">
          <Plus size={18} /> Créer Protocole
        </button>
      </div>

      <div className="bg-[#006344] p-12 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -mr-48 -mt-48"></div>
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
               <span className="bg-[#B6C61A] text-[#006344] px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] italic">IA Intelligence</span>
               <h3 className="text-5xl font-black italic tracking-tighter leading-none">Générer une Routine <br/>automatique ?</h3>
               <p className="text-white/60 text-lg font-medium leading-relaxed max-w-md">
                 Notre IA peut analyser vos anciens projets pour créer le workflow parfait adapté à votre équipe actuelle.
               </p>
               <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3">
                 <Sparkles size={20} className="text-[#B6C61A]" /> Lancer Analyse IA
               </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
               {[
                 { label: 'Efficacité', value: '+34%', icon: Clock },
                 { label: 'Erreurs', value: '-82%', icon: AlertCircle }
               ].map((k, i) => (
                 <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2.5rem] text-center">
                   <k.icon size={32} className="mx-auto mb-4 text-[#B6C61A]" />
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{k.label}</p>
                   <p className="text-4xl font-black italic">{k.value}</p>
                 </div>
               ))}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-subtle hover:border-[#B6C61A]/50 transition-all group cursor-pointer relative overflow-hidden">
            <div className="absolute top-10 right-10 p-4 bg-slate-50 rounded-2xl text-slate-200 group-hover:text-[#006344] transition-colors">
              <Copy size={24} />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                t.pole === 'PHOTO' ? 'bg-[#006344]/5 text-[#006344]' : 
                t.pole === 'FILM' ? 'bg-[#BD3B1B]/5 text-[#BD3B1B]' : 'bg-[#D8A800]/5 text-[#D8A800]'
              }`}>
                Pôle {t.pole}
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t.steps} ÉTAPES</div>
            </div>

            <h4 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight mb-8 group-hover:text-[#006344] transition-colors">{t.title}</h4>
            
            <div className="flex items-center justify-between pt-8 border-t border-slate-50">
               <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${t.complexity === 'Haute' ? 'bg-red-500' : t.complexity === 'Standard' ? 'bg-[#D8A800]' : 'bg-[#B6C61A]'}`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complexité {t.complexity}</span>
               </div>
               <div className="flex items-center gap-2 text-[#006344] font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                 Déployer Routine <ChevronRight size={14} />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoutineModule;