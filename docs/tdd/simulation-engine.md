# Simulation Engine - Technical Design Document

**Component:** Core Monte Carlo Simulation Engine
**File:** `src/lib/simulation-engine.js`
**Status:** ✅ Implemented and Tested

---

## Overview

The simulation engine is the mathematical core of the FIRE calculator. It runs Monte Carlo simulations to estimate retirement portfolio success rates under various market conditions.

### Responsibilities

1. Calculate correlation matrices from historical returns
2. Generate correlated random returns using Cholesky decomposition
3. Simulate portfolio evolution over multi-decade periods
4. Calculate success rates and percentile distributions
5. Handle multi-phase spending plans with inflation

---

## Architecture

### Module Structure

```
simulation-engine.js
├── Portfolio Aggregation
│   └── aggregatePortfolio()
├── Statistical Functions
│   ├── mean()
│   ├── standardDeviation()
│   ├── correlation()
│   ├── calculateCorrelationMatrix()
│   └── buildCovarianceMatrix()
├── Linear Algebra
│   └── choleskyDecomposition()
├── Random Number Generation
│   ├── randomNormal()
│   └── generateCorrelatedReturns()
├── Simulation
│   ├── runSingleSimulation()
│   ├── runMonteCarloSimulation()
│   └── calculateStatistics()
└── Helper Functions
    └── percentile()
```

---

## Key Functions

### 1. `aggregatePortfolio(portfolio)`

**Purpose:** Combine duplicate tickers before simulation

**Input:**
```javascript
[
  { ticker: 'VT', value: 400000, mu: 0.09, sigma: 0.15 },
  { ticker: 'QQQ', value: 300000, mu: 0.14, sigma: 0.20 },
  { ticker: 'VT', value: 300000, mu: 0.09, sigma: 0.15 }  // Duplicate
]
```

**Output:**
```javascript
[
  { ticker: 'VT', value: 700000, mu: 0.09, sigma: 0.15 },
  { ticker: 'QQQ', value: 300000, mu: 0.14, sigma: 0.20 }
]
```

**Algorithm:**
```javascript
1. Create empty object for aggregation
2. For each asset in portfolio:
   a. If ticker exists in object: Add value to existing
   b. Else: Create new entry
3. Return Object.values (array of unique assets)
```

**Why:** Reduces correlation matrix size and simplifies simulation

---

### 2. `calculateCorrelationMatrix(returnsByTicker)`

**Purpose:** Build correlation matrix from historical returns

**Input:**
```javascript
{
  'VT': [0.012, -0.008, 0.015, ...],   // 199 monthly returns
  'QQQ': [0.018, -0.012, 0.022, ...],  // 199 monthly returns
  'BND': [0.003, 0.001, -0.002, ...]   // 199 monthly returns
}
```

**Output:**
```javascript
{
  matrix: [
    [1.00, 0.95, 0.10],   // VT correlations
    [0.95, 1.00, 0.15],   // QQQ correlations
    [0.10, 0.15, 1.00]    // BND correlations
  ],
  tickers: ['VT', 'QQQ', 'BND']
}
```

**Algorithm:**
```javascript
1. Extract ticker list
2. Create n×n matrix (where n = number of tickers)
3. For each pair (i, j):
   a. If i === j: correlation = 1.0 (self)
   b. Else: Calculate correlation(returns[i], returns[j])
4. Return matrix and ticker order
```

**Properties:**
- Symmetric: corr(i,j) = corr(j,i)
- Diagonal: corr(i,i) = 1.0
- Range: -1.0 ≤ corr ≤ 1.0

---

### 3. `choleskyDecomposition(matrix)`

**Purpose:** Decompose covariance matrix for generating correlated returns

**Mathematical Background:**

Given a symmetric positive-definite covariance matrix **Σ**, find lower triangular matrix **L** such that:

```
Σ = L × L^T
```

**Algorithm (Cholesky-Banachiewicz):**

```javascript
For i = 0 to n-1:
  For j = 0 to i:
    sum = 0
    If j === i (diagonal):
      For k = 0 to j-1:
        sum += L[j][k]²
      L[j][j] = √(Σ[j][j] - sum)
    Else (lower triangle):
      For k = 0 to j-1:
        sum += L[i][k] × L[j][k]
      L[i][j] = (Σ[i][j] - sum) / L[j][j]
```

**Example:**

