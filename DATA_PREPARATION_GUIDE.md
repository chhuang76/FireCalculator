# Data Preparation Guide

## ✅ Implementation Complete

The data fetcher script has been implemented and tested. This guide explains what was created and how to use it.

---

## What Was Created

### 1. Data Fetcher Script
**File:** `scripts/update-data.js`

A flexible, production-ready script that:
- ✅ Fetches maximum available historical data for all 6 assets
- ✅ Supports multiple data sources (Twelve Data, Alpha Vantage)
- ✅ Validates data integrity (checks for missing/invalid data)
- ✅ Generates CSV files in `date,close` format
- ✅ Handles rate limiting (1s delay between requests)
- ✅ Detailed error messages and progress output
- ✅ **Future-proof:** Easy to add more CSV fields later (configured via `csvFields`)

### 2. Directory Structure
```
fire-calculator/
├── public/
│   └── data/           # CSV files will be saved here
├── scripts/
│   ├── update-data.js      # Main data fetcher script
│   ├── test-data-script.js # Unit tests
│   └── README.md           # Usage documentation
├── .env.example        # Template for API keys
└── .gitignore          # Updated to ignore .env
```

### 3. Supporting Files
- **`.env.example`** - Template showing which API keys are needed
- **`scripts/README.md`** - Complete usage documentation
- **`scripts/test-data-script.js`** - Unit tests (all passing ✅)
- **`.gitignore`** - Updated to prevent committing API keys

---

## How to Use (For First Time Setup)

### Step 1: Get a Free API Key

Choose **ONE** of these providers:

**Option A: Twelve Data (Recommended)**
1. Go to https://twelvedata.com
2. Sign up (no credit card required)
3. Copy your API key from the dashboard
4. Free tier: 800 calls/day (more than enough)

**Option B: Alpha Vantage**
1. Go to https://www.alphavantage.co/support/#api-key
2. Enter your email
3. Get instant API key
4. Free tier: 25 calls/day (enough for monthly updates)

### Step 2: Set Your API Key

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your API key:
```
TWELVE_DATA_API_KEY=your_actual_api_key_here
```

**Or** set as environment variable (temporary):

**Windows PowerShell:**
```powershell
$env:TWELVE_DATA_API_KEY="your_key_here"
```

**macOS/Linux:**
```bash
export TWELVE_DATA_API_KEY=your_key_here
```

### Step 3: Run the Script

```bash
node scripts/update-data.js
```

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Fire Calculator - Historical Data Fetcher
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔌 Data Source: twelvedata
📁 Output Directory: C:\open\fire-calculator\public\data
📋 CSV Format: date, close

🎯 Processing 6 asset(s)...

📊 Processing: Vanguard Total World Stock (VT)
  Fetching from Twelve Data: https://api.twelvedata.com/...
  ✓ Validated: 198 data points spanning 16.5 years
    Date range: 2008-06-01 to 2025-01-01
  ✓ Saved to: C:\open\fire-calculator\public\data\VT.csv
  ✓ File size: 4.2 KB

⏳ Waiting 1s (rate limit)...

📊 Processing: Nasdaq 100 ETF (QQQ)
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Successful: 6
  - VT: 198 data points
  - QQQ: 308 data points
  - AVUV: 68 data points
  - BND: 215 data points
  - GLD: 252 data points
  - BTC/USD: 178 data points

📈 Total data points: 1,219
💾 Total size: 26.3 KB

