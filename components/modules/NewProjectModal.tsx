import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Users, Package, FileText, Clock, Save, Calendar, MapPin, Map, Info, UserCheck, Loader2, MessageSquare, CalendarDays, Layers, BookOpen, Star, Sparkles, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ExtendedProjectData {
  couple: string;
  weddingDate: string;
  hasDowry: boolean;
  dowryDate: string;
  brideOrigin: string;
  groomOrigin: string;
  sameDay: boolean;
  cityHallDate: string;
  guestCount: number;
  deadline: string;
  country: string;
  packageType: string;
  packageDetail: string;
  formula: string;
  deliveryTime: number;
  priority: 'low' | 'medium' | 'high';
  albumTeaser: string;
  assignedTeam: string;
  clientNotes: string;
  options: string[];
  visaPhotoUrl?: string;
}

const ALL_WORKFLOWS = [
  { id: 'f1', name: '📦 workflow : Photo + Film long + Album + Teaser', delivery: 80 },
  { id: 'f2', name: '📦 workflow : Photo + Film long + Album', delivery: 80 },
  { id: 'f3', name: '📦 workflow : Photo + Film long + Teaser', delivery: 80 },
  { id: 'f4', name: '📦 workflow : Photo + Film long', delivery: 80 },
  { id: 'f5', name: '📦 workflow : Film long + Teaser', delivery: 72 },
  { id: 'f6', name: '📦 workflow : Photo + Album', delivery: 70 },
  { id: 'f7', name: '📦 workflow : Photo classiques uniquement', delivery: 70 },
  { id: 'f8', name: '📦 workflow : Film long uniquement', delivery: 72 },
];

const WEDDING_OPTIONS = [
  "photo encadrée", "diffusion Jour-J", "préwedding", "magazine box", 
  "photobooth", "videoboth", "backdrop géant", "phone box", 
  "save the date", "shooting en studio", "drone", "manequin femme", 
  "peignoir", "lunettes", "machine a bulles", "parapluie", 
  "verre a champagne", "Tréteaux d'accueil", "canne"
];

