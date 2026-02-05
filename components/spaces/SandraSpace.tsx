
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, Wallet, TrendingDown, List, Zap, Plus, Search, 
  Calendar, MapPin, Clock, CheckCircle2, MoreVertical, 
  Image as ImageIcon, Filter, ChevronDown, ChevronUp,
  AlertCircle, DollarSign, PieChart as PieChartIcon, 
  BarChart3, Settings2, User, X, Save, Trash2, 
  Check, Heart, Globe, Layers, BookOpen, Scissors, 
  Activity, Loader2, CircleDollarSign, PlusCircle, Star,
  Smartphone, Map, Info, UserCheck, MessageSquare, 
  Award, TrendingUp, BadgeCheck, FileText, Package, Target,
  ChevronLeft, ChevronRight, Copy, RotateCcw, Archive,
  ArrowUpRight, AlertOctagon, Receipt, Banknote, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Legend
} from 'recharts';
import { studioService } from '../../lib/supabase.ts';

// --- CONFIGURATION DYNAMIQUE ---
const INITIAL_TYPES = ['Grossesse', 'Naissance', 'Famille', 'Portrait', 'Couple', 'Mode', 'Événement', 'Mariage', 'Corporate', 'Baptême'];
const INITIAL_FORMULAS = ['Promo', 'Simple', 'Classique', 'Complet', 'Artistique', 'Elite'];
const EXPENSE_CATEGORIES = ['Produits Make-up', 'Décoration', 'Salaire Photographe', 'Salaire Make-up', 'Salaire Cadreur', 'Salaire CM', 'ENEO', 'Loyer', 'Eau', 'Autres'];

const WEDDING_CONTENT_OPTIONS = [
  'Dote', 'EVG/EVJF', 'Mairie', 'Religieux', 'Laïque', 'Vin d\'honneur', 'Soirée', 'Brunch', 'Préparatifs'
];

const MAKEUP_OPTIONS = [
  { id: 'none', label: 'Sans maquillage', price: 0 },
  { id: 'basic', label: 'Maquillage (3000 XAF)', price: 3000 },
  { id: 'pro', label: 'Maquillage Pro (5000 XAF)', price: 5000 },
  { id: 'custom', label: 'Maquillage Personnalisé', price: 0 }
];

const ACCESSORIES = [
  { id: 'robe_royale', label: 'Robes Royales', price: 2500 },
  { id: 'tissu_trad', label: 'Tissus Traditionnels', price: 1500 },
  { id: 'robe_soiree', label: 'Robes de Soirée', price: 3000 },
  { id: 'perruque', label: 'Perruques', price: 2000 },
  { id: 'bijoux', label: 'Bijoux', price: 1500 },
  { id: 'complet', label: 'Habillement Complet', price: 10000 }
];

const RETOUCHERS = ['Sandra', 'Ousmane', 'Hervé', 'Brayan', 'Chloé', 'Autre'];

interface SandraSpaceProps {
  member: any | null;
}

