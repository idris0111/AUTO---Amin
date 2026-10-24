import type { FC } from 'react';
import type { TelemetryState } from '../types/cockpit';

interface KpiHeroStripProps {
  telemetry: TelemetryState;
  onFilterLowStock: () => void;
}

export const KpiHeroStrip: FC<KpiHeroStripProps> = ({ telemetry, onFilterLowStock }) => {
  // Format currency helpers (TJS Somoni)
  const formatCurrency = (val: number) => {
    return `${new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)} TJS`;
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val);
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
      {/* HERO KPI: Total Net Revenue (Span 4 cols) */}
      <div className="lg:col-span-4 rounded bg-surface-container-low border border-outline-variant p-4 flex flex-col justify-between relative overflow-hidden group hover:border-primary-container/40 transition-all cockpit-glow">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-container/5 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-outline uppercase font-semibold tracking-wider">
              Primary Hero KPI • Total Net Revenue
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/30 text-secondary font-mono text-[11px]">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              <span>+{telemetry.revenueYoY.toFixed(1)}%</span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-[32px] sm:text-[36px] font-bold text-on-surface tracking-tight font-mono font-tabular">
              {formatCurrency(telemetry.netRevenue)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-outline">
            vs {formatCurrency(telemetry.prior30DayRevenue)} prior 30-day window
          </span>
        </div>

        {/* Secondary gross/refund breakdown inline ledger */}
        <div className="mt-4 pt-3 border-t border-outline-variant/60 grid grid-cols-2 gap-2 text-[12px]">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-outline">Gross Billed</span>
            <span className="font-mono text-[12px] font-semibold text-on-surface font-tabular">
              {formatCurrency(telemetry.grossBilled)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-outline">Refunds & Discs</span>
            <span className="font-mono text-[12px] font-semibold text-error font-tabular">
              {formatCurrency(telemetry.refundsDiscounts)}
            </span>
          </div>
        </div>

        {/* Inline Telemetry Sparkline */}
        <div className="mt-3 h-8 w-full">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 24">
            <defs>
              <linearGradient id="heroGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35"></stop>
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"></stop>
              </linearGradient>
            </defs>
            <path
              d="M0,20 L8,18 L16,21 L24,15 L32,17 L40,11 L48,13 L56,9 L64,12 L72,6 L80,8 L88,3 L96,4 L100,2"
              fill="none"
              stroke="#38bdf8"
              strokeLinecap="round"
              strokeWidth="2"
            ></path>
            <path
              d="M0,20 L8,18 L16,21 L24,15 L32,17 L40,11 L48,13 L56,9 L64,12 L72,6 L80,8 L88,3 L96,4 L100,2 L100,24 L0,24 Z"
              fill="url(#heroGradient)"
            ></path>
          </svg>
        </div>
      </div>

      {/* Supporting KPI 1: Total Orders (Span 2 cols) */}
      <div className="lg:col-span-2 rounded bg-surface-container-low border border-outline-variant p-4 flex flex-col justify-between hover:border-outline transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-outline uppercase font-semibold">
              Total Orders
            </span>
            <span className="text-secondary font-mono text-[11px] flex items-center font-semibold">
              +{telemetry.ordersYoY.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[24px] font-bold font-mono text-on-surface font-tabular">
              {formatNumber(telemetry.totalOrders)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-outline block mt-0.5">
            YoY expansion
          </span>
        </div>
        <div className="mt-4 pt-2.5 border-t border-outline-variant/60 flex items-center justify-between">
          <span className="font-mono text-[10px] text-outline">Avg Fulfillment:</span>
          <span className="font-mono text-[12px] text-on-surface font-semibold">
            {telemetry.avgFulfillmentDays} days
          </span>
        </div>
      </div>

      {/* Supporting KPI 2: Average Order Value (Span 2 cols) */}
      <div className="lg:col-span-2 rounded bg-surface-container-low border border-outline-variant p-4 flex flex-col justify-between hover:border-outline transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-outline uppercase font-semibold">
              Average Order Value
            </span>
            <span className="text-secondary font-mono text-[11px] flex items-center font-semibold">
              +{telemetry.aovYoY.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[24px] font-bold font-mono text-on-surface font-tabular">
              ${telemetry.aov.toFixed(2)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-outline block mt-0.5 truncate">
            Led by Turbochargers
          </span>
        </div>
        <div className="mt-4 pt-2.5 border-t border-outline-variant/60 flex items-center justify-between">
          <span className="font-mono text-[10px] text-outline">Driver Category:</span>
          <span className="font-mono text-[11px] text-primary font-medium truncate max-w-[90px]">
            {telemetry.driverCategory}
          </span>
        </div>
      </div>

      {/* Supporting KPI 3: Storefront Conversion Rate (Span 2 cols) */}
      <div className="lg:col-span-2 rounded bg-surface-container-low border border-outline-variant p-4 flex flex-col justify-between hover:border-outline transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-outline uppercase font-semibold">
              Conversion Rate
            </span>
            <span className="text-secondary font-mono text-[11px] flex items-center font-semibold">
              +{telemetry.conversionDelta.toFixed(2)}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[24px] font-bold font-mono text-on-surface font-tabular">
              {telemetry.conversionRate.toFixed(2)}%
            </span>
          </div>
          <span className="font-mono text-[10px] text-outline block mt-0.5">
            Platform baseline
          </span>
        </div>
        <div className="mt-4 pt-2.5 border-t border-outline-variant/60 flex items-center justify-between">
          <span className="font-mono text-[10px] text-outline">Fitment Search:</span>
          <span className="font-mono text-[12px] text-secondary font-semibold">
            {telemetry.fitmentSearchConversion.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Supporting KPI 4: Inventory Health (Span 2 cols) */}
      <div className="lg:col-span-2 rounded bg-surface-container-low border border-outline-variant p-4 flex flex-col justify-between hover:border-outline transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-outline uppercase font-semibold">
              Inventory Health
            </span>
            <span className="text-primary font-mono text-[11px] flex items-center font-semibold">
              {telemetry.inventoryHealthScore.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[24px] font-bold font-mono text-secondary">
              Optimal
            </span>
          </div>
          <span className="font-mono text-[10px] text-outline block mt-0.5">
            Global catalog active
          </span>
        </div>
        <div className="mt-4 pt-2.5 border-t border-outline-variant/60 flex items-center justify-between text-[11px]">
          <button
            onClick={onFilterLowStock}
            className="flex items-center gap-1 font-mono text-tertiary hover:underline cursor-pointer"
            title="Filter low stock items"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>{telemetry.lowStockCount} Low</span>
          </button>
          <button
            onClick={onFilterLowStock}
            className="flex items-center gap-1 font-mono text-error hover:underline cursor-pointer"
            title="Filter stockouts"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            <span>{telemetry.stockoutCount} Stockout</span>
          </button>
        </div>
      </div>
    </section>
  );
};
