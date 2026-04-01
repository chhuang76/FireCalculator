# UI Components - Technical Design Document

**Component:** React User Interface Layer
**Files:** `src/components/*.jsx`, `src/components/*.css`
**Version:** 1.0
**Last Updated:** 2025-04-01

---

## Overview

The UI Components subsystem provides all user-facing interface elements for the FIRE Calculator. Built with React 18, these components handle user input, display simulation results, and provide an intuitive experience for retirement planning.

### Key Features

- ✅ **Dynamic portfolio builder** - Add/remove assets with real-time stats
- ✅ **Multi-phase spending planner** - Visual timeline with inflation preview
- ✅ **Interactive controls** - Inflation rate and iteration count
- ✅ **Rich results display** - Success rate, percentile charts, snapshots
- ✅ **Responsive design** - Works on desktop and mobile
- ✅ **Real-time validation** - Immediate feedback on input errors

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│                    (State Container)                         │
│  • portfolio (Array)                                         │
│  • tickerStats (Object)                                      │
│  • phases (Array)                                            │
│  • inflationRate, iterations                                 │
│  • results                                                    │
└──────────────┬────────────────────────────────────────────────┘
               │
               ├─────────────────────┬─────────────────┬────────────────┬─────────────────┐
               │                     │                 │                │                 │
               ▼                     ▼                 ▼                ▼                 ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
     │ PortfolioSetup  │  │SpendingPhases   │  │ Simulation   │  │   Results    │  │ Percentile  │
     │                 │  │    Builder      │  │  Controls    │  │   Display    │  │   Chart     │
     ├─────────────────┤  ├─────────────────┤  ├──────────────┤  ├──────────────┤  ├─────────────┤
     │• Ticker select  │  │• Phase inputs   │  │• Inflation   │  │• Success rate│  │• Recharts   │
     │• Value input    │  │• Duration input │  │• Iterations  │  │• Stats cards │  │• 5 lines    │
     │• Weight calc    │  │• Timeline viz   │  │• Validation  │  │• Snapshots   │  │• Tooltip    │
     │• μ, σ display   │  │• Inflation adj  │  │• Run button  │  │• Empty state │  │• Legend     │
     │• Data loading   │  │• Add/remove     │  │• Progress    │  │              │  │             │
     └─────────────────┘  └─────────────────┘  └──────────────┘  └──────────────┘  └─────────────┘
```

---

## Component 1: PortfolioSetup

**File:** `src/components/PortfolioSetup.jsx`

### Purpose
Dynamic table for building a multi-asset portfolio with real-time statistics.

### Props

```javascript
{
  portfolio: Array<{id, ticker, value}>,
  setPortfolio: Function,
  tickerStats: Object<ticker: {mu, sigma, returns, priceData}>,
  setTickerStats: Function
}
```

### State

```javascript
const [loadingTickers, setLoadingTickers] = useState({});  // {ticker: boolean}
const [errors, setErrors] = useState({});                  // {ticker: errorMessage}
```

### Key Features

#### 1. Ticker Selection
**Available tickers:**
- VT - Vanguard Total World Stock
- QQQ - Invesco QQQ Trust
- AVUV - Avantis U.S. Small Cap Value
- BND - Vanguard Total Bond Market
- GLD - SPDR Gold Trust
- BTC/USD - Bitcoin

**Behavior:**
- Dropdown select for each row
- On selection → loads CSV data automatically
- Shows "Loading..." during fetch
- Displays error if load fails

#### 2. Automatic Data Loading

**loadTickerData(ticker, index):**
```javascript
async function loadTickerData(ticker, index) {
  if (!ticker || tickerStats[ticker]) return;  // Skip if already loaded

  setLoadingTickers(prev => ({ ...prev, [ticker]: true }));

  try {
    const data = await loadAndProcessTicker(ticker);  // From data-loader.js
    setTickerStats(prev => ({
      ...prev,
      [ticker]: {
        mu: data.mu,
        sigma: data.sigma,
        returns: data.returns,
        priceData: data.priceData
      }
    }));
  } catch (error) {
    setErrors(prev => ({
      ...prev,
      [ticker]: `Failed to load ${ticker}: ${error.message}`
    }));
  } finally {
    setLoadingTickers(prev => ({ ...prev, [ticker]: false }));
  }
}
```

**Triggered by:** updateTicker() when user selects a ticker

#### 3. Real-Time Weight Calculation

```javascript
const totalValue = portfolio.reduce((sum, asset) =>
  sum + (parseFloat(asset.value) || 0), 0
);

