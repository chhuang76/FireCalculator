/**
 * Web Worker for Monte Carlo Simulation
 *
 * Runs simulations in background thread to prevent UI freezing
 *
 * Messages IN (from main thread):
 * {
 *   type: 'RUN_SIMULATION',
 *   payload: {
 *     portfolio: [{ticker, value, mu, sigma}],
 *     phases: [{amount, years}],
 *     inflationRate: number,
 *     iterations: number,
 *     historicalReturns: {ticker: [returns]}
 *   }
 * }
 *
 * Messages OUT (to main thread):
 * {
 *   type: 'PROGRESS',
 *   payload: { percent: number }
 * }
 * {
 *   type: 'COMPLETE',
 *   payload: { results: {...} }
 * }
 * {
 *   type: 'ERROR',
 *   payload: { error: string }
 * }
 */

// Import simulation engine functions
// Note: In a real setup, we'd bundle this or use importScripts
// For now, we'll include the necessary functions inline

// ============================================================================
// INLINE SIMULATION ENGINE (copied from simulation-engine.js)
// ============================================================================

function aggregatePortfolio(portfolio) {
  const aggregated = {};
  portfolio.forEach(asset => {
    if (aggregated[asset.ticker]) {
      aggregated[asset.ticker].value += asset.value;
    } else {
      aggregated[asset.ticker] = { ...asset };
    }
  });
  return Object.values(aggregated);
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);
  return Math.sqrt(variance);
}

function correlation(x, y) {
  if (x.length !== y.length || x.length === 0) {
    throw new Error('Arrays must have same non-zero length');
  }

  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  const stdX = standardDeviation(x);
  const stdY = standardDeviation(y);

  if (stdX === 0 || stdY === 0) return 0;

  let covariance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }
  covariance /= n;

  return covariance / (stdX * stdY);
}

function calculateCorrelationMatrix(returnsByTicker) {
  const tickers = Object.keys(returnsByTicker);
  const n = tickers.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
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

function buildCovarianceMatrix(correlationMatrix, sigmas) {
  const n = correlationMatrix.length;
  const covariance = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      covariance[i][j] = correlationMatrix[i][j] * sigmas[i] * sigmas[j];
    }
  }

  return covariance;
}

function choleskyDecomposition(matrix) {
  const n = matrix.length;
  const L = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;

      if (j === i) {
        for (let k = 0; k < j; k++) {
          sum += L[j][k] * L[j][k];
        }
        const diagonal = matrix[j][j] - sum;
        if (diagonal <= 0) {
          throw new Error(`Matrix is not positive definite at [${j},${j}]`);
        }
        L[j][j] = Math.sqrt(diagonal);
      } else {
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }

  return L;
}

function randomNormal() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function generateCorrelatedReturns(means, choleskyMatrix) {
  const n = means.length;
  const Z = Array(n).fill(0).map(() => randomNormal());
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

function runSingleSimulation(params) {
  const {
    portfolio,
    flatSpending,
    inflationRate,
    totalYears,
    choleskyMatrix,
    tickers
  } = params;

  let portfolioBalance = portfolio.reduce((sum, asset) => sum + asset.value, 0);

  const weights = {};
  portfolio.forEach(asset => {
    weights[asset.ticker] = asset.value / portfolioBalance;
  });

  const means = tickers.map(ticker => {
    const asset = portfolio.find(a => a.ticker === ticker);
    return asset.mu;
  });

  const balancesByYear = [portfolioBalance];

  for (let year = 1; year <= totalYears; year++) {
    const returns = generateCorrelatedReturns(means, choleskyMatrix);

    let portfolioReturn = 0;
    tickers.forEach((ticker, idx) => {
      portfolioReturn += weights[ticker] * returns[idx];
    });

    portfolioBalance *= (1 + portfolioReturn);

    const inflationFactor = Math.pow(1 + inflationRate, year);
    const nominalSpending = flatSpending[year - 1] * inflationFactor;
    portfolioBalance -= nominalSpending;

    if (portfolioBalance <= 0) {
      return {
        success: false,
        failureYear: year,
        balancesByYear
      };
    }

    balancesByYear.push(portfolioBalance);
  }

  return {
    success: true,
    endingBalance: portfolioBalance,
    balancesByYear
  };
}

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

function calculateStatistics(results, totalYears) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const successRate = (successful.length / results.length) * 100;

  const percentilesByYear = [];

  for (let year = 0; year <= totalYears; year++) {
    const balances = results.map(r => r.balancesByYear[year] || 0);
    balances.sort((a, b) => a - b);

    percentilesByYear.push({
      year,
      p10: percentile(balances, 10),
      p25: percentile(balances, 25),
      p50: percentile(balances, 50),
      p75: percentile(balances, 75),
      p90: percentile(balances, 90)
    });
  }

  const endingBalances = successful.map(r => r.endingBalance).sort((a, b) => a - b);

  return {
    successRate,
    totalRuns: results.length,
    successfulRuns: successful.length,
    failedRuns: failed.length,
    medianEndingBalance: endingBalances.length > 0 ? percentile(endingBalances, 50) : 0,
    worstCaseEndingBalance: endingBalances.length > 0 ? endingBalances[0] : 0,
    averageFailureYear: failed.length > 0
      ? mean(failed.map(r => r.failureYear))
      : null,
    percentilesByYear
  };
}

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type !== 'RUN_SIMULATION') {
    self.postMessage({
      type: 'ERROR',
      payload: { error: 'Unknown message type' }
    });
    return;
  }

  try {
    const {
      portfolio,
      phases,
      inflationRate,
      iterations,
      historicalReturns
    } = payload;

    // Step 1: Aggregate portfolio
    const aggregatedPortfolio = aggregatePortfolio(portfolio);

    // Step 2: Flatten spending phases
    const flatSpending = [];
    phases.forEach(phase => {
      for (let i = 0; i < phase.years; i++) {
        flatSpending.push(phase.amount);
      }
    });
    const totalYears = flatSpending.length;

    // Step 3: Calculate correlation matrix
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
    const progressInterval = Math.max(1, Math.floor(iterations / 100));

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

      // Send progress updates
      if ((i + 1) % progressInterval === 0) {
        const percent = Math.floor(((i + 1) / iterations) * 100);
        self.postMessage({
          type: 'PROGRESS',
          payload: { percent }
        });
      }
    }

    // Step 7: Calculate statistics
    const stats = calculateStatistics(results, totalYears);

    // Send results back to main thread
    self.postMessage({
      type: 'COMPLETE',
      payload: { results: stats }
    });

  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { error: error.message }
    });
  }
};
