
import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  X, 
  Phone, 
  DollarSign, 
  Layers, 
  Zap, 
  Loader2, 
  Check, 
  LayoutGrid, 
  List, 
  User, 
  MapPin,
  Clock,
  ArrowRight,
  BadgeCheck,
  AlertCircle,
  Coins,
  MoreVertical,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { WeddingProject, Lead } from '../../types';
import { leadsService, projectsService } from '../../lib/supabase';

interface PrestationsModuleProps {
  projects: WeddingProject[];
  leads: Lead[];
  onRefresh?: () => void;
}

const PRESTATION_TYPES = ['Mariage', 'Studio Photo', 'Vidéo Corporate', 'Baptême', 'Deuil', 'Anniv', 'Entreprise', 'Autre'];

const PrestationsModule: React.FC<PrestationsModuleProps> = ({ projects, leads, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour la modale et l'édition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<'project' | 'lead' | null>(null);

  const [formData, setFormData] = useState({
    client: '',
    phone: '',
    city: 'Douala',
    type: 'Mariage',
    price: '',
    date: '',
    isPaid: false
  });

  // Fusion dynamique avec identification de la source pour le CRUD
  const allPrestations = useMemo(() => {
    const fromProjects = projects
      // Ne pas afficher les dossiers archivés
      .filter(p => p.country === 'Cameroun' && p.status !== 'Archivé')
      .map(p => ({
        id: p.id,
        sourceType: 'project' as const,
        title: p.couple,
        date: p.weddingDate,
        type: p.formula || 'Mariage',
        status: 'Confirmé',
        amount: p.amount,
        phone: '',
        city: 'Douala', // Par défaut ou issu du projet
        isPaid: p.progress > 0
      }));

    const fromLeads = leads
      // Ne pas afficher les leads archivés
      .filter(l => l.wedding_date && (l.country === 'Cameroun' || !l.country) && l.status !== 'Archivé')
      .map(l => {
        const isPaidInfo = l.notes?.some(n => n.toLowerCase().includes('acompte versé')) || l.status === 'Converti';
        return {
          id: l.id,
          sourceType: 'lead' as const,
          title: `${l.first_name} ${l.last_name}`,
          date: l.wedding_date,
          type: l.source === 'Calendrier' ? 'Prestation' : 'Option',
          status: l.status === 'Converti' ? 'Confirmé' : 'En attente',
          amount: l.budget || 0,
          phone: l.phone,
          city: l.city || 'Douala',
          isPaid: isPaidInfo
        };
      });

    return [...fromProjects, ...fromLeads].filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, leads, searchTerm]);

  // Données filtrées pour le tableau (Bordereau)
  const tableData = useMemo(() => {
    return allPrestations.filter(p => {
      const pDate = new Date(p.date);
      return pDate.getMonth() === currentDate.getMonth() && 
             pDate.getFullYear() === currentDate.getFullYear();
    }).sort((a,b) => a.date.localeCompare(b.date));
  }, [allPrestations, currentDate]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  // --- ACTIONS CRUD ---

  const handleDelete = async (id: string, type: 'project' | 'lead') => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette prestation ? Cette action est irréversible.")) return;
    
    try {
      if (type === 'project') {
        // Dans "Prestations", un item "project" correspond à un vrai dossier (wedding_projects).
        // Pour éviter une suppression DB dangereuse (RLS, dépendances, historique), on archive plutôt.
        await projectsService.update(id, { status: 'Archivé' });
      } else {
        // Suppression d'un lead (prestation simple)
        // Note: leadsService.delete doit être disponible ou on update le statut à 'Archivé'
        // Si leadsService.delete n'existe pas dans l'interface fournie, on peut simuler ou adapter
        // Pour cet exemple, supposons qu'on update le status si delete n'est pas dispo, 
        // mais selon le prompt précédent, nous avons ajouté delete dans teamService/projectsService.
        // Ajoutons un fallback si leadsService.delete n'est pas exposé explicitement dans les types précédents mais supposons qu'il l'est.
        // Si delete n'existe pas, on passe le statut à "Archivé"
        await leadsService.update(id, { status: 'Archivé' });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message || "Erreur lors de la suppression.";
      alert(msg);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditingSource(item.sourceType);
    setFormData({
      client: item.title,
      phone: item.phone || '',
      city: item.city || 'Douala',
      type: item.type,
      price: item.amount?.toString() || '0',
      date: item.date,
      isPaid: item.isPaid
    });
    setIsModalOpen(true);
  };

  const handleOpenAddModal = (day?: number) => {
    setEditingId(null);
    setEditingSource(null);
    
    let dateStr = '';
    if (day) {
      const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const d = selectedDate.getDate().toString().padStart(2, '0');
      dateStr = `${year}-${month}-${d}`;
    } else {
      dateStr = new Date().toISOString().split('T')[0];
    }
    
    setFormData({
      client: '',
      phone: '',
      city: 'Douala',
      type: 'Mariage',
      price: '',
      date: dateStr,
      isPaid: false
    });
    setIsModalOpen(true);
  };

  const handleSavePrestation = async () => {
    if (!formData.client || !formData.date) {
      alert("Le nom du client et la date sont requis.");
      return;
    }
    setIsSubmitting(true);
    try {
      const notes = formData.isPaid ? ["ACOMPTE VERSÉ - Enregistré via Matrix"] : ["ACOMPTE NON VERSÉ - Enregistré via Matrix"];
      
      if (editingId && editingSource === 'lead') {
        // MISE À JOUR LEAD
        await leadsService.update(editingId, {
          first_name: formData.client,
          phone: formData.phone,
          city: formData.city,
          wedding_date: formData.date,
          budget: Number(formData.price) || 0,
          notes: notes
        });
      } else if (editingId && editingSource === 'project') {
        // MISE À JOUR PROJET (Limité)
        await projectsService.update(editingId, {
          couple: formData.client,
          weddingDate: formData.date,
          amount: Number(formData.price) || 0,
          clientNotes: notes[0] // Simple mapping
        });
      } else {
        // CRÉATION
        await leadsService.create({
          first_name: formData.client,
          last_name: '(Matrix)',
          phone: formData.phone,
          city: formData.city,
          country: 'Cameroun',
          wedding_date: formData.date,
          budget: Number(formData.price) || 0,
          status: 'Nouveau',
          source: 'Calendrier',
          notes: notes
        });
      }
      
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la synchronisation Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* HEADER HUD */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none"><CalendarIcon size={300}/></div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-24 h-24 bg-[#006344] text-[#B6C61A] rounded-[2.5rem] flex items-center justify-center shadow-2xl border-b-8 border-black/20">
            <CalendarIcon size={48} />
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-[#121212] leading-none">Scheduling Matrix<span className="text-[#B6C61A]">.</span></h2>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mt-3 italic flex items-center gap-2">
              <Zap size={14} className="text-[#B6C61A]" /> CAMEROON DIVISION // Suivi Financier Actif
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 relative z-10">
          <button onClick={() => setViewMode('calendar')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-black text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
            <LayoutGrid size={16} className="inline mr-2" /> Vue Calendrier
          </button>
          <button onClick={() => setViewMode('table')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-black text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
            <List size={16} className="inline mr-2" /> Vue Bordereau
          </button>
          <div className="w-px h-10 bg-slate-200 mx-2" />
          <button onClick={() => handleOpenAddModal()} className="px-8 py-4 bg-[#B6C61A] text-[#006344] rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
            <Plus size={16} className="inline mr-2" strokeWidth={4} /> Nouvelle Presta
          </button>
        </div>
      </div>

      {/* BARRE DE PILOTAGE */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 bg-white px-8 py-4 rounded-[2rem] border border-slate-100 shadow-sm border-b-4 border-slate-200">
          <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-black transition-all"><ChevronLeft size={28} strokeWidth={3}/></button>
          <span className="text-xl font-black uppercase italic tracking-[0.3em] min-w-[280px] text-center text-[#006344] select-none">
            {currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
          <button onClick={() => changeMonth(1)} className="p-3 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-black transition-all"><ChevronRight size={28} strokeWidth={3}/></button>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#006344]" />
                <span className="text-[10px] font-black uppercase text-slate-400">Acompte Versé</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
                <div className="w-3 h-3 rounded-full bg-red-600" />
                <span className="text-[10px] font-black uppercase text-slate-400">Non versé</span>
            </div>
        </div>

        <div className="relative w-full md:w-[400px] group">
          <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#B6C61A] transition-colors" />
          <input 
            type="text" 
            placeholder="RECHERCHER DANS LA MATRICE..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] text-[11px] font-black uppercase tracking-widest outline-none focus:ring-8 focus:ring-[#006344]/5 transition-all shadow-sm"
          />
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-8 md:p-12 relative">
          <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[3rem] overflow-hidden shadow-inner">
            {['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'].map(d => (
              <div key={d} className="bg-slate-50/80 py-6 text-center text-[10px] font-black text-slate-300 tracking-[0.4em]">{d}</div>
            ))}
            {daysInMonth.map((day, idx) => {
              const now = new Date();
              const isToday = day === now.getDate() && currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
              const dateStr = day ? `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` : null;
              const matches = allPrestations.filter(p => p.date === dateStr);

              return (
                <div 
                  key={idx} 
                  onClick={() => day && handleOpenAddModal(day)}
                  className={`bg-white min-h-[220px] p-6 border border-slate-50/50 transition-all relative flex flex-col group ${day ? 'cursor-cell hover:bg-slate-50/50 active:scale-[0.98]' : 'bg-slate-50/20'}`}
                >
                  {day && (
                    <>
                      <div className="flex justify-between items-start mb-5">
                        <span className={`text-sm font-black italic transition-all ${isToday ? 'bg-[#006344] text-white w-10 h-10 flex items-center justify-center rounded-2xl shadow-xl scale-110' : 'text-slate-200 group-hover:text-[#006344]'}`}>
                          {day}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 opacity-0 group-hover:opacity-100 transition-all">
                          <Plus size={16} strokeWidth={3} />
                        </div>
                      </div>
                      <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-2">
                        {matches.map(m => (
                          <div 
                            key={m.id} 
                            onClick={(e) => { e.stopPropagation(); handleEdit(m); }}
                            className={`group/card p-4 rounded-2xl text-[9px] font-black uppercase italic leading-tight transition-all shadow-md border-l-[8px] cursor-pointer hover:translate-x-1 relative ${
                              m.isPaid 
                                ? 'bg-[#006344] text-white border-[#B6C61A]' 
                                : 'bg-red-600 text-white border-red-900 animate-pulse-subtle'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.sourceType); }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/20 hover:bg-red-900/50 text-white opacity-0 group-hover/card:opacity-100 transition-opacity"
                              title="Supprimer la prestation"
                            >
                              <Trash2 size={12} />
                            </button>
                            <div className="truncate mb-1.5 flex items-center gap-2 pr-6">
                               {m.isPaid ? <BadgeCheck size={12} className="text-[#B6C61A]"/> : <AlertCircle size={12} className="text-white"/>}
                               {m.title}
                            </div>
                            <div className="flex justify-between items-center opacity-70 text-[8px] font-bold">
                              <span className="truncate max-w-[70px]">{m.type}</span>
                              <span className="tabular-nums">{m.amount?.toLocaleString()} F</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date & Séquence</th>
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Client / Dossier</th>
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Acompte</th>
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Valeur Estimée</th>
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tableData.length > 0 ? (
                tableData.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-12 py-10" onClick={() => handleEdit(p)}>
                      <div className="flex items-center gap-6 cursor-pointer">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${p.isPaid ? 'bg-emerald-50 text-[#006344]' : 'bg-red-50 text-red-600'}`}>
                          <CalendarIcon size={24}/>
                        </div>
                        <span className="text-base font-black italic text-slate-900">{new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-12 py-10" onClick={() => handleEdit(p)}>
                      <span className="text-2xl font-black text-black uppercase italic tracking-tighter group-hover:text-[#006344] transition-colors cursor-pointer">{p.title}</span>
                      <div className="flex items-center gap-4 mt-2">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{p.type}</span>
                         <div className={`w-1.5 h-1.5 rounded-full ${p.isPaid ? 'bg-[#B6C61A]' : 'bg-red-500'}`} />
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{p.phone || 'Contact non listé'}</span>
                      </div>
                    </td>
                    <td className="px-12 py-10" onClick={() => handleEdit(p)}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-3 h-3 rounded-full ${p.isPaid ? 'bg-[#006344] shadow-[0_0_10px_#006344]' : 'bg-red-600 shadow-[0_0_10px_#EF4444]'}`} />
                        <span className={`text-[11px] font-black uppercase italic tracking-widest ${p.isPaid ? 'text-[#006344]' : 'text-red-600'}`}>
                          {p.isPaid ? 'ACOMPTE VERSÉ' : 'ACOMPTE ATTENDU'}
                        </span>
                      </div>
                    </td>
                    <td className="px-12 py-10 text-right" onClick={() => handleEdit(p)}>
                      <span className={`text-3xl font-black italic tabular-nums transition-colors cursor-pointer ${p.isPaid ? 'text-slate-900 group-hover:text-[#006344]' : 'text-red-700'}`}>{p.amount?.toLocaleString()} <span className="text-xs opacity-20 italic">XAF</span></span>
                    </td>
                    <td className="px-12 py-10 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(p); }} 
                          className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#006344] hover:shadow-md transition-all"
                          title="Éditer / Voir"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.sourceType); }} 
                          className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-600 hover:shadow-md transition-all"
                          title="Supprimer la prestation"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-12 py-20 text-center">
                    <p className="text-xl font-black text-slate-300 uppercase italic">Aucune prestation pour ce mois</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Utilisez le bouton "Nouvelle Presta" pour en ajouter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* QUICK ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-[#FDFDFD] w-full max-w-2xl max-h-[90vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-white/10">
              <div className={`p-12 text-white relative transition-colors duration-500 ${formData.isPaid ? 'bg-[#006344]' : 'bg-red-600'}`}>
                 <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"><X size={32}/></button>
                 <div className="flex items-center gap-8">
                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-xl rotate-12 transition-all ${formData.isPaid ? 'bg-[#B6C61A] text-[#006344]' : 'bg-white text-red-600'}`}>
                       {formData.isPaid ? <Check size={40} strokeWidth={4} /> : <Coins size={40} />}
                    </div>
                    <div>
                       <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                         {editingId ? 'Édition Prestation' : 'Indexation Prestation'}
                       </h3>
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-3 italic text-white/70">
                         Statut : {formData.isPaid ? 'PAIEMENT CONFIRMÉ' : 'PAIEMENT EN ATTENTE'}
                       </p>
                    </div>
                 </div>
              </div>

              <div className="p-12 space-y-10 bg-white flex-1 overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* STATUT PAIEMENT (Toggles segmentés) */}
                    <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic ml-5">
                            <DollarSign size={16} className="text-[#006344]"/> Statut de l'acompte
                        </label>
                        <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <button 
                                onClick={() => setFormData({...formData, isPaid: false})}
                                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!formData.isPaid ? 'bg-red-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-red-400'}`}
                            >
                                Acompte non versé (Rouge)
                            </button>
                            <button 
                                onClick={() => setFormData({...formData, isPaid: true})}
                                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.isPaid ? 'bg-[#006344] text-white shadow-lg scale-105' : 'text-slate-400 hover:text-[#006344]'}`}
                            >
                                Acompte déjà versé (Vert)
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic ml-5"><User size={16} className="text-[#B6C61A]"/> Client / Dossier</label>
                       <input 
                         type="text" 
                         value={formData.client} 
                         onChange={e => setFormData({...formData, client: e.target.value})}
                         placeholder="NOM DU DOSSIER" 
                         className="w-full px-10 py-6 bg-slate-50 border-none rounded-[2rem] font-black uppercase italic text-[#006344] outline-none focus:ring-4 focus:ring-[#006344]/5 transition-all shadow-inner"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic ml-5"><Phone size={16} className="text-[#B6C61A]"/> Mobile Contact</label>
                       <input 
                         type="text" 
                         value={formData.phone} 
                         onChange={e => setFormData({...formData, phone: e.target.value})}
                         placeholder="+237 ..." 
                         className="w-full px-10 py-6 bg-slate-50 border-none rounded-[2rem] font-black italic text-[#006344] outline-none focus:ring-4 focus:ring-[#006344]/5 transition-all shadow-inner"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic ml-5"><Layers size={16} className="text-[#B6C61A]"/> Type Prestation</label>
                       <select 
                         value={formData.type} 
                         onChange={e => setFormData({...formData, type: e.target.value})}
                         className="w-full px-10 py-6 bg-slate-50 border-none rounded-[2rem] font-black uppercase italic text-[#006344] outline-none focus:ring-4 focus:ring-[#006344]/5 transition-all appearance-none cursor-pointer shadow-inner"
                       >
                         {PRESTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                       </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic ml-5"><CalendarIcon size={16} className="text-[#B6C61A]"/> Date d'intervention</label>
                       <input 
                         type="date" 
                         value={formData.date} 
                         onChange={e => setFormData({...formData, date: e.target.value})}
                         className="w-full px-10 py-6 bg-slate-50 border-none rounded-[2rem] font-black text-[#006344] outline-none focus:ring-4 focus:ring-[#006344]/5 transition-all cursor-pointer shadow-inner"
                       />
                    </div>
                    <div className="space-y-4 md:col-span-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic ml-5 text-center justify-center"><DollarSign size={16} className="text-[#B6C61A]"/> Budget / Valeur Estimée (XAF)</label>
                       <input 
                         type="number" 
                         value={formData.price} 
                         onChange={e => setFormData({...formData, price: e.target.value})}
                         placeholder="0"
                         className="w-full px-10 py-8 bg-slate-900 border-none rounded-[2.5rem] font-black italic text-[#B6C61A] outline-none text-center text-4xl tabular-nums shadow-2xl"
                       />
                    </div>
                 </div>
              </div>

              <div className="p-12 bg-slate-50 flex gap-6 shrink-0 border-t border-slate-100">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-6 bg-white border border-slate-200 text-slate-400 font-black text-[12px] uppercase tracking-widest rounded-[2rem] transition-all hover:bg-slate-100 active:scale-95">Abandonner</button>
                 <button 
                  onClick={handleSavePrestation} 
                  disabled={isSubmitting}
                  className={`flex-[2] py-6 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all ${formData.isPaid ? 'bg-[#006344] text-[#B6C61A]' : 'bg-red-600 text-white'}`}
                 >
                    {isSubmitting ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={24} strokeWidth={4} />
                        {editingId ? 'Mettre à jour' : 'Enregistrer la prestation'}
                      </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .cursor-cell { cursor: cell; }
        @keyframes pulse-subtle { 0% { transform: scale(1); } 50% { transform: scale(1.02); opacity: 0.9; } 100% { transform: scale(1); } }
        .animate-pulse-subtle { animation: pulse-subtle 2s infinite ease-in-out; }
      `}} />
    </div>
  );
};

export default PrestationsModule;
