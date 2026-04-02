/**
 * Data Loader
 *
 * Functions to load historical price data from CSV files
 * and calculate statistics (returns, volatility, correlations)
 */

/**
 * Minimum start dates for certain tickers
 * Used to exclude early, non-representative data
 * Format: 'YYYY-MM-DD'
 */
const TICKER_START_DATES = {
  'BTC/USD': '2020-01-01',  // Exclude early BTC price discovery phase
  // Add more tickers here as needed
  // 'ETH/USD': '2018-01-01',
};

/**
 * Parse CSV string into array of objects
 * @param {string} csvText - CSV content
 * @returns {Array<{date: string, close: number}>}
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');

  // Skip header
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const [date, close] = line.split(',');
    return {
      date: date.trim(),
      close: parseFloat(close)
    };
  });
}

/**
 * Load CSV file from public/data/
 * @param {string} ticker - Ticker symbol (e.g., 'VT')
 * @returns {Promise<Array<{date: string, close: number}>>}
 */
export async function loadHistoricalData(ticker) {
  // Handle BTC/USD -> BTC-USD.csv
  const filename = ticker.replace('/', '-') + '.csv';
  const url = `/data/${filename}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }

    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    throw new Error(`Failed to load data for ${ticker}: ${error.message}`);
  }
}

/**
 * Calculate log returns from price data
 * Returns: ln(P_t / P_{t-1})
 *
 * @param {Array<{date: string, close: number}>} prices
 * @returns {Array<number>} Log returns
 */
export function calculateLogReturns(prices) {
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

/**
 * Calculate annualized mean return from monthly log returns
 * μ = mean(log returns) × 12
 *
 * @param {Array<number>} monthlyReturns - Monthly log returns
 * @returns {number} Annualized return
 */
export function calculateAnnualizedReturn(monthlyReturns) {
  if (monthlyReturns.length === 0) return 0;

  const sum = monthlyReturns.reduce((acc, r) => acc + r, 0);
  const meanMonthlyReturn = sum / monthlyReturns.length;

  return meanMonthlyReturn * 12;
}

/**
 * Calculate annualized volatility from monthly log returns
 * σ = std_dev(log returns) × sqrt(12)
 *
 * @param {Array<number>} monthlyReturns - Monthly log returns
 * @returns {number} Annualized volatility
 */
export function calculateAnnualizedVolatility(monthlyReturns) {
  if (monthlyReturns.length === 0) return 0;

  // Calculate mean
  const sum = monthlyReturns.reduce((acc, r) => acc + r, 0);
  const mean = sum / monthlyReturns.length;

  // Calculate variance
  const squaredDiffs = monthlyReturns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((acc, d) => acc + d, 0) / monthlyReturns.length;

  // Standard deviation
  const monthlyStdDev = Math.sqrt(variance);

  // Annualize
  return monthlyStdDev * Math.sqrt(12);
}

/**
 * Load and process historical data for a single ticker
 * Returns statistics ready for simulation
 *
 * @param {string} ticker - Ticker symbol
 * @returns {Promise<Object>} {ticker, mu, sigma, returns, priceData}
 */
export async function loadAndProcessTicker(ticker) {
  let priceData = await loadHistoricalData(ticker);

  // Filter data based on minimum start date if specified
  if (TICKER_START_DATES[ticker]) {
    const startDate = TICKER_START_DATES[ticker];
    const originalLength = priceData.length;

    priceData = priceData.filter(point => point.date >= startDate);

    console.log(`[${ticker}] Filtered data: ${originalLength} → ${priceData.length} points (from ${startDate})`);

    if (priceData.length === 0) {
      throw new Error(`No data available for ${ticker} after ${startDate}`);
    }
  }

  const returns = calculateLogReturns(priceData);

  const mu = calculateAnnualizedReturn(returns);
  const sigma = calculateAnnualizedVolatility(returns);

  return {
    ticker,
    mu,
    sigma,
    returns,      // Keep for correlation calculation
    priceData     // Keep for reference
  };
}

/**
 * Load and process data for multiple tickers
 *
 * @param {Array<string>} tickers - Array of ticker symbols
 * @param {Function} onProgress - Progress callback (loaded, total)
 * @returns {Promise<Object>} {tickerData, historicalReturns}
 */
export async function loadMultipleTickers(tickers, onProgress) {
  const tickerData = {};
  const historicalReturns = {};

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];

    const data = await loadAndProcessTicker(ticker);

    tickerData[ticker] = data;
    historicalReturns[ticker] = data.returns;

    if (onProgress) {
      onProgress(i + 1, tickers.length);
    }
  }

  return { tickerData, historicalReturns };
}

/**
 * Get statistics summary for display
 *
 * @param {Object} tickerData - Data from loadMultipleTickers
 * @returns {Array<Object>} [{ticker, mu, sigma, dataPoints, dateRange}, ...]
 */
export function getStatisticsSummary(tickerData) {
  return Object.values(tickerData).map(data => {
    const firstDate = data.priceData[0].date;
    const lastDate = data.priceData[data.priceData.length - 1].date;

    return {
      ticker: data.ticker,
      mu: data.mu,
      sigma: data.sigma,
      dataPoints: data.priceData.length,
      dateRange: `${firstDate} to ${lastDate}`
    };
  });
}
