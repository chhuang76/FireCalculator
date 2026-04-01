/**
 * Unit tests for simulation-engine.js
 * Run: node src/lib/simulation-engine.test.js
 */

import {
  aggregatePortfolio,
  mean,
  standardDeviation,
  correlation,
  calculateCorrelationMatrix,
  buildCovarianceMatrix,
  choleskyDecomposition,
  randomNormal,
  generateCorrelatedReturns,
  runSingleSimulation,
  calculateStatistics
} from './simulation-engine.js';

console.log('🧪 Testing Simulation Engine\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assertEq(actual, expected, tolerance = 0.001) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// TEST: Portfolio Aggregation
// ============================================================================

test('aggregatePortfolio: combines duplicate tickers', () => {
  const portfolio = [
    { ticker: 'VT', value: 100000, mu: 0.08, sigma: 0.15 },
    { ticker: 'BND', value: 50000, mu: 0.03, sigma: 0.05 },
    { ticker: 'VT', value: 25000, mu: 0.08, sigma: 0.15 }
  ];

  const aggregated = aggregatePortfolio(portfolio);

  assert(aggregated.length === 2, 'Should have 2 unique tickers');

  const vt = aggregated.find(a => a.ticker === 'VT');
  const bnd = aggregated.find(a => a.ticker === 'BND');

  assertEq(vt.value, 125000); // 100k + 25k
  assertEq(bnd.value, 50000);
  assertEq(vt.mu, 0.08);
  assertEq(vt.sigma, 0.15);
});

test('aggregatePortfolio: handles no duplicates', () => {
  const portfolio = [
    { ticker: 'VT', value: 100000, mu: 0.08, sigma: 0.15 },
    { ticker: 'BND', value: 50000, mu: 0.03, sigma: 0.05 }
  ];

  const aggregated = aggregatePortfolio(portfolio);
  assert(aggregated.length === 2, 'Should have 2 tickers');
});

// ============================================================================
// TEST: Statistical Functions
// ============================================================================

test('mean: calculates average correctly', () => {
  assertEq(mean([1, 2, 3, 4, 5]), 3);
  assertEq(mean([10, 20, 30]), 20);
  assertEq(mean([5]), 5);
  assertEq(mean([]), 0);
});

test('standardDeviation: calculates std dev correctly', () => {
  // Known: std dev of [2, 4, 4, 4, 5, 5, 7, 9] is 2.0
  assertEq(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]), 2.0);

  // Constant values should have zero std dev
  assertEq(standardDeviation([5, 5, 5, 5]), 0);
});

test('correlation: calculates correlation correctly', () => {
  // Perfect positive correlation
  const x1 = [1, 2, 3, 4, 5];
  const y1 = [2, 4, 6, 8, 10];
  assertEq(correlation(x1, y1), 1.0);

  // Perfect negative correlation
  const x2 = [1, 2, 3, 4, 5];
  const y2 = [10, 8, 6, 4, 2];
  assertEq(correlation(x2, y2), -1.0);

  // No correlation
  const x3 = [1, 2, 3];
  const y3 = [2, 2, 2];
  assertEq(correlation(x3, y3), 0);
});

test('calculateCorrelationMatrix: builds correlation matrix', () => {
  const returns = {
    VT: [0.01, 0.02, -0.01, 0.03],
    QQQ: [0.015, 0.025, -0.005, 0.035], // Highly correlated with VT
    BND: [0.001, 0.002, 0.001, 0.002]   // Low correlation with stocks
  };

  const { matrix, tickers } = calculateCorrelationMatrix(returns);

  assert(matrix.length === 3, 'Should be 3x3 matrix');
  assert(tickers.length === 3, 'Should have 3 tickers');

  // Diagonal should be 1.0 (perfect self-correlation)
  assertEq(matrix[0][0], 1.0);
  assertEq(matrix[1][1], 1.0);
  assertEq(matrix[2][2], 1.0);

  // Matrix should be symmetric
  assertEq(matrix[0][1], matrix[1][0]);
  assertEq(matrix[0][2], matrix[2][0]);
  assertEq(matrix[1][2], matrix[2][1]);

  // VT-QQQ correlation should be high (both are stocks)
  assert(Math.abs(matrix[0][1]) > 0.9, 'VT-QQQ should be highly correlated');
});

test('buildCovarianceMatrix: converts correlation to covariance', () => {
  const correlationMatrix = [
    [1.0, 0.8],
    [0.8, 1.0]
  ];
  const sigmas = [0.15, 0.20];

  const covariance = buildCovarianceMatrix(correlationMatrix, sigmas);

  // σ_11 = ρ_11 × σ_1 × σ_1 = 1.0 × 0.15 × 0.15 = 0.0225
  assertEq(covariance[0][0], 0.0225);

  // σ_22 = ρ_22 × σ_2 × σ_2 = 1.0 × 0.20 × 0.20 = 0.04
  assertEq(covariance[1][1], 0.04);

  // σ_12 = ρ_12 × σ_1 × σ_2 = 0.8 × 0.15 × 0.20 = 0.024
  assertEq(covariance[0][1], 0.024);

  // Should be symmetric
  assertEq(covariance[0][1], covariance[1][0]);
});

// ============================================================================
// TEST: Cholesky Decomposition
// ============================================================================

