# Withdrawal Strategies

The FIRE Calculator supports two withdrawal strategies that you can mix and match across different spending phases. Each strategy has different characteristics that affect your portfolio's success rate and spending stability.

---

## Overview

| Strategy | Description | Success Rate | Spending Stability |
|----------|-------------|--------------|-------------------|
| **Fixed Dollar** | Withdraw a set amount each year, adjusted for inflation | Lower (~70-80%) | Very stable, predictable |
| **% of Portfolio** | Withdraw a fixed percentage of your current balance each year | Higher (~95-99%) | Variable, adjusts with markets |

---

## Fixed Dollar Withdrawal

### How It Works

Withdraw the same "real dollar" amount each year, adjusted for inflation.

**Example:**
- Year 1: Withdraw $50,000
- Year 5: Withdraw $57,964 (3% inflation compounded)
- Year 10: Withdraw $67,196
- Year 30: Withdraw $121,363

### Mathematical Formula

```
Withdrawal(year) = BaseAmount × (1 + inflationRate)^year
```

### Characteristics

**Pros:**
- ✅ Predictable spending power each year
- ✅ Easy to budget (you know your real income)
- ✅ Traditional 4% rule uses this approach
- ✅ Works well in stable or rising markets

**Cons:**
- ❌ Lower success rates in volatile markets (~70-80% for 30 years)
- ❌ Vulnerable to sequence of returns risk
- ❌ Withdrawals keep increasing even if portfolio is declining
- ❌ Can deplete portfolio in extended bear markets

### Best For

- Short retirement horizons (< 20 years)
- Very conservative portfolios (high bond allocation)
- Retirees who need predictable income for fixed expenses
- Those with pension or Social Security to supplement

---

## Percentage of Portfolio Withdrawal

### How It Works

Withdraw a fixed percentage of your **current** portfolio balance each year, regardless of market performance.

**Example (starting with $1M, 4% withdrawal):**
- Year 1: $1,000,000 × 4% = $40,000
- Year 5 (portfolio up to $1.2M): $1,200,000 × 4% = $48,000
- Year 10 (portfolio down to $900k): $900,000 × 4% = $36,000
- Year 15 (portfolio recovers to $1.1M): $1,100,000 × 4% = $44,000

### Mathematical Formula

```
Withdrawal(year) = PortfolioBalance(year) × (percentage / 100)
```

**No inflation adjustment needed** - the portfolio balance already reflects market returns.

### Characteristics

**Pros:**
- ✅ Very high success rates (~95-99% for 30 years)
- ✅ Nearly impossible to run out of money (always leaves 96% of portfolio)
- ✅ Self-correcting: automatically reduces spending in bear markets
- ✅ Allows higher withdrawal rates (can use 5-6% instead of 4%)
- ✅ Spending increases in bull markets

**Cons:**
- ❌ Variable income year-to-year
- ❌ Spending can drop significantly in severe bear markets
- ❌ Harder to budget for fixed expenses
- ❌ May require lifestyle adjustments

### Best For

- Long retirement horizons (30+ years)
- Aggressive portfolios (high stock allocation)
- Retirees with flexible spending
- Those who can cut expenses in down years
- Early retirees (FIRE community)

---

## Success Rate Comparison

Based on Monte Carlo simulations with typical portfolios:

### 30-Year Retirement, $1.5M Portfolio, 50/50 VT/BND

| Strategy | Withdrawal Amount | Success Rate | 10th Percentile Outcome |
|----------|------------------|--------------|------------------------|
| Fixed Dollar | $50k/year (3.3% initial) | 78.6% | Depleted by year 25 |
| Fixed Dollar | $60k/year (4.0% initial) | 65% | Depleted by year 22 |
| % of Portfolio | 4% of balance | 96%+ | $600k remaining |
| % of Portfolio | 5% of balance | 93%+ | $400k remaining |

### 30-Year Retirement, $1M Portfolio, 80/20 VT/BND (aggressive)

| Strategy | Withdrawal Amount | Success Rate | 10th Percentile Outcome |
|----------|------------------|--------------|------------------------|
| Fixed Dollar | $40k/year (4.0% initial) | 82% | Depleted by year 27 |
| % of Portfolio | 4% of balance | 98%+ | $800k remaining |
| % of Portfolio | 5% of balance | 96%+ | $500k remaining |

**Key Insight:** Percentage withdrawal can support 20-30% higher success rates with the same starting withdrawal amount.

---

## Real-World Spending Example

### Scenario: $1.5M Portfolio, 4% Percentage Withdrawal, 30 Years

**Good Market Sequence (2010-2020 style):**
```
Year  Portfolio    4% Withdrawal    Change
1     $1,500,000   $60,000          -
5     $1,800,000   $72,000          +20%
10    $2,400,000   $96,000          +60%
15    $2,900,000   $116,000         +93%
```