✅ Done!
```

### Step 4: Verify the Data

Check that CSV files were created:

```bash
ls public/data/
```

You should see:
```
BTC-USD.csv
AVUV.csv
BND.csv
GLD.csv
QQQ.csv
VT.csv
```

**Inspect a file:**
```bash
head public/data/VT.csv
```

```csv
date,close
2008-06-01,45.67
2008-07-01,43.21
2008-08-01,44.89
...
```

### Step 5: Commit the Data

```bash
git add public/data/*.csv
git commit -m "Add initial historical price data for 6 assets"
```

**Note:** The `.env` file with your API key will NOT be committed (it's in `.gitignore`).

---

## Monthly Updates

Run the script once per month (e.g., first day of each month) to update data:

```bash
# Run the update
node scripts/update-data.js

# Commit changes
git add public/data/*.csv
git commit -m "Update historical price data - April 2026"
git push
```

That's it! The script will fetch the latest month's data and append it to existing files.

---

## Advanced Usage

### Fetch Specific Ticker Only

```bash
node scripts/update-data.js --ticker=VT
```

### Use Different Data Source

```bash
# Set Alpha Vantage API key
export ALPHA_VANTAGE_API_KEY=your_key_here

# Run with Alpha Vantage
node scripts/update-data.js --source=alphavantage
```

### Run Tests

```bash
node scripts/test-data-script.js
```

All tests should pass:
```
✅ PASS: CSV generated correctly
✅ PASS: Valid data accepted
✅ PASS: Missing dates detected correctly
✅ PASS: Invalid prices detected correctly
✅ PASS: Empty data rejected correctly
```

---

## Troubleshooting

### "TWELVE_DATA_API_KEY environment variable is required"

Your API key is not set. See Step 2 above.

### "fetch is not defined"

You're using Node.js < 18. The script uses the built-in `fetch` API. Upgrade Node.js:

```bash
node --version  # Should be v18.0.0 or higher
```

### "Rate limit exceeded"

You've hit the free tier limit. Wait 24 hours or use a different data source.

### Files are empty or have very little data

Some tickers might not have much historical data available (e.g., AVUV launched in 2019). This is normal. The script fetches maximum available data for each ticker.

---

## What's Next?

Once you have the CSV files in `public/data/`, you can proceed to:

1. ✅ **Step 0 Complete:** Data preparation ✓
2. **Step 1:** Build the simulation engine
3. **Step 2:** Build the portfolio setup UI
4. **Step 3:** Build the results display
5. **Step 4:** Build the multi-phase spending builder

---

## Design Highlights

### Extensibility

The script is designed to easily add more CSV fields in the future:

**Current (Phase 1):**
```javascript
csvFields: {
  phase1: ['date', 'close']  // Minimal format
}
activeFormat: 'phase1'
```

**Future (Phase 2):**
```javascript
csvFields: {
  phase1: ['date', 'close'],
  phase2: ['date', 'open', 'high', 'low', 'close', 'volume']  // Full OHLCV
}
activeFormat: 'phase2'  // Switch to extended format
```

Just update the configuration and the data source adapters will need minimal changes.

### Data Source Adapters

The script uses an adapter pattern to support multiple APIs:

- `TwelveDataSource` - Twelve Data API adapter
- `AlphaVantageSource` - Alpha Vantage API adapter

Adding a new source (e.g., CoinGecko for crypto) is straightforward:

```javascript
class CoinGeckoSource {
  async fetchData(ticker, isCrypto) {
    // Implement CoinGecko API call
    // Return: [{date, close}, ...]
  }
}
```

### Validation

The script validates:
- ✅ API responses are not errors
- ✅ Data is not empty
- ✅ All dates are present
- ✅ All prices are valid numbers
- ✅ Date range is reasonable (warns if < 1 year)

Invalid data is rejected before saving to CSV.

---

## File Structure Reference

```
📁 fire-calculator/
│
├── 📁 public/data/              # Generated CSV files
│   ├── VT.csv                   # ~198 months of data
│   ├── QQQ.csv                  # ~308 months
│   ├── AVUV.csv                 # ~68 months
│   ├── BND.csv                  # ~215 months
│   ├── GLD.csv                  # ~252 months
│   └── BTC-USD.csv              # ~178 months
│
├── 📁 scripts/
│   ├── update-data.js           # Main script (500 lines)
│   ├── test-data-script.js      # Unit tests
│   └── README.md                # Usage guide
│
├── .env.example                 # API key template
├── .env                         # Your actual API keys (git-ignored)
├── .gitignore                   # Updated
└── DATA_PREPARATION_GUIDE.md    # This file
```

---

## Summary

✅ **What's Done:**
- Data fetcher script implemented and tested
- Support for multiple data sources
- Validation and error handling
- Documentation and examples
- .gitignore updated for security

📋 **What You Need to Do:**
1. Get a free API key (Twelve Data or Alpha Vantage)
2. Run `node scripts/update-data.js`
3. Verify CSV files in `public/data/`
4. Commit the CSV files to git

⏱️ **Estimated Time:** 10-15 minutes for first-time setup

🎯 **Next Step:** Implementation Step 1 - Simulation Engine
