import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';
import { distanceMeters } from './lib/geo';
import {
  ATTENDANCE_LATE_AFTER,
  ATTENDANCE_ZONE_CENTER,
  ATTENDANCE_ZONE_RADIUS_METERS,
} from './lib/attendanceConfig';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  // Recommandé: clé service_role côté serveur pour bypass RLS (à mettre en .env.local)
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  const serverKey = serviceRoleKey || anonKey;

  // Ne créer le client que si on a une clé valide
  if (!serverKey) {
    console.warn('[Vite Config] Aucune clé Supabase trouvée, le middleware API ne fonctionnera pas');
  }
  const supabaseServer = serverKey ? createClient(supabaseUrl, serverKey) : null;

  const json = (res: any, status: number, body: any) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };

  const readBody = async (req: any) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString('utf8');
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return null;
    }
  };

  const nowLocal = () => new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const isLate = (d: Date) =>
    d.getHours() > ATTENDANCE_LATE_AFTER.hour ||
    (d.getHours() === ATTENDANCE_LATE_AFTER.hour &&
      d.getMinutes() > ATTENDANCE_LATE_AFTER.minute);

  const dataUrlToBuffer = (dataUrl: string) => {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
    if (!match) return null;
    const mime = match[1];
    const b64 = match[2];
    return { mime, buf: Buffer.from(b64, 'base64') };
  };

  return {
    server: {
      port: 3000,
      host: '0.0.0.0', // Permet l'accès depuis d'autres appareils sur le réseau local (nécessaire pour tester sur mobile)
      // Note: Pour les fonctionnalités sécurisées (géolocalisation, caméra, WebAuthn), 
      // il est recommandé d'utiliser HTTPS en production
      // https: true, // Décommente si besoin (nécessite @vitejs/plugin-basic-ssl)
    },
    plugins: [
      react(),
      {
        name: 'attendance-api',
        enforce: 'pre', // S'assurer que ce middleware est exécuté avant les autres
        configureServer(server) {
          // Middleware pour les routes API attendance - doit être avant les autres middlewares
          server.middlewares.use('/api/attendance', async (req: any, res: any, next: any) => {
            if (!supabaseServer) {
              return json(res, 503, { error: 'Supabase non configuré' });
            }

            const fullUrl = req.originalUrl || req.url;
            const urlPath = req.url || '';
            console.log('[API] Request:', req.method, fullUrl, 'url:', urlPath);

            try {
              // GET /api/attendance/me?employeeId=...
              if (req.method === 'GET' && (fullUrl.includes('/me') || urlPath.includes('/me') || urlPath === '/me')) {
                const url = new URL(fullUrl, `http://${req.headers.host || 'localhost:3000'}`);
                const employeeId = url.searchParams.get('employeeId') || '';
                console.log('[API] GET /me - employeeId:', employeeId);
                if (!employeeId) return json(res, 400, { error: 'employeeId requis' });

                const d = nowLocal();
                const from = startOfDay(d).toISOString();
                const to = endOfDay(d).toISOString();

                const { data, error } = await supabaseServer
                  .from('pointage_entries')
                  .select('*')
                  .eq('employee_id', employeeId)
                  .gte('timestamp', from)
                  .lt('timestamp', to)
                  .order('timestamp', { ascending: false });

                if (error) return json(res, 500, { error: error.message });
                return json(res, 200, { entries: data || [] });
              }

              // GET /api/attendance/history?employeeId=...&monthOffset=0
              if (
                req.method === 'GET' &&
                (fullUrl.includes('/history') || urlPath.includes('/history') || urlPath === '/history')
              ) {
                const url = new URL(fullUrl, `http://${req.headers.host || 'localhost:3000'}`);
                const employeeId = url.searchParams.get('employeeId') || '';
                const rawOffset = url.searchParams.get('monthOffset');

                if (!employeeId) {
                  return json(res, 400, { error: 'employeeId requis' });
                }

                const monthOffset =
                  typeof rawOffset === 'string' && rawOffset.trim() !== '' ? Number(rawOffset) || 0 : 0;

                const now = nowLocal();
                const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
                const from = startOfMonth(monthDate).toISOString();
                const to = endOfMonth(monthDate).toISOString();

                const { data, error } = await supabaseServer
                  .from('pointage_entries')
                  .select('*')
                  .eq('employee_id', employeeId)
                  .gte('timestamp', from)
                  .lt('timestamp', to)
                  .order('timestamp', { ascending: true });

                if (error) {
                  return json(res, 500, { error: error.message });
                }

                return json(res, 200, { entries: data || [] });
              }

              if (req.method === 'POST' && (fullUrl.includes('/check-in') || req.url.startsWith('/check-in'))) {
                console.log('[API] POST /check-in');
                const body = await readBody(req);
                console.log('[API] Body received:', body ? `OK (keys: ${Object.keys(body).join(', ')})` : 'NULL');
                if (!body) return json(res, 400, { error: 'JSON invalide' });

                const {
                  employeeId,
                  lat,
                  lng,
                  mode, // 'SELFIE' | 'BIO'
                  selfieDataUrl, // required if mode === 'SELFIE'
                } = body || {};

                if (!employeeId) {
                  console.log('[API] Missing employeeId');
                  return json(res, 400, { error: 'employeeId requis' });
                }
                if (typeof lat !== 'number' || typeof lng !== 'number') {
                  console.log('[API] Invalid lat/lng:', lat, lng);
                  return json(res, 400, { error: 'lat/lng requis' });
                }
                if (mode !== 'SELFIE' && mode !== 'BIO') {
                  console.log('[API] Invalid mode:', mode);
                  return json(res, 400, { error: 'mode invalide' });
                }

                // VÉRIFICATION EMPREINTE DIGITALE : Si mode BIO, vérifier que l'employé a des credentials enregistrés
                if (mode === 'BIO') {
                  const { data: bioCreds, error: bioErr } = await supabaseServer
                    .from('biometric_credentials')
                    .select('id')
                    .eq('employee_id', employeeId)
                    .limit(1);

                  if (bioErr) {
                    console.error('[API] Erreur vérification biométrie:', bioErr);
                    return json(res, 500, { error: 'Erreur vérification empreinte digitale' });
                  }

                  if (!bioCreds || bioCreds.length === 0) {
                    console.log('[API] No bio credentials found for:', employeeId);
                    return json(res, 403, {
                      error: 'Aucune empreinte digitale enregistrée pour cet employé. Enregistrez d\'abord votre empreinte.'
                    });
                  }
                }

                const dist = distanceMeters({ lat, lng }, ATTENDANCE_ZONE_CENTER);
                console.log(`[API] Distance check: ${dist}m (Max: ${ATTENDANCE_ZONE_RADIUS_METERS}m)`);

                if (!Number.isFinite(dist)) {
                  console.log('[API] Invalid GPS distance calculation');
                  return json(res, 400, { error: 'GPS invalide' });
                }
                if (dist > ATTENDANCE_ZONE_RADIUS_METERS) {
                  console.log('[API] Hors zone:', dist);
                  return json(res, 403, {
                    error: 'Hors zone',
                    distanceMeters: Math.round(dist),
                    radiusMeters: ATTENDANCE_ZONE_RADIUS_METERS,
                  });
                }

                const d = nowLocal();
                const from = startOfDay(d).toISOString();
                const to = endOfDay(d).toISOString();

                const { data: existing, error: existingErr } = await supabaseServer
                  .from('pointage_entries')
                  .select('id')
                  .eq('employee_id', employeeId)
                  .gte('timestamp', from)
                  .lt('timestamp', to)
                  .limit(1);

                if (existingErr) {
                  console.log('[API] Error checking existing entry:', existingErr);
                  return json(res, 500, { error: existingErr.message });
                }
                if (existing && existing.length > 0) {
                  console.log('[API] Already checked in today:', existing[0].id);
                  return json(res, 409, { error: 'Déjà pointé aujourd’hui' });
                }

                let selfieUrl: string | null = null;
                if (mode === 'SELFIE') {
                  if (typeof selfieDataUrl !== 'string' || selfieDataUrl.length < 50) {
                    console.log('[API] Invalid selfieDataUrl length');
                    return json(res, 400, { error: 'selfieDataUrl requis' });
                  }
                  const parsed = dataUrlToBuffer(selfieDataUrl);
                  if (!parsed) {
                    console.log('[API] Failed to parse selfieDataUrl');
                    return json(res, 400, { error: 'selfieDataUrl invalide' });
                  }

                  const filePath = `attendance/${employeeId}/${Date.now()}.jpg`;
                  const { error: upErr } = await supabaseServer.storage
                    .from('documents')
                    .upload(filePath, parsed.buf, { contentType: parsed.mime, upsert: false });
                  if (upErr) {
                    console.log('[API] Selfie upload error:', upErr);
                    return json(res, 500, { error: upErr.message });
                  }

                  const { data: pub } = supabaseServer.storage
                    .from('documents')
                    .getPublicUrl(filePath);
                  selfieUrl = pub?.publicUrl || null;
                }

                const status = isLate(d) ? 'EN_RETARD' : 'PRESENT';

                const { data: inserted, error: insErr } = await supabaseServer
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
                  console.error('[API] Insert error:', JSON.stringify(insErr));
                  return json(res, 500, {
                    error: insErr.message || 'Erreur insertion',
                    details: (insErr as any).code || (insErr as any).hint || ''
                  });
                }
                console.log('[API] Check-in successful:', inserted?.id);
                return json(res, 200, { entry: inserted });
              }

              if (
                req.method === 'POST' &&
                (fullUrl.includes('/check-out') || req.url.startsWith('/check-out'))
              ) {
                console.log('[API] POST /check-out');
                const body = await readBody(req);
                console.log(
                  '[API] Body received (check-out):',
                  body ? `OK (keys: ${Object.keys(body).join(', ')})` : 'NULL',
                );
                if (!body) return json(res, 400, { error: 'JSON invalide' });

                const {
                  employeeId,
                  lat,
                  lng,
                  mode, // 'SELFIE' | 'BIO'
                  selfieDataUrl, // required if mode === 'SELFIE'
                } = body || {};

                if (!employeeId) {
                  console.log('[API] Missing employeeId (check-out)');
                  return json(res, 400, { error: 'employeeId requis' });
                }
                if (typeof lat !== 'number' || typeof lng !== 'number') {
                  console.log('[API] Invalid lat/lng (check-out):', lat, lng);
                  return json(res, 400, { error: 'lat/lng requis' });
                }
                if (mode !== 'SELFIE' && mode !== 'BIO') {
                  console.log('[API] Invalid mode (check-out):', mode);
                  return json(res, 400, { error: 'mode invalide' });
                }

                const dist = distanceMeters({ lat, lng }, ATTENDANCE_ZONE_CENTER);
                console.log(
                  `[API] Distance check (check-out): ${dist}m (Max: ${ATTENDANCE_ZONE_RADIUS_METERS}m)`,
                );

                if (!Number.isFinite(dist)) {
                  console.log('[API] Invalid GPS distance calculation (check-out)');
                  return json(res, 400, { error: 'GPS invalide' });
                }
                if (dist > ATTENDANCE_ZONE_RADIUS_METERS) {
                  console.log('[API] Hors zone (check-out):', dist);
                  return json(res, 403, {
                    error: 'Hors zone',
                    distanceMeters: Math.round(dist),
                    radiusMeters: ATTENDANCE_ZONE_RADIUS_METERS,
                  });
                }

                const d = nowLocal();
                const from = startOfDay(d).toISOString();
                const to = endOfDay(d).toISOString();

                const { data: todayEntries, error: todayErr } = await supabaseServer
                  .from('pointage_entries')
                  .select('id,type,timestamp')
                  .eq('employee_id', employeeId)
                  .gte('timestamp', from)
                  .lt('timestamp', to)
                  .order('timestamp', { ascending: true });

                if (todayErr) {
                  console.log('[API] Error checking existing entries (check-out):', todayErr);
                  return json(res, 500, { error: todayErr.message });
                }

                const hasIn = todayEntries?.some((e: any) => e.type === 'IN');
                const hasOut = todayEntries?.some((e: any) => e.type === 'OUT');

                if (!hasIn) {
                  console.log('[API] No IN found for today (check-out)');
                  return json(res, 409, { error: "Aucun pointage d'entrée trouvé pour aujourd'hui" });
                }
                if (hasOut) {
                  console.log('[API] OUT already exists for today (check-out)');
                  return json(res, 409, { error: 'Déjà pointé à la sortie aujourd’hui' });
                }

                let selfieUrl: string | null = null;
                if (mode === 'SELFIE') {
                  if (typeof selfieDataUrl !== 'string' || selfieDataUrl.length < 50) {
                    console.log('[API] Invalid selfieDataUrl length (check-out)');
                    return json(res, 400, { error: 'selfieDataUrl requis' });
                  }
                  const parsed = dataUrlToBuffer(selfieDataUrl);
                  if (!parsed) {
                    console.log('[API] Failed to parse selfieDataUrl (check-out)');
                    return json(res, 400, { error: 'selfieDataUrl invalide' });
                  }

                  const filePath = `attendance/${employeeId}/${Date.now()}-out.jpg`;
                  const { error: upErr } = await supabaseServer.storage
                    .from('documents')
                    .upload(filePath, parsed.buf, { contentType: parsed.mime, upsert: false });
                  if (upErr) {
                    console.log('[API] Selfie upload error (check-out):', upErr);
                    return json(res, 500, { error: upErr.message });
                  }

                  const { data: pub } = supabaseServer.storage.from('documents').getPublicUrl(filePath);
                  selfieUrl = pub?.publicUrl || null;
                }

                const { data: inserted, error: insErr } = await supabaseServer
                  .from('pointage_entries')
                  .insert({
                    employee_id: employeeId,
                    type: 'OUT',
                    method: mode === 'SELFIE' ? 'FACE' : 'BIO',
                    status: 'PRESENT',
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
                  console.error('[API] Insert error (check-out):', JSON.stringify(insErr));
                  return json(res, 500, {
                    error: insErr.message || 'Erreur insertion',
                    details: (insErr as any).code || (insErr as any).hint || '',
                  });
                }
                console.log('[API] Check-out successful:', inserted?.id);
                return json(res, 200, { entry: inserted });
              }

              // Route non trouvée
              console.log('[API] Route not matched - method:', req.method, 'url:', urlPath);
              return json(res, 404, { error: 'Route non trouvée', method: req.method, url: urlPath });
            } catch (e: any) {
              console.error('[API] Unhandled error:', e);
              console.error('[API] Error stack:', e?.stack);
              // S'assurer qu'on répond toujours en JSON
              if (!res.headersSent) {
                return json(res, 500, {
                  error: e?.message || String(e) || 'Erreur serveur inconnue',
                  details: e?.code || ''
                });
              }
            }
          });
        },
      },
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
