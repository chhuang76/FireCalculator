# Data Management - Technical Design Document

**Component:** Data Loading, Processing, and Alignment
**Files:** `src/lib/data-loader.js`, `src/lib/align-data.js`, `scripts/update-data.js`, `scripts/generate-sample-data.js`
**Version:** 1.0
**Last Updated:** 2025-04-01

---

## Overview

The Data Management subsystem handles:
1. Loading historical price data from CSV files
2. Calculating statistical measures (mean returns, volatility)
3. Aligning data from multiple sources to overlapping time periods
4. Fetching fresh data from financial APIs
5. Generating synthetic data for offline testing

This is a critical component because accurate historical data is essential for meaningful Monte Carlo simulations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Management Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐     ┌────────────────┐                  │
│  │  Data Loader   │────▶│  Align Data    │                  │
│  │   (CSV Parse)  │     │  (Overlapping) │                  │
│  └────────────────┘     └────────────────┘                  │
│         │                       │                             │
│         │                       ▼                             │
│         │              ┌────────────────┐                    │
│         │              │ tickerStats    │                    │
│         │              │ Object Cache   │                    │
│         │              └────────────────┘                    │
│         │                       │                             │
│         ▼                       ▼                             │
│  ┌──────────────────────────────────────┐                   │
│  │    Statistics for Simulation         │                   │
│  │  • μ (annualized return)             │                   │
│  │  • σ (annualized volatility)         │                   │
│  │  • Aligned historical returns        │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
         │                       │
         ▼                       ▼
┌────────────────┐     ┌────────────────┐
│  CSV Files     │     │  API Fetchers  │
│  (public/data/)│     │  (scripts/)    │
└────────────────┘     └────────────────┘
```

---

## Component 1: Data Loader (`data-loader.js`)

### Purpose
Load CSV files from browser, parse them, and calculate statistics for simulation.

### Key Functions

#### 1. `parseCSV(csvText)`
Parse CSV string into array of price objects.

**Parameters:**
- `csvText` (string): Raw CSV content

**Returns:** `Array<{date: string, close: number}>`

**Algorithm:**
```
1. Split CSV by newlines
2. Skip header row
3. For each line:
   a. Split by comma
   b. Extract date and close price
   c. Parse close as float
4. Return array of {date, close} objects
```

**Example:**
```javascript
const csv = `date,close
2024-01-01,100.50
2024-02-01,102.30`;

const data = parseCSV(csv);
// [{date: '2024-01-01', close: 100.50}, {date: '2024-02-01', close: 102.30}]
```

**Complexity:** O(n) where n = number of rows

---

#### 2. `loadHistoricalData(ticker)`
Load CSV file for a ticker from public/data/ directory.

**Parameters:**
- `ticker` (string): Ticker symbol (e.g., 'VT', 'BTC/USD')

**Returns:** `Promise<Array<{date: string, close: number}>>`

**Algorithm:**
```
1. Convert ticker to filename (e.g., BTC/USD → BTC-USD.csv)
2. Construct URL: /data/{filename}
3. Fetch CSV file
4. If fetch fails, throw descriptive error
5. Parse CSV text
6. Return price data array
```

**Error Handling:**
- Network errors: "Failed to load {filename}: {statusText}"
- Missing files: "Failed to load data for {ticker}"

**Example:**
```javascript
const vtData = await loadHistoricalData('VT');
// [{date: '2008-06-01', close: 45.23}, ...]
```

**Complexity:** O(n) where n = file size

---

#### 3. `calculateLogReturns(prices)`
Calculate log returns from price series.

**Parameters:**
- `prices` (Array): Price data from parseCSV

**Returns:** `Array<number>` - Monthly log returns

**Algorithm:**
```
1. Initialize empty returns array
2. For i from 1 to prices.length - 1:
   a. Get current and previous prices
   b. Validate prices > 0
   c. Calculate: ln(P_t / P_{t-1})
   d. Append to returns array
3. Return returns (length = prices.length - 1)
```

**Mathematical Formula:**
```
r_t = ln(P_t / P_{t-1})

