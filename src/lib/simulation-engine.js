/**
 * Monte Carlo Simulation Engine
 *
 * Core mathematical functions for retirement portfolio simulation:
 * - Portfolio aggregation (combine duplicate tickers)
 * - Statistical calculations (mean, std dev, correlation)
 * - Cholesky decomposition for correlated returns
 * - Monte Carlo simulation loop
 */

// ============================================================================
// PORTFOLIO AGGREGATION
// ============================================================================

/**
 * Aggregate portfolio by ticker (combine duplicate entries)
 * Example: [VT: $100k, VT: $50k, BND: $75k] → [VT: $150k, BND: $75k]
 *
 * @param {Array} portfolio - Array of {ticker, value, mu, sigma} objects
 * @returns {Array} Aggregated portfolio (unique tickers only)
 */
export function aggregatePortfolio(portfolio) {
  const aggregated = {};

  portfolio.forEach(asset => {
    if (aggregated[asset.ticker]) {
      // Ticker already exists, sum the values
      aggregated[asset.ticker].value += asset.value;
    } else {
      // New ticker, create entry
      aggregated[asset.ticker] = { ...asset };
    }
  });

  return Object.values(aggregated);
}

// ============================================================================
// STATISTICAL CALCULATIONS
// ============================================================================

/**
 * Calculate mean of an array
 * @param {Array<number>} values
 * @returns {number}
 */
export function mean(values) {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate standard deviation of an array
 * @param {Array<number>} values
 * @returns {number}
 */
export function standardDeviation(values) {
  if (values.length === 0) return 0;

  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);

  return Math.sqrt(variance);
}

/**
 * Calculate correlation between two arrays
 * @param {Array<number>} x
 * @param {Array<number>} y
 * @returns {number} Correlation coefficient (-1 to 1)
 */
export function correlation(x, y) {
  if (x.length !== y.length || x.length === 0) {
    throw new Error('Arrays must have same non-zero length');
  }

  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  const stdX = standardDeviation(x);
  const stdY = standardDeviation(y);

  if (stdX === 0 || stdY === 0) {
    return 0; // No correlation if either has zero variance
  }

  let covariance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }
  covariance /= n;

  return covariance / (stdX * stdY);
}

/**
 * Calculate correlation matrix for multiple return series
 * @param {Object} returnsByTicker - {ticker: [returns...], ...}
 * @returns {Object} {matrix: 2D array, tickers: [ordered ticker list]}
 */
export function calculateCorrelationMatrix(returnsByTicker) {
  const tickers = Object.keys(returnsByTicker);
  const n = tickers.length;

  // Initialize correlation matrix (n x n)
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

  // Calculate pairwise correlations
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0; // Perfect correlation with self
      } else {
        matrix[i][j] = correlation(
          returnsByTicker[tickers[i]],
          returnsByTicker[tickers[j]]
        );
      }
    }
  }

  return { matrix, tickers };
}

/**
 * Build covariance matrix from correlation matrix and standard deviations
 * Σ_ij = ρ_ij × σ_i × σ_j
 *
 * @param {Array<Array<number>>} correlationMatrix
 * @param {Array<number>} sigmas - Standard deviations for each asset
 * @returns {Array<Array<number>>} Covariance matrix
 */
export function buildCovarianceMatrix(correlationMatrix, sigmas) {
  const n = correlationMatrix.length;
  const covariance = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      covariance[i][j] = correlationMatrix[i][j] * sigmas[i] * sigmas[j];
    }
  }

  return covariance;
}

// ============================================================================
// CHOLESKY DECOMPOSITION
// ============================================================================

/**
 * Cholesky decomposition: Decompose matrix A = L * L^T
 * Where L is lower triangular matrix
 *
 * This allows us to generate correlated random variables efficiently
 *
 * @param {Array<Array<number>>} matrix - Symmetric positive definite matrix
 * @returns {Array<Array<number>>} Lower triangular matrix L
 */
export function choleskyDecomposition(matrix) {
  const n = matrix.length;
  const L = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;

      if (j === i) {
        // Diagonal elements
        for (let k = 0; k < j; k++) {
          sum += L[j][k] * L[j][k];
        }

        const diagonal = matrix[j][j] - sum;

        // Check for numerical issues
        if (diagonal <= 0) {
          throw new Error(`Matrix is not positive definite at position [${j},${j}]. Value: ${diagonal}`);
        }

        L[j][j] = Math.sqrt(diagonal);
      } else {
        // Off-diagonal elements
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }

        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }

  return L;
}

