import React from 'react';
import './SpendingPhasesBuilder.css';

function SpendingPhasesBuilder({ phases, setPhases, inflationRate }) {
  // Add new phase
  const addPhase = () => {
    setPhases([
      ...phases,
      { id: Date.now(), amount: 40000, years: 30, strategy: 'fixed' }
    ]);
  };

  // Remove phase
  const removePhase = (id) => {
    setPhases(phases.filter(phase => phase.id !== id));
  };

  // Update amount
  const updateAmount = (id, amount) => {
    setPhases(phases.map(phase =>
      phase.id === id ? { ...phase, amount: parseFloat(amount) || 0 } : phase
    ));
  };

  // Update years
  const updateYears = (id, years) => {
    setPhases(phases.map(phase =>
      phase.id === id ? { ...phase, years: parseInt(years) || 0 } : phase
    ));
  };

  // Update strategy
  const updateStrategy = (id, strategy) => {
    setPhases(phases.map(phase =>
      phase.id === id ? { ...phase, strategy } : phase
    ));
  };

  // Calculate total years
  const totalYears = phases.reduce((sum, phase) => sum + phase.years, 0);

  // Calculate total spending (nominal, without inflation) - only for fixed dollar phases
  const totalSpending = phases.reduce((sum, phase) => {
    const strategy = phase.strategy || 'fixed';
    return strategy === 'fixed' ? sum + (phase.amount * phase.years) : sum;
  }, 0);

  const hasPercentagePhases = phases.some(p => (p.strategy || 'fixed') === 'percentage');

  // Calculate inflation-adjusted first year spending
  const getInflationAdjustedAmount = (phaseIndex) => {
    let yearsFromStart = 0;
    for (let i = 0; i < phaseIndex; i++) {
      yearsFromStart += phases[i].years;
    }
    const phase = phases[phaseIndex];
    const inflationFactor = Math.pow(1 + inflationRate, yearsFromStart);
    return phase.amount * inflationFactor;
  };

  // Initialize with default phase if empty
  React.useEffect(() => {
    if (phases.length === 0) {
      setPhases([{ id: Date.now(), amount: 50000, years: 30, strategy: 'fixed' }]);
    }
  }, []);

  return (
    <div className="spending-phases-builder">
      <div className="section-header">
        <h2>Spending Plan</h2>
        <p>Define your spending phases with withdrawal strategy</p>
      </div>

      <div className="strategy-info">
        <div className="info-item">
          <strong>Fixed Dollar:</strong> Withdraw a set amount each year, adjusted for inflation (e.g., $50k/year)
        </div>
        <div className="info-item">
          <strong>% of Portfolio:</strong> Withdraw a percentage of your current balance each year (e.g., 4% of remaining portfolio)
        </div>
      </div>

      <div className="phases-table-container">
        <table className="phases-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Strategy</th>
              <th>Annual Amount</th>
              <th>Duration (Years)</th>
              <th>Total Spent</th>
              <th>First Year (Inflation-Adjusted)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase, index) => {
              const inflationAdjusted = getInflationAdjustedAmount(index);
              const totalForPhase = phase.amount * phase.years;
              const strategy = phase.strategy || 'fixed'; // Default to 'fixed' for backward compatibility

              return (
                <tr key={phase.id}>
                  <td className="phase-number">
                    <span className="phase-badge">Phase {index + 1}</span>
                  </td>

                  <td>
                    <select
                      value={strategy}
                      onChange={(e) => updateStrategy(phase.id, e.target.value)}
                      className="strategy-select"
                    >
                      <option value="fixed">Fixed Dollar</option>
                      <option value="percentage">% of Portfolio</option>
                    </select>
                  </td>

                  <td>
                    {strategy === 'percentage' ? (
                      <div className="input-with-suffix">
                        <input
                          type="number"
                          value={phase.amount}
                          onChange={(e) => updateAmount(phase.id, e.target.value)}
                          placeholder="4"
                          min="0"
                          max="100"
                          step="0.1"
                          className="percentage-input"
                        />
                        <span className="suffix">%</span>
                      </div>
                    ) : (
                      <div className="input-with-prefix">
                        <span className="prefix">$</span>
                        <input
                          type="number"
                          value={phase.amount}
                          onChange={(e) => updateAmount(phase.id, e.target.value)}
                          placeholder="50000"
                          min="0"
                          step="1000"
                          className="amount-input"
                        />
                      </div>
                    )}
                  </td>

                  <td>
                    <input
                      type="number"
                      value={phase.years}
                      onChange={(e) => updateYears(phase.id, e.target.value)}
                      placeholder="30"
                      min="1"
                      max="100"
                      className="years-input"
                    />
                  </td>

                  <td className="total-cell">
                    {strategy === 'percentage' ? (
                      <span className="variable-note">Variable</span>
                    ) : (
                      `$${totalForPhase.toLocaleString()}`
                    )}
                  </td>

                  <td className="inflation-cell">
                    {strategy === 'percentage' ? (
                      <span className="variable-note">{phase.amount}% of balance</span>
                    ) : index > 0 && inflationRate > 0 ? (
                      <>
                        ${inflationAdjusted.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        <span className="inflation-note">
                          (Year {phases.slice(0, index).reduce((sum, p) => sum + p.years, 0) + 1})
                        </span>
                      </>
                    ) : (
                      <span className="no-inflation">-</span>
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() => removePhase(phase.id)}
                      className="remove-btn"
                      disabled={phases.length === 1}
                      title="Remove phase"
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
              <td colSpan="3"><strong>{totalYears} years</strong></td>
              <td>
                <strong>
                  {hasPercentagePhases ? (
                    <span className="variable-note">Variable</span>
                  ) : (
                    `$${totalSpending.toLocaleString()}`
                  )}
                </strong>
              </td>
              <td colSpan="2">
                <em>
                  {hasPercentagePhases
                    ? '(% phases adjust with portfolio balance)'
                    : '(Nominal dollars, pre-inflation)'
                  }
                </em>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="phases-actions">
        <button onClick={addPhase} className="add-btn">
          + Add Phase
        </button>
      </div>

      {/* Timeline Visualization */}
      {totalYears > 0 && (
        <div className="timeline-visualization">
          <h3>Timeline</h3>
          <div className="timeline-bar">
            {phases.map((phase, index) => {
              const percentage = (phase.years / totalYears) * 100;
              const hue = 200 + (index * 40); // Color progression

              return (
                <div
                  key={phase.id}
                  className="timeline-segment"
                  style={{
                    width: `${percentage}%`,
                    background: `hsl(${hue}, 70%, 65%)`
                  }}
                  title={
                    (phase.strategy || 'fixed') === 'percentage'
                      ? `Phase ${index + 1}: ${phase.amount}% of portfolio for ${phase.years} years`
                      : `Phase ${index + 1}: $${phase.amount.toLocaleString()}/yr for ${phase.years} years`
                  }
                >
                  <span className="timeline-label">
                    {phase.years}y
                  </span>
                </div>
              );
            })}
          </div>
          <div className="timeline-legend">
            {phases.map((phase, index) => (
              <div key={phase.id} className="legend-item">
                <div
                  className="legend-color"
                  style={{ background: `hsl(${200 + index * 40}, 70%, 65%)` }}
                ></div>
                <span className="legend-text">
                  {(phase.strategy || 'fixed') === 'percentage'
                    ? `Phase ${index + 1}: ${phase.amount}% of portfolio × ${phase.years} years`
                    : `Phase ${index + 1}: $${phase.amount.toLocaleString()}/yr × ${phase.years} years`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpendingPhasesBuilder;