Where:
- r_t = log return at time t
- P_t = price at time t
- ln() = natural logarithm
```

**Why Log Returns:**
- Time-additive: r(0→2) = r(0→1) + r(1→2)
- Normally distributed (Central Limit Theorem)
- Mathematically correct for Geometric Brownian Motion
- Symmetry: 100→50 and 50→100 have equal magnitude

**Error Handling:**
- Invalid prices (≤0): "Invalid price data at index {i}"

**Example:**
```javascript
const prices = [
  {date: '2024-01', close: 100},
  {date: '2024-02', close: 105},
  {date: '2024-03', close: 103}
];

const returns = calculateLogReturns(prices);
// [ln(105/100), ln(103/105)]
// [0.04879, -0.01923]
```

**Complexity:** O(n) where n = number of prices

---

#### 4. `calculateAnnualizedReturn(monthlyReturns)`
Calculate annualized mean return from monthly log returns.

**Parameters:**
- `monthlyReturns` (Array<number>): Monthly log returns

**Returns:** `number` - Annualized return (μ)

**Algorithm:**
```
1. Sum all monthly returns
2. Divide by count to get mean monthly return
3. Multiply by 12 to annualize
4. Return μ
```

**Formula:**
```
μ_annual = (Σ r_i / n) × 12

Where:
- r_i = monthly log return
- n = number of months
- 12 = annualization factor
```

**Example:**
```javascript
const monthlyReturns = [0.01, 0.02, -0.01, 0.015]; // 4 months
const mu = calculateAnnualizedReturn(monthlyReturns);
// mean = (0.01 + 0.02 - 0.01 + 0.015) / 4 = 0.01125
// annualized = 0.01125 × 12 = 0.135 (13.5%)
```

**Edge Cases:**
- Empty array: returns 0
- Single return: (r × 12)

**Complexity:** O(n) where n = number of returns

---

#### 5. `calculateAnnualizedVolatility(monthlyReturns)`
Calculate annualized volatility (standard deviation) from monthly returns.

**Parameters:**
- `monthlyReturns` (Array<number>): Monthly log returns

**Returns:** `number` - Annualized volatility (σ)

**Algorithm:**
```
1. Calculate mean of monthly returns
2. For each return:
   a. Calculate squared deviation from mean
3. Sum squared deviations
4. Divide by count to get variance
5. Take square root to get std dev
6. Multiply by √12 to annualize
7. Return σ
```

**Formula:**
```
σ_monthly = √(Σ(r_i - μ)² / n)
σ_annual = σ_monthly × √12

Where:
- r_i = monthly log return
- μ = mean monthly return
- n = number of months
- √12 ≈ 3.464 = annualization factor
```

**Why √12 for Volatility:**
- Variance scales linearly with time: Var(12 months) = 12 × Var(1 month)
- Std dev scales with √time: σ(12 months) = √12 × σ(1 month)
- This is a property of Brownian motion

**Example:**
```javascript
const monthlyReturns = [0.01, 0.03, -0.01, 0.02];
const sigma = calculateAnnualizedVolatility(monthlyReturns);
// mean = 0.0125
// deviations: [-0.0025, 0.0175, -0.0225, 0.0075]
// squared: [0.00000625, 0.00030625, 0.00050625, 0.00005625]
// variance = 0.000218125
// monthly σ = 0.01477
// annual σ = 0.01477 × 3.464 = 0.0512 (5.12%)
```

**Edge Cases:**
- Empty array: returns 0
- Single return: σ = 0 (no variance)

**Complexity:** O(n) where n = number of returns

---

#### 6. `loadAndProcessTicker(ticker)`
Load data and calculate statistics for a single ticker.

**Parameters:**
- `ticker` (string): Ticker symbol

**Returns:** `Promise<Object>`
```javascript
{
  ticker: string,
  mu: number,        // Annualized return
  sigma: number,     // Annualized volatility
  returns: Array,    // Monthly log returns
  priceData: Array   // {date, close} objects
}
```

**Algorithm:**
```
1. Load CSV via loadHistoricalData()
2. Calculate log returns
3. Calculate μ via calculateAnnualizedReturn()
4. Calculate σ via calculateAnnualizedVolatility()
5. Return object with all data
```

**Example:**
```javascript
const vtStats = await loadAndProcessTicker('VT');
// {
//   ticker: 'VT',
//   mu: 0.0907,      // 9.07%
//   sigma: 0.1523,   // 15.23%
//   returns: [...],  // 199 monthly returns
//   priceData: [...] // 200 price points
// }
```

**Complexity:** O(n) where n = CSV size

---

#### 7. `loadMultipleTickers(tickers, onProgress)`
Load and process data for multiple tickers with progress callback.

**Parameters:**
- `tickers` (Array<string>): Array of ticker symbols
- `onProgress` (Function): Called with (loaded, total)

**Returns:** `Promise<Object>`
```javascript
{
  tickerData: {
    [ticker]: { ticker, mu, sigma, returns, priceData }
  },
  historicalReturns: {
    [ticker]: Array<number>
  }
}
```

**Algorithm:**
```
1. Initialize empty results objects
2. For each ticker:
   a. Load and process ticker
   b. Store in tickerData[ticker]
   c. Store returns in historicalReturns[ticker]
   d. Call onProgress(i+1, total)
