import React from 'react';
import PercentileChart from './PercentileChart';
import './ResultsDisplay.css';

function ResultsDisplay({ results }) {
  if (!results) {
    return (
      <div className="results-display-empty">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Results Yet</h3>
          <p>Configure your portfolio and spending plan, then run a simulation to see results.</p>
        </div>
      </div>
    );
  }

  const {
    successRate,
    totalRuns,
    successfulRuns,
    failedRuns,
    medianEndingBalance,
    worstCaseEndingBalance,
    averageFailureYear,
    percentilesByYear
  } = results;

  // Determine success rate category
  const getSuccessCategory = () => {
    if (successRate >= 90) return { level: 'excellent', color: '#10b981', icon: '🟢' };
    if (successRate >= 70) return { level: 'moderate', color: '#f59e0b', icon: '🟡' };
    return { level: 'poor', color: '#ef4444', icon: '🔴' };
  };

  const category = getSuccessCategory();

  // Get interpretation message
  const getInterpretation = () => {
    if (successRate >= 90) {
      return {
        title: 'Excellent! Your plan looks sustainable.',
        message: 'Your portfolio has a very high chance of lasting through retirement. This is a strong plan with good safety margins.'
      };
    } else if (successRate >= 70) {
      return {
        title: 'Moderate Risk',
        message: 'Your portfolio has a reasonable chance of success, but you may want to consider reducing spending, increasing savings, or adjusting your asset allocation.'
      };
    } else {
      return {
        title: 'High Risk!',
        message: 'Your portfolio has a low chance of lasting through retirement. Consider significantly reducing spending, working longer, or increasing your savings rate.'
      };
    }
  };

  const interpretation = getInterpretation();

  // Format snapshots for display
  const snapshotYears = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const snapshots = snapshotYears
    .filter(year => year < percentilesByYear.length)
    .map(year => percentilesByYear[year]);

  return (
    <div className="results-display">
      {/* Success Rate Card */}
      <div className="success-rate-card" style={{ borderColor: category.color }}>
        <div className="success-rate-header">
          <span className="success-icon" style={{ color: category.color }}>
            {category.icon}
          </span>
          <div className="success-rate-content">
            <h2 className="success-rate-title">Success Rate</h2>
            <div className="success-rate-value" style={{ color: category.color }}>
              {successRate.toFixed(1)}%
            </div>
            <p className="success-rate-subtitle">
              {successfulRuns.toLocaleString()} successful / {totalRuns.toLocaleString()} runs
            </p>
          </div>
        </div>

        <div className="success-rate-bar">
          <div
            className="success-rate-fill"
            style={{
              width: `${successRate}%`,
              background: category.color
            }}
          ></div>
        </div>

        <div className="interpretation-box">
          <h4>{interpretation.title}</h4>
          <p>{interpretation.message}</p>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="statistics-grid">
        {/* Ending Balance */}
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3 className="stat-label">Median Ending Balance</h3>
            <div className="stat-value">
              ${medianEndingBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="stat-description">
              Half of successful scenarios ended above this amount
            </p>
          </div>
        </div>

        {/* Worst Case */}
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3 className="stat-label">Worst Case (Successful)</h3>
            <div className="stat-value">
              ${worstCaseEndingBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="stat-description">
              Lowest ending balance among successful runs
            </p>
          </div>
        </div>

        {/* Failure Analysis */}
        {failedRuns > 0 && (
          <div className="stat-card failure-card">
            <div className="stat-icon">📉</div>
            <div className="stat-content">
              <h3 className="stat-label">Average Failure Year</h3>
              <div className="stat-value">
                Year {averageFailureYear.toFixed(1)}
              </div>
              <p className="stat-description">
                {failedRuns.toLocaleString()} scenarios ({(100 - successRate).toFixed(1)}%) ran out of money
              </p>
            </div>
          </div>
        )}

        {/* Success Count */}
        <div className="stat-card success-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3 className="stat-label">Successful Scenarios</h3>
            <div className="stat-value">
              {successfulRuns.toLocaleString()}
            </div>
            <p className="stat-description">
              Portfolio lasted the full retirement period
            </p>
          </div>
        </div>
      </div>

      {/* Percentile Chart */}
      <PercentileChart percentilesByYear={percentilesByYear} />

      {/* Balance Snapshots Table */}
      <div className="snapshots-container">
        <h3>Portfolio Balance Snapshots</h3>
        <p className="snapshots-description">
          Percentile values at key years in your retirement
        </p>

        <div className="snapshots-table-container">
          <table className="snapshots-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>10th</th>
                <th>25th</th>
                <th>50th (Median)</th>
                <th>75th</th>
                <th>90th</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map(snapshot => {
                const formatValue = (val) => {
                  if (val <= 0) return '$0';
                  if (val >= 1000000) {
                    return `$${(val / 1000000).toFixed(2)}M`;
                  }
                  return `$${(val / 1000).toFixed(0)}k`;
                };

                return (
                  <tr key={snapshot.year}>
                    <td className="year-cell">
                      <strong>Year {snapshot.year}</strong>
                    </td>
                    <td className="percentile-cell p10">{formatValue(snapshot.p10)}</td>
                    <td className="percentile-cell p25">{formatValue(snapshot.p25)}</td>
                    <td className="percentile-cell p50">{formatValue(snapshot.p50)}</td>
                    <td className="percentile-cell p75">{formatValue(snapshot.p75)}</td>
                    <td className="percentile-cell p90">{formatValue(snapshot.p90)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ResultsDisplay;