const getWeight = (value) => {
  if (!totalValue || !value) return 0;
  return (parseFloat(value) / totalValue) * 100;
};
```

**Display:** Auto-updates as user types values

#### 4. Statistics Display

**For each asset:**
- **Return (μ):** Annualized return (e.g., 9.07%)
- **Volatility (σ):** Annualized std dev (e.g., 15.23%)

**States:**
- Loading: "Loading..."
- Error: "Error" (red)
- Loaded: "9.07%"
- No ticker: "-"

#### 5. Duplicate Ticker Support

**User can add same ticker multiple times:**
```
Portfolio:
  VT    $400,000   40%
  QQQ   $300,000   30%
  VT    $300,000   30%  ← Same ticker, different account
```

**Handling:**
- Each row has unique `id: Date.now()`
- Data loaded once, cached in tickerStats
- Aggregation happens in simulation engine

#### 6. Add/Remove Rows

**Add asset:**
```javascript
const addAsset = () => {
  setPortfolio([
    ...portfolio,
    { id: Date.now(), ticker: '', value: '' }
  ]);
};
```

**Remove asset:**
```javascript
const removeAsset = (id) => {
  setPortfolio(portfolio.filter(asset => asset.id !== id));
};
```

**Constraint:** Cannot remove if only 1 row (button disabled)

### UI Elements

**Table structure:**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┬───┐
│ Ticker   │ Value ($)│ Weight(%)│ Return μ │ Volatσ   │ × │
├──────────┼──────────┼──────────┼──────────┼──────────┼───┤
│[Dropdown]│[Number]  │  40.0%   │  9.07%   │  15.23%  │[×]│
│[Dropdown]│[Number]  │  35.0%   │ 13.42%   │  21.45%  │[×]│
│[Dropdown]│[Number]  │  25.0%   │  2.11%   │   4.12%  │[×]│
├──────────┼──────────┼──────────┼──────────┼──────────┼───┤
│ Total    │ $1,000,000│ 100.0%  │          │          │   │
└──────────┴──────────┴──────────┴──────────┴──────────┴───┘

[+ Add Asset]
```

**Portfolio Summary Card:**
- Total Value: $1,000,000
- Number of Assets: 3
- Unique Tickers: 3

---

## Component 2: SpendingPhasesBuilder

**File:** `src/components/SpendingPhasesBuilder.jsx`

### Purpose
Multi-phase spending planner with visual timeline and inflation adjustment preview.

### Props

```javascript
{
  phases: Array<{id, amount, years}>,
  setPhases: Function,
  inflationRate: number
}
```

### Key Features

#### 1. Phase Input Table

**Each phase has:**
- **Amount:** Annual spending (real dollars)
- **Duration:** Number of years
- **Total Spent:** amount × years
- **Inflation-Adjusted First Year:** Shows what amount becomes after earlier phases

**Example:**
```
Phase 1: $50,000/yr × 15 years = $750,000
  First year: $50,000 (year 1)

Phase 2: $30,000/yr × 40 years = $1,200,000
  First year: $46,598 (year 16, after 3% inflation for 15 years)
```

#### 2. Inflation-Adjusted Preview

```javascript
const getInflationAdjustedAmount = (phaseIndex) => {
  let yearsFromStart = 0;
  for (let i = 0; i < phaseIndex; i++) {
    yearsFromStart += phases[i].years;
  }
  const phase = phases[phaseIndex];
  const inflationFactor = Math.pow(1 + inflationRate, yearsFromStart);
  return phase.amount * inflationFactor;
};
```