3. Return both objects
```

**Example:**
```javascript
let loadedCount = 0;
const data = await loadMultipleTickers(
  ['VT', 'QQQ', 'BND'],
  (loaded, total) => {
    console.log(`Loaded ${loaded}/${total}`);
  }
);

// data.tickerData.VT.mu = 0.0907
// data.historicalReturns.VT = [...]
```

**Complexity:** O(k × n) where k = number of tickers, n = avg CSV size

---

#### 8. `getStatisticsSummary(tickerData)`
Format statistics for display in UI.

**Parameters:**
- `tickerData` (Object): Output from loadMultipleTickers

**Returns:** `Array<Object>`
```javascript
[{
  ticker: string,
  mu: number,
  sigma: number,
  dataPoints: number,
  dateRange: string
}]
```

**Algorithm:**
```
1. For each ticker in tickerData:
   a. Extract first and last dates
   b. Format date range string
   c. Create summary object
2. Return array of summaries
```

**Example:**
```javascript
const summary = getStatisticsSummary(tickerData);
// [{
//   ticker: 'VT',
//   mu: 0.0907,
//   sigma: 0.1523,
//   dataPoints: 200,
//   dateRange: '2008-06 to 2024-12'
// }]
```

**Complexity:** O(k) where k = number of tickers

---

## Component 2: Data Alignment (`align-data.js`)

### Purpose
Align historical data from multiple tickers to overlapping time periods. This is **critical** for accurate correlation calculation.

### Why Alignment is Necessary

**Problem:**
Different tickers have different data ranges:
```
VT:  2008-06 to 2024-12 (200 months)
QQQ: 1999-03 to 2024-12 (310 months)
BND: 2007-04 to 2024-12 (220 months)
```

Correlation requires **equal-length arrays**. Using misaligned data would calculate correlation between different time periods, producing nonsense results.

**Solution:**
Find overlapping dates and recalculate returns on aligned prices.

---

### Key Function

#### `alignHistoricalReturns(tickerStats, tickers)`
Align returns data to common dates across all tickers.

**Parameters:**
- `tickerStats` (Object): Cache of ticker data {ticker: {priceData, returns, ...}}
- `tickers` (Array<string>): Tickers to align

**Returns:** `Object`
```javascript
{
  historicalReturns: {
    [ticker]: Array<number>  // Aligned returns (all same length)
  },
  commonDates: Array<string>,
  dataPoints: number
}
```

**Algorithm:**
```
1. Validate inputs
   - Check tickerStats and tickers exist
   - Check all tickers have priceData and returns

2. Build date map
   For each ticker:
     For each price point:
       allDates[date][ticker] = close

3. Find common dates
   Filter dates where ALL tickers have data
   Sort chronologically
   Validate at least 2 dates

4. Recalculate returns on aligned prices
   For each ticker:
     Extract prices for common dates only
     Calculate log returns on aligned prices
     Store in historicalReturns[ticker]

5. Return {historicalReturns, commonDates, dataPoints}
```

**Detailed Example:**

**Input:**
```javascript
tickerStats = {
  VT: { priceData: [
    {date: '2008-06', close: 45},
    {date: '2008-07', close: 47},
    {date: '2008-08', close: 46}
  ]},
  QQQ: { priceData: [
    {date: '2008-05', close: 80},  // Extra month
    {date: '2008-06', close: 82},
    {date: '2008-07', close: 85},
    {date: '2008-08', close: 83}
  ]}
}
```

**Step 1: Build date map**
```javascript
allDates = {
  '2008-05': { QQQ: 80 },
  '2008-06': { VT: 45, QQQ: 82 },
  '2008-07': { VT: 47, QQQ: 85 },
  '2008-08': { VT: 46, QQQ: 83 }
}
```

**Step 2: Find common dates**
```javascript
commonDates = ['2008-06', '2008-07', '2008-08']
// 2008-05 excluded because VT missing
```

**Step 3: Recalculate returns**
```javascript
VT aligned prices:  [45, 47, 46]
VT aligned returns: [ln(47/45), ln(46/47)] = [0.0435, -0.0215]

