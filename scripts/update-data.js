#!/usr/bin/env node

/**
 * Historical Data Fetcher for Fire Calculator
 *
 * Fetches maximum available historical monthly price data for configured assets
 * and saves them as CSV files in public/data/
 *
 * Usage:
 *   node scripts/update-data.js [--source=twelvedata|alphavantage] [--ticker=VT]
 *
 * Environment Variables:
 *   TWELVE_DATA_API_KEY - API key for Twelve Data (if using twelvedata source)
 *   ALPHA_VANTAGE_API_KEY - API key for Alpha Vantage (if using alphavantage source)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// ES module equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// LOAD ENVIRONMENT VARIABLES FROM .env FILE
// ============================================================================

/**
 * Load environment variables from .env file if it exists
 * This allows the script to work without external dependencies like dotenv
 */
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    return; // No .env file, will use system environment variables
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      // Skip empty lines and comments
      line = line.trim();
      if (!line || line.startsWith('#')) {
        return;
      }

      // Parse KEY=value format
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Only set if not already set in environment
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });

    console.log('✓ Loaded environment variables from .env file');
  } catch (error) {
    console.warn(`Warning: Failed to load .env file: ${error.message}`);
  }
}

// Load .env before anything else
loadEnvFile();

// ============================================================================
// HTTP HELPER (using https module for better Windows compatibility)
// ============================================================================

/**
 * Make HTTPS GET request and return JSON
 * Uses built-in https module instead of fetch for better compatibility
 * @param {string} url - URL to fetch
 * @returns {Promise<object>} Parsed JSON response
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      // Check status code
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        res.resume(); // Consume response data to free up memory
        return;
      }

      // Collect data chunks
      res.on('data', (chunk) => {
        data += chunk;
      });

      // Parse JSON when complete
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });

    }).on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });
  });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Output directory for CSV files
  outputDir: path.join(__dirname, '../public/data'),

  // Data source (twelvedata or alphavantage)
  defaultSource: 'twelvedata',

  // Assets to fetch (ticker symbol and optional config)
  assets: [
    { ticker: 'VT', name: 'Vanguard Total World Stock' },
    { ticker: 'QQQ', name: 'Nasdaq 100 ETF' },
    { ticker: 'AVUV', name: 'Avantis US Small Cap Value' },
    { ticker: 'BND', name: 'Vanguard Total Bond Market' },
    { ticker: 'GLD', name: 'SPDR Gold Shares' },
    { ticker: 'BTC/USD', name: 'Bitcoin', isCrypto: true },
	{ ticker: 'SHV', name: 'iShares 0-1 Year Treasury Bond ETF' },
	{ ticker: 'VNQ', name: 'Vanguard Real Estate Index Fund ETF' },
	{ ticker: 'VGT', name: 'Vanguard Information Technology Index Fund ETF' },
  ],

  // CSV field configuration (easy to extend in future)
  csvFields: {
    phase1: ['date', 'close'],  // Current: minimal format
    // Future phases can add more fields:
    // phase2: ['date', 'open', 'high', 'low', 'close', 'volume']
    // phase3: ['date', 'close', 'adjusted_close']
  },

  // Active CSV format
  activeFormat: 'phase1',

  // Request delays to respect rate limits (milliseconds)
  requestDelay: 1000,  // 1 second between requests
};

// ============================================================================
// DATA SOURCE ADAPTERS
// ============================================================================

/**
 * Twelve Data API adapter
 */
class TwelveDataSource {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('TWELVE_DATA_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.twelvedata.com';
  }

