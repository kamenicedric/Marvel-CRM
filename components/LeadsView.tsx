
import React from 'react';
import { Lead } from '../types';
import { 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar as CalendarIcon, 
  MoreVertical,
  Search,
  ChevronRight
} from 'lucide-react';

interface LeadsViewProps {
  leads: Lead[];
  loading: boolean;
}

const LeadsView: React.FC<LeadsViewProps> = ({ leads, loading }) => {
  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#006344]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Prospects & Leads</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Gérez vos futures opportunités de mariage.</p>
        </div>
        <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-[#006344] text-white rounded-2xl font-black shadow-lg shadow-[#006344]/20">
          <UserPlus size={18} />
          Nouveau Prospect
        </button>
      </div>

      <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Filtrer..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
           </div>
           <div className="flex gap-1 overflow-x-auto w-full no-scrollbar">
              {['Tous', 'Nouveau', 'En contact', 'Converti'].map(status => (
                <button key={status} className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-lg shrink-0">
                  {status}
                </button>
              ))}
           </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Mariage</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Coordonnées</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 font-black text-slate-900">{lead.first_name} {lead.last_name}</td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-600 italic uppercase">{lead.wedding_date || 'N/A'}</td>
                  <td className="px-6 py-5 text-xs text-slate-400">{lead.email}</td>
                  <td className="px-6 py-5">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{lead.status}</span>
                  </td>
                  <td className="px-6 py-5 text-right"><MoreVertical size={16} className="text-slate-300 ml-auto cursor-pointer" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-50">
           {leads.map((lead) => (
             <div key={lead.id} className="p-5 active:bg-slate-50 transition-all flex flex-col gap-4">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#006344] text-white rounded-xl flex items-center justify-center font-black italic">
                        {lead.first_name[0]}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase italic tracking-tight">{lead.first_name} {lead.last_name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lead.status}</p>
                      </div>
                   </div>
                   <button className="p-2 text-slate-300"><ChevronRight size={18}/></button>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <CalendarIcon size={12} className="text-[#B6C61A]"/> {lead.wedding_date || 'DATE À DÉFINIR'}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <MapPin size={12} className="text-[#B6C61A]"/> {lead.city || 'N/A'}
                   </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black text-[#006344] uppercase tracking-widest pt-2">
                   <a href={`tel:${lead.phone}`} className="flex-1 bg-slate-50 p-2 rounded-lg text-center flex items-center justify-center gap-2"><Phone size={12}/> Appeler</a>
                   <a href={`mailto:${lead.email}`} className="flex-1 bg-slate-50 p-2 rounded-lg text-center flex items-center justify-center gap-2"><Mail size={12}/> Email</a>
                </div>
             </div>
           ))}
        </div>

        {leads.length === 0 && (
          <div className="p-10 text-center text-slate-400 font-black uppercase tracking-[0.2em] italic text-[10px]">
            Aucun résultat indexé
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsView;
