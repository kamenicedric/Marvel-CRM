import { createClient } from '@supabase/supabase-js';

type VercelRequest = { method?: string; body?: Record<string, unknown> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ATTENDANCE_ZONE_CENTER = { lat: 4.091933280363106, lng: 9.741281074488526 };
const ATTENDANCE_ZONE_RADIUS_METERS = 50;
const ATTENDANCE_LATE_AFTER = { hour: 9, minute: 0 };

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}
function isLate(d: Date) {
  return (
    d.getHours() > ATTENDANCE_LATE_AFTER.hour ||
    (d.getHours() === ATTENDANCE_LATE_AFTER.hour && d.getMinutes() > ATTENDANCE_LATE_AFTER.minute)
  );
}

function dataUrlToBuffer(dataUrl: string): { mime: string; buf: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], buf: Buffer.from(match[2], 'base64') };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase non configuré' });
  }

  const body = req.body as Record<string, unknown> | undefined;
  if (!body) {
    return res.status(400).json({ error: 'JSON invalide' });
  }

  const {
    employeeId,
    lat,
    lng,
    mode,
    selfieDataUrl,
  } = body;

  if (!employeeId || typeof employeeId !== 'string') {
    return res.status(400).json({ error: 'employeeId requis' });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat/lng requis' });
  }
  if (mode !== 'SELFIE' && mode !== 'BIO') {
    return res.status(400).json({ error: 'mode invalide' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (mode === 'BIO') {
    const { data: bioCreds, error: bioErr } = await supabase
      .from('biometric_credentials')
      .select('id')
      .eq('employee_id', employeeId)
      .limit(1);

    if (bioErr) {
      return res.status(500).json({ error: 'Erreur vérification empreinte digitale' });
    }
    if (!bioCreds || bioCreds.length === 0) {
      return res.status(403).json({
        error: "Aucune empreinte digitale enregistrée pour cet employé. Enregistrez d'abord votre empreinte.",
      });
    }
  }

  const dist = distanceMeters({ lat, lng }, ATTENDANCE_ZONE_CENTER);
  if (!Number.isFinite(dist)) {
    return res.status(400).json({ error: 'GPS invalide' });
  }
  if (dist > ATTENDANCE_ZONE_RADIUS_METERS) {
    return res.status(403).json({
      error: 'Hors zone',
      distanceMeters: Math.round(dist),
      radiusMeters: ATTENDANCE_ZONE_RADIUS_METERS,
    });
  }

  const d = new Date();
  const from = startOfDay(d).toISOString();
  const to = endOfDay(d).toISOString();

  const { data: existing, error: existingErr } = await supabase
    .from('pointage_entries')
    .select('id')
    .eq('employee_id', employeeId)
    .gte('timestamp', from)
    .lt('timestamp', to)
    .limit(1);

  if (existingErr) {
    return res.status(500).json({ error: existingErr.message });
  }
  if (existing && existing.length > 0) {
    return res.status(409).json({ error: 'Déjà pointé aujourd’hui' });
  }

  let selfieUrl: string | null = null;
  if (mode === 'SELFIE') {
    if (typeof selfieDataUrl !== 'string' || selfieDataUrl.length < 50) {
      return res.status(400).json({ error: 'selfieDataUrl requis' });
    }
    const parsed = dataUrlToBuffer(selfieDataUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'selfieDataUrl invalide' });
    }
    const filePath = `attendance/${employeeId}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(filePath, parsed.buf, { contentType: parsed.mime, upsert: false });
    if (upErr) {
      return res.status(500).json({ error: upErr.message });
    }
    const { data: pub } = supabase.storage.from('documents').getPublicUrl(filePath);
    selfieUrl = pub?.publicUrl || null;
  }

  const status = isLate(d) ? 'EN_RETARD' : 'PRESENT';

  const { data: inserted, error: insErr } = await supabase
    .from('pointage_entries')
    .insert({
      employee_id: employeeId,
      type: 'IN',
      method: mode === 'SELFIE' ? 'FACE' : 'BIO',
      status,
      note: null,
      lat,
      lng,
      distance_meters: Math.round(dist),
      selfie_url: selfieUrl,
      timestamp: d.toISOString(),
    })
    .select('*')
    .single();

  if (insErr) {
    return res.status(500).json({
      error: insErr.message || 'Erreur insertion',
      details: (insErr as { code?: string; hint?: string }).code || (insErr as { code?: string; hint?: string }).hint || '',
    });
  }
  return res.status(200).json({ entry: inserted });
}
