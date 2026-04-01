import React, { useState } from 'react';
import PortfolioSetup from './components/PortfolioSetup';
import './App.css';

function App() {
  const [portfolio, setPortfolio] = useState([]);
  const [phases, setPhases] = useState([{ amount: 50000, years: 30 }]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>FIRE Calculator</h1>
        <p>Retirement Monte Carlo Simulator</p>
      </header>

      <main className="app-main">
        <PortfolioSetup
          portfolio={portfolio}
          setPortfolio={setPortfolio}
        />
      </main>
    </div>
  );
}

export default App;
