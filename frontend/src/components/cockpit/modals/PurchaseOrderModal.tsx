import type { FC } from 'react';
import {  useState } from 'react';
import type { InventoryItem } from '../../types/cockpit';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem?: InventoryItem | null;
  onSubmitPo: (poData: {
    item: InventoryItem;
    quantity: number;
    totalCost: number;
    warehouse: string;
    priority: string;
  }) => void;
}

export const PurchaseOrderModal: FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  onSubmitPo,
}) => {
  const [quantity, setQuantity] = useState<number>(20);
  const [warehouse, setWarehouse] = useState<string>('Ontario Logistics Hub (ONT-01)');
  const [priority, setPriority] = useState<string>('Expedited Air Freight (48h)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !targetItem) return null;

  const unitCost = targetItem.unitCost || 1420;
  const totalCost = unitCost * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitPo({
        item: targetItem,
        quantity,
        totalCost,
        warehouse,
        priority,
      });
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded bg-surface-container-high border border-primary/40 shadow-2xl overflow-hidden font-sans flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              shopping_cart_checkout
            </span>
            <div>
              <h3 className="font-semibold text-on-surface text-[15px]">
                Generate OEM Purchase Order
              </h3>
              <span className="font-mono text-[10px] text-outline">
                Direct Tier-1 EDI Replenishment Pipeline
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-[12px]">
          {/* Target Part Card */}
          <div className="p-3 rounded bg-surface border border-outline-variant flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-outline uppercase font-semibold">
                Target SKU &amp; Supplier
              </span>
              <span className="font-mono text-[10px] text-tertiary px-1.5 py-0.5 rounded bg-tertiary/10 border border-tertiary/30">
                {targetItem.status}
              </span>
            </div>
            <div className="font-semibold text-on-surface text-[14px]">
              {targetItem.name}
            </div>
            <div className="font-mono text-[11px] text-outline flex flex-wrap gap-x-3">
              <span>SKU: <strong className="text-on-surface">{targetItem.sku}</strong></span>
              <span>OEM Ref: <strong className="text-on-surface">{targetItem.oemRef}</strong></span>
              <span>Fitment: <strong className="text-primary">{targetItem.compatibility}</strong></span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-secondary">
              Supplier: {targetItem.supplier} (Contract #EDI-850-9941)
            </div>
          </div>

          {/* Quantity selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-outline font-semibold">
              Replenishment Quantity (Units)
            </label>
            <div className="flex items-center gap-2">
              {[10, 20, 50, 100].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setQuantity(preset)}
                  className={`px-3 py-1 rounded font-mono text-[11px] border cursor-pointer transition-colors ${
                    quantity === preset
                      ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                      : 'bg-surface border-outline-variant text-on-surface hover:border-primary'
                  }`}
                >
                  {preset} units
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 bg-surface border border-outline-variant rounded font-mono text-[11px] text-on-surface text-center outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Pricing Ledger */}
          <div className="p-2.5 rounded bg-surface border border-outline-variant grid grid-cols-3 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-outline text-[10px] block">Unit Wholesale</span>
              <span className="text-on-surface font-semibold font-tabular">
                ${unitCost.toLocaleString()}.00
              </span>
            </div>
            <div>
              <span className="text-outline text-[10px] block">Retail Margin</span>
              <span className="text-secondary font-semibold font-tabular">
                +37.7%
              </span>
            </div>
            <div>
              <span className="text-outline text-[10px] block">Total PO Value</span>
              <span className="text-primary font-bold text-[13px] font-tabular">
                ${totalCost.toLocaleString()}.00
              </span>
            </div>
          </div>

          {/* Logistics Routing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-outline font-semibold">
                Destination Warehouse
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="px-2 py-1.5 rounded bg-surface border border-outline-variant text-[11px] font-mono text-on-surface outline-none focus:border-primary"
              >
                <option>Ontario Logistics Hub (ONT-01)</option>
                <option>Carson Performance Depot (LAX-03)</option>
                <option>Frankfurt European Depot (FRA-02)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-outline font-semibold">
                Freight Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="px-2 py-1.5 rounded bg-surface border border-outline-variant text-[11px] font-mono text-on-surface outline-none focus:border-primary"
              >
                <option>Expedited Air Freight (48h)</option>
                <option>Standard OEM Ground (5-7d)</option>
                <option>Direct Drop-Ship Channel</option>
              </select>
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
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded bg-primary-container text-on-primary-container font-semibold font-mono text-[11px] accent-bloom hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[14px] animate-spin">
                    progress_activity
                  </span>
                  <span>Transmitting EDI 850...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  <span>Dispatch PO to Brembo OEM</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
