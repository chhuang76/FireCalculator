# Data Fetcher Scripts

This directory contains scripts for fetching and updating historical price data for the Fire Calculator.

## Quick Start

### 1. Get an API Key

Choose one of these free API providers:

**Option A: Twelve Data (Recommended)**
- Sign up at https://twelvedata.com (no credit card required)
- Free tier: 800 API calls/day
- Get your API key from the dashboard

**Option B: Alpha Vantage**
- Sign up at https://www.alphavantage.co/support/#api-key
- Free tier: 25 API calls/day (very limited)
- Get your API key instantly

### 2. Set Environment Variable

**On Windows (PowerShell):**
```powershell
$env:TWELVE_DATA_API_KEY="your_api_key_here"
```

**On Windows (CMD):**
```cmd
set TWELVE_DATA_API_KEY=your_api_key_here
```

**On macOS/Linux:**
```bash
export TWELVE_DATA_API_KEY=your_api_key_here
```

**Or create a `.env` file in the project root:**
```
TWELVE_DATA_API_KEY=your_api_key_here
```

### 3. Install Dependencies

The script uses Node.js built-in `fetch` (Node 18+). No external dependencies needed!

Make sure you have Node.js 18 or later:
```bash
node --version  # Should be v18.0.0 or higher
```

### 4. Run the Script

**Fetch all assets:**
```bash
node scripts/update-data.js
```

**Fetch specific ticker:**
```bash
node scripts/update-data.js --ticker=VT
```

**Use different data source:**
```bash
# Alpha Vantage (slower, requires ALPHA_VANTAGE_API_KEY)
node scripts/update-data.js --source=alphavantage
```

## What It Does

1. **Fetches maximum available historical data** for each ticker (varies by asset age)
2. **Validates data integrity** (checks for missing dates, invalid prices)
3. **Generates CSV files** in `public/data/` directory
4. **Respects rate limits** (1 second delay between requests)

## Output

CSV files are saved to `public/data/`:

```
public/data/
├── VT.csv      (~20 KB, ~200 months of data)
├── QQQ.csv     (~30 KB, ~300 months of data)
├── AVUV.csv    (~8 KB, ~70 months of data)
├── BND.csv     (~25 KB, ~210 months of data)
├── GLD.csv     (~28 KB, ~250 months of data)
└── BTC-USD.csv (~20 KB, ~180 months of data)
```

**CSV Format (Phase 1):**
```csv
date,close
2015-01-01,45.67
2015-02-01,46.01
2015-03-01,46.89
```

## Troubleshooting

### "TWELVE_DATA_API_KEY environment variable is required"

You haven't set your API key. See step 2 above.

### "Alpha Vantage rate limit exceeded"

Alpha Vantage free tier only allows 25 calls/day. You've hit the limit. Either:
- Wait 24 hours
- Use Twelve Data instead (800 calls/day)

### "No data received for BTC/USD"

Some APIs have different endpoints for crypto. The script handles this automatically, but if you get this error:
- Try a different data source: `--source=alphavantage` or `--source=twelvedata`
- Check that the API supports crypto data

### "fetch is not defined"

You're using Node.js < 18. Upgrade Node.js:
```bash
# Check version
node --version

# Upgrade (use nvm or download from nodejs.org)
```

## Updating Data Monthly

Run this script once per month (e.g., first day of each month) to get the latest price data:

```bash
# Run the script
node scripts/update-data.js

# Commit the updated CSVs
git add public/data/*.csv
git commit -m "Update historical price data - $(date +%Y-%m)"
git push
```

## Advanced Usage

### Adding New Tickers

Edit `update-data.js` and add to the `CONFIG.assets` array:

```javascript
assets: [
  // ... existing assets
  { ticker: 'VXUS', name: 'Vanguard Total International Stock' }
]
```

### Extending CSV Format (Future)

The script is designed to easily add more fields. In `update-data.js`:

```javascript
csvFields: {
  phase1: ['date', 'close'],  // Current
  phase2: ['date', 'open', 'high', 'low', 'close', 'volume'],  // Future
}
```

Then update:
```javascript
activeFormat: 'phase2',  // Switch to extended format
```

The data source adapters will need to be updated to return additional fields.

## API Rate Limits

| Provider | Free Tier | Enough for 6 assets? |
|----------|-----------|---------------------|
| Twelve Data | 800 calls/day | ✅ Yes (6 calls) |
| Alpha Vantage | 25 calls/day | ✅ Yes (6 calls) |
| CoinGecko | 10,000 calls/month | ✅ Yes (crypto only) |

All providers have enough free tier for monthly updates!

## Data Sources Documentation

- **Twelve Data:** https://twelvedata.com/docs
- **Alpha Vantage:** https://www.alphavantage.co/documentation
- **CoinGecko:** https://www.coingecko.com/en/api/documentation

## License

This script is part of the Fire Calculator project. See main project LICENSE.
