# App Orchestration - Technical Design Document

**Component:** Application State Management and Coordination
**Files:** `src/App.jsx`, `src/hooks/useSimulation.js`, `src/App.css`
**Version:** 1.0
**Last Updated:** 2025-04-01

---

## Overview

The App Orchestration layer manages the entire application's state, coordinates components, validates inputs, and executes the simulation workflow. It acts as the central hub connecting all UI components, data management, and simulation logic.

### Responsibilities

- ✅ **State Management:** Portfolio, phases, settings, ticker data, results
- ✅ **Validation:** Ensure inputs are complete and valid before simulation
- ✅ **Workflow Coordination:** Data loading → Alignment → Simulation → Results
- ✅ **Error Handling:** Catch and display errors at each step
- ✅ **User Experience:** Auto-scroll to results, loading states, progress tracking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│                   (Central State Container)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    State                             │   │
│  │  • portfolio: Array<{id, ticker, value}>            │   │
│  │  • phases: Array<{id, amount, years}>               │   │
│  │  • tickerStats: {ticker: {mu, sigma, returns}}      │   │
│  │  • inflationRate: number                             │   │
│  │  • iterations: number                                │   │
│  │  • alignmentError: string | null                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              useSimulation Hook                      │   │
│  │  • isRunning: boolean                                │   │
│  │  • progress: number                                  │   │
│  │  • results: Object | null                            │   │
│  │  • error: string | null                              │   │
│  │  • runSimulation(params): Promise                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Core Functions                         │   │
│  │  • validateInputs(): Array<string>                   │   │
│  │  • handleRunSimulation(): Promise<void>              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└───┬───────────┬───────────┬───────────┬───────────┬─────────┘
    │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼
Portfolio  Spending   Simulation Results     Footer
 Setup      Phases     Controls  Display
```

---

## State Management

### State Variables

**Portfolio State:**
```javascript
const [portfolio, setPortfolio] = useState([]);

// Shape:
[
  { id: 1649123456789, ticker: 'VT', value: '600000' },
  { id: 1649123456790, ticker: 'QQQ', value: '300000' },
  { id: 1649123456791, ticker: 'BND', value: '100000' }
]
```

**Why id?**
- Unique key for React rendering
- Allows multiple entries with same ticker
- Generated via `Date.now()` on creation

---

**Spending Phases State:**
```javascript
const [phases, setPhases] = useState([]);

// Shape:
[
  { id: 1649123456800, amount: 50000, years: 15 },
  { id: 1649123456801, amount: 30000, years: 40 }
]
```

**Amount:** Annual spending in today's dollars
**Years:** Duration of this phase

---

**Ticker Statistics Cache:**
```javascript
const [tickerStats, setTickerStats] = useState({});

