
import React, { useState, useEffect, useMemo } from 'react';
import { WeddingProject, Lead, ProductionTask } from '../../types.ts';
import { projectsService, leadsService, tasksService, supabase } from '../../lib/supabase.ts';
import CRMModule from '../modules/CRMModule.tsx';
import DevisModule from '../modules/DevisModule.tsx';
import FacturesModule from '../modules/FacturesModule.tsx';
import PrestationsModule from '../modules/PrestationsModule.tsx';
import RoutineModule from '../modules/RoutineModule.tsx';
import ProductionTasksModule from '../modules/ProductionTasksModule.tsx';
import WorkflowConfigModule from '../modules/WorkflowConfigModule.tsx';
import GlobalFinanceModule from '../modules/GlobalFinanceModule.tsx';
import TeamModule from '../modules/TeamModule.tsx';
import ProjectsView from '../ProjectsView.tsx';
import NewProjectModal from '../modules/NewProjectModal.tsx';
import EditProjectModal from '../modules/EditProjectModal.tsx';
import { 
  LayoutDashboard, Users, Heart, FileText, Clock, 
  RefreshCcw, ListTodo, Settings2, UserPlus, Loader2,
  Receipt, AlertTriangle, Calendar, Wallet, Bell
} from 'lucide-react';

interface ManajaNotif {
  id: string;
  type: 'overdue_project' | 'task_due' | 'new_lead';
  title: string;
  message: string;
  date: Date;
  read: boolean;
}

interface ManajaSpaceProps {
  onNotificationTrigger?: number;
  onNotificationSummaryChange?: (summary: { unreadCount: number }) => void;
}

const ManajaSpace: React.FC<ManajaSpaceProps> = ({ onNotificationTrigger, onNotificationSummaryChange }) => {
  const [activeSubTab, setActiveSubTab] = useState('projects');
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<ManajaNotif[]>([]);
  
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

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const list: ManajaNotif[] = [];
    projects.forEach(p => {
      const wd = p.weddingDate ? new Date(p.weddingDate) : null;
      if (wd && wd < now && p.status !== 'Archivé' && p.status !== 'Livré') {
        list.push({
          id: `overdue-${p.id}`,
          type: 'overdue_project',
          title: 'Projet en retard',
          message: `${p.couple} — date mariage dépassée`,
          date: now,
          read: false
        });
      }
    });
    allTasks.forEach(t => {
      if (t.deadline && t.deadline <= today && t.status !== 'Terminé' && t.status !== 'Livré S++') {
        const proj = projects.find(p => p.id === t.project_id);
        list.push({
          id: `task-${t.id}`,
          type: 'task_due',
          title: 'Tâche à traiter',
          message: `${t.title} — ${proj?.couple || 'Projet'}`,
          date: now,
          read: false
        });
      }
    });
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    leads.forEach(l => {
      const created = (l as any).created_at ? new Date((l as any).created_at) : null;
      if (created && created >= weekAgo) {
        list.push({
          id: `lead-${(l as any).id || l.email}`,
          type: 'new_lead',
          title: 'Nouveau lead',
          message: (l as any).name || l.email || 'Lead récent',
          date: created,
          read: false
        });
      }
    });
    setNotifications(list);
  }, [projects, allTasks, leads]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  useEffect(() => {
    if (onNotificationSummaryChange) onNotificationSummaryChange({ unreadCount });
  }, [unreadCount, onNotificationSummaryChange]);

  // Empêcher l'ouverture automatique du panneau au premier rendu
  const notifFirstRenderRef = useRef(true);
  useEffect(() => {
    if (onNotificationTrigger === undefined) return;
    if (notifFirstRenderRef.current) {
      notifFirstRenderRef.current = false;
      return;
    }
    setShowNotifications(prev => !prev);
  }, [onNotificationTrigger]);

  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

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
      {showNotifications && (
        <div className="fixed top-20 right-4 z-50 w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-sm font-black text-[#006344] uppercase italic">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-black text-[#006344] hover:underline">Tout marquer comme lu</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-black text-slate-400 uppercase italic">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`w-full p-4 border-b border-slate-50 ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notif.read ? 'bg-[#006344]' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black uppercase ${!notif.read ? 'text-[#006344]' : 'text-slate-600'}`}>{notif.title}</p>
                      <p className="text-sm font-medium text-slate-700 italic truncate">{notif.message}</p>
                      <span className="text-[9px] font-bold text-slate-400">{notif.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
