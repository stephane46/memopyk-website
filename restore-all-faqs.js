const fs = require('fs');

// Create restore script to recover all deleted FAQs from JSON backup
console.log('🚨 EMERGENCY: Restoring ALL deleted FAQs from JSON backup...');

// Read the JSON backup
const jsonData = fs.readFileSync('./server/data/faqs.json', 'utf8');
const allFaqs = JSON.parse(jsonData);

// Filter FAQs that need to be restored (pricing section)
const pricingFaqs = allFaqs.filter(faq => faq.section_id === 'pricing');

console.log(`📊 Found ${pricingFaqs.length} pricing FAQs in JSON backup:`, 
  pricingFaqs.map(f => f.question_fr));

// Restore each FAQ
const restorePromises = pricingFaqs.map(async (faq) => {
  try {
    const response = await fetch('http://localhost:5000/api/faqs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(faq)
    });
    
    const result = await response.text();
    console.log(`✅ Restored FAQ "${faq.question_fr.substring(0, 50)}..."`);
    console.log(`   Status: ${response.status}, Response: ${result.substring(0, 100)}...`);
    return { success: true, faq: faq.question_fr };
  } catch (error) {
    console.log(`❌ Failed to restore FAQ "${faq.question_fr}":`, error.message);
    return { success: false, faq: faq.question_fr, error: error.message };
  }
});

// Execute all restores
Promise.all(restorePromises).then(results => {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 RESTORATION SUMMARY:`);
  console.log(`✅ Successfully restored: ${successful} FAQs`);
  console.log(`❌ Failed to restore: ${failed} FAQs`);
  
  if (failed > 0) {
    console.log('\n❌ Failed FAQs:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.faq}: ${r.error}`);
    });
  }
}).catch(error => {
  console.error('🚨 CRITICAL ERROR during restoration:', error);
});