// Shape:
{
  'VT': {
    mu: 0.0907,              // Annualized return
    sigma: 0.1523,           // Annualized volatility
    returns: [...],          // Monthly log returns (199 values)
    priceData: [...]         // {date, close} objects (200 values)
  },
  'QQQ': { mu, sigma, returns, priceData },
  'BND': { mu, sigma, returns, priceData }
}
```

**Why shared cache?**
- Load each ticker only once
- Multiple portfolio rows can reference same ticker
- Persists across component re-renders

---

**Simulation Settings:**
```javascript
const [inflationRate, setInflationRate] = useState(0.03);  // 3%
const [iterations, setIterations] = useState(10000);       // 10k
```

**Defaults:**
- Inflation: 3% (0.03)
- Iterations: 10,000

---

**Error State:**
```javascript
const [alignmentError, setAlignmentError] = useState(null);
```

**Purpose:** Errors that occur during data alignment (before simulation starts)

**Separate from:** `useSimulation` hook's `error` (errors during simulation)

---

**Simulation Hook State:**
```javascript
const { isRunning, progress, results, error, runSimulation } = useSimulation();
```

**Managed by hook:**
- `isRunning`: Boolean, true while worker is running
- `progress`: Number (0-100), percentage complete
- `results`: Object, simulation statistics
- `error`: String, error message from worker
- `runSimulation`: Function to start simulation

---

## Core Functions

### 1. validateInputs()

Comprehensive validation before allowing simulation to run.

**Returns:** `Array<string>` - List of error messages (empty if valid)

**Implementation:**
```javascript
const validateInputs = () => {
  const errors = [];

  // 1. Check portfolio exists and has valid entries
  if (portfolio.length === 0 || !portfolio.some(a => a.ticker && a.value > 0)) {
    errors.push('Add at least one asset to your portfolio');
  }

  // 2. Check for incomplete portfolio entries (ticker without value)
  const hasIncompleteTickers = portfolio.some(a => a.ticker && !a.value);
  if (hasIncompleteTickers) {
    errors.push('Enter a value for all selected tickers');
  }

  // 3. Check for incomplete portfolio entries (value without ticker)
  const hasIncompleteValues = portfolio.some(a => a.value && !a.ticker);
  if (hasIncompleteValues) {
    errors.push('Select a ticker for all entered values');
  }

  // 4. Check phases exist and have valid entries
  if (phases.length === 0 || !phases.some(p => p.amount > 0 && p.years > 0)) {
    errors.push('Add at least one spending phase');
  }

  // 5. Check for incomplete phases
  const hasIncompletePhases = phases.some(p => !p.amount || !p.years);
  if (hasIncompletePhases) {
    errors.push('Enter both amount and duration for all spending phases');
  }

  // 6. Check that all ticker data has loaded
  const tickersNeedingStats = portfolio
    .filter(a => a.ticker && a.value > 0)
    .map(a => a.ticker)
    .filter((ticker, index, self) => self.indexOf(ticker) === index); // Unique

  const missingStats = tickersNeedingStats.filter(ticker => !tickerStats[ticker]);
  if (missingStats.length > 0) {
    errors.push(`Still loading data for: ${missingStats.join(', ')}`);
  }

  return errors;
};
```

**Usage:**
```javascript
const validationErrors = validateInputs();
const canRun = validationErrors.length === 0 && !isRunning;

// Pass to SimulationControls
<SimulationControls
  validationErrors={validationErrors}
  canRun={canRun}
  // ...
/>
```

**Error Examples:**
- "Add at least one asset to your portfolio"
- "Enter a value for all selected tickers"
- "Add at least one spending phase"
- "Still loading data for: VT, QQQ"

---

### 2. handleRunSimulation()

Main workflow function that executes the simulation pipeline.

**Steps:**
1. Validate inputs (early exit if invalid)
2. Clear previous errors
3. Build simulation portfolio with statistics
4. Align historical returns to common dates
5. Run Monte Carlo simulation via Web Worker
6. Auto-scroll to results
7. Handle any errors

**Implementation:**
```javascript
const handleRunSimulation = async () => {
  // Step 1: Validate
  if (!canRun) {
    console.log('Cannot run: validation failed');
    return;
  }

  // Step 2: Clear errors
  setAlignmentError(null);

  try {
    console.log('Starting simulation...');

    // Step 3: Build simulation portfolio
    const simulationPortfolio = portfolio
      .filter(a => a.ticker && a.value > 0)
      .map(a => ({
        ticker: a.ticker,
        value: parseFloat(a.value),
        mu: tickerStats[a.ticker].mu,
        sigma: tickerStats[a.ticker].sigma
      }));

    console.log('Simulation portfolio:', simulationPortfolio);

    // Step 4: Align historical returns
    const uniqueTickers = [...new Set(simulationPortfolio.map(a => a.ticker))];
    console.log('Aligning data for tickers:', uniqueTickers);

    const { historicalReturns } = alignHistoricalReturns(tickerStats, uniqueTickers);
    console.log('Data aligned successfully');

    // Step 5: Run simulation
    console.log('Running Monte Carlo simulation...');
    await runSimulation({
      portfolio: simulationPortfolio,
      phases: phases.filter(p => p.amount > 0 && p.years > 0),
      inflationRate,
      iterations,
      historicalReturns
    });

    // Step 6: Auto-scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

  } catch (err) {
    // Step 7: Handle errors
    console.error('Simulation error:', err);
    setAlignmentError(err.message || 'Failed to run simulation');
  }
};
```

**Error Handling:**

**Alignment errors (before simulation):**
- Caught by try-catch
- Set in `alignmentError` state
- Displayed in error banner

**Simulation errors (during execution):**
- Handled by `useSimulation` hook
- Set in `error` state
- Displayed in error banner

**Both types displayed:**
```javascript
{(error || alignmentError) && (
  <div className="error-banner">
    <h3>Simulation Error</h3>
    <p>{alignmentError || error}</p>
  </div>
)}
```

---

## Workflow: End-to-End Simulation

### Complete Flow

```
1. USER BUILDS PORTFOLIO
   ↓
   User selects "VT" ticker
   ↓
   PortfolioSetup calls updateTicker(id, 'VT')
   ↓
   loadTickerData('VT') → loadAndProcessTicker('VT')
   ↓
   setTickerStats({ ...prev, VT: {mu, sigma, returns, priceData} })
   ↓
   App state updated → UI shows μ=9.07%, σ=15.23%

