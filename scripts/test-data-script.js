#!/usr/bin/env node

/**
 * Simple test for update-data.js helper functions
 * Run: node scripts/test-data-script.js
 */

const { generateCSV, validateData } = require('./update-data.js');

// Helper function to deduplicate (copied from update-data.js for testing)
function deduplicateByDate(prices) {
  const seen = new Set();
  const deduplicated = [];
  for (const price of prices) {
    if (!seen.has(price.date)) {
      seen.add(price.date);
      deduplicated.push(price);
    }
  }
  return deduplicated;
}

console.log('🧪 Testing update-data.js helper functions...\n');

// Test 1: CSV Generation
console.log('Test 1: CSV Generation');
const testData = [
  { date: '2020-01-01', close: 45.67 },
  { date: '2020-02-01', close: 46.01 },
  { date: '2020-03-01', close: 44.89 }
];

const csv = generateCSV(testData, ['date', 'close']);
const expectedCSV = 'date,close\n2020-01-01,45.67\n2020-02-01,46.01\n2020-03-01,44.89';

if (csv === expectedCSV) {
  console.log('✅ PASS: CSV generated correctly');
  console.log('Output:', csv.replace(/\n/g, '\\n'));
} else {
  console.log('❌ FAIL: CSV generation incorrect');
  console.log('Expected:', expectedCSV);
  console.log('Got:', csv);
}

// Test 2: Data Validation (valid data)
console.log('\nTest 2: Data Validation (valid data)');
try {
  validateData(testData, 'TEST');
  console.log('✅ PASS: Valid data accepted');
} catch (error) {
  console.log('❌ FAIL: Valid data rejected:', error.message);
}

// Test 3: Data Validation (missing dates)
console.log('\nTest 3: Data Validation (missing dates)');
const invalidData1 = [
  { date: '2020-01-01', close: 45.67 },
  { date: null, close: 46.01 }  // Missing date
];
try {
  validateData(invalidData1, 'TEST');
  console.log('❌ FAIL: Invalid data accepted (should have rejected)');
} catch (error) {
  if (error.message.includes('missing dates')) {
    console.log('✅ PASS: Missing dates detected correctly');
  } else {
    console.log('❌ FAIL: Wrong error:', error.message);
  }
}

// Test 4: Data Validation (invalid prices)
console.log('\nTest 4: Data Validation (invalid prices)');
const invalidData2 = [
  { date: '2020-01-01', close: 45.67 },
  { date: '2020-02-01', close: NaN }  // Invalid price
];
try {
  validateData(invalidData2, 'TEST');
  console.log('❌ FAIL: Invalid data accepted (should have rejected)');
} catch (error) {
  if (error.message.includes('missing or invalid prices')) {
    console.log('✅ PASS: Invalid prices detected correctly');
  } else {
    console.log('❌ FAIL: Wrong error:', error.message);
  }
}

// Test 5: Data Validation (empty data)
console.log('\nTest 5: Data Validation (empty data)');
try {
  validateData([], 'TEST');
  console.log('❌ FAIL: Empty data accepted (should have rejected)');
} catch (error) {
  if (error.message.includes('No data received')) {
    console.log('✅ PASS: Empty data rejected correctly');
  } else {
    console.log('❌ FAIL: Wrong error:', error.message);
  }
}

// Test 6: Deduplication
console.log('\nTest 6: Deduplication (remove duplicate dates)');
const duplicateData = [
  { date: '2020-01-01', close: 45.67 },
  { date: '2020-02-01', close: 46.01 },
  { date: '2020-02-01', close: 46.50 },  // Duplicate date
  { date: '2020-03-01', close: 47.00 }
];

const deduped = deduplicateByDate(duplicateData);
if (deduped.length === 3 && deduped[1].close === 46.01) {
  console.log('✅ PASS: Duplicates removed (kept first occurrence)');
  console.log(`   Original: ${duplicateData.length} entries → Deduplicated: ${deduped.length} entries`);
} else {
  console.log('❌ FAIL: Deduplication incorrect');
  console.log('Expected 3 entries, got:', deduped.length);
}

console.log('\n✅ All tests completed!');
