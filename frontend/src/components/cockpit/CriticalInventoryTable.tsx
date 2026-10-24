import type { FC } from 'react';
import type { InventoryItem } from '../types/cockpit';

interface CriticalInventoryTableProps {
  items: InventoryItem[];
  filterLowStockOnly: boolean;
  onToggleFilter: () => void;
  onOpenFullMonitor: () => void;
  onQuickReorder: (item: InventoryItem) => void;
  searchFilter: string;
}

export const CriticalInventoryTable: FC<CriticalInventoryTableProps> = ({
  items,
  filterLowStockOnly,
  onToggleFilter,
  onOpenFullMonitor,
  onQuickReorder,
  searchFilter,
}) => {
  // Filter items based on low stock toggle and search query
  const filteredItems = items.filter((item) => {
    if (filterLowStockOnly && item.status !== 'CRITICAL' && item.status !== 'LOW STOCK') {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchOem = item.oemRef.toLowerCase().includes(q);
      const matchCompat = item.compatibility.toLowerCase().includes(q);
      return matchName || matchSku || matchOem || matchCompat;
    }
    return true;
  });

  const displayItems = filteredItems.slice(0, 5);

  const getStatusBadge = (status: InventoryItem['status']) => {
    switch (status) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] bg-error/10 border border-error/40 text-error font-semibold">
            <span className="w-1 h-1 rounded-full bg-error"></span>
            CRITICAL
          </span>
        );
      case 'REORDER QUEUED':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] bg-primary/10 border border-primary/40 text-primary font-semibold">
            <span className="material-symbols-outlined text-[10px]">sync</span>
            REORDER QUEUED
          </span>
        );
      case 'LOW STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] bg-tertiary/10 border border-tertiary/40 text-tertiary font-semibold">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            LOW STOCK
          </span>
        );
      case 'OPTIMAL':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] bg-secondary/10 border border-secondary/40 text-secondary font-semibold">
            <span className="w-1 h-1 rounded-full bg-secondary"></span>
            OPTIMAL
          </span>
        );
    }
  };

  const getCompatibilityStyle = (type: InventoryItem['compatibilityType']) => {
    if (type === 'universal') {
      return 'bg-secondary/10 border-secondary text-secondary';
    }
    return 'bg-tertiary-container/10 border-tertiary-container text-tertiary';
  };

  return (
    <div className="lg:col-span-7 rounded bg-surface-container-low border border-outline-variant p-5 flex flex-col justify-between">
      <div>
        {/* Header with Table Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[20px]">
              emergency_home
            </span>
            <div>
              <h3 className="font-sans font-semibold text-on-surface text-[15px]">
                Critical Velocity &amp; Inventory Priority
              </h3>
              <span className="font-mono text-[10px] text-outline">
                Real-time depletion alerts &amp; OEM replenishment buffer
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFilter}
              className={`px-2.5 py-1 rounded border font-mono text-[11px] transition-colors cursor-pointer ${
                filterLowStockOnly
                  ? 'bg-error/15 border-error text-error font-semibold'
                  : 'bg-surface-container border-outline-variant text-on-surface hover:border-primary'
              }`}
            >
              {filterLowStockOnly ? 'Showing Critical/Low Only' : 'Filter Low Stock'}
            </button>
          </div>
        </div>

        {/* High-Density Workbench Data Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface font-mono text-[10px] text-outline">
                <th className="py-2 px-2.5 font-semibold">PART NAME &amp; OEM REF</th>
                <th className="py-2 px-2 font-semibold">COMPATIBILITY</th>
                <th className="py-2 px-2 font-semibold text-right">LEFT / THRESHOLD</th>
                <th className="py-2 px-2 font-semibold text-right">VELOCITY</th>
                <th className="py-2 px-2.5 font-semibold text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-[12px]">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-outline font-mono text-[12px]">
                    No inventory records match current filter parameters.
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onQuickReorder(item)}
                    className="hover:bg-surface-container transition-colors group cursor-pointer"
                    title="Click to view details or generate PO"
                  >
                    <td className="py-2.5 px-2.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface group-hover:text-primary transition-colors">
                          {item.name}
                        </span>
                        <span className="font-mono text-[10px] text-outline">
                          SKU: {item.sku} • OEM: {item.oemRef}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded font-mono text-[10px] border ${getCompatibilityStyle(
                          item.compatibilityType
                        )}`}
                      >
                        {item.compatibility}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[11px] font-tabular">
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
                    <td className="py-2.5 px-2 text-right font-mono text-[11px] text-on-surface font-tabular">
                      {item.velocity.toFixed(1)} u/wk
                    </td>
                    <td className="py-2.5 px-2.5 text-right">{getStatusBadge(item.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Bottom Controls */}
      <div className="mt-3 pt-3 border-t border-outline-variant/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px]">
        <span className="font-mono text-[10px] text-outline">
          Showing {displayItems.length} of {items.length} priority items
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFullMonitor}
            className="px-2.5 py-1 rounded bg-surface-container text-primary hover:bg-surface-container-high border border-outline-variant font-mono text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Open Full Inventory Monitor</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </button>
        </div>
      </div>
    </div>
  );
};
