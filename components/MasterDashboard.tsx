
import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Space, SpaceInsight, TeamMember } from '../types.ts';
import { SPACES } from '../constants.tsx';
import { getSpaceInsight } from '../services/geminiService.ts';
import { teamService, supabase } from '../lib/supabase.ts'; // Added imports
import ManajaSpace from './spaces/ManajaSpace.tsx';
import SandraSpace from './spaces/SandraSpace.tsx';
import CyrilSpace from './spaces/CyrilSpace.tsx';
import EmployeeSpace from './spaces/DanielSpace.tsx';
import TeaserAdminSpace from './spaces/TeaserAdminSpace.tsx';
import DvdAdminSpace from './spaces/DvdAdminSpace.tsx';
import ComMarketingSpace from './spaces/ComMarketingSpace.tsx';
import SalairesSpace from './spaces/SalairesSpace.tsx';
import {
  Menu, X, LogOut, ChevronRight, Activity, Cpu, Shield, Zap, Search, Bell, Settings, User, Home, Layers,
  ChevronDown, Clapperboard, Users, Megaphone, Disc, Lock
} from 'lucide-react';
import GlobalSearch, { SearchTrigger } from './shared/GlobalSearch.tsx';
import SecurityLock from './shared/SecurityLock.tsx';

interface MasterDashboardProps {
  space: Space;
  member: TeamMember | null;
  onLogout: () => void;
  onSwitchSpace: (space: Space) => void;
}

// Fonction utilitaire pour attribuer une icône selon le pôle
const getIconForPole = (pole: string) => {
  switch (pole) {
    case 'FILM': return '🎬';
    case 'PHOTO': return '📸';
    case 'DVD': return '💿';
    case 'COM': return '📱';
    case 'ADMIN': return '🛡️';
    default: return '👤';
  }
};