**Why this matters:**
- Shows real purchasing power of later phases
- Helps users understand inflation impact
- Example: $30k in year 16 ≈ $46.6k nominal (at 3% inflation)

#### 3. Timeline Visualization

**Visual bar chart showing all phases:**
```
Phase 1 (15y) ████████████     $50k/yr
Phase 2 (40y) ████████████████████████████████████     $30k/yr
              └────────────────────────────────────────┘
               0y                  30y                55y
```

**Implementation:**
```javascript
phases.map((phase, index) => {
  const percentage = (phase.years / totalYears) * 100;
  const hue = 200 + (index * 40);  // Color progression

  return (
    <div
      className="timeline-segment"
      style={{
        width: `${percentage}%`,
        background: `hsl(${hue}, 70%, 65%)`
      }}
    >
      {phase.years}y
    </div>
  );
});
```

**Colors:** Blue → Teal → Green progression

#### 4. Add/Remove Phases

**Add phase:**
```javascript
const addPhase = () => {
  setPhases([
    ...phases,
    { id: Date.now(), amount: 40000, years: 30 }
  ]);
};
```

**Remove phase:**
```javascript
const removePhase = (id) => {
  setPhases(phases.filter(phase => phase.id !== id));
};
```

**Constraint:** Cannot remove if only 1 phase

### UI Elements

**Table structure:**
```
┌───────┬────────────┬──────────┬───────────┬─────────────────────────┬───┐
│ Phase │ Annual ($) │Duration  │Total Spent│ First Year (Inflation)  │ × │
├───────┼────────────┼──────────┼───────────┼─────────────────────────┼───┤
│Phase 1│ $[50,000]  │  [15]    │ $750,000  │         -               │[×]│
│Phase 2│ $[30,000]  │  [40]    │$1,200,000 │ $46,598 (Year 16)       │[×]│
├───────┼────────────┼──────────┼───────────┼─────────────────────────┼───┤
│ Total │            │  55 years│$1,950,000 │ (Nominal, pre-inflation)│   │
└───────┴────────────┴──────────┴───────────┴─────────────────────────┴───┘

[+ Add Phase]

Timeline:
████████████████████████████████████████████████████████
 Phase 1: $50k × 15y       Phase 2: $30k × 40y
```

---

## Component 3: SimulationControls

**File:** `src/components/SimulationControls.jsx`

### Purpose
Configure simulation parameters and trigger execution.

### Props

```javascript
{
  inflationRate: number,
  setInflationRate: Function,
  iterations: number,
  setIterations: Function,
  onRunSimulation: Function,
  isRunning: boolean,
  progress: number,
  canRun: boolean,
  validationErrors: Array<string>
}
```

### Key Features

#### 1. Inflation Rate Input

**Range:** 0-20%
**Default:** 3%
**Step:** 0.1%

**Conversion:** Display in percentage, store as decimal
```javascript
// Display: 3 (shows as "3%")
// Stored: 0.03

<input
  type="number"
  value={inflationRate * 100}
  onChange={(e) => setInflationRate(parseFloat(e.target.value) / 100)}
  min="0"
  max="20"
  step="0.1"
/>
```

**Help text:** "Default: 3%. Spending will increase by this rate each year."

#### 2. Iterations Selector

**Options:**
- 1,000 (Quick)
- 5,000 (Balanced)
- 10,000 (Recommended) ← Default
- 50,000 (Thorough)

**Trade-off:**
- More iterations = more accurate, longer runtime
- 1k: ~0.3s, 10k: ~3s, 50k: ~15s

**Implementation:**
```javascript
<select
  value={iterations}
  onChange={(e) => setIterations(parseInt(e.target.value))}
>
  <option value="1000">1,000 (Quick)</option>
  <option value="5000">5,000 (Balanced)</option>
  <option value="10000">10,000 (Recommended)</option>
  <option value="50000">50,000 (Thorough)</option>
</select>
```

