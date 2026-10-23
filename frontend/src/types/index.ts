export interface Category {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  image_url: string | null
  position: number
  is_active: boolean
  children: Category[]
}

export interface Brand {
  id: string
  name: string
  slug: string
  country: string | null
  logo_url: string | null
  description: string | null
  is_active: boolean
}

export interface ProductImage {
  id: string
  url: string
  alt: string | null
  position: number
  is_primary: boolean
}

export interface ProductSpecification {
  id: string
  name: string
  value: string
  unit: string | null
  position: number
}

export interface OEMNumber {
  id: string
  number: string
  manufacturer: string | null
}

export interface CrossReference {
  id: string
  number: string
  brand_name: string | null
  note: string | null
}

export interface ProductBrief {
  id: string
  name: string
  slug: string
  sku: string
  price: string
  old_price: string | null
  stock_quantity: number
  rating_avg: string
  rating_count: number
  brand: { id: string; name: string; slug: string; logo_url: string | null }
  category: { id: string; name: string; slug: string }
  image_url: string | null
  fitment: string | null
}

export interface ProductDetail extends Omit<ProductBrief, 'image_url'> {
  status: string
  description: string | null
  short_description: string | null
  warranty_months: number | null
  weight_kg: string | null
  country_of_origin: string | null
  created_at: string
  updated_at: string
  images: ProductImage[]
  specifications: ProductSpecification[]
  oem_numbers: OEMNumber[]
  cross_references: CrossReference[]
  fitment: string | null
}

export interface PaginatedProducts {
  items: ProductBrief[]
  total: number
  offset: number
  limit: number
}

export interface VehicleEngine {
  id: string
  name: string
  displacement_l: string | null
  power_hp: number | null
  fuel_type: string | null
}

export interface VehicleModification {
  id: string
  name: string
  year_from: number | null
  year_to: number | null
  engines: VehicleEngine[]
}

export interface VehicleGeneration {
  id: string
  name: string
  body_code: string | null
  year_from: number | null
  year_to: number | null
  modifications: VehicleModification[]
}

export interface VehicleModel {
  id: string
  name: string
  slug: string
  category: string | null
  generations: VehicleGeneration[]
}

export interface VehicleMake {
  id: string
  name: string
  slug: string
  country: string | null
  logo_url: string | null
  models: VehicleModel[]
}

export interface UserVehicle {
  id: string
  name: string
  make_id: string
  model_id: string | null
  generation_id: string | null
  modification_id: string | null
  engine_id: string | null
  year: number | null
  vin: string | null
  is_primary: boolean
  make: { id: string; name: string; slug: string; country: string | null; logo_url: string | null }
  model: { id: string; name: string; slug: string } | null
  generation: { id: string; name: string } | null
  modification: { id: string; name: string } | null
  engine: { id: string; name: string } | null
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string | null
  product_slug: string | null
  product_image: string | null
  quantity: number
  unit_price: string
  line_total: string
  stock_quantity: number | null
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: string
  count: number
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: string
  line_total: string
}

export interface OrderStatusEvent {
  id: string
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}

export interface Order {
  id: string
  number: string
  status: string
  shipping_method: string
  payment_method: string
  subtotal: string
  shipping_cost: string
  discount: string
  coupon_code?: string | null
  points_redeemed?: number
  points_discount?: string
  total: string
  currency: string
  contact_name: string
  contact_phone: string
  contact_email: string
  shipping_city: string
  shipping_street: string
  shipping_postal_code: string | null
  customer_note: string | null
  created_at: string
  items: OrderItem[]
  status_history: OrderStatusEvent[]
}

export interface OrderListItem {
  id: string
  number: string
  status: string
  total: string
  currency: string
  created_at: string
  items_count: number
}

export interface PaginatedOrders {
  items: OrderListItem[]
  total: number
  offset: number
  limit: number
}

export interface QuickSymptomPrompt {
  id: string
  title: string
  symptom: string
  system_category: string
  icon: string
  short_description: string
}

export interface RecommendedProduct {
  id: string
  name: string
  slug: string
  sku: string
  price: string
  old_price: string | null
  stock_quantity: number
  rating_avg: string
  brand_name: string
  category_name: string
  category_slug: string
  image_url: string | null
  fitment_status: 'compatible' | 'not_compatible' | 'unknown'
  relevance_reason: string
}

export interface AiDiagnosticResponse {
  query_symptom: string
  vehicle_summary: string | null
  system_affected: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  primary_diagnosis: string
  confidence_score: number
  possible_causes: string[]
  safety_warning: string | null
  can_drive: boolean
  diagnostic_steps: string[]
  estimated_repair_time: string
  difficulty: 'easy' | 'medium' | 'hard' | 'professional'
  recommended_products: RecommendedProduct[]
  advice: string
  is_ai_enhanced: boolean
}

export interface SpecificationComparisonRow {
  name: string
  values: Record<string, string | null>
  is_different: boolean
}

export interface ProductComparisonResponse {
  products: ProductDetail[]
  specifications_matrix: SpecificationComparisonRow[]
  all_spec_names: string[]
  is_same_category: boolean
}

export interface SpecificationComparisonRow {
  name: string
  values: Record<string, string | null>
  is_different: boolean
}

export interface ProductComparisonResponse {
  products: ProductDetail[]
  specifications_matrix: SpecificationComparisonRow[]
  all_spec_names: string[]
  is_same_category: boolean
}



export interface GarageRecommendationsResponse {
  vehicle_id: string | null
  vehicle_name: string
  maintenance_parts: ProductBrief[]
  popular_compatible: ProductBrief[]
}

