
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Clock, 
  AlertCircle,
  Heart
} from 'lucide-react';
import { WeddingProject, Lead } from '../types';

interface DashboardProps {
  projects: WeddingProject[];
  leads: Lead[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects, leads }) => {
  const totalRevenue = projects.reduce((acc, p) => acc + (p.amount || 0), 0);
  const activeProjects = projects.filter(p => p.status !== 'Livré' && p.status !== 'Archivé').length;
  const newLeads = leads.filter(l => l.status === 'Nouveau').length;

  const data = [
    { name: 'Jan', value: 4000 },
    { name: 'Fév', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Avr', value: 2780 },
    { name: 'Mai', value: 1890 },
    { name: 'Juin', value: 2390 },
  ];

  const statusData = [
    { name: 'Planification', value: projects.filter(p => p.status === 'Planification').length },
    { name: 'En cours', value: projects.filter(p => p.status === 'En Cours').length },
    { name: 'Livré', value: projects.filter(p => p.status === 'Livré').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#006344', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Tableau de Bord</h1>
          <p className="text-slate-500 mt-1">Bienvenue sur Marvel CRM. Voici un résumé de vos activités.</p>
        </div>
        <div className="flex gap-3">
           <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold shadow-sm">
             Exporter PDF
           </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Chiffre d\'Affaires', value: `${totalRevenue.toLocaleString()} FCFA`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Projets Actifs', value: activeProjects, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Nouveaux Leads', value: newLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Taux de Conversion', value: '64%', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">+12.5%</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900">Performance Mensuelle</h2>
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold">
              <option>Derniers 6 mois</option>
              <option>Dernière année</option>
            </select>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F1F5F9'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="value" fill="#006344" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-8">Status des Projets</h2>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.length > 0 ? statusData : [{name: 'Aucun', value: 1}]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-800">{projects.length}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {statusData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                  <span className="font-bold text-slate-600">{d.name}</span>
                </div>
                <span className="text-slate-400">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts / Updates */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={24} />
            Alertes & Retards
          </h2>
          <button className="text-[#006344] font-black text-sm hover:underline">Voir tout</button>
        </div>
        <div className="divide-y divide-slate-50">
          {projects.filter(p => (p.delayDays || 0) > 0).slice(0, 3).map((p, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900">{p.couple}</h4>
                  <p className="text-sm text-slate-500">Mariage prévu le {p.weddingDate}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black">
                  Retard: {p.delayDays} jours
                </span>
              </div>
            </div>
          ))}
          {projects.filter(p => (p.delayDays || 0) > 0).length === 0 && (
             <div className="p-8 text-center text-slate-400 font-medium italic">
                Aucun retard détecté pour le moment. Félicitations !
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
