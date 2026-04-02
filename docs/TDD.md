# FIRE Calculator - Technical Design Document

**Version:** 2.0
**Last Updated:** 2025-04-01
**Status:** Implementation Complete (Steps 0-3)

---

## Document Structure

This is the **main Technical Design Document** providing a system-level overview. For detailed component documentation, see:

- **[Simulation Engine](tdd/simulation-engine.md)** - Monte Carlo algorithms, mathematical foundations
- **[Data Management](tdd/data-management.md)** - CSV loading, alignment, API fetching
- **[Web Worker](tdd/web-worker.md)** - Background processing, message protocol
- **[UI Components](tdd/ui-components.md)** - React components, user experience
- **[App Orchestration](tdd/app-orchestration.md)** - State management, validation, workflow

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

Each major component has a detailed TDD. See the individual documents for comprehensive documentation including algorithms, error handling, performance characteristics, and testing strategies.

### 1. [Simulation Engine](tdd/simulation-engine.md)
Core Monte Carlo simulation logic with correlation modeling, Cholesky decomposition, and percentile calculations. Includes 15+ functions with detailed algorithm documentation and mathematical foundations.

### 2. [Data Management](tdd/data-management.md)
CSV data loading, statistical calculations, and date alignment for correlation analysis. Covers data fetching scripts and synthetic data generation.

### 3. [Web Worker](tdd/web-worker.md)
Background simulation processing to prevent UI freezing. Documents the message protocol, threading model, and integration with React via custom hooks.

### 4. [UI Components](tdd/ui-components.md)
All React components including PortfolioSetup, SpendingPhasesBuilder, SimulationControls, ResultsDisplay, and PercentileChart. Covers user experience patterns and responsive design.

### 5. [App Orchestration](tdd/app-orchestration.md)
Central state management, input validation, and workflow coordination. Documents the complete simulation execution pipeline from user input to results display.

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

**Note:** Data alignment is critical because different tickers have different historical date ranges. The system finds overlapping dates and recalculates returns to ensure equal-length arrays for correlation analysis. See [Data Management TDD](tdd/data-management.md#component-2-data-alignment-align-datajs) for detailed algorithm and examples.

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

This section covers high-level system architecture decisions. Component-specific design decisions are documented in their respective TDDs.

### System Architecture

**1. Client-Side Only (No Backend)**

Fully client-side application for privacy, simplicity, and zero infrastructure cost. All calculations run in the browser. Pre-fetched CSV data avoids CORS issues with live API calls.

**2. Fixed Inflation (Not Stochastic)**

User-configurable fixed inflation rate (default 3%) for simplicity and ease of understanding. Stochastic inflation planned for Phase 2.

### Component-Specific Decisions

Detailed design rationale is documented in component-specific TDDs:

- **Simulation Math:** Log returns, correlation matrices, Cholesky decomposition, annual rebalancing → [Simulation Engine TDD](tdd/simulation-engine.md#design-decisions)
- **Data Handling:** Adjusted prices (total return), monthly granularity, CSV format, data alignment → [Data Management TDD](tdd/data-management.md#design-decisions)
- **Background Processing:** Web Workers, message protocol, promise-based API → [Web Worker TDD](tdd/web-worker.md#design-decisions)
- **State Management:** React hooks (not Redux), props drilling, computed values → [App Orchestration TDD](tdd/app-orchestration.md#design-decisions)
- **User Interface:** Progressive disclosure, real-time validation, responsive design → [UI Components TDD](tdd/ui-components.md#design-decisions)

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