const CLIENT_FORMULAS = ['Mini', 'Simple', 'Classique', 'Complète', 'Rêve'];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: any) => Promise<void>;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<ExtendedProjectData>({
    couple: '',
    weddingDate: '',
    hasDowry: false,
    dowryDate: '',
    brideOrigin: '',
    groomOrigin: '',
    sameDay: true,
    cityHallDate: '',
    guestCount: 0,
    deadline: '',
    country: 'Cameroun',
    packageType: 'Classique',
    packageDetail: 'f3',
    formula: '📦 workflow : Photo + Film long + Teaser',
    deliveryTime: 80,
    priority: 'low',
    albumTeaser: '',
    assignedTeam: '',
    clientNotes: '',
    options: [],
    visaPhotoUrl: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploadingVisa, setIsUploadingVisa] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const selectedWorkflow = ALL_WORKFLOWS.find(w => w.id === formData.packageDetail);
    if (selectedWorkflow) {
      setFormData(prev => ({ 
        ...prev, 
        deliveryTime: selectedWorkflow.delivery, 
        formula: selectedWorkflow.name 
      }));
    }
  }, [formData.packageDetail]);

  // Nettoyer la caméra lors du démontage (toujours déclaré pour respecter l’ordre des Hooks)
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleOption = (option: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.includes(option) 
        ? prev.options.filter(o => o !== option) 
        : [...prev.options, option]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.couple || !formData.weddingDate) {
      alert("Le nom du couple et la date du mariage sont requis.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      alert("Erreur lors de la création du dossier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerPicker = (e: React.MouseEvent<HTMLDivElement>) => {
    const input = e.currentTarget.querySelector('input');
    if (input) {
      try {
        input.showPicker();
      } catch (err) {
        input.focus();
      }
    }
  };

  const hasAlbumInWorkflow = formData.formula.toLowerCase().includes('album');

  // Fonction pour démarrer la caméra
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert("Accès caméra requis pour la capture du visa.");
      setShowCamera(false);
    }
  };

  // Fonction pour capturer la photo du visa
  const captureVisa = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      
      setIsUploadingVisa(true);
      try {
        const fileName = `visa_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `visas/${fileName}`;

        // Upload vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Obtenir l'URL publique
        const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
        
        setFormData(prev => ({ ...prev, visaPhotoUrl: data.publicUrl }));
        
        // Arrêter la caméra
        const stream = videoRef.current?.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
        setShowCamera(false);
      } catch (error: any) {
        alert('Erreur lors de l\'enregistrement du visa: ' + error.message);
      } finally {
        setIsUploadingVisa(false);
      }
    }, 'image/jpeg', 0.9);
  };

  if (!isOpen) return null;

  const modalEl = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#006344]/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-[#FAFAFA] w-full max-w-6xl max-h-[95vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="bg-white px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black text-[#1F2937] uppercase italic">Indexation Nouveau Dossier</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1.5 italic">Saisie cahier des charges // Standard de Luxe</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300"><X size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <style>{`
            input[type="date"]::-webkit-calendar-picker-indicator {
              display: none;
              -webkit-appearance: none;
            }
          `}</style>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 italic"><Users size={18} /> Identité & Dates</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nom du Couple</label>
                    <input type="text" placeholder="Ex: MARIE & JEAN" value={formData.couple} onChange={e => setFormData({...formData, couple: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-[#006344]/10 font-black uppercase italic outline-none transition-all" />
                  </div>
                  {/* Capture de Visa */}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest mb-2 block">Capture Visa</label>
                    {formData.visaPhotoUrl ? (
                      <div className="relative">
                        <img src={formData.visaPhotoUrl} alt="Visa" className="w-full h-48 object-cover rounded-2xl border-2 border-[#B6C61A]" />
                        <button 
                          onClick={() => setFormData({...formData, visaPhotoUrl: ''})}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startCamera}
                        className="w-full py-6 rounded-2xl bg-[#006344] text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#005233] transition-colors"
                      >
                        <Camera size={20} /> Capturer le Visa
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Date Religieux</label>
                      <div className="relative group cursor-pointer" onClick={triggerPicker}>
                        <input type="date" value={formData.weddingDate} onChange={e => setFormData({...formData, weddingDate: e.target.value})} className="w-full pl-6 pr-12 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all cursor-pointer" />
                        <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B6C61A] group-hover:scale-110 transition-transform pointer-events-none" size={20} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nombre Invités</label>
                      <input type="number" value={formData.guestCount} onChange={e => setFormData({...formData, guestCount: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] outline-none focus:ring-2 focus:ring-[#006344]/10" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <input type="checkbox" id="sameDayCheck" checked={formData.sameDay} onChange={e => setFormData({...formData, sameDay: e.target.checked})} className="w-5 h-5 rounded-lg accent-[#006344] cursor-pointer" />
                    <label htmlFor="sameDayCheck" className="text-xs font-black text-slate-600 uppercase tracking-tight italic cursor-pointer">Mairie le même jour ?</label>
                  </div>
                  {!formData.sameDay && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Date Mairie</label>
                      <div className="relative group cursor-pointer" onClick={triggerPicker}>
                        <input type="date" value={formData.cityHallDate} onChange={e => setFormData({...formData, cityHallDate: e.target.value})} className="w-full pl-6 pr-12 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all cursor-pointer" />
                        <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B6C61A] group-hover:scale-110 transition-transform pointer-events-none" size={20} />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 italic"><Map size={18} /> Origines & Dote</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Origine Mariée</label><input type="text" value={formData.brideOrigin} onChange={e => setFormData({...formData, brideOrigin: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase outline-none focus:ring-2 focus:ring-[#006344]/10" /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Origine Marié</label><input type="text" value={formData.groomOrigin} onChange={e => setFormData({...formData, groomOrigin: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase outline-none focus:ring-2 focus:ring-[#006344]/10" /></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-5 bg-[#B6C61A]/10 rounded-2xl border border-[#B6C61A]/20">
                    <input type="checkbox" id="hasDowry" checked={formData.hasDowry} onChange={e => setFormData({...formData, hasDowry: e.target.checked})} className="w-5 h-5 rounded-lg accent-[#006344] cursor-pointer" />
                    <label htmlFor="hasDowry" className="text-xs font-black text-[#006344] uppercase tracking-tight italic cursor-pointer">Prestation Dote incluse ?</label>
                  </div>
                  {formData.hasDowry && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Date de la Dote</label>
                      <div className="relative group cursor-pointer" onClick={triggerPicker}>
                        <input type="date" value={formData.dowryDate} onChange={e => setFormData({...formData, dowryDate: e.target.value})} className="w-full pl-6 pr-12 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] uppercase outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all cursor-pointer" />
                        <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B6C61A] group-hover:scale-110 transition-transform pointer-events-none" size={20} />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 italic"><Package size={18} /> Formule Industrielle</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Pays</label><select value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] outline-none appearance-none cursor-pointer"><option>Cameroun</option><option>France</option><option>Autre</option></select></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Priorité</label><select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-black text-[#006344] outline-none appearance-none cursor-pointer"><option value="low">Normale</option><option value="medium">Élevée</option><option value="high">Urgente</option></select></div>
                  </div>
                  
                  <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <label className="text-[9px] font-black text-[#006344] uppercase ml-2 tracking-[0.2em] flex items-center gap-2 mb-3 italic">
                      <Layers size={14} className="text-[#B6C61A]" /> GAMME CLIENT (OFFRE)
                    </label>
                    <select 
                      value={formData.packageType} 
                      onChange={e => setFormData({...formData, packageType: e.target.value})} 
                      className="w-full px-5 py-4 rounded-xl bg-white border-none font-black uppercase outline-none italic text-xs appearance-none text-[#006344] shadow-sm cursor-pointer"
                    >
                      {CLIENT_FORMULAS.map((f) => (
                        <option key={f} value={f}>{f.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">📦 SÉLECTION DU WORKFLOW</label>
                    <select 
                      value={formData.packageDetail} 
                      onChange={e => setFormData({...formData, packageDetail: e.target.value})} 
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-black uppercase outline-none italic text-[11px] appearance-none text-[#006344] cursor-pointer"
                    >
                      {ALL_WORKFLOWS.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  {hasAlbumInWorkflow && (
                    <div className="p-5 bg-slate-900 rounded-[2rem] border border-white/10 animate-in slide-in-from-top-4 duration-500">
                      <label className="text-[9px] font-black text-[#B6C61A] uppercase ml-2 tracking-[0.2em] flex items-center gap-2 mb-3 italic">
                        <BookOpen size={14} /> SÉLECTION DU FABRICANT (ALBUM)
                      </label>
                      <select 
                        value={formData.albumTeaser} 
                        onChange={e => setFormData({...formData, albumTeaser: e.target.value})} 
                        className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/10 text-white font-black uppercase outline-none italic text-xs appearance-none cursor-pointer hover:bg-white/20 transition-all"
                      >
                        <option value="" className="text-slate-900">CHOISIR UN FABRICANT...</option>
                        <option value="Vistaprint" className="text-slate-900">VISTAPRINT</option>
                        <option value="ZNO" className="text-slate-900">ZNO (LUXE)</option>
                      </select>
                    </div>
                  )}

                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-4">
                      <Clock className="text-[#006344]" size={24} />
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Délai contractuel</p>
                        <p className="text-sm font-black text-slate-600 uppercase italic">Standard Marvel</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-[#006344] italic">{formData.deliveryTime} Jours</span>
                  </div>
                </div>
              </section>

              {/* NOUVELLE SECTION : OPTIONS & ACCESSOIRES */}
              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 italic"><Sparkles size={18} className="text-[#B6C61A]" /> Options & Accessoires</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto no-scrollbar p-2 bg-slate-50/50 rounded-2xl border border-slate-50">
                  {WEDDING_OPTIONS.map(opt => (
                    <button 
                      key={opt}
                      onClick={() => toggleOption(opt)}
                      className={`px-3 py-2.5 rounded-xl text-[8px] font-black uppercase italic transition-all border text-left flex items-center gap-2 group ${
                        formData.options.includes(opt) 
                          ? 'bg-[#006344] text-[#B6C61A] border-[#006344] shadow-lg scale-[1.02]' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-[#B6C61A]/50'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${formData.options.includes(opt) ? 'bg-[#B6C61A]' : 'bg-slate-200'}`} />
                      {opt}
                    </button>
                  ))}
                </div>
                {formData.options.length > 0 && (
                  <p className="text-[8px] font-black text-[#006344] uppercase tracking-widest italic animate-pulse">
                    {formData.options.length} options activées pour ce dossier
                  </p>
                )}
              </section>

              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black text-[#006344] uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 italic"><MessageSquare size={18} /> Notes & Infos Supp.</h3>
                <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Informations Supplémentaires</label>
                   <textarea 
                     placeholder="Précisez ici les particularités du contrat, demandes spéciales, rushs spécifiques..." 
                     value={formData.clientNotes} 
                     onChange={e => setFormData({...formData, clientNotes: e.target.value})} 
                     className="w-full h-32 px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-[#006344]/10 font-medium text-sm outline-none transition-all resize-none"
                   />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Modal de capture de visa */}
        {showCamera && (
          <div className="fixed inset-0 z-[10000] bg-[#006344]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white">
            <div className="text-center space-y-4 mb-6">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 justify-center">
                <Camera size={28} className="text-[#B6C61A]" /> Capture du Visa
              </h4>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">Positionnez le visa dans le cadre</p>
            </div>
            <div className="relative w-full max-w-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full rounded-3xl border-4 border-[#B6C61A] shadow-2xl"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-4 mt-8 w-full max-w-2xl">
              <button 
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  if (stream) stream.getTracks().forEach(track => track.stop());
                  setShowCamera(false);
                }} 
                className="flex-1 py-5 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/20"
              >
                Annuler
              </button>
              <button 
                onClick={captureVisa}
                disabled={isUploadingVisa}
                className="flex-1 py-5 bg-[#B6C61A] text-[#006344] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-all disabled:opacity-50"
              >
                {isUploadingVisa ? <Loader2 className="animate-spin" size={16} /> : <><Camera size={16} /> Capturer</>}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white px-10 py-8 border-t border-slate-100 flex gap-6 shrink-0">
          <button onClick={onClose} className="flex-1 py-5 rounded-2xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors">Abandonner</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex-[2] py-5 rounded-2xl bg-[#006344] text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-[#006344]/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Valider et Ouvrir Dossier</>}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' && document.body
    ? createPortal(modalEl, document.body)
    : modalEl;
};

export default NewProjectModal;
