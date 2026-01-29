
import React, { useState, useEffect } from 'react';
import { Search, X, Command, Heart, Users, FileText, CheckCircle2, Star } from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: any) => void;
}

export const SearchTrigger = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all group"
  >
    <Search size={16} />
    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Recherche Globale</span>
    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-mono hidden md:block group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors">⌘K</span>
  </button>
);

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-top-4 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <Search size={24} className="text-[#006344]" />
          <input 
            autoFocus
            type="text" 
            placeholder="Rechercher projets, leads, factures..." 
            className="flex-1 bg-transparent border-none outline-none text-xl font-black uppercase tracking-tight placeholder:text-slate-300"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {query.length === 0 ? (
            <div className="space-y-4">
              <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Récemment consultés</p>
              <div className="space-y-1">
                <button className="w-full p-4 rounded-2xl hover:bg-[#006344]/5 flex items-center gap-4 group transition-all text-left border border-transparent hover:border-[#B6C61A]/30">
                  <div className="w-10 h-10 bg-[#B6C61A]/20 text-[#006344] rounded-xl flex items-center justify-center shadow-sm"><Star size={20} className="fill-[#006344]" /></div>
                  <div>
                    <p className="font-black text-slate-900 uppercase italic">Brise-Marine & Gordini</p>
                    <p className="text-[10px] font-bold text-[#006344] uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-[#B6C61A] rounded-full animate-pulse"></span>
                       Projet Actif // Pôle Film en cours
                    </p>
                  </div>
                </button>
                <button className="w-full p-4 rounded-2xl hover:bg-slate-50 flex items-center gap-4 group transition-colors text-left opacity-60">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center"><Heart size={20} /></div>
                  <div>
                    <p className="font-black text-slate-900 uppercase italic">Sophie & Pierre</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mariage // Cameroun</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button className="w-full p-4 rounded-2xl bg-[#006344]/5 border border-[#B6C61A]/20 flex items-center gap-4 group transition-colors text-left">
                <div className="w-10 h-10 bg-[#006344] text-white rounded-xl flex items-center justify-center shadow-lg"><Heart size={20} /></div>
                <div>
                  <p className="font-black text-slate-900 uppercase italic">Brise-Marine & Gordini</p>
                  <p className="text-[10px] font-bold text-[#006344] uppercase tracking-widest">Dossier de Mariage // Indexé</p>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
           <div className="flex gap-4">
             <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
               <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">TAB</span> Naviguer
             </div>
             <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
               <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">ENTER</span> Sélectionner
             </div>
           </div>
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Marvel Indexer v4.2</p>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