export interface FrequentlyBoughtTogetherResponse {
  target_product_id: string
  items: ProductBrief[]
  total_bundle_price: string
  total_savings: string
}

export interface AssemblySummary {
  id: string
  title: string
  subsystem: string
  description: string
  parts_count: number
  difficulty: string
}

export interface AssemblyNodePart {
  node_id: string
  name: string
  description: string
  category_slug: string
  exploded_offset: [number, number, number]
  matching_product: ProductBrief | null
}

export interface AssemblyDetailResponse {
  id: string
  title: string
  subsystem: string
  description: string
  nodes: AssemblyNodePart[]
  camera_initial: { x: number; y: number; z: number }
  vehicle_fitment_summary: string | null
}

export type LoyaltyTier = 'silver' | 'gold' | 'platinum'
export type LoyaltyTransactionType = 'welcome' | 'accrual' | 'redemption' | 'refund' | 'admin_adjust'

export interface LoyaltyTransactionRead {
  id: string
  amount: number
  balance_after: number
  type: LoyaltyTransactionType
  order_id: string | null
  description: string
  created_at: string
}

export interface LoyaltyTierInfo {
  current_tier: LoyaltyTier
  cashback_rate: string | number
  cashback_percent: number
  next_tier: LoyaltyTier | null
  spent_current: string
  spent_needed_for_next: string | null
  tier_progress_percent: number
}

export interface LoyaltyAccountRead {
  points_balance: number
  lifetime_points: number
  total_spent: string
  tier_info: LoyaltyTierInfo
  recent_transactions: LoyaltyTransactionRead[]
}

export interface PointsApplyResponse {
  points_applied: number
  discount_amount: string
  remaining_balance: number
  max_allowed_points: number
}



export type NotificationType = 'order_created' | 'order_status_changed' | 'loyalty_bonus' | 'system' | 'price_alert'
export type NotificationChannel = 'in_app' | 'email'

export interface NotificationItem {
  id: string
  type: NotificationType
  channel: NotificationChannel
  title: string
  message: string
  link?: string | null
  is_read: boolean
  read_at?: string | null
  data?: Record<string, any> | null
  created_at: string
}

export interface NotificationListResponse {
  items: NotificationItem[]
  total: number
  unread_count: number
}

export interface NotificationPreference {
  order_updates_in_app: boolean
  order_updates_email: boolean
  promotions_in_app: boolean
  promotions_email: boolean
  loyalty_in_app: boolean
  loyalty_email: boolean
  updated_at: string
}

export interface UnreadCountResponse {
  unread_count: number
}



export type TicketStatus = 'open' | 'in_progress' | 'awaiting_customer' | 'resolved' | 'closed'
export type TicketCategory = 'order' | 'delivery' | 'part_selection' | 'return' | 'payment' | 'other'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface TicketMessageRead {
  id: string
  is_staff: boolean
  author_name: string
  body: string
  created_at: string
}

export interface TicketSummary {
  id: string
  number: string
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  order_id?: string | null
  order_number?: string | null
  customer_name: string
  customer_email: string
  assignee_name?: string | null
  unread: boolean
  messages_count: number
  last_message_preview: string
  created_at: string
  last_message_at: string
}

export interface TicketDetail extends TicketSummary {
  messages: TicketMessageRead[]
}

export interface TicketListResponse {
  items: TicketSummary[]
  total: number
  unread_count: number
}



export type ArticleCategory = 'guide' | 'maintenance' | 'diy' | 'review' | 'news'

export interface ArticleSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  category: ArticleCategory
  cover_image?: string | null
  tags: string[]
  is_published: boolean
  views_count: number
  reading_time_minutes: number
  published_at?: string | null
  created_at: string
}

export interface ArticleDetail extends ArticleSummary {
  content: string
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  updated_at: string
  author_id?: string | null
  author_name?: string | null
}

export interface ArticleListResponse {
  items: ArticleSummary[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface CategorySummary {
  category: ArticleCategory
  label: string
  count: number
}

export interface ArticleCreatePayload {
  title: string
  slug?: string
  excerpt: string
  content: string
  category: ArticleCategory
  cover_image?: string
  tags?: string[]
  is_published?: boolean
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
}

export type ArticleUpdatePayload = Partial<ArticleCreatePayload>

export interface RevenueByDay {
  date: string
  revenue: string | number
  orders_count: number
}

export interface OrderStatusCount {
  status: string
  count: number
  percentage: number
}

export interface TopProduct {
  id: string
  name: string
  sku: string
  units_sold: number
  revenue: string | number
  stock_quantity: number
}

export interface GaragePopularMake {
  make_name: string
  vehicles_count: number
}

export interface StockHealth {
  in_stock: number
  low_stock: number
  out_of_stock: number
  total_skus: number
}

export interface SupportMetrics {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  avg_messages_per_ticket: number
}

export interface LoyaltyMetrics {
  total_accounts: number
  total_points_balance: string | number
  total_points_redeemed: string | number
}

export interface AnalyticsDashboardResponse {
  total_revenue: string | number
  total_orders: number
  average_order_value: string | number
  currency: string
  revenue_chart: RevenueByDay[]
  orders_by_status: OrderStatusCount[]
  top_products: TopProduct[]
  popular_makes: GaragePopularMake[]
  stock_health: StockHealth
  support_metrics: SupportMetrics
  loyalty_metrics: LoyaltyMetrics
}


export interface QuickOrderRequest {
  product_id: string
  quantity: number
  customer_name: string
  customer_phone: string
  contact_method: 'phone' | 'whatsapp' | 'telegram'
  comment?: string
}

export interface QuickOrderResponse {
  order_id: string
  order_number: string
  total: string | number
  currency: string
  message: string
}
