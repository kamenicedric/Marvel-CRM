/**
 * Script pour vérifier si l'employé Daniel a des credentials biométriques
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://itpweepyypseuwemxzfd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cHdlZXB5eXBzZXV3ZW14emZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTExNTUsImV4cCI6MjA4MjQyNzE1NX0.Tq4oOiZezBiaRqOEkfB_xTjbw9XLuXyMAGq0FeU8hbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBio() {
    const employeeId = '695cce01-1ac3-4d8a-9fbb-09e90c1f33fb'; // Daniel
    console.log(`🔍 Vérification biométrie pour Daniel (${employeeId})...`);

    const { data, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('employee_id', employeeId);

    if (error) {
        console.error('❌ Erreur Supabase:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log(`✅ ${data.length} credential(s) trouvé(s) :`);
        data.forEach((c, i) => {
            console.log(`   [${i + 1}] ID: ${c.id}, Device: ${c.device_name}, Créé le: ${c.created_at}`);
        });
        console.log('\n💡 Note: Si vous avez changé de port (3000 -> 3001), l\'empreinte peut ne plus être reconnue par le navigateur.');
    } else {
        console.log('⚠️ Aucune empreinte trouvée dans la base pour cet employé.');
    }
}

checkBio().catch(console.error);
