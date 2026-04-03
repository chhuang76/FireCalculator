# FIRE Calculator

A stateless, client-side Monte Carlo retirement simulator built with React and Vite.

## Features

- ✅ Monte Carlo simulation with 10,000 iterations
- ✅ Multi-asset portfolio support with correlation modeling
- ✅ Duplicate ticker support (multiple accounts)
- ✅ Multi-phase spending plans
- ✅ **Two withdrawal strategies:** Fixed Dollar (inflation-adjusted) and Percentage of Portfolio
- ✅ Historical data-based statistics
- ✅ Real-time weight calculations
- ✅ Responsive design

## Quick Start

### Prerequisites

- Node.js 16+ installed

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Available Scripts

### Development
- `npm run dev` - Start Vite dev server on port 3000

### Testing
- `npm run test:engine` - Run simulation engine unit tests (16 tests)
- `npm run test:simulation` - Run full integration test with 10k iterations

### Data Management
- `npm run update-data` - Fetch latest CSV data from APIs (requires API key in .env)
- `npm run generate-sample-data` - Generate synthetic CSV data offline

### Production
- `npm run build` - Build optimized production bundle
- `npm run preview` - Preview production build locally

## Project Structure

```
fire-calculator/
├── public/data/          # CSV files with historical prices
│   ├── VT.csv
│   ├── QQQ.csv
│   ├── AVUV.csv
│   ├── BND.csv
│   ├── GLD.csv
│   └── BTC-USD.csv
│
├── src/
│   ├── components/       # React components
│   │   ├── PortfolioSetup.jsx
│   │   ├── SpendingPhasesBuilder.jsx
│   │   ├── SimulationControls.jsx
│   │   ├── PercentileChart.jsx
│   │   └── ResultsDisplay.jsx
│   │
│   ├── hooks/           # Custom React hooks
│   │   └── useSimulation.js
│   │
│   ├── lib/             # Core simulation engine
│   │   ├── simulation-engine.js
│   │   ├── simulation-engine.test.js
│   │   ├── data-loader.js
│   │   └── test-simulation.js
│   │
│   ├── workers/         # Web Workers
│   │   └── simulation-worker.js
│   │
│   ├── main.jsx         # React entry point
│   └── App.jsx          # Main app component
│
├── scripts/             # Utility scripts
│   ├── update-data.js
│   └── generate-sample-data.js
│
└── index.html          # HTML entry point
```

## Implementation Status

### ✅ Step 0: Data Preparation - COMPLETE
- 6 CSV files with monthly historical data
- Data fetching scripts (Twelve Data + Alpha Vantage)
- Offline sample data generator

### ✅ Step 1: Simulation Engine - COMPLETE
- Monte Carlo simulation with correlated returns
- Cholesky decomposition for correlation
- Multi-phase spending support
- Comprehensive test suite (16/16 passing)
- Web Worker for background execution

### ✅ Step 2: Portfolio Setup UI - COMPLETE
- Dynamic asset table
- Ticker selection with 6 tickers
- Auto-calculated weights
- Real-time statistics (μ, σ)
- Duplicate ticker support
- Modern responsive design

### ✅ Step 3: Results Display & Visualization - COMPLETE
- Multi-phase spending builder with visual timeline
- Simulation controls (inflation, iterations)
- Success rate dashboard with color coding
- Interactive percentile charts (Recharts)
- Balance snapshots table
- Web Worker integration for background processing
- Complete validation and error handling

### 🎉 Application Fully Functional!
All core features implemented. Ready for use or Phase 2 enhancements.

## Usage Example

### 1. Set Up Portfolio

1. Open the app at http://localhost:3000
2. Click "+ Add Asset"
3. Select ticker (e.g., "VT - Vanguard Total World Stock")
4. Enter value (e.g., $600,000)
5. Statistics (return μ, volatility σ) load automatically
6. Add more assets as needed (supports duplicate tickers)

### 2. Define Spending Plan