  /**
   * Fetch historical data for a ticker
   * @param {string} ticker - Stock ticker symbol
   * @param {boolean} isCrypto - Whether this is a crypto asset
   * @returns {Promise<Array>} Array of {date, close} objects
   */
  async fetchData(ticker, isCrypto = false) {
    const endpoint = `${this.baseUrl}/time_series`;

    // Request maximum data available with adjusted prices (includes dividends)
    const params = new URLSearchParams({
      symbol: ticker,
      interval: '1month',
      outputsize: '5000',  // Request maximum available
      apikey: this.apiKey,
      format: 'JSON',
      adjust: 'all'        // Adjust for splits and dividends (per Twelve Data docs)
    });

    const url = `${endpoint}?${params}`;

    console.log(`  Fetching from Twelve Data: ${url.replace(this.apiKey, 'API_KEY')}`);

    const data = await httpsGet(url);

    // Check for errors
    if (data.status === 'error') {
      throw new Error(`Twelve Data API error: ${data.message}`);
    }

    if (!data.values || !Array.isArray(data.values)) {
      throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 200)}`);
    }

    // DEBUG: Log available fields in the first data point
    if (data.values.length > 0) {
      console.log(`  📋 Available fields:`, Object.keys(data.values[0]).join(', '));
    }

    // Transform to standard format
    // With adjust=all parameter, Twelve Data returns adjusted prices in the 'close' field
    const prices = data.values.map(item => {
      if (item.close === undefined) {
        throw new Error(`No price field found. Available: ${Object.keys(item).join(', ')}`);
      }

      if (data.values.indexOf(item) === 0) {
        console.log(`  ✓ Using 'close' field (adjusted with adjust=all parameter)`);
        console.log(`     Includes dividends and splits`);
      }

      return {
        date: item.datetime,
        close: parseFloat(item.close)
      };
    });

    // Sort by date ascending (oldest first)
    prices.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Remove duplicate dates (API sometimes returns duplicates)
    const deduplicated = deduplicateByDate(prices);

    if (deduplicated.length < prices.length) {
      console.log(`  ℹ️  Removed ${prices.length - deduplicated.length} duplicate date(s)`);
    }

    return deduplicated;
  }
}

/**
 * Alpha Vantage API adapter
 */
class AlphaVantageSource {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.alphavantage.co/query';
  }

  async fetchData(ticker, isCrypto = false) {
    const functionName = isCrypto
      ? 'DIGITAL_CURRENCY_MONTHLY'
      : 'TIME_SERIES_MONTHLY_ADJUSTED';

    const params = new URLSearchParams({
      function: functionName,
      symbol: ticker.replace('/USD', ''),  // BTC/USD -> BTC for Alpha Vantage
      apikey: this.apiKey,
      datatype: 'json'
    });

    if (isCrypto) {
      params.append('market', 'USD');
    }

    const url = `${this.baseUrl}?${params}`;

    console.log(`  Fetching from Alpha Vantage: ${url.replace(this.apiKey, 'API_KEY')}`);

    const data = await httpsGet(url);

    // Check for rate limit message
    if (data['Note']) {
      throw new Error('Alpha Vantage rate limit exceeded. Please wait and try again.');
    }

    // Check for error message
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
    }

    // Extract time series data
    const timeSeriesKey = isCrypto
      ? 'Time Series (Digital Currency Monthly)'
      : 'Monthly Adjusted Time Series';

    const timeSeries = data[timeSeriesKey];

    if (!timeSeries) {
      throw new Error(`No time series data found. Available keys: ${Object.keys(data).join(', ')}`);
    }

    // DEBUG: Log available fields
    const sampleEntry = Object.values(timeSeries)[0];
    if (sampleEntry) {
      console.log(`  📋 Available fields:`, Object.keys(sampleEntry).join(', '));
    }

    // Transform to standard format
    // Alpha Vantage provides separate 'adjusted close' field that includes dividends
    const prices = Object.entries(timeSeries).map(([date, values], index) => {
      if (index === 0) {
        if (isCrypto) {
          console.log(`  ✓ Using '4a. close (USD)' field for crypto`);
        } else {
          console.log(`  ✓ Using '5. adjusted close' field (includes dividends and splits)`);
        }
      }

      return {
        date: date,
        close: isCrypto
          ? parseFloat(values['4a. close (USD)'])
          : parseFloat(values['5. adjusted close'])
      };
    });

    // Sort by date ascending (oldest first)
    prices.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Remove duplicate dates (API sometimes returns duplicates)
    const deduplicated = deduplicateByDate(prices);

    if (deduplicated.length < prices.length) {
      console.log(`  ℹ️  Removed ${prices.length - deduplicated.length} duplicate date(s)`);
    }

    return deduplicated;
  }
}

// ============================================================================
// CSV GENERATION
// ============================================================================

/**
 * Convert price data to CSV format
 * @param {Array} prices - Array of price objects
 * @param {Array} fields - Fields to include in CSV
 * @returns {string} CSV content
 */
function generateCSV(prices, fields) {
  // Header row
  const header = fields.join(',');

  // Data rows
  const rows = prices.map(price => {
    return fields.map(field => {
      const value = price[field];
      return value !== undefined ? value : '';
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Remove duplicate dates from price data
 * Keeps the first occurrence of each date
 * @param {Array} prices - Array of price objects
 * @returns {Array} Deduplicated array
 */
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

/**
 * Validate price data
 * @param {Array} prices - Array of price objects
 * @param {string} ticker - Ticker symbol for error messages
 */
function validateData(prices, ticker) {
  if (!prices || prices.length === 0) {
    throw new Error(`No data received for ${ticker}`);
  }

  // Check for missing values
  const missingDates = prices.filter(p => !p.date);
  const missingPrices = prices.filter(p => !p.close || isNaN(p.close));

  if (missingDates.length > 0) {
    throw new Error(`${ticker}: ${missingDates.length} entries missing dates`);
  }

  if (missingPrices.length > 0) {
    throw new Error(`${ticker}: ${missingPrices.length} entries missing or invalid prices`);
  }

  // Check for reasonable date range
  const firstDate = new Date(prices[0].date);
  const lastDate = new Date(prices[prices.length - 1].date);
  const yearsDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365);

  if (yearsDiff < 1) {
    console.warn(`  ⚠️  Warning: ${ticker} has less than 1 year of data (${yearsDiff.toFixed(1)} years)`);
  }

  console.log(`  ✓ Validated: ${prices.length} data points spanning ${yearsDiff.toFixed(1)} years`);
  console.log(`    Date range: ${prices[0].date} to ${prices[prices.length - 1].date}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Delay execution for rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch and save data for a single ticker
 */
async function processAsset(asset, dataSource) {
  const { ticker, name, isCrypto = false } = asset;

  console.log(`\n📊 Processing: ${name} (${ticker})`);

  try {
    // Fetch data
    const prices = await dataSource.fetchData(ticker, isCrypto);

    // Validate data
    validateData(prices, ticker);

    // Generate CSV
    const fields = CONFIG.csvFields[CONFIG.activeFormat];
    const csv = generateCSV(prices, fields);

    // Determine output filename
    const filename = ticker.replace('/', '-') + '.csv';  // BTC/USD -> BTC-USD.csv
    const outputPath = path.join(CONFIG.outputDir, filename);

    // Write to file
    fs.writeFileSync(outputPath, csv, 'utf8');

    console.log(`  ✓ Saved to: ${outputPath}`);
    console.log(`  ✓ File size: ${(csv.length / 1024).toFixed(1)} KB`);

    return { success: true, ticker, dataPoints: prices.length };

  } catch (error) {
    console.error(`  ✗ Error processing ${ticker}: ${error.message}`);
    return { success: false, ticker, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 Fire Calculator - Historical Data Fetcher');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const tickerArg = args.find(arg => arg.startsWith('--ticker='));

  const source = sourceArg ? sourceArg.split('=')[1] : CONFIG.defaultSource;
  const specificTicker = tickerArg ? tickerArg.split('=')[1] : null;

  // Initialize data source
  console.log(`\n🔌 Data Source: ${source}`);
  console.log(`📁 Output Directory: ${CONFIG.outputDir}`);
  console.log(`📋 CSV Format: ${CONFIG.csvFields[CONFIG.activeFormat].join(', ')}`);

  let dataSource;
  try {
    if (source === 'twelvedata') {
      dataSource = new TwelveDataSource(process.env.TWELVE_DATA_API_KEY);
    } else if (source === 'alphavantage') {
      dataSource = new AlphaVantageSource(process.env.ALPHA_VANTAGE_API_KEY);
    } else {
      throw new Error(`Unknown source: ${source}. Use 'twelvedata' or 'alphavantage'`);
    }
  } catch (error) {
    console.error(`\n❌ Initialization error: ${error.message}`);
    console.error('\nPlease set the appropriate environment variable:');
    console.error('  - For Twelve Data: export TWELVE_DATA_API_KEY=your_key_here');
    console.error('  - For Alpha Vantage: export ALPHA_VANTAGE_API_KEY=your_key_here');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`\n✓ Created output directory: ${CONFIG.outputDir}`);
  }

  // Filter assets if specific ticker requested
  const assetsToProcess = specificTicker
    ? CONFIG.assets.filter(a => a.ticker === specificTicker)
    : CONFIG.assets;

  if (assetsToProcess.length === 0) {
    console.error(`\n❌ No assets found matching ticker: ${specificTicker}`);
    process.exit(1);
  }

  console.log(`\n🎯 Processing ${assetsToProcess.length} asset(s)...`);

  // Process each asset
  const results = [];
  for (let i = 0; i < assetsToProcess.length; i++) {
    const asset = assetsToProcess[i];

    // Add delay between requests to respect rate limits (except first request)
    if (i > 0) {
      console.log(`\n⏳ Waiting ${CONFIG.requestDelay / 1000}s (rate limit)...`);
      await delay(CONFIG.requestDelay);
    }

    const result = await processAsset(asset, dataSource);
    results.push(result);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✓ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`  - ${r.ticker}: ${r.dataPoints} data points`);
  });

