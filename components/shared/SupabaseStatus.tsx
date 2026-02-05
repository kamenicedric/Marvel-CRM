import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { Database, Wifi, WifiOff } from 'lucide-react';

interface SupabaseStatusProps {
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const SupabaseStatus: React.FC<SupabaseStatusProps> = ({ size = 'md', showLabel = false }) => {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { error } = await supabase.from('wedding_projects').select('id').limit(1);
        setStatus(error ? 'offline' : 'online');
      } catch {
        setStatus('offline');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-2 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-black uppercase tracking-widest`}>
      <div className={`relative flex h-3 w-3`}>
        {status === 'online' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${
          status === 'online' ? 'bg-emerald-500' : status === 'offline' ? 'bg-red-500' : 'bg-slate-300'
        }`}></span>
      </div>
      {showLabel && (
        <span className={status === 'online' ? 'text-emerald-600' : 'text-slate-400'}>
          {status === 'online' ? 'Database Link Active' : 'Offline Mode'}
        </span>
      )}
    </div>
  );
};

export default SupabaseStatus;