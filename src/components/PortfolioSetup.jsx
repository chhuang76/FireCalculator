import React, { useState, useEffect } from 'react';
import { loadAndProcessTicker } from '../lib/data-loader';
import './PortfolioSetup.css';

const AVAILABLE_TICKERS = [
  { value: '', label: '-- Select Ticker --' },
  { value: 'VT', label: 'VT - Vanguard Total World Stock' },
  { value: 'QQQ', label: 'QQQ - Invesco QQQ Trust' },
  { value: 'VGT', label: 'VGT - Vanguard Information Technology Index Fund ETF' },
  { value: 'AVUV', label: 'AVUV - Avantis U.S. Small Cap Value' },
  { value: 'BND', label: 'BND - Vanguard Total Bond Market' },
  { value: 'SHV', label: 'SHV - iShares 0-1 Year Treasury Bond ETF' },
  { value: 'VNQ', label: 'VNQ - Vanguard Real Estate Index Fund ETF' },
  { value: 'GLD', label: 'GLD - SPDR Gold Trust' },
  { value: 'BTC/USD', label: 'BTC/USD - Bitcoin' },
];

function PortfolioSetup({ portfolio, setPortfolio, tickerStats, setTickerStats, totalPortfolioValue, setTotalPortfolioValue }) {
  const [loadingTickers, setLoadingTickers] = useState({});
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState('dollar'); // 'dollar' or 'percentage'

  // Calculate total portfolio value and weights
  const totalValue = portfolio.reduce((sum, asset) => sum + (parseFloat(asset.value) || 0), 0);

  // Calculate total percentage
  const totalPercentage = portfolio.reduce((sum, asset) => sum + (parseFloat(asset.percentage) || 0), 0);

  // Load ticker data when a new ticker is added
  const loadTickerData = async (ticker, index) => {
    if (!ticker || tickerStats[ticker]) return;

    setLoadingTickers(prev => ({ ...prev, [ticker]: true }));
    setErrors(prev => ({ ...prev, [ticker]: null }));

    try {
      const data = await loadAndProcessTicker(ticker);
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
  };

  // Switch between dollar and percentage mode
  const switchMode = (newMode) => {
    if (newMode === mode) return;

    if (newMode === 'percentage') {
      // Switching from dollar to percentage mode
      // Set total portfolio value from current total
      setTotalPortfolioValue(totalValue.toString());

      // Calculate percentages from dollar values
      const updatedPortfolio = portfolio.map(asset => {
        const percentage = totalValue > 0
          ? ((parseFloat(asset.value) || 0) / totalValue) * 100
          : 0;
        return { ...asset, percentage: percentage.toFixed(2) };
      });
      setPortfolio(updatedPortfolio);
    } else {
      // Switching from percentage to dollar mode
      // Calculate dollar values from percentages
      const total = parseFloat(totalPortfolioValue) || 0;
      const updatedPortfolio = portfolio.map(asset => {
        const value = ((parseFloat(asset.percentage) || 0) / 100) * total;
        return { ...asset, value: value.toFixed(0) };
      });
      setPortfolio(updatedPortfolio);
    }

    setMode(newMode);
  };

  // Update percentage (percentage mode only)
  const updatePercentage = (id, percentage) => {
    setPortfolio(portfolio.map(asset =>
      asset.id === id ? { ...asset, percentage } : asset
    ));
  };

  // Calculate dollar value from percentage
  const getCalculatedValue = (percentage) => {
    const total = parseFloat(totalPortfolioValue) || 0;
    if (!total || !percentage) return 0;
    return ((parseFloat(percentage) / 100) * total);
  };

  // Add new asset row
  const addAsset = () => {
    setPortfolio([
      ...portfolio,
      { id: Date.now(), ticker: '', value: '', percentage: '' }
    ]);
  };

  // Remove asset row
  const removeAsset = (id) => {
    setPortfolio(portfolio.filter(asset => asset.id !== id));
  };

  // Update ticker selection
  const updateTicker = (id, ticker) => {
    setPortfolio(portfolio.map(asset =>
      asset.id === id ? { ...asset, ticker } : asset
    ));

    if (ticker) {
      const index = portfolio.findIndex(a => a.id === id);
      loadTickerData(ticker, index);
    }
  };

  // Update value
  const updateValue = (id, value) => {
    setPortfolio(portfolio.map(asset =>
      asset.id === id ? { ...asset, value } : asset
    ));
  };

  // Calculate weight for an asset
  const getWeight = (value) => {
    if (!totalValue || !value) return 0;
    return (parseFloat(value) / totalValue) * 100;
  };

  // Get statistics for a ticker
  const getStats = (ticker) => {
    if (!ticker) return null;
    if (loadingTickers[ticker]) return 'loading';
    if (errors[ticker]) return 'error';
    return tickerStats[ticker] || null;
  };

  // Initialize with one empty row
  useEffect(() => {
    if (portfolio.length === 0) {
      addAsset();
    }
  }, []);

  return (
    <div className="portfolio-setup">
      <div className="section-header">
        <h2>Portfolio Setup</h2>
        <p>Add your investment assets (you can add the same ticker multiple times for different accounts)</p>
      </div>

      {/* Mode Switcher */}
      <div className="mode-switcher">
        <button
          className={`mode-btn ${mode === 'dollar' ? 'active' : ''}`}
          onClick={() => switchMode('dollar')}
        >
          💵 Dollar Value Mode
        </button>
        <button
          className={`mode-btn ${mode === 'percentage' ? 'active' : ''}`}
          onClick={() => switchMode('percentage')}
        >
          📊 Percentage Mode
        </button>
      </div>

      {/* Total Portfolio Value (Percentage Mode Only) */}
      {mode === 'percentage' && (
        <div className="total-portfolio-input">
          <label htmlFor="total-portfolio-value">Total Portfolio Value:</label>
          <div className="input-with-prefix">
            <span className="prefix">$</span>
            <input
              id="total-portfolio-value"
              type="number"
              value={totalPortfolioValue}
              onChange={(e) => setTotalPortfolioValue(e.target.value)}
              placeholder="1000000"
              min="0"
              step="1000"
              className="total-value-input"
            />
          </div>
        </div>
      )}

      <div className="portfolio-table-container">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Ticker</th>
              {mode === 'dollar' ? (
                <>
                  <th>Value ($)</th>
                  <th>Weight (%)</th>
                </>
              ) : (
                <>
                  <th>Allocation (%)</th>
                  <th>Calculated Value</th>
                </>
              )}
              <th>Return (μ)</th>
              <th>Volatility (σ)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((asset, index) => {
              const stats = getStats(asset.ticker);
              const weight = getWeight(asset.value);
              const calculatedValue = getCalculatedValue(asset.percentage);

              return (
                <tr key={asset.id}>
                  <td>
                    <select
                      value={asset.ticker}
                      onChange={(e) => updateTicker(asset.id, e.target.value)}
                      className="ticker-select"
                    >
                      {AVAILABLE_TICKERS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {mode === 'dollar' ? (
                    <>
                      <td>
                        <input
                          type="number"
                          value={asset.value}
                          onChange={(e) => updateValue(asset.id, e.target.value)}
                          placeholder="0"
                          min="0"
                          step="1000"
                          className="value-input"
                        />
                      </td>

                      <td className="weight-cell">
                        {weight > 0 ? weight.toFixed(1) + '%' : '-'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="input-with-suffix">
                          <input
                            type="number"
                            value={asset.percentage}
                            onChange={(e) => updatePercentage(asset.id, e.target.value)}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.1"
                            className="percentage-input"
                          />
                          <span className="suffix">%</span>
                        </div>
                      </td>

                      <td className="calculated-value-cell">
                        {calculatedValue > 0 ? '$' + calculatedValue.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '-'}
                      </td>
                    </>
                  )}

                  <td className="stats-cell">
                    {stats === 'loading' ? (
                      <span className="loading">Loading...</span>
                    ) : stats === 'error' ? (
                      <span className="error">Error</span>
                    ) : stats ? (
                      (stats.mu * 100).toFixed(2) + '%'
                    ) : (
                      '-'
                    )}
                  </td>

                  <td className="stats-cell">
                    {stats === 'loading' ? (
                      <span className="loading">Loading...</span>
                    ) : stats === 'error' ? (
                      <span className="error">Error</span>
                    ) : stats ? (
                      (stats.sigma * 100).toFixed(2) + '%'
                    ) : (
                      '-'
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() => removeAsset(asset.id)}
                      className="remove-btn"
                      disabled={portfolio.length === 1}
                      title="Remove asset"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td><strong>Total</strong></td>
              {mode === 'dollar' ? (
                <>
                  <td><strong>${totalValue.toLocaleString()}</strong></td>
                  <td><strong>{totalValue > 0 ? '100.0%' : '-'}</strong></td>
                </>
              ) : (
                <>
                  <td>
                    <strong>
                      {totalPercentage.toFixed(1)}%
                      {Math.abs(totalPercentage - 100) < 0.1 ? (
                        <span className="validation-ok"> ✓</span>
                      ) : (
                        <span className="validation-error"> ⚠️</span>
                      )}
                    </strong>
                  </td>
                  <td><strong>${(parseFloat(totalPortfolioValue) || 0).toLocaleString()}</strong></td>
                </>
              )}
              <td colSpan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="portfolio-actions">
        <button onClick={addAsset} className="add-btn">
          + Add Asset
        </button>
      </div>

      {/* Validation Banner (Percentage Mode Only) */}
      {mode === 'percentage' && (
        <div className={`allocation-validation ${
          Math.abs(totalPercentage - 100) < 0.1 ? 'valid' : 'invalid'
        }`}>
          {Math.abs(totalPercentage - 100) < 0.1 ? (
            <>
              <span className="validation-icon">✓</span>
              <span>Allocation: {totalPercentage.toFixed(1)}% - Ready to run simulation</span>
            </>
          ) : totalPercentage < 100 ? (
            <>
              <span className="validation-icon">⚠️</span>
              <span>Allocation: {totalPercentage.toFixed(1)}% - Add {(100 - totalPercentage).toFixed(1)}% more to reach 100%</span>
            </>
          ) : (
            <>
              <span className="validation-icon">⚠️</span>
              <span>Allocation: {totalPercentage.toFixed(1)}% - Reduce by {(totalPercentage - 100).toFixed(1)}% to reach 100%</span>
            </>
          )}
        </div>
      )}

      {/* Error Messages */}
      {Object.entries(errors).map(([ticker, error]) => error && (
        <div key={ticker} className="error-message">
          {error}
        </div>
      ))}

      {/* Portfolio Summary */}
      {totalValue > 0 && (
        <div className="portfolio-summary">
          <h3>Portfolio Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Value:</span>
              <span className="summary-value">${totalValue.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Number of Assets:</span>
              <span className="summary-value">{portfolio.filter(a => a.ticker && a.value > 0).length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Unique Tickers:</span>
              <span className="summary-value">
                {new Set(portfolio.filter(a => a.ticker).map(a => a.ticker)).size}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortfolioSetup;