#### 3. Validation Errors Display

**Shows when canRun = false:**
```javascript
{validationErrors.length > 0 && (
  <div className="validation-errors">
    <h4>Please fix the following issues:</h4>
    <ul>
      {validationErrors.map((error, idx) => (
        <li key={idx}>{error}</li>
      ))}
    </ul>
  </div>
)}
```

**Common errors:**
- "Add at least one asset to your portfolio"
- "Set a value for all portfolio assets"
- "Add at least one spending phase"
- "Set spending amount and duration for all phases"
- "All ticker data must be loaded before running"

#### 4. Run Button

**States:**

**Idle (can run):**
```
[▶ Run Simulation]
```

**Running:**
```
[⏳ Running... 47%]
```
- Shows spinner animation
- Displays progress percentage
- Button disabled

**Disabled (validation errors):**
```
[▶ Run Simulation] (grayed out)
```

**Implementation:**
```javascript
<button
  onClick={onRunSimulation}
  disabled={!canRun || isRunning}
  className={`run-button ${isRunning ? 'running' : ''}`}
>
  {isRunning ? (
    <>
      <span className="spinner"></span>
      Running... {progress}%
    </>
  ) : (
    <>
      <span className="play-icon">▶</span>
      Run Simulation
    </>
  )}
</button>
```

**CSS Spinner:**
```css
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### UI Layout

```
┌────────────────────────────────────────────────────────┐
│           Simulation Settings                          │
│                                                         │
│  Inflation Rate               Iterations                │
│  [   3.0  ] %                 [10,000 (Recommended) ▼]  │
│  Default: 3%...               More iterations = ...     │
│                                                         │
│  ⚠️  Please fix the following issues:                   │
│     • Add at least one asset to your portfolio          │
│     • Set a value for all portfolio assets              │
│                                                         │
│              [▶ Run Simulation]                         │
│         This will run 10,000 simulations                │
└────────────────────────────────────────────────────────┘
```

---

## Component 4: ResultsDisplay

**File:** `src/components/ResultsDisplay.jsx`

### Purpose
Display simulation results with success rate, statistics, charts, and snapshots.

### Props

```javascript
{
  results: Object | null
}
```

**Results shape:**
```javascript
{
  successRate: 94.23,
  totalRuns: 10000,
  successfulRuns: 9423,
  failedRuns: 577,
  medianEndingBalance: 1234567,
  worstCaseEndingBalance: 0,
  averageFailureYear: 27.3,
  percentilesByYear: [
    { year: 0, p10, p25, p50, p75, p90 },
    { year: 1, p10, p25, p50, p75, p90 },
    // ... one per year
  ]
}
```

### Key Features

#### 1. Empty State

**When results === null:**
```
    📊
  No Results Yet

  Configure your portfolio and spending plan,
  then run a simulation to see results.
```

#### 2. Success Rate Card

**Color-coded by success rate:**

| Range | Level | Color | Icon |
|-------|-------|-------|------|
| ≥90% | Excellent | Green (#10b981) | 🟢 |
| 70-89% | Moderate | Orange (#f59e0b) | 🟡 |
| <70% | Poor | Red (#ef4444) | 🔴 |

**Implementation:**
```javascript
const getSuccessCategory = () => {
  if (successRate >= 90) return { level: 'excellent', color: '#10b981', icon: '🟢' };
  if (successRate >= 70) return { level: 'moderate', color: '#f59e0b', icon: '🟡' };
  return { level: 'poor', color: '#ef4444', icon: '🔴' };
};
```

**Interpretation messages:**

**Excellent (≥90%):**
> "Excellent! Your plan looks sustainable."
> "Your portfolio has a very high chance of lasting through retirement. This is a strong plan with good safety margins."

**Moderate (70-89%):**
> "Moderate Risk"
> "Your portfolio has a reasonable chance of success, but you may want to consider reducing spending, increasing savings, or adjusting your asset allocation."

**Poor (<70%):**
> "High Risk!"
> "Your portfolio has a low chance of lasting through retirement. Consider significantly reducing spending, working longer, or increasing your savings rate."

**Visual:**
```
┌─────────────────────────────────────────────────┐
│  🟢  Success Rate                                │
│                                                  │
│      94.2%                                       │
│      9,423 successful / 10,000 runs              │
│                                                  │
│  ████████████████████████░░░░                    │
│                                                  │
│  Excellent! Your plan looks sustainable.         │
│  Your portfolio has a very high chance of        │
│  lasting through retirement...                   │
└─────────────────────────────────────────────────┘
```

#### 3. Statistics Grid

**Four stat cards:**

**Card 1: Median Ending Balance**
```
  💰
  Median Ending Balance
  $1,234,567

  Half of successful scenarios
  ended above this amount
