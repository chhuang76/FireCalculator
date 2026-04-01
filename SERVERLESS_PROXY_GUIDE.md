# Serverless Proxy Guide for Fire Calculator

**Purpose:** Explain how to use a lightweight serverless proxy to fetch historical stock data while keeping the main app stateless and client-side.

---

## What is a Serverless Proxy?

A **serverless proxy** is a small piece of backend code that sits between your browser app and the financial data API. It acts as a middleman to:

1. **Hide your API keys** (keeps them secret, not exposed in browser code)
2. **Bypass CORS restrictions** (the proxy makes the API call server-side where CORS doesn't apply)
3. **Cache responses** (optional, to reduce API calls)

### Why "Serverless"?

Traditional servers require:
- Renting a VPS or EC2 instance
- Managing server infrastructure
- Paying monthly even when idle

**Serverless functions:**
- Run ONLY when called (pay-per-request, usually free for low traffic)
- Auto-scale automatically
- No server management needed
- Deploy with a single command

---

## How It Works: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         React App (Vite)                                  │ │
│  │                                                           │ │
│  │  User clicks "Run Simulation"                            │ │
│  │         ↓                                                 │ │
│  │  App calls: /api/fetch-stock-data?symbol=VT              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           ↓                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTP Request
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              SERVERLESS PROXY (Vercel/Cloudflare)              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  /api/fetch-stock-data.js                                 │ │
│  │                                                           │ │
│  │  1. Receives request with symbol=VT                      │ │
│  │  2. Reads API_KEY from environment variable (SECRET)     │ │
│  │  3. Calls Twelve Data API server-side                    │ │
│  │  4. Returns data to browser                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           ↓                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ API Request (with secret key)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Twelve Data API                               │
│                                                                 │
│  Returns historical price data                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefit:
Your React app is STILL stateless! The proxy is just a thin API gateway with **no database, no user data storage**.

---

## Hosting Options Comparison

### Option 1: Vercel (Recommended for Beginners)

**Pros:**
- ✅ **Easiest setup** (made for Next.js/Vite apps)
- ✅ Free tier: **100GB bandwidth/month**
- ✅ Deploys directly from GitHub
- ✅ Automatic HTTPS
- ✅ Environment variables built-in
- ✅ Can host BOTH your React app AND the proxy

**Cons:**
- ⚠️ Vendor lock-in to Vercel ecosystem

**Free Tier Limits:**
- 100GB bandwidth/month
- 100 serverless function executions/hour (6,000/day)
- Perfect for a personal Monte Carlo tool

**Best For:** Hosting your entire app (React + proxy together)

---

### Option 2: Cloudflare Workers

**Pros:**
- ✅ **100,000 requests/day** on free tier (very generous)
- ✅ Extremely fast (global edge network)
- ✅ Great for API-only proxy
- ✅ Can run on custom domain

**Cons:**
- ⚠️ Slightly steeper learning curve
- ⚠️ Different syntax (Service Worker API)
- ⚠️ Would need separate hosting for React app

**Free Tier Limits:**
- 100,000 requests/day
- 10ms CPU time per request
- More than enough for this use case

**Best For:** API proxy only (host React app elsewhere, e.g., GitHub Pages)

---

### Option 3: AWS Lambda (Advanced)

**Pros:**
- ✅ 1 million requests/month free (forever)
- ✅ Integrates with AWS ecosystem
- ✅ Highly scalable

**Cons:**
- ❌ **Complex setup** (API Gateway, IAM roles, etc.)
- ❌ Overkill for this project
- ❌ Steeper learning curve

**Best For:** Enterprise apps or if you're already using AWS

---

### Option 4: Netlify Functions

**Pros:**
- ✅ Similar to Vercel (easy setup)
- ✅ 125,000 function calls/month free
- ✅ Can host React app + proxy

**Cons:**
- ⚠️ Less generous free tier than Vercel

**Best For:** Alternative to Vercel

---

## Recommended Choice: **Vercel**

For your Fire Calculator, I recommend **Vercel** because:
1. Can host the React app AND the proxy in one place
2. Simplest deployment (one command)
3. Perfect integration with Vite
4. Great free tier
5. Beginner-friendly

---

## How to Set Up a Vercel Serverless Proxy

### Step 1: Project Structure

```
fire-calculator/
├── src/                    # Your React app
│   ├── App.jsx
│   ├── components/
│   └── ...
├── api/                    # Serverless functions (NEW)
│   └── fetch-stock-data.js
├── package.json
├── vite.config.js
└── vercel.json            # Vercel configuration (NEW)
```

---

### Step 2: Create the Proxy Function

**File:** `api/fetch-stock-data.js`

```javascript
// This runs on Vercel's servers, NOT in the browser
export default async function handler(req, res) {
  // 1. Get the stock symbol from query parameters
  const { symbol } = req.query;

  // Validate input
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter required' });
  }

  // 2. Get API key from environment variable (SECRET - never exposed to browser)
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // 3. Call Twelve Data API server-side (CORS doesn't apply here)
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1month&outputsize=120&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // Check for errors
    if (data.status === 'error') {
      return res.status(400).json({ error: data.message });
    }

    // 4. Return data to browser
    res.status(200).json(data);

  } catch (error) {
    console.error('API call failed:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
}
```

---

### Step 3: Configure Vercel

**File:** `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

---

### Step 4: Call Proxy from React App

**File:** `src/services/stockData.js`

```javascript
// Fetch stock data via your proxy (NOT directly from Twelve Data)
export async function fetchStockData(symbol) {
  // Call YOUR proxy endpoint (runs on Vercel)
  const response = await fetch(`/api/fetch-stock-data?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${symbol}`);
  }

  const data = await response.json();

  // Convert to format your app needs
  return data.values.map(item => ({
    date: item.datetime,
    price: parseFloat(item.close)
  }));
}
```

**File:** `src/components/PortfolioSetup.jsx`

```javascript
import { fetchStockData } from '../services/stockData';