2. USER DEFINES SPENDING
   ↓
   User enters $50k/year for 30 years
   ↓
   SpendingPhasesBuilder calls updateAmount/updateYears
   ↓
   setPhases([{id, amount: 50000, years: 30}])
   ↓
   App state updated → Timeline visualizes

3. USER CONFIGURES SETTINGS
   ↓
   User sets inflation to 3%, iterations to 10k
   ↓
   SimulationControls calls setInflationRate(0.03), setIterations(10000)
   ↓
   App state updated → Settings persisted

4. USER CLICKS "RUN SIMULATION"
   ↓
   SimulationControls calls onRunSimulation()
   ↓
   App.jsx: handleRunSimulation()

5. VALIDATION
   ↓
   validateInputs() checks:
   • Portfolio has ≥1 valid asset
   • Phases has ≥1 valid phase
   • All ticker data loaded
   ↓
   validationErrors = [] → canRun = true ✓

6. BUILD SIMULATION PORTFOLIO
   ↓
   Filter portfolio to valid entries
   ↓
   Map to {ticker, value, mu, sigma}
   ↓
   simulationPortfolio = [
     {ticker: 'VT', value: 600000, mu: 0.0907, sigma: 0.1523},
     {ticker: 'QQQ', value: 300000, mu: 0.1342, sigma: 0.2145}
   ]

7. ALIGN HISTORICAL DATA
   ↓
   Extract unique tickers: ['VT', 'QQQ']
   ↓
   alignHistoricalReturns(tickerStats, ['VT', 'QQQ'])
   ↓
   Find overlapping dates: 2008-06 to 2024-12 (200 months)
   ↓
   Recalculate returns on aligned prices
   ↓
   historicalReturns = {
     VT:  [199 aligned returns],
     QQQ: [199 aligned returns]
   }

8. RUN SIMULATION
   ↓
   Call useSimulation.runSimulation({
     portfolio,
     phases,
     inflationRate: 0.03,
     iterations: 10000,
     historicalReturns
   })
   ↓
   Hook creates Web Worker
   ↓
   Worker receives RUN_SIMULATION message

9. WORKER PROCESSES
   ↓
   Aggregate portfolio (combine duplicate tickers)
   ↓
   Calculate correlation matrix
   ↓
   Cholesky decomposition
   ↓
   Run 10,000 iterations:
     • Generate correlated returns
     • Simulate portfolio year-by-year
     • Subtract inflation-adjusted spending
     • Track success/failure
   ↓
   Send PROGRESS messages (0% → 100%)
   ↓
   Calculate statistics (percentiles)
   ↓
   Send COMPLETE message

10. DISPLAY RESULTS
    ↓
    Hook receives COMPLETE
    ↓
    setResults(simulationResults)
    ↓
    App re-renders ResultsDisplay
    ↓
    Auto-scroll to results section
    ↓
    User sees:
      • Success rate: 94.2%
      • Median ending balance: $1,234,567
      • Percentile chart
      • Balance snapshots
