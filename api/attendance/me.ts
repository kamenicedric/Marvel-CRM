import { createClient } from '@supabase/supabase-js';

type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://itpweepyypseuwemxzfd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cHdlZXB5eXBzZXV3ZW14emZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTExNTUsImV4cCI6MjA4MjQyNzE1NX0.Tq4oOiZezBiaRqOEkfB_xTjbw9XLuXyMAGq0FeU8hbA';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase non configuré' });
  }

  const raw = req.query?.employeeId;
  const employeeId = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : '';
  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId requis' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const d = new Date();
  const from = startOfDay(d).toISOString();
  const to = endOfDay(d).toISOString();

  const { data, error } = await supabase
    .from('pointage_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('timestamp', from)
    .lt('timestamp', to)
    .order('timestamp', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ entries: data || [] });
}
