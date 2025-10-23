#!/usr/bin/env node

/**
 * Check all legal documents in Supabase including inactive ones
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAllLegalDocuments() {
  console.log('🔍 Checking ALL legal documents in Supabase...');
  
  try {
    // Get ALL documents (both active and inactive)
    const { data: allDocs, error: fetchError } = await supabase
      .from('legal_documents')
      .select('*')
      .order('type');

    if (fetchError) {
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    console.log(`📊 Total documents in database: ${allDocs.length}`);
    console.log('\n📋 All documents:');
    allDocs.forEach((doc, index) => {
      const statusIcon = doc.is_active ? '🟢' : '🔴';
      console.log(`   ${index + 1}. ${statusIcon} ${doc.title_fr} (${doc.type}) - ${doc.is_active ? 'Active' : 'Inactive'}`);
    });

    // Check specifically for terms document
    const termsDoc = allDocs.find(doc => doc.type === 'terms');
    if (termsDoc) {
      console.log('\n✅ Terms document found:');
      console.log(`   Type: ${termsDoc.type}`);
      console.log(`   Active: ${termsDoc.is_active}`);
      console.log(`   Title FR: ${termsDoc.title_fr}`);
      console.log(`   Title EN: ${termsDoc.title_en}`);
    } else {
      console.log('\n❌ No terms document found!');
      
      // Create the missing terms document
      console.log('\n📝 Creating missing terms document...');
      const { data: newDoc, error: createError } = await supabase
        .from('legal_documents')
        .insert({
          type: 'terms',
          title_en: 'Terms of Service',
          title_fr: 'Conditions Générales d\'Utilisation',
          content_en: '<p>Terms of Service content - to be updated by administrator.</p>',
          content_fr: '<p>Contenu des Conditions Générales d\'Utilisation - à mettre à jour par l\'administrateur.</p>',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create terms document:', createError);
      } else {
        console.log('✅ Successfully created terms document:', newDoc.id);
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

checkAllLegalDocuments();