  if (failed.length > 0) {
    console.log(`\n✗ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`  - ${r.ticker}: ${r.error}`);
    });
  }

  const totalDataPoints = successful.reduce((sum, r) => sum + r.dataPoints, 0);
  console.log(`\n📈 Total data points: ${totalDataPoints.toLocaleString()}`);

  // Calculate total file size
  const files = fs.readdirSync(CONFIG.outputDir).filter(f => f.endsWith('.csv'));
  const totalSize = files.reduce((sum, file) => {
    const stats = fs.statSync(path.join(CONFIG.outputDir, file));
    return sum + stats.size;
  }, 0);
  console.log(`💾 Total size: ${(totalSize / 1024).toFixed(1)} KB`);

  // Validate returns to check if data includes dividends
  if (successful.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Data Validation - Checking Returns');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const validateReturn = (ticker, filepath) => {
      try {
        const csvContent = fs.readFileSync(filepath, 'utf8');
        const lines = csvContent.trim().split('\n').slice(1); // Skip header

        if (lines.length < 2) return null;

        const prices = lines.map(line => {
          const [date, close] = line.split(',');
          return { date, close: parseFloat(close) };
        });

        // Calculate annualized return
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
          const logReturn = Math.log(prices[i].close / prices[i - 1].close);
          returns.push(logReturn);
        }

        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const annualReturn = meanReturn * 12;

        return annualReturn;
      } catch (err) {
        return null;
      }
    };

    // Expected returns for validation (with dividends included)
    const expectedReturns = {
      'VT': { min: 0.07, max: 0.10, name: 'Total World Stock' },
      'QQQ': { min: 0.11, max: 0.15, name: 'Nasdaq 100' },
      'BND': { min: 0.025, max: 0.045, name: 'Total Bond Market' },
      'AVUV': { min: 0.09, max: 0.13, name: 'Small Cap Value' },
      'GLD': { min: 0.04, max: 0.08, name: 'Gold' }
    };

    let hasWarnings = false;

    successful.forEach(r => {
      const filepath = path.join(CONFIG.outputDir, `${r.ticker}.csv`);
      if (!fs.existsSync(filepath)) return;

      const annualReturn = validateReturn(r.ticker, filepath);
      if (annualReturn === null) return;

      const returnPct = (annualReturn * 100).toFixed(2);
      const expected = expectedReturns[r.ticker];

      if (expected) {
        const isInRange = annualReturn >= expected.min && annualReturn <= expected.max;

        if (isInRange) {
          console.log(`✓ ${r.ticker} (${expected.name}): ${returnPct}% - Looks good!`);
        } else {
          console.log(`⚠️  ${r.ticker} (${expected.name}): ${returnPct}%`);
          console.log(`   Expected: ${(expected.min * 100).toFixed(1)}%-${(expected.max * 100).toFixed(1)}%`);

          if (annualReturn < expected.min - 0.02) {
            console.log(`   🔴 WARNING: Return is TOO LOW - may be missing DIVIDENDS!`);
            hasWarnings = true;
          } else if (annualReturn > expected.max + 0.02) {
            console.log(`   ⚠️  Return is higher than expected (unusual but possible)`);
          }
        }
      } else {
        console.log(`ℹ️  ${r.ticker}: ${returnPct}% (no validation range available)`);
      }
    });

    if (hasWarnings) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  DIVIDEND WARNING');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Some returns are suspiciously LOW, suggesting dividends may NOT be included.');
      console.log('This will cause the simulation to UNDERESTIMATE portfolio performance.\n');
      console.log('SOLUTIONS:\n');
      console.log('1. Try Alpha Vantage: npm run update-data -- --source=alphavantage');
      console.log('2. Check Twelve Data documentation for adjusted price support');
      console.log('3. For testing: npm run generate-best-data (synthetic but accurate)\n');
    }
  }

  console.log('\n✅ Done!\n');

  // Exit with error if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

// Run main function when script is executed directly
// In ES modules, we can check if this is the main module by comparing import.meta.url with the file URL
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { generateCSV, validateData };
