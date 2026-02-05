/**
 * Script pour créer le bucket Storage "documents" dans Supabase
 * Exécuter avec: node scripts/create-bucket.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://itpweepyypseuwemxzfd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cHdlZXB5eXBzZXV3ZW14emZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTExNTUsImV4cCI6MjA4MjQyNzE1NX0.Tq4oOiZezBiaRqOEkfB_xTjbw9XLuXyMAGq0FeU8hbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createBucket() {
    console.log('🪣 Création du bucket "documents"...\n');

    // Vérifier si le bucket existe déjà
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.log('❌ Erreur lors de la liste des buckets:', listError.message);
        console.log('\n⚠️ Note: La création de buckets nécessite une clé Service Role.');
        console.log('   Vous devez créer le bucket manuellement dans Supabase Dashboard.\n');
        return;
    }

    const existingBucket = buckets?.find(b => b.name === 'documents');
    if (existingBucket) {
        console.log('✅ Le bucket "documents" existe déjà!');
        return;
    }

    // Essayer de créer le bucket
    const { data, error } = await supabase.storage.createBucket('documents', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
    });

    if (error) {
        console.log('❌ Erreur création bucket:', error.message);

        if (error.message.includes('row-level security') || error.message.includes('permission') || error.message.includes('policy')) {
            console.log('\n⚠️ L\'API anonyme ne peut pas créer de buckets (restriction de sécurité).');
            console.log('   Vous devez le créer manuellement dans Supabase Dashboard:\n');
            console.log('   1. Allez sur https://supabase.com/dashboard');
            console.log('   2. Connectez-vous');
            console.log('   3. Sélectionnez votre projet');
            console.log('   4. Cliquez sur "Storage" dans le menu');
            console.log('   5. Cliquez sur "New Bucket"');
            console.log('   6. Nom: documents');
            console.log('   7. Cochez "Public bucket"');
            console.log('   8. Cliquez "Create bucket"');
            console.log('\n   Puis ajoutez une policy pour les uploads:');
            console.log('   - Cliquez sur le bucket "documents"');
            console.log('   - Onglet "Policies"');
            console.log('   - "New Policy" → "For full customization"');
            console.log('   - Nom: Allow all');
            console.log('   - Allowed operations: INSERT, SELECT, UPDATE, DELETE');
            console.log('   - Policy definition: true');
        }
    } else {
        console.log('✅ Bucket "documents" créé avec succès!', data);
    }
}

createBucket().catch(console.error);
