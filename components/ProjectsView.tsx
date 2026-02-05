import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Calendar, AlertCircle, 
  ArrowRight, Globe, User, Clock, PackageCheck,
  ChevronDown, Filter, CalendarDays, CalendarRange,
  AlertTriangle, BookOpen, Trash2, Loader2, Archive
} from 'lucide-react';
import { WeddingProject, PoleStatus, ProductionTask } from '../types';
import { projectsService } from '../lib/supabase';
import { FORMULA_WORKFLOWS, DetailedTaskTemplate } from '../types/taskPlanning';

interface ProjectsViewProps {
  projects: WeddingProject[];
  allTasks?: ProductionTask[];
  loading: boolean;
  onNewProject: () => void;
  onEditProject: (project: WeddingProject) => void;
  onViewWorkflow: (project: WeddingProject) => void;
  onDeleteProject?: (id: string) => Promise<void> | void;
  onArchiveProject?: (id: string) => Promise<void> | void;
  onRefresh?: () => void;
}

const MONTHS = [
  { id: 'all', label: 'TOUS LES MOIS' },
  { id: '0', label: 'JANVIER' },
  { id: '1', label: 'FÉVRIER' },
  { id: '2', label: 'MARS' },
  { id: '3', label: 'AVRIL' },
  { id: '4', label: 'MAI' },
  { id: '5', label: 'JUIN' },
  { id: '6', label: 'JUILLET' },
  { id: '7', label: 'AOÛT' },
  { id: '8', label: 'SEPTEMBRE' },
  { id: '9', label: 'OCTOBRE' },
  { id: '10', label: 'NOVEMBRE' },
  { id: '11', label: 'DÉCEMBRE' },
];

const YEARS = ['TOUS', '2024', '2025', '2026', '2027'];

const calculateProjectOverdueCount = (project: WeddingProject): number => {
  const now = new Date();
  const weddingDate = new Date(project.weddingDate);
  const formulaName = project.formula || "Photo + Film long";
  const workflowSteps = (FORMULA_WORKFLOWS[formulaName] || FORMULA_WORKFLOWS["Photo + Film long"] || []) as DetailedTaskTemplate[];
  let totalOverdue = 0;

  const poles: { id: 'PHOTO' | 'FILM' | 'DVD' | 'COM', current: number }[] = [
    { id: 'PHOTO', current: project.polePhoto?.currentStep || 0 },
    { id: 'FILM', current: project.poleFilm?.currentStep || 0 },
    { id: 'DVD', current: project.poleDVD?.currentStep || 0 },
    { id: 'COM', current: project.poleCom?.currentStep || 0 }
  ];

  poles.forEach(p => {
    const poleSteps = workflowSteps.filter((s) => s.pole === p.id).sort((a, b) => a.day - b.day);
    poleSteps.forEach((step, idx) => {
      const stepNumber = idx + 1;
      if (p.current < stepNumber) {
        const deadlineDate = new Date(weddingDate);
        deadlineDate.setDate(weddingDate.getDate() + step.day);
        if (deadlineDate < now) {
          totalOverdue++;
        }
      }
    });
  });

  return totalOverdue;
};

const getCountryFlag = (country?: string) => {
  if (!country) return '🌍';
  const c = country.toLowerCase();
  if (c.includes('cameroun')) return '🇨🇲';
  if (c.includes('france')) return '🇫🇷';
  return '🌍';
};

