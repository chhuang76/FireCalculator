# Testing Real Data from APIs

## The Issue

When fetching real data with `npm run update-data`, the returns were incorrect:
- VT: 5.85% (should be ~8-9%)
- BND: -0.15% (should be ~3-4%)

This suggests **dividends are NOT included** in the data.

## What I Fixed

### 1. Added Debug Logging

The script now shows which price field it's using:

```
📋 Available fields: datetime, close, open, high, low, volume
✓ Using 'adjusted_close' field (includes dividends)
```

OR:

```
📋 Available fields: datetime, close, open, high, low, volume
⚠️  Using 'close' field (may NOT include dividends)
    If returns look low, API may not support adjusted prices
```

### 2. Smart Field Detection

The code now checks for `adjusted_close` field first:

```javascript
if (item.adjusted_close !== undefined) {
  closePrice = parseFloat(item.adjusted_close);  // ✓ Includes dividends
} else if (item.close !== undefined) {
  closePrice = parseFloat(item.close);  // ⚠️ May not include dividends
}
```

### 3. Automatic Return Validation

After fetching, the script calculates returns and validates them:

```
🔍 Data Validation - Checking Returns

✓ VT (Total World Stock): 8.45% - Looks good!
✓ QQQ (Nasdaq 100): 13.21% - Looks good!
⚠️  BND (Total Bond Market): 1.23%
   Expected: 2.5%-4.5%
   🔴 WARNING: Return is TOO LOW - may be missing DIVIDENDS!
```

If dividends are missing, it shows solutions.

## How to Test

### Step 1: Run the update script

```bash
npm run update-data
```

### Step 2: Watch the output carefully

Look for these key lines:

#### A. Field Detection (right after each ticker starts fetching)

**Good sign:**
```
📊 Processing: Vanguard Total World Stock (VT)
  📋 Available fields: datetime, adjusted_close, close, open, high, low
  ✓ Using 'adjusted_close' field (includes dividends)
```

**Bad sign:**
```
📊 Processing: Vanguard Total World Stock (VT)
  📋 Available fields: datetime, close, open, high, low
  ⚠️  Using 'close' field (may NOT include dividends)
```

#### B. Return Validation (at the end)

**Good result:**
```
🔍 Data Validation - Checking Returns

✓ VT (Total World Stock): 8.45% - Looks good!
✓ QQQ (Nasdaq 100): 13.21% - Looks good!
✓ BND (Total Bond Market): 3.67% - Looks good!
```

**Bad result:**
```
⚠️  VT (Total World Stock): 5.85%
   Expected: 7.0%-10.0%
   🔴 WARNING: Return is TOO LOW - may be missing DIVIDENDS!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  DIVIDEND WARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Some returns are suspiciously LOW, suggesting dividends may NOT be included.
This will cause the simulation to UNDERESTIMATE portfolio performance.

SOLUTIONS:

1. Try Alpha Vantage: npm run update-data -- --source=alphavantage
2. Check Twelve Data documentation for adjusted price support
3. For testing: npm run generate-best-data (synthetic but accurate)
```

### Step 3: Verify in the app

```bash
npm run dev
```

1. Open http://localhost:3000
2. Add VT to portfolio
3. Check the return (μ) shown in the table:
   - **Good:** 8-9%
   - **Bad:** 5-6% or lower

## Possible Outcomes

### Outcome 1: Twelve Data Works! ✅

If you see:
- ✓ Using 'adjusted_close' field
- ✓ VT: 8-9%
- ✓ BND: 3-4%

**Great!** Twelve Data supports adjusted prices. The `adjusted=true` parameter works.

### Outcome 2: Twelve Data Doesn't Support Adjusted Prices ❌

If you see:
- ⚠️ Using 'close' field
- ⚠️ VT: 5-6%
- ⚠️ BND: 0-1%

**Problem:** Twelve Data's free tier might not support adjusted prices for ETFs.

**Solution:** Try Alpha Vantage instead:

```bash
npm run update-data -- --source=alphavantage
```

Alpha Vantage's free tier DOES support adjusted prices.

### Outcome 3: Both APIs Have Issues ❌

If neither works:

**Fallback:** Use optimized synthetic data:

```bash
npm run generate-best-data
```

This gives you accurate synthetic data with correct returns.

## What to Report Back

Please share:

1. **Field detection output:**
   ```
   📋 Available fields: [what you see here]
   ✓ Using '[field name]' field
   ```

2. **Validation results:**
   ```
   🔍 Data Validation - Checking Returns
   [paste the validation output]
   ```

3. **Returns shown in the app:**
   - VT: X.XX%
   - BND: X.XX%

With this info, I can tell you exactly what's happening and how to fix it!

## Expected Returns (For Reference)

These are what you should see with **total return data (dividends included)**:

| Ticker | Asset | Expected Return |
|--------|-------|-----------------|
| VT | Total World Stock | 8-9% |
| QQQ | Nasdaq 100 | 12-14% |
| BND | Total Bond Market | 3-4% |
| AVUV | Small Cap Value | 10-12% |
| GLD | Gold | 5-7% |
| BTC | Bitcoin | 40-100% (varies wildly) |

If returns are 2-3% lower, **dividends are missing**.

## Quick Reference

```bash
# Test Twelve Data (primary)
npm run update-data

# If that fails, try Alpha Vantage
npm run update-data -- --source=alphavantage

# Fallback: optimized synthetic data
npm run generate-best-data

# Check what you have
npm run test:simulation
```
