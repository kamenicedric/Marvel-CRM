
import React, { useState, useEffect } from 'react';
import { projectsService } from '../../lib/supabase.ts';
import { 
  Receipt, Plus, Download, Wallet, Eye, DollarSign,
  TrendingUp, TrendingDown, AlertTriangle, Clock
} from 'lucide-react';

const FacturesModule: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const projects = await projectsService.getAll();
        // Compute invoices from projects (as long as dedicated table is empty)
        const computedInvoices = projects.map(p => ({
          id: `F-${p.id.substring(0,4).toUpperCase()}`,
          client: p.couple,
          total: Number(p.amount) || 0,
          paid: (Number(p.amount) * (p.progress / 100)) || 0, // Mocked payment link for demo
          due: p.wedding_date,
          status: p.progress === 100 ? 'Payé' : (p.progress > 0 ? 'Partiel' : 'Impayé')
        }));
        setInvoices(computedInvoices);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinances();
  }, []);

  const stats = {
    ca: invoices.reduce((acc, inv) => acc + inv.total, 0),
    collected: invoices.reduce((acc, inv) => acc + inv.paid, 0),
    pending: invoices.reduce((acc, inv) => acc + (inv.total - inv.paid), 0)
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-[#006344]">Chargement du Grand Livre...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-[#006344] uppercase italic tracking-tighter leading-tight">Finance & Facturation</h2>
          <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Trésorerie // Suivi des Règlements</p>
        </div>
        <button className="w-full sm:w-auto bg-[#B6C61A] text-[#006344] px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
          <Plus size={18} /> Nouvelle Facture
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {[
          { label: 'Chiffre d\'Affaires', value: `${(stats.ca / 1000).toFixed(1)}k F`, icon: TrendingUp, color: '#006344' },
          { label: 'Encaissements', value: `${(stats.collected / 1000).toFixed(1)}k F`, icon: Wallet, color: '#B6C61A' },
          { label: 'Reste à Percevoir', value: `${(stats.pending / 1000).toFixed(1)}k F`, icon: AlertTriangle, color: '#BD3B1B' },
          { label: 'Projets Facturés', value: invoices.length, icon: Receipt, color: '#D8A800' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-subtle flex flex-col items-center text-center">
            <div className="p-3 bg-slate-50 rounded-xl mb-4" style={{ color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-xl md:text-3xl font-black italic tracking-tighter" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
           <h3 className="font-black text-slate-900 uppercase italic tracking-widest text-xs flex items-center gap-2">
             <Receipt size={18} className="text-[#B6C61A]" /> Grand Livre de Facturation
           </h3>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Sync</span>
           </div>
        </div>
        
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Facture</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Total</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progression Paye</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => {
                const progress = (inv.paid / inv.total) * 100 || 0;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-10 py-8">
                      <span className="text-sm font-black text-[#006344] bg-[#006344]/5 px-3 py-1.5 rounded-lg border border-[#006344]/10 italic">{inv.id}</span>
                    </td>
                    <td className="px-10 py-8">
                      <span className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{inv.client}</span>
                    </td>
                    <td className="px-10 py-8 text-lg font-black text-slate-900 tabular-nums">
                      {inv.total.toLocaleString()} F
                    </td>
                    <td className="px-10 py-8">
                      <div className="w-48">
                         <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              {inv.paid.toLocaleString()} F encaissés
                            </span>
                            <span className="text-[10px] font-black text-slate-900">{progress.toFixed(0)}%</span>
                         </div>
                         <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-[#B6C61A]' : 'bg-[#006344]'}`} 
                              style={{ width: `${progress}%` }} 
                            />
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#006344] shadow-sm"><Eye size={16} /></button>
                         <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-500 shadow-sm"><DollarSign size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-50">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-5 flex flex-col gap-4">
               <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-[#006344] bg-[#006344]/5 px-2 py-1 rounded-md italic uppercase">{inv.id}</span>
                    <h4 className="text-lg font-black text-slate-900 uppercase italic mt-2">{inv.client}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{inv.total.toLocaleString()} F</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Echéance: {inv.due}</p>
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                     <span className="text-slate-400">{inv.paid.toLocaleString()} F payés</span>
                     <span className="text-[#006344]">{( (inv.paid/inv.total)*100 || 0 ).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                     <div className="h-full bg-[#006344]" style={{ width: `${(inv.paid/inv.total)*100 || 0}%` }} />
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacturesModule;
