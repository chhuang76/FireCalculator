# FIRE Calculator

A stateless, client-side Monte Carlo retirement simulator built with React and Vite.

## Features

- ✅ Monte Carlo simulation with 10,000 iterations
- ✅ Multi-asset portfolio support with correlation modeling
- ✅ Duplicate ticker support (multiple accounts)
- ✅ Multi-phase spending plans
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
│   │   └── PortfolioSetup.jsx
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

### 📋 Step 3: Results Display (Next)
- Success rate visualization
- Percentile band charts
- Balance snapshots
- Run simulation integration

### 📋 Step 4: Multi-Phase Spending Builder
- Dynamic spending phases
- Inflation-adjusted preview
- Visual timeline

## Usage Example

### 1. Set Up Portfolio

1. Open the app
2. Click "+ Add Asset"
3. Select ticker (e.g., "VT - Vanguard Total World Stock")
4. Enter value (e.g., $600,000)
5. Statistics (return μ, volatility σ) load automatically
6. Add more assets as needed

### 2. Run Simulation (Coming in Step 3)

1. Configure spending phases
2. Set inflation rate
3. Click "Run Simulation"
4. View success rate and percentile charts

## Technology Stack

- **Frontend:** React 18
- **Build Tool:** Vite 5
- **Simulation Engine:** Pure JavaScript (no external libraries)
- **Charts:** Recharts (coming in Step 3)
- **Data Format:** CSV (monthly historical prices)

## Mathematical Approach

- **Returns:** Log returns ln(P_t / P_{t-1})
- **Correlation:** Historical correlation matrix from aligned data
- **Random Generation:** Box-Muller transform for normal distribution
- **Correlated Returns:** Cholesky decomposition (Σ = L × L^T)
- **Statistics:** Annualized μ = mean × 12, σ = std × √12

## Data Sources

Historical price data can be fetched from:
- Twelve Data API (primary)
- Alpha Vantage API (fallback)

Alternatively, use synthetic data generator for testing.

## Documentation

- `TDD.txt` - Technical Design Document with all decisions
- `STEP0_COMPLETE.md` - Data preparation documentation
- `STEP1_COMPLETE.md` - Simulation engine documentation
- `STEP2_COMPLETE.md` - Portfolio UI documentation

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

This is a personal project following a Test-Driven Development approach. See TDD.txt for design decisions and implementation plan.
