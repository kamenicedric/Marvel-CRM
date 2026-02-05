
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { teamService, payrollService } from '../../lib/supabase.ts';
import { 
  TeamMember, SalaryEntry, ApprovalStage, Bonus, Debt, 
  BonusType, DebtType, ApprovalInfo 
} from '../../types.ts';
import { 
  Wallet, TrendingUp, Users, HandCoins, Landmark, 
  History, BadgeCheck, AlertTriangle, ArrowUpRight, 
  FileText, Coins, DollarSign, Calendar, ChevronLeft, 
  ChevronRight, Search, Loader2, Award, PiggyBank,
  CheckCircle2, CreditCard, PieChart as PieChartIcon,
  BarChart3, Settings2, Eye, X, Check, ArrowRight,
  TrendingDown, Info, ShieldCheck, Download, Filter,
  Layers, UserPlus, Receipt, Banknote, Clock,
  LayoutGrid, RefreshCw, PlusCircle, FileDown, FileUp,
  Copy, Trash2, Wifi, WifiOff, Star, AlertOctagon,
  ChevronDown, ArrowUpCircle, Save
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  Legend, ComposedChart, Line
} from 'recharts';

const DEPARTMENTS = [
  "Photographe", "Retouche légère", "Retouche poussée", "Cadreur vidéos",
  "Monteur DVD", "Monteur com", "Monteur teaser classique", "Monteur teaser furieux",
  "Etalonneur", "Multicam", "Community manager", "Marketing", "Commercial",
  "Rendez-vous client", "Groupe WhatsApp 237", "Groupe WhatsApp France",
  "Graphiste", "Album vistaprint", "Album ZNO", "Make-up"
];

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const YEARS = [2024, 2025, 2026];

