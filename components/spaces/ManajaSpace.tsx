
import React, { useState, useEffect } from 'react';
import { WeddingProject, Lead, ProductionTask } from '../../types.ts';
import { projectsService, leadsService, tasksService, supabase } from '../../lib/supabase.ts';
import CRMModule from '../modules/CRMModule.tsx';
import DevisModule from '../modules/DevisModule.tsx';
import FacturesModule from '../modules/FacturesModule.tsx';
import PrestationsModule from '../modules/PrestationsModule.tsx';
import RoutineModule from '../modules/RoutineModule.tsx';
import ProductionTasksModule from '../modules/ProductionTasksModule.tsx';
import WorkflowConfigModule from '../modules/WorkflowConfigModule.tsx';
import GlobalFinanceModule from '../modules/GlobalFinanceModule.tsx'; // Import du nouveau module
import TeamModule from '../modules/TeamModule.tsx';
import ProjectsView from '../ProjectsView.tsx';
import NewProjectModal from '../modules/NewProjectModal.tsx';
import EditProjectModal from '../modules/EditProjectModal.tsx';
import { 
  LayoutDashboard, Users, Heart, FileText, Clock, 
  RefreshCcw, ListTodo, Settings2, UserPlus, Loader2,
  Receipt, AlertTriangle, Calendar, Wallet // Wallet icon for Finance
} from 'lucide-react';

const ManajaSpace: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('projects');
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<WeddingProject | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [pData, lData, tData] = await Promise.all([
        projectsService.getAll(),
        leadsService.getAll(),
        tasksService.getAll()
      ]);
      
      const transformed = (pData as any[]).map(item => ({
        id: item.id,
        couple: item.couple,
        weddingDate: item.wedding_date,
        country: item.country,
        amount: Number(item.amount),
        status: item.status,
        progress: item.progress,
        delayDays: item.delay_days || 0,
        isLegacy: item.is_legacy,
        requiresSync: item.requires_sync,
        formula: item.formula,
        packageType: item.package_type,
        packageDetail: item.package_detail,
        albumTeaser: item.album_teaser || '',
        hasDowry: item.has_dowry,
        dowryDate: item.dowry_date,
        brideOrigin: item.bride_origin,
        groomOrigin: item.groom_origin,
        sameDay: item.same_day,
        cityHallDate: item.city_hall_date,
        guestCount: item.guest_count,
        deliveryTime: item.delivery_time,
        clientNotes: item.client_notes,
        options: item.selected_options || [],
        teaser_data: item.teaser_data,
        poleDVD: item.pole_dvd || { currentStep: 0, assignedTo: '', status: 'pending' },
        poleFilm: item.pole_film || { currentStep: 0, assignedTo: '', status: 'pending' },
        polePhoto: item.pole_photo || { currentStep: 0, assignedTo: '', status: 'pending' },
        poleCom: item.pole_com || { currentStep: 0, assignedTo: '', status: 'pending' },
        clientFeedbacks: item.client_feedbacks || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setProjects(transformed);
      setLeads(lData);
      setAllTasks(tData);
    } catch (error) {
      console.error("Fetch failure:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Configuration du Temps Réel pour Projects et Leads
    const projectsChannel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wedding_projects' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
    };
  }, []);

  const navItems = [
    { id: 'projects', label: 'PROJETS', icon: Heart },
    { id: 'prestations', label: 'PRESTATIONS', icon: Calendar },
    { id: 'crm', label: 'LEADS', icon: Users },
    { id: 'devis', label: 'DEVIS', icon: FileText },
    { id: 'factures', label: 'FACTURES', icon: Receipt },
    { id: 'tasks', label: 'OPERATIONS', icon: ListTodo },
    { id: 'team', label: 'EQUIPE', icon: UserPlus },
    { id: 'finance', label: 'FINANCE', icon: Wallet }, // Updated from ANALYTICS
    { id: 'production', label: 'WORKFLOWS', icon: Settings2 },
  ];

  return (
    <div className="min-h-full flex flex-col w-full overflow-hidden">
      <div className="bg-white border-b border-slate-100 px-4 md:px-8 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSubTab(item.id)}
            className={`px-4 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-4 flex items-center gap-2 md:gap-3 italic shrink-0 ${
              activeSubTab === item.id 
                ? 'border-black text-black bg-slate-50' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon size={14} />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#FDFDFD]">
          {activeSubTab === 'projects' && (
            <ProjectsView 
              projects={projects} 
              allTasks={allTasks}
              loading={loading} 
              onNewProject={() => setIsNewProjectOpen(true)}
              onRefresh={() => fetchData()}
              onEditProject={(p) => {
                setSelectedProject(p);
                setIsEditProjectOpen(true);
              }}
              onViewWorkflow={(p) => {
                setSelectedProject(p);
                setActiveSubTab('tasks');
              }}
            />
          )}
          {activeSubTab === 'prestations' && (
            <PrestationsModule 
              projects={projects} 
              leads={leads} 
              onRefresh={() => fetchData(true)}
            />
          )}
          {activeSubTab === 'crm' && <CRMModule />}
          {activeSubTab === 'devis' && <DevisModule />}
          {activeSubTab === 'factures' && <FacturesModule />}
          {activeSubTab === 'tasks' && <ProductionTasksModule onRefreshProject={() => fetchData()} />}
          {activeSubTab === 'team' && <TeamModule />}
          {activeSubTab === 'finance' && <GlobalFinanceModule />} {/* Replaced CrmDashboard */}
          {activeSubTab === 'production' && <WorkflowConfigModule />}
      </div>
      
      <NewProjectModal 
        isOpen={isNewProjectOpen} 
        onClose={() => setIsNewProjectOpen(false)} 
        onSave={async (data) => {
          await projectsService.create(data);
          setIsNewProjectOpen(false);
          fetchData();
        }} 
      />
      
      {selectedProject && isEditProjectOpen && (
        <EditProjectModal 
          isOpen={isEditProjectOpen} 
          project={selectedProject} 
          onClose={() => setIsEditProjectOpen(false)} 
          onSave={async (p) => {
            await projectsService.update(p.id, p);
            setIsEditProjectOpen(false);
            fetchData();
          }} 
          onArchive={() => fetchData()} 
          onDelete={() => fetchData()} 
        />
      )}
    </div>
  );
};

export default ManajaSpace;
