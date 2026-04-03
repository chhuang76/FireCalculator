import React, { useState, useEffect } from 'react';
import PortfolioSetup from './components/PortfolioSetup';
import SpendingPhasesBuilder from './components/SpendingPhasesBuilder';
import SimulationControls from './components/SimulationControls';
import ResultsDisplay from './components/ResultsDisplay';
import { useSimulation } from './hooks/useSimulation';
import { alignHistoricalReturns } from './lib/align-data';
import './App.css';

function App() {
  // State
  const [portfolio, setPortfolio] = useState([]);
  const [phases, setPhases] = useState([]);
  const [inflationRate, setInflationRate] = useState(0.03); // 3%
  const [iterations, setIterations] = useState(10000);
  const [tickerStats, setTickerStats] = useState({}); // Shared ticker data
  const [alignmentError, setAlignmentError] = useState(null); // Errors before simulation
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(''); // For percentage mode

  // Simulation hook
  const { isRunning, progress, results, error, runSimulation } = useSimulation();

  // Validation
  const validateInputs = () => {
    const errors = [];

    // Detect if using percentage mode (any asset has percentage field)
    const isPercentageMode = portfolio.some(a => a.percentage !== undefined && a.percentage !== '');

    if (isPercentageMode) {
      // Validate percentage mode
      if (portfolio.length === 0 || !portfolio.some(a => a.ticker && parseFloat(a.percentage) > 0)) {
        errors.push('Add at least one asset to your portfolio');
      }

      // Check for incomplete portfolio entries
      const hasIncompleteTickers = portfolio.some(a => a.ticker && !a.percentage);
      if (hasIncompleteTickers) {
        errors.push('Enter a percentage for all selected tickers');
      }

      const hasIncompletePercentages = portfolio.some(a => a.percentage && !a.ticker);
      if (hasIncompletePercentages) {
        errors.push('Select a ticker for all entered percentages');
      }

      // Validate percentages sum to 100%
      const totalPercentage = portfolio.reduce((sum, asset) => sum + (parseFloat(asset.percentage) || 0), 0);
      if (Math.abs(totalPercentage - 100) >= 0.1) {
        errors.push(`Portfolio allocation must equal 100% (currently ${totalPercentage.toFixed(1)}%)`);
      }
    } else {
      // Validate dollar mode
      if (portfolio.length === 0 || !portfolio.some(a => a.ticker && a.value > 0)) {
        errors.push('Add at least one asset to your portfolio');
      }

      // Check for incomplete portfolio entries
      const hasIncompleteTickers = portfolio.some(a => a.ticker && !a.value);
      if (hasIncompleteTickers) {
        errors.push('Enter a value for all selected tickers');
      }

      const hasIncompleteValues = portfolio.some(a => a.value && !a.ticker);
      if (hasIncompleteValues) {
        errors.push('Select a ticker for all entered values');
      }
    }

    // Validate phases
    if (phases.length === 0 || !phases.some(p => p.amount > 0 && p.years > 0)) {
      errors.push('Add at least one spending phase');
    }

    // Check for incomplete phases
    const hasIncompletePhases = phases.some(p => !p.amount || !p.years);
    if (hasIncompletePhases) {
      errors.push('Enter both amount and duration for all spending phases');
    }

    // Check if we have statistics for all tickers
    const tickersNeedingStats = portfolio
      .filter(a => {
        if (isPercentageMode) {
          return a.ticker && parseFloat(a.percentage) > 0;
        } else {
          return a.ticker && a.value > 0;
        }
      })
      .map(a => a.ticker)
      .filter((ticker, index, self) => self.indexOf(ticker) === index); // Unique tickers

    const missingStats = tickersNeedingStats.filter(ticker => !tickerStats[ticker]);
    if (missingStats.length > 0) {
      errors.push(`Still loading data for: ${missingStats.join(', ')}`);
    }

    return errors;
  };

  const validationErrors = validateInputs();
  const canRun = validationErrors.length === 0 && !isRunning;

  // Save configuration to JSON file
  const saveConfig = (configName) => {
    const config = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      name: configName || 'Untitled Portfolio',
      portfolio: {
        mode: portfolio.some(a => a.percentage !== undefined && a.percentage !== '') ? 'percentage' : 'dollar',
        totalValue: totalPortfolioValue,
        assets: portfolio.map(asset => ({
          id: asset.id,
          ticker: asset.ticker,
          value: asset.value || '',
          percentage: asset.percentage || ''
        }))
      },
      phases: phases.map(phase => ({
        id: phase.id,
        amount: phase.amount,
        years: phase.years,
        strategy: phase.strategy || 'fixed'
      })),
      settings: {
        inflationRate,
        iterations
      }
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Format filename
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const safeName = (configName || 'portfolio').toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `fire-config-${safeName}-${date}.json`;

    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load configuration from JSON file
  const loadConfig = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);

        // Validate version
        if (!config.version || config.version !== '1.0') {
          throw new Error('Unsupported config version. Please use a valid config file.');
        }

        // Validate structure
        if (!config.portfolio || !config.phases || !config.settings) {
          throw new Error('Invalid config file structure. Missing required fields.');
        }

        // Validate tickers
        const validTickers = ['', 'VT', 'QQQ', 'VGT', 'AVUV', 'AVDV', 'BND', 'VBIL', 'SHV', 'VNQ', 'GLD', 'BTC/USD'];
        const invalidTickers = config.portfolio.assets
          .filter(asset => asset.ticker && !validTickers.includes(asset.ticker))
          .map(asset => asset.ticker);

        if (invalidTickers.length > 0) {
          throw new Error(`Unknown tickers in config: ${invalidTickers.join(', ')}. Please add these tickers first.`);
        }

        // Apply configuration
        setPortfolio(config.portfolio.assets);
        setTotalPortfolioValue(config.portfolio.totalValue || '');
        setPhases(config.phases);
        setInflationRate(config.settings.inflationRate);
        setIterations(config.settings.iterations);

        // Clear any previous errors
        setAlignmentError(null);

        alert(`Successfully loaded: ${config.name || 'Portfolio'}\nSaved: ${new Date(config.savedAt).toLocaleDateString()}`);

      } catch (error) {
        console.error('Failed to load config:', error);
        alert(`Failed to load configuration:\n\n${error.message}`);
      }
    };

    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };

    reader.readAsText(file);
  };

  // Run simulation
  const handleRunSimulation = async () => {
    if (!canRun) {
      console.log('Cannot run: validation failed');
      return;
    }

    // Clear previous errors
    setAlignmentError(null);

    try {
      console.log('Starting simulation...');

      // Detect if using percentage mode
      const isPercentageMode = portfolio.some(a => a.percentage !== undefined && a.percentage !== '');

      // Build simulation portfolio with statistics
      const simulationPortfolio = portfolio
        .filter(a => {
          if (isPercentageMode) {
            return a.ticker && parseFloat(a.percentage) > 0;
          } else {
            return a.ticker && a.value > 0;
          }
        })
        .map(a => {
          // Calculate dollar value based on mode
          let dollarValue;
          if (isPercentageMode) {
            const total = parseFloat(totalPortfolioValue) || 0;
            dollarValue = (parseFloat(a.percentage) / 100) * total;
          } else {
            dollarValue = parseFloat(a.value);
          }

          return {
            ticker: a.ticker,
            value: dollarValue,
            mu: tickerStats[a.ticker].mu,
            sigma: tickerStats[a.ticker].sigma
          };
        });

      console.log('Simulation portfolio:', simulationPortfolio);

      // Align historical returns to common dates
      const uniqueTickers = [...new Set(simulationPortfolio.map(a => a.ticker))];
      console.log('Aligning data for tickers:', uniqueTickers);

      const { historicalReturns } = alignHistoricalReturns(tickerStats, uniqueTickers);
      console.log('Data aligned successfully');

      // Run simulation
      console.log('Running Monte Carlo simulation...');
      await runSimulation({
        portfolio: simulationPortfolio,
        phases: phases.filter(p => p.amount > 0 && p.years > 0),
        inflationRate,
        iterations,
        historicalReturns
      });

      // Scroll to results
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      console.error('Simulation error:', err);
      setAlignmentError(err.message || 'Failed to run simulation');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>FIRE Calculator</h1>
        <p>Retirement Monte Carlo Simulator</p>
      </header>

      <main className="app-main">
        {/* Portfolio Setup */}
        <PortfolioSetup
          portfolio={portfolio}
          setPortfolio={setPortfolio}
          tickerStats={tickerStats}
          setTickerStats={setTickerStats}
          totalPortfolioValue={totalPortfolioValue}
          setTotalPortfolioValue={setTotalPortfolioValue}
          onSaveConfig={saveConfig}
          onLoadConfig={loadConfig}
        />

        {/* Spending Phases */}
        <SpendingPhasesBuilder
          phases={phases}
          setPhases={setPhases}
          inflationRate={inflationRate}
        />

        {/* Simulation Controls */}
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

        {/* Error Display */}
        {(error || alignmentError) && (
          <div className="error-banner">
            <h3>Simulation Error</h3>
            <p>{alignmentError || error}</p>
          </div>
        )}

        {/* Results Display */}
        <div id="results">
          <ResultsDisplay results={results} />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          <strong>Important:</strong> This Monte Carlo simulator uses <strong>total return</strong> data (price appreciation + dividends/interest reinvested) from historical market data.
          Results are based on statistical modeling. Past performance does not guarantee future results.
          Consult a financial advisor for personalized advice.
        </p>
      </footer>
    </div>
  );
}

export default App;