```

**Card 2: Worst Case (Successful)**
```
  ⚠️
  Worst Case (Successful)
  $0

  Lowest ending balance
  among successful runs
```

**Card 3: Average Failure Year** (only if failures > 0)
```
  📉
  Average Failure Year
  Year 27.3

  577 scenarios (5.8%)
  ran out of money
```

**Card 4: Successful Scenarios**
```
  ✅
  Successful Scenarios
  9,423

  Portfolio lasted the
  full retirement period
```

**Layout:** 2×2 grid on desktop, stacked on mobile

#### 4. PercentileChart Integration

```javascript
<PercentileChart percentilesByYear={percentilesByYear} />
```

See Component 5 for details.

#### 5. Balance Snapshots Table

**Shows percentiles at key years:**
- Years: 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50
- Columns: 10th, 25th, 50th (Median), 75th, 90th

**Formatting:**
```javascript
const formatValue = (val) => {
  if (val <= 0) return '$0';
  if (val >= 1000000) {
    return `$${(val / 1000000).toFixed(2)}M`;  // $1.23M
  }
  return `$${(val / 1000).toFixed(0)}k`;  // $456k
};
```

**Table structure:**
```
┌──────┬─────┬─────┬──────────┬─────┬─────┐
│ Year │ 10th│ 25th│50th(Median)│75th│ 90th│
├──────┼─────┼─────┼──────────┼─────┼─────┤
│Year 0│$1.0M│$1.0M│   $1.0M  │$1.0M│$1.0M│
│Year 5│$890k│$987k│  $1.08M  │$1.2M│$1.3M│
│Year10│$745k│$923k│  $1.14M  │$1.4M│$1.6M│
│ ...  │ ... │ ... │   ...    │ ... │ ... │
└──────┴─────┴─────┴──────────┴─────┴─────┘
```

---

## Component 5: PercentileChart

**File:** `src/components/PercentileChart.jsx`

### Purpose
Interactive line chart showing portfolio balance over time across all percentiles.

### Props

```javascript
{
  percentilesByYear: Array<{year, p10, p25, p50, p75, p90}>
}
```

### Technology

**Recharts 3.8:**
- `ComposedChart` - Allows lines + areas
- `Line` - 5 percentile lines
- `XAxis` / `YAxis` - Labeled axes
- `Tooltip` - Custom hover info
- `Legend` - Identifies lines
- `ResponsiveContainer` - Auto-resizes

### Key Features

#### 1. Five Percentile Lines

| Percentile | Color | Width | Meaning |
|------------|-------|-------|---------|
| 90th | Green (#10b981) | 2px | Best-case (top 10%) |
| 75th | Blue (#3b82f6) | 2px | Above average |
| 50th (Median) | Purple (#667eea) | **3px** | Typical outcome |
| 25th | Orange (#f59e0b) | 2px | Below average |
| 10th | Red (#ef4444) | 2px | Worst-case (bottom 10%) |

**Implementation:**
```javascript
<Line
  type="monotone"
  dataKey="p50"
  stroke="#667eea"
  strokeWidth={3}
  dot={false}
  name="Median (50th)"
  activeDot={{ r: 5 }}
