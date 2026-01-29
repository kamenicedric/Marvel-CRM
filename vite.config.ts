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

    const supabaseUrl =
      env.VITE_SUPABASE_URL || 'https://itpweepyypseuwemxzfd.supabase.co';
    // Utiliser la même clé par défaut que dans lib/supabase.ts
    const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cHdlZXB5eXBzZXV3ZW14emZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTExNTUsImV4cCI6MjA4MjQyNzE1NX0.Tq4oOiZezBiaRqOEkfB_xTjbw9XLuXyMAGq0FeU8hbA';
    const anonKey = env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;
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
        host: 'localhost', // Utiliser localhost pour les origines sécurisées (géolocalisation, caméra, WebAuthn)
        // Alternative: utiliser HTTPS avec certificats auto-signés
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
              console.log('[API] Request:', req.method, fullUrl);
              
              try {
                // GET /api/attendance/me?employeeId=...
                if (req.method === 'GET' && (fullUrl.includes('/me') || req.url.startsWith('/me'))) {
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

                // POST /api/attendance/check-in
                if (req.method === 'POST' && (fullUrl.includes('/check-in') || req.url.startsWith('/check-in'))) {
                  console.log('[API] POST /check-in');
                  const body = await readBody(req);
                  console.log('[API] Body received:', body ? 'OK' : 'NULL');
                  if (!body) return json(res, 400, { error: 'JSON invalide' });

                  const {
                    employeeId,
                    lat,
                    lng,
                    mode, // 'SELFIE' | 'BIO'
                    selfieDataUrl, // required if mode === 'SELFIE'
                  } = body || {};

                  if (!employeeId) return json(res, 400, { error: 'employeeId requis' });
                  if (typeof lat !== 'number' || typeof lng !== 'number') {
                    return json(res, 400, { error: 'lat/lng requis' });
                  }
                  if (mode !== 'SELFIE' && mode !== 'BIO') {
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
                      return json(res, 403, { 
                        error: 'Aucune empreinte digitale enregistrée pour cet employé. Enregistrez d\'abord votre empreinte.' 
                      });
                    }
                  }

                  const dist = distanceMeters({ lat, lng }, ATTENDANCE_ZONE_CENTER);
                  if (!Number.isFinite(dist)) return json(res, 400, { error: 'GPS invalide' });
                  if (dist > ATTENDANCE_ZONE_RADIUS_METERS) {
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
                  if (existingErr) return json(res, 500, { error: existingErr.message });
                  if (existing && existing.length > 0) {
                    return json(res, 409, { error: 'Déjà pointé aujourd’hui' });
                  }

                  let selfieUrl: string | null = null;
                  if (mode === 'SELFIE') {
                    if (typeof selfieDataUrl !== 'string' || selfieDataUrl.length < 50) {
                      return json(res, 400, { error: 'selfieDataUrl requis' });
                    }
                    const parsed = dataUrlToBuffer(selfieDataUrl);
                    if (!parsed) return json(res, 400, { error: 'selfieDataUrl invalide' });

                    const filePath = `attendance/${employeeId}/${Date.now()}.jpg`;
                    const { error: upErr } = await supabaseServer.storage
                      .from('documents')
                      .upload(filePath, parsed.buf, { contentType: parsed.mime, upsert: false });
                    if (upErr) return json(res, 500, { error: upErr.message });

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
                    console.error('[API] Insert error:', insErr);
                    return json(res, 500, { error: insErr.message || 'Erreur insertion' });
                  }
                  return json(res, 200, { entry: inserted });
                }

                // Route non trouvée
                return json(res, 404, { error: 'Route non trouvée' });
              } catch (e: any) {
                console.error('[API] Unhandled error:', e);
                // S'assurer qu'on répond toujours en JSON
                if (!res.headersSent) {
                  return json(res, 500, { 
                    error: e?.message || String(e) || 'Erreur serveur inconnue' 
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
