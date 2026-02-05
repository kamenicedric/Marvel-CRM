
import React, { useState, useEffect, useMemo } from 'react';
import { projectsService } from '../../lib/supabase.ts';
import { TeamMember, WeddingProject } from '../../types.ts';
import { GoogleGenAI } from "@google/genai";
import { 
  Megaphone, Instagram, MessageSquare, 
  TrendingUp, Calendar, Clock, CheckCircle2, LayoutGrid, 
  PenTool, Target, Zap, Globe, ArrowRight, Smartphone, 
  Copy, Check, UserPlus, Trophy, Rocket, BrainCircuit, 
  ChevronRight, ChevronLeft, BarChart3, Layers, Lightbulb,
  Crosshair, Fingerprint, Eye, Users, Wallet,
  ShieldCheck, Flame, Medal, MapPin, SearchCheck,
  Video, Radio, Bell, FileText, Activity, Coffee, 
  Sunrise, Sunset, BookCheck, ClipboardCheck, Heart, Sparkles, Loader2,
  ArrowUpRight, BookOpen, Compass, Edit3, Save, RotateCcw, X, Star, Award,
  ArrowUp, BadgeCheck, CopyCheck, Share2, MousePointer2, CalendarDays,
  Layout, List, ChevronLeftCircle, ChevronRightCircle
} from 'lucide-react';

interface ComMarketingSpaceProps {
  member: TeamMember | null;
}

interface CustomTask {
  task: string;
  details: string;
}

interface DayOverride {
  studio: CustomTask;
  wedding: CustomTask;
  studioCompleted?: boolean;
  studioRating?: number;
  weddingCompleted?: boolean;
  weddingRating?: number;
}

// --- CONTENU DES SCRIPTS ---
const scriptsLibrary = {
  wa: [
    { title: "Premier Contact Lead", content: "Bonjour [Nom], merci d'avoir contacté Maison Marvelous ! Nous sommes honorés que vous envisagiez notre expertise pour votre union. Souhaitez-vous recevoir notre brochure Prestige ou préférez-vous un appel de 10 min pour discuter de votre vision ?" },
    { title: "Relance J+3 (Preuve Sociale)", content: "Bonjour [Nom], je pensais à votre projet. Voici un petit aperçu du dernier mariage que nous avons couvert au Kribi. C'est exactement l'ambiance lumineuse que vous recherchez. Toujours disponible pour un échange ?" },
    { title: "Félicitations Post-Dote", content: "Félicitations à vous deux pour cette étape magnifique ! 🥂 L'équipe Marvel prépare déjà le terrain pour le jour J. On se voit très vite pour le calage technique." }
  ],
  bios: [
    { title: "Instagram Prestige", content: "💎 Maison Marvelous\n💍 Capturer l'invisible, immortaliser l'Élite\n📸 Studio & Cinéma de Mariage\n📍 Douala & Diaspora\n👇 Réservez votre séance d'exception" },
    { title: "TikTok Storyteller", content: "L'art du Mariage à la Camerounaise 🇨🇲\n✨ Coulisses, Teasers & Émotions pures\n🎥 Par @MaisonMarvelous" }
  ],
  rep: [
    { title: "Réponse Avis Google 5*", content: "Merci infiniment [Nom] ! Ce fut un privilège d'immortaliser votre union. Votre confiance est notre plus belle récompense. Au plaisir de vous revoir au Studio !" },
    { title: "Gestion Critique (Délais)", content: "Bonjour [Nom], nous comprenons votre impatience. La qualité Marvel demande un travail de précision (étalonnage, sound design). Votre chef-d'œuvre arrive sous 48h. Merci de votre patience." }
  ],
  funnel: [
    { title: "Lead Magnet J-90", content: "Téléchargez notre guide : 'Les 10 secrets pour un mariage réussi au Cameroun (Spécial Diaspora)'." },
    { title: "Offre Flash Studio", content: "Seulement 3 créneaux disponibles ce samedi pour les séances Grossesse. -15% pour les 2 premières réservations !" }
  ]
};

