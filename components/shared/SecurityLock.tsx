import React, { useState, useEffect } from 'react';
import { PIN_LENGTH } from '../../constants';
import { Lock, Loader2, AlertOctagon } from 'lucide-react';

interface SecurityLockProps {
    isOpen: boolean;
    onUnlock: (pin: string) => Promise<boolean> | boolean;
}

const SecurityLock: React.FC<SecurityLockProps> = ({ isOpen, onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    // Focus management is tricky in modals, but since this is full screen, 
    // we can just rely on the onscreen keyboard or simple key listening.

    useEffect(() => {
        if (!isOpen) {
            setPin('');
            setError(false);
        }
    }, [isOpen]);

    const handleUnlockAttempt = async (enteredPin: string) => {
        setIsVerifying(true);
        try {
            const isValid = await onUnlock(enteredPin);
            if (isValid) {
                // Success handled by parent (likely setting isOpen to false)
                setPin('');
            } else {
                throw new Error('Invalid PIN');
            }
        } catch (err) {
            setError(true);
            setTimeout(() => {
                setPin('');
                setError(false);
                setIsVerifying(false);
            }, 1000);
        } finally {
            if (!isOpen) setIsVerifying(false); // Safety check
        }
    };

    const handlePinInput = (digit: string) => {
        if (pin.length < PIN_LENGTH && !isVerifying) {
            const newPin = pin + digit;
            setPin(newPin);
            if (newPin.length === PIN_LENGTH) {
                handleUnlockAttempt(newPin);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md">

                {/* HEADER */}
                <div className="text-center space-y-6 mb-12">
                    <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto border border-white/20">
                        <Lock className="text-white" size={40} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                            Session Verrouillée
                        </h1>
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.4em] italic">
                            Inactivité Détectée
                        </p>
                    </div>
                </div>

                {/* PIN INTERFACE */}
                <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-white/10 relative overflow-hidden">

                    {/* Status Indicator */}
                    <div className="flex justify-center mb-8">
                        <div className={`p-3 rounded-2xl transition-all duration-500 ${error ? 'bg-red-50 text-red-500' : 'bg-[#006344]/10 text-[#006344]'}`}>
                            {isVerifying ? <Loader2 className="animate-spin" size={24} /> : error ? <AlertOctagon size={24} /> : <Lock size={24} />}
                        </div>
                    </div>

                    {/* PIN DOTS */}
                    <div className="flex justify-center gap-4 relative mb-10">
                        {[...Array(PIN_LENGTH)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-14 h-16 rounded-2xl border-4 flex items-center justify-center transition-all duration-300 ${error ? 'border-red-500 bg-red-50 animate-shake' :
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
                                className={`h-20 rounded-[2rem] font-black text-2xl transition-all flex items-center justify-center active:scale-95 ${val === 'C' ? 'text-slate-300 text-sm tracking-widest hover:text-red-400' :
                                        val === '←' ? 'text-slate-300 hover:text-[#006344]' :
                                            'text-slate-800 bg-slate-50/50 hover:bg-white border-2 border-transparent hover:border-[#006344] hover:shadow-lg'
                                    }`}
                            >
                                {val}
                            </button>
                        ))}
                    </div>

                    {/* ERROR MESSAGE */}
                    {error && (
                        <div className="absolute inset-x-0 bottom-0 bg-red-500 text-white py-3 text-center text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-bottom-full">
                            Code Incorrect
                        </div>
                    )}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
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

export default SecurityLock;
