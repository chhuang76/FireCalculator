# Web Worker - Technical Design Document

**Component:** Background Simulation Processing
**Files:** `src/workers/simulation-worker.js`, `src/hooks/useSimulation.js`
**Version:** 1.0
**Last Updated:** 2025-04-01

---

## Overview

The Web Worker subsystem enables background execution of Monte Carlo simulations without freezing the user interface. This provides a smooth user experience during computationally expensive operations.

### Key Benefits

- ✅ **Non-blocking UI:** Simulations run in separate thread
- ✅ **Real-time progress:** Updates every 1% completion
- ✅ **Cancellable:** User can abort long-running simulations
- ✅ **Error isolation:** Worker crashes don't affect main thread
- ✅ **Native browser feature:** No external dependencies

### Performance Impact

| Metric | Without Worker | With Worker |
|--------|----------------|-------------|
| UI responsiveness | Frozen for ~3s | Always responsive |
| Animation frame rate | 0 FPS (frozen) | 60 FPS maintained |
| Progress updates | None | Real-time (0-100%) |
| User experience | Poor | Excellent |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread (UI)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              useSimulation Hook                         │ │
│  │  • Manages worker lifecycle                             │ │
│  │  • Handles message passing                              │ │
│  │  • Exposes state (isRunning, progress, results)         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────▲─────────────────────────┘
                   │                  │
            postMessage          onmessage
          (RUN_SIMULATION)    (PROGRESS/COMPLETE/ERROR)
                   │                  │
                   ▼                  │
┌─────────────────────────────────────────────────────────────┐
│                    Worker Thread                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         simulation-worker.js                            │ │
│  │                                                          │ │
│  │  1. Receive simulation parameters                       │ │
│  │  2. Aggregate portfolio                                 │ │
│  │  3. Calculate correlation matrix                        │ │
│  │  4. Cholesky decomposition                              │ │
│  │  5. Run N iterations:                                   │ │
│  │     • Generate correlated returns                       │ │
│  │     • Simulate portfolio                                │ │
│  │     • Send progress updates (every 1%)                  │ │
│  │  6. Calculate statistics                                │ │
│  │  7. Send results to main thread                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Message Protocol

### Messages FROM Main Thread TO Worker

#### `RUN_SIMULATION`
Start a new simulation.

**Format:**
```javascript
{
  type: 'RUN_SIMULATION',
  payload: {
    portfolio: [
      { ticker: 'VT', value: 600000, mu: 0.0907, sigma: 0.1523 },
      { ticker: 'QQQ', value: 300000, mu: 0.1342, sigma: 0.2145 },
      { ticker: 'BND', value: 100000, mu: 0.0211, sigma: 0.0412 }
    ],
    phases: [
      { amount: 50000, years: 15 },
      { amount: 30000, years: 40 }
    ],
    inflationRate: 0.03,
    iterations: 10000,
    historicalReturns: {
      'VT':  [0.012, -0.034, 0.021, ...],  // 199 aligned returns
      'QQQ': [0.025, -0.041, 0.033, ...],  // 199 aligned returns
      'BND': [0.003, 0.002, 0.004, ...]    // 199 aligned returns
    }
  }
}
```

**Payload Fields:**
- `portfolio` (Array): Assets with ticker, value, μ, σ
- `phases` (Array): Spending phases with amount and duration
- `inflationRate` (number): Annual inflation rate (e.g., 0.03 = 3%)
- `iterations` (number): Number of Monte Carlo runs (1k-50k)
- `historicalReturns` (Object): Aligned log returns per ticker

---

### Messages FROM Worker TO Main Thread

#### `PROGRESS`
Simulation progress update (sent every 1%).

**Format:**
```javascript
{
  type: 'PROGRESS',
  payload: {
    percent: 47  // 0-100
  }
}
```

**Frequency:** Every ~100 iterations (for 10k total)

---

#### `COMPLETE`
Simulation finished successfully.

**Format:**
```javascript
{
  type: 'COMPLETE',
  payload: {
    results: {
      successRate: 94.23,
      totalRuns: 10000,
      successfulRuns: 9423,
      failedRuns: 577,
      medianEndingBalance: 1234567,
      worstCaseEndingBalance: 0,
      averageFailureYear: 27.3,
      percentilesByYear: [
        { year: 0, p10: 1000000, p25: 1000000, p50: 1000000, p75: 1000000, p90: 1000000 },
        { year: 1, p10: 978234, p25: 1023456, p50: 1067890, p75: 1112345, p90: 1156789 },
        // ... one entry per year
        { year: 55, p10: 0, p25: 234567, p50: 1234567, p75: 2345678, p90: 3456789 }
      ]
    }
  }
}
```

