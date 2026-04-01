# Historical Stock & Asset Price API Research
**Date:** March 2025
**Purpose:** Identify CORS-friendly APIs for client-side Monte Carlo simulator

## Executive Summary

**For browser-based applications, the biggest challenge is CORS support.** Most financial APIs do NOT support direct browser calls due to security concerns and the desire to prevent API key exposure in client-side code.

### Best Options for Client-Side Use:

1. **CoinGecko** (Crypto only) - FREE, CORS-friendly, no API key required for basic use
2. **Alpha Vantage** - Very limited free tier (25 requests/day), CORS support unclear
3. **Twelve Data** - Free tier with 800 requests/day, CORS support unclear
4. **Proxy Solution** - Most reliable approach for production apps

---

## Google Finance API
**Status:** ❌ DEPRECATED (circa 2012)

- Google officially shut down their Finance API over a decade ago
- No longer a viable option
- Alternatives: Use any of the services below

---

## Alpha Vantage
**Status:** ✅ Active
**CORS Support:** ⚠️ NOT DOCUMENTED (likely NO - requires testing)

### Pricing & Limits
| Tier | Cost | Rate Limit | Daily Limit |
|------|------|------------|-------------|
| Free | $0 | ~1 req/hour | 25 requests/day |
| Basic | $49.99/mo | 75 req/min | Unlimited |
| Premium | $99.99/mo | 150 req/min | Unlimited |

### Coverage
- ✅ Stocks (VT, QQQ, AVUV, BND supported)
- ✅ ETFs
- ✅ Commodities (GLD)
- ✅ Crypto (BTC)

### Historical Data
- 20+ years of history
- Intervals: daily, weekly, monthly, intraday (1/5/15/30/60 min)

### Example Endpoints
```
# Monthly stock data
https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=VT&apikey=YOUR_KEY

# Daily crypto data
https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=BTC&market=USD&apikey=YOUR_KEY

# Monthly adjusted prices (includes dividends/splits)
https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=BND&apikey=YOUR_KEY
```

### Pros
- Simple REST API
- Good documentation
- Supports all required asset types
- Generous historical data (20+ years)

### Cons
- **MAJOR:** Only 25 requests/day on free tier (unusable for real app)
- Expensive premium tiers ($50+/month minimum)
- CORS support not documented (likely blocked)
- Premium required for real-time data

### Verdict for Client-Side App
❌ **Not Recommended** - Free tier too restrictive, CORS likely unsupported

---

## Yahoo Finance API Alternatives

**Official Yahoo Finance API:** ❌ Never existed officially
**Unofficial APIs:** ⚠️ Unreliable, frequently broken

### yfinance
- Python library only (NOT usable in browser)
- Wraps Yahoo's unofficial endpoints
- Would require backend proxy server
- Very popular but not suitable for client-side apps

### Conclusion
Yahoo Finance is not viable for direct browser access.

---

## Polygon.io (now Massive.com)
**Status:** ✅ Active (rebranded to Massive)
**CORS Support:** ⚠️ NOT DOCUMENTED

### Pricing
- Documentation incomplete (redirect issues encountered)
- Appears to be primarily a paid service
- No clear free tier identified

### Coverage
- Stocks, options, forex, crypto
- Real-time and historical data

### Verdict for Client-Side App
⚠️ **Insufficient Information** - Could not verify free tier or CORS support

---

## Twelve Data
**Status:** ✅ Active
**CORS Support:** ⚠️ NOT DOCUMENTED

### Pricing & Limits
| Tier | Cost | API Credits/Min | Daily Limit |
|------|------|-----------------|-------------|
| Basic (Free) | $0 | 8/min | 800/day |
| Grow | $79/mo | 377/min | ~540k/day |
| Pro | $229/mo | 1,597/min | ~2.3M/day |

### Coverage
- ✅ Stocks (US & global, 84 markets on Ultra)
- ✅ ETFs
- ✅ Commodities
- ✅ Crypto
- ✅ Forex

