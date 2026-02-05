
import React from 'react';
import { X, Heart, Calendar, Package, Sparkles, MessageSquare, MapPin, Clock, BadgeCheck } from 'lucide-react';
import { WeddingProject } from '../../types';

interface ProjectQuickViewProps {
  isOpen: boolean;
  onClose: () => void;
  project: WeddingProject | null;
}

const ProjectQuickView: React.FC<ProjectQuickViewProps> = ({ isOpen, onClose, project }) => {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#006344]/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="bg-[#006344] p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-[#B6C61A] font-black italic text-2xl border border-white/10">
              {project.couple[0]}
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{project.couple}</h2>
              <div className="flex items-center gap-3 mt-2 text-[10px] font-black uppercase tracking-widest text-[#B6C61A]">
                <BadgeCheck size={14} /> Fiche de Production Validée
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
          
          {/* Ligne Infos Clés */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Date du Mariage</p>
              <div className="flex items-center gap-2 font-black text-[#006344] italic">
                <Calendar size={16} className="text-[#B6C61A]" />
                {new Date(project.weddingDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Gamme Client</p>
              <div className="flex items-center gap-2 font-black text-[#006344] italic uppercase">
                <Package size={16} className="text-[#B6C61A]" />
                {project.packageType || 'CLASSIQUE'}
              </div>
            </div>
          </div>

          {/* Formule & Workflow */}
          <div className="space-y-3">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
               <Clock size={14} className="text-[#B6C61A]"/> Workflow de Production
             </p>
             <div className="p-6 bg-slate-900 rounded-3xl text-[#B6C61A] font-black italic text-sm border border-[#B6C61A]/20 shadow-lg uppercase">
               {project.formula}
             </div>
          </div>

          {/* Options choisies */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
              <Sparkles size={14} className="text-[#B6C61A]"/> Options & Accessoires activés
            </p>
            <div className="flex flex-wrap gap-2">
              {project.options && project.options.length > 0 ? (
                project.options.map((opt, i) => (
                  <span key={i} className="px-4 py-2 bg-emerald-50 text-[#006344] border border-emerald-100 rounded-xl text-[9px] font-black uppercase italic shadow-sm">
                    {opt}
                  </span>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune option supplémentaire détectée.</p>
              )}
            </div>
          </div>

          {/* Notes Client */}
          {project.clientNotes && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                <MessageSquare size={14} className="text-[#B6C61A]"/> Instructions Spécifiques
              </p>
              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 italic text-slate-600 text-sm leading-relaxed font-medium">
                "{project.clientNotes}"
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] italic">Marvel Intelligence System // Standard S++</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectQuickView;
