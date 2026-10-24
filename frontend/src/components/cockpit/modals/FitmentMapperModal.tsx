import type { FC } from 'react';
import {  useState } from 'react';

interface FitmentMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitFitment: (result: {
    skusCount: number;
    recoveredGmv: number;
    newFitmentIndex: number;
  }) => void;
}

export const FitmentMapperModal: FC<FitmentMapperModalProps> = ({
  isOpen,
  onClose,
  onCommitFitment,
}) => {
  const [selectedSkus, setSelectedSkus] = useState<string[]>([
    'AKR-S-PO992GT3',
    'AKR-E-PO992GT3',
    'AKR-TP-PO992GT3',
  ]);
  const [isCommitting, setIsCommitting] = useState(false);

  if (!isOpen) return null;

  const pendingSkus = [
    {
      sku: 'AKR-S-PO992GT3',
      name: 'Akrapovič Titanium Slip-On Race System',
      oem: 'M-PO/T/1H',
      price: '$7,950.00',
      category: 'Exhaust & Emission Systems (ACES 104)',
    },
    {
      sku: 'AKR-E-PO992GT3',
      name: 'Akrapovič Titanium Evolution Header & Link Pipe',
      oem: 'E-PO/T/7',
      price: '$5,420.00',
      category: 'Exhaust Manifolds & Catalysts (ACES 109)',
    },
    {
      sku: 'AKR-TP-PO992GT3',
      name: 'Akrapovič Matte Carbon Dual Tailpipe Set',
      oem: 'TP-CT/49',
      price: '$1,850.00',
      category: 'Tailpipes & Aesthetic Trims (ACES 112)',
    },
  ];

  const toggleSku = (sku: string) => {
    if (selectedSkus.includes(sku)) {
      setSelectedSkus(selectedSkus.filter((s) => s !== sku));
    } else {
      setSelectedSkus([...selectedSkus, sku]);
    }
  };

  const handleCommit = () => {
    setIsCommitting(true);
    setTimeout(() => {
      onCommitFitment({
        skusCount: selectedSkus.length,
        recoveredGmv: 38400,
        newFitmentIndex: 99.1,
      });
      setIsCommitting(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded bg-surface-container-high border border-secondary/40 shadow-2xl overflow-hidden font-sans flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              hub
            </span>
            <div>
              <h3 className="font-semibold text-on-surface text-[15px]">
                ACES/PIES Vehicle Fitment Mapper
              </h3>
              <span className="font-mono text-[10px] text-outline">
                Automated Catalog Reconciliation Engine v4.19
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4 text-[12px]">
          {/* Target Vehicle Definition Card */}
          <div className="p-3.5 rounded bg-surface border border-outline-variant flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-outline uppercase font-semibold">
                Target Vehicle Chassis &amp; Powertrain
              </span>
              <span className="font-mono text-[10px] text-secondary font-bold px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/30">
                412 Unindexed Queries
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-bold text-on-surface text-[15px]">
                2024 Porsche 911 GT3 RS
              </span>
              <span className="font-mono text-[11px] text-primary">Chassis: 992.1</span>
            </div>
            <div className="font-mono text-[11px] text-outline grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/60">
              <div>
                Engine:{' '}
                <strong className="text-on-surface">4.0L NA Flat-6 (518 HP)</strong>
              </div>
              <div>
                Transmission:{' '}
                <strong className="text-on-surface">7-Speed Dual-Clutch (PDK)</strong>
              </div>
            </div>
          </div>

          {/* Pending SKUs to Map */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-outline font-semibold">
                Intake Buffer SKUs to Commit ({selectedSkus.length} of {pendingSkus.length} Selected)
              </span>
              <span className="font-mono text-[10px] text-secondary">
                Est. Recovered GMV: +$38,400
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {pendingSkus.map((item) => {
                const isChecked = selectedSkus.includes(item.sku);
                return (
                  <div
                    key={item.sku}
                    onClick={() => toggleSku(item.sku)}
                    className={`p-2.5 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-surface border-secondary/50 shadow-xs'
                        : 'bg-surface/50 border-outline-variant opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-outline text-secondary focus:ring-0"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface text-[12px]">
                          {item.name}
                        </span>
                        <span className="font-mono text-[10px] text-outline">
                          SKU: {item.sku} • OEM: {item.oem}
                        </span>
                        <span className="font-mono text-[9px] text-primary/80 mt-0.5">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-on-surface shrink-0">
                      {item.price}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACES Validation Checklist */}
          <div className="p-3 rounded bg-surface border border-outline-variant/80 font-mono text-[10px] flex items-center justify-between text-outline">
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>ACES Attribute Schema v4.19 Passed</span>
            </div>
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>CARB Executive Order Verified</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-2 pt-3 border-t border-outline-variant flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-surface border border-outline-variant text-on-surface-variant hover:text-on-surface font-mono text-[11px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={selectedSkus.length === 0 || isCommitting}
              className="px-4 py-1.5 rounded bg-secondary text-on-secondary font-semibold font-mono text-[11px] accent-bloom-green hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCommitting ? (
                <>
                  <span className="material-symbols-outlined text-[14px] animate-spin">
                    progress_activity
                  </span>
                  <span>Writing to ACES Database...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  <span>Index &amp; Commit 3 SKUs to Active Catalog</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
