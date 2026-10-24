import type { FC } from 'react';
import {  useState } from 'react';
import type { InventoryItem } from '../../types/cockpit';

interface FullInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onOpenPoModal: (item: InventoryItem) => void;
}

export const FullInventoryModal: FC<FullInventoryModalProps> = ({
  isOpen,
  onClose,
  items,
  onOpenPoModal,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'LOW STOCK' | 'REORDER QUEUED'>('ALL');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = items.filter((item) => {
    if (filter !== 'ALL' && item.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.compatibility.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded bg-surface-container-high border border-outline-variant shadow-2xl flex flex-col font-sans overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">
              inventory_2
            </span>
            <div>
              <h3 className="font-semibold text-on-surface text-[16px]">
                Full Enterprise Inventory &amp; Depletion Monitor
              </h3>
              <span className="font-mono text-[11px] text-outline">
                22 Active Tier-1 Performance Parts • Real-Time ACES Stock Matrix
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-surface-container-low border-b border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tab filter buttons */}
          <div className="flex items-center bg-surface-container p-0.5 rounded border border-outline-variant w-full sm:w-auto overflow-x-auto">
            {(['ALL', 'CRITICAL', 'LOW STOCK', 'REORDER QUEUED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                  filter === tab
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab === 'ALL' ? 'All Items' : tab}
              </button>
            ))}
          </div>

          {/* Quick search input */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[14px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parts, chassis, SKU..."
              className="w-full pl-8 pr-3 py-1 bg-surface border border-outline-variant rounded font-mono text-[11px] text-on-surface outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface font-mono text-[10px] text-outline">
                <th className="py-2.5 px-3 font-semibold">PART &amp; OEM REF</th>
                <th className="py-2.5 px-3 font-semibold">COMPATIBILITY</th>
                <th className="py-2.5 px-3 font-semibold text-right">STOCK / THRESHOLD</th>
                <th className="py-2.5 px-3 font-semibold text-right">VELOCITY</th>
                <th className="py-2.5 px-3 font-semibold text-right">STATUS</th>
                <th className="py-2.5 px-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-[12px]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-on-surface">{item.name}</span>
                      <span className="font-mono text-[10px] text-outline">
                        SKU: {item.sku} • OEM: {item.oemRef}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded font-mono text-[10px] bg-tertiary-container/10 border border-tertiary-container text-tertiary">
                      {item.compatibility}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[11px] font-tabular">
                    <span
                      className={`font-bold ${
                        item.unitsLeft <= 2
                          ? 'text-error'
                          : item.unitsLeft <= 5
                          ? 'text-tertiary'
                          : 'text-primary'
                      }`}
                    >
                      {item.unitsLeft} {item.unitType}
                    </span>
                    <span className="text-outline"> / {item.threshold}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[11px] text-on-surface font-tabular">
                    {item.velocity.toFixed(1)} u/wk
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[10px]">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold ${
                        item.status === 'CRITICAL'
                          ? 'bg-error/10 border border-error/40 text-error'
                          : item.status === 'LOW STOCK'
                          ? 'bg-tertiary/10 border border-tertiary/40 text-tertiary'
                          : 'bg-primary/10 border border-primary/40 text-primary'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenPoModal(item)}
                      className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant hover:border-primary text-primary font-mono text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Create PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-surface-container border-t border-outline-variant flex items-center justify-between font-mono text-[11px] text-outline">
          <span>Showing {filtered.length} of {items.length} parts</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-surface border border-outline-variant hover:border-primary text-on-surface font-mono text-[11px] transition-colors cursor-pointer"
          >
            Close Monitor
          </button>
        </div>
      </div>
    </div>
  );
};
