import type { FC } from 'react';
import {  useState } from 'react';
import type { MetricType, TrajectoryPoint, ProjectionScenario } from '../types/cockpit';

interface VelocityChartProps {
  selectedMetric: MetricType;
  onSelectMetric: (metric: MetricType) => void;
  trajectory: TrajectoryPoint[];
}

export const VelocityChart: FC<VelocityChartProps> = ({
  selectedMetric,
  onSelectMetric,
  trajectory,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAiProjection, setShowAiProjection] = useState<boolean>(true);
  const [scenario, setScenario] = useState<ProjectionScenario>('baseline');

  const metrics: MetricType[] = ['Gross Revenue', 'Net Sales', 'Orders', 'AOV'];

  const getMetricValue = (point: TrajectoryPoint, metric: MetricType) => {
    switch (metric) {
      case 'Gross Revenue':
        return point.grossRevenue;
      case 'Net Sales':
        return point.netSales;
      case 'Orders':
        return point.orders;
      case 'AOV':
        return point.aov;
      default:
        return point.grossRevenue;
    }
  };

  const getScenarioMultiplier = (scen: ProjectionScenario) => {
    switch (scen) {
      case 'conservative':
        return 1.085; // +8.5%
      case 'baseline':
        return 1.148; // +14.8%
      case 'aggressive':
        return 1.214; // +21.4%
    }
  };

  const getProjectedValue = (point: TrajectoryPoint, metric: MetricType, scen: ProjectionScenario) => {
    const baseVal = getMetricValue(point, metric);
    const multiplier = getScenarioMultiplier(scen);
    return Math.round(baseVal * multiplier);
  };

  const formatValue = (val: number, metric: MetricType) => {
    if (metric === 'Orders') return `${val.toLocaleString()} orders`;
    if (metric === 'AOV') return `${val.toFixed(2)} TJS`;
    return `${(val / 1000).toFixed(1)}k TJS`;
  };

  const formatCurrencyFull = (val: number) => {
    return `${new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 0,
    }).format(val)} TJS`;
  };

  // Calculate projected run-rate total for October
  const actualPeriodTotal = trajectory.reduce((sum, p) => sum + getMetricValue(p, selectedMetric), 0);
  const projectedPeriodTotal = Math.round(actualPeriodTotal * getScenarioMultiplier(scenario));

  // Dynamic SVG Y-coordinate mapping for the 7 points:
  // Actual baseline path: M 0,185 Q 60,170 120,160 T 240,140 T 360,110 T 480,125 T 560,50 T 660,75 T 740,40 T 800,28
  // We compute vertical offsets based on scenario:
  const scenarioYShift = scenario === 'conservative' ? 10 : scenario === 'baseline' ? 18 : 26;

  // Path for the AI Projection Curve (emerald stroke line)
  // Shifted upwards (lower Y value in SVG) proportionally
  const aiProjectionPath = `M 0,${185 - scenarioYShift * 0.4} Q 60,${170 - scenarioYShift * 0.6} 120,${
    160 - scenarioYShift * 0.7
  } T 240,${140 - scenarioYShift * 0.8} T 360,${110 - scenarioYShift * 0.9} T 480,${
    125 - scenarioYShift * 0.9
  } T 560,${50 - scenarioYShift * 1.1} T 660,${75 - scenarioYShift * 1.0} T 740,${
    40 - scenarioYShift * 1.1
  } T 800,${Math.max(14, 28 - scenarioYShift * 1.1)}`;

  // Confidence Interval Band upper and lower paths
  const upperYShift = scenarioYShift + 12;
  const lowerYShift = Math.max(0, scenarioYShift - 10);

  const confidenceBandPath = `M 0,${185 - upperYShift * 0.4} Q 60,${170 - upperYShift * 0.6} 120,${
    160 - upperYShift * 0.7
  } T 240,${140 - upperYShift * 0.8} T 360,${110 - upperYShift * 0.9} T 480,${
    125 - upperYShift * 0.9
  } T 560,${Math.max(10, 50 - upperYShift * 1.1)} T 660,${75 - upperYShift * 1.0} T 740,${
    Math.max(10, 40 - upperYShift * 1.1)
  } T 800,${Math.max(8, 28 - upperYShift * 1.1)} L 800,${28 - lowerYShift * 1.1} T 740,${
    40 - lowerYShift * 1.1
  } T 660,${75 - lowerYShift * 1.0} T 560,${50 - lowerYShift * 1.1} T 480,${
    125 - lowerYShift * 0.9
  } T 360,${110 - lowerYShift * 0.9} T 240,${140 - lowerYShift * 0.8} T 120,${
    160 - lowerYShift * 0.7
  } Q 60,${170 - lowerYShift * 0.6} 0,${185 - lowerYShift * 0.4} Z`;

  return (
    <div className="lg:col-span-8 rounded bg-surface-container-low border border-outline-variant p-5 flex flex-col justify-between">
      {/* Graph Header & Interactive Metric Pill Selector + AI Projection Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            ssid_chart
          </span>
          <div>
            <h3 className="font-sans font-semibold text-on-surface text-[15px]">
              Revenue &amp; Order Velocity Trajectory
            </h3>
            <span className="font-mono text-[10px] text-outline">
              Multi-week velocity with predictive AI trend line &amp; benchmark overlays
            </span>
          </div>
        </div>

        {/* Right controls: Metric pills + AI Projection Toggle */}
        <div className="flex items-center flex-wrap gap-2">
          {/* AI Projection Toggle Button */}
          <button
            onClick={() => setShowAiProjection(!showAiProjection)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] border cursor-pointer transition-all active:scale-95 ${
              showAiProjection
                ? 'bg-secondary/15 border-secondary text-secondary font-semibold accent-bloom-green'
                : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-outline'
            }`}
            title="Toggle Machine Learning Revenue Projection curve"
          >
            <span className="material-symbols-outlined text-[14px]">
              auto_awesome
            </span>
            <span>AI Projection</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                showAiProjection ? 'bg-secondary animate-pulse' : 'bg-outline'
              }`}
            ></span>
          </button>

          {/* Metric selector pills */}
          <div className="flex items-center bg-surface-container p-0.5 rounded border border-outline-variant">
            {metrics.map((m) => {
              const isSelected = selectedMetric === m;
              return (
                <button
                  key={m}
                  onClick={() => onSelectMetric(m)}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-container shadow-xs font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Bar: Growth Scenario Presets (Shown when AI projection is active) */}
      {showAiProjection && (
        <div className="py-2 px-3 my-2 rounded bg-surface border border-secondary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-secondary font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">insights</span>
              <span>Growth Scenario:</span>
            </span>
            <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded border border-outline-variant/60">
              {(
                [
                  { id: 'conservative', label: 'Conservative (+8.5%)' },
                  { id: 'baseline', label: 'Baseline ML (+14.8%)' },
                  { id: 'aggressive', label: 'Aggressive (+21.4%)' },
                ] as const
              ).map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setScenario(sc.id)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                    scenario === sc.id
                      ? 'bg-secondary text-on-secondary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-outline text-[10px] flex items-center gap-3">
            <span>
              Model Fit: <strong className="text-secondary">94.6% Confidence</strong>
            </span>
            <span>
              Projected Run-Rate:{' '}
              <strong className="text-secondary font-tabular font-bold">
                {selectedMetric === 'Orders'
                  ? `${projectedPeriodTotal.toLocaleString()} units`
                  : selectedMetric === 'AOV'
                  ? `$${(trajectory[4].aov * getScenarioMultiplier(scenario)).toFixed(2)}`
                  : formatCurrencyFull(projectedPeriodTotal)}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Chart Legend & Benchmark indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] font-mono">
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary-container inline-block"></span>
            <span className="text-on-surface">Oct 2024 Current Period ($1.84M)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-outline inline-block"></span>
            <span className="text-outline">Prior 30-Day Benchmark ($1.60M)</span>
          </div>
          {showAiProjection && (
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-secondary inline-block"></span>
              <span className="font-semibold">AI Projected Curve &amp; Confidence Band</span>
            </div>
          )}
        </div>
        <div className="text-outline">
          Peak:{' '}
          <span className="text-primary font-semibold font-tabular">
            $94,210 (Day 24)
          </span>
        </div>
      </div>

      {/* SVG Precision Trajectory Visualizer */}
      <div className="relative w-full h-64 mt-3">
        {/* Peak Annotation Card positioned above the Day 21 peak */}
        <div className="absolute left-[70%] top-[12%] -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none">
          <div className="px-2.5 py-1 rounded bg-surface-container-high border border-primary text-on-surface shadow-lg flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
            <span className="font-mono text-[10px] font-semibold text-primary">
              Track Day Season Flash Sale +$84k
            </span>
          </div>
          <div className="w-0.5 h-6 bg-primary/40 border-l border-dashed border-primary"></div>
        </div>

        {/* Hover inspection overlay with dual actual vs AI projected reading */}
        {hoveredIndex !== null && (
          <div
            className="absolute top-2 z-20 px-3 py-2 rounded bg-surface-container-highest border border-primary text-[11px] font-mono shadow-xl pointer-events-none transition-all flex flex-col gap-1 min-w-[170px]"
            style={{
              left: `${(hoveredIndex / (trajectory.length - 1)) * 88 + 6}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-outline text-[10px] border-b border-outline-variant/60 pb-1 flex justify-between">
              <span>{trajectory[hoveredIndex].label}</span>
              <span className="text-primary font-semibold">{selectedMetric}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-outline text-[10px]">Actual:</span>
              <span className="text-on-surface font-bold font-tabular">
                {formatValue(getMetricValue(trajectory[hoveredIndex], selectedMetric), selectedMetric)}
              </span>
            </div>
            {showAiProjection && (
              <>
                <div className="flex items-center justify-between gap-3 text-secondary">
                  <span className="text-[10px]">AI Projected:</span>
                  <span className="font-bold font-tabular">
                    {formatValue(
                      getProjectedValue(trajectory[hoveredIndex], selectedMetric, scenario),
                      selectedMetric
                    )}
                  </span>
                </div>
                <div className="pt-0.5 border-t border-outline-variant/40 flex items-center justify-between text-[9px]">
                  <span className="text-outline">Variance:</span>
                  <span className="text-secondary font-semibold font-tabular">
                    +{(
                      (getScenarioMultiplier(scenario) - 1) *
                      100
                    ).toFixed(1)}
                    % Ahead of Pace
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 240">
          <defs>
            <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25"></stop>
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.04"></stop>
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"></stop>
            </linearGradient>

            <linearGradient id="confidenceBandGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4edea3" stopOpacity="0.18"></stop>
              <stop offset="100%" stopColor="#4edea3" stopOpacity="0.03"></stop>
            </linearGradient>

            <pattern height="40" id="gridLines" patternUnits="userSpaceOnUse" width="80">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1e293b" strokeDasharray="2 2" strokeWidth="0.75"></path>
            </pattern>
          </defs>

          {/* Grid Backdrop */}
          <rect fill="url(#gridLines)" height="240" opacity="0.6" width="800"></rect>

          {/* Baseline reference lines */}
          <line stroke="#1e293b" strokeWidth="1" x1="0" x2="800" y1="60" y2="60"></line>
          <line stroke="#1e293b" strokeWidth="1" x1="0" x2="800" y1="120" y2="120"></line>
          <line stroke="#1e293b" strokeWidth="1" x1="0" x2="800" y1="180" y2="180"></line>
          <line stroke="#1e293b" strokeWidth="1" x1="0" x2="800" y1="239" y2="239"></line>

          {/* Benchmark Dash Line (Prior 30 days) */}
          <path
            d="M 0,195 Q 60,180 120,185 T 240,165 T 360,150 T 480,140 T 600,120 T 720,110 T 800,95"
            fill="none"
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth="1.75"
          ></path>

          {/* AI Confidence Interval Shaded Band (when enabled) */}
          {showAiProjection && (
            <path
              d={confidenceBandPath}
              fill="url(#confidenceBandGradient)"
              className="transition-all duration-300"
            ></path>
          )}

          {/* Main Current Period Shaded Area (Actual) */}
          <path
            d="M 0,185 Q 60,170 120,160 T 240,140 T 360,110 T 480,125 T 560,50 T 660,75 T 740,40 T 800,28 L 800,240 L 0,240 Z"
            fill="url(#areaFill)"
          ></path>

          {/* Main Trajectory Crisp Stroke Line (Actual) */}
          <path
            d="M 0,185 Q 60,170 120,160 T 240,140 T 360,110 T 480,125 T 560,50 T 660,75 T 740,40 T 800,28"
            fill="none"
            stroke="#38bdf8"
            strokeLinecap="round"
            strokeWidth="2.5"
          ></path>

          {/* AI Revenue Projection Dashed Curve (when enabled) */}
          {showAiProjection && (
            <>
              <path
                d={aiProjectionPath}
                fill="none"
                stroke="#4edea3"
                strokeLinecap="round"
                strokeDasharray="5 3"
                strokeWidth="2.2"
                className="transition-all duration-300"
              ></path>
              {/* Projected curve node dots */}
              <circle cx="560" cy={Math.max(12, 50 - scenarioYShift * 1.1)} fill="#0b1326" r="4.5" stroke="#4edea3" strokeWidth="2"></circle>
              <circle cx="800" cy={Math.max(12, 28 - scenarioYShift * 1.1)} fill="#0b1326" r="4.5" stroke="#4edea3" strokeWidth="2"></circle>
            </>
          )}

          {/* Actual Key Nodes */}
          <circle cx="560" cy="50" fill="#0b1326" r="4.5" stroke="#38bdf8" strokeWidth="2.5"></circle>
          <circle cx="740" cy="40" fill="#0b1326" r="4" stroke="#4edea3" strokeWidth="2"></circle>
        </svg>

        {/* Hit targets for hover interaction across the 7 segments */}
        <div className="absolute inset-0 flex justify-between">
          {trajectory.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-full cursor-crosshair"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </div>
      </div>

      {/* Timeline X-Axis Labels */}
      <div className="flex justify-between items-center pt-2 font-mono text-[10px] text-outline border-t border-outline-variant mt-2">
        {trajectory.map((pt, i) => (
          <span
            key={i}
            className={hoveredIndex === i ? 'text-primary font-semibold' : ''}
          >
            {pt.label}
          </span>
        ))}
      </div>
    </div>
  );
};