function PortfolioSetup() {
  const handleAddAsset = async (ticker) => {
    try {
      // This calls /api/fetch-stock-data, which is your Vercel proxy
      const historicalData = await fetchStockData(ticker);

      // Calculate returns, volatility, etc.
      const stats = calculateStats(historicalData);

      // Add to portfolio...
    } catch (error) {
      console.error('Error fetching stock data:', error);
    }
  };

  // ... rest of component
}
```

---

### Step 5: Deploy to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? fire-calculator
# - Directory? ./
# - Override settings? No
```

#### Option B: Deploy via GitHub (Easier for ongoing updates)

1. Push your code to GitHub
2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Vercel auto-detects Vite and configures everything
6. Click "Deploy"

---

### Step 6: Set Environment Variables

After deployment:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add variable:
   - **Name:** `TWELVE_DATA_API_KEY`
   - **Value:** (your Twelve Data API key)
   - **Environment:** Production, Preview, Development

**Important:** Never commit API keys to GitHub! Always use environment variables.

---

## Local Development Setup

To test the proxy locally before deploying:

### Install Vercel CLI:
```bash
npm install -g vercel
```

### Run locally:
```bash
# This starts Vercel dev server (simulates production environment)
vercel dev
```

### Create `.env.local` file:
```
TWELVE_DATA_API_KEY=your_api_key_here
```

### Test the proxy:
```bash
# Open browser to:
http://localhost:3000/api/fetch-stock-data?symbol=VT
```

You should see JSON response with stock data!

---

## Caching Strategy (Optional but Recommended)

To minimize API calls, cache responses in `localStorage`:

**File:** `src/services/stockData.js`