const MasterDashboard: React.FC<MasterDashboardProps> = ({ space, member, onLogout, onSwitchSpace }) => {
  const [insight, setInsight] = useState<SpaceInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // SÉCURITÉ : États pour le verrouillage et les notifications
  const [isLocked, setIsLocked] = useState(false);
  const [isBellAnimating, setIsBellAnimating] = useState(false);


  // États pour les données dynamiques
  const [allSpaces, setAllSpaces] = useState<Space[]>(SPACES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [headerNotifUnread, setHeaderNotifUnread] = useState(0);
  const prevNotifUnreadRef = useRef(headerNotifUnread);
  const [headerNotifTrigger, setHeaderNotifTrigger] = useState(0);
  const [showSuperAdminNotifPanel, setShowSuperAdminNotifPanel] = useState(false);

  // Réinitialiser le compteur de notifications à chaque changement d’espace
  useEffect(() => {
    setHeaderNotifUnread(0);
  }, [space.id]);

  // ANIMATION CLOCHE ET GESTION INTELLIGENTE DES NOTIFS
  useEffect(() => {
    if (headerNotifUnread > 0 && headerNotifUnread > prevNotifUnreadRef.current) {
      setIsBellAnimating(true);
      const timer = setTimeout(() => setIsBellAnimating(false), 2000); // Animation de 2s
      return () => clearTimeout(timer);
    }
    prevNotifUnreadRef.current = headerNotifUnread;
  }, [headerNotifUnread]);

  // SÉCURITÉ : AUTO-LOCK (1 min inactivité pour Manager/Admin)
  useEffect(() => {
    // Uniquement pour les espaces sensibles
    if (!['nar6', 'manager'].includes(space.id)) return;

    const INACTIVITY_LIMIT = 60000; // 1 minute
    let timeoutId: NodeJS.Timeout;

    const lockSession = () => {
      setIsLocked(true);
    };

    const resetTimer = () => {
      if (isLocked) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(lockSession, INACTIVITY_LIMIT);
    };

    // Listeners d'activité
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer(); // Start initial timer

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearTimeout(timeoutId);
    };
  }, [space.id, isLocked]);

  const handleUnlock = async (enteredPin: string) => {
    // Priorité au PIN du membre connecté s'il existe
    if (member && member.status === 'Actif') {
      return enteredPin === member.pin;
    }
    // Sinon code de l'espace (pour login générique)
    return enteredPin === space.code;
  };


  const prevNotifTriggerRef = useRef(headerNotifTrigger);
  // Cloche Super Admin (nar6) : ouvrir/fermer le panneau uniquement au clic sur la cloche
  useEffect(() => {
    if (space.id !== 'nar6') {
      setShowSuperAdminNotifPanel(false);
      return;
    }
    if (prevNotifTriggerRef.current === headerNotifTrigger) return;
    prevNotifTriggerRef.current = headerNotifTrigger;
    if (headerNotifTrigger === 0) return;
    setShowSuperAdminNotifPanel(prev => !prev);
  }, [headerNotifTrigger, space.id]);

  useEffect(() => {
    if (space.id !== 'nar6') setShowSuperAdminNotifPanel(false);
  }, [space.id]);

  // DÉTECTION DU MODE ADMIN (NARCISSE)
  const [isAdminSession] = useState(() => space.id === 'nar6');

  // États des dropdowns
  const [isTeaserDropdownOpen, setIsTeaserDropdownOpen] = useState(false);
  const [isDvdDropdownOpen, setIsDvdDropdownOpen] = useState(false);

  // CHARGEMENT DES MEMBRES DYNAMIQUES
  useEffect(() => {
    const loadDynamicSpaces = async () => {
      try {
        const members = await teamService.getAll();
        setTeamMembers(members);

        // Convertir les membres en "Spaces"
        const memberSpaces: Space[] = members
          .filter(m => m.status === 'Actif')
          .map(m => ({
            id: m.id, // On utilise l'ID DB unique
            name: m.full_name.split(' ')[0], // Prénom
            icon: getIconForPole(m.pole),
            code: '', // Pas de code statique
            description: m.role
          }));

        // Fusionner : Espaces Statiques (constantes) + Espaces Dynamiques (DB)
        // On évite les doublons si un membre a un espace statique dédié (ex: Sandra, Cyril)
        const staticIds = SPACES.map(s => s.id);
        const newDynamicSpaces = memberSpaces.filter(ms =>
          !staticIds.includes(ms.name.toLowerCase()) && // Exclure si nom correspond à ID statique (ex: sandra)
          !staticIds.includes(ms.id)
        );

        setAllSpaces([...SPACES, ...newDynamicSpaces]);

      } catch (err) {
        console.error("Erreur chargement espaces dynamiques:", err);
      }
    };

    loadDynamicSpaces();

    // TEMPS RÉEL : Écouter les nouveaux membres ajoutés par le Manager
    const teamChannel = supabase
      .channel('realtime-team-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadDynamicSpaces();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamChannel);
    };
  }, []);

  useEffect(() => {
    const fetchInsight = async () => {
      setInsight(null);
      setLoadingInsight(true);
      try {
        const data = await getSpaceInsight(space);
        setInsight(data);
      } catch (err: any) {
        // Ne logger que les erreurs non liées à l'API key pour éviter le spam
        const errMsg = err?.message || String(err);
        if (!errMsg.includes('API key') && !errMsg.includes('API_KEY_INVALID')) {
          console.error("Insight error:", err);
        }
        // Définir un insight par défaut en cas d'erreur
        setInsight({
          title: "Analyse Stratégique",
          content: "L'intelligence artificielle nécessite une configuration pour fonctionner.",
          category: "Système"
        });
      } finally {
        setLoadingInsight(false);
      }
    };
    fetchInsight();
  }, [space]);

  // Groupes d'espaces dynamiques pour la Sidebar
  const teaserEditors = allSpaces.filter(s => {
    const mem = teamMembers.find(m => m.id === s.id);
    return mem && mem.pole === 'FILM';
  });

  const dvdEditors = allSpaces.filter(s => {
    const mem = teamMembers.find(m => m.id === s.id);
    return mem && mem.pole === 'DVD';
  });

  const mainSpaces = allSpaces.filter(s =>
    // Espaces statiques principaux
    ['manager', 'sandra', 'salaires', 'com', 'cyril', 'dvd', 'teaser'].includes(s.id)
  );

  // --- RENDU DU CONTENU CENTRAL ---
  const renderSpaceContent = () => {
    // 1. ESPACE SUPER ADMIN (NARCISSE)
    if (space.id === 'nar6') {
      return (
        <div className="animate-in zoom-in-95 duration-500 max-w-6xl mx-auto pt-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-100">
              <Shield size={40} className="text-[#006344]" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#006344] uppercase italic tracking-tighter">Commandement Narcisse</h1>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic">Accès Super-Administrateur // Niveau 05</p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-10 pl-2 border-l-8 border-[#006344]">Espaces Infrastructure</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {mainSpaces.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSwitchSpace(s)}
                  className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#B6C61A]/50 hover:scale-[1.02] transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity scale-150 origin-top-right text-[#006344] font-serif text-6xl">
                    {s.icon}
                  </div>
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-[#006344] group-hover:text-white transition-colors shadow-inner">
                    {s.icon}
                  </div>
                  <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tight group-hover:text-[#006344] transition-colors">{s.name}</h4>
                  <div className="flex items-center gap-2 mt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <Lock size={10} className="text-[#B6C61A]" /> Accès Sécurisé
                  </div>
                </button>
              ))}
            </div>

            {/* SECTION DYNAMIQUE POUR LES EMPLOYÉS */}
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-10 pl-2 border-l-8 border-[#B6C61A]">Équipe & Production</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {allSpaces.filter(s => !['nar6', ...mainSpaces.map(m => m.id)].includes(s.id)).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSwitchSpace(s)}
                  className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all group text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:bg-[#006344] group-hover:text-white transition-colors">
                    {s.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{s.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Espace Personnel</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 2. ROUTAGE UNIFIÉ DES ESPACES
    // Les gestionnaires gardent leurs espaces spécifiques
    switch (space.id) {
      case 'manager':
        return (
          <ManajaSpace
            onNotificationTrigger={headerNotifTrigger}
            onNotificationSummaryChange={({ unreadCount }) => setHeaderNotifUnread(unreadCount)}
          />
        );
      case 'sandra': return <SandraSpace member={member} />;
      case 'cyril': return <CyrilSpace member={member} />;
      case 'salaires': return <SalairesSpace />;
      case 'teaser':
        return (
          <TeaserAdminSpace
            member={member}
            onNotificationTrigger={headerNotifTrigger}
            onNotificationSummaryChange={({ unreadCount }) => setHeaderNotifUnread(unreadCount)}
          />
        );
      case 'dvd':
        return (
          <DvdAdminSpace
            member={member}
            onNotificationTrigger={headerNotifTrigger}
            onNotificationSummaryChange={({ unreadCount }) => setHeaderNotifUnread(unreadCount)}
          />
        );
      case 'com': return <ComMarketingSpace member={member} />;

      // CAS PAR DÉFAUT (EMPLOYÉS DYNAMIQUES + SUPER ADMIN nar6)
      default:
        const currentMember = teamMembers.find(m => m.id === space.id) || member;
        return (
          <EmployeeSpace
            member={currentMember}
            onLogout={onLogout}
            onNotificationTrigger={headerNotifTrigger}
            onNotificationSummaryChange={({ unreadCount }) => setHeaderNotifUnread(unreadCount)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F3] flex-col md:flex-row">

      {/* SIDEBAR : VISIBLE UNIQUEMENT POUR ADMIN (NARCISSE) OU MINIMISÉE POUR LES AUTRES */}
      <aside className={`bg-[#006344] text-white flex-col transition-all duration-300 relative z-[150] shadow-2xl hidden md:flex ${isSidebarOpen ? 'w-80' : 'w-24'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between h-20">
          <div className={`flex items-center gap-3 transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>
            <div className="w-10 h-10 bg-[#B6C61A] text-[#006344] flex items-center justify-center font-black rounded shadow-lg italic">M</div>
            <span className="font-black uppercase tracking-tighter text-xl italic">MARVEL</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* NAVIGATION - UNIQUEMENT SI SESSION ADMIN */}
        {isAdminSession ? (
          <nav className="flex-1 overflow-y-auto py-8 space-y-1 no-scrollbar">
            {/* BOUTON RETOUR HUB */}
            <button
              onClick={() => onSwitchSpace(SPACES.find(s => s.id === 'nar6')!)}
              className={`w-full flex items-center gap-4 px-6 py-4 transition-all group relative ${space.id === 'nar6' ? 'bg-white/10 text-[#B6C61A] border-r-4 border-[#B6C61A]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <span className="text-2xl group-hover:scale-110 transition-transform shrink-0"><Home size={24} /></span>
              {isSidebarOpen && <span className="block text-[11px] font-black uppercase tracking-[0.2em] italic flex-1 text-left">HUB CENTRAL</span>}
            </button>

            <div className="my-4 border-t border-white/10 mx-6"></div>

            {mainSpaces.map((s) => (
              <button
                key={s.id}
                onClick={() => onSwitchSpace(s)}
                className={`w-full flex items-center gap-4 px-6 py-4 transition-all group relative ${s.id === space.id
                  ? 'bg-[#B6C61A] text-[#006344]'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform shrink-0">{s.icon}</span>
                {isSidebarOpen && <span className="block text-[11px] font-black uppercase tracking-[0.2em] italic flex-1 text-left">{s.name}</span>}
                {isSidebarOpen && s.id === space.id && <ChevronRight size={14} />}
              </button>
            ))}

            {/* TEASER DROPDOWN DYNAMIQUE */}
            <div className="mt-4 border-t border-white/5 pt-4">
              <button
                onClick={() => isSidebarOpen && setIsTeaserDropdownOpen(!isTeaserDropdownOpen)}
                className={`w-full flex items-center gap-4 px-6 py-4 transition-all group relative ${teaserEditors.some(s => s.id === space.id) ? 'text-[#B6C61A]' : 'text-white/40 hover:text-white'
                  }`}
              >
                <Clapperboard size={24} className="shrink-0 group-hover:scale-110 transition-transform" />
                {isSidebarOpen && (
                  <>
                    <span className="block text-[11px] font-black uppercase tracking-[0.2em] italic flex-1 text-left">Équipe Film/Teaser</span>
                    <div className="bg-[#B6C61A] text-[#006344] text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">{teaserEditors.length}</div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isTeaserDropdownOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
              {isTeaserDropdownOpen && isSidebarOpen && (
                <div className="bg-black/10 py-2 animate-in slide-in-from-top-2 duration-300">
                  {teaserEditors.map((s) => (
                    <button key={s.id} onClick={() => onSwitchSpace(s)} className={`w-full flex items-center gap-4 pl-12 pr-6 py-3 transition-all relative ${s.id === space.id ? 'text-white border-l-4 border-[#B6C61A] bg-white/5' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
                      <span className="text-lg shrink-0">{s.icon}</span>
                      <span className="block text-[9px] font-black uppercase tracking-[0.2em] italic flex-1 text-left">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DVD DROPDOWN DYNAMIQUE */}
            <div className="mt-2 border-t border-white/5 pt-2">
              <button
                onClick={() => isSidebarOpen && setIsDvdDropdownOpen(!isDvdDropdownOpen)}
                className={`w-full flex items-center gap-4 px-6 py-4 transition-all group relative ${dvdEditors.some(s => s.id === space.id) ? 'text-[#B6C61A]' : 'text-white/40 hover:text-white'
                  }`}
              >
                <Disc size={24} className="shrink-0 group-hover:scale-110 transition-transform" />
                {isSidebarOpen && (
                  <>
                    <span className="block text-[11px] font-black uppercase tracking-[0.2em] italic flex-1 text-left">Équipe DVD/Photo</span>
                    <div className="bg-[#B6C61A] text-[#006344] text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">{dvdEditors.length}</div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isDvdDropdownOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
              {isDvdDropdownOpen && isSidebarOpen && (
                <div className="bg-black/10 py-2 animate-in slide-in-from-top-2 duration-300">
                  {dvdEditors.map((s) => (
                    <button key={s.id} onClick={() => onSwitchSpace(s)} className={`w-full flex items-center gap-4 pl-12 pr-6 py-3 transition-all relative ${s.id === space.id ? 'text-white border-l-4 border-[#B6C61A] bg-white/5' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
                      <span className="text-lg shrink-0">{s.icon}</span>
                      <span className="block text-[9px] font-black uppercase tracking-[0.2em] italic flex-1 text-left">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        ) : (
          // MODE UTILISATEUR SIMPLE (Barre latérale vide ou infos minimales)
          <div className="flex-1 flex flex-col items-center pt-10 px-4 text-center opacity-50">
            <Lock size={32} className="text-white/20 mb-4" />
            {isSidebarOpen && <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Navigation Verrouillée</p>}
          </div>
        )}

        <div className="p-4 mt-auto border-t border-white/5">
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-4 text-white/40 hover:text-[#BD3B1B] font-black text-[10px] uppercase tracking-[0.3em] italic group transition-all">
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* HEADER TOP */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 px-4 md:px-10 flex items-center justify-between shrink-0 relative z-[100]">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <span className="text-2xl md:text-3xl drop-shadow-md shrink-0">{space.icon}</span>
            <div className="h-6 md:h-8 w-[2px] bg-slate-100 mx-1 md:mx-2 shrink-0"></div>
            <div className="truncate">
              <h2 className="text-lg md:text-2xl font-black text-[#006344] tracking-tighter uppercase italic truncate">
                {space.id === 'nar6' ? 'SUPER ADMIN' : `ESPACE ${space.name.toUpperCase()}`}
              </h2>
              <p className="hidden sm:block text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic leading-none mt-1">
                {member ? `Session : ${member.full_name}` : 'Accès Sécurisé'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-8">
            <div className="hidden sm:block"><SearchTrigger onClick={() => setShowGlobalSearch(true)} /></div>
            <button onClick={() => setShowGlobalSearch(true)} className="sm:hidden p-2 text-slate-400"><Search size={20} /></button>
            <div className="flex items-center gap-2 md:gap-4 pl-2 md:pl-4 border-l border-slate-100">
              <button
                onClick={() => setHeaderNotifTrigger((t) => t + 1)}
                className={`p-2 text-slate-300 relative hover:text-[#B6C61A] transition-all ${isBellAnimating ? 'animate-bounce text-[#B6C61A]' : ''}`}
              >
                <Bell size={20} className={isBellAnimating ? 'drop-shadow-[0_0_8px_rgba(182,198,26,0.6)]' : ''} />
                {headerNotifUnread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#BD3B1B] rounded-full border border-white"></span>
                )}
              </button>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#006344] border border-slate-200 flex items-center justify-center text-[10px] font-black text-[#B6C61A] italic shadow-lg">
                {member ? member.full_name.substring(0, 2).toUpperCase() : (isAdminSession ? 'NA' : 'UR')}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#F4F6F3] pb-24 md:pb-10">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><Cpu className="text-[#006344] w-12 h-12 animate-spin" /></div>}>
            {renderSpaceContent()}
          </Suspense>
        </main>

        {/* Panneau notifications Super Admin (nar6) — ouvert par la cloche du header */}
        {space.id === 'nar6' && showSuperAdminNotifPanel && (
          <div className="fixed top-20 right-4 z-50 w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-[#006344] uppercase italic">Notifications Super Admin</h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-8">
              <div className="text-center">
                <Bell size={48} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-black text-slate-400 uppercase italic">Aucune notification</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Hub Commandement Narcisse</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE NAV (Uniquement pour Admin) */}
      {isAdminSession && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-4 z-[200] shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1 text-slate-400"><Layers size={20} /><span className="text-[8px] font-black uppercase tracking-widest">Espaces</span></button>
          <button onClick={() => onSwitchSpace(SPACES.find(s => s.id === 'nar6')!)} className="flex flex-col items-center gap-1 text-[#006344]"><Home size={20} /><span className="text-[8px] font-black uppercase tracking-widest">Hub</span></button>
          <button className="flex flex-col items-center gap-1 text-slate-400"><Search size={20} onClick={() => setShowGlobalSearch(true)} /><span className="text-[8px] font-black uppercase tracking-widest">Chercher</span></button>
          <button className="flex flex-col items-center gap-1 text-slate-400" onClick={onLogout}><LogOut size={20} /><span className="text-[8px] font-black uppercase tracking-widest">Sortir</span></button>
        </nav>
      )}

      {/* MOBILE DRAWER (Uniquement pour Admin) */}
      {isMobileMenuOpen && isAdminSession && (
        <div className="fixed inset-0 z-[300] md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-[#006344] uppercase italic">Choisir un Espace</h3><button onClick={() => setIsMobileMenuOpen(false)} className="p-2"><X /></button></div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {allSpaces.map(s => (
                  <button key={s.id} onClick={() => { onSwitchSpace(s); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.id === space.id ? 'bg-[#006344] text-white border-[#006344]' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    <span className="text-2xl">{s.icon}</span><span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <GlobalSearch isOpen={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} onSelect={(result) => console.log('Selected:', result)} />

      {/* SECURITY LOCK OVERLAY */}
      <SecurityLock
        isOpen={isLocked}
        onUnlock={handleUnlock}
      />
    </div>
  );
};

export default MasterDashboard;