const growthMatrix = [
  { 
    cat: 'Visibilité Diaspora', 
    icon: Globe, 
    list: [
      { tech: 'Ciblage Meta Ads Europe/USA', desc: 'Focus sur les communautés camerounaises en France et Belgique (Nostalgie).' },
      { tech: 'SEO Local Pinterest', desc: 'Optimisation des tableaux "Mariage Douala" pour capter le trafic de planification.' },
      { tech: 'Youtube Wedding Vlogs', desc: 'Publier des longs formats (15min+) pour montrer l\'ampleur du travail technique.' }
    ] 
  },
  { 
    cat: 'Capture de Leads', 
    icon: Target, 
    list: [
      { tech: 'Tunnel WhatsApp Business', desc: 'Automatisation des réponses par boutons pour filtrer le budget dès le début.' },
      { tech: 'Lead Magnet Guide Luxe', desc: 'Offrir un PDF de valeur en échange de l\'email et du téléphone.' },
      { tech: 'Retargeting Visiteurs', desc: 'Republier des témoignages clients aux personnes ayant visité le site.' }
    ] 
  },
  { 
    cat: 'Engagement Communauté', 
    icon: Users, 
    list: [
      { tech: 'Sondages Stories Quotidiens', desc: 'Faire participer au choix du prochain décor studio ou preset de couleur.' },
      { tech: 'Live FAQ "Wedding Prep"', desc: 'Session live 1h/semaine avec un Wedding Planner partenaire.' },
      { tech: 'UGC Clients Heureux', desc: 'Inciter les clients à se filmer au deballage de leur coffret album.' }
    ] 
  }
];