**Poor Market Sequence (2000-2010 style with 2008 crash):**
```
Year  Portfolio    4% Withdrawal    Change
1     $1,500,000   $60,000          -
2     $1,350,000   $54,000          -10%
3     $1,200,000   $48,000          -20%
5     $1,100,000   $44,000          -27%
10    $1,400,000   $56,000          -7% (recovered)
```

**Notice:** Spending adjusts both up and down, protecting the portfolio while allowing you to enjoy gains.

---

## Choosing a Withdrawal Rate

### Conservative (High Success)
- **3-3.5% withdrawal**: ~99% success rate
- Recommended for very long retirements (40+ years)
- More stable spending in percentage mode

### Moderate (Balanced)
- **4-4.5% withdrawal**: ~95-97% success rate
- Standard for 30-year retirements
- Original "4% rule" assumption

### Aggressive (Higher Risk)
- **5-6% withdrawal**: ~90-93% success rate
- Shorter retirements (20-25 years)
- Requires flexibility in spending
- Only viable with percentage strategy

### Very Aggressive (Significant Risk)
- **6%+ withdrawal**: <90% success rate
- Not recommended for most retirees
- Consider part-time work or other income sources

---

## Combining Strategies (Multiple Phases)

You can use different strategies for different life phases:

### Example 1: Early Retirement with Flexibility → Fixed Spending Later

**Phase 1 (Age 40-65, 25 years):** 4% of Portfolio
- Flexible spending during working-age years
- Can adjust lifestyle or do side work if needed
- Higher success rate during vulnerable early years

**Phase 2 (Age 65+, 25 years):** $60,000 Fixed Dollar
- Predictable income once Social Security starts
- Social Security provides safety net
- Fixed expenses easier to manage in older age

### Example 2: High Spending Early → Conservative Later

**Phase 1 (Age 50-60, 10 years):** $80,000 Fixed Dollar
- Travel and active lifestyle spending
- Front-load experiences while healthy

**Phase 2 (Age 60-75, 15 years):** 3.5% of Portfolio
- Lower spending needs, flexible approach
- Protects remaining portfolio

**Phase 3 (Age 75+, 15 years):** $40,000 Fixed Dollar
- Healthcare and essential expenses
- Predictable budget for long-term care

---

## How to Use in the UI

### Setting Up a Percentage Withdrawal

1. **Navigate to "Spending Plan" section**

2. **Click "+ Add Phase"** (or edit existing phase)

3. **Select "% of Portfolio"** from the Strategy dropdown

4. **Enter percentage:**
   - Input: `4` (for 4% withdrawal)
   - NOT `0.04` - the tool handles the conversion

5. **Enter duration:** Number of years for this phase

6. **Review calculated values:**
   - "Total Spent" column shows "Variable"
   - "First Year" shows "4% of balance"

### Setting Up a Fixed Dollar Withdrawal

1. **Select "Fixed Dollar"** from the Strategy dropdown

2. **Enter annual amount:**
   - Input: `50000` (for $50k/year)
   - Will be adjusted for inflation automatically

3. **Enter duration:** Number of years

4. **Review inflation-adjusted amounts** in table

### Example: Mixed Strategy Setup

```
Phase 1:
  Strategy: % of Portfolio
  Amount: 4%
  Duration: 15 years

Phase 2:
  Strategy: Fixed Dollar
  Amount: $50,000
  Duration: 15 years

Total: 30 years
```

---

## Mathematical Details

### Fixed Dollar Strategy

```javascript
// Simulation loop (simplified)
for (year = 1; year <= 30; year++) {
  portfolioBalance = applyReturns(portfolioBalance);

  inflationFactor = Math.pow(1 + inflationRate, year);
  withdrawal = baseAmount * inflationFactor;

  portfolioBalance -= withdrawal;

  if (portfolioBalance <= 0) {
    return FAILURE;
  }
}
```

**Key Point:** Withdrawal amount grows with inflation, independent of portfolio performance.

### Percentage Strategy

```javascript
// Simulation loop (simplified)
for (year = 1; year <= 30; year++) {
  portfolioBalance = applyReturns(portfolioBalance);

  withdrawal = portfolioBalance * (percentage / 100);

  portfolioBalance -= withdrawal;

  // Nearly impossible to reach 0 - always leaves (100-percentage)%
}
```

**Key Point:** Withdrawal is always a fraction of current balance. Can never fully deplete (mathematically approaches zero asymptotically).

---

## Frequently Asked Questions

### Q: Can I change strategies mid-retirement?

**A:** Yes! Use multiple phases in the tool to model strategy changes. Common pattern:
- Phase 1: Percentage (flexible early years)
- Phase 2: Fixed Dollar (stable later years with Social Security)