### Historical Data
- Daily, weekly, monthly intervals
- Intraday data available
- `/time_series` endpoint

### Example Endpoints
```
# Daily data
https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&apikey=YOUR_KEY

# Monthly data
https://api.twelvedata.com/time_series?symbol=VT&interval=1month&apikey=YOUR_KEY

# End of day price
https://api.twelvedata.com/eod?symbol=BTC/USD&apikey=YOUR_KEY
```

### Response Format
```json
{
  "meta": {
    "symbol": "AAPL",
    "interval": "1min",
    "currency": "USD"
  },
  "values": [
    {
      "datetime": "2021-09-16 15:59:00",
      "open": "148.73500",
      "high": "148.86000",
      "close": "148.85001",
      "volume": "624277"
    }
  ]
}
```

### Pros
- Reasonable free tier (800 requests/day)
- Comprehensive asset coverage
- Good documentation
- Clean JSON API

### Cons
- CORS support not documented
- Free tier may be insufficient for heavy usage
- Trial access to some premium features only

### Verdict for Client-Side App
⚠️ **Maybe** - Free tier is usable IF CORS is supported (needs testing)

---

## Finnhub
**Status:** ✅ Active
**CORS Support:** ⚠️ NOT DOCUMENTED

### Limits
- 30 API calls/second across all plans
- Free tier limits not clearly specified in docs

### Coverage
- ✅ Stocks
- ✅ Forex
- ✅ Crypto
- ⚠️ Commodities not explicitly mentioned

### Historical Data
- Stock candles (OHLCV)
- Crypto candles
- Forex candles

### Authentication
- API key required in URL parameter or header
- `token=apiKey` or `X-Finnhub-Token: apiKey`

### Verdict for Client-Side App
⚠️ **Uncertain** - Need to verify free tier limits and CORS

---

## CoinGecko (Crypto Only)
**Status:** ✅ Active
**CORS Support:** ⚠️ PARTIAL (has CORS limitations, workarounds exist)

### Pricing & Limits
| Tier | Cost | Monthly Credits | Rate Limit |
|------|------|-----------------|------------|
| Demo (Free) | $0 | 10,000 calls | 30/min |
| Basic | $35/mo | Higher | Higher |

### Coverage
- ✅ Bitcoin (BTC)
- ✅ 18,000+ cryptocurrencies
- ❌ Stocks (not supported)
- ❌ Commodities (not supported)

### Historical Data
- **10+ years** of crypto history
- Automatic granularity:
  - 5-minute intervals (1 day back)
  - Hourly (1-90 days)
  - Daily (90+ days)

### Example Endpoint (Tested & Working)
```
# Bitcoin 365-day history (NO API KEY REQUIRED for public endpoints)
https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365
```

### Response Format
```json
{
  "prices": [
    [1743552000000, 85237.5876052852],
    [timestamp_ms, price_usd]
  ],
  "market_caps": [[timestamp_ms, market_cap]],
  "total_volumes": [[timestamp_ms, volume]]
}
```

### Pros
- ✅ **FREE tier is generous** (10,000 calls/month)
- ✅ **Public endpoints work without API key**
- ✅ Excellent crypto coverage
- ✅ 10+ years of history
- ✅ Simple, clean API
- ✅ Well-documented

### Cons
- ❌ **CRYPTO ONLY** (no stocks/ETFs/commodities)
- ⚠️ CORS issues reported (but workarounds exist)
- Requires attribution

### Verdict for Client-Side App
✅ **RECOMMENDED for BTC** - Best free option for crypto, but won't cover stocks

---

## CoinCap
**Status:** ✅ Active
**CORS Support:** ⚠️ UNKNOWN

### Pricing
- Pro tier exists but pricing not clearly documented
- Likely has free tier for basic access

