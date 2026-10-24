import type { FC } from 'react';

interface SideNavBarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenSyncModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const SideNavBar: FC<SideNavBarProps> = ({
  activeView,
  onSelectView,
  onOpenSyncModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navSections = [
    {
      group: 'Commerce',
      items: [
        { id: 'commerce_intelligence', label: 'Commerce Intelligence', icon: 'analytics' },
        { id: 'sales_analytics', label: 'Sales Analytics', icon: 'query_stats' },
        { id: 'operations', label: 'Operations', icon: 'inventory_2' },
        { id: 'customers', label: 'Customers', icon: 'group' },
      ],
    },
    {
      group: 'Catalog & Fitment',
      items: [
        { id: 'catalog_fitment', label: 'Catalog & Fitment', icon: 'directions_car' },
        { id: 'telemetry_analytics', label: 'Telemetry Analytics', icon: 'speed' },
        { id: 'vehicle_compatibility', label: 'Vehicle Compatibility', icon: 'hub' },
      ],
    },
    {
      group: 'Machine Intelligence',
      items: [
        { id: 'machine_intelligence', label: 'Machine Intelligence', icon: 'psychology' },
        { id: 'demand_forecast', label: 'Demand Forecast', icon: 'trending_up' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-60 border-r border-outline-variant bg-surface z-50 flex flex-col justify-between py-4 px-3 select-none transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Brand Header */}
          <div className="px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center font-mono font-bold tracking-tight accent-bloom"
                title="AUTO UNIVERSE Engine Monogram Logo"
              >
                AU
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-bold tracking-tight text-on-surface text-[15px] leading-none">
                  AUTO UNIVERSE
                </span>
                <span className="font-mono text-[10px] text-outline mt-1 leading-none uppercase tracking-wider">
                  OEM Commerce Engine
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-outline hover:text-on-surface rounded"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Fitment Engine CTA Button */}
          <div className="px-1 mt-1">
            <button
              onClick={onOpenSyncModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-surface-container-low border border-outline-variant text-primary hover:border-primary-container hover:bg-surface-container active:scale-[0.98] transition-all duration-150 font-mono text-[12px] font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary text-[16px] animate-spin-hover">
                sync
              </span>
              Sync Fitment Engine
            </button>
          </div>

          {/* Grouped Nav Sections */}
          <nav className="mt-2 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
            {navSections.map((section) => (
              <div key={section.group}>
                <span className="px-2 font-mono text-[10px] text-outline font-semibold tracking-wider uppercase block mb-1">
                  {section.group}
                </span>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectView(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-[12px] text-left transition-colors duration-150 cursor-pointer ${
                          isActive
                            ? 'text-primary border-l-2 border-primary bg-surface-container font-medium'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-normal'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom: System & Admin Center Profile */}
        <div className="pt-3 border-t border-outline-variant flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onSelectView('admin_center')}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-[12px] transition-colors duration-150 text-left w-full cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span className="font-mono text-[12px]">Admin Center</span>
            </button>
            <button
              onClick={() => onSelectView('system_diagnostics')}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-[12px] transition-colors duration-150 text-left w-full cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">terminal</span>
              <span className="font-mono text-[12px]">System Diagnostics</span>
            </button>
            <button
              onClick={() => onSelectView('settings')}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-[12px] transition-colors duration-150 text-left w-full cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span className="font-mono text-[12px]">Settings</span>
            </button>
          </div>

          {/* Chief Systems Architect Administrator Chip */}
          <div className="mt-1 p-2 rounded bg-surface-container-lowest border border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="w-7 h-7 rounded-full bg-surface-container-high border border-primary-container text-primary flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
                title="Chief Systems Architect Administrator Avatar"
              >
                CSA
              </div>
              <div className="flex flex-col truncate">
                <span className="font-sans font-semibold text-on-surface truncate leading-tight text-[12px]">
                  Alexandre Vance
                </span>
                <span className="font-mono text-[9px] text-outline truncate">
                  Chief Systems Architect
                </span>
              </div>
            </div>
            <span
              className="w-2 h-2 rounded-full bg-secondary accent-bloom shrink-0"
              title="Operational Telemetry Online"
            ></span>
          </div>
        </div>
      </aside>
    </>
  );
};
