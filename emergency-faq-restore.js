#!/usr/bin/env node

// Emergency script to restore deleted FAQ
const https = require('https');

const faqData = {
  section_id: "pricing",
  question_en: "I received my film but want modifications. How does it work?",
  question_fr: "J'ai reçu mon film mais souhaite des modifications. Comment ça marche ?",
  answer_en: "If you want modifications to your delivered film, please contact us within 7 days. Minor adjustments are included, major changes may incur additional fees.",
  answer_fr: "Si vous souhaitez des modifications sur votre film livré, contactez-nous dans les 7 jours. Les ajustements mineurs sont inclus, les changements majeurs peuvent entraîner des frais supplémentaires.",
  order_index: 2,
  is_active: true
};

const postData = JSON.stringify(faqData);

const options = {
  hostname: 'new.memopyk.com',
  port: 443,
  path: '/api/faqs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

console.log('🚨 EMERGENCY: Restoring deleted FAQ...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 201) {
      console.log('✅ FAQ restored successfully!');
    } else {
      console.log('❌ Failed to restore FAQ');
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(postData);
req.end();