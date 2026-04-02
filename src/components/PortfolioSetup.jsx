import React, { useState, useEffect } from 'react';
import { loadAndProcessTicker } from '../lib/data-loader';
import './PortfolioSetup.css';

const AVAILABLE_TICKERS = [
  { value: '', label: '-- Select Ticker --' },
  { value: 'VT', label: 'VT - Vanguard Total World Stock' },
  { value: 'QQQ', label: 'QQQ - Invesco QQQ Trust' },
  { value: 'AVUV', label: 'AVUV - Avantis U.S. Small Cap Value' },
  { value: 'BND', label: 'BND - Vanguard Total Bond Market' },
  { value: 'GLD', label: 'GLD - SPDR Gold Trust' },
  { value: 'BTC/USD', label: 'BTC/USD - Bitcoin' },
  { value: 'SHV', label: 'SHV - iShares 0-1 Year Treasury Bond ETF' }
];

function PortfolioSetup({ portfolio, setPortfolio, tickerStats, setTickerStats }) {
  const [loadingTickers, setLoadingTickers] = useState({});
  const [errors, setErrors] = useState({});

  // Calculate total portfolio value and weights
  const totalValue = portfolio.reduce((sum, asset) => sum + (parseFloat(asset.value) || 0), 0);

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

  // Add new asset row
  const addAsset = () => {
    setPortfolio([
      ...portfolio,
      { id: Date.now(), ticker: '', value: '' }
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

      <div className="portfolio-table-container">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Value ($)</th>
              <th>Weight (%)</th>
              <th>Return (μ)</th>
              <th>Volatility (σ)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((asset, index) => {
              const stats = getStats(asset.ticker);
              const weight = getWeight(asset.value);

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
              <td><strong>${totalValue.toLocaleString()}</strong></td>
              <td><strong>{totalValue > 0 ? '100.0%' : '-'}</strong></td>
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