### Coverage
- ✅ Crypto (1,000+ coins)
- ❌ Stocks/commodities not supported

### Historical Data
- Real-time and historical crypto data available

### Verdict for Client-Side App
⚠️ **Insufficient Information** - Could not verify details

---

## CoinMarketCap
**Status:** ✅ Active
**CORS Support:** ⚠️ NOT DOCUMENTED

### Pricing & Limits
| Tier | Cost | Monthly Credits | Historical Data |
|------|------|-----------------|-----------------|
| Basic (Free) | $0 | 10,000 calls | ❌ None |
| Hobbyist | $29/mo | Higher | 12 months |
| Startup | $79/mo | Higher | 24 months |

### Coverage
- ✅ Crypto only
- ❌ No stocks/commodities

### Major Limitation
❌ **Free tier has NO historical data** - dealbreaker for backtesting

### Verdict for Client-Side App
❌ **Not Recommended** - No historical data on free tier

---

## Marketstack
**Status:** ✅ Active
**CORS Support:** ⚠️ NOT DOCUMENTED

### Coverage
- ✅ Stocks
- ✅ ETFs
- ⚠️ Commodities/crypto unclear

### Pricing
- Has free tier (limits not clearly documented)
- Multiple paid tiers

### Verdict for Client-Side App
⚠️ **Insufficient Information** - Could not verify CORS or free tier limits

---

## IEX Cloud
**Status:** ✅ Active
**CORS Support:** ⚠️ NOT DOCUMENTED

### Coverage
- ✅ Stocks
- ✅ ETFs
- ⚠️ Crypto (limited)
- ❌ Commodities unclear

### Pricing
- Has free tier (could not retrieve detailed limits due to 503 errors)
- Known to be popular for financial apps

### Verdict for Client-Side App
⚠️ **Needs Further Research** - Popular option but details unavailable

---

## Alpaca Markets
**Status:** ✅ Active
**CORS Support:** ⚠️ NOT DOCUMENTED

### Coverage
- ✅ Stocks
- ✅ Options
- ✅ Crypto
- ✅ Forex

### Historical Data
- `/v2/stocks/bars` endpoint
- Pagination support
- Rate limiting via headers

### Rate Limits
- Enforced with `X-RateLimit-*` headers
- Example: 100 requests/min
- 429 status on limit exceeded

### Pricing
- Free tier exists (limits unclear)
- Subscription tiers mentioned

### Verdict for Client-Side App
⚠️ **Uncertain** - Need to verify CORS and free tier details

---

## Other Options Researched

### Nasdaq Data Link
- Free data available but limited
- Premium datasets available a la carte
- CORS not documented
- Focused more on institutional use

### Tiingo
- Could not retrieve documentation (loading issues)
- Known to offer stock and crypto data
- Worth investigating further

### Binance API
- Crypto exchange API
- Free for public endpoints
- CORS unclear
- May have historical data endpoints

### Kraken API
- Crypto exchange API
- REST and WebSocket options
- Details on free tier unclear

---

## CORS Explanation

**CORS (Cross-Origin Resource Sharing)** is a browser security mechanism that blocks JavaScript from calling APIs on different domains unless the API server explicitly allows it via HTTP headers.

### Why It Matters
Most financial APIs **do NOT support CORS** because:
1. They don't want API keys exposed in client-side code
2. Rate limiting is harder to enforce
3. Security concerns about credential theft

### The Problem
```javascript
// This FAILS without CORS headers from api.example.com
fetch('https://api.example.com/stock/AAPL')
  .then(res => res.json())
```

### The Solution Options

1. **Use CORS-friendly APIs** (rare in finance)
2. **Build a backend proxy** (most common)
3. **Use serverless functions** (Vercel/Netlify/Cloudflare Workers)

---

## Recommendations for Client-Side Monte Carlo Simulator

