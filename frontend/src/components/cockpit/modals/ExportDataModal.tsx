import type { FC } from 'react';
import {  useState } from 'react';
import type { TelemetryState, InventoryItem, CategoryShare } from '../../types/cockpit';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryState;
  inventory: InventoryItem[];
  categories: CategoryShare[];
}

export const ExportDataModal: FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  inventory,
  categories,
}) => {
  const [format, setFormat] = useState<'json' | 'csv' | 'xml'>('json');
  const [includeRevenue, setIncludeRevenue] = useState(true);
  const [includeInventory, setIncludeInventory] = useState(true);
  const [includeCategories, setIncludeCategories] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);

    setTimeout(() => {
      let content = '';
      let mimeType = 'application/json';
      let extension = 'json';

      if (format === 'json') {
        const payload = {
          exportTimestamp: new Date().toISOString(),
          system: 'AUTO UNIVERSE OEM Commerce Engine v4.19',
          securityProtocol: 'TLS 1.3',
          telemetry: includeRevenue ? telemetry : undefined,
          categories: includeCategories ? categories : undefined,
          inventory: includeInventory ? inventory : undefined,
        };
        content = JSON.stringify(payload, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else if (format === 'csv') {
        // Generate CSV rows
        const rows: string[] = ['"AUTO UNIVERSE Executive Export - Oct 2024"'];
        rows.push('');
        if (includeRevenue) {
          rows.push('"METRIC","VALUE","BENCHMARK"');
          rows.push(`"Net Revenue","$${telemetry.netRevenue.toFixed(2)}","$${telemetry.prior30DayRevenue.toFixed(2)}"`);
          rows.push(`"Gross Billed","$${telemetry.grossBilled.toFixed(2)}",""`);
          rows.push(`"Refunds & Discs","$${telemetry.refundsDiscounts.toFixed(2)}",""`);
          rows.push(`"Total Orders","${telemetry.totalOrders}",""`);
          rows.push(`"Conversion Rate","${telemetry.conversionRate}%",""`);
          rows.push('');
        }
        if (includeInventory) {
          rows.push('"PART NAME","SKU","OEM REF","COMPATIBILITY","UNITS LEFT","THRESHOLD","VELOCITY","STATUS"');
          inventory.forEach((item) => {
            rows.push(
              `"${item.name}","${item.sku}","${item.oemRef}","${item.compatibility}","${item.unitsLeft}","${item.threshold}","${item.velocity}","${item.status}"`
            );
          });
        }
        content = rows.join('\n');
        mimeType = 'text/csv';
        extension = 'csv';
      } else if (format === 'xml') {
        content = `<?xml version="1.0" encoding="UTF-8"?>
<ACES_PIES_Export version="4.19" generated="${new Date().toISOString()}">
  <Header>
    <Company>AUTO UNIVERSE OEM</Company>
    <FitmentIndex>${telemetry.catalogFitmentIndex}%</FitmentIndex>
  </Header>
  <InventoryCatalog>
${inventory
  .map(
    (i) => `    <Part sku="${i.sku}" oem="${i.oemRef}" status="${i.status}">
      <Description>${i.name}</Description>
      <Compatibility>${i.compatibility}</Compatibility>
      <AvailableStock>${i.unitsLeft}</AvailableStock>
    </Part>`
  )
  .join('\n')}
  </InventoryCatalog>
</ACES_PIES_Export>`;
        mimeType = 'application/xml';
        extension = 'xml';
      }

      // Trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auto_universe_telemetry_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded bg-surface-container-high border border-primary/40 shadow-2xl overflow-hidden font-sans flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              file_download
            </span>
            <div>
              <h3 className="font-semibold text-on-surface text-[15px]">
                Export Intelligence Dataset
              </h3>
              <span className="font-mono text-[10px] text-outline">
                ACES/PIES &amp; Executive Telemetry Report
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

        {/* Form */}
        <div className="p-5 flex flex-col gap-4 text-[12px]">
          {/* Format selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-outline uppercase font-semibold">
              Select Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'json', label: 'JSON Telemetry', sub: 'Machine Ingestion' },
                { id: 'csv', label: 'CSV Spreadsheet', sub: 'Excel / Ledger' },
                { id: 'xml', label: 'ACES XML 4.19', sub: 'Automotive EDI' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id as any)}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                    format === fmt.id
                      ? 'bg-primary-container text-on-primary-container border-primary font-semibold'
                      : 'bg-surface border-outline-variant text-on-surface hover:border-primary'
                  }`}
                >
                  <div className="font-mono text-[11px]">{fmt.label}</div>
                  <div
                    className={`font-mono text-[9px] ${
                      format === fmt.id ? 'text-on-primary-container/80' : 'text-outline'
                    }`}
                  >
                    {fmt.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scope checkboxes */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] text-outline uppercase font-semibold">
              Included Dataset Domains
            </label>
            <div className="p-3 rounded bg-surface border border-outline-variant flex flex-col gap-2 font-mono text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRevenue}
                  onChange={(e) => setIncludeRevenue(e.target.checked)}
                  className="rounded border-outline text-primary focus:ring-0"
                />
                <span className="text-on-surface">Revenue &amp; Velocity KPIs ($1.84M)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInventory}
                  onChange={(e) => setIncludeInventory(e.target.checked)}
                  className="rounded border-outline text-primary focus:ring-0"
                />
                <span className="text-on-surface">Critical Velocity &amp; Inventory Priority</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCategories}
                  onChange={(e) => setIncludeCategories(e.target.checked)}
                  className="rounded border-outline text-primary focus:ring-0"
                />
                <span className="text-on-surface">6 Core Category Performance Shares</span>
              </label>
            </div>
          </div>

          {/* Project ZIP Archive Direct Download */}
          <div className="p-3 rounded bg-surface border border-secondary/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                folder_zip
              </span>
              <div className="flex flex-col">
                <span className="font-semibold text-on-surface text-[12px]">
                  Full Project Source Archive
                </span>
                <span className="font-mono text-[10px] text-outline">
                  auto-universe-project.zip (~860 KB)
                </span>
              </div>
            </div>
            <a
              href="/auto-universe-project.zip"
              download="auto-universe-project.zip"
              className="px-3 py-1.5 rounded bg-secondary text-on-secondary font-mono text-[11px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              <span>Download ZIP</span>
            </a>
          </div>

          {/* Action buttons */}
          <div className="mt-1 pt-3 border-t border-outline-variant flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-surface border border-outline-variant text-on-surface-variant hover:text-on-surface font-mono text-[11px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || (!includeRevenue && !includeInventory && !includeCategories)}
              className="px-4 py-1.5 rounded bg-primary-container text-on-primary-container font-semibold font-mono text-[11px] accent-bloom hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <span className="material-symbols-outlined text-[14px] animate-spin">
                    progress_activity
                  </span>
                  <span>Packaging Archive...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Download File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
