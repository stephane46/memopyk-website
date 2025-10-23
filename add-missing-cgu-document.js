#!/usr/bin/env node

/**
 * Add missing CGU (Conditions générales d'utilisation) document
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addMissingCGU() {
  console.log('📝 Adding missing CGU document...');
  
  try {
    // Check if CGU document already exists
    const { data: existingDocs, error: fetchError } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('type', 'terms');

    if (fetchError) {
      throw new Error(`Failed to check existing documents: ${fetchError.message}`);
    }

    if (existingDocs && existingDocs.length > 0) {
      console.log('✅ CGU document already exists');
      return;
    }

    // Create the CGU document
    const { error: createError } = await supabase
      .from('legal_documents')
      .insert({
        type: 'terms',
        title_en: 'Terms of Service',
        title_fr: 'Conditions Générales d\'Utilisation',
        content_en: '<p>Terms of Service content - to be updated by administrator.</p>',
        content_fr: '<p>Contenu des Conditions Générales d\'Utilisation - à mettre à jour par l\'administrateur.</p>',
        is_active: true
      });
    
    if (createError) {
      throw new Error(`Failed to create CGU document: ${createError.message}`);
    }

    console.log('✅ Successfully created CGU document');
    
  } catch (error) {
    console.error('❌ Failed to add CGU document:', error);
    process.exit(1);
  }
}

addMissingCGU();