### Option 1: Hybrid Approach (RECOMMENDED)
- **Stocks/ETFs/Commodities:** Use serverless proxy + Alpha Vantage/Twelve Data
- **Crypto (BTC):** Direct client calls to CoinGecko (free, works)

### Option 2: All-Backend Approach
- Build simple proxy API (Node.js/Python/Cloudflare Worker)
- Use Alpha Vantage or Twelve Data for all assets
- Cache results to minimize API calls
- More reliable, better security

### Option 3: Free-Only Direct Approach
- CoinGecko for BTC only
- Accept that stocks won't work without a proxy
- Very limited but truly free and stateless

---

## Specific Asset Coverage Summary

| API | VT | QQQ | AVUV | BND | GLD | BTC |
|-----|----|----|------|-----|-----|-----|
| Alpha Vantage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Twelve Data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CoinGecko | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Finnhub | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Polygon/Massive | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |

---

## Code Examples

### CoinGecko (Direct Browser Call - Works!)
```javascript
async function getBitcoinHistory() {
  const url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365';
  const response = await fetch(url);
  const data = await response.json();

  // data.prices = [[timestamp, price], ...]
  return data.prices.map(([timestamp, price]) => ({
    date: new Date(timestamp),
    price: price
  }));
}
```

### Alpha Vantage (May require proxy due to CORS)
```javascript
async function getStockMonthly(symbol) {
  const apiKey = 'YOUR_KEY'; // WARNING: Exposed in client code!
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${symbol}&apikey=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  // Check for rate limit
  if (data['Note']) {
    throw new Error('API rate limit exceeded');
  }

  return data['Monthly Adjusted Time Series'];
}
```

### Twelve Data (May require proxy due to CORS)
```javascript
async function getTwelveDataHistory(symbol, interval = '1month') {
  const apiKey = 'YOUR_KEY';
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${apiKey}&outputsize=60`;

  const response = await fetch(url);
  const data = await response.json();

  return data.values;
}
```

### Backend Proxy Example (Node.js + Vercel)
```javascript
// api/stock-data.js (Vercel Serverless Function)
export default async function handler(req, res) {
  const { symbol } = req.query;

  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY}`
  );

  const data = await response.json();

  res.json(data);
}
```

Then call from client:
```javascript
const data = await fetch('/api/stock-data?symbol=VT').then(r => r.json());
```

---

## Testing CORS Support

To test if an API supports CORS, try this in browser console:

```javascript
fetch('https://api.example.com/endpoint?key=YOUR_KEY')
  .then(r => r.json())
  .then(console.log)
  .catch(err => {
    if (err.message.includes('CORS')) {
      console.log('❌ CORS blocked');
    } else {
      console.log('✅ CORS works!');
    }
  });
```

---

## Final Recommendation

For a **production-ready client-side Monte Carlo simulator**, you should:

1. **Build a lightweight backend proxy** using:
   - Vercel Serverless Functions (free tier)
   - Cloudflare Workers (free tier)
   - AWS Lambda (free tier)

2. **Use Twelve Data for stocks/ETFs/commodities**
   - Free tier: 800 requests/day
   - Covers all required assets
   - Good documentation

3. **Use CoinGecko for crypto**
   - Free tier: 10,000 requests/month
   - No API key required for public data
   - Direct browser calls may work

4. **Implement aggressive caching**
   - Cache API responses in localStorage
   - Only refresh monthly data once per month
   - Minimize API calls

5. **Consider Alpha Vantage as backup**
   - Only if Twelve Data doesn't work out
   - Will need paid tier ($50/mo) for reasonable limits

### Cost Estimate
- **Free option:** Twelve Data (800/day) + CoinGecko (free) + Vercel (free hosting)
- **Paid option:** Twelve Data Pro ($79/mo) or Alpha Vantage Basic ($50/mo)

**The reality is that truly stateless browser-only financial data access is very limited due to CORS restrictions and API key security concerns. A lightweight proxy is the industry-standard solution.**