**Results Fields:**
- `successRate`: Percentage of successful runs (0-100)
- `totalRuns`: Total iterations executed
- `successfulRuns`: Runs that didn't run out of money
- `failedRuns`: Runs that depleted portfolio
- `medianEndingBalance`: 50th percentile final balance (successful runs only)
- `worstCaseEndingBalance`: Minimum final balance (successful runs only)
- `averageFailureYear`: Mean year of failure (failed runs only, null if none)
- `percentilesByYear`: Array of percentile data for each year (0 to totalYears)

---

#### `ERROR`
Simulation failed with error.

**Format:**
```javascript
{
  type: 'ERROR',
  payload: {
    error: 'Arrays must have same non-zero length'
  }
}
```

**Common Errors:**
- "Arrays must have same non-zero length" - Misaligned historical returns
- "Matrix is not positive definite" - Invalid correlation matrix
- "Invalid price data" - Corrupted CSV data
- "Unknown message type" - Invalid message sent to worker

---

## Component 1: Web Worker (`simulation-worker.js`)

### Structure

The worker file contains:
1. **Inline simulation engine** - Copied functions from `simulation-engine.js`
2. **Message handler** - Processes incoming messages
3. **Simulation orchestrator** - Runs all steps sequentially

**Why inline?** Web Workers have limited import capabilities. To avoid bundling complexity, we duplicate the simulation engine code within the worker.

### Worker Lifecycle

```
1. Main thread creates worker
   new Worker('simulation-worker.js')

2. Worker loads and initializes
   self.onmessage registered

3. Main thread sends RUN_SIMULATION
   worker.postMessage({type: 'RUN_SIMULATION', payload: {...}})

4. Worker processes message
   • Validates message type
   • Extracts payload
   • Runs simulation steps
   • Sends PROGRESS messages

5. Worker completes or errors
   • Sends COMPLETE or ERROR
   • Continues listening

6. Main thread terminates worker
   worker.terminate()
   • Worker is destroyed
   • Memory is freed
```

### Message Handler Implementation

**Location:** Lines 286-372 in `simulation-worker.js`

```javascript
self.onmessage = function(e) {
  const { type, payload } = e.data;

  // Validate message type
  if (type !== 'RUN_SIMULATION') {
    self.postMessage({
      type: 'ERROR',
      payload: { error: 'Unknown message type' }
    });
    return;
  }

  try {
    // Step 1: Extract parameters
    const { portfolio, phases, inflationRate, iterations, historicalReturns } = payload;

    // Step 2: Aggregate portfolio (combine duplicate tickers)
    const aggregatedPortfolio = aggregatePortfolio(portfolio);

    // Step 3: Flatten spending phases to annual array
    const flatSpending = [];
    phases.forEach(phase => {
      for (let i = 0; i < phase.years; i++) {
        flatSpending.push(phase.amount);
      }
    });
    const totalYears = flatSpending.length;

    // Step 4: Calculate correlation matrix from historical data
    const { matrix: correlationMatrix, tickers } = calculateCorrelationMatrix(historicalReturns);

    // Step 5: Build covariance matrix (Σ = ρ × σ_i × σ_j)
    const sigmas = tickers.map(ticker => {
      const asset = aggregatedPortfolio.find(a => a.ticker === ticker);
      return asset.sigma;
    });
    const covarianceMatrix = buildCovarianceMatrix(correlationMatrix, sigmas);

    // Step 6: Cholesky decomposition (Σ = L × L^T)
    const choleskyMatrix = choleskyDecomposition(covarianceMatrix);

    // Step 7: Run Monte Carlo iterations
    const results = [];
    const progressInterval = Math.max(1, Math.floor(iterations / 100));

    for (let i = 0; i < iterations; i++) {
      // Simulate one path
      const result = runSingleSimulation({
        portfolio: aggregatedPortfolio,
        flatSpending,
        inflationRate,
        totalYears,
        choleskyMatrix,
        tickers
      });

      results.push(result);

      // Send progress update every 1%
      if ((i + 1) % progressInterval === 0) {
        const percent = Math.floor(((i + 1) / iterations) * 100);
        self.postMessage({
          type: 'PROGRESS',
          payload: { percent }
        });
      }
    }

    // Step 8: Calculate statistics across all iterations
    const stats = calculateStatistics(results, totalYears);

    // Step 9: Send results back to main thread
    self.postMessage({
      type: 'COMPLETE',
      payload: { results: stats }
    });

  } catch (error) {
    // Send error to main thread
    self.postMessage({
      type: 'ERROR',
      payload: { error: error.message }
    });
  }
};
```

