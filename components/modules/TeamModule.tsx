
import React, { useState, useEffect, useRef } from 'react';
import { teamService, supabase } from '../../lib/supabase.ts';
import { TeamMember } from '../../types.ts';
import { 
  Users, Plus, Search, Briefcase, 
  Camera, Video, X, Save, Trash2, Edit2, BadgeCheck, 
  Zap, Wrench, ChevronDown, Lock, Loader2, Phone, Mail, CheckCircle2,
  Upload, Image as ImageIcon, ScanFace
} from 'lucide-react';

// Composant de carte statistique pour le haut du module
const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="p-3 rounded-xl bg-slate-50" style={{ color }}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-2xl font-black italic text-slate-900">{value}</p>
    </div>
  </div>
);

// Modal de création/édition de membre
const MemberModal = ({ member, onClose, onSave }: { 
  member: TeamMember | null, 
  onClose: () => void, 
  onSave: (data: Partial<TeamMember>) => Promise<void> 
}) => {
  const [formData, setFormData] = useState<Partial<TeamMember>>(
    member || {
      full_name: '',
      role: '',
      specialty: '',
      skills: '',
      pole: 'PHOTO',
      email: '',
      phone: '',
      pin: '',
      photo_url: '',
      status: 'Actif'
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.pin) {
      alert("ERREUR : Nom et Code PIN obligatoires.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      // Erreur gérée par le parent pour garder le bouton actif ou non
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setIsUploading(true);
    try {
      // 1. Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, photo_url: data.publicUrl }));
    } catch (error: any) {
      alert('Erreur upload photo: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#006344]/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="text-2xl font-black text-[#006344] uppercase italic tracking-tighter">
            {member ? 'ÉDITER COLLABORATEUR' : 'NOUVEAU COLLABORATEUR'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300">
            <X size={28} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto no-scrollbar max-h-[70vh] bg-slate-50/30">
          
          {/* SECTION PHOTO DE PROFIL */}
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
             <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative">
                   {formData.photo_url ? (
                     <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <ScanFace size={48} className="text-slate-300" />
                   )}
                   
                   {isUploading && (
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" />
                     </div>
                   )}
                   
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={24} />
                   </div>
                </div>
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#B6C61A] rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                   <Plus size={16} className="text-[#006344]" />
                </div>
             </div>
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept="image/*"
               onChange={handlePhotoUpload}
             />
             <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#006344]">Photo de Référence</p>
                <p className="text-[9px] text-slate-400 italic">Requise pour l'identification biométrique</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Nom Complet</label>
              <input 
                required
                type="text" 
                value={formData.full_name || ''} 
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black uppercase italic outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Pôle principal</label>
              <select 
                value={formData.pole} 
                onChange={e => setFormData({ ...formData, pole: e.target.value as any })}
                className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black uppercase outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344]"
              >
                <option value="PHOTO">PHOTO</option>
                <option value="FILM">FILM</option>
                <option value="DVD">DVD</option>
                <option value="COM">COM</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Rôle / Titre</label>
              <input 
                type="text" 
                placeholder="Ex: Monteur Teaser"
                value={formData.role || ''} 
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black uppercase italic outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Code PIN (Accès)</label>
              <input 
                required
                maxLength={4}
                type="text" 
                placeholder="4 chiffres"
                value={formData.pin || ''} 
                onChange={e => setFormData({ ...formData, pin: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black text-[#006344] outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Email</label>
              <input 
                type="email" 
                value={formData.email || ''} 
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Téléphone</label>
              <input 
                type="tel" 
                value={formData.phone || ''} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Spécialité Principale</label>
            <input 
              type="text" 
              placeholder="Ex: Étalonnage, Colorimétrie, Drone..."
              value={formData.specialty || ''} 
              onChange={e => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black uppercase italic outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Autres Compétences (Skills)</label>
            <textarea 
              placeholder="Ex: After Effects, Pilotage Drone, Sound Design..."
              value={formData.skills || ''} 
              onChange={e => setFormData({ ...formData, skills: e.target.value })}
              className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black uppercase italic outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344] min-h-[100px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Statut opérationnel</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-black uppercase outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all text-[#006344]"
            >
              <option value="Actif">Actif</option>
              <option value="Indisponible">Indisponible</option>
              <option value="Externe">Externe</option>
            </select>
          </div>
        </form>

        <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-50 border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">Abandonner</button>
          <button type="submit" onClick={handleSubmit} disabled={isSubmitting || isUploading} className="flex-[2] py-5 bg-[#006344] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-95 transition-all">
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={20} className="text-[#B6C61A]" /> Synchroniser Matrix</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const TeamModule: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getAll();
      setMembers(data);
    } catch (err: any) {
      console.error("Team fetch error:", err);
      setError(err?.message || "Erreur de liaison avec Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleSave = async (data: Partial<TeamMember>) => {
    try {
      if (selectedMember) {
        await teamService.update(selectedMember.id, data);
      } else {
        await teamService.create(data);
      }
      await fetchTeam();
      setIsModalOpen(false);
      setSelectedMember(null);
    } catch (err: any) {
      console.error("Save error detail:", err);
      const errorMsg = typeof err?.message === 'string' ? err.message : (err?.details || JSON.stringify(err));
      
      if (errorMsg.includes("column \"specialty\" does not exist")) {
        alert("ERREUR CRITIQUE : La colonne 'specialty' est manquante dans la table team_members. Ajoutez-la dans Supabase.");
      } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("fetch")) {
        alert(
          "ERREUR DE CONNEXION SUPABASE\n\n" +
          "Impossible de joindre le serveur. Vérifiez :\n" +
          "• Votre connexion Internet\n" +
          "• Que le projet Supabase n'est pas en pause (Dashboard Supabase)\n" +
          "• L'URL et la clé dans .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)\n\n" +
          "Détail : " + errorMsg
        );
      } else {
        alert("ERREUR SUPABASE : " + errorMsg);
      }
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer ce membre ?\n\nSi le membre a des tâches assignées, il sera archivé (marqué 'Indisponible') pour conserver l'historique.")) return;

    try {
      // Tentative de suppression physique
      await teamService.delete(id);
      await fetchTeam();
      alert("Membre supprimé définitivement.");
    } catch (err: any) {
      console.error("Delete failed, trying soft delete", err);
      // Si erreur (ex: contrainte de clé étrangère), on propose l'archivage
      try {
        await teamService.update(id, { status: 'Indisponible' });
        await fetchTeam();
        alert("Le membre ne pouvait pas être supprimé (données liées). Il a été passé en statut 'Indisponible'.");
      } catch (softErr) {
        alert("Erreur lors de la mise à jour : " + (softErr as any).message);
      }
    }
  };

  const filtered = members.filter(m => 
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: members.length,
    photo: members.filter(m => m.pole === 'PHOTO').length,
    film: members.filter(m => m.pole === 'FILM').length,
    active: members.filter(m => m.status === 'Actif').length
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-[#006344]" size={40} />
      <p className="font-black uppercase text-[#006344] italic tracking-widest">Accès Core Database...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700 pb-24">
      {error && (
        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[2.5rem] flex items-center gap-6 text-red-600">
          <Lock size={32} className="shrink-0" />
          <div>
            <p className="font-black uppercase text-sm italic tracking-widest">INCIDENT DE LIAISON SUPABASE</p>
            <p className="text-sm font-bold mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-[#006344] uppercase italic tracking-tighter leading-none">Ressources Humaines</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic">Gestion Centralisée de l'Équipe</p>
        </div>
        <button 
          onClick={() => { setSelectedMember(null); setIsModalOpen(true); }}
          className="w-full lg:w-auto bg-[#006344] text-[#B6C61A] px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
        >
          <Plus size={18} /> Nouveau Membre
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Users size={20}/>} color="#006344" />
        <StatCard label="Photo" value={stats.photo} icon={<Camera size={20}/>} color="#B6C61A" />
        <StatCard label="Film" value={stats.film} icon={<Video size={20}/>} color="#D8A800" />
        <StatCard label="Actifs" value={stats.active} icon={<BadgeCheck size={20}/>} color="#10B981" />
      </div>

      <div className="bg-white p-4 rounded-[2.5rem] shadow-subtle border border-slate-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
          <input 
            type="text" 
            placeholder="RECHERCHER DANS LA BASE DE DONNÉES..." 
            className="pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase w-full outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(member => (
          <div key={member.id} className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
            <div className="flex items-center gap-5 mb-8">
               <div className="w-16 h-16 bg-[#006344] rounded-[1.5rem] flex items-center justify-center text-[#B6C61A] font-black italic text-2xl overflow-hidden relative">
                 {member.photo_url ? (
                   <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                 ) : (
                   member.full_name ? member.full_name[0] : '?'
                 )}
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{member.full_name}</h3>
                  <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block mt-1 ${member.status === 'Indisponible' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {member.status}
                  </div>
               </div>
            </div>

            <div className="space-y-4 mb-8 flex-1">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Briefcase size={14}/></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Poste</p>
                    <p className="text-sm font-black text-[#006344] uppercase italic">{member.role}</p>
                  </div>
               </div>
               
               {(member.specialty || member.skills) && (
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#B6C61A]/10 flex items-center justify-center text-[#006344] shrink-0"><Zap size={14}/></div>
                    <div>
                      <p className="text-[8px] font-black text-[#006344]/40 uppercase tracking-widest leading-none mb-1">Expertise / Skills</p>
                      <p className="text-[10px] font-bold text-[#006344] uppercase italic line-clamp-2">
                        {member.specialty}{member.skills ? ` • ${member.skills}` : ''}
                      </p>
                    </div>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
               <button onClick={() => { setSelectedMember(member); setIsModalOpen(true); }} className="py-3 rounded-xl bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#006344] hover:text-white transition-all">
                  <Edit2 size={12}/> Éditer
               </button>
               <button onClick={() => handleDelete(member.id)} className="py-3 rounded-xl bg-red-50 text-red-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 size={12}/> Supprimer
               </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <MemberModal 
          member={selectedMember} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
};

export default TeamModule;