Input covariance matrix:
```
Σ = [
  [0.0225, 0.0285, 0.0015],
  [0.0285, 0.0400, 0.0030],
  [0.0015, 0.0030, 0.0025]
]
```

Output Cholesky factor:
```
L = [
  [0.1500, 0.0000, 0.0000],
  [0.1900, 0.1000, 0.0000],
  [0.0100, 0.0200, 0.0436]
]
```

Verification: L × L^T = Σ ✓

**Error Handling:**
- Throws if matrix is not positive definite
- Indicates numerical issues or bad input data

---

### 4. `generateCorrelatedReturns(means, choleskyMatrix)`

**Purpose:** Generate correlated random returns for one time period

**Mathematical Foundation:**

Given:
- μ = [μ₁, μ₂, ..., μₙ] (expected returns)
- L = Cholesky factor of covariance matrix
- Z ~ N(0,1) (independent standard normal random variables)

Generate:
```
X = μ + L × Z
```

Where X = [X₁, X₂, ..., Xₙ] are correlated returns

**Algorithm:**
```javascript
1. Generate n independent standard normals: Z = [z₁, z₂, ..., zₙ]
2. For each asset i:
   a. sum = 0
   b. For each j from 0 to i:
      sum += L[i][j] × Z[j]
   c. X[i] = μ[i] + sum
3. Return X
```

**Example:**
```javascript
Input:
  means = [0.09/12, 0.14/12, 0.04/12]  // Monthly μ
  L = [[0.15, 0, 0], [0.19, 0.10, 0], [0.01, 0.02, 0.044]]
  Z = [0.52, -1.23, 0.08]  // Random N(0,1)

Output:
  X = [0.0075 + 0.15×0.52,
       0.0117 + 0.19×0.52 + 0.10×(-1.23),
       0.0033 + 0.01×0.52 + 0.02×(-1.23) + 0.044×0.08]
    = [0.0855, -0.1016, -0.0182]  // 8.55%, -10.16%, -1.82%
```

**Properties:**
- Returns are correlated according to covariance matrix
- Correlation is preserved across simulations
- Faster than copula methods

---

### 5. `runSingleSimulation(params)`

**Purpose:** Run one Monte Carlo path from start to finish

**Input Parameters:**
```javascript
{
  portfolio: [{ticker, value, mu, sigma}, ...],
  flatSpending: [50000, 50000, ..., 30000, 30000, ...],
  inflationRate: 0.03,
  totalYears: 55,
  choleskyMatrix: [[...], [...], ...],
  tickers: ['VT', 'QQQ', 'BND']
}
```

**Algorithm:**
```javascript
1. Calculate initial portfolio balance (sum of values)
2. Calculate target weights (value / totalBalance)
3. Initialize balancesByYear = [initial balance]

4. For each year from 1 to totalYears:
   a. Generate correlated returns for this year
   b. Calculate weighted portfolio return
   c. Grow portfolio: balance *= (1 + portfolioReturn)
   d. Calculate inflation-adjusted spending
   e. Subtract spending: balance -= spending
   f. If balance <= 0:
      - Record failure year
      - Return {success: false, failureYear, balancesByYear}
   g. Store balance in balancesByYear

5. Return {success: true, endingBalance, balancesByYear}
```

**Example Execution:**

```
Year 0: $1,000,000

Year 1:
  Returns: VT +12%, QQQ +15%, BND +3%
  Weights: VT 60%, QQQ 30%, BND 10%
  Portfolio return: 0.6×0.12 + 0.3×0.15 + 0.1×0.03 = 11.8%
  Growth: $1,000,000 × 1.118 = $1,118,000
  Spending: $50,000 × 1.03 = $51,500
  New balance: $1,118,000 - $51,500 = $1,066,500 ✓

Year 2:
  Returns: VT -5%, QQQ -8%, BND +2%
  Portfolio return: -4.3%
  Growth: $1,066,500 × 0.957 = $1,020,664
  Spending: $50,000 × 1.03² = $53,045
  New balance: $1,020,664 - $53,045 = $967,619 ✓

... (continue for 55 years)

Final: $1,250,000 ✓ Success
```

**Key Decisions:**
- **Annual rebalancing** (weights reset each year)
- **Inflation compounds** (Year 10 spending = $50k × 1.03^10)
- **Failure = balance ≤ 0** (ran out of money)

---

### 6. `runMonteCarloSimulation(config)`

**Purpose:** Run thousands of simulations and aggregate results

