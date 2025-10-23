/**
 * MEMOPYK IP Exclusion Management System - Production Deployment Verification
 * Version: 1.0.185
 * 
 * This script verifies that all IP exclusion endpoints are working correctly
 * in the production environment after deployment.
 */

const PRODUCTION_BASE_URL = 'https://memopyk.com';
const TEST_IP = '192.168.1.100'; // Safe test IP
const TEST_COMMENT = 'Production deployment test';

/**
 * Makes an HTTP request with proper error handling
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      url: url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url: url
    };
  }
}

/**
 * Test the GET /api/analytics/exclude-ip endpoint
 */
async function testGetExcludedIps() {
  console.log('\n🔍 Testing GET /api/analytics/exclude-ip...');
  
  const result = await makeRequest(`${PRODUCTION_BASE_URL}/api/analytics/exclude-ip`);
  
  if (result.success) {
    console.log('✅ GET endpoint working');
    console.log('📋 Current excluded IPs:', result.data.excludedIps?.length || 0);
    return result.data;
  } else {
    console.log('❌ GET endpoint failed:', result.status, result.statusText);
    console.log('📝 Response:', result.data || result.error);
    return null;
  }
}

/**
 * Test the POST /api/analytics/exclude-ip endpoint
 */
async function testAddExcludedIp() {
  console.log('\n🔍 Testing POST /api/analytics/exclude-ip...');
  
  const result = await makeRequest(`${PRODUCTION_BASE_URL}/api/analytics/exclude-ip`, {
    method: 'POST',
    body: JSON.stringify({
      ipAddress: TEST_IP,
      comment: TEST_COMMENT
    })
  });
  
  if (result.success) {
    console.log('✅ POST endpoint working');
    console.log('📋 IP excluded successfully:', TEST_IP);
    return result.data;
  } else {
    console.log('❌ POST endpoint failed:', result.status, result.statusText);
    console.log('📝 Response:', result.data || result.error);
    return null;
  }
}

/**
 * Test the PATCH /api/analytics/exclude-ip/:ip/comment endpoint
 */
async function testUpdateIpComment() {
  console.log('\n🔍 Testing PATCH /api/analytics/exclude-ip/:ip/comment...');
  
  const updatedComment = TEST_COMMENT + ' - Updated';
  const result = await makeRequest(`${PRODUCTION_BASE_URL}/api/analytics/exclude-ip/${encodeURIComponent(TEST_IP)}/comment`, {
    method: 'PATCH',
    body: JSON.stringify({
      comment: updatedComment
    })
  });
  
  if (result.success) {
    console.log('✅ PATCH endpoint working');
    console.log('📋 Comment updated successfully');
    return result.data;
  } else {
    console.log('❌ PATCH endpoint failed:', result.status, result.statusText);
    console.log('📝 Response:', result.data || result.error);
    return null;
  }
}

/**
 * Test the DELETE /api/analytics/exclude-ip/:ip endpoint
 */
async function testDeleteExcludedIp() {
  console.log('\n🔍 Testing DELETE /api/analytics/exclude-ip/:ip...');
  
  const result = await makeRequest(`${PRODUCTION_BASE_URL}/api/analytics/exclude-ip/${encodeURIComponent(TEST_IP)}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    console.log('✅ DELETE endpoint working');
    console.log('📋 IP removed successfully:', TEST_IP);
    return result.data;
  } else {
    console.log('❌ DELETE endpoint failed:', result.status, result.statusText);
    console.log('📝 Response:', result.data || result.error);
    return null;
  }
}

/**
 * Main deployment verification function
 */
async function verifyDeployment() {
  console.log('🚀 MEMOPYK IP Exclusion Management - Production Deployment Verification');
  console.log('📅 Date:', new Date().toISOString());
  console.log('🌐 Production URL:', PRODUCTION_BASE_URL);
  console.log('🧪 Test IP:', TEST_IP);
  
  const results = {
    get: false,
    post: false,
    patch: false,
    delete: false
  };
  
  // Test all endpoints in sequence
  const initialData = await testGetExcludedIps();
  results.get = initialData !== null;
  
  const postData = await testAddExcludedIp();
  results.post = postData !== null;
  
  const patchData = await testUpdateIpComment();
  results.patch = patchData !== null;
  
  const deleteData = await testDeleteExcludedIp();
  results.delete = deleteData !== null;
  
  // Final verification
  console.log('\n📊 DEPLOYMENT VERIFICATION RESULTS:');
  console.log('=====================================');
  console.log('GET /api/analytics/exclude-ip:', results.get ? '✅ WORKING' : '❌ FAILED');
  console.log('POST /api/analytics/exclude-ip:', results.post ? '✅ WORKING' : '❌ FAILED');
  console.log('PATCH /api/analytics/exclude-ip/:ip/comment:', results.patch ? '✅ WORKING' : '❌ FAILED');
  console.log('DELETE /api/analytics/exclude-ip/:ip:', results.delete ? '✅ WORKING' : '❌ FAILED');
  
  const allWorking = Object.values(results).every(result => result === true);
  
  console.log('\n🎯 OVERALL STATUS:', allWorking ? '✅ ALL ENDPOINTS WORKING' : '❌ SOME ENDPOINTS FAILED');
  
  if (allWorking) {
    console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
    console.log('👨‍💼 Admin panel "Exclude from Analytics" button should now work correctly');
    console.log('📈 Analytics IP exclusion management is fully operational');
  } else {
    console.log('\n⚠️ DEPLOYMENT ISSUES DETECTED');
    console.log('🔧 Please check server logs and verify endpoint deployment');
    console.log('📞 Consider rollback if critical functionality is affected');
  }
  
  return allWorking;
}

// Run verification if called directly
if (require.main === module) {
  verifyDeployment().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Verification script error:', error);
    process.exit(1);
  });
}

module.exports = { verifyDeployment };