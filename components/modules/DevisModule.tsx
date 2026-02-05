
import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronLeft, Plus, Trash2, 
  MapPin, Info, Check, ShieldCheck, 
  Wallet, Truck, Home, Briefcase, 
  ChevronDown, Star, Sparkles, PlusCircle,
  FileText, Zap, DollarSign, X, Layers,
  Camera, Video, User, Minus, CheckCircle2,
  Copy, Send, MessageCircle, Loader2, Wand2,
  Trophy, Award, Crown, Handshake,
  Download
} from 'lucide-react';
import { FORMULAS, ACCESSORIES } from '../../constants.tsx';
import { QuoteState, QuoteDay, Formula } from '../../types.ts';
import { GoogleGenAI } from "@google/genai";
import { quotesService } from '../../lib/supabase.ts';

const INITIAL_STATE: QuoteState = {
  clientName: '',
  city: 'Douala',
  currentFormulaId: null,
  days: [],
  logistics: {
    isOffsite: false,
    transport: {
      segments: {
        maisonAgence: 0,
        agenceVilleClient: 0,
        villeLieux: 0,
        lieuxVille: 0,
        villeAgence: 0,
        agenceMaison: 0,
      },
      baggageAller: 0,
      baggageRetour: 0
    },
    accommodation: {
      pricePerNight: 0,
      nightsCount: 0
    }
  },
  selectedExtraIds: [],
  includedExtraIds: [],
  discount: 0
};

