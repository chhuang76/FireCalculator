import React from 'react';
import './SimulationControls.css';

function SimulationControls({
  inflationRate,
  setInflationRate,
  iterations,
  setIterations,
  onRunSimulation,
  isRunning,
  progress,
  canRun,
  validationErrors
}) {
  return (
    <div className="simulation-controls">
      <div className="section-header">
        <h2>Simulation Settings</h2>
        <p>Configure simulation parameters and run the Monte Carlo analysis</p>
      </div>

      <div className="controls-grid">
        {/* Inflation Rate */}
        <div className="control-item">
          <label htmlFor="inflation-rate" className="control-label">
            Inflation Rate
            <span className="control-hint">Annual inflation assumption</span>
          </label>
          <div className="input-with-suffix">
            <input
              id="inflation-rate"
              type="number"
              value={inflationRate * 100}
              onChange={(e) => setInflationRate(parseFloat(e.target.value) / 100 || 0)}
              min="0"
              max="20"
              step="0.1"
              className="control-input"
              disabled={isRunning}
            />
            <span className="suffix">%</span>
          </div>
          <p className="control-description">
            Default: 3%. Spending will increase by this rate each year.
          </p>
        </div>

        {/* Iterations */}
        <div className="control-item">
          <label htmlFor="iterations" className="control-label">
            Iterations
            <span className="control-hint">Number of Monte Carlo simulations</span>
          </label>
          <select
            id="iterations"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value))}
            className="control-select"
            disabled={isRunning}
          >
            <option value="1000">1,000 (Quick)</option>
            <option value="5000">5,000 (Balanced)</option>
            <option value="10000">10,000 (Recommended)</option>
            <option value="50000">50,000 (Thorough)</option>
          </select>
          <p className="control-description">
            More iterations = more accurate results but longer runtime.
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h4>Please fix the following issues:</h4>
          <ul>
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Run Button */}
      <div className="run-button-container">
        <button
          onClick={onRunSimulation}
          disabled={!canRun || isRunning}
          className={`run-button ${isRunning ? 'running' : ''}`}
        >
          {isRunning ? (
            <>
              <span className="spinner"></span>
              Running... {progress}%
            </>
          ) : (
            <>
              <span className="play-icon">▶</span>
              Run Simulation
            </>
          )}
        </button>

        {canRun && !isRunning && (
          <p className="run-hint">
            This will run {iterations.toLocaleString()} simulations
          </p>
        )}
      </div>
    </div>
  );
}

export default SimulationControls;