QQQ aligned prices:  [82, 85, 83]
QQQ aligned returns: [ln(85/82), ln(83/85)] = [0.0360, -0.0239]

historicalReturns = {
  VT:  [0.0435, -0.0215],
  QQQ: [0.0360, -0.0239]
}
// Both arrays length = 2 ✓
```

**Error Handling:**

1. **Missing ticker data:**
```javascript
throw new Error(`Missing data for ticker: ${ticker}. Data may still be loading.`);
```

2. **No overlapping dates:**
```javascript
if (commonDates.length < 2) {
  throw new Error(
    `Not enough overlapping data points. Found only ${commonDates.length} common dates. Need at least 2.`
  );
}
```

3. **Invalid inputs:**
```javascript
if (!tickerStats || !tickers || tickers.length === 0) {
  throw new Error('Invalid inputs: tickerStats and tickers are required');
}
```

**Console Logging:**
```javascript
console.log(`Data alignment: Found ${commonDates.length} overlapping dates for VT, QQQ`);
console.log(`Date range: 2008-06 to 2024-12`);
```

**Complexity:** O(n × k) where n = avg data points, k = number of tickers

---

## Component 3: Data Fetching Scripts

### `update-data.js`
Node.js script to fetch fresh data from financial APIs.

**Features:**
- Fetches from Twelve Data (primary) or Alpha Vantage (fallback)
- Uses adjusted prices (includes dividends and splits)
- Validates return ranges to detect dividend issues
- Saves to public/data/{ticker}.csv

**Key API Parameters:**

**Twelve Data:**
```javascript
{
  symbol: ticker,
  interval: '1month',
  outputsize: '5000',
  apikey: TWELVE_DATA_API_KEY,
  format: 'JSON',
  adjust: 'all'  // ← Critical for total return
}
```

**Important:** With `adjust=all`, the `close` field contains adjusted prices (not a separate field).

**Alpha Vantage:**
```javascript
{
  function: 'TIME_SERIES_MONTHLY_ADJUSTED',
  symbol: ticker,
  apikey: ALPHA_VANTAGE_API_KEY
}
```

Uses `5. adjusted close` field.

**Validation:**
```javascript
Expected ranges:
VT (stocks):  8-12%
QQQ (tech):   12-18%
BND (bonds):  2.5-4.5%
GLD (gold):   5-10%
BTC (crypto): 50-200%

If outside range:
console.warn(`⚠️  ${ticker}: ${return}% - outside expected range`);
```

**ES Module Structure:**
```javascript
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DataFetcher {
  async fetchFromTwelveData(ticker) { ... }
  async fetchFromAlphaVantage(ticker) { ... }
  async saveToCSV(ticker, prices) { ... }
}
```

---

### `generate-sample-data.js`
Generates synthetic price data for offline testing.

**Algorithm:**
```
1. Define asset parameters (μ, σ, initial price)
2. For each month:
   a. Generate random return ~ N(μ/12, σ/√12)
   b. Apply: Price_t = Price_{t-1} × exp(return)
3. Save to CSV
```

**Limitations:**
- High variance: each run produces different returns
- May not match target μ exactly

**Better version:** `generate-best-sample-data.js`
- Generates 20 candidate paths
- Selects path closest to target μ
- More consistent results

---

## Data Flow

### Loading Data (App Initialization)

```
User adds asset "VT"
         │
         ▼
   loadAndProcessTicker('VT')
         │
         ├──▶ loadHistoricalData('VT')
         │         │
         │         ├──▶ fetch('/data/VT.csv')
         │         └──▶ parseCSV(csvText)
         │
         ├──▶ calculateLogReturns(prices)
         │
         ├──▶ calculateAnnualizedReturn(returns)
         │         └──▶ μ = 0.0907
         │
         └──▶ calculateAnnualizedVolatility(returns)
                   └──▶ σ = 0.1523