const DevisModule: React.FC = () => {
  const [step, setStep] = useState(1);
  const [quote, setQuote] = useState<QuoteState>(INITIAL_STATE);
  const [explorerFormula, setExplorerFormula] = useState<Formula | null>(null);
  const [aiPitch, setAiPitch] = useState<string | null>(null);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- CALCULS METIER ---
  const totals = useMemo(() => {
    const daysTotal = quote.days.reduce((acc, d) => acc + d.basePrice, 0);
    
    let logisticsTotal = 0;
    if (quote.logistics.isOffsite) {
      const transportTotal = 
        (Object.values(quote.logistics.transport.segments) as number[]).reduce((a: number, b: number) => a + b, 0) +
        quote.logistics.transport.baggageAller +
        quote.logistics.transport.baggageRetour;
      
      const hotelTotal = quote.logistics.accommodation.pricePerNight * quote.logistics.accommodation.nightsCount;
      logisticsTotal = transportTotal + hotelTotal;
    }

    const extrasTotal = ACCESSORIES.reduce((acc, item) => {
      if (quote.selectedExtraIds.includes(item.id) && !quote.includedExtraIds.includes(item.id)) {
        return acc + item.price;
      }
      return acc;
    }, 0);

    const brut = daysTotal + logisticsTotal + extrasTotal;
    const net = brut - quote.discount;

    return { daysTotal, logisticsTotal, extrasTotal, brut, net };
  }, [quote]);

  // --- ACTIONS ---
  const selectFormula = (f: Formula) => {
    setQuote({
      ...quote,
      currentFormulaId: f.id,
      days: f.defaultDays.map(d => ({ ...d })),
      selectedExtraIds: [...f.includedAccessoryIds],
      includedExtraIds: [...f.includedAccessoryIds]
    });
    setStep(2);
  };

  const toggleExtra = (id: string) => {
    setQuote(prev => {
      const isSelected = prev.selectedExtraIds.includes(id);
      return {
        ...prev,
        selectedExtraIds: isSelected 
          ? prev.selectedExtraIds.filter(x => x !== id)
          : [...prev.selectedExtraIds, id]
      };
    });
  };

  const addDay = () => {
    const newDay: QuoteDay = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Nouvelle Journée',
      photographers: 1, videographers: 1, cameras: 2,
      hasDrone: false, hasInterviews: false, hasZoom: false, hasStabilizer: false,
      photoQuota: '400 photos', filmDuration: '1h 30min', basePrice: 0
    };
    setQuote({ ...quote, days: [...quote.days, newDay] });
  };

  const updateDay = (id: string, updates: Partial<QuoteDay>) => {
    setQuote({
      ...quote,
      days: quote.days.map(d => d.id === id ? { ...d, ...updates } : d)
    });
  };

  const updateTransport = (segment: keyof typeof quote.logistics.transport.segments, value: number) => {
    setQuote({
      ...quote,
      logistics: {
        ...quote.logistics,
        transport: {
          ...quote.logistics.transport,
          segments: { ...quote.logistics.transport.segments, [segment]: value }
        }
      }
    });
  };

  const handleGenerateAIPitch = async () => {
    if (!quote.clientName) {
      alert("Veuillez saisir le nom du client à l'étape 2 d'abord.");
      setStep(2);
      return;
    }
    
    setIsGeneratingPitch(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentFormula = FORMULAS.find(f => f.id === quote.currentFormulaId);
      const selectedExtrasLabels = ACCESSORIES
        .filter(a => quote.selectedExtraIds.includes(a.id))
        .map(a => a.label)
        .join(", ");

      const prompt = `Tu es l'Expert de Vente de Luxe de Maison Marvelous. 
      Rédige un argumentaire commercial percutant et élégant pour le projet de devis suivant :
      - Client : ${quote.clientName}
      - Lieu : ${quote.city}
      - Formule choisie : ${currentFormula?.name}
      - Services & Options : ${selectedExtrasLabels}
      - Prix Net : ${totals.net.toLocaleString()} XAF

      L'argumentaire doit mettre en avant l'expérience, le prestige, la qualité "Standard Marvel S++" et la capture d'émotions invisibles.
      Le ton doit être sophistiqué, rassurant et prêt à être envoyé sur WhatsApp.
      Utilise quelques emojis de luxe (💍, ✨, 🎥, 💎).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setAiPitch(response.text || "Erreur de génération.");
    } catch (err) {
      console.error(err);
      setAiPitch("Désolé, l'IA Marvel est temporairement occupée.");
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSaveQuote = async () => {
    if (!quote.clientName) return alert("Nom du client requis.");
    setIsSaving(true);
    try {
      await quotesService.create({
        clientName: quote.clientName,
        city: quote.city,
        totalAmount: totals.net,
        items: quote // Sauvegarde tout l'objet d'état dans une colonne JSONB 'items'
      });
      alert("Devis enregistré avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FDFDFD] p-4 lg:p-12 text-[#1A1A1A] relative">
      {/* ... (Existing JSX remains mostly the same, only updating the Save button) ... */}
      
      {/* HEADER ... */}
      <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-6xl font-black uppercase italic tracking-tighter text-indigo-900 leading-none">Marvelous Quotes</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-3 italic border-l-2 border-amber-400 pl-4">Architecture de Valeur S++</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {step === 1 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="grid grid-cols-1 gap-12">
                <Accordion title="Mariages & Cérémonies d'Élite" defaultOpen icon={<Crown size={24} />}>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
                      {FORMULAS.filter(f => f.category === 'Mariage').map(f => (
                        <FormulaCardPremium key={f.id} formula={f} onExplore={() => setExplorerFormula(f)} onSelect={() => selectFormula(f)} />
                      ))}
                   </div>
                </Accordion>
                <Accordion title="Prestations Corporate & Studio" icon={<Briefcase size={24} />}>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
                      {FORMULAS.filter(f => f.category === 'Autre').map(f => (
                        <FormulaCardPremium key={f.id} formula={f} onExplore={() => setExplorerFormula(f)} onSelect={() => selectFormula(f)} />
                      ))}
                   </div>
                </Accordion>
             </div>
          </div>
        )}

        {/* STEP 2 to 4 omitted for brevity as they are purely UI logic not needing backend connection changes */}
        
        {step === 2 && (
          // ... (Existing step 2 JSX) ...
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
             <div className="bg-white/80 backdrop-blur-2xl p-12 lg:p-20 rounded-[4rem] border border-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-20 text-indigo-50/50 -rotate-12"><User size={300} /></div>
                
                <div className="relative z-10 space-y-16">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 ml-6 flex items-center gap-2 italic">
                            <Info size={14} /> Nom du Mariage / Client
                         </label>
                         <input 
                           type="text" 
                           value={quote.clientName} 
                           onChange={e => setQuote({...quote, clientName: e.target.value})}
                           placeholder="EX: CLAIRE & RODRIGUE" 
                           className="w-full px-10 py-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 font-black text-3xl uppercase italic outline-none focus:ring-8 focus:ring-indigo-50/50 transition-all text-indigo-900 shadow-inner" 
                         />
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 ml-6 flex items-center gap-2 italic">
                            <MapPin size={14} /> Ville de Célébration
                         </label>
                         <input 
                           type="text" 
                           value={quote.city} 
                           onChange={e => setQuote({...quote, city: e.target.value})}
                           className="w-full px-10 py-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 font-black text-3xl uppercase italic outline-none focus:ring-8 focus:ring-indigo-50/50 transition-all text-indigo-900 shadow-inner" 
                         />
                      </div>
                   </div>
                   {/* ... rest of step 2 ... */}
                   <div className="flex justify-between gap-6 max-w-2xl mx-auto">
                      <button onClick={() => setStep(1)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-slate-200"><ChevronLeft size={20}/> Retour</button>
                      <button onClick={() => setStep(3)} className="flex-[2] py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] hover:bg-indigo-700 shadow-2xl transition-all">Configuration S++ <ChevronRight size={20}/></button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {step === 3 && (
          // ... (Existing step 3 JSX) ...
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-32">
             {/* ... */}
             <div className="flex justify-between gap-6 max-w-4xl mx-auto pt-10">
                <button onClick={() => setStep(2)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"><ChevronLeft size={20}/> Précédent</button>
                <button onClick={() => setStep(4)} className="flex-[3] py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] shadow-2xl transition-all">Consulter Catalogue Extras <ChevronRight size={20}/></button>
             </div>
          </div>
        )}

        {step === 4 && (
          // ... (Existing step 4 JSX) ...
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
             {/* ... */}
             <div className="flex justify-between gap-6 max-w-4xl mx-auto pt-10">
                <button onClick={() => setStep(3)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"><ChevronLeft size={20}/> Précédent</button>
                <button onClick={() => setStep(5)} className="flex-[3] py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] shadow-2xl transition-all">Générer Bilan Officiel <ChevronRight size={20}/></button>
             </div>
          </div>
        )}

        {/* STEP 5: RÉSUMÉ FINANCIER - UPDATED SAVE BUTTON */}
        {step === 5 && (
          <div className="space-y-12 animate-in slide-in-from-right-10 duration-700 pb-32">
             <div className="bg-white p-1 lg:p-4 rounded-[4.5rem] shadow-[0_60px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 max-w-5xl mx-auto relative group">
                <div className="bg-[#1A1A1A] p-12 lg:p-20 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-16 min-h-[800px]">
                   {/* ... (Existing breakdown view) ... */}
                   <div className="flex-1 space-y-16 relative z-10">
                      <div className="space-y-6">
                         <h3 className="text-7xl font-black italic tracking-tighter uppercase leading-[0.85] text-white">Bilan <br/><span className="text-amber-500">Architecture</span> <br/>de Valeur</h3>
                         <div className="flex items-center gap-6 pt-4">
                            <div className="px-6 py-2 bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest italic">{quote.clientName}</div>
                         </div>
                      </div>
                      <div className="space-y-10">
                         <BillRowPremium label="Capture & Honoraires Techniques" value={totals.daysTotal} icon={<Camera size={14}/>} />
                         <BillRowPremium label="Logistique de Déplacement" value={totals.logisticsTotal} icon={<Truck size={14}/>} />
                         <BillRowPremium label="Catalogue d'Accessoires Premium" value={totals.extrasTotal} icon={<Award size={14}/>} />
                         <div className="pt-10 border-t border-white/5">
                            <div className="flex items-center justify-between group">
                               <div className="flex items-center gap-3">
                                  <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Handshake size={14}/></div>
                                  <span className="text-[11px] font-black uppercase tracking-widest text-white/40 italic group-hover:text-white transition-colors">Remise Commerciale Exceptionnelle</span>
                               </div>
                               <div className="flex items-center gap-3">
                                  <Minus size={16} className="text-red-500" />
                                  <input 
                                    type="number" 
                                    value={quote.discount} 
                                    onChange={e => setQuote({...quote, discount: Number(e.target.value)})}
                                    className="bg-transparent border-none text-right font-black italic text-3xl tabular-nums outline-none text-red-500 w-48 focus:ring-0" 
                                  />
                                  <span className="text-sm text-red-500 font-black italic">F</span>
                                </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="lg:w-[450px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 flex flex-col justify-between relative z-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]">
                      <div className="space-y-10">
                         <div className="space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-amber-500 italic">Net à Percevoir</p>
                            <h4 className="text-[5.5rem] font-black italic tracking-tighter tabular-nums text-white leading-none">
                               {totals.net.toLocaleString()}
                               <span className="text-xl text-amber-500 block mt-4 opacity-70 tracking-widest uppercase">FCFA / XAF</span>
                            </h4>
                         </div>
                         {/* AI Pitch Block (kept as is) */}
                         {!aiPitch && (
                           <button 
                             onClick={handleGenerateAIPitch}
                             disabled={isGeneratingPitch}
                             className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all"
                           >
                             {isGeneratingPitch ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Générer Argumentaire IA</>}
                           </button>
                         )}
                         {aiPitch && <p className="text-xs italic text-white/50">{aiPitch}</p>}
                      </div>

                      <div className="space-y-6 pt-12">
                         <button 
                           onClick={handleSaveQuote}
                           disabled={isSaving}
                           className="w-full py-8 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-[0_20px_40px_rgba(79,70,229,0.3)] flex items-center justify-center gap-4 hover:bg-indigo-500 hover:scale-[1.02] transition-all"
                         >
                           {isSaving ? <Loader2 className="animate-spin" /> : <><Zap size={24} className="text-amber-500" /> Enregistrer & Publier</>}
                         </button>
                         <button className="w-full py-5 bg-white/5 text-white/50 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                           <Download size={16} /> Télécharger Pro-forma PDF
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Explorer Modal (kept as is) */}
      {explorerFormula && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           {/* ... existing modal content ... */}
           <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setExplorerFormula(null)}></div>
           <div className="relative bg-white w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
              {/* ... same modal content as before ... */}
              <div className="p-12 space-y-12 bg-slate-50/30">
                 <button onClick={() => setExplorerFormula(null)} className="w-full py-4 text-slate-400">Fermer</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Sub-components re-definitions to make file complete
const Accordion = ({ title, children, icon, defaultOpen = false }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="space-y-6">
       <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between p-10 bg-white border border-slate-100 rounded-[3.5rem] shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${isOpen ? 'ring-4 ring-indigo-50 border-indigo-100' : ''}`}>
          <div className="flex items-center gap-8"><div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isOpen ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-50 text-slate-300'}`}>{icon}</div><h3 className="text-3xl font-black uppercase italic tracking-tighter text-indigo-900 leading-none">{title}</h3></div>
          <div className={`w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-indigo-600 text-white rotate-180' : 'text-slate-300'}`}><ChevronDown size={24} /></div>
       </button>
       {isOpen && <div className="animate-in slide-in-from-top-10 duration-700">{children}</div>}
    </div>
  );
};