const ProjectsView: React.FC<ProjectsViewProps> = ({ 
  projects, 
  loading, 
  onNewProject, 
  onEditProject, 
  onDeleteProject, 
  onArchiveProject, 
  onRefresh 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('Tous Pays');
  const [selectedYear, setSelectedYear] = useState('TOUS');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'Archivé'), [projects]);

  const periodStats = useMemo(() => {
    const yearCounts: Record<string, number> = {};
    const monthCounts: Record<string, number> = {};
    activeProjects.forEach(p => {
      const date = new Date(p.weddingDate);
      const year = date.getFullYear().toString();
      const month = date.getMonth().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
      if (selectedYear === year) monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    return { yearCounts, monthCounts };
  }, [activeProjects, selectedYear]);

  const filteredProjects = useMemo(() => {
    return activeProjects
      .filter(p => {
        const date = new Date(p.weddingDate);
        const matchesSearch = p.couple.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCountry = countryFilter === 'Tous Pays' || p.country === countryFilter;
        const matchesYear = selectedYear === 'TOUS' || date.getFullYear().toString() === selectedYear;
        const matchesMonth = selectedMonth === 'all' || date.getMonth().toString() === selectedMonth;
        return matchesSearch && matchesCountry && matchesYear && matchesMonth;
      })
      .sort((a, b) => {
        // TRI PAR DATE DE LIVRAISON (Date Mariage + Délai contractuel)
        const deliveryA = new Date(a.weddingDate);
        deliveryA.setDate(deliveryA.getDate() + (a.deliveryTime || 80));
        
        const deliveryB = new Date(b.weddingDate);
        deliveryB.setDate(deliveryB.getDate() + (b.deliveryTime || 80));
        
        return deliveryA.getTime() - deliveryB.getTime();
      });
  }, [activeProjects, searchTerm, countryFilter, selectedYear, selectedMonth]);

  const groupedProjects = useMemo(() => {
    const groups: Record<string, WeddingProject[]> = {};
    let groupingType: 'year' | 'month' = 'year';
    if (selectedYear !== 'TOUS') groupingType = 'month';

    filteredProjects.forEach(p => {
      const date = new Date(p.weddingDate);
      let key = '';
      if (groupingType === 'year') {
        key = date.getFullYear().toString();
      } else {
        key = date.toLocaleString('fr-FR', { month: 'long' }).toUpperCase();
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    
    // Pour les groupes, on garde un tri temporel logique (les années les plus récentes en haut)
    // Mais à l'intérieur, les projets sont déjà triés par date de livraison via filteredProjects.sort
    return groups;
  }, [filteredProjects, selectedYear]);

  const handleQuickUpdate = async (project: WeddingProject, poleKey: string, step: number) => {
    const dbKey = poleKey === 'DVD' ? 'pole_dvd' : poleKey === 'FILM' ? 'pole_film' : poleKey === 'PHOTO' ? 'pole_photo' : 'pole_com';
    const poleProp = `pole${poleKey === 'DVD' ? 'DVD' : poleKey.charAt(0) + poleKey.slice(1).toLowerCase()}`;
    const currentPole = (project as any)[poleProp];
    const updatedPole = { ...currentPole, currentStep: step, status: step > 0 ? 'in_progress' : 'pending' };
    try {
      await projectsService.update(project.id, { [dbKey]: updatedPole });
      if (onRefresh) onRefresh();
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center h-full gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#006344]"></div>
      <p className="font-black text-[#006344] uppercase italic tracking-[0.3em]">Initialisation Index Temporel...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Barre de Recherche et Filtre Pays */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-4 w-full xl:w-auto flex-1 items-center">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="RECHERCHER UN COUPLE DANS L'INDEX..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase italic tracking-widest outline-none focus:ring-4 focus:ring-[#006344]/5 transition-all"
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <select 
              value={countryFilter} 
              onChange={(e) => setCountryFilter(e.target.value)} 
              className="px-6 py-3 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:bg-slate-50 transition-colors min-w-[140px] shadow-sm"
            >
              <option>Tous Pays</option>
              <option>Cameroun</option>
              <option>France</option>
            </select>
            <button type="button" onClick={onNewProject} className="bg-[#006344] text-[#B6C61A] px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <Plus size={16} strokeWidth={4} /> NOUVEAU PROJET
            </button>
          </div>
        </div>
      </div>

      {/* Indexation Temporelle (Années et Mois) */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-subtle border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <CalendarRange className="text-[#B6C61A]" size={24} />
              <div>
                 <h3 className="text-[12px] font-black text-[#006344] uppercase italic tracking-[0.2em]">Indexation Temporelle</h3>
                 <p className="text-[8px] font-bold text-slate-400 uppercase italic">Trié par priorité de livraison</p>
              </div>
           </div>
           <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
              {YEARS.map(year => {
                const count = year === 'TOUS' ? activeProjects.length : (periodStats.yearCounts[year] || 0);
                return (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setSelectedMonth('all'); }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                      selectedYear === year ? 'bg-[#B6C61A] text-[#006344] shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {year} {count > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${selectedYear === year ? 'bg-[#006344] text-white' : 'bg-slate-200 text-slate-500'}`}>({count})</span>}
                  </button>
                );
              })}
           </div>
        </div>

        {selectedYear !== 'TOUS' && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar animate-in slide-in-from-top-2 duration-300">
            {MONTHS.map(month => {
              const count = month.id === 'all' ? (periodStats.yearCounts[selectedYear] || 0) : (periodStats.monthCounts[month.id] || 0);
              if (month.id !== 'all' && count === 0) return null;
              return (
                <button
                  key={month.id}
                  onClick={() => setSelectedMonth(month.id)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-3 border ${
                    selectedMonth === month.id 
                      ? 'bg-[#006344] text-white border-[#006344] shadow-lg' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-[#B6C61A]/50'
                  }`}
                >
                  {month.label}
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${selectedMonth === month.id ? 'bg-[#B6C61A] text-[#006344]' : 'bg-slate-50 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Liste des Projets Groupés */}
      <div className="space-y-12">
        {Object.entries(groupedProjects).sort((a,b) => b[0].localeCompare(a[0])).map(([groupTitle, groupProjects]) => (
          <section key={groupTitle} className="space-y-6">
            <div className="flex items-center gap-4 px-4">
              <div className="h-px bg-slate-200 flex-1" />
              <h2 className="text-[12px] font-black text-[#006344] uppercase italic tracking-tighter flex items-center gap-3">
                <CalendarDays size={16} className="text-[#B6C61A]" /> {groupTitle}
                <span className="text-slate-300 not-italic ml-2">({groupProjects.length})</span>
              </h2>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
            <div className="grid grid-cols-1 gap-8">
              {groupProjects.map((project) => (
                <ProjectIndustrialCard 
                  key={project.id} 
                  project={project} 
                  onAction={() => onEditProject(project)} 
                  onDelete={async () => { if (onDeleteProject) await onDeleteProject(project.id); }} 
                  onArchive={async () => { if (onArchiveProject) await onArchiveProject(project.id); }}
                  onQuickUpdate={handleQuickUpdate} 
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

interface ProjectIndustrialCardProps {
  project: WeddingProject;
  onAction: () => void;
  onDelete?: () => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onQuickUpdate: (project: WeddingProject, pole: string, step: number) => void;
}

const ProjectIndustrialCard: React.FC<ProjectIndustrialCardProps> = ({ project, onAction, onDelete, onArchive, onQuickUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const formulaName = project.formula || "Photo + Film long";
  // Explicitly cast to DetailedTaskTemplate[] to avoid unknown type error
  const workflowSteps = (FORMULA_WORKFLOWS[formulaName] || FORMULA_WORKFLOWS["Photo + Film long"] || []) as DetailedTaskTemplate[];
  
  const overdueInfo = useMemo(() => {
    const count = calculateProjectOverdueCount(project);
    return { isLate: count > 0, count };
  }, [project]);

  const deliveryDate = new Date(project.weddingDate);
  deliveryDate.setDate(deliveryDate.getDate() + (project.deliveryTime || 80));

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isProcessing) return;
    if (window.confirm(`🚨 SUPPRESSION DÉFINITIVE : Êtes-vous sûr de vouloir effacer le projet de "${project.couple}" ?`)) {
      setIsProcessing(true);
      try { if (onDelete) await onDelete(); } 
      catch (err) { alert("Erreur lors de la suppression."); }
      finally { setIsProcessing(false); }
    }
  };

  const handleArchiveClick = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isProcessing) return;
    if (window.confirm(`📦 ARCHIVAGE : Souhaitez-vous déplacer le projet de "${project.couple}" vers les archives ?`)) {
      setIsProcessing(true);
      try { if (onArchive) await onArchive(); } 
      catch (err) { alert("Erreur lors de l'archivage."); }
      finally { setIsProcessing(false); }
    }
  };

  return (
    <div className={`group relative bg-white rounded-[3.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col xl:flex-row overflow-hidden border ${overdueInfo.isLate ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-100'}`}>
      <div className={`w-3 shrink-0 ${overdueInfo.isLate ? 'bg-red-600' : 'bg-[#B6C61A]'}`} />
      
      <div onClick={onAction} className="p-8 xl:w-80 flex flex-col justify-center border-r border-slate-50 shrink-0 cursor-pointer relative">
        <div className="absolute top-6 right-6 text-4xl drop-shadow-lg z-10 transition-transform group-hover:scale-125" title={project.country}>
          {getCountryFlag(project.country)}
        </div>

        {overdueInfo.isLate && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg animate-bounce">
            <AlertTriangle size={12} /> RETARD ({overdueInfo.count})
          </div>
        )}
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-4 group-hover:text-[#006344] transition-colors pr-10">{project.couple}</h3>
        <div className="space-y-2 mt-6">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest"><Calendar size={12} className="text-[#B6C61A]" /> {new Date(project.weddingDate).toLocaleDateString('fr-FR')}</div>
          <div className="flex items-center gap-2 font-black text-[9px] uppercase tracking-widest p-2 rounded-xl bg-slate-50 text-slate-500 border border-slate-100"><PackageCheck size={12} /> LIVRAISON : {deliveryDate.toLocaleDateString('fr-FR')}</div>
        </div>
      </div>

      <div className="flex-1 p-8 grid grid-cols-2 lg:grid-cols-4 gap-8 bg-slate-50/20">
        {(['PHOTO', 'FILM', 'DVD', 'COM'] as const).map(pole => {
          const poleProp = `pole${pole === 'DVD' ? 'DVD' : pole.charAt(0) + pole.slice(1).toLowerCase()}`;
          const poleData = (project as any)[poleProp] || { currentStep: 0 };
          
          const currentPoleSteps = ((workflowSteps as DetailedTaskTemplate[]) || [])
            .filter((t) => t.pole === pole)
            .sort((a, b) => a.day - b.day) as DetailedTaskTemplate[];
          
          if (!currentPoleSteps || currentPoleSteps.length === 0) return null;
          
          const progress = Math.round((poleData.currentStep / currentPoleSteps.length) * 100) || 0;
          return (
            <div key={pole} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{pole === 'DVD' ? 'ALBUM' : pole} <span className="text-[#006344] italic ml-1">{progress}%</span></span>
              </div>
              <div className="relative h-6 flex items-center px-1">
                <div className="absolute left-0 right-0 h-1 bg-slate-200 rounded-full" />
                <div className="absolute left-0 h-1 bg-[#B6C61A] transition-all duration-700 rounded-full" style={{ width: `${progress}%` }} />
                <div className="absolute left-0 right-0 flex justify-between px-0.5">
                   {currentPoleSteps.map((s, idx) => (
                     <button key={idx} type="button" onClick={(e) => { e.stopPropagation(); onQuickUpdate(project, pole, idx+1); }} className={`w-3 h-3 rounded-full border-2 transition-all relative z-10 ${poleData.currentStep >= idx+1 ? 'bg-[#006344] border-[#006344]' : 'bg-white border-slate-200 hover:scale-125'}`} />
                   ))}
                </div>
              </div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">{poleData.assignedTo || 'Non assigné'}</p>
            </div>
          );
        })}
      </div>
      
      <div className="p-8 xl:w-64 flex items-center justify-center shrink-0 border-l border-slate-50 gap-3 bg-white relative z-50">
        <button 
          type="button"
          onClick={handleArchiveClick}
          disabled={isProcessing}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm group/arch ${
            isProcessing ? 'bg-slate-100 text-slate-300' : 'bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white'
          }`}
          title="Archiver le projet"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Archive size={18} className="group-hover/arch:scale-110 transition-transform" />}
        </button>

        <button 
          type="button"
          onClick={handleDeleteClick}
          disabled={isProcessing}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm group/del ${
            isProcessing ? 'bg-slate-100 text-slate-300' : 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white'
          }`}
          title="Supprimer le projet"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />}
        </button>
        
        <button 
          type="button"
          onClick={onAction}
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-slate-300 hover:bg-[#B6C61A] hover:text-[#006344] shadow-sm transition-all"
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default ProjectsView;