```

---

## Component Rendering

### JSX Structure

```javascript
<div className="app">
  {/* Header */}
  <header className="app-header">
    <h1>FIRE Calculator</h1>
    <p>Retirement Monte Carlo Simulator</p>
  </header>

  {/* Main Content */}
  <main className="app-main">
    {/* 1. Portfolio Setup */}
    <PortfolioSetup
      portfolio={portfolio}
      setPortfolio={setPortfolio}
      tickerStats={tickerStats}
      setTickerStats={setTickerStats}
    />

    {/* 2. Spending Phases */}
    <SpendingPhasesBuilder
      phases={phases}
      setPhases={setPhases}
      inflationRate={inflationRate}
    />

    {/* 3. Simulation Controls */}
    <SimulationControls
      inflationRate={inflationRate}
      setInflationRate={setInflationRate}
      iterations={iterations}
      setIterations={setIterations}
      onRunSimulation={handleRunSimulation}
      isRunning={isRunning}
      progress={progress}
      canRun={canRun}
      validationErrors={validationErrors}
    />

    {/* 4. Error Display */}
    {(error || alignmentError) && (
      <div className="error-banner">
        <h3>Simulation Error</h3>
        <p>{alignmentError || error}</p>
      </div>
    )}

    {/* 5. Results Display */}
    <div id="results">
      <ResultsDisplay results={results} />
    </div>
  </main>

  {/* Footer */}
  <footer className="app-footer">
    <p>
      <strong>Important:</strong> This uses total return data...
    </p>
  </footer>
</div>
```

---

## Data Flow Patterns

### 1. Unidirectional Data Flow

**App (parent) → Components (children):**
```
App state → Props → Child components
```

**Child updates → App state:**
```
Child event → Callback prop → App setState
```

**Example:**
```javascript
// In App.jsx
<PortfolioSetup
  portfolio={portfolio}           // Data down
  setPortfolio={setPortfolio}     // Events up
/>

// In PortfolioSetup.jsx
const updateValue = (id, value) => {
  setPortfolio(portfolio.map(asset =>
    asset.id === id ? { ...asset, value } : asset
  ));
};
```

### 2. Shared State via Props Drilling

**tickerStats is passed to:**
- PortfolioSetup (to display μ, σ)
- App itself (for simulation execution)

**Why not Context API?**
- Only 1 level of nesting
- Props drilling is clear and simple
- No unnecessary abstraction

### 3. Computed Values (Not Stored)

**Derived on every render:**
```javascript
const validationErrors = validateInputs();
const canRun = validationErrors.length === 0 && !isRunning;
```

**Why not useState?**
- Always in sync with source state
- No risk of stale data
- Simpler logic (no need to update on every change)

### 4. Async Operations

**Data loading:**
```javascript
async function loadTickerData(ticker) {
  const data = await loadAndProcessTicker(ticker);
  setTickerStats(prev => ({ ...prev, [ticker]: data }));
}
```

**Simulation:**
```javascript
async function handleRunSimulation() {
  const results = await runSimulation({...});
  // results automatically set by hook
}
```

---

## Error Handling Strategy

### Error Types and Handlers

**1. Validation Errors (Pre-simulation)**
- **Detection:** validateInputs()
- **Display:** SimulationControls validation error list
- **Prevention:** Button disabled when errors exist
- **User Action:** Fix inputs

**2. Alignment Errors (Pre-simulation)**
- **Detection:** try-catch in handleRunSimulation
- **State:** alignmentError
- **Display:** Error banner above results
- **Example:** "Not enough overlapping data points"

**3. Simulation Errors (During execution)**
- **Detection:** Worker error messages
- **State:** useSimulation hook's error
- **Display:** Error banner above results
- **Example:** "Matrix is not positive definite"

**4. Data Loading Errors**
- **Detection:** try-catch in loadTickerData
- **State:** PortfolioSetup local errors state
- **Display:** Inline error in table row
- **Example:** "Failed to load VT: Network error"

### Error Display Hierarchy

```
1. Validation errors (blocking)
   → Red list in SimulationControls
   → Button disabled

2. Alignment/Simulation errors (post-action)
   → Red banner above results
   → User can fix inputs and retry

3. Data loading errors (inline)
   → Red text in portfolio table
   → User can remove asset or wait for retry
```

---

## User Experience Enhancements

### 1. Auto-Scroll to Results

```javascript
setTimeout(() => {
  document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
}, 100);
```

**Why 100ms delay?**
- Allow results to render first
- Prevents scroll to empty state

**Why smooth?**
- Better UX than instant jump
- Keeps user oriented

### 2. Console Logging

**Development workflow tracking:**
```javascript
console.log('Starting simulation...');
console.log('Simulation portfolio:', simulationPortfolio);
console.log('Aligning data for tickers:', uniqueTickers);
console.log('Data aligned successfully');
console.log('Running Monte Carlo simulation...');
```

**Benefits:**
- Debugging complex workflows
- Performance profiling
- User support (ask for console logs)

**Production:** Could be removed or gated by `if (process.env.NODE_ENV === 'development')`

### 3. Progress Tracking

**Real-time updates from worker:**
```javascript
{isRunning && (
  <button disabled>
    Running... {progress}%
  </button>
)}
```

**User feedback:**
- Prevents perceived hanging
- Shows system is working
- Allows user to estimate time remaining

### 4. Disabled States

**Prevent invalid actions:**
```javascript
<button
  onClick={handleRunSimulation}
  disabled={!canRun || isRunning}