const SalairesSpace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payroll' | 'analytics' | 'config'>('dashboard');
  const [loading, setLoading] = useState(true);
  
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterDepts, setFilterDepts] = useState<string[]>([]);
  const [showDeptFilter, setShowDeptFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedEntry, setSelectedEntry] = useState<SalaryEntry | null>(null);
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<'dept' | 'dist'>('dept');
  
  const [formData, setFormData] = useState<Partial<SalaryEntry>>({
    baseSalary: 110000, bonus: 0, absenceDays: 0, salaryAdvance: 0, monthlyPayment: 0
  });

  const calculateNetSalary = (entry: Partial<SalaryEntry>) => {
    const base = entry.baseSalary || 0;
    const bonus = entry.bonus || 0;
    const absences = entry.absenceDays || 0;
    const advance = entry.salaryAdvance || 0;
    const debt = entry.monthlyPayment || 0;
    const absenceDeduction = Math.round((base / 24) * absences);
    return Math.max(0, base + bonus - absenceDeduction - advance - debt);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamData, payrollData] = await Promise.all([
        teamService.getAll(),
        payrollService.getAll()
      ]);
      setTeam(teamData);
      
      // Filtrer les entrées pour le mois sélectionné
      const currentMonthEntries = (payrollData as any[]).filter(p => 
        p.month === selectedMonth && p.year === selectedYear
      ).map(p => ({
        id: p.id,
        employeeId: p.employee_id,
        employeeName: p.team_members?.full_name || 'Inconnu',
        department: 'N/A', // Récupéré via team si nécessaire
        salaryMonth: p.month,
        salaryYear: p.year,
        baseSalary: p.base_salary,
        bonus: p.bonus,
        absenceDays: p.absence_days,
        salaryAdvance: p.advances,
        monthlyPayment: p.deductions,
        netSalary: p.net_salary,
        remainingDebt: 0, 
        approvalInfo: { currentStage: (p.status === 'paid' ? 'completed' : 'pending') as ApprovalStage },
        updatedAt: p.created_at
      }));

      // Si pas d'entrées pour ce mois, on peut proposer de les créer (ici on affiche juste vide ou existant)
      setEntries(currentMonthEntries);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateMonth = async () => {
    if (confirm(`Initialiser les fiches de paie pour ${selectedMonth} ${selectedYear} ?`)) {
      setLoading(true);
      try {
        await Promise.all(team.map(member => {
          return payrollService.create({
            employeeId: member.id,
            month: selectedMonth,
            year: selectedYear,
            baseSalary: 110000, // Défaut ou config
            bonus: 0,
            advances: 0,
            deductions: 0,
            absenceDays: 0,
            netSalary: 110000,
            status: 'pending'
          });
        }));
        fetchData();
      } catch (err) { console.error(err); }
    }
  };

  // --- ACTIONS 5.4, 5.5, 5.6 ---
  const handleExportCSV = () => {
    const headers = "Employé,Salaire Base,Primes,Absences,Net\n";
    const rows = entries.map(e => `${e.employeeName},${e.baseSalary},${e.bonus},${e.absenceDays},${e.netSalary}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salaires_${selectedMonth}_${selectedYear}.csv`;
    a.click();
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchName = e.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchName;
    });
  }, [entries, searchTerm]);

  const stats = useMemo(() => {
    const totalBase = filteredEntries.reduce((acc, e) => acc + e.baseSalary, 0);
    const totalBonus = filteredEntries.reduce((acc, e) => acc + e.bonus, 0);
    const totalDebt = 0;
    const totalNet = filteredEntries.reduce((acc, e) => acc + e.netSalary, 0);
    return { totalBase, totalBonus, totalDebt, totalNet };
  }, [filteredEntries]);

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-[#006344]" size={48} />
      <p className="font-black text-[#006344] uppercase italic tracking-widest">Calculateur Paymaster...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24 max-w-[1600px] mx-auto">
      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-[#006344] text-[#B6C61A] flex items-center justify-center shadow-2xl"><Landmark size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-[#006344] tracking-tighter uppercase italic leading-none">Paymaster Interface</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2"><ShieldCheck size={12} className="text-[#B6C61A]" /> Gouvernance Financière Elite</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
           <button onClick={() => fetchData()} className="p-4 bg-slate-50 text-slate-400 hover:text-[#006344] rounded-2xl border border-slate-100"><RefreshCw size={20}/></button>
           <button onClick={handleCreateMonth} className="flex items-center gap-3 px-8 py-4 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"><PlusCircle size={16}/> Initialiser Mois</button>
           <button onClick={handleExportCSV} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"><FileDown size={16}/> Exporter CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Salaires Base" value={stats.totalBase} color="bg-[#006344]" icon={<Coins size={20}/>} />
        <StatCard label="Total Primes" value={stats.totalBonus} color="bg-[#B6C61A]" icon={<Award size={20}/>} />
        <StatCard label="Total Net à Payer" value={stats.totalNet} color="bg-blue-600" icon={<Wallet size={20}/>} highlight />
      </div>

      <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="RECHERCHER UN EMPLOYÉ..." className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase italic outline-none focus:ring-4 focus:ring-[#B6C61A]/10 transition-all" />
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-50 border-none px-6 py-4 rounded-xl text-[10px] font-black uppercase italic text-[#006344] outline-none">{MONTHS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border-none px-6 py-4 rounded-xl text-[10px] font-black uppercase italic text-[#006344] outline-none">{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
         <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b">
              <tr>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Employé</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">Base</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">Prime</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-center">Abs.</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">NET</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedEntry(entry)}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-[#006344] italic shadow-sm">{entry.employeeName[0]}</div>
                      <div><p className="text-sm font-black text-slate-900 uppercase italic leading-none">{entry.employeeName}</p></div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-slate-600 tabular-nums italic text-sm">{entry.baseSalary.toLocaleString()}</td>
                  <td className="px-8 py-6 text-right font-black text-emerald-600 tabular-nums italic text-sm">+{entry.bonus.toLocaleString()}</td>
                  <td className="px-8 py-6 text-center"><span className={`px-2 py-1 rounded text-[8px] font-black italic ${entry.absenceDays > 0 ? 'bg-red-50 text-red-600' : 'text-slate-300'}`}>{entry.absenceDays}J</span></td>
                  <td className="px-8 py-6 text-right"><span className="text-lg font-black text-[#006344] italic tabular-nums leading-none">{entry.netSalary.toLocaleString()} F</span></td>
                  <td className="px-8 py-6 text-right"><button className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all"><Eye size={14}/></button></td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 italic font-bold">Aucune fiche de paie trouvée pour cette période.</td></tr>
              )}
            </tbody>
         </table>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, icon, highlight = false }: any) => (
  <div className={`p-8 rounded-[3.5rem] border shadow-sm flex flex-col gap-6 group hover:shadow-2xl transition-all duration-500 relative overflow-hidden ${highlight ? 'bg-[#006344] text-white border-[#B6C61A]/30' : 'bg-white border-slate-100'}`}>
    {highlight && <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><DollarSign size={80}/></div>}
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${highlight ? 'bg-white/10 text-[#B6C61A]' : 'bg-slate-50'}`}><div style={{color: !highlight ? color.replace('bg-','') : '#B6C61A'}}>{icon}</div></div>
    <div><p className={`text-[10px] font-black uppercase tracking-widest mb-1 italic ${highlight ? 'text-white/40' : 'text-slate-400'}`}>{label}</p><h3 className={`text-2xl font-black italic tracking-tighter tabular-nums ${highlight ? 'text-[#B6C61A]' : 'text-slate-900'}`}>{value.toLocaleString()} <span className="text-xs opacity-50">XAF</span></h3></div>
  </div>
);

export default SalairesSpace;
