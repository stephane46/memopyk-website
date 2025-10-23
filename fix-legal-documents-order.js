#!/usr/bin/env node

/**
 * MEMOPYK Legal Documents Database Fix v1.0.163
 * 
 * This script fixes the legal documents order and types to match:
 * 1. Mentions légales (legal-notice)
 * 2. CGU (terms) 
 * 3. CGV (terms-sale)
 * 4. Privacy (privacy)
 * 5. Cookies (cookies)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixLegalDocuments() {
  console.log('🔧 MEMOPYK Legal Documents Fix v1.0.163 Starting...');
  
  try {
    // 1. Fetch all current legal documents
    console.log('📋 Fetching current legal documents...');
    const { data: currentDocs, error: fetchError } = await supabase
      .from('legal_documents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    console.log(`📊 Found ${currentDocs.length} existing documents:`);
    currentDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title_fr} (${doc.type}) - ${doc.is_active ? 'Active' : 'Inactive'}`);
    });

    // 2. Identify and remove duplicates (keep the most recent)
    console.log('\n🗑️  Removing duplicate documents...');
    const seenTypes = new Set();
    const toDelete = [];
    const toKeep = [];

    currentDocs.forEach(doc => {
      if (seenTypes.has(doc.type)) {
        toDelete.push(doc);
        console.log(`   ❌ Marking duplicate for deletion: ${doc.title_fr} (${doc.type})`);
      } else {
        seenTypes.add(doc.type);
        toKeep.push(doc);
        console.log(`   ✅ Keeping: ${doc.title_fr} (${doc.type})`);
      }
    });

    // Delete duplicates
    for (const doc of toDelete) {
      const { error: deleteError } = await supabase
        .from('legal_documents')
        .delete()
        .eq('id', doc.id);
      
      if (deleteError) {
        console.error(`❌ Failed to delete duplicate ${doc.id}:`, deleteError);
      } else {
        console.log(`🗑️  Deleted duplicate: ${doc.title_fr}`);
      }
    }

    // 3. Update document types to match new schema
    console.log('\n🔄 Updating document types to new schema...');
    
    const typeMapping = {
      'cgv': 'terms-sale',
      'mentions-legales': 'legal-notice', 
      'politique-confidentialite': 'privacy',
      'politique-cookies': 'cookies'
    };

    for (const doc of toKeep) {
      const newType = typeMapping[doc.type];
      if (newType && newType !== doc.type) {
        const { error: updateError } = await supabase
          .from('legal_documents')
          .update({ type: newType })
          .eq('id', doc.id);
        
        if (updateError) {
          console.error(`❌ Failed to update type for ${doc.id}:`, updateError);
        } else {
          console.log(`🔄 Updated type: ${doc.type} → ${newType} (${doc.title_fr})`);
          doc.type = newType; // Update local copy
        }
      }
    }

    // 4. Check for missing document types and create placeholders if needed
    console.log('\n📝 Checking for missing document types...');
    
    const requiredTypes = ['legal-notice', 'terms', 'terms-sale', 'privacy', 'cookies'];
    const existingTypes = toKeep.map(doc => doc.type);
    const missingTypes = requiredTypes.filter(type => !existingTypes.includes(type));

    if (missingTypes.includes('terms')) {
      console.log('➕ Creating placeholder for Terms of Service (CGU)...');
      const { error: createError } = await supabase
        .from('legal_documents')
        .insert({
          type: 'terms',
          title_en: 'Terms of Service',
          title_fr: 'Conditions Générales d\'Utilisation (CGU)',
          content_en: '<p>Terms of Service content to be added.</p>',
          content_fr: '<p>Contenu des CGU à ajouter.</p>',
          is_active: false
        });
      
      if (createError) {
        console.error('❌ Failed to create Terms of Service:', createError);
      } else {
        console.log('✅ Created placeholder Terms of Service document');
      }
    }

    // 5. Final verification
    console.log('\n✅ Final verification - fetching updated documents...');
    const { data: finalDocs, error: finalError } = await supabase
      .from('legal_documents')
      .select('*')
      .order('type');

    if (finalError) {
      throw new Error(`Failed to fetch final documents: ${finalError.message}`);
    }

    console.log('\n📋 Updated documents order:');
    const orderMap = { 'legal-notice': 1, 'terms': 2, 'terms-sale': 3, 'privacy': 4, 'cookies': 5 };
    
    finalDocs
      .sort((a, b) => (orderMap[a.type] || 99) - (orderMap[b.type] || 99))
      .forEach((doc, index) => {
        const statusIcon = doc.is_active ? '🟢' : '🔴';
        console.log(`   ${index + 1}. ${statusIcon} ${doc.title_fr} (${doc.type})`);
      });

    console.log('\n🎉 Legal documents fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   • Removed ${toDelete.length} duplicate document(s)`);
    console.log(`   • Updated ${Object.keys(typeMapping).length} document type(s)`);
    console.log(`   • Created ${missingTypes.length} missing document(s)`);
    console.log(`   • Final count: ${finalDocs.length} documents`);
    
  } catch (error) {
    console.error('❌ Legal documents fix failed:', error);
    process.exit(1);
  }
}

fixLegalDocuments();