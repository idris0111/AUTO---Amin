import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.commerce import Order, OrderItem, OrderStatus, PaymentMethod, ShippingMethod
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole
from tests.conftest import register_and_login


def test_notification_flow_and_preferences(client: TestClient, db: Session) -> None:
    tokens = register_and_login(
        client,
        {
            "email": "notif_user@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Рустам",
            "last_name": "Тестеров",
        },
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    user = db.scalar(select(User).where(User.email == "notif_user@autouniverse.tj"))
    assert user is not None

    # 1. Initially unread count is 0
    res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    # 2. Add notifications
    n1 = Notification(
        user_id=user.id,
        type=NotificationType.ORDER_CREATED,
        title="Заказ #AU-1001 создан",
        message="Ваш заказ успешно принят.",
        link="/orders/1001",
    )
    n2 = Notification(
        user_id=user.id,
        type=NotificationType.LOYALTY_BONUS,
        title="Бонусы начислены",
        message="Вам начислено 100 баллов.",
        link="/profile",
    )
    db.add_all([n1, n2])
    db.commit()

    # 3. Check unread count is 2
    res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 2

    # 4. List notifications
    res = client.get("/api/v1/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert data["unread_count"] == 2
    assert len(data["items"]) == 2

    # 5. Mark single notification as read
    res = client.patch(f"/api/v1/notifications/{n1.id}/read", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_read"] is True

    res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 1

    # 6. Mark all as read
    res = client.post("/api/v1/notifications/mark-all-read", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    # 7. Preferences get and update
    res = client.get("/api/v1/notifications/preferences", headers=headers)
    assert res.status_code == 200
    prefs = res.json()
    assert prefs["order_updates_in_app"] is True

    res = client.put(
        "/api/v1/notifications/preferences",
        json={"promotions_email": True, "loyalty_email": False},
        headers=headers,
    )
    assert res.status_code == 200
    updated_prefs = res.json()
    assert updated_prefs["promotions_email"] is True
    assert updated_prefs["loyalty_email"] is False


def test_order_and_loyalty_triggers_notification(client: TestClient, db: Session) -> None:
    # Admin setup
    admin_tokens = register_and_login(
        client,
        {
            "email": "admin_notif@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Админ",
            "last_name": "Уведомитель",
        },
    )
    admin_user = db.scalar(select(User).where(User.email == "admin_notif@autouniverse.tj"))
    assert admin_user is not None
    admin_user.role = UserRole.ADMIN
    db.commit()
    admin_headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

    # Customer setup
    cust_tokens = register_and_login(
        client,
        {
            "email": "cust_notif@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Фарух",
            "last_name": "Клиент",
        },
    )
    cust_headers = {"Authorization": f"Bearer {cust_tokens['access_token']}"}
    cust_user = db.scalar(select(User).where(User.email == "cust_notif@autouniverse.tj"))
    assert cust_user is not None

    # Setup Product & Order
    brand = Brand(name="Castrol Notif", slug=f"castrol-{uuid.uuid4().hex[:6]}")
    cat = Category(name="Масла", slug=f"oils-{uuid.uuid4().hex[:6]}")
    db.add_all([brand, cat])
    db.flush()

    prod = Product(
        name="Castrol EDGE 5W-40",
        sku=f"CASTROL-{uuid.uuid4().hex[:6]}",
        slug=f"castrol-{uuid.uuid4().hex[:6]}",
        brand_id=brand.id,
        category_id=cat.id,
        price=Decimal("450.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    db.add(prod)
    db.flush()

    order = Order(
        number=f"TJ-NOTIF-{uuid.uuid4().hex[:6].upper()}",
        user_id=cust_user.id,
        status=OrderStatus.PENDING,
        currency="TJS",
        subtotal=Decimal("450.00"),
        shipping_cost=Decimal("0.00"),
        discount=Decimal("0.00"),
        total=Decimal("450.00"),
        contact_name="Фарух",
        contact_phone="+992930000000",
        contact_email=cust_user.email,
        shipping_city="Душанбе",
        shipping_street="ул. Айни 48",
        payment_method=PaymentMethod.CASH_ON_DELIVERY,
        shipping_method=ShippingMethod.COURIER,
    )
    db.add(order)
    db.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=prod.id,
        product_name=prod.name,
        product_sku=prod.sku,
        quantity=1,
        unit_price=Decimal("450.00"),
        line_total=Decimal("450.00"),
    )
    db.add(item)
    db.commit()

    # 1. Admin advances order status -> triggers notification to customer
    res = client.patch(
        f"/api/v1/admin/orders/{order.id}/status",
        json={"status": "confirmed", "note": "Собрано на складе DUSH-1"},
        headers=admin_headers,
    )
    assert res.status_code == 200

    # Customer checks notifications
    res = client.get("/api/v1/notifications", headers=cust_headers)
    assert res.status_code == 200
    items = res.json()["items"]
    assert any("Подтверждён" in it["title"] or "confirmed" in it["title"] or "Собрано" in it["message"] for it in items)

    # 2. Admin adjusts loyalty points -> triggers bonus notification
    res = client.post(
        f"/api/v1/admin/loyalty/{cust_user.id}/adjust",
        json={"amount": 150, "description": "Подарок в честь праздника Навруз"},
        headers=admin_headers,
    )
    assert res.status_code == 200

    # Customer checks notifications again
    res = client.get("/api/v1/notifications", headers=cust_headers)
    assert res.status_code == 200
    items = res.json()["items"]
    assert any("150" in it["title"] or "Навруз" in it["message"] for it in items)

    # 3. Admin broadcasts message to all users
    res = client.post(
        "/api/v1/notifications/admin/broadcast",
        json={
            "title": "График работы на выходные",
            "message": "В праздничные дни склад работает с 09:00 до 18:00.",
        },
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["sent_count"] >= 2