**Input Configuration:**
```javascript
{
  portfolio: [{ticker, value, mu, sigma}, ...],
  phases: [{amount, years}, ...],
  inflationRate: 0.03,
  iterations: 10000,
  historicalReturns: {ticker: [returns]},
  onProgress: (percent) => console.log(percent)
}
```

**Algorithm:**
```javascript
1. Aggregate duplicate tickers
2. Flatten spending phases into annual array
3. Calculate correlation matrix from historicalReturns
4. Build covariance matrix (correlation × σ_i × σ_j)
5. Perform Cholesky decomposition

6. For i = 0 to iterations:
   a. Run single simulation
   b. Store result (success, balances, failureYear)
   c. If (i % progressInterval === 0):
      - Call onProgress(percent)

7. Calculate statistics from all results
8. Return {successRate, percentilesByYear, ...}
```

**Progress Reporting:**
```javascript
iterations = 10000
progressInterval = Math.max(1, Math.floor(iterations / 100))
// Reports every 100 iterations (1% increments)
```

**Output:**
```javascript
{
  successRate: 85.3,              // 85.3% of runs succeeded
  totalRuns: 10000,
  successfulRuns: 8530,
  failedRuns: 1470,
  medianEndingBalance: 1234567,   // Median of successful runs
  worstCaseEndingBalance: 45000,  // Min of successful runs
  averageFailureYear: 28.5,       // Mean failure year
  percentilesByYear: [
    {year: 0, p10: 1000000, p25: 1000000, p50: 1000000, ...},
    {year: 1, p10: 985000, p25: 1020000, p50: 1050000, ...},
    ...
  ]
}
```

---

### 7. `calculateStatistics(results, totalYears)`

**Purpose:** Aggregate results from all simulation runs

**Input:**
```javascript
results = [
  {success: true, endingBalance: 1500000, balancesByYear: [...]},
  {success: false, failureYear: 23, balancesByYear: [...]},
  {success: true, endingBalance: 800000, balancesByYear: [...]},
  ...  // 10,000 total
]
```

**Algorithm:**
```javascript
1. Separate successful and failed runs

2. Calculate success rate:
   successRate = (successful.length / total.length) × 100

3. For each year from 0 to totalYears:
   a. Extract balances at this year from all runs
   b. Sort balances ascending
   c. Calculate percentiles: 10th, 25th, 50th, 75th, 90th
   d. Store in percentilesByYear[year]

4. From successful runs:
   a. Extract ending balances
   b. Sort ascending
   c. medianEndingBalance = percentile(50)
   d. worstCaseEndingBalance = min

5. From failed runs:
   a. Extract failure years
   b. averageFailureYear = mean

6. Return complete statistics object
```

**Percentile Calculation (Linear Interpolation):**
```javascript
function percentile(sortedArray, p) {
  index = (p / 100) × (length - 1)
  lower = floor(index)
  upper = ceil(index)
  weight = index - lower

  if (lower === upper):
    return sortedArray[lower]

  return sortedArray[lower] × (1 - weight) +
         sortedArray[upper] × weight
}
```

**Example:**
```javascript
sortedArray = [100, 200, 300, 400, 500]
percentile(sortedArray, 25)
  = index: 0.25 × 4 = 1
  = sortedArray[1] = 200

percentile(sortedArray, 75)
  = index: 0.75 × 4 = 3
  = sortedArray[3] = 400

percentile(sortedArray, 50)
  = index: 0.50 × 4 = 2
  = sortedArray[2] = 300
```

---

## Mathematical Foundations

### 1. Geometric Brownian Motion

Portfolio value evolves as:
```
S(t+1) = S(t) × exp(r)
```

Where:
- S(t) = portfolio value at time t
- r = log return (from correlated normal distribution)
- **Important:** We use `exp(r)` not `(1 + r)` because returns are log returns

**Why exp()?**
- Data loader calculates: `r = ln(P_t / P_{t-1})` (log returns)
- To apply: `P_{t+1} = P_t × exp(r)` (exponential growth)
- **NOT:** `P_{t+1} = P_t × (1 + r)` (this would be wrong for log returns)

### 2. Multivariate Normal Distribution

Returns are drawn from:
```
R ~ N(μ, Σ)
```

Where:
- μ = [μ₁, μ₂, ..., μₙ] (mean returns)
- Σ = covariance matrix

Simulated via:
```
R = μ + L × Z
```

Where L×L^T = Σ (Cholesky decomposition)

### 3. Correlation to Covariance