**Key Points:**
- Single message handler for all incoming messages
- Try-catch wraps entire simulation to catch any errors
- Progress updates sent every ~1% (100 updates total)
- Worker continues running after completion (can receive new messages)

---

## Component 2: useSimulation Hook (`useSimulation.js`)

### Purpose
React custom hook that abstracts Web Worker complexity into a simple API.

### State Management

```javascript
const {
  isRunning,        // boolean - Is simulation currently running?
  progress,         // number (0-100) - Current progress percentage
  results,          // object | null - Simulation results
  error,            // string | null - Error message if failed
  runSimulation,    // function - Start new simulation
  cancelSimulation  // function - Abort running simulation
} = useSimulation();
```

### Hook Implementation

#### State Variables

```javascript
const [isRunning, setIsRunning] = useState(false);
const [progress, setProgress] = useState(0);
const [results, setResults] = useState(null);
const [error, setError] = useState(null);
const workerRef = useRef(null);  // Holds Worker instance
```

**Why useRef for worker?**
- Worker persists across renders
- Not part of React state (no re-render on change)
- Can be accessed in cleanup functions

---

#### `runSimulation(params)` Function

Start a new simulation in the background.

**Parameters:**
```javascript
{
  portfolio: Array,
  phases: Array,
  inflationRate: number,
  iterations: number,
  historicalReturns: Object
}
```

**Returns:** `Promise<results>` - Resolves when simulation completes

**Algorithm:**
```
1. Reset state
   • isRunning = true
   • progress = 0
   • results = null
   • error = null

2. Create Web Worker
   • new Worker(simulation-worker.js)
   • Store in workerRef

3. Set up message listener
   • Create Promise that resolves on COMPLETE
   • Update progress on PROGRESS messages
   • Reject on ERROR messages

4. Send RUN_SIMULATION message
   • postMessage with parameters

5. Wait for results
   • await simulationPromise

6. Clean up
   • worker.terminate()
   • workerRef.current = null

7. Update state
   • results = simulationResults
   • isRunning = false
   • progress = 100

8. Return results
```

**Error Handling:**
```javascript
try {
  // Simulation logic
} catch (err) {
  setError(err.message);
  setIsRunning(false);

  // Always clean up worker
  if (workerRef.current) {
    workerRef.current.terminate();
    workerRef.current = null;
  }

  throw err;  // Propagate to caller
}
```

**Example Usage:**
```javascript
const { runSimulation, isRunning, progress, results } = useSimulation();

async function handleRunClick() {
  try {
    const results = await runSimulation({
      portfolio,
      phases,
      inflationRate: 0.03,
      iterations: 10000,
      historicalReturns
    });

    console.log('Success rate:', results.successRate);
  } catch (error) {
    console.error('Simulation failed:', error);
  }
}
```

---

#### `cancelSimulation()` Function

Abort a running simulation.

**Algorithm:**
```
1. Check if worker exists
   if (workerRef.current)

2. Terminate worker
   worker.terminate()

3. Clear worker reference
   workerRef.current = null

4. Reset state
   isRunning = false
   progress = 0
```

**Example Usage:**
```javascript
const { cancelSimulation, isRunning } = useSimulation();

function handleCancelClick() {
  cancelSimulation();
  console.log('Simulation cancelled');
}

// In UI
{isRunning && (
  <button onClick={handleCancelClick}>Cancel</button>
)}
```

---

## Threading Model

### Main Thread Responsibilities
- UI rendering (React components)
- User input handling
- Data loading (CSV files)
- Results visualization (charts)
- Worker lifecycle management

### Worker Thread Responsibilities
- Correlation matrix calculation
- Cholesky decomposition
- Monte Carlo iteration loop
- Statistics calculation
- Progress reporting

