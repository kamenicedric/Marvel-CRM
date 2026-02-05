/**
 * Script pour configurer les tables Supabase nécessaires au pointage
 * Exécuter avec: node scripts/setup-database.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://itpweepyypseuwemxzfd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cHdlZXB5eXBzZXV3ZW14emZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTExNTUsImV4cCI6MjA4MjQyNzE1NX0.Tq4oOiZezBiaRqOEkfB_xTjbw9XLuXyMAGq0FeU8hbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    console.log('🔍 Vérification des tables...\n');

    // Test pointage_entries
    const { data: pointageData, error: pointageError } = await supabase
        .from('pointage_entries')
        .select('id')
        .limit(1);

    if (pointageError) {
        console.log('❌ Table pointage_entries: ERREUR -', pointageError.message);
        console.log('   → Cette table doit être créée dans Supabase Dashboard');
    } else {
        console.log('✅ Table pointage_entries: OK');
    }

    // Test biometric_credentials
    const { data: bioData, error: bioError } = await supabase
        .from('biometric_credentials')
        .select('id')
        .limit(1);

    if (bioError) {
        console.log('❌ Table biometric_credentials: ERREUR -', bioError.message);
        console.log('   → Cette table doit être créée dans Supabase Dashboard');
    } else {
        console.log('✅ Table biometric_credentials: OK');
    }

    // Test team_members
    const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select('id, full_name')
        .limit(5);

    if (teamError) {
        console.log('❌ Table team_members: ERREUR -', teamError.message);
    } else {
        console.log('✅ Table team_members: OK -', teamData?.length || 0, 'membres trouvés');
        if (teamData && teamData.length > 0) {
            console.log('   Premiers membres:', teamData.map(m => m.full_name).join(', '));
        }
    }

    // Test storage bucket
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
        console.log('❌ Storage buckets: ERREUR -', bucketError.message);
    } else {
        console.log('✅ Storage buckets disponibles:', buckets?.map(b => b.name).join(', ') || 'Aucun');
        const hasDocuments = buckets?.some(b => b.name === 'documents');
        if (!hasDocuments) {
            console.log('   ⚠️ Le bucket "documents" n\'existe pas - les selfies ne pourront pas être uploadés');
        }
    }

    console.log('\n📋 SQL pour créer les tables manquantes (à exécuter dans Supabase Dashboard > SQL Editor):\n');
    console.log(`
-- Table pour les entrées de pointage
CREATE TABLE IF NOT EXISTS pointage_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
  method VARCHAR(10) NOT NULL CHECK (method IN ('FACE', 'BIO', 'VISA')),
  status VARCHAR(20) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'EN_RETARD', 'REFUSE')),
  note TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  distance_meters INTEGER,
  selfie_url TEXT,
  visa_photo_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les credentials biométriques
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  device_name VARCHAR(255),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_pointage_employee ON pointage_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_pointage_timestamp ON pointage_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_biometric_employee ON biometric_credentials(employee_id);

-- Policies RLS (Row Level Security)
ALTER TABLE pointage_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tous peuvent insérer pointage" ON pointage_entries;
DROP POLICY IF EXISTS "Tous peuvent lire pointage" ON pointage_entries;
CREATE POLICY "Tous peuvent insérer pointage" ON pointage_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Tous peuvent lire pointage" ON pointage_entries FOR SELECT USING (true);

ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tous peuvent insérer bio" ON biometric_credentials;
DROP POLICY IF EXISTS "Tous peuvent lire bio" ON biometric_credentials;
DROP POLICY IF EXISTS "Tous peuvent modifier bio" ON biometric_credentials;
CREATE POLICY "Tous peuvent insérer bio" ON biometric_credentials FOR INSERT WITH CHECK (true);
CREATE POLICY "Tous peuvent lire bio" ON biometric_credentials FOR SELECT USING (true);
CREATE POLICY "Tous peuvent modifier bio" ON biometric_credentials FOR UPDATE USING (true);
  `);
}

checkTables().catch(console.error);