>
  Run Simulation
</button>
```

**Benefits:**
- Clear visual feedback (grayed out)
- Prevents confusing error messages
- Guides user to fix issues first

---

## Styling

### App.css Structure

**Layout:**
```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px 20px;
  text-align: center;
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px;
  width: 100%;
  flex: 1;
}

.app-footer {
  background-color: #1f2937;
  color: #d1d5db;
  padding: 24px;
  text-align: center;
  margin-top: 48px;
}
```

**Error Banner:**
```css
.error-banner {
  background-color: #fee2e2;
  border: 2px solid #ef4444;
  border-radius: 8px;
  padding: 20px;
  margin: 24px 0;
}

.error-banner h3 {
  color: #dc2626;
  margin: 0 0 8px 0;
}

.error-banner p {
  color: #991b1b;
  margin: 0;
}
```

**Spacing:**
```css
.app-main > * + * {
  margin-top: 32px;  /* Space between sections */
}
```

---

## Performance Considerations

### 1. State Updates

**Immutable updates (correct):**
```javascript
setPortfolio([...portfolio, newAsset]);  // Creates new array
setTickerStats({ ...prev, [ticker]: data });  // Creates new object
```

**Why immutable?**
- React detects changes via reference comparison
- Enables time-travel debugging
- Prevents subtle bugs

### 2. Unnecessary Re-renders

**Current approach: Re-render on every state change**
- Simple, correct
- Performance sufficient for this app

**Future optimization (if needed):**
```javascript
const MemoizedPortfolioSetup = React.memo(PortfolioSetup);
```

### 3. Large State Objects

**tickerStats can grow:**
- 6 tickers × ~200 prices each = ~1200 objects
- Memory usage: ~100 KB

**Acceptable because:**
- User typically uses 3-4 tickers
- Data shared across portfolio rows
- No redundant storage

---

## Testing

### Manual Testing Checklist

**Validation:**
- [ ] Empty portfolio → shows validation error
- [ ] Incomplete ticker → shows error
- [ ] Incomplete phase → shows error
- [ ] All valid → button enabled

**Data Loading:**
- [ ] Select ticker → loads statistics
- [ ] Duplicate ticker → loads once
- [ ] Network failure → shows error
- [ ] Statistics display → correct values

**Simulation:**
- [ ] Click run → shows progress
- [ ] Progress updates → 0% to 100%
- [ ] Completes → shows results
- [ ] Auto-scroll → scrolls to results
- [ ] Run again → clears previous results

**Error Handling:**
- [ ] Alignment error → shows banner
- [ ] Simulation error → shows banner
- [ ] Can retry after error

**State Persistence:**
- [ ] Edit portfolio after simulation → preserves changes
- [ ] Change settings after simulation → preserves changes
- [ ] Re-run with different settings → new results

---

## Integration Points

### With Data Management

```javascript
import { alignHistoricalReturns } from './lib/align-data';

const { historicalReturns } = alignHistoricalReturns(tickerStats, uniqueTickers);
```

**Input:** tickerStats (populated by PortfolioSetup)
**Output:** historicalReturns (aligned arrays)

### With Web Worker

```javascript
import { useSimulation } from './hooks/useSimulation';

const { runSimulation, isRunning, progress, results, error } = useSimulation();

await runSimulation({
  portfolio,
  phases,
  inflationRate,
  iterations,
  historicalReturns
});
```

**Hook handles:**
- Worker lifecycle (create, terminate)
- Message passing (parameters, progress, results)
- State management (isRunning, results, error)

### With UI Components

**Props passed down:**
```
App → PortfolioSetup:
  portfolio, setPortfolio, tickerStats, setTickerStats

App → SpendingPhasesBuilder:
  phases, setPhases, inflationRate

App → SimulationControls:
  inflationRate, setInflationRate, iterations, setIterations
  onRunSimulation, isRunning, progress, canRun, validationErrors