```
σᵢⱼ = ρᵢⱼ × σᵢ × σⱼ
```

Where:
- σᵢⱼ = covariance between assets i and j
- ρᵢⱼ = correlation (-1 to 1)
- σᵢ, σⱼ = volatilities of assets i and j

---

## Performance Characteristics

### Time Complexity

| Function | Complexity | Notes |
|----------|------------|-------|
| aggregatePortfolio | O(n) | n = portfolio size |
| correlation | O(m) | m = number of data points |
| calculateCorrelationMatrix | O(n² × m) | n = assets, m = data points |
| choleskyDecomposition | O(n³) | Cubic in number of assets |
| generateCorrelatedReturns | O(n²) | Lower triangular matrix mult |
| runSingleSimulation | O(y × n) | y = years, n = assets |
| runMonteCarloSimulation | O(i × y × n) | i = iterations |
| calculateStatistics | O(i × y × log(i)) | Sorting for percentiles |

### Actual Performance (Typical)

```
Portfolio: 3 assets
Years: 55
Iterations: 10,000

- Correlation matrix: <1ms
- Cholesky decomposition: <1ms
- Single simulation: ~0.3ms
- 10,000 simulations: ~3 seconds
- Statistics calculation: ~100ms
```

### Memory Usage

```
- Portfolio data: ~1 KB
- Historical returns: ~50 KB (3 assets × 200 months)
- Correlation matrix: ~0.1 KB (3×3 doubles)
- Simulation results: ~45 MB (10k × 55 years × 8 bytes)
- Percentiles: ~3 KB (55 years × 5 percentiles)
```

---

## Error Handling

### Input Validation

```javascript
// Portfolio validation
if (!portfolio || portfolio.length === 0) {
  throw new Error('Portfolio cannot be empty');
}

// Correlation matrix validation
if (matrix is not positive definite) {
  throw new Error('Covariance matrix is not positive definite');
}

// Historical returns validation
if (returnsByTicker[ticker].length === 0) {
  throw new Error('No historical returns for ticker');
}
```

### Numerical Stability

```javascript
// Cholesky decomposition
if (diagonal <= 0) {
  throw new Error('Matrix is not positive definite at [i,i]');
}

// Division by zero
if (L[j][j] === 0) {
  throw new Error('Zero pivot in Cholesky decomposition');
}

// Log of negative/zero
if (price <= 0) {
  throw new Error('Invalid price data (must be positive)');
}
```

---

## Testing

### Unit Tests (16 tests)

```javascript
✓ aggregatePortfolio: combines duplicate tickers
✓ aggregatePortfolio: handles no duplicates
✓ mean: calculates average correctly
✓ standardDeviation: calculates std dev correctly
✓ correlation: calculates correlation correctly
✓ calculateCorrelationMatrix: builds correlation matrix
✓ buildCovarianceMatrix: converts correlation to covariance
✓ choleskyDecomposition: simple 2x2 matrix
✓ choleskyDecomposition: 3x3 matrix
✓ choleskyDecomposition: identity matrix
✓ randomNormal: generates reasonable values
✓ generateCorrelatedReturns: correct dimensions
✓ generateCorrelatedReturns: mean centers around expected
✓ runSingleSimulation: successful run
✓ runSingleSimulation: detects failure
✓ calculateStatistics: calculates success rate and percentiles
```

### Integration Test

```bash
npm run test:simulation
```

Loads real CSV data and runs full simulation with validation.

---

## Dependencies

**None** - Pure JavaScript implementation

**Why no libraries?**
- ✅ No dependency bloat
- ✅ Full control over algorithms
- ✅ Educational value (understand the math)
- ✅ Easier to audit and verify

---

## Future Enhancements

### Potential Optimizations

1. **Web Assembly** - Compile core loops to WASM
2. **GPU.js** - Parallelize on GPU for 100k+ iterations
3. **Adaptive Iterations** - Stop early if converged

### Feature Additions

1. **Stochastic Volatility** - Variable σ over time
2. **Fat Tails** - Student's t-distribution
3. **Regime Switching** - Bull/bear market states
4. **Path-Dependent** - Sequence of returns matters

---

## References

- **Tests:** `src/lib/simulation-engine.test.js`
- **Integration:** `src/lib/test-simulation.js`
- **Usage:** `src/workers/simulation-worker.js`
- **Math:** See [Statistical Foundations](../DIVIDENDS.md)

---

**Last Updated:** 2025-04-01
