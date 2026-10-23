import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.catalog import Product, ProductStatus
from app.models.commerce import Order, OrderItem, OrderStatus
from app.models.loyalty import LoyaltyAccount
from app.models.support import SupportTicket, TicketStatus
from app.models.vehicle import UserVehicle, VehicleMake
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    GaragePopularMake,
    LoyaltyMetrics,
    OrderStatusCount,
    RevenueByDay,
    StockHealth,
    SupportMetrics,
    TopProduct,
)


def get_analytics_dashboard(db: Session, days: int = 7) -> AnalyticsDashboardResponse:
    # 1. Total revenue and orders
    valid_statuses = [
        s for s in OrderStatus if s not in (OrderStatus.CANCELLED, OrderStatus.RETURNED)
    ]
    
    total_revenue_val = db.scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(Order.status.in_(valid_statuses))
    )
    total_revenue = Decimal(str(total_revenue_val or "0.00"))

    total_orders = db.scalar(select(func.count(Order.id))) or 0

    valid_orders_count = db.scalar(
        select(func.count(Order.id)).where(Order.status.in_(valid_statuses))
    ) or 0

    average_order_value = (
        round(total_revenue / Decimal(valid_orders_count), 2)
        if valid_orders_count > 0
        else Decimal("0.00")
    )

    # 2. Revenue Chart: last N days
    now = datetime.now(timezone.utc)
    chart_days: list[RevenueByDay] = []
    
    for i in range(days - 1, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        date_str = day_date.strftime("%Y-%m-%d")
        
        # Day boundaries
        day_start = datetime(day_date.year, day_date.month, day_date.day, 0, 0, 0, tzinfo=timezone.utc)
        day_end = datetime(day_date.year, day_date.month, day_date.day, 23, 59, 59, tzinfo=timezone.utc)

        day_rev_val = db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.created_at >= day_start,
                Order.created_at <= day_end,
                Order.status.in_(valid_statuses),
            )
        )
        day_count = db.scalar(
            select(func.count(Order.id)).where(
                Order.created_at >= day_start,
                Order.created_at <= day_end,
            )
        ) or 0

        chart_days.append(
            RevenueByDay(
                date=date_str,
                revenue=Decimal(str(day_rev_val or "0.00")),
                orders_count=day_count,
            )
        )

    # 3. Orders by Status
    status_counts = db.execute(
        select(Order.status, func.count(Order.id)).group_by(Order.status)
    ).all()
    
    orders_by_status: list[OrderStatusCount] = []
    for st, count in status_counts:
        pct = round((count / total_orders * 100), 1) if total_orders > 0 else 0.0
        orders_by_status.append(
            OrderStatusCount(status=st.value if hasattr(st, "value") else str(st), count=count, percentage=pct)
        )

    # 4. Top Selling Products
    top_items_rows = db.execute(
        select(
            OrderItem.product_id,
            OrderItem.product_name,
            OrderItem.product_sku,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.line_total).label("total_line_revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(valid_statuses))
        .group_by(OrderItem.product_id, OrderItem.product_name, OrderItem.product_sku)
        .order_by(desc("units_sold"))
        .limit(5)
    ).all()

    top_products: list[TopProduct] = []
    for pid, pname, psku, sold, rev in top_items_rows:
        current_prod = db.scalar(select(Product).where(Product.id == pid))
        stock = current_prod.stock_quantity if current_prod else 0
        top_products.append(
            TopProduct(
                id=pid,
                name=pname,
                sku=psku,
                units_sold=int(sold or 0),
                revenue=Decimal(str(rev or "0.00")),
                stock_quantity=stock,
            )
        )

    # 5. Popular Vehicle Makes in Users' Garages
    popular_makes_rows = db.execute(
        select(VehicleMake.name, func.count(UserVehicle.id).label("make_count"))
        .join(UserVehicle, UserVehicle.make_id == VehicleMake.id)
        .group_by(VehicleMake.name)
        .order_by(desc("make_count"))
        .limit(5)
    ).all()

    popular_makes = [
        GaragePopularMake(make_name=mname, vehicles_count=mcount)
        for mname, mcount in popular_makes_rows
    ]

    # 6. Stock Health
    total_skus = db.scalar(select(func.count(Product.id))) or 0
    in_stock = db.scalar(select(func.count(Product.id)).where(Product.stock_quantity > 5)) or 0
    low_stock = db.scalar(
        select(func.count(Product.id)).where(Product.stock_quantity > 0, Product.stock_quantity <= 5)
    ) or 0
    out_of_stock = db.scalar(select(func.count(Product.id)).where(Product.stock_quantity == 0)) or 0

    stock_health = StockHealth(
        in_stock=in_stock,
        low_stock=low_stock,
        out_of_stock=out_of_stock,
        total_skus=total_skus,
    )

    # 7. Support Metrics
    total_tickets = db.scalar(select(func.count(SupportTicket.id))) or 0
    open_tickets = db.scalar(
        select(func.count(SupportTicket.id)).where(
            SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
        )
    ) or 0
    resolved_tickets = db.scalar(
        select(func.count(SupportTicket.id)).where(
            SupportTicket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
        )
    ) or 0

    support_metrics = SupportMetrics(
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        resolved_tickets=resolved_tickets,
        avg_messages_per_ticket=2.5,
    )

    # 8. Loyalty Metrics
    total_loyalty_accounts = db.scalar(select(func.count(LoyaltyAccount.id))) or 0
    total_loyalty_balance = db.scalar(select(func.coalesce(func.sum(LoyaltyAccount.points_balance), 0))) or 0
    total_redeemed = db.scalar(
        select(func.coalesce(func.sum(Order.points_redeemed), 0)).where(Order.status.in_(valid_statuses))
    ) or 0

    loyalty_metrics = LoyaltyMetrics(
        total_accounts=total_loyalty_accounts,
        total_points_balance=Decimal(str(total_loyalty_balance)),
        total_points_redeemed=Decimal(str(total_redeemed)),
    )

    return AnalyticsDashboardResponse(
        total_revenue=total_revenue,
        total_orders=total_orders,
        average_order_value=average_order_value,
        revenue_chart=chart_days,
        orders_by_status=orders_by_status,
        top_products=top_products,
        popular_makes=popular_makes,
        stock_health=stock_health,
        support_metrics=support_metrics,
        loyalty_metrics=loyalty_metrics,
    )

