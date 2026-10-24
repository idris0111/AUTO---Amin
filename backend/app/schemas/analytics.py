import uuid
from decimal import Decimal
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class RevenueByDay(BaseModel):
    date: str
    revenue: Decimal
    orders_count: int


class OrderStatusCount(BaseModel):
    status: str
    count: int
    percentage: float


class TopProduct(BaseModel):
    id: uuid.UUID
    name: str
    sku: str
    units_sold: int
    revenue: Decimal
    stock_quantity: int


class GaragePopularMake(BaseModel):
    make_name: str
    vehicles_count: int


class StockHealth(BaseModel):
    in_stock: int
    low_stock: int
    out_of_stock: int
    total_skus: int


class SupportMetrics(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    avg_messages_per_ticket: float


class LoyaltyMetrics(BaseModel):
    total_accounts: int
    total_points_balance: Decimal
    total_points_redeemed: Decimal


class AnalyticsDashboardResponse(BaseModel):
    total_revenue: Decimal
    total_orders: int
    average_order_value: Decimal
    currency: str = "TJS"
    revenue_chart: list[RevenueByDay]
    orders_by_status: list[OrderStatusCount]
    top_products: list[TopProduct]
    popular_makes: list[GaragePopularMake]
    stock_health: StockHealth
    support_metrics: SupportMetrics
    loyalty_metrics: LoyaltyMetrics
    period_days: int = 7
    new_customers: int = 0
    units_sold: int = 0
    sales_by_category: list["CategorySales"] = []
    low_stock_products: list["InventoryAlert"] = []
    recent_orders: list["RecentAnalyticsOrder"] = []


class CategorySales(BaseModel):
    name: str
    units_sold: int
    revenue: Decimal


class InventoryAlert(BaseModel):
    id: uuid.UUID
    name: str
    sku: str
    stock_quantity: int
    low_stock_threshold: int


class RecentAnalyticsOrder(BaseModel):
    id: uuid.UUID
    number: str
    status: str
    total: Decimal
    created_at: datetime

