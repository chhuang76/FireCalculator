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

  // Simulation hook
  const { isRunning, progress, results, error, runSimulation } = useSimulation();

  // Validation
  const validateInputs = () => {
    const errors = [];

    // Validate portfolio
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
      .filter(a => a.ticker && a.value > 0)
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

  // Run simulation
  const handleRunSimulation = async () => {
    if (!canRun) return;

    try {
      // Build simulation portfolio with statistics
      const simulationPortfolio = portfolio
        .filter(a => a.ticker && a.value > 0)
        .map(a => ({
          ticker: a.ticker,
          value: parseFloat(a.value),
          mu: tickerStats[a.ticker].mu,
          sigma: tickerStats[a.ticker].sigma
        }));

      // Align historical returns to common dates
      const uniqueTickers = [...new Set(simulationPortfolio.map(a => a.ticker))];
      const { historicalReturns } = alignHistoricalReturns(tickerStats, uniqueTickers);

      // Run simulation
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
        {error && (
          <div className="error-banner">
            <h3>Simulation Error</h3>
            <p>{error}</p>
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
