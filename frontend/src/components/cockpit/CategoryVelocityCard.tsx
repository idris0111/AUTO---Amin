import type { FC } from 'react';
import type { CategoryShare } from '../types/cockpit';

interface CategoryVelocityCardProps {
  categories: CategoryShare[];
}

export const CategoryVelocityCard: FC<CategoryVelocityCardProps> = ({ categories }) => {
  const formatCurrency = (val: number) => {
    return `${new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 0,
    }).format(val)} TJS`;
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val);
  };

  return (
    <div className="lg:col-span-5 rounded bg-surface-container-low border border-outline-variant p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              donut_small
            </span>
            <div>
              <h3 className="font-sans font-semibold text-on-surface text-[15px]">
                Category Velocity &amp; Share
              </h3>
              <span className="font-mono text-[10px] text-outline">
                30-day gross revenue share &amp; YoY trajectory
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-outline">6 Core Sectors</span>
        </div>

        {/* Progressive Bars Ledger */}
        <div className="mt-4 flex flex-col gap-3.5">
          {categories.map((cat) => {
            const isPositive = cat.yoyChange >= 0;
            return (
              <div key={cat.id} className="flex flex-col gap-1.5 group">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    ></span>
                    <span className="text-on-surface font-medium truncate group-hover:text-primary transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="text-on-surface font-semibold font-tabular">
                      {formatCurrency(cat.revenue)}
                    </span>
                    <span
                      className={`px-1 py-0.5 rounded text-[10px] font-semibold ${
                        isPositive
                          ? 'text-secondary bg-secondary/10'
                          : 'text-error bg-error/10'
                      }`}
                    >
                      {isPositive ? `+${cat.yoyChange.toFixed(1)}%` : `${cat.yoyChange.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-surface-container rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${cat.widthPercentage}%`,
                      backgroundColor: cat.color,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between font-mono text-[10px] text-outline">
                  <span>{cat.percentageOfGross.toFixed(1)}% of Gross</span>
                  <span>{formatNumber(cat.unitsShipped)} Units Shipped</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Metric */}
      <div className="mt-4 pt-3 border-t border-outline-variant/60 flex items-center justify-between font-mono text-[11px]">
        <span className="text-outline">Top Segment Margin:</span>
        <span className="text-primary font-bold">48.2% (Turbos &amp; Superchargers)</span>
      </div>
    </div>
  );
};
