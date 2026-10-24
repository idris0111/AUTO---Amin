export type MetricType = 'Gross Revenue' | 'Net Sales' | 'Orders' | 'AOV';

export type ProjectionScenario = 'conservative' | 'baseline' | 'aggressive';

export type InventoryStatus = 'CRITICAL' | 'REORDER QUEUED' | 'LOW STOCK' | 'OPTIMAL';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  oemRef: string;
  compatibility: string;
  compatibilityType: 'chassis' | 'universal' | 'specialty';
  unitsLeft: number;
  threshold: number;
  velocity: number; // units/week
  unitType: 'units' | 'sets';
  status: InventoryStatus;
  unitCost: number;
  retailPrice: number;
  supplier: string;
}

export interface CategoryShare {
  id: string;
  name: string;
  revenue: number;
  yoyChange: number; // e.g. +18.4
  percentageOfGross: number; // e.g. 26.1
  unitsShipped: number;
  color: string;
  widthPercentage: number;
}

export interface TrajectoryPoint {
  label: string;
  grossRevenue: number;
  netSales: number;
  orders: number;
  aov: number;
  benchmark: number;
  isPeak?: boolean;
  peakLabel?: string;
}

export interface AiSignal {
  id: string;
  type: 'demand_surge' | 'fitment_gap';
  title: string;
  subtitle: string;
  meta: string;
  description: string;
  buttonLabel: string;
  actionId: 'generate_po_brembo' | 'map_akrapovic_skus';
  resolved?: boolean;
}

export interface TelemetryState {
  netRevenue: number;
  grossBilled: number;
  refundsDiscounts: number;
  revenueYoY: number;
  prior30DayRevenue: number;
  totalOrders: number;
  ordersYoY: number;
  avgFulfillmentDays: number;
  aov: number;
  aovYoY: number;
  driverCategory: string;
  conversionRate: number;
  conversionDelta: number;
  fitmentSearchConversion: number;
  inventoryHealthScore: number;
  lowStockCount: number;
  stockoutCount: number;
  catalogFitmentIndex: number;
  autonomousPricingActive: boolean;
  pricingLatencyMs: number;
  lastSyncSecondsAgo: number;
  isLiveTicking: boolean;
}

export interface RecentTelemetryEvent {
  id: string;
  timestamp: string;
  type: 'order' | 'pricing' | 'sync' | 'po';
  text: string;
  amount?: number;
}
