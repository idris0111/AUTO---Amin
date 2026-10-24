import type { FC } from 'react';
import type { RecentTelemetryEvent } from '../../types/cockpit';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: RecentTelemetryEvent[];
  onClear: () => void;
}

export const NotificationsDrawer: FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  events,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm h-full bg-surface-container-high border-l border-outline-variant shadow-2xl flex flex-col font-sans"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              notifications
            </span>
            <div>
              <h3 className="font-semibold text-on-surface text-[15px]">
                Live Telemetry Log
              </h3>
              <span className="font-mono text-[10px] text-outline">
                Real-Time Event Stream
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

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {events.length === 0 ? (
            <div className="py-12 text-center text-outline font-mono text-[11px]">
              No unread telemetry notifications.
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded bg-surface border border-outline-variant/80 flex flex-col gap-1 text-[12px]"
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-outline">{ev.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-semibold uppercase ${
                      ev.type === 'po'
                        ? 'text-primary bg-primary/10'
                        : ev.type === 'order'
                        ? 'text-secondary bg-secondary/10'
                        : 'text-tertiary bg-tertiary/10'
                    }`}
                  >
                    {ev.type}
                  </span>
                </div>
                <div className="text-on-surface font-medium">{ev.text}</div>
                {ev.amount && (
                  <div className="font-mono text-[11px] text-secondary font-bold font-tabular">
                    +${ev.amount.toFixed(2)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-container border-t border-outline-variant flex items-center justify-between">
          <button
            onClick={onClear}
            className="px-3 py-1 rounded bg-surface border border-outline-variant hover:border-outline text-outline hover:text-on-surface font-mono text-[11px] transition-colors cursor-pointer"
          >
            Clear Log
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-primary-container text-on-primary-container font-mono text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