Display: VT - 9.07% ± 15.23%
Cache: tickerStats['VT'] = {mu, sigma, returns, priceData}
```

### Alignment Before Simulation

```
User clicks "Run Simulation"
Portfolio: [VT: $600k, QQQ: $300k, BND: $100k]
         │
         ▼
alignHistoricalReturns(tickerStats, ['VT', 'QQQ', 'BND'])
         │
         ├──▶ Build date map for all tickers
         │
         ├──▶ Find common dates: 2008-06 to 2024-12
         │         └──▶ 200 overlapping months
         │
         └──▶ Recalculate returns on aligned prices
                   │
                   └──▶ VT:  [199 aligned returns]
                         QQQ: [199 aligned returns]
                         BND: [199 aligned returns]

Pass to simulation engine →
```

---

## Error Handling

### 1. Network Errors (Data Loading)
```javascript
try {
  const response = await fetch('/data/VT.csv');
  if (!response.ok) {
    throw new Error(`Failed to load VT.csv: ${response.statusText}`);
  }
} catch (error) {
  // Display error to user
  // Show "Data failed to load" message
}
```

### 2. Invalid Price Data
```javascript
if (previousPrice <= 0 || currentPrice <= 0) {
  throw new Error(`Invalid price data at index ${i}`);
}
```

### 3. Missing Ticker Data (Alignment)
```javascript
for (const ticker of tickers) {
  if (!tickerStats[ticker]) {
    throw new Error(`Missing data for ticker: ${ticker}. Data may still be loading.`);
  }
}
```

### 4. Insufficient Overlap
```javascript
if (commonDates.length < 2) {
  const dateInfo = tickers.map(ticker => {
    const dates = tickerStats[ticker].priceData.map(p => p.date);
    return `${ticker}: ${dates[0]} to ${dates[dates.length - 1]}`;
  }).join(', ');

  throw new Error(
    `Not enough overlapping data. ${dateInfo}. ` +
    `Found only ${commonDates.length} common dates. Need at least 2.`
  );
}
```

---

## Performance Characteristics

### Data Loading
| Operation | Complexity | Typical Time |
|-----------|------------|--------------|
| Load single CSV (200 rows) | O(n) | ~30ms |
| Parse CSV | O(n) | ~5ms |
| Calculate returns | O(n) | ~2ms |
| Calculate μ, σ | O(n) | ~1ms |
| Load 6 tickers | O(6n) | ~200ms |

### Data Alignment
| Operation | Complexity | Typical Time |
|-----------|------------|--------------|
| Build date map (3 tickers × 200 points) | O(kn) | ~5ms |
| Find common dates | O(n) | ~2ms |
| Recalculate returns (3 tickers × 199 returns) | O(kn) | ~8ms |
| **Total alignment** | O(kn) | ~15ms |

**Where:**
- n = average data points per ticker (~200)
- k = number of tickers (typically 3-6)

---

## Testing

### Unit Tests (Would be in `data-loader.test.js`)

**parseCSV:**
- ✓ Parses valid CSV correctly
- ✓ Skips header row
- ✓ Handles trailing newlines
- ✓ Converts close to float

**calculateLogReturns:**
- ✓ Calculates returns correctly
- ✓ Throws on zero/negative prices
- ✓ Returns n-1 returns for n prices

**calculateAnnualizedReturn:**
- ✓ Annualizes correctly (× 12)
- ✓ Handles empty array
- ✓ Handles single return

**calculateAnnualizedVolatility:**
- ✓ Annualizes correctly (× √12)
- ✓ Handles empty array
- ✓ Matches expected σ for known data

### Integration Tests

**Real data:**
```bash
npm run update-data
# Fetches VT, QQQ, AVUV, BND, GLD, BTC-USD
# Validates returns in expected ranges
```

**Alignment:**
```javascript
// Test with real CSVs of different lengths
const tickerStats = {
  VT: { priceData: [...200 points...] },
  QQQ: { priceData: [...310 points...] },
  BND: { priceData: [...220 points...] }
};

const { historicalReturns, dataPoints } = alignHistoricalReturns(
  tickerStats,
  ['VT', 'QQQ', 'BND']
);

