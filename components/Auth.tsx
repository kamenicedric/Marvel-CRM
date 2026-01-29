
import React, { useState } from 'react';
import { SPACES, PIN_LENGTH } from '../constants.tsx';
import { Space, TeamMember } from '../types.ts';
import { 
  ShieldCheck, Lock, Loader2, Zap, AlertOctagon
} from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

interface AuthProps {
  onAuthenticated: (space: Space, member?: TeamMember) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyGlobalPin = async (enteredPin: string) => {
    setIsVerifying(true);
    
    // 1. Vérification si c'est un Code Espace Statique (Admin/Direct) - Ignore les codes vides
    const matchedSpace = SPACES.find(s => s.code === enteredPin && s.code !== '');
    if (matchedSpace) {
      setTimeout(() => { // Petit délai pour UX
        onAuthenticated(matchedSpace);
      }, 500);
      return;
    }

    try {
      // 2. Vérification si c'est un Code Membre (Dynamique)
      const { data, error: dbError } = await supabase
        .from('team_members')
        .select('*')
        .eq('pin', enteredPin)
        .eq('status', 'Actif')
        .maybeSingle();

      if (data) {
        const member = data as TeamMember;
        
        // Création dynamique de l'objet Space pour ce membre
        const personalSpace: Space = {
          id: member.id, // On utilise l'ID unique DB pour le routage
          name: member.full_name.split(' ')[0],
          icon: '👤', // Icône par défaut, ajustée dans MasterDashboard
          code: '',
          description: member.role
        };

        onAuthenticated(personalSpace, member);
      } else {
        throw new Error("Invalid PIN");
      }
    } catch (err) {
      setError(true);
      setTimeout(() => { 
        setPin(''); 
        setError(false); 
        setIsVerifying(false);
      }, 1000);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < PIN_LENGTH && !isVerifying) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === PIN_LENGTH) {
        verifyGlobalPin(newPin);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md">
        
        {/* LOGO & BRANDING */}
        <div className="text-center space-y-6 mb-12 animate-in slide-in-from-top-8 duration-700">
          <div className="w-24 h-24 bg-[#006344] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#006344]/30 mx-auto transform rotate-3 hover:rotate-0 transition-all duration-500">
            <span className="text-white font-black text-5xl italic">M</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              MARVEL <span className="text-[#006344]">ACCESS</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] italic">
              Identification Sécurisée Requise
            </p>
          </div>
        </div>

        {/* PIN INTERFACE */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-slate-100 relative overflow-hidden">
          
          {/* Status Indicator */}
          <div className="flex justify-center mb-8">
             <div className={`p-3 rounded-2xl transition-all duration-500 ${error ? 'bg-red-50 text-red-500' : 'bg-[#B6C61A]/10 text-[#006344]'}`}>
                {isVerifying ? <Loader2 className="animate-spin" size={24} /> : error ? <AlertOctagon size={24} /> : <ShieldCheck size={24} />}
             </div>
          </div>

          {/* PIN DOTS */}
          <div className="flex justify-center gap-4 relative mb-10">
            {[...Array(PIN_LENGTH)].map((_, i) => (
              <div 
                key={i}
                className={`w-14 h-16 rounded-2xl border-4 flex items-center justify-center transition-all duration-300 ${
                  error ? 'border-red-500 bg-red-50 animate-shake' : 
                  pin.length > i ? 'border-[#006344] bg-[#006344]/5 scale-110' : 'border-slate-100 bg-slate-50'
                }`}
              >
                {pin.length > i && <div className="w-4 h-4 bg-[#006344] rounded-full shadow-[0_0_15px_#006344]" />}
              </div>
            ))}
          </div>

          {/* KEYPAD */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map((val, i) => (
              <button
                key={i}
                disabled={isVerifying}
                onClick={() => {
                  if (val === '←') setPin(pin.slice(0, -1));
                  else if (val === 'C') setPin('');
                  else if (typeof val === 'number') handlePinInput(val.toString());
                }}
                className={`h-20 rounded-[2rem] font-black text-2xl transition-all flex items-center justify-center active:scale-90 ${
                  val === 'C' ? 'text-slate-300 text-sm tracking-widest hover:text-red-400' : 
                  val === '←' ? 'text-slate-300 hover:text-[#006344]' : 
                  'text-slate-800 bg-slate-50/50 hover:bg-white border-2 border-transparent hover:border-[#B6C61A] hover:shadow-lg'
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="absolute inset-x-0 bottom-0 bg-red-500 text-white py-3 text-center text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-bottom-full">
              Code PIN non reconnu
            </div>
          )}
        </div>

        <div className="text-center mt-8 opacity-30">
           <Zap size={24} className="mx-auto text-slate-400 mb-2"/>
           <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Système sécurisé par Marvel Intelligence</p>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
      `}} />
    </div>
  );
};

export default Auth;
