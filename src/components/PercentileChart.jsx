import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import './PercentileChart.css';

function PercentileChart({ percentilesByYear }) {
  if (!percentilesByYear || percentilesByYear.length === 0) {
    return null;
  }

  // Format data for recharts
  const chartData = percentilesByYear.map(p => ({
    year: p.year,
    p10: p.p10,
    p25: p.p25,
    p50: p.p50,
    p75: p.p75,
    p90: p.p90
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="custom-tooltip">
        <p className="tooltip-year">Year {data.year}</p>
        <div className="tooltip-values">
          <div className="tooltip-item">
            <span className="tooltip-label p90-label">90th:</span>
            <span className="tooltip-value">${(data.p90 / 1000).toFixed(0)}k</span>
          </div>
          <div className="tooltip-item">
            <span className="tooltip-label p75-label">75th:</span>
            <span className="tooltip-value">${(data.p75 / 1000).toFixed(0)}k</span>
          </div>
          <div className="tooltip-item">
            <span className="tooltip-label p50-label">50th:</span>
            <span className="tooltip-value">${(data.p50 / 1000).toFixed(0)}k</span>
          </div>
          <div className="tooltip-item">
            <span className="tooltip-label p25-label">25th:</span>
            <span className="tooltip-value">${(data.p25 / 1000).toFixed(0)}k</span>
          </div>
          <div className="tooltip-item">
            <span className="tooltip-label p10-label">10th:</span>
            <span className="tooltip-value">${(data.p10 / 1000).toFixed(0)}k</span>
          </div>
        </div>
      </div>
    );
  };

  // Format Y-axis values
  const formatYAxis = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  return (
    <div className="percentile-chart-container">
      <h3>Portfolio Balance Over Time</h3>
      <p className="chart-description">
        Percentile bands show the range of outcomes across all simulations
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <defs>
            {/* Gradient for the area between p10 and p90 */}
            <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#667eea" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#667eea" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#667eea" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

          <XAxis
            dataKey="year"
            label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            stroke="#666"
          />

          <YAxis
            tickFormatter={formatYAxis}
            label={{ value: 'Portfolio Balance', angle: -90, position: 'insideLeft' }}
            stroke="#666"
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            height={36}
            iconType="line"
          />

          {/* 90th percentile line */}
          <Line
            type="monotone"
            dataKey="p90"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="90th percentile"
            activeDot={{ r: 4 }}
          />

          {/* 75th percentile line */}
          <Line
            type="monotone"
            dataKey="p75"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="75th percentile"
            activeDot={{ r: 4 }}
          />

          {/* Median (50th percentile) - thicker line */}
          <Line
            type="monotone"
            dataKey="p50"
            stroke="#667eea"
            strokeWidth={3}
            dot={false}
            name="50th percentile (Median)"
            activeDot={{ r: 5 }}
          />

          {/* 25th percentile line */}
          <Line
            type="monotone"
            dataKey="p25"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="25th percentile"
            activeDot={{ r: 4 }}
          />

          {/* 10th percentile line */}
          <Line
            type="monotone"
            dataKey="p10"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="10th percentile"
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="chart-legend-info">
        <div className="legend-note">
          <strong>How to read this chart:</strong>
          <ul>
            <li><strong>Median (50th):</strong> Half of simulations ended above this line</li>
            <li><strong>90th percentile:</strong> Best-case scenarios (top 10%)</li>
            <li><strong>10th percentile:</strong> Worst-case scenarios (bottom 10%)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PercentileChart;
