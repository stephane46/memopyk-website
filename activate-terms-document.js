#!/usr/bin/env node

/**
 * Activate the terms document (CGU) to make it visible
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function activateTermsDocument() {
  console.log('🔄 Activating terms document...');
  
  try {
    // Find and activate the terms document
    const { data: updatedDoc, error: updateError } = await supabase
      .from('legal_documents')
      .update({ is_active: true })
      .eq('type', 'terms')
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to activate terms document: ${updateError.message}`);
    }

    console.log('✅ Successfully activated terms document:');
    console.log(`   ID: ${updatedDoc.id}`);
    console.log(`   Type: ${updatedDoc.type}`);
    console.log(`   Title FR: ${updatedDoc.title_fr}`);
    console.log(`   Active: ${updatedDoc.is_active}`);
    
  } catch (error) {
    console.error('❌ Activation failed:', error);
    process.exit(1);
  }
}

activateTermsDocument();