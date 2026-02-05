
import React, { useState, useEffect } from 'react';
import { invoicesService } from '../../lib/supabase.ts';
import { 
  Receipt, Plus, Download, Wallet, Eye, DollarSign,
  TrendingUp, TrendingDown, AlertTriangle, Clock
} from 'lucide-react';

const normalizeInvoice = (inv: any) => ({
  ...inv,
  total: Number(inv.total) || 0,
  paid: Number(inv.paid) || 0,
});

const FacturesModule: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState<{ client: string; total: number; paid: number; due: string }>({
    client: '',
    total: 0,
    paid: 0,
    due: ''
  });

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const rows = await invoicesService.getAll();
        setInvoices(rows.map(normalizeInvoice));
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

  const handleOpenNewInvoice = () => {
    setNewInvoiceForm({ client: '', total: 0, paid: 0, due: '' });
    setShowNewInvoiceModal(true);
  };

  const handleCreateInvoice = async () => {
    if (!newInvoiceForm.client || !newInvoiceForm.total) {
      alert('Renseigne au moins le client et le montant.');
      return;
    }
    const status =
      newInvoiceForm.paid >= newInvoiceForm.total
        ? 'Payé'
        : newInvoiceForm.paid > 0
        ? 'Partiel'
        : 'Impayé';
    try {
      const created = await invoicesService.create({
        client: newInvoiceForm.client,
        total: newInvoiceForm.total,
        paid: newInvoiceForm.paid,
        due: newInvoiceForm.due || null,
        status,
      });
      setInvoices(prev => [normalizeInvoice(created), ...prev]);
      setShowNewInvoiceModal(false);
    } catch (err) {
      console.error('Erreur création facture', err);
      alert('Erreur lors de la création de la facture.');
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    const target = invoices.find(inv => inv.id === invoiceId);
    if (!target) return;
    try {
      const updated = await invoicesService.update(invoiceId, { paid: target.total, status: 'Payé' });
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? normalizeInvoice(updated) : inv));
    } catch (err) {
      console.error('Erreur mise à jour facture', err);
      alert('Erreur lors de la mise à jour de la facture.');
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-[#006344]">Chargement du Grand Livre...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-[#006344] uppercase italic tracking-tighter leading-tight">Finance & Facturation</h2>
          <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Trésorerie // Suivi des Règlements</p>
        </div>
        <button 
          onClick={handleOpenNewInvoice}
          className="w-full sm:w-auto bg-[#B6C61A] text-[#006344] px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
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
                         <button
                           onClick={() => {
                             setSelectedInvoice(inv);
                             setShowInvoiceModal(true);
                           }}
                           className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#006344] shadow-sm"
                         >
                           <Eye size={16} />
                         </button>
                         <button
                           onClick={() => handleMarkAsPaid(inv.id)}
                           className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-500 shadow-sm"
                         >
                           <DollarSign size={16} />
                         </button>
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

      {/* Modal détail facture */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-[#006344] uppercase italic flex items-center gap-2">
                <Receipt size={18} /> Facture {selectedInvoice.id}
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
              >
                Fermer
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-black text-slate-500 uppercase text-[10px] mr-2">Client</span>{selectedInvoice.client}</p>
              <p><span className="font-black text-slate-500 uppercase text-[10px] mr-2">Montant</span>{selectedInvoice.total.toLocaleString()} F</p>
              <p><span className="font-black text-slate-500 uppercase text-[10px] mr-2">Payé</span>{selectedInvoice.paid.toLocaleString()} F</p>
              <p><span className="font-black text-slate-500 uppercase text-[10px] mr2">Échéance</span>{selectedInvoice.due}</p>
              <p><span className="font-black text-slate-500 uppercase text-[10px] mr-2">Statut</span>{selectedInvoice.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouvelle facture */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-[#006344] uppercase italic flex items-center gap-2">
                <Plus size={18} /> Nouvelle facture
              </h3>
              <button
                onClick={() => setShowNewInvoiceModal(false)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
              >
                Fermer
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client</label>
                <input
                  value={newInvoiceForm.client}
                  onChange={e => setNewInvoiceForm({ ...newInvoiceForm, client: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B6C61A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montant total</label>
                  <input
                    type="number"
                    value={newInvoiceForm.total}
                    onChange={e => setNewInvoiceForm({ ...newInvoiceForm, total: Number(e.target.value || 0) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B6C61A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Acompte payé</label>
                  <input
                    type="number"
                    value={newInvoiceForm.paid}
                    onChange={e => setNewInvoiceForm({ ...newInvoiceForm, paid: Number(e.target.value || 0) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B6C61A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Échéance (optionnel)</label>
                <input
                  type="date"
                  value={newInvoiceForm.due}
                  onChange={e => setNewInvoiceForm({ ...newInvoiceForm, due: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B6C61A]"
                />
              </div>
            </div>
            <button
              onClick={handleCreateInvoice}
              className="w-full mt-2 bg-[#006344] text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
            >
              Créer la facture
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturesModule;
