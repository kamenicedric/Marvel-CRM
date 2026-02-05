
import React, { useState, useEffect } from 'react';
import { Landmark, ShieldCheck, Download, PlusCircle, TrendingUp, TrendingDown, Wallet, DollarSign, History, AlertCircle, Loader2 } from 'lucide-react';
import { TeamMember } from '../../types';
import { financeService } from '../../lib/supabase.ts';

interface CyrilSpaceProps {
  member: TeamMember | null;
}

const CyrilSpace: React.FC<CyrilSpaceProps> = ({ member }) => {
  const [activeView, setActiveView] = useState<'vault' | 'ledger'>('vault');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const data = await financeService.getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const totalLiquidity = transactions.reduce((acc, t) => {
    return t.type === 'income' ? acc + Number(t.amount) : acc - Math.abs(Number(t.amount));
  }, 0);

  if (loading) return <div className="p-20 text-center flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#006344]" size={40}/><p className="mt-4 font-black uppercase text-[#006344]">Connexion Vault...</p></div>;

  return (
    <div className="w-full h-full space-y-10 animate-in fade-in duration-700 p-8">
      {/* Treasury Header */}
      <div className="bg-[#006344] p-12 rounded-[4rem] shadow-2xl relative overflow-hidden text-white flex flex-col xl:flex-row items-center justify-between gap-12 border-b-[12px] border-[#B6C61A]">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#B6C61A]/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
         <div className="relative z-10 flex items-center gap-10">
            <div className="w-24 h-24 rounded-[2rem] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
               <Landmark size={48} className="text-[#B6C61A]" />
            </div>
            <div>
               <h1 className="text-6xl font-black tracking-tighter italic uppercase leading-none">Lumina Cash</h1>
               <p className="text-[11px] font-black text-[#B6C61A] uppercase tracking-[0.5em] mt-3 italic">Vault System // Espace Cyril</p>
            </div>
         </div>
         <div className="relative z-10 flex gap-8">
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-2">Liquidité Totale</p>
               <h3 className="text-5xl font-black italic tracking-tighter leading-none tabular-nums text-[#B6C61A]">{totalLiquidity.toLocaleString()} <span className="text-xl opacity-50 italic">XAF</span></h3>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Vault Status */}
         <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-subtle border border-slate-100">
            <div className="flex items-center justify-between mb-8">
               <h4 className="text-xl font-black text-[#006344] uppercase italic tracking-tight flex items-center gap-2">
                 <History size={20} className="text-[#B6C61A]" /> Historique Récents
               </h4>
               <button className="text-[10px] font-black text-[#B6C61A] uppercase tracking-widest hover:underline">Voir tout le Grand Livre</button>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
               {transactions.map(t => (
                 <div key={t.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl group hover:border-[#B6C61A]/30 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                       </div>
                       <div>
                          <p className="font-black text-slate-900 uppercase italic tracking-tight">{t.label}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={`text-xl font-black tabular-nums ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{Number(t.amount).toLocaleString()} F
                       </p>
                    </div>
                 </div>
               ))}
               {transactions.length === 0 && <div className="text-center text-slate-400 py-10 font-bold italic">Aucune transaction enregistrée</div>}
            </div>
         </div>

         {/* Side Actions & Security */}
         <div className="space-y-8">
            <div className="bg-[#006344] p-10 rounded-[3rem] shadow-2xl text-white flex flex-col justify-center items-center text-center gap-6 relative overflow-hidden">
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#B6C61A]/10 rounded-tr-full"></div>
               <ShieldCheck size={64} className="text-[#B6C61A]" />
               <h4 className="text-2xl font-black uppercase italic tracking-tight">Sécurisation Active</h4>
               <p className="text-white/40 text-xs max-w-xs font-medium italic">Vérification neurale active. Aucun mouvement de fonds sans signature cryptographique Narcisse.</p>
               <button 
                 onClick={async () => {
                   const label = prompt("Libellé ?");
                   const amount = prompt("Montant (Positif = Entrée) ?");
                   if (label && amount) {
                     const amt = Number(amount);
                     await financeService.createTransaction({
                       label,
                       amount: Math.abs(amt),
                       type: amt > 0 ? 'income' : 'expense',
                       category: 'Manuel',
                       date: new Date().toISOString()
                     });
                     window.location.reload(); // Simple reload to refresh
                   }
                 }}
                 className="bg-[#B6C61A] text-[#006344] px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all mt-4 w-full"
               >
                  NOUVEAU DÉPÔT / RETRAIT
               </button>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dépenses/Mois</p>
                  <p className="text-3xl font-black text-[#BD3B1B] italic">
                    {transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0).toLocaleString()} F
                  </p>
               </div>
               <AlertCircle size={32} className="text-[#BD3B1B]/20" />
            </div>
         </div>
      </div>
    </div>
  );
};

export default CyrilSpace;
