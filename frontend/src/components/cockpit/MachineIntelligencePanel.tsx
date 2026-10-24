import type { FC } from 'react';
import type { AiSignal } from '../types/cockpit';

interface MachineIntelligencePanelProps {
  signals?: AiSignal[];
  onGeneratePo: () => void;
  onMapFitment: () => void;
  isPoResolved: boolean;
  isFitmentResolved: boolean;
}

export const MachineIntelligencePanel: FC<MachineIntelligencePanelProps> = ({
  signals: _signals,
  onGeneratePo,
  onMapFitment,
  isPoResolved,
  isFitmentResolved,
}) => {
  const unresolvedCount = (isPoResolved ? 0 : 1) + (isFitmentResolved ? 0 : 1);

  return (
    <div className="lg:col-span-4 rounded bg-surface-container-low border border-outline-variant p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              auto_awesome
            </span>
            <h3 className="font-sans font-semibold text-on-surface text-[15px]">
              Machine Intelligence
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-primary/10 border border-primary/20 text-primary">
            {unresolvedCount > 0 ? `${unresolvedCount} Actionable Signals` : 'All Signals Resolved'}
          </span>
        </div>

        {/* Insight Cards Stack */}
        <div className="mt-4 flex flex-col gap-3.5">
          {/* Card 1: Demand Surge (Brembo) */}
          <div className="p-3.5 rounded bg-surface-container border border-outline-variant hover:border-primary-container/60 transition-all flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-tertiary">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide">
                  High Demand Surge
                </span>
              </div>
              <span className="font-mono text-[10px] text-outline">Fitment: BMW G80</span>
            </div>

            <p className="font-sans text-[12px] text-on-surface leading-relaxed">
              <strong className="text-primary font-medium">Brembo 6-Piston Calipers</strong>{' '}
              experiencing{' '}
              <span className="text-secondary font-semibold font-mono text-[11px]">
                3.4x search spike
              </span>{' '}
              across tier-1 distributors. Remaining 12 units will deplete within 4 days at
              current conversion velocity.
            </p>

            <div className="pt-1">
              {isPoResolved ? (
                <div className="w-full py-1.5 px-3 rounded bg-secondary/10 border border-secondary/40 text-secondary font-mono text-[11px] font-semibold flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>PO-2024-8891 Dispatched (Brembo OEM)</span>
                </div>
              ) : (
                <button
                  onClick={onGeneratePo}
                  className="w-full py-1.5 px-3 rounded bg-surface-container-high border border-outline-variant hover:border-primary text-primary hover:bg-surface-container font-mono text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <span>Generate PO from Brembo OEM</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Fitment Gap Alert (Akrapovič) */}
          <div className="p-3.5 rounded bg-surface-container border border-outline-variant hover:border-primary-container/60 transition-all flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-error">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide">
                  Unmapped Fitment Gap
                </span>
              </div>
              <span className="font-mono text-[10px] text-outline">
                {isFitmentResolved ? 'Recovered: +$38k' : 'Missed GMV: ~$38k'}
              </span>
            </div>

            <p className="font-sans text-[12px] text-on-surface leading-relaxed">
              <span className="text-on-surface font-semibold font-mono text-[11px]">
                412 queries
              </span>{' '}
              for{' '}
              <strong className="text-on-surface font-medium">
                2024 Porsche 911 GT3 RS
              </strong>{' '}
              titanium exhaust returned 0 matching catalog fitments. 3 Akrapovič Evolution Line
              SKUs are currently unindexed in intake buffer.
            </p>

            <div className="pt-1">
              {isFitmentResolved ? (
                <div className="w-full py-1.5 px-3 rounded bg-secondary/10 border border-secondary/40 text-secondary font-mono text-[11px] font-semibold flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>3 SKUs Indexed &amp; Mapped to GT3 RS</span>
                </div>
              ) : (
                <button
                  onClick={onMapFitment}
                  className="w-full py-1.5 px-3 rounded bg-surface-container-high border border-outline-variant hover:border-secondary text-secondary hover:bg-surface-container font-mono text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <span>Map 3 Pending Akrapovič SKUs</span>
                  <span className="material-symbols-outlined text-[14px]">link</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Accuracy Footnote */}
      <div className="mt-4 pt-3 border-t border-outline-variant/60 flex items-center justify-between font-mono text-[11px] text-outline">
        <span>Inference Latency: 4.8ms</span>
        <span className="text-secondary font-medium">Auto-Resolving Allowed</span>
      </div>
    </div>
  );
};
