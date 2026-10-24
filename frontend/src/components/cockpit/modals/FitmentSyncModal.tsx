import type { FC } from 'react';
import {  useState, useEffect } from 'react';

interface FitmentSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export const FitmentSyncModal: FC<FitmentSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const steps = [
    { title: 'Connecting to ACES/PIES Global Pipeline', desc: 'Validating cryptographic handshake TLS 1.3' },
    { title: 'Reconciling Tier-1 OEM Catalogs', desc: 'Pulling 28,490 SKU fitment manifests from Brembo, Garrett, KW, Akrapovič' },
    { title: 'Calibrating Autonomous Pricing Engine', desc: 'Re-indexing latency parameters (Target: <12ms SLA)' },
    { title: 'Synchronization Complete', desc: 'Fitment Database v4.19 nominal across all 6 sectors' },
  ];

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep(0);
      setIsFinished(false);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsFinished(true);
          return 100;
        }
        const next = prev + 10;
        if (next >= 75) setCurrentStep(3);
        else if (next >= 50) setCurrentStep(2);
        else if (next >= 25) setCurrentStep(1);
        return next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded bg-surface-container-high border border-primary/40 shadow-2xl overflow-hidden font-sans flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px] animate-spin">
              sync
            </span>
            <div>
              <h3 className="font-semibold text-on-surface text-[15px]">
                Fitment Engine Synchronization
              </h3>
              <span className="font-mono text-[10px] text-outline">
                ACES / PIES v4.19 Protocol Handshake
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

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-[12px]">
          {/* Progress Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-on-surface font-semibold">{steps[currentStep].title}</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-surface rounded overflow-hidden">
              <div
                className="h-full bg-primary-container rounded transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="font-mono text-[10px] text-outline">
              {steps[currentStep].desc}
            </span>
          </div>

          {/* Stepper details */}
          <div className="p-3 rounded bg-surface border border-outline-variant flex flex-col gap-2 font-mono text-[10px]">
            {steps.slice(0, 3).map((st, i) => {
              const done = progress >= (i + 1) * 33;
              const active = !done && progress >= i * 33;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        done ? 'bg-secondary' : active ? 'bg-primary animate-ping' : 'bg-outline'
                      }`}
                    ></span>
                    <span className={done ? 'text-on-surface' : active ? 'text-primary' : 'text-outline'}>
                      {st.title}
                    </span>
                  </div>
                  <span className={done ? 'text-secondary font-semibold' : 'text-outline'}>
                    {done ? 'VERIFIED' : active ? 'RUNNING...' : 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Close / Action */}
          <div className="mt-1 pt-3 border-t border-outline-variant flex items-center justify-end">
            <button
              onClick={() => {
                onSyncComplete();
                onClose();
              }}
              disabled={!isFinished}
              className="px-4 py-1.5 rounded bg-primary-container text-on-primary-container font-semibold font-mono text-[11px] accent-bloom hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              <span>{isFinished ? 'Complete & Apply' : 'Synchronizing...'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