/>
```

#### 2. Custom Tooltip

**On hover, shows all percentiles for that year:**
```
┌───────────────────┐
│ Year 15           │
│                   │
│ 90th: $1,567k     │
│ 75th: $1,234k     │
│ 50th: $1,000k     │
│ 25th: $789k       │
│ 10th: $567k       │
└───────────────────┘
```

**Implementation:**
```javascript
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="custom-tooltip">
      <p className="tooltip-year">Year {data.year}</p>
      <div className="tooltip-values">
        <div className="tooltip-item">
          <span className="tooltip-label p90-label">90th:</span>
          <span className="tooltip-value">${(data.p90 / 1000).toFixed(0)}k</span>
        </div>
        {/* ... same for p75, p50, p25, p10 */}
      </div>
    </div>
  );
};
```

#### 3. Formatted Y-Axis

```javascript
const formatYAxis = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;  // $1.5M
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;  // $567k
  }
  return `$${value}`;  // $50
};
```

**Y-axis label:** "Portfolio Balance" (rotated 90°)
**X-axis label:** "Year"

#### 4. Legend and Guide

**Interactive legend:**
- Click to hide/show lines
- Icons match line style
- Top of chart

**How to read guide:**
```
How to read this chart:
  • Median (50th): Half of simulations ended above this line
  • 90th percentile: Best-case scenarios (top 10%)
  • 10th percentile: Worst-case scenarios (bottom 10%)
```

#### 5. Responsive Sizing

```javascript
<ResponsiveContainer width="100%" height={400}>
  <ComposedChart data={chartData} ...>
    {/* Chart content */}
  </ComposedChart>
</ResponsiveContainer>
```

**Behavior:**
- Width: 100% of container
- Height: Fixed 400px
- Auto-adjusts on window resize

### Visual Example

```
Portfolio Balance Over Time

Portfolio Balance ($)
    2.5M ┤                                       ╱╱╱ 90th
    2.0M ┤                                  ╱╱╱╱╱
    1.5M ┤                             ╱╱╱╱╱  ━━━ 75th
    1.0M ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━ 50th
  500k  ┤                    ╲╲╲╲╲╲╲╲╲  ─ ─ ─ 25th
      0 ┤                         ╲╲╲╲  ─ ─ ─ 10th
        └────────────────────────────────────────
         0y     10y    20y    30y    40y    50y

Percentile bands show the range of outcomes across all simulations
```

---

## Data Flow

### Input Flow (User → State)

```
1. User selects ticker "VT"
         ↓
   PortfolioSetup calls updateTicker(id, 'VT')
         ↓
   loadTickerData('VT') → loadAndProcessTicker('VT')
         ↓
   setTickerStats({ ...prev, VT: {mu, sigma, returns, priceData} })
         ↓
   App state updated → Re-render with statistics

2. User enters value "$600000"
         ↓
   PortfolioSetup calls updateValue(id, '600000')
         ↓
   setPortfolio([...portfolio, {id, ticker: 'VT', value: '600000'}])
         ↓
   App state updated → Weight auto-calculates

3. User adds spending phase "$50k, 15 years"
         ↓
   SpendingPhasesBuilder calls updateAmount/updateYears
         ↓
   setPhases([...phases, {id, amount: 50000, years: 15}])
         ↓
   App state updated → Timeline visualizes

4. User clicks "Run Simulation"
         ↓
   SimulationControls calls onRunSimulation()
         ↓
   App.jsx validates inputs
         ↓
   Calls alignHistoricalReturns()
         ↓
   Calls useSimulation.runSimulation()
         ↓
   Worker processes simulation
         ↓
   setResults(simulationResults)
         ↓
   ResultsDisplay re-renders with results
```

### Output Flow (State → UI)

```
App State:
  portfolio: [{id: 1, ticker: 'VT', value: '600000'}]
  tickerStats: {VT: {mu: 0.0907, sigma: 0.1523}}
  phases: [{id: 2, amount: 50000, years: 30}]
  results: {successRate: 94.23, ...}

         ↓ Props ↓