test('choleskyDecomposition: simple 2x2 matrix', () => {
  const matrix = [
    [4, 2],
    [2, 3]
  ];

  const L = choleskyDecomposition(matrix);

  // Verify L is lower triangular
  assertEq(L[0][1], 0);

  // Verify A = L * L^T
  // L = [[2, 0], [1, sqrt(2)]]
  assertEq(L[0][0], 2);
  assertEq(L[1][0], 1);
  assertEq(L[1][1], Math.sqrt(2), 0.001);

  // Reconstruct matrix
  const reconstructed = [
    [L[0][0] * L[0][0] + L[0][1] * L[0][1], L[1][0] * L[0][0] + L[1][1] * L[0][1]],
    [L[0][0] * L[1][0] + L[0][1] * L[1][1], L[1][0] * L[1][0] + L[1][1] * L[1][1]]
  ];

  assertEq(reconstructed[0][0], matrix[0][0]);
  assertEq(reconstructed[0][1], matrix[0][1]);
  assertEq(reconstructed[1][0], matrix[1][0]);
  assertEq(reconstructed[1][1], matrix[1][1]);
});

test('choleskyDecomposition: identity matrix', () => {
  const identity = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  const L = choleskyDecomposition(identity);

  // Cholesky of identity should be identity
  assertEq(L[0][0], 1);
  assertEq(L[1][1], 1);
  assertEq(L[2][2], 1);
  assertEq(L[0][1], 0);
  assertEq(L[0][2], 0);
  assertEq(L[1][2], 0);
});

// ============================================================================
// TEST: Random Number Generation
// ============================================================================

test('randomNormal: generates reasonable values', () => {
  // Generate many samples and check distribution
  const samples = [];
  for (let i = 0; i < 10000; i++) {
    samples.push(randomNormal());
  }

  const avg = mean(samples);
  const std = standardDeviation(samples);

  // Should be close to N(0,1)
  assertEq(avg, 0, 0.05); // Mean ≈ 0
  assertEq(std, 1, 0.05); // Std dev ≈ 1
});

test('generateCorrelatedReturns: generates correct dimension', () => {
  const means = [0.08, 0.12, 0.05];
  const L = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  const returns = generateCorrelatedReturns(means, L);

  assert(returns.length === 3, 'Should return 3 values');
  assert(typeof returns[0] === 'number', 'Should be numbers');
});

test('generateCorrelatedReturns: mean centers around expected returns', () => {
  const means = [0.08, 0.05];
  const L = [[1, 0], [0, 1]]; // No correlation

  // Generate many samples
  const samples = [];
  for (let i = 0; i < 10000; i++) {
    samples.push(generateCorrelatedReturns(means, L));
  }

  // Average across all samples for each asset
  const avgReturn0 = mean(samples.map(s => s[0]));
  const avgReturn1 = mean(samples.map(s => s[1]));

  // With more samples and random variation, use wider tolerance
  assertEq(avgReturn0, means[0], 0.02); // Should average near 0.08 (±2%)
  assertEq(avgReturn1, means[1], 0.02); // Should average near 0.05 (±2%)
});

// ============================================================================
// TEST: Single Simulation
// ============================================================================

test('runSingleSimulation: successful run', () => {
  const params = {
    portfolio: [
      { ticker: 'VT', value: 1000000, mu: 0.08, sigma: 0.15 }
    ],
    flatSpending: [40000, 40000, 40000], // 3 years, $40k/year
    inflationRate: 0.03,
    totalYears: 3,
    choleskyMatrix: [[1]], // Single asset
    tickers: ['VT']
  };

  const result = runSingleSimulation(params);

  assert('success' in result, 'Should have success field');
  assert('balancesByYear' in result, 'Should have balancesByYear');
  assert(result.balancesByYear.length === 4, 'Should have 4 balance entries (0-3 years)'); // Year 0 + 3 years
  assert(result.balancesByYear[0] === 1000000, 'Initial balance should be $1M');
});

test('runSingleSimulation: detects failure', () => {
  const params = {
    portfolio: [
      { ticker: 'VT', value: 10000, mu: 0.05, sigma: 0.01 }
    ],
    flatSpending: [50000, 50000, 50000], // Spending more than portfolio
    inflationRate: 0.03,
    totalYears: 3,
    choleskyMatrix: [[1]],
    tickers: ['VT']
  };

  const result = runSingleSimulation(params);

  assert(result.success === false, 'Should fail');
  assert('failureYear' in result, 'Should have failureYear');
  assert(result.failureYear <= 3, 'Should fail within 3 years');
});

// ============================================================================
// TEST: Statistics Calculation
// ============================================================================

test('calculateStatistics: calculates success rate', () => {
  const results = [
    { success: true, endingBalance: 100000, balancesByYear: [100000, 105000, 110000] },
    { success: true, endingBalance: 120000, balancesByYear: [100000, 110000, 120000] },
    { success: false, failureYear: 2, balancesByYear: [100000, 95000, -5000] }
  ];

  const stats = calculateStatistics(results, 2);

  assertEq(stats.successRate, 66.67, 0.1); // 2/3 = 66.67%
  assert(stats.totalRuns === 3, 'Should have 3 total runs');
  assert(stats.successfulRuns === 2, 'Should have 2 successful runs');
  assert(stats.failedRuns === 1, 'Should have 1 failed run');
  assertEq(stats.averageFailureYear, 2);
});

test('calculateStatistics: calculates percentiles', () => {
  const results = [
    { success: true, endingBalance: 50000, balancesByYear: [100000, 75000, 50000] },
    { success: true, endingBalance: 100000, balancesByYear: [100000, 100000, 100000] },
    { success: true, endingBalance: 150000, balancesByYear: [100000, 125000, 150000] }
  ];

  const stats = calculateStatistics(results, 2);

  assert(stats.percentilesByYear.length === 3, 'Should have percentiles for 3 years');
  assertEq(stats.percentilesByYear[0].p50, 100000); // Median at year 0
  assertEq(stats.medianEndingBalance, 100000); // Median ending balance
  assertEq(stats.worstCaseEndingBalance, 50000); // Worst successful case
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Test Summary');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n✅ Passed: ${passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${totalTests - passedTests} test(s) failed\n`);
  process.exit(1);
}