App → ResultsDisplay:
  results
```

---

## Design Decisions

### 1. Centralized State (Not Redux)

**Decision:** Use React hooks (useState) for all state

**Rationale:**
- ✅ App is small-to-medium size (~5 components)
- ✅ State is simple (arrays, objects, numbers)
- ✅ No complex async actions requiring middleware
- ✅ Less boilerplate, faster development

**Trade-off:**
- ❌ All state in one component (App.jsx)
- ✅ Easy to understand, debug, and test

**Alternative considered:**
- Redux: Too much overhead for this app size
- Context API: Unnecessary for 1 level of nesting

---

### 2. Props Drilling (Not Context)

**Decision:** Pass state via props through component tree

**Rationale:**
- ✅ Only 1 level deep (App → Components)
- ✅ Clear data flow (easy to trace)
- ✅ Explicit dependencies (no hidden coupling)

**Trade-off:**
- ❌ Verbose prop passing
- ✅ Simple, no magic, debuggable

---

### 3. Shared tickerStats Cache

**Decision:** Store loaded ticker data at App level, not PortfolioSetup

**Rationale:**
- ✅ Needed by PortfolioSetup (display μ, σ)
- ✅ Needed by App (for simulation)
- ✅ Avoid loading same ticker twice
- ✅ Persist across portfolio changes

**Alternative considered:**
- Store in PortfolioSetup: Would need to lift up anyway

---

### 4. Validation Before Simulation

**Decision:** Validate inputs, disable button if invalid

**Rationale:**
- ✅ Prevent confusing error messages
- ✅ Guide user to fix issues
- ✅ Better UX than error after click

**Implementation:**
- validateInputs() runs on every render
- canRun computed from validation result
- Button disabled when !canRun

---

### 5. Auto-Scroll to Results

**Decision:** Automatically scroll to results after simulation

**Rationale:**
- ✅ User expects to see results immediately
- ✅ Results might be below fold (need scroll)
- ✅ Smooth scroll is pleasant

**Trade-off:**
- ❌ User loses scroll position
- ✅ Rarely an issue (user just clicked "Run")

---

### 6. Console Logging in Production

**Decision:** Keep console.log statements in production code

**Rationale:**
- ✅ Helpful for debugging user issues
- ✅ Performance impact negligible
- ✅ Can ask users for console output

**Alternative:**
- Remove in build: Loses diagnostic capability
- Use logger library: Overkill for this app

---

## Future Enhancements

### State Management
- [ ] **URL State Sync:** Encode portfolio/phases in URL query params for sharing
- [ ] **LocalStorage Persistence:** Save state across page reloads
- [ ] **Undo/Redo:** History stack for state changes
- [ ] **Multiple Scenarios:** Compare different portfolios side-by-side

### Validation
- [ ] **Real-time Validation:** Show errors as user types (debounced)
- [ ] **Warning Levels:** Distinguish errors (blocking) from warnings (informational)
- [ ] **Smart Suggestions:** "Your success rate is low. Try reducing spending by $10k/year."

### User Experience
- [ ] **Keyboard Shortcuts:** Ctrl+Enter to run simulation
- [ ] **Progress Details:** Show which iteration is running (e.g., "3,487 / 10,000")
- [ ] **Cancel Button:** Allow user to abort long simulations
- [ ] **Export Results:** Download as PDF or CSV

### Performance
- [ ] **Memoization:** React.memo on components to prevent unnecessary re-renders
- [ ] **Code Splitting:** Lazy load ResultsDisplay and PercentileChart
- [ ] **Debounced Input:** Delay expensive calculations while user types

---

## References

**Files:**
- `src/App.jsx` - Main application component
- `src/hooks/useSimulation.js` - Simulation Web Worker hook
- `src/App.css` - Application-level styles

**Dependencies:**
- React 18 useState, useEffect hooks
- `lib/align-data.js` - Data alignment utility
- `components/*.jsx` - All UI components

**Documentation:**
- [`ui-components.md`](ui-components.md) - All React components
- [`web-worker.md`](web-worker.md) - useSimulation hook details
- [`data-management.md`](data-management.md) - Data loading and alignment
- [`simulation-engine.md`](simulation-engine.md) - Monte Carlo algorithms

---

**Last Updated:** 2025-04-01
**Version:** 1.0
