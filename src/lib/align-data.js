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
  // Build a map of all dates with prices for each ticker
  const allDates = {};

  tickers.forEach(ticker => {
    const priceData = tickerStats[ticker].priceData;
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
    throw new Error('Not enough overlapping data points between tickers');
  }

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
