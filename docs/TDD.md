# FIRE Calculator - Technical Design Document

**Version:** 2.0
**Last Updated:** 2025-04-01
**Status:** Implementation Complete (Steps 0-3)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Design Documents](#component-design-documents)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Design Decisions](#design-decisions)
7. [Implementation Status](#implementation-status)

---

## Overview

### Purpose

A client-side Monte Carlo retirement simulator that helps users estimate the success probability of their retirement portfolio under various spending scenarios.

### Key Features

- ✅ Multi-asset portfolio support with correlation modeling
- ✅ Monte Carlo simulation (10,000+ iterations)
- ✅ Multi-phase spending plans (e.g., $50k/15y then $30k/40y)
- ✅ Historical data-based returns (includes dividends)
- ✅ Interactive visualization with percentile bands
- ✅ Fully client-side (no backend required)
- ✅ Background processing via Web Workers

### Target Users

- Individuals planning for FIRE (Financial Independence, Retire Early)
- Anyone wanting to stress-test retirement portfolios
- Financial planners demonstrating Monte Carlo concepts

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React UI Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Portfolio   │  │   Spending   │  │  Simulation  │      │
│  │    Setup     │  │    Phases    │  │   Controls   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Results Display + Charts                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Logic                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Data Loader  │  │ Data Aligner │  │ useSimulation│      │
│  │   (CSV)      │  │ (Overlapping)│  │    Hook      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Web Worker                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Monte Carlo Simulation Engine               │     │
│  │  • Correlation Matrix Calculation                   │     │
│  │  • Cholesky Decomposition                          │     │
│  │  • Correlated Random Returns Generation           │     │
│  │  • Portfolio Simulation (10k iterations)          │     │
│  │  • Statistics Calculation (percentiles)           │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Historical Price Data (CSV Files)                   │   │
│  │  • VT.csv, QQQ.csv, BND.csv, etc.                   │   │
│  │  • Monthly adjusted prices (includes dividends)     │   │
│  │  • Fetched via API or generated synthetically       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Location | Purpose | TDD |
|-----------|----------|---------|-----|
| **Simulation Engine** | `src/lib/simulation-engine.js` | Core Monte Carlo math | [📄 TDD](tdd/simulation-engine.md) |
| **Data Management** | `src/lib/data-loader.js`<br>`src/lib/align-data.js`<br>`scripts/update-data.js` | Load, process, align data | [📄 TDD](tdd/data-management.md) |
| **Web Worker** | `src/workers/simulation-worker.js` | Background processing | [📄 TDD](tdd/web-worker.md) |
| **UI Components** | `src/components/*.jsx` | React user interface | [📄 TDD](tdd/ui-components.md) |
| **App Orchestration** | `src/App.jsx`<br>`src/hooks/useSimulation.js` | State management, workflow | [📄 TDD](tdd/app-orchestration.md) |

---

## Component Design Documents

Each major component has a detailed TDD:

### 1. [Simulation Engine](tdd/simulation-engine.md)
Core Monte Carlo simulation logic, correlation modeling, Cholesky decomposition.

**Key Functions:**
- `runMonteCarloSimulation()` - Main simulation orchestrator
- `choleskyDecomposition()` - Correlation matrix decomposition
- `generateCorrelatedReturns()` - Correlated random returns
- `calculateStatistics()` - Percentile calculations

### 2. [Data Management](tdd/data-management.md)
Loading historical data, calculating statistics, aligning date ranges.

**Key Functions:**
- `loadAndProcessTicker()` - Load CSV and calculate μ, σ
- `alignHistoricalReturns()` - Align overlapping dates
- `update-data.js` - Fetch from APIs with dividend adjustment

### 3. [Web Worker](tdd/web-worker.md)
Background execution to prevent UI freezing during simulations.

**Message Protocol:**
- `RUN_SIMULATION` → `PROGRESS` → `COMPLETE`

### 4. [UI Components](tdd/ui-components.md)
React components for portfolio input, spending phases, results display.

**Main Components:**
- `PortfolioSetup` - Dynamic asset table
- `SpendingPhasesBuilder` - Multi-phase spending
- `SimulationControls` - Inflation, iterations
- `ResultsDisplay` - Success rate, charts, snapshots
- `PercentileChart` - Interactive Recharts visualization

### 5. [App Orchestration](tdd/app-orchestration.md)
State management, validation, workflow coordination.

**Key Elements:**
- `App.jsx` - Main state container
- `useSimulation.js` - Web Worker integration hook

---

## Data Flow

### Simulation Execution Flow

```
1. User Input
   ├─ Portfolio: [VT: $600k, QQQ: $300k, BND: $100k]
   ├─ Phases: [$50k/15y, $30k/40y]
   └─ Settings: 3% inflation, 10k iterations

2. Data Loading
   ├─ Load CSV files (VT.csv, QQQ.csv, BND.csv)
   ├─ Calculate statistics (μ, σ) per ticker
   └─ Cache in tickerStats state

3. Data Alignment
   ├─ Find overlapping dates across tickers
   ├─ Filter to common date range
   └─ Recalculate aligned log returns

4. Validation
   ├─ Check portfolio completeness
   ├─ Check spending phases
   └─ Verify all data loaded

5. Simulation Execution (Web Worker)
   ├─ Calculate correlation matrix
   ├─ Cholesky decomposition
   ├─ Run 10,000 iterations
   │  ├─ Generate correlated returns
   │  ├─ Apply to portfolio
   │  ├─ Subtract spending (inflation-adjusted)
   │  └─ Detect success/failure
   └─ Calculate statistics (percentiles)

6. Results Display
   ├─ Success rate with color coding
   ├─ Percentile chart (10th, 25th, 50th, 75th, 90th)
   ├─ Balance snapshots table
   └─ Median/worst-case ending balances
```

### Data Alignment Example

```
Input CSVs:
  VT.csv:  2008-06 to 2024-12 (200 months)
  QQQ.csv: 1999-03 to 2024-12 (310 months)
  BND.csv: 2007-04 to 2024-12 (220 months)

Alignment Process:
  1. Find common dates: 2008-06 to 2024-12 (200 months)
  2. Extract prices for overlapping period only
  3. Recalculate log returns on aligned prices
  4. Result: All arrays now same length (199 returns)

Why Necessary:
  - Correlation requires equal-length arrays
  - Ensures historical relationship accuracy
```

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite 5** - Build tool and dev server
- **Recharts 3.8** - Chart visualization

### Simulation
- **Pure JavaScript** - No external math libraries
- **Web Workers** - Background processing
- **ES6 Modules** - Import/export syntax

### Data
- **CSV Format** - Simple, portable
- **APIs:** Twelve Data (primary), Alpha Vantage (fallback)
- **Adjusted Prices** - Includes dividends and splits

### Development
- **Node.js** - Scripts for data fetching
- **Git** - Version control
- **Manual Testing** - Integration tests via scripts

---

## Design Decisions

### 1. Client-Side Only (No Backend)

**Decision:** Fully client-side application

**Rationale:**
- ✅ Privacy - No user data sent to servers
- ✅ Simplicity - Deploy as static site
- ✅ Cost - No backend infrastructure
- ✅ Speed - Everything runs locally

**Trade-offs:**
- ❌ Cannot fetch live API data from browser (CORS)
- ✅ Solution: Pre-fetch CSV files via Node.js script

### 2. Web Worker for Simulation

**Decision:** Run simulations in Web Worker

**Rationale:**
- ✅ Prevents UI freezing during 10k iterations
- ✅ Better user experience (progress updates)
- ✅ Native browser feature (no dependencies)

**Implementation:**
- Worker runs in separate thread
- Main thread sends parameters, receives progress
- ~3 seconds for 10k iterations, UI stays responsive

### 3. Historical Correlation vs Fixed

**Decision:** Use historical correlation from aligned data

**Rationale:**
- ✅ More accurate than assumed correlations
- ✅ Captures real market relationships
- ✅ Automatically updates with new data

**Complexity:**
- Requires data alignment (different CSV lengths)
- Requires correlation matrix calculation
- Requires Cholesky decomposition

### 4. Log Returns vs Simple Returns

**Decision:** Use log returns for simulation

**Rationale:**
- ✅ Mathematically correct for compounding
- ✅ Normally distributed (important for Monte Carlo)
- ✅ Time-additive: log(P3/P1) = log(P2/P1) + log(P3/P2)

**Formula:**
```
Log Return = ln(Pt / Pt-1)
Geometric Brownian Motion: S(t+1) = S(t) × exp(μ + σ×Z)
```

### 5. Adjusted Prices (Dividends Included)

**Decision:** Use adjusted close prices with dividends

**Rationale:**
- ✅ Total return = price + dividends
- ✅ Critical for bonds (yield is 75% of return)
- ✅ More accurate retirement projections

**Implementation:**
- Twelve Data: `adjust=all` parameter
- Alpha Vantage: `5. adjusted close` field
- Validation: Check returns against expected ranges

### 6. Duplicate Ticker Support

**Decision:** Allow same ticker multiple times, aggregate before simulation

**Rationale:**
- ✅ Users have same ticker in multiple accounts
- ✅ Easier than manual summation
- ✅ Aggregation reduces correlation matrix size

**Example:**
```
Input:  [VT: $400k, QQQ: $300k, VT: $300k]
Aggregated: [VT: $700k, QQQ: $300k]
Correlation matrix: 2×2 (not 3×3)
```

### 7. Fixed Inflation vs Stochastic

**Decision:** Fixed inflation rate (default 3%)

**Rationale:**
- ✅ Simpler to understand
- ✅ Good enough for initial planning
- ✅ User can adjust rate

**Future:** Add stochastic inflation (Phase 2)

### 8. Annual Rebalancing

**Decision:** Rebalance to target weights annually

**Rationale:**
- ✅ Common practice
- ✅ Prevents portfolio drift
- ✅ Simpler than quarterly/monthly

**Implementation:**
- Weights calculated from initial allocation
- Applied to portfolio balance each year

### 9. Monthly Data (Not Daily)

**Decision:** Use monthly price data

**Rationale:**
- ✅ Sufficient granularity for retirement (multi-decade)
- ✅ Smaller data files
- ✅ Less API calls required
- ✅ Reduces noise from daily volatility

**Trade-off:**
- ❌ Cannot model intra-month dynamics
- ✅ Not important for long-term planning

### 10. React Hooks (Not Redux)

**Decision:** Use React hooks for state management

**Rationale:**
- ✅ Simpler for small-medium app
- ✅ No boilerplate
- ✅ Built-in to React

**State Structure:**
```javascript
App.jsx:
- portfolio (array)
- phases (array)
- tickerStats (object, shared cache)
- inflationRate (number)
- iterations (number)

useSimulation hook:
- isRunning, progress, results, error
- runSimulation(), cancelSimulation()
```

---

## Implementation Status

### ✅ Completed (Steps 0-3)

| Step | Component | Status | Files |
|------|-----------|--------|-------|
| **Step 0** | Data Preparation | ✅ Complete | `public/data/*.csv`<br>`scripts/update-data.js` |
| **Step 1** | Simulation Engine | ✅ Complete | `src/lib/simulation-engine.js`<br>`src/lib/simulation-engine.test.js`<br>`src/workers/simulation-worker.js` |
| **Step 2** | Portfolio UI | ✅ Complete | `src/components/PortfolioSetup.jsx`<br>`src/App.jsx` |
| **Step 3** | Results Display | ✅ Complete | `src/components/ResultsDisplay.jsx`<br>`src/components/PercentileChart.jsx`<br>`src/components/SpendingPhasesBuilder.jsx`<br>`src/components/SimulationControls.jsx` |

### 📊 Test Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| Simulation Engine | 16 unit tests | ✅ All passing |
| Integration | Full simulation test | ✅ Passing |
| Data Loader | Integrated in simulation test | ✅ Passing |
| UI Components | Manual testing | ✅ Verified |

### 🚀 Performance

| Metric | Value |
|--------|-------|
| Simulation (10k iterations) | ~3 seconds |
| CSV Load (6 tickers) | ~200ms |
| UI Response Time | Real-time (Web Worker) |
| Bundle Size | ~526 KB (minified) |
| Memory Usage | ~30 MB with results |

---

## Future Enhancements (Phase 2)

### Planned Features

1. **Stochastic Inflation** - Variable inflation rates
2. **Tax Modeling** - Roth/Traditional/Taxable accounts
3. **Social Security** - Income streams
4. **Custom Tickers** - User-provided CSV
5. **Shareable URLs** - Encode portfolio in URL
6. **Multiple Scenarios** - Side-by-side comparison
7. **Portfolio Optimization** - Suggest allocations
8. **Historical Backtesting** - Test against past periods

### Technical Debt

- [ ] Bundle size optimization (code splitting)
- [ ] Offline support (service worker)
- [ ] Automated UI tests
- [ ] Error boundary components
- [ ] Accessibility improvements (ARIA labels)

---

## References

- **Implementation Details:** See component-specific TDDs in [`docs/tdd/`](tdd/)
- **Historical Context:** See original [`TDD.txt`](TDD.txt) (archived)
- **Step Documentation:** [`STEP0_COMPLETE.md`](STEP0_COMPLETE.md), [`STEP1_COMPLETE.md`](STEP1_COMPLETE.md), etc.
- **Data Guide:** [`DIVIDENDS.md`](DIVIDENDS.md), [`TESTING_REAL_DATA.md`](TESTING_REAL_DATA.md)

---

**Last Updated:** 2025-04-01
**Version:** 2.0 (Post-Implementation)
