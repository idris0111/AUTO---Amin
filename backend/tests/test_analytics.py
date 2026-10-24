from decimal import Decimal
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.commerce import Order, OrderItem, OrderStatus, PaymentMethod, ShippingMethod
from app.models.user import User, UserRole
from tests.conftest import register_and_login


def test_analytics_dashboard_rbac_and_data(client: TestClient, db: Session) -> None:
    # 1. Customer
    cust_tokens = register_and_login(
        client,
        {
            "email": "analytics_cust@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Шерзод",
            "last_name": "Аналитиков",
        },
    )
    cust_headers = {"Authorization": f"Bearer {cust_tokens['access_token']}"}

    # 2. Staff / Admin
    admin_tokens = register_and_login(
        client,
        {
            "email": "analytics_boss@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Директор",
            "last_name": "Главный",
        },
    )
    admin_headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}
    admin_user = db.scalar(select(User).where(User.email == "analytics_boss@autouniverse.tj"))
    assert admin_user is not None
    admin_user.role = UserRole.ADMIN
    db.commit()

    # 3. Customer forbidden
    res_forbidden = client.get("/api/v1/admin/analytics/dashboard", headers=cust_headers)
    assert res_forbidden.status_code == 403

    # 4. Seed sample product and completed order for analytics
    brand = Brand(name="Bosch", slug="bosch-analytics")
    cat = Category(name="Фильтры", slug="filters-analytics")
    db.add(brand)
    db.add(cat)
    db.commit()

    prod = Product(
        name="Масляный фильтр Bosch Premium",
        sku="BSH-FLT-001",
        slug="bsh-flt-001",
        price=Decimal("120.00"),
        stock_quantity=15,
        status=ProductStatus.ACTIVE,
        brand_id=brand.id,
        category_id=cat.id,
    )
    db.add(prod)
    db.commit()

    order = Order(
        number="ORD-BI-001",
        user_id=admin_user.id,
        status=OrderStatus.COMPLETED,
        subtotal=Decimal("240.00"),
        shipping_cost=Decimal("20.00"),
        discount=Decimal("0.00"),
        total=Decimal("260.00"),
        currency="TJS",
        payment_method=PaymentMethod.CASH_ON_DELIVERY,
        shipping_method=ShippingMethod.COURIER,
        contact_name="Директор",
        contact_phone="+992900000000",
        contact_email="analytics_boss@autouniverse.tj",
        shipping_city="Душанбе",
        shipping_street="Рудаки 10",
    )
    db.add(order)
    db.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=prod.id,
        product_name=prod.name,
        product_sku=prod.sku,
        quantity=2,
        unit_price=Decimal("120.00"),
        line_total=Decimal("240.00"),
    )
    db.add(item)
    db.commit()

    # 5. Admin accesses BI dashboard
    res_admin = client.get("/api/v1/admin/analytics/dashboard?days=7", headers=admin_headers)
    assert res_admin.status_code == 200
    bi_data = res_admin.json()

    assert Decimal(str(bi_data["total_revenue"])) >= Decimal("260.00")
    assert bi_data["total_orders"] >= 1
    assert "revenue_chart" in bi_data
    assert len(bi_data["revenue_chart"]) == 7
    assert "stock_health" in bi_data
    assert bi_data["stock_health"]["in_stock"] >= 1
    assert "top_products" in bi_data
    assert any(p["sku"] == "BSH-FLT-001" for p in bi_data["top_products"])

    assert Decimal(bi_data["total_revenue"]) == Decimal("260.00")
    assert Decimal(bi_data["average_order_value"]) == Decimal("260.00")
    assert bi_data["units_sold"] == 2
    assert bi_data["sales_by_category"][0]["units_sold"] == 2
    assert Decimal(bi_data["sales_by_category"][0]["revenue"]) == Decimal("240.00")
    assert bi_data["support_metrics"]["avg_messages_per_ticket"] == 0
    assert len(bi_data["recent_orders"]) == 1

    # Historical, cancelled, and returned orders must not inflate booked value.
    now = datetime.now(timezone.utc)
    for index, (order_status, created_at) in enumerate([
        (OrderStatus.COMPLETED, now - timedelta(days=15)),
        (OrderStatus.CANCELLED, now),
        (OrderStatus.RETURNED, now),
    ]):
        extra = Order(
            number=f"ORD-BI-EXTRA-{index}", user_id=admin_user.id,
            status=order_status, subtotal=Decimal("1200"), total=Decimal("1200"),
            payment_method=PaymentMethod.CASH_ON_DELIVERY, shipping_method=ShippingMethod.COURIER,
            contact_name="Analytics", contact_phone="+992900000000",
            contact_email="analytics_boss@autouniverse.tj", shipping_city="Dushanbe",
            shipping_street="Test", created_at=created_at,
        )
        db.add(extra)
        db.flush()
        db.add(OrderItem(order_id=extra.id, product_id=prod.id, product_name=prod.name,
                         product_sku=prod.sku, quantity=10, unit_price=Decimal("120"), line_total=Decimal("1200")))
    db.commit()
    short = client.get("/api/v1/admin/analytics/dashboard?days=7", headers=admin_headers).json()
    long = client.get("/api/v1/admin/analytics/dashboard?days=30", headers=admin_headers).json()
    assert Decimal(short["total_revenue"]) == Decimal("260")
    assert short["total_orders"] == 3
    assert short["units_sold"] == 2
    assert Decimal(long["total_revenue"]) == Decimal("1460")
    assert long["total_orders"] == 4
    assert long["units_sold"] == 12
    assert sum(Decimal(day["revenue"]) for day in long["revenue_chart"]) == Decimal("1460")
    assert sum(day["orders_count"] for day in short["revenue_chart"]) == 3
    assert len(long["recent_orders"]) == 4
    assert client.get("/api/v1/admin/analytics/dashboard?days=0", headers=admin_headers).status_code == 422
    assert client.get("/api/v1/admin/analytics/dashboard?days=91", headers=admin_headers).status_code == 422


def test_analytics_empty_database_has_no_invented_metrics(db: Session) -> None:
    from app.services.analytics import get_analytics_dashboard

    data = get_analytics_dashboard(db, days=7)
    assert data.total_revenue == 0
    assert data.average_order_value == 0
    assert data.total_orders == data.units_sold == data.new_customers == 0
    assert data.stock_health.total_skus == 0
    assert data.sales_by_category == data.top_products == data.recent_orders == []
    assert all(day.revenue == 0 and day.orders_count == 0 for day in data.revenue_chart)