### Communication

**Main → Worker:**
- One-time parameter passing
- Send entire payload at start
- No mid-simulation communication

**Worker → Main:**
- ~100 progress updates during run
- Single results message at end
- Error messages if failure

**Thread Safety:**
- Data is **cloned** during postMessage (not shared)
- No race conditions possible
- Worker terminates after completion (clean slate each run)

---

## Performance Characteristics

### Overhead

| Operation | Time |
|-----------|------|
| Create worker | ~5ms |
| Terminate worker | ~2ms |
| postMessage (large payload) | ~3ms |
| Message latency (worker → main) | <1ms |
| **Total overhead** | **~10ms** |

For a 3-second simulation, overhead is **<0.5%** - negligible.

### Progress Update Frequency

For 10,000 iterations:
- Update every 100 iterations
- Total updates: 100
- Time per update: ~30ms
- Total overhead: ~3ms (negligible)

### Memory Usage

| Component | Memory |
|-----------|--------|
| Worker thread overhead | ~2 MB |
| Simulation results (10k iterations × 55 years) | ~10 MB |
| Historical returns (3 tickers × 199 points) | ~5 KB |
| Correlation matrices | ~1 KB |
| **Total peak memory** | **~12 MB** |

Memory is freed when worker terminates.

---

## Error Handling

### Worker-Side Errors

**Caught by try-catch:**
```javascript
try {
  // Simulation steps
} catch (error) {
  self.postMessage({
    type: 'ERROR',
    payload: { error: error.message }
  });
}
```

**Uncaught errors:**
```javascript
worker.onerror = (e) => {
  reject(new Error(`Worker error: ${e.message}`));
};
```

### Main-Side Errors

**Hook handles all errors:**
```javascript
try {
  const results = await runSimulation({...});
} catch (err) {
  setError(err.message);
  setIsRunning(false);

  // Clean up worker
  if (workerRef.current) {
    workerRef.current.terminate();
    workerRef.current = null;
  }

  throw err;  // Propagate to caller
}
```

**UI displays error:**
```javascript
{error && (
  <div className="error">
    Simulation Error: {error}
  </div>
)}
```

---

## Browser Compatibility

### Web Worker Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 4+ | ✅ Full |
| Firefox | 3.5+ | ✅ Full |
| Safari | 4+ | ✅ Full |
| Edge | 12+ | ✅ Full |
| IE | 10+ | ✅ Full (legacy) |

**Coverage:** 98%+ of users

### Module Workers

**new Worker(url, {type: 'module'})**

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 80+ | ✅ |
| Firefox | 114+ | ✅ |
| Safari | 15+ | ✅ |
| Edge | 80+ | ✅ |

**Current usage:** Type module for cleaner imports (future-proof)

**Fallback:** Could use classic worker with inline code if needed

---

## Testing

### Manual Testing

**Test 1: Background execution**
```
1. Open browser DevTools (Performance tab)
2. Start recording
3. Click "Run Simulation"
4. Observe:
   ✓ UI remains responsive (60 FPS)
   ✓ Progress bar updates smoothly
   ✓ Can interact with page during simulation
5. Stop recording
   ✓ Main thread shows low CPU usage
   ✓ Worker thread shows high CPU usage
```

**Test 2: Progress updates**
```
1. Run simulation with 10k iterations
2. Observe progress bar:
   ✓ Starts at 0%
   ✓ Updates frequently (smooth animation)
   ✓ Ends at 100%
   ✓ No jumps or freezes
```

**Test 3: Error handling**
```
1. Modify historicalReturns to have mismatched lengths
2. Click "Run Simulation"
3. Observe:
   ✓ Error message displays: "Arrays must have same non-zero length"
   ✓ isRunning returns to false
   ✓ UI remains functional
```

**Test 4: Cancellation**
```
1. Click "Run Simulation"
2. Click "Cancel" after 1 second
3. Observe:
   ✓ Simulation stops
   ✓ Progress resets to 0
   ✓ isRunning = false
   ✓ Can start new simulation
```

### Integration Test

**Location:** Would be in `src/workers/simulation-worker.test.js`

