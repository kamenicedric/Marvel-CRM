import { createClient } from '@supabase/supabase-js';

type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://itpweepyypseuwemxzfd.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase non configuré' });
  }

  const rawEmp = req.query?.employeeId;
  const employeeId = Array.isArray(rawEmp) ? rawEmp[0] : typeof rawEmp === 'string' ? rawEmp : '';
  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId requis' });
  }

  // monthOffset permet éventuellement de naviguer dans l'historique (0 = mois courant)
  const rawOffset = req.query?.monthOffset;
  const monthOffset =
    typeof rawOffset === 'string' && rawOffset.trim() !== '' ? Number(rawOffset) || 0 : 0;

  const now = new Date();
  const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const from = startOfMonth(monthDate).toISOString();
  const to = endOfMonth(monthDate).toISOString();

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('pointage_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('timestamp', from)
    .lt('timestamp', to)
    .order('timestamp', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ entries: data || [] });
}

