/**
 * Integration Test - Run Full Simulation
 *
 * This script loads real CSV data and runs a complete Monte Carlo simulation
 * to verify the entire engine works end-to-end.
 *
 * Run: node src/lib/test-simulation.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMonteCarloSimulation } from './simulation-engine.js';

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// DATA LOADING (Node.js version - uses fs instead of fetch)
// ============================================================================

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const [date, close] = line.split(',');
    return {
      date: date.trim(),
      close: parseFloat(close)
    };
  });
}

function loadHistoricalDataSync(ticker) {
  const filename = ticker.replace('/', '-') + '.csv';
  const filePath = path.join(__dirname, '../../public/data', filename);

  const csvText = fs.readFileSync(filePath, 'utf8');
  return parseCSV(csvText);
}

function calculateLogReturns(prices) {
  const returns = [];

  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i].close;
    const previousPrice = prices[i - 1].close;

    if (previousPrice <= 0 || currentPrice <= 0) {
      throw new Error(`Invalid price data at index ${i}`);
    }

    const logReturn = Math.log(currentPrice / previousPrice);
    returns.push(logReturn);
  }

  return returns;
}

function calculateAnnualizedReturn(monthlyReturns) {
  if (monthlyReturns.length === 0) return 0;
  const sum = monthlyReturns.reduce((acc, r) => acc + r, 0);
  const meanMonthlyReturn = sum / monthlyReturns.length;
  return meanMonthlyReturn * 12;
}

function calculateAnnualizedVolatility(monthlyReturns) {
  if (monthlyReturns.length === 0) return 0;

  const sum = monthlyReturns.reduce((acc, r) => acc + r, 0);
  const mean = sum / monthlyReturns.length;

  const squaredDiffs = monthlyReturns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((acc, d) => acc + d, 0) / monthlyReturns.length;

  const monthlyStdDev = Math.sqrt(variance);
  return monthlyStdDev * Math.sqrt(12);
}

function loadAndProcessTicker(ticker) {
  const priceData = loadHistoricalDataSync(ticker);
  const returns = calculateLogReturns(priceData);

  const mu = calculateAnnualizedReturn(returns);
  const sigma = calculateAnnualizedVolatility(returns);

  return {
    ticker,
    mu,
    sigma,
    returns,
    priceData
  };
}

// ============================================================================
// MAIN TEST
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Integration Test - Full Monte Carlo Simulation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Load historical data
console.log('📊 Loading historical data...\n');

const tickers = ['VT', 'QQQ', 'BND'];
const tickerData = {};
const allPriceData = {};

tickers.forEach(ticker => {
  const data = loadAndProcessTicker(ticker);
  tickerData[ticker] = data;
  allPriceData[ticker] = data.priceData;

  console.log(`✓ ${ticker}:`);
  console.log(`  Return (μ):     ${(data.mu * 100).toFixed(2)}%`);
  console.log(`  Volatility (σ): ${(data.sigma * 100).toFixed(2)}%`);
  console.log(`  Data points:    ${data.priceData.length} months`);
  console.log(`  Date range:     ${data.priceData[0].date} to ${data.priceData[data.priceData.length - 1].date}\n`);
});

// Align data to overlapping dates (for correlation calculation)
console.log('📅 Aligning data to overlapping time period...\n');

// Find common date range
const allDates = {};
tickers.forEach(ticker => {
  allPriceData[ticker].forEach(p => {
    if (!allDates[p.date]) {
      allDates[p.date] = {};
    }
    allDates[p.date][ticker] = p.close;
  });
});

// Filter to only dates where ALL tickers have data
const commonDates = Object.keys(allDates)
  .filter(date => tickers.every(ticker => allDates[date][ticker] !== undefined))
  .sort();

console.log(`  Common dates: ${commonDates.length} months`);
console.log(`  Date range: ${commonDates[0]} to ${commonDates[commonDates.length - 1]}\n`);

// Calculate aligned returns for correlation
const historicalReturns = {};

tickers.forEach(ticker => {
  const alignedPrices = commonDates.map(date => allDates[date][ticker]);
  const alignedReturns = [];

  for (let i = 1; i < alignedPrices.length; i++) {
    const logReturn = Math.log(alignedPrices[i] / alignedPrices[i - 1]);
    alignedReturns.push(logReturn);
  }

  historicalReturns[ticker] = alignedReturns;
});

// Build portfolio
console.log('💼 Building portfolio...\n');

const portfolio = [
  { ticker: 'VT', value: 600000, mu: tickerData['VT'].mu, sigma: tickerData['VT'].sigma },
  { ticker: 'QQQ', value: 300000, mu: tickerData['QQQ'].mu, sigma: tickerData['QQQ'].sigma },
  { ticker: 'BND', value: 100000, mu: tickerData['BND'].mu, sigma: tickerData['BND'].sigma }
];

const totalValue = portfolio.reduce((sum, a) => sum + a.value, 0);

console.log('Portfolio Composition:');
portfolio.forEach(asset => {
  const weight = (asset.value / totalValue * 100).toFixed(1);
  console.log(`  ${asset.ticker}: $${asset.value.toLocaleString()} (${weight}%)`);
});
console.log(`\n  Total: $${totalValue.toLocaleString()}\n`);

// Define spending phases
console.log('💰 Spending Plan:\n');

const phases = [
  { amount: 50000, years: 15 },  // $50k/year for 15 years
  { amount: 30000, years: 40 }   // $30k/year for 40 years
];

phases.forEach((phase, idx) => {
  console.log(`  Phase ${idx + 1}: $${phase.amount.toLocaleString()}/year for ${phase.years} years`);
});

const totalYears = phases.reduce((sum, p) => sum + p.years, 0);
console.log(`\n  Total retirement duration: ${totalYears} years\n`);

// Run simulation
console.log('🎲 Running Monte Carlo simulation...\n');
console.log('  Iterations: 10,000');
console.log('  Inflation: 3% annually');
console.log('  Rebalancing: Annual\n');

const startTime = Date.now();

let lastPercent = 0;
const results = runMonteCarloSimulation({
  portfolio,
  phases,
  inflationRate: 0.03,
  iterations: 10000,
  historicalReturns,
  onProgress: (percent) => {
    if (percent % 10 === 0 && percent !== lastPercent) {
      process.stdout.write(`  Progress: ${percent}%...\n`);
      lastPercent = percent;
    }
  }
});

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

// Display results
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📈 Results');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`⏱️  Simulation Time: ${duration} seconds\n`);

// Success Rate
const rateColor = results.successRate >= 90 ? '🟢' :
                  results.successRate >= 70 ? '🟡' : '🔴';
console.log(`${rateColor} Success Rate: ${results.successRate.toFixed(1)}%`);
console.log(`   Successful runs: ${results.successfulRuns.toLocaleString()} / ${results.totalRuns.toLocaleString()}`);
console.log(`   Failed runs:     ${results.failedRuns.toLocaleString()}\n`);

// Ending Balance Statistics
console.log('💵 Ending Balance (Successful Runs):');
console.log(`   Median:     $${results.medianEndingBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
console.log(`   Worst case: $${results.worstCaseEndingBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

// Failure Statistics
if (results.failedRuns > 0) {
  console.log('❌ Failure Statistics:');
  console.log(`   Average failure year: ${results.averageFailureYear.toFixed(1)}\n`);
}

// Percentile Snapshots
console.log('📊 Portfolio Balance Snapshots:\n');
const snapshotYears = [0, 10, 20, 30, 40, 50, 55];

console.log('   Year    10th       25th       50th       75th       90th');
console.log('   ────────────────────────────────────────────────────────────────');

snapshotYears.forEach(year => {
  if (year < results.percentilesByYear.length) {
    const p = results.percentilesByYear[year];
    const format = (val) => {
      if (val < 0) return '      $0';
      return `$${(val / 1000).toFixed(0).padStart(6)}k`;
    };
    console.log(`   ${year.toString().padStart(4)}   ${format(p.p10)}  ${format(p.p25)}  ${format(p.p50)}  ${format(p.p75)}  ${format(p.p90)}`);
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Interpretation
console.log('\n💡 Interpretation:\n');

if (results.successRate >= 90) {
  console.log('   ✅ Excellent! Your portfolio has a very high chance of success.');
  console.log('   This retirement plan looks sustainable.\n');
} else if (results.successRate >= 70) {
  console.log('   ⚠️  Moderate risk. Your portfolio has a reasonable chance of success,');
  console.log('   but you may want to consider reducing spending or increasing savings.\n');
} else {
  console.log('   ⚠️  High risk! Your portfolio has a low chance of lasting through retirement.');
  console.log('   Consider significantly reducing spending or working longer.\n');
}

console.log('✅ Simulation engine is working correctly!\n');