```javascript
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export async function fetchStockData(symbol) {
  // Check cache first
  const cacheKey = `stock_data_${symbol}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // If cache is less than 30 days old, use it
    if (age < CACHE_DURATION) {
      console.log(`Using cached data for ${symbol}`);
      return data;
    }
  }

  // Cache miss or expired - fetch from proxy
  console.log(`Fetching fresh data for ${symbol}`);
  const response = await fetch(`/api/fetch-stock-data?symbol=${symbol}`);
  const apiData = await response.json();

  const processedData = apiData.values.map(item => ({
    date: item.datetime,
    price: parseFloat(item.close)
  }));

  // Store in cache
  localStorage.setItem(cacheKey, JSON.stringify({
    data: processedData,
    timestamp: Date.now()
  }));

  return processedData;
}
```

**Why 30 days?**
- Monthly historical data doesn't change often
- Reduces API calls by ~95%
- Twelve Data free tier: 800 calls/day → with caching, you can support hundreds of users

---

## Cost Breakdown

### Completely Free Setup:

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel Hosting** | 100GB bandwidth/month | $0 |
| **Vercel Functions** | 100 invocations/hour | $0 |
| **Twelve Data API** | 800 requests/day | $0 |
| **Domain (optional)** | Use vercel.app subdomain | $0 |
| **TOTAL** | | **$0/month** |

### If You Exceed Free Tier:

| Scenario | Solution | Cost |
|----------|----------|------|
| **>800 API calls/day** | Upgrade Twelve Data | $79/month |
| **>100GB bandwidth** | Upgrade Vercel | $20/month |
| **High traffic app** | Add Redis caching | $0-10/month |

**For a personal tool:** You'll likely stay 100% free forever with caching.

---

## Security Considerations

### ✅ DO:
- Store API keys in environment variables
- Validate user inputs in proxy function
- Add rate limiting if app becomes public
- Use HTTPS (Vercel provides this automatically)

### ❌ DON'T:
- Commit API keys to GitHub
- Allow arbitrary API calls through proxy (validate symbols)
- Expose internal error details to users
- Skip input validation

### Example: Rate Limiting in Proxy

```javascript
// Simple in-memory rate limiter (resets on function restart)
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_MINUTE = 10;

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Check rate limit
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000);

  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);

  // ... rest of function
}
```

---

## Alternative: Cloudflare Workers Example

If you prefer Cloudflare Workers instead:

**File:** `worker.js`

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
      return new Response('Symbol required', { status: 400 });
    }

    // Get API key from Cloudflare environment variable
    const apiKey = env.TWELVE_DATA_API_KEY;

    const apiUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1month&outputsize=120&apikey=${apiKey}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Enable CORS
      }
    });
  }
};
```

**Deploy:**
```bash
npm install -g wrangler
wrangler login
wrangler publish
```

---

## Comparison: Pure Stateless vs Serverless Proxy

| Aspect | Pure Stateless | With Serverless Proxy |
|--------|----------------|----------------------|
| **User Data Storage** | ❌ None | ❌ None (still stateless!) |
| **API Key Security** | ❌ Exposed in browser | ✅ Hidden server-side |
| **CORS Issues** | ❌ Blocked by most APIs | ✅ Bypassed |
| **Free Tier Usable?** | ⚠️ Very limited | ✅ Yes (Vercel + Twelve Data) |
| **Deployment Complexity** | ✅ Simple (static hosting) | ⚠️ Moderate (but still easy) |
| **Monthly Cost** | $0 | $0 (with free tiers) |
| **Scalability** | ✅ Infinite (static) | ✅ Auto-scales |

**Key Insight:** A serverless proxy doesn't violate the "stateless" principle because:
- No database
- No user sessions
- No stored user data
- It's just an API gateway

---

## Frequently Asked Questions

### Q: Is this still "stateless" if I use a proxy?
**A:** Yes! The proxy stores zero user data. It's just a secure middleman for API calls. Your app remains stateless.

### Q: Can I host the React app separately from the proxy?
**A:** Yes! Host React on GitHub Pages or Netlify, and proxy on Cloudflare Workers. They don't have to be together.

### Q: What if Vercel/Cloudflare shuts down my free tier?
**A:** Very unlikely for personal use. Both companies have had generous free tiers for years. Plus, you can easily migrate to another provider.

### Q: Do I need a credit card for Vercel?
**A:** No! Vercel's free tier (Hobby plan) requires no credit card.

### Q: How do I debug proxy issues?
**A:** Check Vercel Dashboard → Your Project → Functions → Logs. All console.log() output appears there.

### Q: Can I use this for a commercial app?
**A:** Vercel free tier is for personal/hobby projects. Commercial apps should use Vercel Pro ($20/month) or self-host.

---

## Next Steps

1. **Sign up for Twelve Data** (free tier): https://twelvedata.com
2. **Sign up for Vercel** (no credit card needed): https://vercel.com
3. **Create the proxy function** (copy code from Step 2 above)
4. **Test locally** with `vercel dev`
5. **Deploy** with `vercel --prod`
6. **Set environment variable** in Vercel dashboard

**Estimated time:** 30-60 minutes for first-time setup

---

## Conclusion

Using a serverless proxy:
- ✅ Solves CORS problems
- ✅ Keeps API keys secure
- ✅ Stays 100% free (Vercel + Twelve Data free tiers)
- ✅ Doesn't violate "stateless" architecture
- ✅ Easy to set up and deploy
- ✅ Scales automatically

**Recommendation:** Go with Vercel + Twelve Data. It's the sweet spot of simplicity, cost, and reliability for your Monte Carlo simulator.
