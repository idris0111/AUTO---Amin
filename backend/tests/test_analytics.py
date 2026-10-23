from decimal import Decimal
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

