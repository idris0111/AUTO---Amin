import type { FC } from 'react';
import {  useState, useRef, useEffect } from 'react';

interface TopNavBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSearchPalette: () => void;
  onOpenExportModal: () => void;
  lastSyncSecondsAgo: number;
  isLiveTicking: boolean;
  onToggleLiveTicking: () => void;
  selectedDateRange: string;
  onSelectDateRange: (range: string) => void;
  onToggleMobileMenu: () => void;
  notificationsCount: number;
  onOpenNotifications: () => void;
}

export const TopNavBar: FC<TopNavBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSearchPalette,
  onOpenExportModal,
  lastSyncSecondsAgo,
  isLiveTicking,
  onToggleLiveTicking,
  selectedDateRange,
  onSelectDateRange,
  onToggleMobileMenu,
  notificationsCount,
  onOpenNotifications,
}) => {
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  const dateRangeOptions = [
    'Oct 1 – Oct 31 (vs Prior 30D)',
    'Last 7 Days (vs Prior 7D)',
    'Last 90 Days (Q3/Q4 Trajectory)',
    'Year to Date (2024 Performance)',
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 w-full z-40 border-b border-outline-variant bg-surface px-4 lg:px-8 h-14 flex items-center justify-between">
      {/* Left side: Hamburger for mobile + Search & Navigation Links */}
      <div className="flex items-center gap-3 lg:gap-6">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Global Search Bar */}
        <div className="relative w-60 sm:w-72 md:w-80">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              if (window.innerWidth < 640) onOpenSearchPalette();
            }}
            className="w-full h-8 pl-8 pr-12 text-[12px] bg-surface-container-lowest border border-outline-variant rounded focus:border-primary-container focus:ring-0 text-on-surface placeholder-outline font-mono transition-all outline-none"
            placeholder="Search SKU, VIN, OEM Part #, Fitment..."
            type="text"
          />
          <button
            onClick={onOpenSearchPalette}
            title="Open command palette"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-outline font-mono text-[9px] border border-outline-variant cursor-pointer transition-colors"
          >
            ⌘K
          </button>
        </div>

        {/* Top telemetry nav tabs */}
        <nav className="hidden xl:flex items-center gap-5 font-mono text-[11px]">
          <span className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-1.5 cursor-default">
            Live Telemetry
          </span>
          <a
            href="#data-pipeline"
            onClick={(e) => e.preventDefault()}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Data Pipeline
          </a>
          <a
            href="#fitment-index"
            onClick={(e) => e.preventDefault()}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Fitment Index
          </a>
        </nav>
      </div>

      {/* Right side: Actions, Range Selector & Notifications */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Telemetry Status Pill with interactive toggle */}
        <button
          onClick={onToggleLiveTicking}
          title={isLiveTicking ? "Click to pause live telemetry ticker" : "Click to resume live telemetry ticker"}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant hover:border-primary-container/60 transition-colors cursor-pointer"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLiveTicking ? 'bg-secondary animate-pulse' : 'bg-outline'
            }`}
          ></span>
          <span className="font-mono text-[11px] text-on-surface-variant">
            Live Telemetry:{' '}
            <strong className="text-on-surface font-semibold">
              Synced {lastSyncSecondsAgo}s ago
            </strong>
          </span>
        </button>

        {/* Date Range Filter Dropdown */}
        <div className="relative" ref={dateMenuRef}>
          <button
            onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded bg-surface-container border border-outline-variant hover:border-primary hover:text-primary transition-colors text-on-surface cursor-pointer text-[12px]"
          >
            <span className="material-symbols-outlined text-[15px] text-outline">
              calendar_today
            </span>
            <span className="font-mono text-[11px] hidden sm:inline">{selectedDateRange}</span>
            <span className="font-mono text-[11px] sm:hidden">Oct 30D</span>
            <span className="material-symbols-outlined text-[14px] text-outline">
              expand_more
            </span>
          </button>

          {isDateMenuOpen && (
            <div className="absolute right-0 mt-1 w-64 rounded bg-surface-container-high border border-outline-variant shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 font-mono text-[11px]">
              <div className="px-3 py-1.5 text-outline text-[10px] font-semibold uppercase tracking-wider border-b border-outline-variant/60">
                Comparison Window
              </div>
              {dateRangeOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onSelectDateRange(opt);
                    setIsDateMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-surface-container flex items-center justify-between cursor-pointer ${
                    selectedDateRange === opt ? 'text-primary bg-surface-container/50 font-semibold' : 'text-on-surface'
                  }`}
                >
                  <span>{opt}</span>
                  {selectedDateRange === opt && (
                    <span className="material-symbols-outlined text-[14px] text-primary">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Intelligence Primary Button */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary-container text-on-primary-container hover:brightness-110 font-semibold font-mono text-[11px] accent-bloom transition-all cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[15px]">file_download</span>
          <span>Export Data</span>
        </button>

        <div className="h-4 w-[1px] bg-outline-variant mx-0.5 sm:mx-1"></div>

        {/* Trailing Icon Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNotifications}
            className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors relative cursor-pointer"
            title="Notifications & Telemetry Alerts"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {notificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary-container"></span>
            )}
          </button>
          <button
            onClick={() => onSearchChange('GT3')}
            className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Quick Fitment Demo (GT3)"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
          </button>
        </div>
      </div>
    </header>
  );
};
