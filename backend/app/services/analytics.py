from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.catalog import Category, Product
from app.models.commerce import Order, OrderItem, OrderStatus
from app.models.loyalty import LoyaltyAccount
from app.models.support import SupportTicket, TicketMessage, TicketStatus
from app.models.user import User, UserRole
from app.models.vehicle import UserVehicle, VehicleMake
from app.schemas.analytics import (
    AnalyticsDashboardResponse, CategorySales, GaragePopularMake, InventoryAlert,
    LoyaltyMetrics, OrderStatusCount, RecentAnalyticsOrder, RevenueByDay,
    StockHealth, SupportMetrics, TopProduct,
)

LOW_STOCK_THRESHOLD = 5


def get_analytics_dashboard(db: Session, days: int = 7) -> AnalyticsDashboardResponse:
    """Order-value metrics for an inclusive UTC calendar period; stock is current.

    Revenue represents booked order value, not settled payments. Cancelled and
    returned orders are excluded from value, units, top products and categories.
    All period-based metrics share the same half-open interval.
    """
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = today - timedelta(days=days - 1)
    end = today + timedelta(days=1)
    period = (Order.created_at >= start, Order.created_at < end)
    valid = (*period, Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.RETURNED]))
    revenue, valid_count = db.execute(select(func.coalesce(func.sum(Order.total), 0), func.count(Order.id)).where(*valid)).one()
    total_orders = db.scalar(select(func.count(Order.id)).where(*period)) or 0
    daily = db.execute(select(func.date(Order.created_at), func.sum(Order.total)).where(*valid).group_by(func.date(Order.created_at))).all()
    daily_revenue = {str(date): value for date, value in daily}
    daily_count = dict((str(date), count) for date, count in db.execute(select(func.date(Order.created_at), func.count(Order.id)).where(*period).group_by(func.date(Order.created_at))))
    chart = []
    for i in range(days):
        date = (start + timedelta(days=i)).date().isoformat()
        chart.append(RevenueByDay(date=date, revenue=daily_revenue.get(date, 0), orders_count=daily_count.get(date, 0)))

    statuses = db.execute(select(Order.status, func.count(Order.id)).where(*period).group_by(Order.status)).all()
    top_rows = db.execute(
        select(OrderItem.product_id, OrderItem.product_name, OrderItem.product_sku,
               func.sum(OrderItem.quantity).label('units'), func.sum(OrderItem.line_total), Product.stock_quantity)
        .join(Order, Order.id == OrderItem.order_id).join(Product, Product.id == OrderItem.product_id)
        .where(*valid).group_by(OrderItem.product_id, OrderItem.product_name, OrderItem.product_sku, Product.stock_quantity)
        .order_by(desc('units')).limit(5)
    ).all()
    category_rows = db.execute(
        select(Category.name, func.sum(OrderItem.quantity), func.sum(OrderItem.line_total).label('revenue'))
        .select_from(OrderItem).join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id).join(Category, Category.id == Product.category_id)
        .where(*valid).group_by(Category.id, Category.name).order_by(desc('revenue'))
    ).all()
    units = db.scalar(select(func.coalesce(func.sum(OrderItem.quantity), 0)).join(Order, Order.id == OrderItem.order_id).where(*valid)) or 0
    new_customers = db.scalar(select(func.count(User.id)).where(User.role == UserRole.CUSTOMER, User.created_at >= start, User.created_at < end)) or 0
    low_stock = list(db.scalars(select(Product).where(Product.stock_quantity <= LOW_STOCK_THRESHOLD).order_by(Product.stock_quantity, Product.name).limit(10)))
    recent = list(db.scalars(select(Order).where(*period).order_by(Order.created_at.desc()).limit(8)))
    total_skus = db.scalar(select(func.count(Product.id))) or 0
    available = db.scalar(select(func.count(Product.id)).where(Product.stock_quantity > LOW_STOCK_THRESHOLD)) or 0
    low_count = db.scalar(select(func.count(Product.id)).where(Product.stock_quantity > 0, Product.stock_quantity <= LOW_STOCK_THRESHOLD)) or 0
    empty = db.scalar(select(func.count(Product.id)).where(Product.stock_quantity <= 0)) or 0
    makes = db.execute(select(VehicleMake.name, func.count(UserVehicle.id).label('count')).join(UserVehicle, UserVehicle.make_id == VehicleMake.id).group_by(VehicleMake.name).order_by(desc('count')).limit(5)).all()
    tickets = db.scalar(select(func.count(SupportTicket.id))) or 0
    messages = db.scalar(select(func.count(TicketMessage.id))) or 0
    opened = db.scalar(select(func.count(SupportTicket.id)).where(SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]))) or 0
    resolved = db.scalar(select(func.count(SupportTicket.id)).where(SupportTicket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]))) or 0
    return AnalyticsDashboardResponse(
        total_revenue=revenue, total_orders=total_orders,
        average_order_value=round(Decimal(revenue) / valid_count, 2) if valid_count else Decimal('0'),
        revenue_chart=chart,
        orders_by_status=[OrderStatusCount(status=s.value, count=n, percentage=round(n / total_orders * 100, 1) if total_orders else 0) for s, n in statuses],
        top_products=[TopProduct(id=p, name=name, sku=sku, units_sold=n, revenue=value, stock_quantity=stock) for p, name, sku, n, value, stock in top_rows],
        popular_makes=[GaragePopularMake(make_name=name, vehicles_count=count) for name, count in makes],
        stock_health=StockHealth(in_stock=available, low_stock=low_count, out_of_stock=empty, total_skus=total_skus),
        support_metrics=SupportMetrics(total_tickets=tickets, open_tickets=opened, resolved_tickets=resolved, avg_messages_per_ticket=round(messages / tickets, 2) if tickets else 0),
        loyalty_metrics=LoyaltyMetrics(
            total_accounts=db.scalar(select(func.count(LoyaltyAccount.id))) or 0,
            total_points_balance=db.scalar(select(func.coalesce(func.sum(LoyaltyAccount.points_balance), 0))) or 0,
            total_points_redeemed=db.scalar(select(func.coalesce(func.sum(Order.points_redeemed), 0)).where(*valid)) or 0,
        ),
        period_days=days, new_customers=new_customers, units_sold=units,
        sales_by_category=[CategorySales(name=name, units_sold=count, revenue=value) for name, count, value in category_rows],
        low_stock_products=[InventoryAlert(id=p.id, name=p.name, sku=p.sku, stock_quantity=p.stock_quantity, low_stock_threshold=LOW_STOCK_THRESHOLD) for p in low_stock],
        recent_orders=[RecentAnalyticsOrder(id=o.id, number=o.number, status=o.status.value, total=o.total, created_at=o.created_at) for o in recent],
    )