// ============================================================================
// RANDOM NUMBER GENERATION
// ============================================================================

/**
 * Generate random number from standard normal distribution N(0,1)
 * Uses Box-Muller transform
 *
 * @returns {number}
 */
export function randomNormal() {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generate vector of correlated random returns
 * X = μ + L * Z, where Z ~ N(0,1)
 *
 * @param {Array<number>} means - Expected returns [μ1, μ2, ...]
 * @param {Array<Array<number>>} choleskyMatrix - Lower triangular matrix L
 * @returns {Array<number>} Correlated returns
 */
export function generateCorrelatedReturns(means, choleskyMatrix) {
  const n = means.length;

  // Generate independent standard normal random variables
  const Z = Array(n).fill(0).map(() => randomNormal());

  // Transform to correlated returns: X = μ + L * Z
  const X = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j <= i; j++) {
      sum += choleskyMatrix[i][j] * Z[j];
    }
    X[i] = means[i] + sum;
  }

  return X;
}

// ============================================================================
// SIMULATION LOOP
// ============================================================================

/**
 * Run a single Monte Carlo simulation
 *
 * @param {Object} params - Simulation parameters
 * @param {Array} params.portfolio - Aggregated portfolio [{ticker, value, mu, sigma}]
 * @param {Array<number>} params.flatSpending - Spending by year (real dollars)
 * @param {number} params.inflationRate - Fixed annual inflation rate
 * @param {number} params.totalYears - Total simulation years
 * @param {Array<Array<number>>} params.choleskyMatrix - Pre-computed Cholesky decomposition
 * @param {Array<string>} params.tickers - Ordered list of tickers matching Cholesky matrix
 * @returns {Object} Simulation result {success, endingBalance?, failureYear?, balancesByYear}
 */
export function runSingleSimulation(params) {
  const {
    portfolio,
    flatSpending,
    inflationRate,
    totalYears,
    choleskyMatrix,
    tickers
  } = params;

  // Calculate initial total portfolio value
  let portfolioBalance = portfolio.reduce((sum, asset) => sum + asset.value, 0);

  // Calculate initial weights
  const weights = {};
  portfolio.forEach(asset => {
    weights[asset.ticker] = asset.value / portfolioBalance;
  });

  // Extract means (expected returns) in same order as tickers
  const means = tickers.map(ticker => {
    const asset = portfolio.find(a => a.ticker === ticker);
    return asset.mu;
  });

  // Track balance at each year for percentile calculations
  const balancesByYear = [portfolioBalance];

  // Year-by-year simulation
  for (let year = 1; year <= totalYears; year++) {
    // 1. Generate correlated returns for this year
    const returns = generateCorrelatedReturns(means, choleskyMatrix);

    // 2. Calculate weighted portfolio return
    let portfolioReturn = 0;
    tickers.forEach((ticker, idx) => {
      portfolioReturn += weights[ticker] * returns[idx];
    });

    // 3. Apply growth (using exp because returns are log returns)
    portfolioBalance *= Math.exp(portfolioReturn);

    // 4. Deduct spending (strategy-dependent)
    const spendingItem = flatSpending[year - 1];
    let nominalSpending;

    if (spendingItem.strategy === 'percentage') {
      // Percentage of current portfolio balance (no inflation adjustment needed)
      nominalSpending = portfolioBalance * (spendingItem.amount / 100);
    } else {
      // Fixed dollar amount (inflation-adjusted)
      const inflationFactor = Math.pow(1 + inflationRate, year);
      nominalSpending = spendingItem.amount * inflationFactor;
    }

    portfolioBalance -= nominalSpending;

    // 5. Check for failure
    if (portfolioBalance <= 0) {
      return {
        success: false,
        failureYear: year,
        balancesByYear
      };
    }

    // 6. Rebalance to target weights
    // (Weights stay the same, just conceptually resetting allocations)
    // In reality, the portfolio balance is just a number now, but we continue
    // using the same weights for next year's return calculation

    // Track balance
    balancesByYear.push(portfolioBalance);
  }

  // Success: portfolio lasted through all years
  return {
    success: true,
    endingBalance: portfolioBalance,
    balancesByYear
  };
}