const FormulaCardPremium = ({ formula, onExplore, onSelect }: any) => (
  <div className="bg-white p-10 rounded-[4rem] border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-indigo-600/30 transition-all group flex flex-col justify-between h-[550px] relative overflow-hidden">
    <div><div className="flex justify-between items-start mb-10"><div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-sm ${formula.status === 'Luxe' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{formula.status}</div></div><h4 className="text-4xl font-black uppercase italic tracking-tight text-indigo-900 leading-[0.9] mb-6">{formula.name}</h4><p className="text-sm font-medium text-slate-400 italic pr-6 border-l-4 border-slate-100 pl-6">"{formula.description}"</p></div>
    <div className="space-y-10 relative z-10"><div className="flex items-baseline gap-3"><span className="text-5xl font-black italic tracking-tighter tabular-nums text-indigo-900">{formula.basePrice.toLocaleString()}</span><span className="text-xl font-black italic opacity-20">XAF</span></div><div className="grid grid-cols-1 gap-4"><button onClick={onSelect} className="w-full py-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all">SÉLECTIONNER</button></div></div>
  </div>
);

const BillRowPremium = ({ label, value, icon }: { label: string, value: number, icon: any }) => (
  <div className="flex justify-between items-center py-6 border-b border-white/5 group hover:border-amber-500/30 transition-all">
    <div className="flex items-center gap-4"><div className="p-2 bg-white/5 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">{icon}</div><span className="text-[11px] font-black uppercase italic text-white/50 tracking-widest group-hover:text-white transition-colors">{label}</span></div>
    <div className="text-right"><span className="text-3xl font-black italic tabular-nums tracking-tighter text-white/90">{value.toLocaleString()} <span className="text-xs text-white/20">F</span></span></div>
  </div>
);

export default DevisModule;
