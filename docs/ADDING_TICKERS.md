# Adding New Tickers to FIRE Calculator

This guide explains how to add new asset tickers (ETFs, stocks, crypto) to the FIRE Calculator.

---

## Overview

Adding a new ticker requires updating **2 files**:

1. **`src/components/PortfolioSetup.jsx`** - Add to UI dropdown
2. **`scripts/update-data.js`** - Configure data fetching and validation

Then fetch the historical data and test in the UI.

---

## Step 1: Add Ticker to UI Dropdown

**File:** `src/components/PortfolioSetup.jsx`

**Location:** Lines 5-13 (near top of file)

**Add to the `AVAILABLE_TICKERS` array:**

```javascript
const AVAILABLE_TICKERS = [
  { value: '', label: '-- Select Ticker --' },
  { value: 'VT', label: 'VT - Vanguard Total World Stock' },
  { value: 'QQQ', label: 'QQQ - Invesco QQQ Trust' },
  { value: 'AVUV', label: 'AVUV - Avantis U.S. Small Cap Value' },
  { value: 'BND', label: 'BND - Vanguard Total Bond Market' },
  { value: 'GLD', label: 'GLD - SPDR Gold Trust' },
  { value: 'BTC/USD', label: 'BTC/USD - Bitcoin' },
  { value: 'YOUR_TICKER', label: 'YOUR_TICKER - Your Description' }  // ← Add here
];
```

**Field Descriptions:**
- `value`: Ticker symbol exactly as it appears in financial APIs
- `label`: Display text in dropdown (format: "TICKER - Description")

**Special Cases:**
- **Crypto pairs:** Use forward slash (e.g., `BTC/USD`)
  - Will be converted to `BTC-USD.csv` automatically
- **International stocks:** Use local ticker symbol (e.g., `VWRL.L` for London)

---

## Step 2: Configure Data Fetching

**File:** `scripts/update-data.js`

### A. Add to Assets Array

**Location:** Line ~127

```javascript
// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../public/data'),
  defaultSource: 'twelvedata',

  // Assets to fetch (ticker symbol and optional config)
  assets: [
    { ticker: 'VT', name: 'Vanguard Total World Stock' },
    { ticker: 'QQQ', name: 'Nasdaq 100 ETF' },
    { ticker: 'AVUV', name: 'Avantis US Small Cap Value' },
    { ticker: 'BND', name: 'Vanguard Total Bond Market' },
    { ticker: 'GLD', name: 'SPDR Gold Shares' },
    { ticker: 'BTC/USD', name: 'Bitcoin', isCrypto: true },
    { ticker: 'YOUR_TICKER', name: 'Your Asset Name' }  // ← Add here
  ],
```

**Field Descriptions:**
- `ticker`: Ticker symbol (must match UI dropdown)
- `name`: Human-readable name (for logging)
- `isCrypto`: (Optional) Set to `true` for cryptocurrency pairs

### B. Add Start Date Filter (Optional)

**File:** `src/lib/data-loader.js`

**Location:** Lines 8-14 (near top of file)