const SandraSpace: React.FC<SandraSpaceProps> = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'stats' | 'finances' | 'config'>('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  
  // Données
  const [sessions, setSessions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyRevenueGoal, setMonthlyRevenueGoal] = useState(1500000);
  const [monthlyProfitGoal, setMonthlyProfitGoal] = useState(800000);

  // Config locale (peut évoluer plus tard vers Supabase)
  const [customTypes, setCustomTypes] = useState<string[]>(INITIAL_TYPES);
  const [customFormulas, setCustomFormulas] = useState<string[]>(INITIAL_FORMULAS);
  const [newType, setNewType] = useState('');
  const [newFormula, setNewFormula] = useState('');

  // Formulaire & Brouillon
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tâches
  const [selectedSessionForTasks, setSelectedSessionForTasks] = useState<any>(null);

  // --- INITIALISATION via SUPABASE ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sData, eData] = await Promise.all([
        studioService.getSessions(),
        studioService.getExpenses()
      ]);
      setSessions(sData.map((s: any) => ({
        ...s,
        formule: s.type, // Mapping DB 'type' to UI 'formule' if needed, or stick to DB
        // Restore nested objects if you store them as JSONB later (optional)
        accessories: [],
        wedding_details: { content: {} },
        tasks: []
      })));
      setExpenses(eData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const initForm = (session?: any) => {
    const base = session || {
      client: '', phone: '', type: 'Grossesse', date: new Date().toISOString().split('T')[0],
      start_time: '10:00', end_time: '12:00', formule: 'Simple',
      amount: 0, status: 'Confirmé', notes: '', makeup: 'none',
      accessories: [], light_retouches: 0, hd_retouches: 0,
      delivery_days: 7, retoucher: 'Sandra',
      wedding_details: { 
        country: 'Cameroun', couple: '', origin_bride: '', origin_groom: '', 
        dot_date: '', mairie_date: '', guest_count: 0, 
        content: WEDDING_CONTENT_OPTIONS.reduce((acc, curr) => ({ ...acc, [curr]: false }), {})
      },
      tasks: []
    };
    setFormData(base);
    setFormStep(1);
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = async () => {
    setIsSubmitting(true);
    try {
      if (formData.id) {
        await studioService.updateSession(formData.id, formData);
      } else {
        await studioService.createSession(formData);
      }
      setIsSessionModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement. Vérifiez que la table 'studio_sessions' existe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    const amt = prompt("Montant ?");
    const cat = prompt("Catégorie ?", EXPENSE_CATEGORIES[0]);
    if (amt && cat) {
      try {
        await studioService.createExpense({
          amount: Number(amt),
          category: cat,
          date: new Date().toISOString().split('T')[0],
          note: 'Saisie manuelle'
        });
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- CALCULS KPI ---
  const stats = useMemo(() => {
    const totalCA = sessions.reduce((acc, s) => acc + Number(s.amount || 0), 0);
    const currentMonthExp = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const estimatedProfit = totalCA * 0.65;
    
    return {
      count: sessions.length,
      ca: totalCA,
      exp: currentMonthExp,
      net: totalCA - currentMonthExp,
      estProfit: estimatedProfit,
      caProgress: Math.min(100, Math.round((totalCA / monthlyRevenueGoal) * 100)),
      profitProgress: Math.min(100, Math.round((estimatedProfit / monthlyProfitGoal) * 100))
    };
  }, [sessions, expenses, monthlyRevenueGoal, monthlyProfitGoal]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchSearch = s.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType.length === 0 || filterType.includes(s.type);
      return matchSearch && matchType;
    }).sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  }, [sessions, searchTerm, filterType]);

  const toggleTypeFilter = (type: string) => {
    setFilterType(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  if (loading) return <div className="p-20 text-center font-black uppercase text-[#006344] animate-pulse">Initialisation Matrix Studio...</div>;

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* 3.2 HEADER */}
      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[2.5rem] bg-[#006344] text-[#B6C61A] flex items-center justify-center shadow-2xl">
            <Camera size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-[#006344] tracking-tighter uppercase italic leading-none">Le Studio Photo</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
              <Star size={12} className="text-[#B6C61A]" /> Direction Sandra Prestige
            </p>
          </div>
        </div>
        
        <div className="flex bg-slate-50 p-2 rounded-3xl border border-slate-100 shadow-inner">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'sessions', label: 'Séances', icon: List },
            { id: 'stats', label: 'Analytique', icon: PieChartIcon },
            { id: 'finances', label: 'Finances', icon: Wallet },
            { id: 'config', label: 'Paramètres', icon: Settings2 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-[#006344] text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <KpiCard label="Séances" value={stats.count} icon={<List size={20}/>} color="#006344" />
            <KpiCard label="CA Global" value={`${stats.ca.toLocaleString()} F`} icon={<CircleDollarSign size={20}/>} color="#B6C61A" />
            <KpiCard label="Dépenses" value={`${stats.exp.toLocaleString()} F`} icon={<TrendingDown size={20}/>} color="#BD3B1B" />
            <KpiCard label="Reste en Caisse" value={`${stats.net.toLocaleString()} F`} icon={<Wallet size={20}/>} color="#3B82F6" />
            <GoalSettingCard 
              revenue={stats.ca} goalRev={monthlyRevenueGoal} 
              profit={stats.estProfit} goalProf={monthlyProfitGoal}
              onUpdateRev={setMonthlyRevenueGoal} onUpdateProf={setMonthlyProfitGoal}
            />
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col gap-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1 max-w-xl w-full relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="RECHERCHER CLIENT OU NOTES..." className="w-full pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black uppercase outline-none focus:ring-4 focus:ring-[#B6C61A]/10 transition-all" />
              </div>
              <button onClick={() => initForm()} className="bg-[#006344] text-[#B6C61A] px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all">
                <Plus size={18} strokeWidth={4} /> Nouvelle Séance
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client / Type</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Jours Restants</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Détails Prod</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Montant</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pilotage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSessions.map(s => {
                    const daysPassed = Math.floor((new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24));
                    const daysLeft = (s.delivery_days || 7) - daysPassed;
                    const isLate = daysLeft < 0;

                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${isLate ? 'bg-red-50/30' : ''}`} onClick={() => setSelectedSessionForTasks(s)}>
                         <td className="px-10 py-8"><div className="flex flex-col"><span className="text-lg font-black text-slate-900 italic tracking-tight uppercase leading-none">{s.client}</span><span className="text-[9px] font-black uppercase text-[#006344] mt-2 italic opacity-60">{s.type}</span></div></td>
                         <td className="px-10 py-8 text-center"><span className={`font-black italic text-xl ${daysLeft < 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>{daysLeft} J</span></td>
                         <td className="px-10 py-8"><div className="flex items-center gap-4 text-[9px] font-black uppercase italic text-slate-500"><div className="flex items-center gap-1"><Scissors size={14} className="text-[#B6C61A]"/> {s.retoucher || 'Non assigné'}</div></div></td>
                         <td className="px-10 py-8 text-right font-black text-slate-900 tabular-nums italic">{Number(s.amount).toLocaleString()} F</td>
                         <td className="px-10 py-8 text-right">
                            <div className="flex justify-end gap-2">
                               <button onClick={(e) => { e.stopPropagation(); initForm(s); }} className="p-3 text-slate-300 hover:text-[#006344] hover:bg-white rounded-xl transition-all shadow-sm"><ArrowUpRight size={20}/></button>
                            </div>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Répartition par type */}
            <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#006344] flex items-center gap-2">
                  <PieChartIcon size={18} /> Répartition CA par type
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customTypes.map(type => {
                        const total = sessions
                          .filter(s => s.type === type)
                          .reduce((acc, s) => acc + Number(s.amount || 0), 0);
                        return { name: type, value: total || 0 };
                      }).filter(d => d.value > 0)}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                    >
                      {customTypes.map((_, idx) => (
                        <Cell key={idx} fill={['#006344','#B6C61A','#0EA5E9','#F97316','#EC4899','#22C55E'][idx % 6]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Courbe CA vs Dépenses */}
            <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#006344] flex items-center gap-2">
                  <BarChart3 size={18} /> CA vs Dépenses
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'].map((label, idx) => {
                      const monthIndex = idx + 1;
                      const monthSessions = sessions.filter(s => (s.date || '').startsWith(`2025-${String(monthIndex).padStart(2,'0')}`));
                      const monthExpenses = expenses.filter(e => (e.date || '').startsWith(`2025-${String(monthIndex).padStart(2,'0')}`));
                      return {
                        name: label,
                        revenue: monthSessions.reduce((acc, s) => acc + Number(s.amount || 0), 0),
                        expense: monthExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0),
                      };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#006344" fill="#00634422" name="CA" />
                    <Area type="monotone" dataKey="expense" stroke="#BD3B1B" fill="#BD3B1B22" name="Dépenses" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finances' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4">
           <div className="bg-[#006344] p-12 rounded-[4rem] shadow-2xl text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between border-b-[12px] border-[#B6C61A]">
              <div className="absolute top-0 right-0 p-10 opacity-10"><Banknote size={120} /></div>
              <div className="flex items-center gap-8 relative z-10">
                 <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center border border-white/20"><Wallet size={40} className="text-[#B6C61A]"/></div>
                 <div><h2 className="text-5xl font-black italic tracking-tighter uppercase">Trésorerie Studio</h2><p className="text-[10px] font-black text-[#B6C61A] uppercase tracking-[0.4em] mt-1">Livre de compte mensuel</p></div>
              </div>
              <div className="text-right relative z-10"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Net Actuel</p><h3 className="text-6xl font-black text-white italic tabular-nums">{stats.net.toLocaleString()} <span className="text-2xl text-[#B6C61A]">XAF</span></h3></div>
           </div>

           <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                 <h4 className="text-xl font-black uppercase italic text-[#006344] flex items-center gap-3"><Receipt size={24}/> Dépenses détaillées</h4>
                 <button onClick={handleAddExpense} className="px-10 py-5 bg-[#B6C61A] text-[#006344] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center gap-2"><PlusCircle size={16}/> Indexer Dépense</button>
              </div>
              <div className="space-y-4">
                 {expenses.map((e:any) => (
                   <div key={e.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-transparent hover:border-[#B6C61A]/30 transition-all">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm"><TrendingDown size={20}/></div>
                         <div><p className="text-sm font-black text-slate-900 uppercase italic leading-none">{e.category}</p><p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(e.date).toLocaleDateString('fr-FR')}</p></div>
                      </div>
                      <div className="text-right"><p className="text-lg font-black text-rose-600 italic">-{Number(e.amount).toLocaleString()} F</p></div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Types de prestations */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#006344] mb-4 flex items-center gap-2">
                <Layers size={16} /> Types de prestations
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Nouveau type (ex: Couple Premium)"
                  className="flex-1 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
                />
                <button
                  onClick={() => {
                    const value = newType.trim();
                    if (!value || customTypes.includes(value)) return;
                    setCustomTypes(prev => [...prev, value]);
                    setNewType('');
                  }}
                  className="px-4 py-2 bg-[#006344] text-white rounded-2xl text-xs font-black uppercase tracking-widest"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCustomTypes(prev => prev.filter(x => x !== t))}
                    className="px-3 py-1 rounded-2xl bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-red-50 hover:text-red-500"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Formules commerciales */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#006344] mb-4 flex items-center gap-2">
                <Package size={16} /> Formules commerciales
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  value={newFormula}
                  onChange={(e) => setNewFormula(e.target.value)}
                  placeholder="Nouvelle formule (ex: Studio Luxe)"
                  className="flex-1 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
                />
                <button
                  onClick={() => {
                    const value = newFormula.trim();
                    if (!value || customFormulas.includes(value)) return;
                    setCustomFormulas(prev => [...prev, value]);
                    setNewFormula('');
                  }}
                  className="px-4 py-2 bg-[#006344] text-white rounded-2xl text-xs font-black uppercase tracking-widest"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customFormulas.map((f) => (
                  <button
                    key={f}
                    onClick={() => setCustomFormulas(prev => prev.filter(x => x !== f))}
                    className="px-3 py-1 rounded-2xl bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-red-50 hover:text-red-500"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#006344] mb-4 flex items-center gap-2">
              <Settings2 size={16} /> Objectifs financiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Objectif CA mensuel</p>
                <input
                  type="number"
                  value={monthlyRevenueGoal}
                  onChange={(e) => setMonthlyRevenueGoal(Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black text-[#006344]"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Objectif bénéfice</p>
                <input
                  type="number"
                  value={monthlyProfitGoal}
                  onChange={(e) => setMonthlyProfitGoal(Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black text-[#006344]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULAIRE */}
      {isSessionModalOpen && formData && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#006344]/95 backdrop-blur-xl" onClick={() => setIsSessionModalOpen(false)}></div>
          <div className="relative bg-[#F8FAFC] w-full max-w-6xl h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-white/10">
             <div className="bg-white p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                   <div className="w-12 h-12 bg-slate-900 text-[#B6C61A] rounded-2xl flex items-center justify-center font-black italic shadow-lg">{formStep}</div>
                   <div><h2 className="text-2xl font-black text-[#006344] uppercase italic tracking-tighter">Séance Studio {formData.client || '...'}</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Standard Sandra Matrix // 2025</p></div>
                </div>
                <button onClick={() => setIsSessionModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-full text-slate-300 transition-colors"><X size={32}/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
                {formStep === 1 && (
                   <div className="space-y-10 animate-in slide-in-from-right-4">
                      <section className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
                         <h3 className="text-xs font-black text-[#006344] uppercase italic flex items-center gap-3 border-b border-slate-50 pb-4"><User size={20} className="text-[#B6C61A]"/> Identité Client</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Nom Client</label><input value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="w-full px-8 py-5 rounded-[1.8rem] bg-slate-50 border-none font-black uppercase italic text-[#006344] outline-none" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Téléphone</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-8 py-5 rounded-[1.8rem] bg-slate-50 border-none font-black italic text-[#006344] outline-none" /></div>
                            <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Prestation</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-8 py-5 rounded-[1.8rem] bg-slate-50 border-none font-black uppercase italic text-[#006344] outline-none">{INITIAL_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                         </div>
                      </section>
                   </div>
                )}

                {formStep === 2 && (
                   <div className="space-y-10 animate-in slide-in-from-right-4">
                      <section className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
                         <h3 className="text-xs font-black text-[#006344] uppercase italic flex items-center gap-3 border-b border-slate-50 pb-4"><CircleDollarSign size={20} className="text-[#B6C61A]"/> Financier & Horaires</h3>
                         <div className="grid grid-cols-2 gap-8">
                            <div className="col-span-2">
                               <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic text-center">Montant Total Facturé (XAF)</label>
                               <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-10 py-10 rounded-[2.5rem] bg-slate-900 border-none font-black text-6xl italic text-[#B6C61A] outline-none text-center tabular-nums" />
                            </div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Début Séance</label><input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-8 py-5 rounded-2xl bg-slate-50 border-none font-black text-[#006344]" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest italic">Fin Séance</label><input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-8 py-5 rounded-2xl bg-slate-50 border-none font-black text-[#006344]" /></div>
                         </div>
                      </section>
                   </div>
                )}
             </div>

             <div className="bg-white p-10 border-t border-slate-100 flex gap-6 shrink-0">
                {formStep > 1 && <button onClick={() => setFormStep(prev => prev - 1)} className="flex-1 py-6 rounded-2xl bg-slate-50 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] transition-all">Précédent</button>}
                {formStep < 2 ? (
                   <button onClick={() => setFormStep(prev => prev + 1)} className="flex-[3] py-6 rounded-2xl bg-[#006344] text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] active:scale-95 transition-all">Suivant : Étape {formStep+1}</button>
                ) : (
                   <button onClick={handleSaveSession} disabled={isSubmitting} className="flex-[3] py-6 rounded-2xl bg-[#B6C61A] text-[#006344] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4">{isSubmitting ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Confirmer</>}</button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalSettingCard = ({ revenue, goalRev, profit, goalProf, onUpdateRev, onUpdateProf }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const revProg = Math.min(100, Math.round((revenue / goalRev) * 100));
  const profProg = Math.min(100, Math.round((profit / goalProf) * 100));

  return (
    <div className="bg-white p-6 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group h-full">
       <div className="flex justify-between items-center mb-4"><p className="text-[10px] font-black text-slate-400 uppercase italic">Objectifs Mensuels</p><button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-300 hover:text-[#006344]"><Settings2 size={16}/></button></div>
       <div className="space-y-6">
          <div><div className="flex justify-between text-[8px] font-black uppercase mb-1"><span>CA ({revProg}%)</span><span className="text-slate-400">{revenue.toLocaleString()} / {goalRev.toLocaleString()}</span></div><div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100"><div className="h-full bg-[#006344] transition-all duration-1000 shadow-[0_0_10px_#00634450]" style={{width: `${revProg}%`}}></div></div></div>
          <div><div className="flex justify-between text-[8px] font-black uppercase mb-1"><span>BÉNÉFICE ({profProg}%)</span><span className="text-slate-400">{profit.toLocaleString()} / {goalProf.toLocaleString()}</span></div><div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100"><div className="h-full bg-[#B6C61A] transition-all duration-1000 shadow-[0_0_10px_#B6C61A50]" style={{width: `${profProg}%`}}></div></div></div>
       </div>
       {isOpen && (
         <div className="mt-6 p-6 bg-slate-50 rounded-[2.5rem] space-y-6 animate-in fade-in zoom-in-95">
            <div className="space-y-2">
               <label className="text-[8px] font-bold text-slate-400 uppercase flex justify-between">Cible CA <span>{goalRev.toLocaleString()} F</span></label>
               <input type="range" min="100000" max="2000000" step="50000" value={goalRev} onChange={e => onUpdateRev(Number(e.target.value))} className="w-full accent-[#006344]" />
            </div>
            <div className="space-y-2">
               <label className="text-[8px] font-bold text-slate-400 uppercase flex justify-between">Cible Bénéfice <span>{goalProf.toLocaleString()} F</span></label>
               <input type="range" min="50000" max="1000000" step="10000" value={goalProf} onChange={e => onUpdateProf(Number(e.target.value))} className="w-full accent-[#B6C61A]" />
            </div>
         </div>
       )}
    </div>
  );
};

const KpiCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col gap-4 group hover:shadow-xl transition-all"><div className="flex justify-between items-start"><div className="p-3 rounded-2xl bg-slate-50 transition-colors group-hover:bg-[#B6C61A10]" style={{ color }}>{icon}</div><TrendingUp size={16} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic">{label}</p><p className="text-2xl font-black italic tracking-tighter" style={{ color }}>{value}</p></div></div>
);

export default SandraSpace;