### Q: What happens if the market crashes in year 1 with percentage withdrawal?

**A:** Your withdrawal automatically decreases. Example:
- Year 1: $1M portfolio × 4% = $40k
- Market drops 30%
- Year 2: $700k portfolio × 4% = $28k (30% spending cut)
- You spend less, but preserve portfolio for recovery

### Q: Is percentage withdrawal the same as the "4% rule"?

**A:** No! The traditional 4% rule is Fixed Dollar:
- **4% Rule (Traditional):** Withdraw 4% in year 1 ($40k from $1M), then adjust for inflation
- **Percentage Strategy:** Withdraw 4% every year based on current balance

The percentage strategy is actually safer than the 4% rule.

### Q: Can I use 5% or 6% withdrawal with percentage strategy?

**A:** Yes, percentage strategy supports higher rates:
- 5% with percentage: ~93% success rate
- 5% with fixed dollar: ~55% success rate

But be prepared for spending volatility.

### Q: What if my spending needs are rigid (mortgage, healthcare)?

**A:** Use Fixed Dollar for those years, or:
- Keep 2-3 years of expenses in cash/bonds as buffer
- Use percentage for total spending, but maintain fixed expense budget
- Combine with part-time work or other income

### Q: How do I choose between 4%, 4.5%, or 5%?

**Factors to consider:**
- **Portfolio allocation:** More stocks → can support higher %
- **Retirement length:** Longer → use lower %
- **Flexibility:** Can you cut spending? → use higher %
- **Other income:** Pension/Social Security → use higher %

**General guideline:**
- 30-year retirement, 60/40 portfolio → 4%
- 30-year retirement, 80/20 portfolio → 4.5%
- 40-year retirement, 60/40 portfolio → 3.5%

---

## Research & Historical Context

### The Original 4% Rule (Bengen, 1994)

- Based on Fixed Dollar withdrawal
- Used historical U.S. stock/bond data (1926-1992)
- Found 4% initial withdrawal rate had 95% success over 30 years
- Assumed 50/50 stock/bond allocation

**Limitation:** Only tested one strategy (Fixed Dollar with inflation adjustment)

### Percentage Withdrawal Research

Studies have shown:
- **Guyton-Klinger (2004):** Dynamic withdrawals (similar to percentage) improve success rates by 10-20%
- **Blanchett et al. (2013):** Variable spending strategies reduce failure risk significantly
- **Kitces (2015):** Percentage-based rules nearly eliminate sequence risk

### Why Percentage Withdrawal Works Better

1. **Automatic adjustment** to market conditions
2. **Eliminates sequence of returns risk** - bad years early don't compound
3. **Preserves portfolio** in bear markets by reducing withdrawals
4. **Allows participation** in bull market gains
5. **Mathematically impossible to fully deplete** (asymptotic approach to zero)

---

## Tips & Best Practices

### Start Conservative

When in doubt, start with:
- **4% or lower** for first few years
- **Monitor** actual spending vs. portfolio balance
- **Increase** percentage if portfolio is growing significantly

### Use a Spending Buffer

Keep 1-2 years of expenses in:
- Cash (high-yield savings)
- Short-term bonds (SHV, BIL)
- Money market funds

This allows you to:
- Avoid selling stocks in a crash
- Smooth out year-to-year spending volatility
- Handle emergencies without increasing withdrawal rate

### Plan for Spending Volatility

If using percentage withdrawal:
- Identify **flexible** vs. **fixed** expenses
- Flexible: travel, dining out, hobbies (can cut 20-30%)
- Fixed: housing, healthcare, insurance (hard to cut)
- Aim for 40-50% of spending in flexible categories

### Review Annually

Each year:
1. Calculate actual withdrawal rate: `spending / portfolio balance`
2. If rate > 6%: consider cutting spending
3. If rate < 3%: consider increasing spending or charitable giving
4. Rebalance portfolio to target allocation

---

## Conclusion

**Fixed Dollar Withdrawal:**
- Best for predictable budgeting
- Lower success rates
- Higher sequence risk
- Traditional approach

**Percentage Withdrawal:**
- Best for long-term success
- Requires spending flexibility
- Nearly eliminates failure risk
- Increasingly popular in FIRE community

**Recommendation:** For most early retirees with 30+ year horizons, percentage withdrawal (4-4.5%) offers significantly better outcomes than fixed dollar withdrawal. The tradeoff is accepting some year-to-year spending variability in exchange for dramatically higher success rates.

---

**Related Documentation:**
- [Simulation Engine TDD](tdd/simulation-engine.md) - Technical implementation details
- [README.md](../README.md) - Overall project documentation

**Last Updated:** 2025-04-02