1. See default phase ($50k/year for 30 years)
2. Adjust amounts and duration
3. Click "+ Add Phase" for multi-phase retirement
4. Example: $50k/year for 15 years, then $30k/year for 40 years
5. View timeline visualization

### 3. Configure Simulation

1. Set inflation rate (default: 3%)
2. Choose iterations (1k, 5k, 10k, or 50k)
3. Review validation (must be all green)

### 4. Run Simulation

1. Click "Run Simulation"
2. Watch progress (0-100%)
3. Results appear automatically (~3 seconds for 10k iterations)
4. Page auto-scrolls to results

### 5. Analyze Results

1. View success rate with color-coded interpretation
2. Explore interactive percentile chart
3. Check balance snapshots at key years
4. Review median/worst-case ending balances
5. Adjust portfolio and re-run as needed

## Technology Stack

- **Frontend:** React 18
- **Build Tool:** Vite 5
- **Visualization:** Recharts 3.8
- **Simulation Engine:** Pure JavaScript with Web Workers
- **Data Format:** CSV (monthly historical prices)
- **State Management:** React Hooks (useState, useEffect, custom hooks)

## Mathematical Approach

- **Returns:** Log returns ln(P_t / P_{t-1})
- **Correlation:** Historical correlation matrix from aligned data
- **Random Generation:** Box-Muller transform for normal distribution
- **Correlated Returns:** Cholesky decomposition (Σ = L × L^T)
- **Statistics:** Annualized μ = mean × 12, σ = std × √12

## Data Sources

Historical price data can be fetched from:
- **Twelve Data API** (primary) - Uses adjusted prices (includes dividends)
- **Alpha Vantage API** (fallback) - Uses adjusted close (includes dividends)

**Important:** The simulation uses **total return** data, which includes:
- Price appreciation
- Dividends reinvested (for stocks/ETFs)
- Interest payments (for bonds)

This provides more accurate retirement projections compared to price-only returns.

For offline testing, use the synthetic data generator.

## Documentation

Full documentation is in the [`docs/`](docs/) folder:

**System Documentation:**
- [`docs/TDD.md`](docs/TDD.md) - Main Technical Design Document (system overview)
- [`docs/tdd/`](docs/tdd/) - Component-specific TDDs (simulation engine, data management, UI, etc.)

**How-To Guides:**
- [`docs/WITHDRAWAL_STRATEGIES.md`](docs/WITHDRAWAL_STRATEGIES.md) - Fixed Dollar vs. Percentage Withdrawal strategies
- [`docs/ADDING_TICKERS.md`](docs/ADDING_TICKERS.md) - How to add new asset tickers to the system
- [`docs/DIVIDENDS.md`](docs/DIVIDENDS.md) - How dividends are included in data
- [`docs/TESTING_REAL_DATA.md`](docs/TESTING_REAL_DATA.md) - Testing with real API data

**Additional Guides:**
- [`docs/API_RESEARCH.md`](docs/API_RESEARCH.md) - API research and options
- [`docs/DATA_PREPARATION_GUIDE.md`](docs/DATA_PREPARATION_GUIDE.md) - Data preparation guide
- [`docs/SERVERLESS_PROXY_GUIDE.md`](docs/SERVERLESS_PROXY_GUIDE.md) - Serverless proxy setup
- [`docs/SYNTHETIC_DATA_NOTES.md`](docs/SYNTHETIC_DATA_NOTES.md) - Synthetic vs real data

**Historical:**
- [`docs/archive/`](docs/archive/) - Step-by-step implementation logs (STEP0-3)

## Testing

### Unit Tests
```bash
npm run test:engine
# Expected: ✅ 16/16 tests passing
```

### Integration Test
```bash
npm run test:simulation
# Runs 10,000 Monte Carlo iterations
# Expected: Success rate, percentiles, execution time
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Contributing

This is a personal project following a Test-Driven Development approach. See [`docs/TDD.md`](docs/TDD.md) for design decisions and system architecture.
