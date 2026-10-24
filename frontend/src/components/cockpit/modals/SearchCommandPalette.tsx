import type { FC } from 'react';
import {  useState, useEffect, useRef } from 'react';
import type { InventoryItem } from '../../types/cockpit';

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onSelectItem: (item: InventoryItem) => void;
  onSelectAction: (actionId: string) => void;
}

export const SearchCommandPalette: FC<SearchCommandPaletteProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    { id: 'generate_po_brembo', title: 'Generate PO from Brembo OEM', icon: 'bolt', badge: 'Action' },
    { id: 'map_akrapovic_skus', title: 'Map 3 Pending Akrapovič SKUs (GT3 RS)', icon: 'link', badge: 'Fitment' },
    { id: 'export_data', title: 'Export ACES/PIES & Revenue Report', icon: 'file_download', badge: 'Export' },
    { id: 'sync_engine', title: 'Sync Fitment Engine Telemetry', icon: 'sync', badge: 'Sync' },
  ];

  const matchedItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.oemRef.toLowerCase().includes(q) ||
      item.compatibility.toLowerCase().includes(q)
    );
  });

  const matchedActions = quickActions.filter((act) => {
    if (!query.trim()) return true;
    return act.title.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded bg-surface-container-high border border-primary/50 shadow-2xl overflow-hidden font-sans flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Search Input Bar */}
        <div className="p-3.5 bg-surface border-b border-outline-variant flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[20px]">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, VIN, OEM Part #, Fitment (e.g. G80, 992, Brembo)..."
            className="flex-1 bg-transparent border-none text-[13px] font-mono text-on-surface outline-none placeholder-outline"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-outline font-mono text-[9px] border border-outline-variant">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {/* Quick Actions */}
          <div className="px-2 py-1 font-mono text-[10px] text-outline font-semibold uppercase tracking-wider">
            Quick Actions
          </div>
          {matchedActions.map((act) => (
            <button
              key={act.id}
              onClick={() => {
                onSelectAction(act.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-surface-container text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  {act.icon}
                </span>
                <span className="text-[12px] text-on-surface group-hover:text-primary transition-colors">
                  {act.title}
                </span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">
                {act.badge}
              </span>
            </button>
          ))}

          {/* Parts / SKUs */}
          <div className="px-2 pt-2 pb-1 font-mono text-[10px] text-outline font-semibold uppercase tracking-wider border-t border-outline-variant/60 mt-1">
            Catalog Inventory &amp; Fitments ({matchedItems.length})
          </div>
          {matchedItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectItem(item);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-surface-container text-left transition-colors cursor-pointer group"
            >
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-on-surface group-hover:text-primary transition-colors">
                  {item.name}
                </span>
                <span className="font-mono text-[10px] text-outline">
                  SKU: {item.sku} • {item.compatibility}
                </span>
              </div>
              <span className="font-mono text-[11px] text-on-surface-variant font-tabular">
                {item.unitsLeft} {item.unitType}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-surface-container border-t border-outline-variant flex items-center justify-between font-mono text-[10px] text-outline">
          <span>Navigate with arrow keys or click</span>
          <span>AUTO UNIVERSE Fast Index</span>
        </div>
      </div>
    </div>
  );
};
