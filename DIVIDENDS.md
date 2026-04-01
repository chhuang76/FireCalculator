# Dividends & Interest in the Simulation

## TL;DR

✅ **Yes, dividends and interest ARE included** in the simulation when using real data from the APIs.

We use **adjusted close prices** which automatically account for:
- Stock dividends (reinvested)
- ETF distributions (reinvested)
- Bond interest payments
- Stock splits
- Other corporate actions

## What This Means

### Price Return vs Total Return

**Price Return** (what you'd get if you just held the asset):
```
VT in 2023:
- Starting price: $90
- Ending price: $100
- Price return: +11.1%
```

**Total Return** (what you actually get with dividends reinvested):
```
VT in 2023:
- Starting price: $90
- Ending price: $100
- Dividends received: $2 (reinvested)
- Total return: +13.3%
```

### Why Adjusted Prices?

When a stock pays a $1 dividend, its price typically drops by $1 on the ex-dividend date. If we used unadjusted prices, we'd see:

```
Before dividend: $100
After dividend: $99  (looks like a loss!)
```

With adjusted prices, historical prices are reduced to account for past dividends:

```
Before dividend (adjusted): $99
After dividend (adjusted): $99  (correctly shows no change)
```

This way, when we calculate log returns, we automatically capture the full total return including dividends.

## Data Sources

### Twelve Data API (Primary)

```javascript
// In update-data.js
params: {
  symbol: 'VT',
  interval: '1month',
  adjusted: 'true'  // ← This includes dividends!
}

// Returns adjusted close prices
data.values.map(item => ({
  date: item.datetime,
  close: item.close  // Already includes dividend adjustments
}))
```

### Alpha Vantage API (Fallback)

```javascript
// In update-data.js
function: 'TIME_SERIES_MONTHLY_ADJUSTED'

// Extract adjusted close
prices.map(([date, values]) => ({
  date: date,
  close: values['5. adjusted close']  // Includes dividends
}))
```

### Sample Data Generator (Synthetic)

The synthetic data generator creates returns that implicitly represent total return, but since it's not real data, it's only for testing.

## Impact on Different Assets

### Stocks (VT, QQQ, AVUV)

**Dividend yields:**
- VT (Total World): ~2.0% annually
- QQQ (Nasdaq): ~0.5% annually
- AVUV (Small Cap Value): ~2.5% annually

**Impact:**
- Historical total returns are 10-25% higher than price returns
- Critical for accurate simulation

### Bonds (BND)

**This is THE most important for bonds!**

- BND (Total Bond Market): ~3-4% yield annually
- **Yield is 75%+ of bond total return**
- Price return alone: ~0-1% (bonds don't appreciate much)
- Total return: ~3-4% (mostly from interest)

**Without adjusted prices, bond simulations would be completely wrong.**

### Commodities

- GLD (Gold): No dividends (accurate either way)
- BTC (Bitcoin): No dividends (accurate either way)

## How to Verify Your Data

If you're using the CSV files from the APIs, you can verify they're adjusted:

### 1. Check for Dividend Events

Look at dates when you know a stock paid a dividend. The price should NOT show a sudden drop.

### 2. Compare to Known Benchmarks

```
VT Total Return (2010-2024): ~9% annualized
VT Price Return (2010-2024): ~7% annualized

If your simulation shows ~9%, you have adjusted data ✓
If your simulation shows ~7%, you have unadjusted data ✗
```

### 3. Re-fetch Data

If you're unsure about your current CSV files:

```bash
# Re-fetch with adjusted prices
npm run update-data

# This will use:
# - Twelve Data with adjusted: true
# - Alpha Vantage with adjusted close
```

## Technical Implementation

### How Adjusted Prices Work

1. **Start with current price:** $100 (today)

2. **Work backward through history:**
   - If stock split 2-for-1 → divide past prices by 2
   - If paid $1 dividend → subtract $1 from past prices
   - If paid 10% stock dividend → divide past prices by 1.1

3. **Result:** Past prices are artificially lowered to make returns continuous

4. **Calculate log returns:**
   ```javascript
   logReturn = Math.log(price[t] / price[t-1])
   // This automatically captures dividend impact!
   ```

### Example Calculation

**Unadjusted (WRONG):**
```
Month 1: $100
Dividend: $2 paid
Month 2: $101 (after $98 ex-dividend + $3 growth)

Price return = log(101/100) = 1.0%  ✗ Misses the dividend!
```

**Adjusted (CORRECT):**
```
Month 1: $98 (adjusted backward for $2 dividend)
Month 2: $101 (current price)

Total return = log(101/98) = 3.0%  ✓ Includes dividend!
```

## What If I'm Using Synthetic Data?

The sample data generator (`generate-sample-data.js`) creates returns based on these parameters:

```javascript
{
  ticker: 'VT',
  annualReturn: 0.08,    // 8% = ~7% price + ~1% dividend (approximation)
  volatility: 0.15
}
```

These are rough approximations of total return, so they're fine for testing but not accurate for real financial planning.

## Bottom Line

✅ **When using real API data:** Dividends and interest are included automatically via adjusted prices

✅ **When using synthetic data:** Approximated in the annual return parameter

✅ **For accurate retirement planning:** Always use real data from the APIs

❌ **Don't use:** Unadjusted price data (would severely underestimate returns, especially for bonds)

## Further Reading

- [Investopedia: Adjusted Close](https://www.investopedia.com/terms/a/adjusted_closing_price.asp)
- [Understanding Total Return](https://www.investopedia.com/terms/t/totalreturn.asp)
- [Why Dividends Matter in Retirement](https://www.investopedia.com/articles/retirement/04/022504.asp)

---

**Updated:** Step 3 implementation
**Status:** Using adjusted prices for accurate total return simulation ✓