For tickers with early, non-representative data (e.g., Bitcoin's price discovery phase 2009-2016), you can exclude historical data before a specified date:

```javascript
const TICKER_START_DATES = {
  'BTC/USD': '2017-01-01',  // Exclude early BTC price discovery phase (2009-2016)
  'YOUR_TICKER': 'YYYY-MM-DD',  // ← Add here if needed
};
```

**When to use:**
- Cryptocurrency with extreme early volatility
- Assets that underwent major structural changes
- ETFs with insufficient early liquidity

**Example:** Bitcoin before 2017 had extreme returns (10,000%+) that aren't representative of its behavior as a more mature asset. Filtering to 2017+ gives more realistic forward-looking statistics.

**Note:** The script will log the filtering:
```
[BTC/USD] Filtered data: 189 → 96 points (from 2017-01-01)
```

### C. Add Validation Range (Recommended)

**Location:** Line ~597

```javascript
// Expected returns for validation (with dividends included)
const expectedReturns = {
  'VT': { min: 0.07, max: 0.10, name: 'Total World Stock' },
  'QQQ': { min: 0.11, max: 0.15, name: 'Nasdaq 100' },
  'BND': { min: 0.025, max: 0.045, name: 'Total Bond Market' },
  'AVUV': { min: 0.09, max: 0.13, name: 'Small Cap Value' },
  'GLD': { min: 0.04, max: 0.08, name: 'Gold' },
  'YOUR_TICKER': { min: 0.06, max: 0.10, name: 'Your Asset' }  // ← Add here
};
```

**Field Descriptions:**
- `min`: Minimum expected annualized return (as decimal, e.g., 0.06 = 6%)
- `max`: Maximum expected annualized return
- `name`: Asset name (for warning messages)

**Why This Matters:**
- Script warns if actual returns fall outside this range
- Helps detect missing dividends or bad data
- Use historical averages or reasonable estimates

**How to Estimate:**

| Asset Type | Typical Range |
|------------|---------------|
| U.S. Stocks (S&P 500) | 9-12% |
| International Stocks | 7-10% |
| Small Cap Value | 10-14% |
| Bonds (Total Market) | 2.5-4.5% |
| Gold | 4-8% |
| Real Estate (REITs) | 8-11% |
| Crypto (Bitcoin) | 50-200% (highly volatile) |

**If unsure:** Run the script first, check the actual return, then add validation.

---

## Step 3: Fetch Historical Data

### Run the Update Script

```bash
npm run update-data
```

**What it does:**
1. Connects to Twelve Data API (or Alpha Vantage as fallback)
2. Fetches maximum available monthly data for your ticker
3. Includes dividend adjustments (`adjust=all` parameter)
4. Saves to `public/data/YOUR_TICKER.csv`
5. Validates returns against expected range

### Expected Output

```
📊 FIRE Calculator - Historical Data Fetcher
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Using API: Twelve Data
API Key: ************************************f40b9

Assets to fetch: VT, QQQ, AVUV, BND, GLD, BTC/USD, YOUR_TICKER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fetching: YOUR_TICKER (Your Asset Name)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: twelvedata
✓ Using 'close' field (adjusted with adjust=all parameter)
  Includes dividends and splits
✓ Data points: 200
✓ Date range: 2010-01 to 2024-12
✓ Annualized return: 8.45%
✓ Saved to: public/data/YOUR_TICKER.csv

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Validation Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR_TICKER (Your Asset): 8.45% ✓ (expected 6.0-10.0%)

✅ All returns within expected ranges!
```

### Fetch Single Ticker (Optional)

If you only want to update one ticker:

```bash
npm run update-data -- --ticker=YOUR_TICKER
```

---

## Step 4: Verify the CSV File

### Check the File

```bash
cat public/data/YOUR_TICKER.csv
```

**Expected format:**

```csv
date,close
2010-01-01,45.23
2010-02-01,46.78
2010-03-01,47.12
...
2024-12-01,156.89
```

**Validation checklist:**
- ✅ File exists in `public/data/`
- ✅ Has `date,close` header
- ✅ Dates are in `YYYY-MM-DD` format
- ✅ Prices are positive numbers
- ✅ No missing months (continuous data)

### Common Issues

**Issue 1: Empty or missing file**
- **Cause:** Invalid ticker symbol or API error
- **Fix:** Check ticker symbol spelling, verify API key

**Issue 2: Returns too low (< 2%)**
- **Cause:** Dividends not included
- **Fix:** Verify `adjust=all` parameter is set in API call

**Issue 3: Returns too high or volatile**
- **Cause:** Crypto or leveraged ETF
- **Fix:** Adjust validation range in `expectedReturns`

**Issue 4: Rate limit error**
- **Cause:** Too many API calls
- **Fix:** Wait 1 minute, then retry

---

## Step 5: Test in UI

### Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### Test the New Ticker

1. **Find in dropdown:**
   - Click "Portfolio Setup"
   - Click "+ Add Asset"
   - Open ticker dropdown
   - Your ticker should appear: "YOUR_TICKER - Your Description"

2. **Select ticker:**
   - Choose your ticker from dropdown
   - Wait for "Loading..." to complete
   - Should display μ and σ values

   **Example:**
   ```
   Ticker: YOUR_TICKER - Your Description
   Value:  $100,000
   Weight: 100%
   Return: 8.45%    ← Should appear
   Volatility: 15.23%  ← Should appear
   ```

3. **Check for errors:**
   - If shows "Error" instead of statistics:
     - Open browser console (F12)
     - Check for error message
     - Common: "Failed to load YOUR_TICKER.csv"
     - Fix: Verify CSV file exists in `public/data/`

4. **Run a test simulation:**
   - Add spending phase: $40k/30 years
   - Set inflation: 3%
   - Click "Run Simulation"
   - Should complete successfully
   - Check correlation with other tickers

### Expected Behavior

**Loading:**
```
Ticker: YOUR_TICKER
Value:  $100,000
Weight: 100%
Return: Loading...     ← Briefly shows
Volatility: Loading...
```

**Loaded:**
```
Ticker: YOUR_TICKER
Value:  $100,000
Weight: 100%
Return: 8.45%          ← Data from CSV
Volatility: 15.23%     ← Calculated from returns
```

**Error:**
```
Ticker: YOUR_TICKER
Value:  $100,000
Weight: 100%
Return: Error          ← Red text
Volatility: Error

Error: Failed to load YOUR_TICKER: Network error
```

---

## Complete Example: Adding VOO (S&P 500 ETF)

### Step 1: Add to UI Dropdown

**File:** `src/components/PortfolioSetup.jsx`

```javascript
const AVAILABLE_TICKERS = [
  { value: '', label: '-- Select Ticker --' },
  { value: 'VT', label: 'VT - Vanguard Total World Stock' },
  { value: 'QQQ', label: 'QQQ - Invesco QQQ Trust' },
  { value: 'AVUV', label: 'AVUV - Avantis U.S. Small Cap Value' },
  { value: 'BND', label: 'BND - Vanguard Total Bond Market' },
  { value: 'GLD', label: 'GLD - SPDR Gold Trust' },
  { value: 'BTC/USD', label: 'BTC/USD - Bitcoin' },
  { value: 'VOO', label: 'VOO - Vanguard S&P 500 ETF' }  // ← New
];
```

### Step 2: Add to Data Script

**File:** `scripts/update-data.js`

**Assets array (line ~127):**
```javascript
assets: [
  { ticker: 'VT', name: 'Vanguard Total World Stock' },
  { ticker: 'QQQ', name: 'Nasdaq 100 ETF' },
  { ticker: 'AVUV', name: 'Avantis US Small Cap Value' },
  { ticker: 'BND', name: 'Vanguard Total Bond Market' },
  { ticker: 'GLD', name: 'SPDR Gold Shares' },
  { ticker: 'BTC/USD', name: 'Bitcoin', isCrypto: true },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF' }  // ← New
],
```

**Validation (line ~597):**
```javascript
const expectedReturns = {
  'VT': { min: 0.07, max: 0.10, name: 'Total World Stock' },
  'QQQ': { min: 0.11, max: 0.15, name: 'Nasdaq 100' },
  'BND': { min: 0.025, max: 0.045, name: 'Total Bond Market' },
  'AVUV': { min: 0.09, max: 0.13, name: 'Small Cap Value' },
  'GLD': { min: 0.04, max: 0.08, name: 'Gold' },
  'VOO': { min: 0.09, max: 0.12, name: 'S&P 500' }  // ← New
};
```

### Step 3: Fetch Data

```bash
npm run update-data -- --ticker=VOO
```

### Step 4: Verify

```bash
ls -lh public/data/VOO.csv
cat public/data/VOO.csv | head -5
```

Expected:
```csv
date,close
2010-09-01,86.45
2010-10-01,89.12
2010-11-01,88.76
2010-12-01,92.34
```

### Step 5: Test

```bash
npm run dev
```

1. Open http://localhost:3000
2. Add asset → Select "VOO - Vanguard S&P 500 ETF"
3. Enter value: $500,000
4. Verify μ ≈ 10-11%, σ ≈ 15-17%
5. Run test simulation

---

## Special Cases

### Adding Cryptocurrency (e.g., ETH/USD)

**UI Dropdown:**
```javascript
{ value: 'ETH/USD', label: 'ETH/USD - Ethereum' }
```

**Data Script:**
```javascript
// Assets
{ ticker: 'ETH/USD', name: 'Ethereum', isCrypto: true }

// Validation (very wide range for crypto)
'ETH/USD': { min: 0.50, max: 3.00, name: 'Ethereum' }
```

**Start Date Filter (Optional):**
```javascript
// src/lib/data-loader.js
const TICKER_START_DATES = {
  'BTC/USD': '2017-01-01',  // Already configured
  'ETH/USD': '2018-01-01',  // Exclude early ICO phase
};
```

**CSV Filename:** Automatically becomes `ETH-USD.csv`

**Note:** Bitcoin (BTC/USD) already has start date filtering configured to exclude 2009-2016 data, which had extreme, non-representative returns during the price discovery phase.

### Adding International ETF (e.g., VEU)

**UI Dropdown:**
```javascript
{ value: 'VEU', label: 'VEU - Vanguard FTSE All-World ex-US' }
```

**Data Script:**
```javascript
// Assets
{ ticker: 'VEU', name: 'FTSE All-World ex-US' }

// Validation
'VEU': { min: 0.06, max: 0.09, name: 'International Stocks' }
```

### Adding Bond Ladder (e.g., VGIT)

**UI Dropdown:**
```javascript
{ value: 'VGIT', label: 'VGIT - Vanguard Intermediate-Term Treasury' }
```

**Data Script:**
```javascript
// Assets
{ ticker: 'VGIT', name: 'Intermediate-Term Treasury' }

// Validation (conservative bond returns)
'VGIT': { min: 0.02, max: 0.04, name: 'Intermediate Treasury' }
```

---

## Troubleshooting

### Ticker Not Appearing in Dropdown

**Check:**
1. Spelling in `AVAILABLE_TICKERS` array
2. Saved `PortfolioSetup.jsx` file
3. Restarted dev server (`npm run dev`)
4. Browser cache (hard refresh: Ctrl+Shift+R)

### Data Fetch Failed

**Error: "Invalid ticker"**
- Verify ticker exists on Twelve Data
- Try Alpha Vantage: `npm run update-data -- --source=alphavantage --ticker=YOUR_TICKER`

**Error: "API rate limit"**
- Free tier: 800 calls/day (Twelve Data), 25/day (Alpha Vantage)
- Wait 1 minute between fetches
- Use `--ticker=` flag to fetch one at a time

**Error: "No data returned"**
- Ticker may be too new (< 1 year of history)
- Try different API source
- Check ticker spelling

### Returns Look Wrong

**Too low (< 2%):**
- Dividends missing → Check `adjust=all` parameter
- Re-run: `npm run update-data -- --ticker=YOUR_TICKER`

**Too high (> 30% for stocks):**
- Check if leveraged ETF (3X, 2X)
- Adjust validation range
- Verify data is monthly (not daily)

**Negative returns:**
- Recent bear market (2022 for bonds)
- Increase historical data range
- Check if ticker is inverse ETF

### Statistics Not Loading in UI

**Console shows: "Failed to load YOUR_TICKER.csv"**

1. Verify file exists:
   ```bash
   ls public/data/YOUR_TICKER.csv
   ```

2. Check file format:
   ```bash
   head -3 public/data/YOUR_TICKER.csv
   ```
   Should show: `date,close` header

3. Restart dev server:
   ```bash
   npm run dev
   ```

4. Clear browser cache

---

## API Key Setup (If Needed)

If you don't have an API key yet:

### Twelve Data (Recommended)

1. Sign up: https://twelvedata.com
2. Free tier: 800 API calls/day
3. Copy API key
4. Add to `.env`:
   ```
   TWELVE_DATA_API_KEY=your_key_here
   ```

### Alpha Vantage (Fallback)

1. Sign up: https://www.alphavantage.co/support/#api-key
2. Free tier: 25 API calls/day
3. Copy API key
4. Add to `.env`:
   ```
   ALPHA_VANTAGE_API_KEY=your_key_here
   ```

### Use Specific API

```bash
# Use Twelve Data
npm run update-data -- --source=twelvedata --ticker=YOUR_TICKER

# Use Alpha Vantage
npm run update-data -- --source=alphavantage --ticker=YOUR_TICKER
```

---

## Best Practices

### 1. Test Before Committing

Always test new tickers in the UI before committing:
```bash
npm run dev
# Test ticker selection
# Run test simulation
# Verify statistics look reasonable
```

### 2. Add Validation Ranges

Don't skip the `expectedReturns` validation:
- Catches dividend issues early
- Documents expected behavior
- Helps future maintainers

### 3. Document Custom Tickers

If adding unusual tickers (e.g., sector ETFs, leveraged funds), add a comment:

```javascript
// Specialized sector ETF - higher volatility expected
{ ticker: 'XLK', name: 'Technology Select Sector SPDR' }
```

### 4. Keep Tickers Sorted

Maintain alphabetical order (except BTC/crypto at end):
```javascript
const AVAILABLE_TICKERS = [
  { value: '', label: '-- Select Ticker --' },
  { value: 'AVUV', label: '...' },
  { value: 'BND', label: '...' },
  { value: 'GLD', label: '...' },
  { value: 'QQQ', label: '...' },
  { value: 'VOO', label: '...' },  // ← Alphabetical
  { value: 'VT', label: '...' },
  { value: 'BTC/USD', label: '...' }  // ← Crypto last
];
```

### 5. Verify Adjusted Prices

Always check that dividends are included:
```bash
# Check validation output
npm run update-data -- --ticker=YOUR_TICKER

# Look for:
✓ Annualized return: 9.45%  ← Should be reasonable
⚠️ Return too low (2.3%), dividends may be missing  ← Warning
```

---

## Quick Reference

### Files to Edit

```
src/components/PortfolioSetup.jsx   → Add to AVAILABLE_TICKERS array
scripts/update-data.js              → Add to assets array + validation
```

### Commands

```bash
# Fetch all tickers
npm run update-data

# Fetch single ticker
npm run update-data -- --ticker=YOUR_TICKER

# Use specific API
npm run update-data -- --source=twelvedata --ticker=YOUR_TICKER

# Test in UI
npm run dev
```

### Validation

```bash
# Verify CSV exists
ls public/data/YOUR_TICKER.csv

# Check format
head -5 public/data/YOUR_TICKER.csv

# Expected:
# date,close
# 2010-01-01,45.23
# 2010-02-01,46.78
```

---

## Summary Checklist

- [ ] Add ticker to `PortfolioSetup.jsx` AVAILABLE_TICKERS array
- [ ] Add ticker to `update-data.js` assets array
- [ ] Add validation range to `update-data.js` expectedReturns
- [ ] Run `npm run update-data -- --ticker=YOUR_TICKER`
- [ ] Verify CSV file created in `public/data/`
- [ ] Check validation output (returns in expected range)
- [ ] Start dev server: `npm run dev`
- [ ] Test ticker selection in UI
- [ ] Verify μ and σ display correctly
- [ ] Run test simulation
- [ ] Commit changes to git

---

**Questions?** See the [Data Management TDD](tdd/data-management.md) for details on how CSV data is loaded and processed.

**Last Updated:** 2025-04-01
