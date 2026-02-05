
import React, { useState, useEffect } from 'react';
import { Lead } from '../../types.ts';
import { leadsService } from '../../lib/supabase.ts';
import { 
  Users, Plus, Search, Phone, Mail, MapPin, 
  MessageSquare, ChevronRight, X, Clock,
  TrendingUp, UserPlus, Mail as MailIcon
} from 'lucide-react';

const CRMModule: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  const fetchLeads = async () => {
    try {
      const data = await leadsService.getAll();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'Nouveau').length,
    negotiating: leads.filter(l => l.status === 'Négociation').length,
    converted: leads.filter(l => l.status === 'Converti').length
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = `${l.first_name} ${l.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Tous' || l.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Stats Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-[#006344]', bg: 'bg-[#006344]/5' },
          { label: 'Nouveaux', value: stats.new, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Négociation', value: stats.negotiating, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Taux Succès', value: '42%', icon: TrendingUp, color: 'text-[#B6C61A]', bg: 'bg-[#B6C61A]/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl md:text-3xl font-black text-slate-900 italic tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-subtle border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-6">
        <div className="relative flex-1 w-full">
          <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
          <input 
            type="text" 
            placeholder="RECHERCHER UN PROSPECT..." 
            className="pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold uppercase w-full outline-none focus:ring-4 focus:ring-[#B6C61A]/10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsNewLeadModalOpen(true)}
          className="w-full lg:w-auto bg-[#B6C61A] text-[#006344] px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all shrink-0"
        >
          <Plus size={16} /> Ajouter Lead
        </button>
      </div>

      {/* Desktop List */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Principal</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Détails Mariage</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Provenance</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statut</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-[#006344] text-xl italic shadow-sm">
                      {lead.first_name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg italic">{lead.first_name} {lead.last_name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><Mail size={12}/> {lead.email}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><Phone size={12}/> {lead.phone}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <Clock size={14} className="text-[#B6C61A]" /> {lead.wedding_date || 'DATE À DÉFINIR'}
                    </p>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      <MapPin size={12} /> {lead.city || 'N/A'}
                    </p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                    {lead.source || 'Autre'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      lead.status === 'Converti' ? 'bg-[#B6C61A]' : 
                      lead.status === 'Nouveau' ? 'bg-blue-500' : 
                      lead.status === 'Négociation' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{lead.status}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <button className="p-3 text-slate-300 hover:text-[#006344] hover:bg-white rounded-xl transition-all shadow-none hover:shadow-subtle border border-transparent hover:border-slate-100">
                    <ChevronRight size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredLeads.map(lead => (
          <div key={lead.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black italic text-[#006344]">
                {lead.first_name[0]}
              </div>
              <div className="flex-1">
                <h4 className="font-black text-slate-900 uppercase italic tracking-tight">{lead.first_name} {lead.last_name}</h4>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lead.status} • {lead.source}</p>
              </div>
              <button className="p-2 text-slate-300"><ChevronRight size={18}/></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 border-t border-slate-50 pt-4">
               <div className="flex items-center gap-2"><Clock size={12} className="text-[#B6C61A]"/> {lead.wedding_date || 'DATE TBD'}</div>
               <div className="flex items-center gap-2"><MapPin size={12} className="text-[#B6C61A]"/> {lead.city || 'N/A'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* New Lead Modal */}
      {isNewLeadModalOpen && (
        <NewLeadModal 
          onClose={() => setIsNewLeadModalOpen(false)} 
          onSave={async (lead) => {
            await leadsService.create(lead);
            fetchLeads();
            setIsNewLeadModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

const NewLeadModal = ({ onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    wedding_date: '',
    city: '',
    source: 'Instagram',
    status: 'Nouveau'
  });

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-[#006344]/80 backdrop-blur-sm" onClick={onClose}></div>
       <div className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="text-xl font-black text-[#006344] uppercase italic">Nouveau Prospect</h3>
             <button onClick={onClose} className="p-2"><X /></button>
          </div>
          <div className="p-8 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <input placeholder="Prénom" className="p-4 bg-slate-50 border border-slate-200 rounded-xl" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                <input placeholder="Nom" className="p-4 bg-slate-50 border border-slate-200 rounded-xl" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
             </div>
             <input placeholder="Email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
             <input placeholder="Téléphone" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
             <div className="grid grid-cols-2 gap-4">
                <input type="date" className="p-4 bg-slate-50 border border-slate-200 rounded-xl" value={formData.wedding_date} onChange={e => setFormData({...formData, wedding_date: e.target.value})} />
                <input placeholder="Ville" className="p-4 bg-slate-50 border border-slate-200 rounded-xl" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
             </div>
          </div>
          <div className="p-6 bg-slate-50 flex gap-4">
             <button onClick={onClose} className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Annuler</button>
             <button onClick={() => onSave(formData)} className="flex-1 py-4 bg-[#006344] text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-[#006344]/20">Enregistrer</button>
          </div>
       </div>
    </div>
  );
};

export default CRMModule;
