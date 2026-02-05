
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  PieChart as PieChartIcon, Save, Search, AlertCircle,
  ArrowUpRight, ArrowDownRight, Filter, Calculator,
  Calendar, CalendarDays, CalendarRange, Layers,
  Banknote, Target, Settings2, Receipt, ArrowRight,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { projectsService } from '../../lib/supabase';
import { WeddingProject } from '../../types';

// Composant Carte KPI (Style Sandra)
const KpiCard = ({ label, value, icon, color, subValue }: any) => (
  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all relative overflow-hidden">
    <div className={`absolute top-0 right-0 p-8 md:p-10 opacity-[0.03] ${color.replace('text-', 'text-')}`}>
        {icon}
    </div>
    <div className="flex justify-between items-start relative z-10">
      <div className={`p-3 md:p-4 rounded-2xl bg-slate-50 transition-colors group-hover:bg-slate-100`}>
        {React.cloneElement(icon, { size: 24, className: color })}
      </div>
      {subValue && (
          <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest py-1 px-2 rounded-lg bg-slate-50 ${color}`}>
              {subValue}
          </span>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2 italic">{label}</p>
      <p className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-900 tabular-nums break-words">
        {value} <span className="text-xs md:text-sm text-slate-300 not-italic font-normal">FCFA</span>
      </p>
    </div>
  </div>
);

// Composant Objectifs (Style Sandra)
const GoalSettingCard = ({ revenue, goalRev, profit, goalProf, onUpdateRev, onUpdateProf }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const revProg = Math.min(100, Math.round((revenue / goalRev) * 100));
  const profProg = Math.min(100, Math.round((profit / goalProf) * 100));

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between group h-full relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#006344] to-[#B6C61A]"></div>
       <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-3">
               <Target size={20} className="text-[#006344]" />
               <p className="text-[10px] font-black text-slate-900 uppercase italic tracking-widest">Objectifs Financiers</p>
           </div>
           <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-300 hover:text-[#006344] transition-colors"><Settings2 size={18}/></button>
       </div>
       
       <div className="space-y-8">
          <div>
              <div className="flex justify-between text-[8px] md:text-[9px] font-black uppercase mb-2 tracking-widest flex-wrap gap-2">
                  <span className="text-[#006344]">Chiffre d'Affaires ({revProg}%)</span>
                  <span className="text-slate-400">{revenue.toLocaleString()} / {goalRev.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-[#006344] transition-all duration-1000 shadow-[0_0_15px_#00634450]" style={{width: `${revProg}%`}}></div>
              </div>
          </div>
          <div>
              <div className="flex justify-between text-[8px] md:text-[9px] font-black uppercase mb-2 tracking-widest flex-wrap gap-2">
                  <span className="text-[#B6C61A]">Marge Nette ({profProg}%)</span>
                  <span className="text-slate-400">{profit.toLocaleString()} / {goalProf.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-[#B6C61A] transition-all duration-1000 shadow-[0_0_15px_#B6C61A50]" style={{width: `${profProg}%`}}></div>
              </div>
          </div>
       </div>

       {isOpen && (
         <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] space-y-6 animate-in fade-in slide-in-from-top-4 border border-slate-100">
            <div className="space-y-3">
               <label className="text-[8px] font-bold text-slate-400 uppercase flex justify-between tracking-widest flex-wrap">Cible CA <span>{goalRev.toLocaleString()} F</span></label>
               <input type="range" min="1000000" max="50000000" step="500000" value={goalRev} onChange={e => onUpdateRev(Number(e.target.value))} className="w-full accent-[#006344] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div className="space-y-3">
               <label className="text-[8px] font-bold text-slate-400 uppercase flex justify-between tracking-widest flex-wrap">Cible Marge <span>{goalProf.toLocaleString()} F</span></label>
               <input type="range" min="500000" max="25000000" step="100000" value={goalProf} onChange={e => onUpdateProf(Number(e.target.value))} className="w-full accent-[#B6C61A] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
            </div>
         </div>
       )}
    </div>
  );
};

const GlobalFinanceModule: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCost, setTempCost] = useState<string>('');
  
  // États de filtres et objectifs
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year' | 'all'>('year');
  const [revenueGoal, setRevenueGoal] = useState(25000000); // 25M par défaut
  const [profitGoal, setProfitGoal] = useState(15000000); // 15M par défaut

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectsService.getAll();
      const enrichedData = data.map((p: any) => ({
        ...p,
        production_cost: p.production_cost || 0 
      }));
      setProjects(enrichedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleUpdateCost = async (id: string) => {
    const cost = parseFloat(tempCost);
    if (isNaN(cost)) return;

    try {
      await projectsService.update(id, { production_cost: cost });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, production_cost: cost } : p));
      setEditingId(null);
    } catch (err) {
      console.error("Erreur mise à jour finance", err);
      alert("Erreur de sauvegarde");
    }
  };

  // --- FILTRE TEMPOREL ET PAYS ---
  const filteredProjects = useMemo(() => {
    const now = new Date();
    
    return projects.filter(p => {
      const isCameroun = (p.country || '').toLowerCase().includes('cameroun');
      if (!isCameroun) return false;

      const matchesSearch = p.couple.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const date = new Date(p.weddingDate);
      if (timeFilter === 'all') return true;
      if (timeFilter === 'year') return date.getFullYear() === now.getFullYear();
      if (timeFilter === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (timeFilter === 'week') {
        const startOfWeek = new Date(now);
        const day = now.getDay() || 7; 
        if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
        else startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        return date >= startOfWeek && date <= endOfWeek;
      }
      return true;
    }).sort((a, b) => new Date(a.weddingDate).getTime() - new Date(b.weddingDate).getTime());
  }, [projects, searchTerm, timeFilter]);

  // --- STATISTIQUES ---
  const stats = useMemo(() => {
    const totalCA = filteredProjects.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalExpenses = filteredProjects.reduce((acc, p) => acc + (Number(p.production_cost) || 0), 0);
    const totalNet = totalCA - totalExpenses;
    const marginRate = totalCA > 0 ? (totalNet / totalCA) * 100 : 0;

    return { totalCA, totalExpenses, totalNet, marginRate };
  }, [filteredProjects]);

  // --- DONNÉES GRAPHIQUE ---
  const chartData = useMemo(() => {
    return filteredProjects
      .filter(p => Number(p.amount) > 0)
      .slice(0, 15)
      .map(p => ({
        name: p.couple.split(' & ')[0],
        ca: Number(p.amount),
        cout: Number(p.production_cost),
        net: Number(p.amount) - Number(p.production_cost)
      }));
  }, [filteredProjects]);

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-6">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#006344]"></div>
      <p className="text-[#006344] font-black uppercase tracking-[0.3em] animate-pulse">Synchronisation Trésorerie Manaja...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 md:space-y-10 animate-in fade-in duration-700 pb-24 max-w-[1800px] mx-auto">
      
      {/* HEADER & FILTRES */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 md:gap-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-[#006344] uppercase italic tracking-tighter leading-none">Finance Mariages</h2>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 italic flex items-center gap-2">
            <Calculator size={14} className="text-[#B6C61A]" /> Cameroun Division Only
          </p>
        </div>
        
        <div className="bg-white p-2 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex items-center overflow-x-auto no-scrollbar max-w-full">
           {[
             { id: 'week', label: 'Semaine', icon: CalendarDays },
             { id: 'month', label: 'Mois', icon: Calendar },
             { id: 'year', label: 'Année', icon: CalendarRange },
             { id: 'all', label: 'Global', icon: Layers }
           ].map((t) => (
             <button
               key={t.id}
               onClick={() => setTimeFilter(t.id as any)}
               className={`px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2 md:gap-3 transition-all whitespace-nowrap ${
                 timeFilter === t.id 
                   ? 'bg-[#006344] text-white shadow-xl scale-105' 
                   : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
               }`}
             >
               <t.icon size={14} /> {t.label}
             </button>
           ))}
        </div>
      </div>

      {/* HERO SECTION : TRÉSORERIE */}
      <div className="bg-[#006344] p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden text-white flex flex-col xl:flex-row items-center justify-between gap-8 md:gap-12 border-b-[8px] md:border-b-[12px] border-[#B6C61A]">
         <div className="absolute top-0 right-0 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-[#B6C61A]/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
         <div className="relative z-10 flex items-center gap-6 md:gap-10 self-start xl:self-center">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-3xl md:rounded-[2.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
               <Banknote size={32} className="text-[#B6C61A] md:hidden" />
               <Banknote size={48} className="text-[#B6C61A] hidden md:block" />
            </div>
            <div>
               <h1 className="text-3xl md:text-7xl font-black tracking-tighter italic uppercase leading-none">Trésorerie Nette</h1>
               <p className="text-[9px] md:text-[11px] font-black text-[#B6C61A] uppercase tracking-[0.4em] mt-2 md:mt-3 italic">Bilan Financier Mariages</p>
            </div>
         </div>
         <div className="relative z-10 text-right self-end xl:self-center">
            <p className="text-[8px] md:text-[10px] font-black uppercase text-white/40 tracking-[0.3em] mb-2">Résultat Net Période</p>
            <h3 className="text-4xl md:text-8xl font-black italic tracking-tighter leading-none tabular-nums text-white drop-shadow-lg">
              {stats.totalNet.toLocaleString()} <span className="text-lg md:text-3xl text-[#B6C61A] opacity-80">FCFA</span>
            </h3>
         </div>
      </div>

      {/* KPI & OBJECTIFS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
         <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard label="Chiffre d'Affaires" value={stats.totalCA.toLocaleString()} icon={<Wallet />} color="text-[#006344]" subValue={`+${filteredProjects.length} Dossiers`} />
            <KpiCard label="Coûts Production" value={stats.totalExpenses.toLocaleString()} icon={<ArrowDownRight />} color="text-[#BD3B1B]" subValue="Dépenses Directes" />
            <KpiCard label="Taux de Marge" value={`${stats.marginRate.toFixed(1)}%`} icon={<PieChartIcon />} color="text-[#B6C61A]" subValue="Rentabilité" />
            
            <div className="md:col-span-3 bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden h-[300px] md:h-[350px]">
               <div className="flex items-center justify-between mb-6 px-2">
                  <h4 className="text-base md:text-lg font-black text-slate-900 uppercase italic flex items-center gap-3">
                    <TrendingUp size={18} className="text-[#006344]" /> Analyse Rentabilité
                  </h4>
                  <div className="flex gap-3 md:gap-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest">
                     <span className="flex items-center gap-1 md:gap-2"><div className="w-2 h-2 rounded-full bg-[#006344]"></div> Recette</span>
                     <span className="flex items-center gap-1 md:gap-2"><div className="w-2 h-2 rounded-full bg-[#BD3B1B]"></div> Coût</span>
                  </div>
               </div>
               <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={chartData} barGap={4} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} width={40} />
                     <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'}} cursor={{fill: '#f8fafc', radius: 10}} />
                     <Bar dataKey="ca" fill="#006344" radius={[6, 6, 6, 6]} barSize={12} />
                     <Bar dataKey="cout" fill="#BD3B1B" radius={[6, 6, 6, 6]} barSize={12} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="lg:col-span-4 h-full">
            <GoalSettingCard 
              revenue={stats.totalCA} goalRev={revenueGoal}
              profit={stats.totalNet} goalProf={profitGoal}
              onUpdateRev={setRevenueGoal} onUpdateProf={setProfitGoal}
            />
         </div>
      </div>

      {/* TABLEAU "GRAND LIVRE" */}
      <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
         <div className="p-6 md:p-10 border-b border-slate-50 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 md:gap-8 bg-slate-50/30">
            <div className="flex items-center gap-4 md:gap-6">
               <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-[1.2rem] md:rounded-[1.5rem] border border-slate-100 flex items-center justify-center text-[#006344] shadow-sm">
                  <Receipt size={24} className="md:hidden" />
                  <Receipt size={32} className="hidden md:block" />
               </div>
               <div>
                  <h3 className="text-xl md:text-2xl font-black text-[#006344] uppercase italic tracking-tight">Grand Livre</h3>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 md:mt-2">Saisie des coûts</p>
               </div>
            </div>
            
            <div className="relative w-full max-w-lg group">
               <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#B6C61A] transition-colors" />
               <input 
                  type="text" 
                  placeholder="RECHERCHER UN COUPLE DANS LE REGISTRE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-14 pr-6 py-4 bg-white rounded-[2rem] border border-slate-200 text-[10px] md:text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-[#006344]/10 transition-all shadow-sm"
               />
            </div>
         </div>

         {/* Vue Bureau (Tableau) */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/3">Dossier & Date</th>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Recette (CA)</th>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Coût Prod.</th>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Marge Nette</th>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">ROI</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filteredProjects.map((p) => {
                     const isEditing = editingId === p.id;
                     const net = (Number(p.amount) || 0) - (Number(p.production_cost) || 0);
                     const roi = Number(p.amount) > 0 ? (net / Number(p.amount)) * 100 : 0;

                     return (
                        <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="px-10 py-6">
                              <div className="flex items-center gap-5">
                                 <div className="w-12 h-12 rounded-[1.2rem] bg-[#006344]/10 text-[#006344] flex items-center justify-center font-black italic text-lg shadow-sm group-hover:bg-[#006344] group-hover:text-white transition-colors">
                                    {p.couple.substring(0, 1)}
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{p.couple}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                      <Calendar size={10} /> {new Date(p.weddingDate).toLocaleDateString()}
                                    </p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-10 py-6 text-right">
                              <span className="text-lg font-black text-slate-900 tabular-nums italic tracking-tight">{(Number(p.amount) || 0).toLocaleString()} <span className="text-xs text-slate-300 font-normal">F</span></span>
                           </td>
                           <td className="px-10 py-6 text-right">
                              {isEditing ? (
                                 <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-4">
                                    <input 
                                       autoFocus
                                       type="number" 
                                       value={tempCost}
                                       onChange={(e) => setTempCost(e.target.value)}
                                       className="w-32 py-3 px-4 bg-white border-2 border-[#BD3B1B] rounded-xl text-right font-black text-[#BD3B1B] outline-none text-sm shadow-lg"
                                    />
                                    <button onClick={() => handleUpdateCost(p.id)} className="p-3 bg-[#006344] text-white rounded-xl hover:scale-110 transition-transform shadow-lg"><Save size={16}/></button>
                                 </div>
                              ) : (
                                 <div 
                                    onClick={() => { setEditingId(p.id); setTempCost(p.production_cost?.toString() || '0'); }}
                                    className="cursor-pointer group/edit flex items-center justify-end gap-3 px-4 py-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                                 >
                                    <span className="text-lg font-black text-[#BD3B1B] tabular-nums italic tracking-tight">
                                       -{(Number(p.production_cost) || 0).toLocaleString()} <span className="text-xs opacity-40 font-normal">F</span>
                                    </span>
                                    <div className="opacity-0 group-hover/edit:opacity-100 text-slate-400"><ArrowRight size={14}/></div>
                                 </div>
                              )}
                           </td>
                           <td className="px-10 py-6 text-right">
                              <span className={`text-lg font-black tabular-nums italic tracking-tight ${net > 0 ? 'text-[#006344]' : 'text-[#BD3B1B]'}`}>
                                 {net > 0 ? '+' : ''}{net.toLocaleString()} <span className="text-xs opacity-40 font-normal">F</span>
                              </span>
                           </td>
                           <td className="px-10 py-6 text-center">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest border ${roi > 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : roi > 20 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                 {roi.toFixed(0)}%
                              </span>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>

         {/* Vue Mobile (Cartes) */}
         <div className="block md:hidden p-4 space-y-4 bg-slate-50/50">
            {filteredProjects.map((p) => {
               const isEditing = editingId === p.id;
               const net = (Number(p.amount) || 0) - (Number(p.production_cost) || 0);
               const roi = Number(p.amount) > 0 ? (net / Number(p.amount)) * 100 : 0;

               return (
                 <div key={p.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#006344]/10 text-[#006344] flex items-center justify-center font-black italic shadow-sm">
                             {p.couple.substring(0, 1)}
                          </div>
                          <div>
                             <h4 className="text-sm font-black text-slate-900 uppercase italic leading-tight">{p.couple}</h4>
                             <p className="text-[9px] font-bold text-slate-400">{new Date(p.weddingDate).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase italic border ${roi > 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          ROI {roi.toFixed(0)}%
                       </span>
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recette</span>
                          <span className="text-sm font-black text-[#006344] italic">{(Number(p.amount) || 0).toLocaleString()} F</span>
                       </div>

                       <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                          <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Coût Prod</span>
                          {isEditing ? (
                             <div className="flex items-center gap-2">
                                <input 
                                   autoFocus
                                   type="number" 
                                   value={tempCost}
                                   onChange={(e) => setTempCost(e.target.value)}
                                   className="w-24 py-1 px-2 bg-white border border-red-300 rounded-lg text-right font-black text-red-600 outline-none text-sm"
                                />
                                <button onClick={() => handleUpdateCost(p.id)} className="p-1.5 bg-[#006344] text-white rounded-lg shadow-sm"><Save size={14}/></button>
                             </div>
                          ) : (
                             <div onClick={() => { setEditingId(p.id); setTempCost(p.production_cost?.toString() || '0'); }} className="flex items-center gap-2 cursor-pointer">
                                <span className="text-sm font-black text-red-500 italic">-{(Number(p.production_cost) || 0).toLocaleString()} F</span>
                                <Edit2 size={12} className="text-red-300" />
                             </div>
                          )}
                       </div>

                       <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Net Final</span>
                          <span className={`text-xl font-black italic tracking-tighter ${net > 0 ? 'text-[#006344]' : 'text-red-500'}`}>
                             {net > 0 ? '+' : ''}{net.toLocaleString()} <span className="text-xs font-normal opacity-50">FCFA</span>
                          </span>
                       </div>
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};

// Petite icône d'édition manquante dans les imports, ajoutée ici pour le contexte mobile
import { Edit2 } from 'lucide-react';

export default GlobalFinanceModule;