PortfolioSetup:
  • Displays: VT, $600,000, 60%, 9.07%, 15.23%
  • Calculates: weight = (600000 / 1000000) × 100 = 60%

SpendingPhasesBuilder:
  • Displays: Phase 1, $50,000/yr, 30 years
  • Calculates: total = 50000 × 30 = $1,500,000

SimulationControls:
  • Displays: Inflation 3%, Iterations 10,000
  • Validates: canRun = true (all data loaded)

ResultsDisplay:
  • Displays: Success Rate 94.2%
  • Renders: PercentileChart with percentilesByYear

PercentileChart:
  • Renders: 5 lines × 56 data points (0-55 years)
  • Tooltip: Shows all percentiles on hover
```

---

## Styling

### CSS Organization

Each component has a dedicated CSS file:
- `PortfolioSetup.css`
- `SpendingPhasesBuilder.css`
- `SimulationControls.css`
- `ResultsDisplay.css`
- `PercentileChart.css`

### Design System

**Colors:**
```css
/* Primary */
--primary: #667eea;
--primary-dark: #5a67d8;

/* Success/Failure */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;

/* Neutrals */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-600: #4b5563;
--gray-800: #1f2937;
```

**Typography:**
```css
/* Headers */
h2: 24px, 600 weight, gray-800
h3: 20px, 600 weight, gray-800
h4: 18px, 500 weight, gray-700

/* Body */
p: 16px, 400 weight, gray-600
small: 14px, 400 weight, gray-500
```

**Spacing:**
- Section padding: 24px
- Card padding: 20px
- Input height: 40px
- Button height: 44px

**Borders:**
- Radius: 8px (cards), 6px (inputs)
- Width: 1px
- Color: gray-200

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  .portfolio-table { font-size: 14px; }
  .statistics-grid { grid-template-columns: 1fr; }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .statistics-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop */
@media (min-width: 1025px) {
  .statistics-grid { grid-template-columns: repeat(4, 1fr); }
  .controls-grid { grid-template-columns: repeat(2, 1fr); }
}
```

---

## User Experience Patterns

### 1. Progressive Disclosure

**Start simple, add complexity as needed:**
1. Portfolio starts with 1 empty row
2. Phases start with 1 default phase
3. Advanced options hidden by default

### 2. Immediate Feedback

**Real-time validation:**
- Weights update as values change
- Errors show inline (red text)
- Loading states visible ("Loading...")
- Progress bar during simulation

### 3. Helpful Defaults

**Sensible starting values:**
- Inflation: 3%
- Iterations: 10,000
- First phase: $50k/30y

### 4. Clear Visual Hierarchy

**Information priority:**
1. **Most important:** Success rate (large, colored)
2. **Important:** Key statistics (cards)
3. **Details:** Chart, table
4. **Context:** Help text, legends

### 5. Error Prevention

**Constraints:**
- Cannot remove last portfolio asset
- Cannot remove last spending phase
- Run button disabled until valid
- Numeric inputs have min/max

### 6. Contextual Help

**Inline hints:**
- "Annual inflation assumption" (below input)
- "More iterations = more accurate" (below selector)
- "How to read this chart" (below chart)

---

## Accessibility

### Semantic HTML

```html
<label htmlFor="inflation-rate">Inflation Rate</label>
<input id="inflation-rate" type="number" />

<button disabled={!canRun} aria-disabled={!canRun}>
  Run Simulation
</button>

<table>
  <thead><tr><th scope="col">Ticker</th></tr></thead>
  <tbody>...</tbody>
</table>
```

### Keyboard Navigation

- All interactive elements focusable (Tab order)
- Buttons activate on Enter/Space
- Dropdowns navigate with arrows
- Tables navigate with arrow keys (browser default)

### Screen Reader Support