// All arrays should have same length
assert(historicalReturns.VT.length === historicalReturns.QQQ.length);
assert(historicalReturns.VT.length === historicalReturns.BND.length);
assert(dataPoints >= 199); // Expect ~200 overlapping months
```

---

## Dependencies

### Internal
- None (pure JavaScript)

### External (for scripts)
- `fs` - File system operations
- `https` - API requests
- `path` - File path manipulation

### Browser APIs
- `fetch()` - Load CSV files
- `Math.log()` - Log returns
- `Math.sqrt()` - Volatility calculation

---

## Integration Points

### With Simulation Engine
```javascript
// App.jsx orchestration
const uniqueTickers = [...new Set(portfolio.map(a => a.ticker))];

// 1. Load data
const tickerStats = {};
for (const ticker of uniqueTickers) {
  tickerStats[ticker] = await loadAndProcessTicker(ticker);
}

// 2. Align data
const { historicalReturns } = alignHistoricalReturns(tickerStats, uniqueTickers);

// 3. Run simulation
await runSimulation({
  portfolio,
  phases,
  historicalReturns  // ← Aligned returns passed here
});
```

### With UI Components
```javascript
// PortfolioSetup.jsx
useEffect(() => {
  async function loadData() {
    const stats = await loadAndProcessTicker(ticker);
    setTickerStats(prev => ({ ...prev, [ticker]: stats }));
  }
  loadData();
}, [ticker]);

// Display μ and σ in UI
{tickerStats[ticker] && (
  <div>
    μ: {(tickerStats[ticker].mu * 100).toFixed(2)}%
    σ: {(tickerStats[ticker].sigma * 100).toFixed(2)}%
  </div>
)}
```

---

## Design Decisions

### 1. CSV Format (Not JSON)
**Rationale:**
- ✅ Simpler, more portable
- ✅ Easy to inspect/edit
- ✅ Smaller file size
- ✅ Standard financial data format

**Trade-off:**
- ❌ Requires parsing (but parseCSV is trivial)

### 2. Monthly Data (Not Daily)
**Rationale:**
- ✅ Sufficient for retirement planning (decades)
- ✅ Smaller files (200 points vs 5000)
- ✅ Fewer API calls
- ✅ Less noise

**Trade-off:**
- ❌ Cannot model intra-month dynamics
- ✅ Not important for long-term planning

### 3. Adjusted Prices (Total Return)
**Rationale:**
- ✅ Includes dividends and splits
- ✅ More accurate portfolio projections
- ✅ Critical for bonds (yields are 75% of return)

**Implementation:**
- Twelve Data: `adjust=all` parameter
- Alpha Vantage: `5. adjusted close` field

### 4. Alignment on Overlapping Dates (Not Padding)
**Rationale:**
- ✅ Uses real historical relationships
- ✅ Avoids artificial correlations
- ✅ More accurate than assuming uncorrelated

**Alternative considered:**
- Pad missing dates with synthetic data
- ❌ Creates spurious correlations
- ❌ Less accurate

### 5. Log Returns (Not Simple Returns)
**Rationale:**
- ✅ Time-additive
- ✅ Normally distributed
- ✅ Correct for Geometric Brownian Motion
- ✅ Symmetric (50% loss ≠ 50% gain)

**Formula:** r = ln(P_t / P_{t-1})

---

## Future Enhancements

### Phase 2
- [ ] **Custom CSV Upload** - Allow users to upload their own data
- [ ] **Daily Data Option** - For shorter-term analysis
- [ ] **Real-time Caching** - Cache API responses to reduce calls
- [ ] **Data Versioning** - Track when data was last updated
- [ ] **Multi-currency Support** - Handle non-USD assets

### Technical Debt
- [ ] Add unit tests for all data-loader functions
- [ ] Add integration test for alignment with real CSVs
- [ ] Implement retry logic for API failures
- [ ] Add progress indicators for slow loads
- [ ] Optimize CSV parsing for large files

---

## References

**Files:**
- `src/lib/data-loader.js` - Core data loading
- `src/lib/align-data.js` - Data alignment
- `scripts/update-data.js` - API fetcher
- `scripts/generate-sample-data.js` - Synthetic data

**Documentation:**
- [`DIVIDENDS.md`](../DIVIDENDS.md) - Dividend inclusion guide
- [`TESTING_REAL_DATA.md`](../TESTING_REAL_DATA.md) - Testing with real APIs
- [`API_RESEARCH.md`](../API_RESEARCH.md) - API options and parameters

**External:**
- Twelve Data API: https://twelvedata.com/docs
- Alpha Vantage API: https://www.alphavantage.co/documentation

---

**Last Updated:** 2025-04-01
**Version:** 1.0
