/**
 * Data Alignment Utilities
 *
 * Aligns historical price data from multiple tickers to overlapping time periods
 * This is necessary because different CSV files may have different date ranges
 */

/**
 * Align returns data to common dates across all tickers
 *
 * @param {Object} tickerStats - Object with ticker data { ticker: { priceData, returns } }
 * @param {Array<string>} tickers - Array of ticker symbols to align
 * @returns {Object} { historicalReturns: { ticker: [aligned returns] } }
 */
export function alignHistoricalReturns(tickerStats, tickers) {
  // Validate inputs
  if (!tickerStats || !tickers || tickers.length === 0) {
    throw new Error('Invalid inputs: tickerStats and tickers are required');
  }

  // Check that all tickers have data
  for (const ticker of tickers) {
    if (!tickerStats[ticker]) {
      throw new Error(`Missing data for ticker: ${ticker}. Data may still be loading.`);
    }
    if (!tickerStats[ticker].priceData) {
      throw new Error(`Missing price data for ticker: ${ticker}`);
    }
    if (!tickerStats[ticker].returns) {
      throw new Error(`Missing returns data for ticker: ${ticker}`);
    }
  }

  // Build a map of all dates with prices for each ticker
  const allDates = {};

  tickers.forEach(ticker => {
    const priceData = tickerStats[ticker].priceData;
    if (!Array.isArray(priceData) || priceData.length === 0) {
      throw new Error(`Invalid price data for ticker: ${ticker}`);
    }

    priceData.forEach(p => {
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

  if (commonDates.length < 2) {
    const dateInfo = tickers.map(ticker => {
      const dates = tickerStats[ticker].priceData.map(p => p.date);
      return `${ticker}: ${dates[0]} to ${dates[dates.length - 1]} (${dates.length} points)`;
    }).join(', ');
    throw new Error(
      `Not enough overlapping data points between tickers. ${dateInfo}. ` +
      `Found only ${commonDates.length} common dates. Need at least 2.`
    );
  }

  console.log(`Data alignment: Found ${commonDates.length} overlapping dates for ${tickers.join(', ')}`);
  console.log(`Date range: ${commonDates[0]} to ${commonDates[commonDates.length - 1]}`);

  // Calculate aligned returns for each ticker
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

  return {
    historicalReturns,
    commonDates,
    dataPoints: commonDates.length
  };
}
