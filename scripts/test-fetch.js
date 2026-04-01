#!/usr/bin/env node

/**
 * Test if fetch works on this system
 */

console.log('Testing fetch functionality...\n');

// Test 1: Simple HTTP request
console.log('Test 1: HTTP request to example.com');
fetch('http://example.com')
  .then(res => {
    console.log(`✅ HTTP works: Status ${res.status}`);
    return test2();
  })
  .catch(err => {
    console.log(`❌ HTTP failed: ${err.message}`);
    return test2();
  });

// Test 2: HTTPS request
function test2() {
  console.log('\nTest 2: HTTPS request to api.twelvedata.com');
  return fetch('https://api.twelvedata.com')
    .then(res => {
      console.log(`✅ HTTPS works: Status ${res.status}`);
      console.log('\n✅ Fetch is working! The issue might be with the API key or specific endpoint.');
    })
    .catch(err => {
      console.log(`❌ HTTPS failed: ${err.message}`);
      console.log(`\nError details: ${err.stack}`);
      console.log('\n❌ Fetch is not working on this system.');
      console.log('This might be a proxy, firewall, or SSL certificate issue.');
      console.log('\nPossible solutions:');
      console.log('1. Check if you\'re behind a corporate proxy');
      console.log('2. Try running with NODE_TLS_REJECT_UNAUTHORIZED=0 (not recommended for production)');
      console.log('3. We may need to use the built-in https module instead of fetch');
    });
}