const ComMarketingSpace: React.FC<ComMarketingSpaceProps> = ({ member }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'pub_calendar' | 'scripts' | 'growth' | 'targeting' | 'content_lab'>('pub_calendar');
  const [activeScriptCategory, setActiveScriptCategory] = useState<'wa' | 'bios' | 'rep' | 'funnel'>('wa');
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<{ig: string, tiktok: string, fb: string, news: string} | null>(null);
  const [selectedProjectForAi, setSelectedProjectForAi] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // États pour le Calendrier
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'day'>('month');
  
  // État pour les modifications manuelles et la notation
  const [overrides, setOverrides] = useState<Record<string, DayOverride>>(() => {
    const saved = localStorage.getItem('marvel_marketing_overrides_v3');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const pData = await projectsService.getAll();
        setProjects(pData as any);
        if (pData.length > 0) setSelectedProjectForAi(pData[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('marvel_marketing_overrides_v3', JSON.stringify(overrides));
  }, [overrides]);

  // --- DATA ROUTINES PAR DÉFAUT ---
  const studioWeekly = [
    { day: 'Lundi', task: 'Inspiration Luxe', details: 'Avant/Après retouche studio. Vote tenue en Story.' },
    { day: 'Mardi', task: 'Preuve Sociale', details: 'Avis client carrousel. Focus Séance Grossesse.' },
    { day: 'Mercredi', task: 'Conseils Experts', details: '3 tips pour poser. FAQ : "Comment s\'habiller".' },
    { day: 'Jeudi', task: 'Coulisses (BTS)', details: 'Reel montage rapide ambiance studio.' },
    { day: 'Vendredi', task: 'Offre Flash', details: 'Promotion Weekend (-15%). Focus Corporate.' },
    { day: 'Samedi', task: 'Life at Marvel', details: 'Vidéo fun équipe. Sondage nouveau décor.' },
    { day: 'Dimanche', task: 'Récap Semaine', details: 'Top 3 photos. Remerciements clients.' },
  ];

  const weddingWeekly = [
    { day: 'Lundi', task: 'Expertise Film', details: 'Carrousel Processus J-30. Pourquoi nous ?' },
    { day: 'Mardi', task: 'Émotion Pure', details: 'Reel "Le premier regard". Témoignage audio.' },
    { day: 'Mercredi', task: 'Networking', details: 'Engagement massif avec Wedding Planners.' },
    { day: 'Jeudi', task: 'Démonstration', details: 'Focus Drone & Vidéobooth 360.' },
    { day: 'Vendredi', task: 'Focus Diaspora', details: 'Ciblage : "Planifiez votre mariage au pays".' },
    { day: 'Samedi', task: 'Immersion J+2', details: 'Stories teaser mariage weekend dernier.' },
    { day: 'Dimanche', task: 'Moodboard', details: 'Inspiration déco/lieux Douala & Kribi.' },
  ];

  // --- LOGIQUE CALENDRIER ---
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentCalendarDate]);

  const getTaskForDay = (dayNumber: number | null) => {
    if (!dayNumber) return null;
    const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), dayNumber);
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const weddingEvent = projects.find(p => p.weddingDate === date.toISOString().split('T')[0]);
    const override = overrides[dateKey];
    return {
      studio: override ? override.studio : studioWeekly[dayIdx],
      wedding: override ? override.wedding : weddingWeekly[dayIdx],
      realWedding: weddingEvent,
      studioCompleted: override?.studioCompleted || false,
      studioRating: override?.studioRating || null,
      weddingCompleted: override?.weddingCompleted || false,
      weddingRating: override?.weddingRating || null,
      date
    };
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleSectorValidation = (sector: 'studio' | 'wedding', rating: number, day: number) => {
    const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const current = getTaskForDay(day);
    if (!current) return;
    setOverrides(prev => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { studio: current.studio, wedding: current.wedding }),
        [`${sector}Completed`]: true,
        [`${sector}Rating`]: rating
      }
    }));
  };

  const handleAiGeneration = async () => {
    if (!selectedProjectForAi) return;
    const project = projects.find(p => p.id === selectedProjectForAi);
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Génère une stratégie de contenu ultra-luxe pour Maison Marvelous à Douala pour le mariage de ${project?.couple}. Format JSON : {"ig": "...", "tiktok": "...", "fb": "...", "news": "..."}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      setGeneratedCopy(JSON.parse(response.text || "{}"));
    } catch (err) { console.error(err); } finally { setAiLoading(false); }
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center h-full gap-4 bg-[#F4F6F3]">
      <Loader2 className="animate-spin text-[#006344]" size={48} />
      <p className="font-black text-[#006344] uppercase italic tracking-[0.3em] animate-pulse">Initialisation Matrix Marketing...</p>
    </div>
  );

  const selectedDayData = getTaskForDay(selectedDay);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 max-w-[1600px] mx-auto">
      
      {/* HEADER TABS */}
      <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-inner w-full overflow-x-auto no-scrollbar">
         {[
           { id: 'daily', label: 'Routines Jour J', icon: Calendar },
           { id: 'pub_calendar', label: 'Planning Editorial', icon: BookCheck },
           { id: 'scripts', label: 'Bibliothèque Scripts', icon: BookOpen },
           { id: 'growth', label: 'Matrice Growth', icon: Zap },
           { id: 'targeting', label: 'Ciblage & Tunnels', icon: Crosshair },
           { id: 'content_lab', label: 'Content Lab (IA)', icon: PenTool },
         ].map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#006344] text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
             <tab.icon size={16} /> {tab.label}
           </button>
         ))}
      </div>

      {/* VUE : ROUTINES (DAILY) */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 text-slate-50 rotate-12 -z-0"><Instagram size={120}/></div>
              <div className="relative z-10 space-y-6">
                 <div>
                    <h4 className="text-2xl font-black text-[#006344] uppercase italic tracking-tight">Routine Studio Photo</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Saisie cahier des charges // Standard de Luxe</p>
                 </div>
                 <div className="space-y-3">
                    {studioWeekly.map((s, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all ${idx === (new Date().getDay() === 0 ? 6 : new Date().getDay()-1) ? 'bg-[#006344] text-white border-[#006344] shadow-xl scale-[1.02]' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                         <div className="flex items-center gap-6">
                            <span className="text-base font-black italic">{s.day.substring(0,3)}</span>
                            <div>
                               <p className="text-xs font-black uppercase italic tracking-tight">{s.task}</p>
                               <p className={`text-[10px] font-medium mt-1 ${idx === (new Date().getDay() === 0 ? 6 : new Date().getDay()-1) ? 'text-[#B6C61A]' : 'text-slate-400'}`}>{s.details}</p>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 p-10 text-white/5 -rotate-12 -z-0"><Heart size={120}/></div>
              <div className="relative z-10 space-y-6">
                 <div>
                    <h4 className="text-2xl font-black uppercase italic tracking-tight">Routine Mariage Elite</h4>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Objectif : Clients Premium & Diaspora</p>
                 </div>
                 <div className="space-y-3">
                    {weddingWeekly.map((s, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all ${idx === (new Date().getDay() === 0 ? 6 : new Date().getDay()-1) ? 'bg-[#006344] border-[#B6C61A]/30 shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/10 opacity-60'}`}>
                         <div className="flex items-center gap-6">
                            <span className="text-base font-black italic">{s.day.substring(0,3)}</span>
                            <div>
                               <p className="text-xs font-black uppercase italic tracking-tight">{s.task}</p>
                               <p className={`text-[10px] font-medium mt-1 ${idx === (new Date().getDay() === 0 ? 6 : new Date().getDay()-1) ? 'text-[#B6C61A]' : 'text-white/30'}`}>{s.details}</p>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* VUE : CALENDRIER EDITORIAL */}
      {activeTab === 'pub_calendar' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           {/* Barre de Pilotage de la Vue */}
           <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                 <button onClick={() => {
                   const d = new Date(currentCalendarDate);
                   d.setMonth(d.getMonth() - 1);
                   setCurrentCalendarDate(d);
                 }} className="p-3 bg-white hover:bg-slate-100 rounded-xl transition-all text-[#006344] border border-slate-100"><ChevronLeft size={20}/></button>
                 <div className="min-w-[180px] text-center"><h4 className="text-sm font-black uppercase italic tracking-widest text-[#006344]">{currentCalendarDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}</h4></div>
                 <button onClick={() => {
                   const d = new Date(currentCalendarDate);
                   d.setMonth(d.getMonth() + 1);
                   setCurrentCalendarDate(d);
                 }} className="p-3 bg-white hover:bg-slate-100 rounded-xl transition-all text-[#006344] border border-slate-100"><ChevronRight size={20}/></button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
                 <button 
                  onClick={() => setCalendarViewMode('month')} 
                  className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${calendarViewMode === 'month' ? 'bg-[#006344] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <Layout size={14} /> Vue Mensuelle
                 </button>
                 <button 
                  onClick={() => setCalendarViewMode('day')} 
                  className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${calendarViewMode === 'day' ? 'bg-[#006344] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <List size={14} /> Vue Quotidienne
                 </button>
              </div>
           </div>

           {calendarViewMode === 'month' ? (
             <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* CALENDRIER GRID */}
                <div className="xl:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10">
                   <div className="grid grid-cols-7 gap-3">
                      {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(day => <div key={day} className="text-center py-2 text-[9px] font-black text-slate-300 tracking-widest">{day}</div>)}
                      {calendarDays.map((day, idx) => {
                        const tasks = getTaskForDay(day);
                        const isToday = day === new Date().getDate() && currentCalendarDate.getMonth() === new Date().getMonth() && currentCalendarDate.getFullYear() === new Date().getFullYear();
                        const isSelected = day === selectedDay;
                        return (
                          <div key={idx} onClick={() => day && setSelectedDay(day)} className={`min-h-[140px] p-3 rounded-[2rem] border transition-all cursor-pointer group relative flex flex-col gap-2 ${!day ? 'bg-transparent border-transparent' : isSelected ? 'bg-white border-[#B6C61A] shadow-2xl scale-[1.05] z-10' : (tasks?.studioCompleted && tasks?.weddingCompleted) ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50/50 border-slate-100 hover:bg-white'}`}>
                            {day && (
                              <>
                                 <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-black italic ${isToday ? 'bg-[#006344] text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg' : 'text-slate-300'}`}>{day}</span>
                                    <div className="flex items-center gap-1">
                                       {tasks?.studioRating && <span className="bg-pink-100 text-pink-600 px-1 py-0.5 rounded text-[6px] font-black">{tasks.studioRating}</span>}
                                       {tasks?.weddingRating && <span className="bg-[#B6C61A] text-[#006344] px-1 py-0.5 rounded text-[6px] font-black">{tasks.weddingRating}</span>}
                                    </div>
                                 </div>
                                 <div className="space-y-1 overflow-hidden">
                                    <div className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase truncate ${tasks?.studioCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-pink-50 text-pink-600'}`}>{tasks?.studio.task}</div>
                                    <div className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase truncate ${tasks?.weddingCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-[#B6C61A]/10 text-[#006344]'}`}>{tasks?.wedding.task}</div>
                                 </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* SIDEBAR COCKPIT */}
                <div className="xl:col-span-4 bg-slate-900 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[600px]">
                   <div className="absolute top-0 right-0 p-10 opacity-10"><Compass size={120} /></div>
                   <p className="text-[10px] font-black text-[#B6C61A] uppercase tracking-[0.4em] italic mb-2 relative z-10">Cockpit du {selectedDay}</p>
                   <h3 className="text-4xl font-black uppercase italic tracking-tighter relative z-10 mb-10">Missions Actives</h3>

                   <div className="space-y-8 relative z-10 flex-1">
                      <div className="space-y-4">
                         <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-pink-500 flex items-center justify-center shadow-lg"><Instagram size={16}/></div><h5 className="text-xs font-black uppercase italic text-pink-400">Canal Studio</h5></div>
                         <div className="p-6 bg-white/5 border border-white/10 rounded-3xl group hover:border-pink-500/30 transition-all">
                            <p className="text-sm font-black text-[#B6C61A] uppercase mb-1">{selectedDayData?.studio.task}</p>
                            <p className="text-xs text-white/40 italic mb-6">"{selectedDayData?.studio.details}"</p>
                            {selectedDayData?.studioCompleted ? (
                               <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase italic"><BadgeCheck size={14}/> Travail validé ({selectedDayData.studioRating}/20)</div>
                            ) : (
                               <button onClick={() => handleSectorValidation('studio', 18, selectedDay)} className="w-full py-4 bg-pink-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Valider Secteur</button>
                            )}
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-[#B6C61A] flex items-center justify-center text-[#006344] shadow-lg"><Heart size={16}/></div><h5 className="text-xs font-black uppercase italic text-[#B6C61A]">Canal Mariage</h5></div>
                         <div className="p-6 bg-white/5 border border-white/10 rounded-3xl group hover:border-[#B6C61A]/30 transition-all">
                            <p className="text-sm font-black text-white uppercase mb-1">{selectedDayData?.wedding.task}</p>
                            <p className="text-xs text-white/40 italic mb-6">"{selectedDayData?.wedding.details}"</p>
                            {selectedDayData?.weddingCompleted ? (
                               <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase italic"><BadgeCheck size={14}/> Travail validé ({selectedDayData.weddingRating}/20)</div>
                            ) : (
                               <button onClick={() => handleSectorValidation('wedding', 19, selectedDay)} className="w-full py-4 bg-[#B6C61A] text-[#006344] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Valider Secteur</button>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             /* VUE : JOUR DÉTAILLÉE (FOCUS) */
             <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div className="bg-white p-12 lg:p-20 rounded-[5rem] shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col lg:flex-row gap-20">
                   <div className="absolute top-0 right-0 p-24 text-slate-50 -z-0"><Activity size={400}/></div>
                   
                   <div className="flex-1 space-y-12 relative z-10">
                      <div className="space-y-4">
                         <div className="w-24 h-2 bg-[#B6C61A]" />
                         <h2 className="text-6xl lg:text-8xl font-black italic uppercase tracking-tighter text-[#006344] leading-none">
                           {selectedDayData?.date.toLocaleString('fr-FR', { weekday: 'long' }).toUpperCase()} <br/>
                           <span className="text-slate-200">{selectedDay} {currentCalendarDate.toLocaleString('fr-FR', { month: 'long' }).toUpperCase()}</span>
                         </h2>
                         <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 italic">
                            Maison Marvelous <span className="w-2 h-2 rounded-full bg-slate-200" /> Pilotage Quotidien
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-50">
                         <div className="space-y-8">
                            <div className="flex items-center gap-4">
                               <div className="w-14 h-14 bg-pink-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-pink-100"><Instagram size={28}/></div>
                               <div>
                                  <h5 className="text-2xl font-black uppercase italic text-pink-500">Flux Studio</h5>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cible : Engagement Local</p>
                               </div>
                            </div>
                            <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-6">
                               <h6 className="text-xl font-black uppercase text-[#006344]">{selectedDayData?.studio.task}</h6>
                               <p className="text-lg font-medium text-slate-500 italic leading-relaxed">"{selectedDayData?.studio.details}"</p>
                               <div className="pt-6">
                                  {selectedDayData?.studioCompleted ? (
                                    <div className="p-6 bg-emerald-50 rounded-2xl flex items-center justify-between">
                                       <span className="text-sm font-black text-emerald-600 uppercase italic">Validé Matrix</span>
                                       <div className="flex items-center gap-2"><Star size={16} className="text-[#B6C61A] fill-[#B6C61A]"/><span className="text-2xl font-black text-emerald-600 italic">{selectedDayData.studioRating}/20</span></div>
                                    </div>
                                  ) : (
                                    <button onClick={() => handleSectorValidation('studio', 18, selectedDay)} className="w-full py-6 bg-pink-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">TERMINER LA MISSION</button>
                                  )}
                               </div>
                            </div>
                         </div>

                         <div className="space-y-8">
                            <div className="flex items-center gap-4">
                               <div className="w-14 h-14 bg-[#B6C61A] text-[#006344] rounded-3xl flex items-center justify-center shadow-xl shadow-[#B6C61A]/20"><Heart size={28}/></div>
                               <div>
                                  <h5 className="text-2xl font-black uppercase italic text-[#006344]">Flux Mariage</h5>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cible : Diaspora & Prestige</p>
                               </div>
                            </div>
                            <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-6">
                               <h6 className="text-xl font-black uppercase text-slate-900">{selectedDayData?.wedding.task}</h6>
                               <p className="text-lg font-medium text-slate-500 italic leading-relaxed">"{selectedDayData?.wedding.details}"</p>
                               <div className="pt-6">
                                  {selectedDayData?.weddingCompleted ? (
                                    <div className="p-6 bg-emerald-50 rounded-2xl flex items-center justify-between">
                                       <span className="text-sm font-black text-emerald-600 uppercase italic">Validé Matrix</span>
                                       <div className="flex items-center gap-2"><Star size={16} className="text-[#B6C61A] fill-[#B6C61A]"/><span className="text-2xl font-black text-emerald-600 italic">{selectedDayData.weddingRating}/20</span></div>
                                    </div>
                                  ) : (
                                    <button onClick={() => handleSectorValidation('wedding', 19, selectedDay)} className="w-full py-6 bg-[#006344] text-[#B6C61A] rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">TERMINER LA MISSION</button>
                                  )}
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="lg:w-[400px] flex flex-col gap-8 relative z-10">
                      <div className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl text-white space-y-8 flex-1">
                         <h5 className="text-xl font-black uppercase italic tracking-tighter text-[#B6C61A] flex items-center gap-3"><PenTool size={20}/> Tips Content</h5>
                         <div className="space-y-6">
                            <div className="space-y-2"><p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Type de Montage</p><p className="text-sm font-bold italic">Dynamique (Exports & Jump cuts)</p></div>
                            <div className="space-y-2"><p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Audio Requis</p><p className="text-sm font-bold italic">Afro-Luxe Instrumentals</p></div>
                         </div>
                         <button className="w-full py-5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all">Consulter Standards S++</button>
                      </div>

                      <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 flex flex-col items-center justify-center text-center gap-4">
                         <Trophy size={48} className="text-emerald-600" />
                         <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest italic">Performance Jour J</p>
                         <h4 className="text-3xl font-black text-emerald-600 italic">{( (selectedDayData?.studioCompleted?1:0) + (selectedDayData?.weddingCompleted?1:0) ) * 50}%</h4>
                      </div>
                   </div>
                </div>

                <div className="flex justify-between items-center px-10">
                   <button onClick={() => selectedDay > 1 && setSelectedDay(selectedDay - 1)} className="flex items-center gap-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-[#006344] transition-all"><ChevronLeftCircle size={24}/> Jour Précédent</button>
                   <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] italic">Navigation Séquentielle</p>
                   <button onClick={() => selectedDay < calendarDays.filter(d=>d!==null).length && setSelectedDay(selectedDay + 1)} className="flex items-center gap-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-[#006344] transition-all">Jour Suivant <ChevronRightCircle size={24}/></button>
                </div>
             </div>
           )}
        </div>
      )}

      {/* VUE : BIBLIOTHÈQUE SCRIPTS */}
      {activeTab === 'scripts' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
           <div className="xl:col-span-4 space-y-3">
              {[
                { id: 'wa', label: 'WhatsApp Business', icon: Smartphone },
                { id: 'bios', label: 'Bios Instagram / TikTok', icon: Fingerprint },
                { id: 'rep', label: 'Réponses Avis / Critique', icon: Trophy },
                { id: 'funnel', label: 'Tunnels & Offres Flash', icon: Target },
              ].map(cat => (
                <button key={cat.id} onClick={() => setActiveScriptCategory(cat.id as any)} className={`w-full p-6 rounded-[2rem] flex items-center justify-between border transition-all ${activeScriptCategory === cat.id ? 'bg-[#006344] text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                   <div className="flex items-center gap-4">
                      <cat.icon size={20} className={activeScriptCategory === cat.id ? 'text-[#B6C61A]' : 'text-slate-300'} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                   </div>
                   <ChevronRight size={16} />
                </button>
              ))}
           </div>
           <div className="xl:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl min-h-[600px]">
              <h5 className="text-xl font-black text-[#006344] uppercase italic mb-8 border-b border-slate-50 pb-4">Scripts {activeScriptCategory.toUpperCase()}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {scriptsLibrary[activeScriptCategory as keyof typeof scriptsLibrary].map((script, i) => (
                    <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-[#B6C61A] transition-all relative">
                       <h6 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">{script.title}</h6>
                       <p className="text-xs text-slate-500 italic leading-relaxed mb-6">"{script.content}"</p>
                       <button 
                        onClick={() => handleCopy(script.content, `${activeScriptCategory}-${i}`)}
                        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${copyStatus === `${activeScriptCategory}-${i}` ? 'bg-[#B6C61A] text-[#006344]' : 'bg-[#006344] text-white hover:scale-105'}`}
                       >
                          {copyStatus === `${activeScriptCategory}-${i}` ? <CopyCheck size={14}/> : <Copy size={14}/>} {copyStatus === `${activeScriptCategory}-${i}` ? 'Copié !' : 'Copier Script'}
                       </button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* VUE : MATRICE GROWTH */}
      {activeTab === 'growth' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
           {growthMatrix.map((g, i) => (
             <div key={i} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 group hover:shadow-2xl transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-[#006344] group-hover:bg-[#B6C61A] transition-colors shadow-inner"><g.icon size={24}/></div>
                   <h5 className="text-xl font-black uppercase italic text-slate-900">{g.cat}</h5>
                </div>
                <div className="space-y-4">
                   {g.list.map((tech, j) => (
                     <div key={j} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-50 hover:bg-white hover:border-[#B6C61A]/30 transition-all cursor-help">
                        <div className="flex items-center gap-3 mb-2">
                           <Zap size={14} className="text-[#B6C61A]" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-[#006344]">{tech.tech}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic leading-relaxed">{tech.desc}</p>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* VUE : CIBLAGE & TUNNELS */}
      {activeTab === 'targeting' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in slide-in-from-left-4 duration-500">
           <div className="xl:col-span-8 bg-white p-12 rounded-[4.5rem] shadow-sm border border-slate-100 space-y-12">
              <h5 className="text-2xl font-black text-[#006344] uppercase italic mb-8 flex items-center gap-4"><Crosshair size={28} className="text-[#B6C61A]" /> Stratégie Meta Ads & Tunnels</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-8 bg-[#006344] rounded-[3rem] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 text-white/5 rotate-12"><Globe size={80}/></div>
                    <h6 className="text-lg font-black uppercase italic text-[#B6C61A] mb-4">Tunnel Diaspora (J-180)</h6>
                    <ul className="space-y-4 text-xs font-medium text-white/70 italic">
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#B6C61A]"/> Phase 1 : Vidéos Emotion (Awareness)</li>
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#B6C61A]"/> Phase 2 : Guide Planification (Capture)</li>
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#B6C61A]"/> Phase 3 : Appel Découverte (Closing)</li>
                    </ul>
                 </div>
                 <div className="p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 text-white/5 -rotate-12"><Target size={80}/></div>
                    <h6 className="text-lg font-black uppercase italic text-pink-400 mb-4">Tunnel Studio Local (J-15)</h6>
                    <ul className="space-y-4 text-xs font-medium text-white/70 italic">
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-400"/> Reels BTS & Retouche (Démonstration)</li>
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-400"/> Témoignages Séance Grossesse (Preuve)</li>
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-400"/> WhatsApp DM Link (Conversion)</li>
                    </ul>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-50">
                 {[
                   { label: 'Audience Douala', val: '24-38 Ans, Intérêts Luxe', icon: Target, color: '#006344' },
                   { label: 'Audience Diaspora', val: 'Europe, USA (Nostalgie)', icon: Globe, color: '#B6C61A' },
                   { label: 'Budget Quotidien', val: '5.000 à 15.000 FCFA', icon: Wallet, color: '#D8A800' },
                 ].map((cfg, i) => (
                   <div key={i} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                      <cfg.icon size={20} className="mx-auto mb-3" style={{color: cfg.color}} />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{cfg.label}</p>
                      <p className="text-sm font-black text-[#006344] italic uppercase">{cfg.val}</p>
                   </div>
                 ))}
              </div>
           </div>
           <div className="xl:col-span-4 bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white flex flex-col justify-center items-center text-center gap-8">
              <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center text-[#B6C61A] shadow-xl"><Rocket size={40} /></div>
              <h5 className="text-2xl font-black uppercase italic tracking-tight">Besoin d'un audit publicitaire ?</h5>
              <p className="text-xs text-white/40 leading-relaxed font-medium italic">Analysez vos performances de clics et le coût par lead directement avec Narcisse.</p>
              <button className="w-full py-6 bg-[#B6C61A] text-[#006344] rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all">Lancer l'Audit</button>
           </div>
        </div>
      )}

      {/* VUE : CONTENT LAB */}
      {activeTab === 'content_lab' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
           <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                 <h4 className="text-xl font-black text-[#006344] uppercase italic mb-6">Laboratoire IA</h4>
                 <div className="space-y-6">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Sélectionner un dossier</label>
                       <select value={selectedProjectForAi} onChange={(e) => setSelectedProjectForAi(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-[#006344] outline-none">
                          {projects.map(p => <option key={p.id} value={p.id}>{p.couple.toUpperCase()}</option>)}
                       </select>
                    </div>
                    <button onClick={handleAiGeneration} disabled={aiLoading} className="w-full py-6 bg-[#006344] text-[#B6C61A] rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                       {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} Rédiger avec Marvel AI
                    </button>
                 </div>
              </div>
           </div>
           <div className="xl:col-span-8">
              {generatedCopy ? (
                <div className="p-10 bg-white rounded-[3.5rem] border border-slate-100 shadow-xl animate-in zoom-in-95">
                   <div className="flex items-center justify-between mb-8">
                      <h5 className="text-xl font-black text-slate-900 uppercase italic">Résultat du Lab</h5>
                      <button onClick={() => handleCopy(generatedCopy.ig, 'ai-copy')} className="flex items-center gap-2 text-[9px] font-black uppercase text-[#006344] hover:underline">
                         {copyStatus === 'ai-copy' ? <BadgeCheck size={14}/> : <Copy size={14}/>} Copier tout le flux
                      </button>
                   </div>
                   <div className="space-y-8">
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-pink-500 uppercase mb-3">Post Instagram</p><p className="text-sm text-slate-600 italic whitespace-pre-wrap">{generatedCopy.ig}</p></div>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-900 uppercase mb-3">Légende TikTok</p><p className="text-sm text-slate-600 italic whitespace-pre-wrap">{generatedCopy.tiktok}</p></div>
                   </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-20 italic">
                   <BrainCircuit size={80} className="mb-6" />
                   <p className="text-2xl font-black uppercase tracking-tighter">En attente d'instruction...</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ComMarketingSpace;
