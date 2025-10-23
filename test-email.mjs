import fetch from 'node-fetch';

async function testPartnerIntakeEmail() {
  console.log('🧪 Testing partner intake email notification...\n');
  
  // Get CSRF token
  const csrfRes = await fetch('http://localhost:5000/api/csrf');
  const { token } = await csrfRes.json();
  console.log('✅ CSRF token obtained:', token.substring(0, 8) + '...');
  
  // Test data
  const testData = {
    partner_name: "Test Photo Lab",
    email: "test@example.com",
    email_public: true,
    phone: "+33 6 12 34 56 78",
    website: "www.testphotolab.com",
    address: {
      street: "123 Rue de Test",
      line2: "Bâtiment A",
      city: "Paris",
      postal_code: "75001",
      country: "FR"
    },
    services: ["Photo"],
    photo_formats: ["Prints", "Negatives 35mm"],
    video_formats: [],
    film_formats: [],
    audio_formats: [],
    video_cassettes: [],
    other_photo_formats: "",
    other_film_formats: "",
    other_video_formats: "",
    delivery: ["USB", "Download link"],
    output: [],
    turnaround: "",
    rush: false,
    languages: [],
    consent_listed: true,
    public_description: "Professional photo digitization service for testing email functionality.",
    locale: "en",
    csrfToken: token
  };
  
  console.log('📤 Submitting partner intake form...');
  
  const response = await fetch('http://localhost:5000/api/partners/intake', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData)
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Form submitted successfully!');
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    console.log('\n📧 Check the logs above for email notification status');
    console.log('📧 Email should be sent to: ngoc@memopyk.com');
  } else {
    console.log('❌ Form submission failed:');
    console.log('📊 Response:', JSON.stringify(result, null, 2));
  }
}

testPartnerIntakeEmail().catch(console.error);