```javascript
test('Worker completes 1000 iteration simulation', (done) => {
  const worker = new Worker('simulation-worker.js');

  worker.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'PROGRESS') {
      expect(payload.percent).toBeGreaterThanOrEqual(0);
      expect(payload.percent).toBeLessThanOrEqual(100);
    } else if (type === 'COMPLETE') {
      expect(payload.results.totalRuns).toBe(1000);
      expect(payload.results.successRate).toBeGreaterThan(0);
      expect(payload.results.percentilesByYear).toHaveLength(56); // 55 years + year 0
      worker.terminate();
      done();
    } else if (type === 'ERROR') {
      fail(payload.error);
    }
  };

  worker.postMessage({
    type: 'RUN_SIMULATION',
    payload: {
      portfolio: [...],
      phases: [...],
      inflationRate: 0.03,
      iterations: 1000,
      historicalReturns: {...}
    }
  });
});
```

---

## Design Decisions

### 1. Inline Simulation Engine (Not Imported)

**Decision:** Copy simulation engine code into worker file

**Rationale:**
- ✅ Simpler deployment (no bundler config)
- ✅ Works with classic and module workers
- ✅ No import path issues

**Trade-off:**
- ❌ Code duplication (~300 lines)
- ❌ Must update both files when logic changes

**Future:** Use bundler (Vite) to import properly

---

### 2. Progress Every 1% (Not Every Iteration)

**Decision:** Send 100 progress updates per simulation

**Rationale:**
- ✅ Smooth progress bar animation
- ✅ Minimal overhead (~3ms total)
- ✅ Good UX (feels responsive)

**Alternative considered:**
- Every iteration: Too many messages (10k/sec → main thread overload)
- Every 10%: Too choppy (only 10 updates)

---

### 3. Terminate After Completion (Not Reuse)

**Decision:** Create new worker for each simulation

**Rationale:**
- ✅ Clean slate (no state leakage)
- ✅ Frees memory immediately
- ✅ Simpler lifecycle management

**Trade-off:**
- ❌ 5ms overhead per simulation
- ✅ Negligible for 3-second runs

**Alternative considered:**
- Keep worker alive: Saves 5ms but adds complexity

---

### 4. Promise-Based API (Not Callbacks)

**Decision:** useSimulation returns Promise from runSimulation

**Rationale:**
- ✅ Modern JavaScript pattern
- ✅ Async/await support
- ✅ Easy error handling

**Example:**
```javascript
// With Promise (chosen)
try {
  const results = await runSimulation({...});
  console.log(results);
} catch (error) {
  console.error(error);
}

// With callbacks (rejected)
runSimulation({...}, {
  onProgress: (p) => {...},
  onComplete: (r) => {...},
  onError: (e) => {...}
});  // Harder to compose
```

---

### 5. Clone Data (Not SharedArrayBuffer)

**Decision:** Use postMessage (clones data)

**Rationale:**
- ✅ Simpler (no synchronization)
- ✅ Thread-safe by default
- ✅ Works in all browsers

**Trade-off:**
- ❌ 3ms clone overhead
- ✅ Negligible for our data size

**Alternative considered:**
- SharedArrayBuffer: Faster but requires COOP/COEP headers

---

## Future Enhancements

### Phase 2
- [ ] **Worker pool:** Reuse workers for multiple simulations
- [ ] **Parallel iterations:** Split work across multiple workers
- [ ] **Streaming results:** Show partial results while running
- [ ] **Cancellation with cleanup:** Return partial statistics on cancel
- [ ] **Worker debugging:** Better error messages with stack traces

### Performance Optimizations
- [ ] Use SharedArrayBuffer for zero-copy data transfer
- [ ] WASM compilation for 2-5× speed improvement
- [ ] GPU acceleration via WebGL for matrix operations
- [ ] Lazy percentile calculation (on-demand, not all years)

---

## References

**Files:**
- `src/workers/simulation-worker.js` - Worker implementation
- `src/hooks/useSimulation.js` - React integration hook
- `src/lib/simulation-engine.js` - Original simulation logic (duplicated in worker)

**Documentation:**
- [`simulation-engine.md`](simulation-engine.md) - Mathematical algorithms
- [`app-orchestration.md`](app-orchestration.md) - How App.jsx uses the hook

**External:**
- MDN Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- Chrome DevTools Threading: https://developer.chrome.com/docs/devtools/performance/

---

**Last Updated:** 2025-04-01
**Version:** 1.0