**ARIA labels (future enhancement):**
```html
<div role="status" aria-live="polite">
  Running simulation... {progress}%
</div>

<button aria-label="Remove asset from portfolio">✕</button>

<div role="alert" className="error-message">
  Failed to load VT: Network error
</div>
```

---

## Performance Optimizations

### 1. Conditional Rendering

**Only render when needed:**
```javascript
{results && <ResultsDisplay results={results} />}
{!results && <EmptyState />}
```

### 2. Memoization (Future)

**Prevent unnecessary re-renders:**
```javascript
const PortfolioSetup = React.memo(({ portfolio, setPortfolio }) => {
  // Component only re-renders when portfolio changes
});
```

### 3. Debouncing (Future)

**Delay expensive calculations:**
```javascript
const debouncedLoadData = useDebounce(loadTickerData, 300);
```

### 4. Lazy Loading Charts

**Load Recharts only when needed:**
```javascript
const PercentileChart = React.lazy(() => import('./PercentileChart'));

// In component:
{results && (
  <React.Suspense fallback={<div>Loading chart...</div>}>
    <PercentileChart percentilesByYear={results.percentilesByYear} />
  </React.Suspense>
)}
```

---

## Testing

### Manual Testing Checklist

**PortfolioSetup:**
- [ ] Add asset → loads data
- [ ] Remove asset → updates weights
- [ ] Duplicate ticker → both load correctly
- [ ] Change value → weight recalculates
- [ ] Invalid ticker → shows error
- [ ] Network failure → displays error message

**SpendingPhasesBuilder:**
- [ ] Add phase → timeline updates
- [ ] Remove phase → timeline recalculates
- [ ] Change amount → inflation preview updates
- [ ] Change duration → total years updates

**SimulationControls:**
- [ ] Change inflation → persists value
- [ ] Change iterations → persists value
- [ ] Validation errors → button disabled
- [ ] All valid → button enabled
- [ ] Click run → triggers simulation

**ResultsDisplay:**
- [ ] No results → shows empty state
- [ ] Success ≥90% → green color
- [ ] Success 70-89% → orange color
- [ ] Success <70% → red color
- [ ] Chart renders → all 5 lines visible
- [ ] Hover tooltip → shows percentiles

**PercentileChart:**
- [ ] Responsive resize → chart adjusts
- [ ] Hover line → activeDot appears
- [ ] Click legend → toggles line visibility
- [ ] Y-axis formats → $1.5M, $567k

---

## Future Enhancements

### Phase 2
- [ ] **Undo/Redo:** Portfolio and phase changes
- [ ] **Copy/Paste:** Duplicate portfolios
- [ ] **Export:** Download results as PDF/CSV
- [ ] **Shareable URLs:** Encode state in URL query params
- [ ] **Dark mode:** Toggle for low-light environments
- [ ] **Comparison view:** Side-by-side scenarios
- [ ] **Custom percentiles:** User-selectable ranges
- [ ] **Advanced chart controls:** Zoom, pan, toggle areas

### Accessibility
- [ ] Full ARIA labels on all interactive elements
- [ ] Skip links for keyboard navigation
- [ ] High contrast mode
- [ ] Focus visible styles
- [ ] Screen reader announcements for dynamic content

---

## References

**Files:**
- `src/components/PortfolioSetup.jsx` - Portfolio builder
- `src/components/SpendingPhasesBuilder.jsx` - Spending planner
- `src/components/SimulationControls.jsx` - Simulation settings
- `src/components/ResultsDisplay.jsx` - Results dashboard
- `src/components/PercentileChart.jsx` - Interactive chart

**Dependencies:**
- React 18: https://react.dev/
- Recharts 3.8: https://recharts.org/

**Documentation:**
- [`app-orchestration.md`](app-orchestration.md) - How App.jsx coordinates components
- [`web-worker.md`](web-worker.md) - Background simulation processing
- [`data-management.md`](data-management.md) - Data loading and alignment

---

**Last Updated:** 2025-04-01
**Version:** 1.0