/**
 * Run full Monte Carlo simulation
 *
 * @param {Object} config - Simulation configuration
 * @param {Array} config.portfolio - User's portfolio (may have duplicates)
 * @param {Array} config.phases - Spending phases [{amount, years}]
 * @param {number} config.inflationRate - Annual inflation rate (e.g., 0.03)
 * @param {number} config.iterations - Number of simulations (e.g., 10000)
 * @param {Object} config.historicalReturns - {ticker: [returns...]} for correlation
 * @param {Function} config.onProgress - Callback(percent) for progress updates
 * @returns {Object} Simulation results
 */
export function runMonteCarloSimulation(config) {
  const {
    portfolio,
    phases,
    inflationRate,
    iterations,
    historicalReturns,
    onProgress
  } = config;

  // Step 1: Aggregate portfolio (combine duplicate tickers)
  const aggregatedPortfolio = aggregatePortfolio(portfolio);

  // Step 2: Flatten spending phases into array by year
  const flatSpending = [];
  phases.forEach(phase => {
    const strategy = phase.strategy || 'fixed'; // Default to 'fixed' for backward compatibility
    for (let i = 0; i < phase.years; i++) {
      flatSpending.push({
        amount: phase.amount,
        strategy: strategy
      });
    }
  });
  const totalYears = flatSpending.length;

  // Step 3: Calculate correlation matrix from historical returns
  const { matrix: correlationMatrix, tickers } = calculateCorrelationMatrix(historicalReturns);

  // Step 4: Build covariance matrix
  const sigmas = tickers.map(ticker => {
    const asset = aggregatedPortfolio.find(a => a.ticker === ticker);
    return asset.sigma;
  });
  const covarianceMatrix = buildCovarianceMatrix(correlationMatrix, sigmas);

  // Step 5: Cholesky decomposition
  const choleskyMatrix = choleskyDecomposition(covarianceMatrix);

  // Step 6: Run simulations
  const results = [];
  const progressInterval = Math.max(1, Math.floor(iterations / 100)); // Report every 1%

  for (let i = 0; i < iterations; i++) {
    const result = runSingleSimulation({
      portfolio: aggregatedPortfolio,
      flatSpending,
      inflationRate,
      totalYears,
      choleskyMatrix,
      tickers
    });

    results.push(result);

    // Report progress
    if (onProgress && (i + 1) % progressInterval === 0) {
      const percent = Math.floor(((i + 1) / iterations) * 100);
      onProgress(percent);
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(100);
  }

  // Step 7: Calculate statistics
  return calculateStatistics(results, totalYears);
}

/**
 * Calculate statistics from simulation results
 *
 * @param {Array} results - Array of simulation results
 * @param {number} totalYears - Total simulation years
 * @returns {Object} Statistics
 */
export function calculateStatistics(results, totalYears) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const successRate = (successful.length / results.length) * 100;

  // Calculate percentiles for each year
  const percentilesByYear = [];

  for (let year = 0; year <= totalYears; year++) {
    const balances = results.map(r => r.balancesByYear[year] || 0);
    balances.sort((a, b) => a - b);

    percentilesByYear.push({
      year,
      p10: percentile(balances, 10),
      p25: percentile(balances, 25),
      p50: percentile(balances, 50), // Median
      p75: percentile(balances, 75),
      p90: percentile(balances, 90)
    });
  }

  // Ending balance statistics (successful runs only)
  const endingBalances = successful.map(r => r.endingBalance).sort((a, b) => a - b);

  const stats = {
    successRate,
    totalRuns: results.length,
    successfulRuns: successful.length,
    failedRuns: failed.length,

    // Ending balance stats
    medianEndingBalance: endingBalances.length > 0 ? percentile(endingBalances, 50) : 0,
    worstCaseEndingBalance: endingBalances.length > 0 ? endingBalances[0] : 0,

    // Failure stats
    averageFailureYear: failed.length > 0
      ? mean(failed.map(r => r.failureYear))
      : null,

    // Percentiles by year (for chart)
    percentilesByYear
  };

  return stats;
}

/**
 * Calculate percentile of sorted array
 * @param {Array<number>} sortedArray
 * @param {number} p - Percentile (0-100)
 * @returns {number}
 */
function percentile(sortedArray, p) {
  if (sortedArray.length === 0) return 0;

  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedArray[lower];
  }

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}
