import uuid
from decimal import Decimal
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

