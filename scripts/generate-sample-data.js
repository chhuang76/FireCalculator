#!/usr/bin/env node

/**
 * Generate sample CSV data for development/testing
 * This is useful when you can't access external APIs (e.g., behind corporate firewall)
 *
 * IMPORTANT: The data is SYNTHETIC (not real market data)
 * - Generated using geometric Brownian motion with random noise
 * - A single random path may have returns ±2-3% different from targets
 * - This is normal statistical variation, not a bug
 * - For accurate retirement planning, use REAL data from APIs
 *
 * The synthetic data is suitable for:
 * ✓ Development and testing
 * ✓ Demonstrating the app
 * ✓ Understanding how the simulation works
 *
 * NOT suitable for:
 * ✗ Actual financial planning
 * ✗ Real retirement decisions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Sample data configurations
// NOTE: These are TARGET returns, but a single random path may vary ±2-3%
// due to stochastic noise (this is normal). For accurate returns, use real data.
const ASSETS = [
  {
    ticker: 'VT',
    filename: 'VT.csv',
    startDate: '2008-06-01',
    startPrice: 45.0,
    annualReturn: 0.09,   // 9% target (accounts for typical path variation)
    annualVolatility: 0.15, // 15% annual volatility
    months: 200
  },
  {
    ticker: 'QQQ',
    filename: 'QQQ.csv',
    startDate: '1999-03-01',
    startPrice: 50.0,
    annualReturn: 0.14,   // 14% target (accounts for typical path variation)
    annualVolatility: 0.20, // 20% volatility (more volatile)
    months: 310
  },
  {
    ticker: 'AVUV',
    filename: 'AVUV.csv',
    startDate: '2019-09-01',
    startPrice: 60.0,
    annualReturn: 0.12,   // 12% target
    annualVolatility: 0.22,
    months: 76
  },
  {
    ticker: 'BND',
    filename: 'BND.csv',
    startDate: '2007-04-01',
    startPrice: 80.0,
    annualReturn: 0.04,   // 4% target (bonds are lower return)
    annualVolatility: 0.05, // 5% volatility
    months: 220
  },
  {
    ticker: 'GLD',
    filename: 'GLD.csv',
    startDate: '2004-11-01',
    startPrice: 44.0,
    annualReturn: 0.06,
    annualVolatility: 0.16,
    months: 260
  },
  {
    ticker: 'BTC-USD',
    filename: 'BTC-USD.csv',
    startDate: '2014-09-01',
    startPrice: 500.0,
    annualReturn: 0.50,   // 50% average (crypto is high return)
    annualVolatility: 0.80, // 80% volatility (crypto is very volatile)
    months: 138
  }
];

/**
 * Generate synthetic price data using geometric Brownian motion
 *
 * Uses log-normal distribution: S(t+1) = S(t) * exp(μ*dt + σ*√dt*Z)
 * Where the annualReturn is the expected geometric (log) return
 */
function generatePriceData(config) {
  const { startDate, startPrice, annualReturn, annualVolatility, months } = config;

  // Convert annual parameters to monthly (log scale)
  // For log returns: monthly_μ = annual_μ / 12
  // For log volatility: monthly_σ = annual_σ / √12
  const monthlyLogReturn = Math.log(1 + annualReturn) / 12;
  const monthlyLogVolatility = annualVolatility / Math.sqrt(12);

  const prices = [];
  let currentPrice = startPrice;
  const start = new Date(startDate);

  for (let i = 0; i < months; i++) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + i);

    // Generate random return using normal distribution (Box-Muller transform)
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Geometric Brownian Motion: dS/S = μ*dt + σ*dW
    // For discrete time: S(t+1) = S(t) * exp(μ*dt + σ*sqrt(dt)*Z)
    // Where Z ~ N(0,1)
    const logReturn = monthlyLogReturn + monthlyLogVolatility * z;

    // Update price using exponential (log-normal distribution)
    currentPrice = currentPrice * Math.exp(logReturn);

    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];

    prices.push({
      date: dateStr,
      close: currentPrice.toFixed(2)
    });
  }

  return prices;
}

/**
 * Convert price data to CSV
 */
function toCSV(prices) {
  const header = 'date,close';
  const rows = prices.map(p => `${p.date},${p.close}`);
  return [header, ...rows].join('\n');
}

/**
 * Main function
 */
function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Generating Sample CSV Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Note: This generates SYNTHETIC data for development/testing');
  console.log('   For production, use real data from update-data.js\n');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created directory: ${OUTPUT_DIR}\n`);
  }

  let totalSize = 0;

  // Generate data for each asset
  ASSETS.forEach(config => {
    console.log(`📈 ${config.ticker}: Generating ${config.months} months of data...`);

    const prices = generatePriceData(config);
    const csv = toCSV(prices);
    const filePath = path.join(OUTPUT_DIR, config.filename);

    fs.writeFileSync(filePath, csv, 'utf8');

    const sizeKB = (csv.length / 1024).toFixed(1);
    totalSize += csv.length;

    console.log(`   ✓ Saved: ${config.filename} (${sizeKB} KB)`);
    console.log(`   ✓ Date range: ${prices[0].date} to ${prices[prices.length - 1].date}`);
    console.log(`   ✓ Price range: $${Math.min(...prices.map(p => parseFloat(p.close))).toFixed(2)} - $${Math.max(...prices.map(p => parseFloat(p.close))).toFixed(2)}\n`);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n✓ Generated ${ASSETS.length} CSV files`);
  console.log(`✓ Total data points: ${ASSETS.reduce((sum, a) => sum + a.months, 0).toLocaleString()}`);
  console.log(`✓ Total size: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`\n✅ Sample data ready for development!`);
  console.log(`\n💡 To use real data later, run: node scripts/update-data.js\n`);
}

main();
