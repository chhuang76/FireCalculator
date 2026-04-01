#!/usr/bin/env node

/**
 * Generate Multiple Sample Datasets and Pick the Best One
 *
 * This script generates several random datasets and picks the one
 * with returns closest to the targets. This gives more reliable
 * synthetic data for testing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Target configurations
const ASSETS = [
  {
    ticker: 'VT',
    filename: 'VT.csv',
    startDate: '2008-06-01',
    startPrice: 45.0,
    targetReturn: 0.09,  // 9% target
    annualVolatility: 0.15,
    months: 200
  },
  {
    ticker: 'QQQ',
    filename: 'QQQ.csv',
    startDate: '1999-03-01',
    startPrice: 50.0,
    targetReturn: 0.14,  // 14% target
    annualVolatility: 0.20,
    months: 310
  },
  {
    ticker: 'AVUV',
    filename: 'AVUV.csv',
    startDate: '2019-09-01',
    startPrice: 60.0,
    targetReturn: 0.12,
    annualVolatility: 0.22,
    months: 76
  },
  {
    ticker: 'BND',
    filename: 'BND.csv',
    startDate: '2007-04-01',
    startPrice: 80.0,
    targetReturn: 0.04,  // 4% target
    annualVolatility: 0.05,
    months: 220
  },
  {
    ticker: 'GLD',
    filename: 'GLD.csv',
    startDate: '2004-11-01',
    startPrice: 44.0,
    targetReturn: 0.07,
    annualVolatility: 0.16,
    months: 260
  },
  {
    ticker: 'BTC-USD',
    filename: 'BTC-USD.csv',
    startDate: '2014-09-01',
    startPrice: 500.0,
    targetReturn: 0.50,
    annualVolatility: 0.80,
    months: 138
  }
];

function randomNormal() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function generatePriceData(config) {
  const { startDate, startPrice, targetReturn, annualVolatility, months } = config;

  const monthlyLogReturn = Math.log(1 + targetReturn) / 12;
  const monthlyLogVolatility = annualVolatility / Math.sqrt(12);

  const prices = [];
  let currentPrice = startPrice;
  const start = new Date(startDate);

  for (let i = 0; i < months; i++) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + i);

    const z = randomNormal();
    const logReturn = monthlyLogReturn + monthlyLogVolatility * z;
    currentPrice = currentPrice * Math.exp(logReturn);

    const dateStr = date.toISOString().split('T')[0];
    prices.push({
      date: dateStr,
      close: currentPrice.toFixed(2)
    });
  }

  return prices;
}

function calculateAnnualizedReturn(prices) {
  if (prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const current = parseFloat(prices[i].close);
    const previous = parseFloat(prices[i - 1].close);
    returns.push(Math.log(current / previous));
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  return meanReturn * 12;
}

function toCSV(prices) {
  const header = 'date,close';
  const rows = prices.map(p => `${p.date},${p.close}`);
  return [header, ...rows].join('\n');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Generating Best-Fit Sample Data (Multi-Attempt)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  Generating SYNTHETIC data for development/testing');
  console.log('   For real planning, use real data from APIs\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalSize = 0;

  for (const asset of ASSETS) {
    console.log(`📈 ${asset.ticker}: Generating best-fit data...`);

    const numAttempts = 20;  // Generate 20 random paths
    let bestData = null;
    let bestError = Infinity;
    let bestReturn = 0;

    for (let attempt = 0; attempt < numAttempts; attempt++) {
      const candidateData = generatePriceData(asset);
      const realizedReturn = calculateAnnualizedReturn(candidateData);
      const error = Math.abs(realizedReturn - asset.targetReturn);

      if (error < bestError) {
        bestError = error;
        bestData = candidateData;
        bestReturn = realizedReturn;
      }
    }

    // Save best data
    const csv = toCSV(bestData);
    const filepath = path.join(OUTPUT_DIR, asset.filename);
    fs.writeFileSync(filepath, csv, 'utf8');

    const stats = fs.statSync(filepath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    totalSize += stats.size;

    console.log(`   ✓ Saved: ${asset.filename} (${sizeKB} KB)`);
    console.log(`   ✓ Target return: ${(asset.targetReturn * 100).toFixed(2)}%`);
    console.log(`   ✓ Realized return: ${(bestReturn * 100).toFixed(2)}%`);
    console.log(`   ✓ Error: ${(bestError * 100).toFixed(2)}%\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✓ Generated ${ASSETS.length} CSV files with optimized returns`);
  console.log(`✓ Total data points: ${ASSETS.reduce((sum, a) => sum + a.months, 0)}`);
  console.log(`✓ Total size: ${(totalSize / 1024).toFixed(1)} KB\n`);
  console.log('✅ Best-fit sample data ready for development!\n');
  console.log('💡 These returns should be much closer to targets');
  console.log('   VT: ~9%, QQQ: ~14%, BND: ~4%\n');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
