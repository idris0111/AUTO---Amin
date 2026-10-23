import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.commerce import Order, OrderStatus, PaymentMethod, ShippingMethod
from app.models.content import Article, ArticleCategory
from app.models.notification import Notification, NotificationType
from app.models.support import SupportTicket, TicketCategory, TicketPriority, TicketStatus
from app.models.user import Address, User, UserRole
from tests.conftest import register_and_login


def test_security_headers_present(client: TestClient) -> None:
    """Verify production security headers are set by SecurityHeadersMiddleware."""
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in headers.get("permissions-policy", "")


def test_cache_control_headers(client: TestClient, db: Session) -> None:
    """Verify HTTP Cache-Control headers for static and semi-static resources."""
    # 1. Categories
    res_cats = client.get("/api/v1/catalog/categories")
    assert res_cats.status_code == 200
    assert "public" in res_cats.headers.get("cache-control", "")
    assert "max-age=300" in res_cats.headers.get("cache-control", "")

    # 2. Brands
    res_brands = client.get("/api/v1/catalog/brands")
    assert res_brands.status_code == 200
    assert "public" in res_brands.headers.get("cache-control", "")

    # 3. Content categories
    res_content_cats = client.get("/api/v1/content/categories")
    assert res_content_cats.status_code == 200
    assert "public" in res_content_cats.headers.get("cache-control", "")

    # 4. Sitemap and Robots
    res_sitemap = client.get("/sitemap.xml")
    assert res_sitemap.status_code == 200
    assert "max-age=3600" in res_sitemap.headers.get("cache-control", "")

    res_robots = client.get("/robots.txt")
    assert res_robots.status_code == 200
    assert "max-age=3600" in res_robots.headers.get("cache-control", "")

    # 5. 3D Assemblies
    res_3d = client.get("/api/v1/3d/assemblies")
    assert res_3d.status_code == 200
    assert "max-age=600" in res_3d.headers.get("cache-control", "")


def test_idor_orders_and_support_protection(client: TestClient, db: Session) -> None:
    """Verify Customer B cannot access or modify Customer A's orders and tickets."""
    # 1. Create Customer A
    tokens_a = register_and_login(
        client,
        {
            "email": "cust_a_security@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Алишер",
            "last_name": "Алиев",
        },
    )
    headers_a = {"Authorization": f"Bearer {tokens_a['access_token']}"}
    user_a = db.scalar(select(User).where(User.email == "cust_a_security@autouniverse.tj"))
    assert user_a is not None

    # 2. Create Customer B
    tokens_b = register_and_login(
        client,
        {
            "email": "cust_b_security@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Бехруз",
            "last_name": "Бобоев",
        },
    )
    headers_b = {"Authorization": f"Bearer {tokens_b['access_token']}"}
    user_b = db.scalar(select(User).where(User.email == "cust_b_security@autouniverse.tj"))
    assert user_b is not None

    # 3. Create an order belonging to Customer A
    order_a = Order(
        number="ORD-SEC-0001",
        user_id=user_a.id,
        status=OrderStatus.PENDING,
        subtotal=Decimal("500.00"),
        shipping_cost=Decimal("0.00"),
        discount=Decimal("0.00"),
        total=Decimal("500.00"),
        currency="TJS",
        payment_method=PaymentMethod.CASH_ON_DELIVERY,
        shipping_method=ShippingMethod.PICKUP,
        contact_name="Алишер",
        contact_phone="+992900000001",
        contact_email="cust_a_security@autouniverse.tj",
        shipping_city="Душанбе",
        shipping_street="Рудаки 1",
    )
    db.add(order_a)
    db.commit()

    # 4. Customer B attempts IDOR on Customer A's order
    # GET order detail
    res_b_get_order = client.get(f"/api/v1/orders/{order_a.id}", headers=headers_b)
    assert res_b_get_order.status_code == 404

    # POST cancel order
    res_b_cancel_order = client.post(f"/api/v1/orders/{order_a.id}/cancel", headers=headers_b)
    assert res_b_cancel_order.status_code == 404

    # 5. Customer A creates a support ticket
    ticket_a = SupportTicket(
        number="TCK-SEC-0001",
        user_id=user_a.id,
        order_id=order_a.id,
        subject="Вопрос по заказу Алишера",
        category=TicketCategory.ORDER,
        priority=TicketPriority.NORMAL,
        status=TicketStatus.OPEN,
    )
    db.add(ticket_a)
    db.commit()

    # 6. Customer B attempts IDOR on Customer A's ticket
    # GET ticket detail
    res_b_get_ticket = client.get(f"/api/v1/support/tickets/{ticket_a.id}", headers=headers_b)
    assert res_b_get_ticket.status_code == 404

    # POST message into Customer A's ticket
    res_b_msg_ticket = client.post(
        f"/api/v1/support/tickets/{ticket_a.id}/messages",
        headers=headers_b,
        json={"body": "Внедренное сообщение злоумышленника"},
    )
    assert res_b_msg_ticket.status_code == 404

    # Customer B attempts to create a ticket linking Customer A's order
    res_b_fake_ticket = client.post(
        "/api/v1/support/tickets",
        headers=headers_b,
        json={
            "subject": "Попытка привязки чужого заказа",
            "category": "order",
            "order_id": str(order_a.id),
            "message": "Чужой заказ",
        },
    )
    assert res_b_fake_ticket.status_code in (403, 404)


def test_idor_addresses_and_notifications_protection(client: TestClient, db: Session) -> None:
    """Verify Customer B cannot access or modify Customer A's addresses and notifications."""
    # 1. Setup users
    tokens_a = register_and_login(
        client,
        {
            "email": "cust_a_addr@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Алишер",
            "last_name": "Адресов",
        },
    )
    headers_a = {"Authorization": f"Bearer {tokens_a['access_token']}"}
    user_a = db.scalar(select(User).where(User.email == "cust_a_addr@autouniverse.tj"))
    assert user_a is not None

    tokens_b = register_and_login(
        client,
        {
            "email": "cust_b_addr@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Бехруз",
            "last_name": "Адресов",
        },
    )
    headers_b = {"Authorization": f"Bearer {tokens_b['access_token']}"}

    # 2. Customer A creates an address
    res_addr = client.post(
        "/api/v1/addresses",
        headers=headers_a,
        json={
            "label": "Дом",
            "recipient_name": "Алишер Адресов",
            "phone": "+992900000001",
            "country": "Таджикистан",
            "city": "Душанбе",
            "street": "пр. Рудаки 55, кв. 12",
            "postal_code": "734000",
            "is_default": True,
        },
    )
    assert res_addr.status_code == 201
    addr_id = res_addr.json()["id"]

    # 3. Customer B attempts to modify or delete Customer A's address
    res_b_put = client.patch(
        f"/api/v1/addresses/{addr_id}",
        headers=headers_b,
        json={"city": "Худжанд"},
    )
    assert res_b_put.status_code == 404

    res_b_del = client.delete(f"/api/v1/addresses/{addr_id}", headers=headers_b)
    assert res_b_del.status_code == 404

    # 4. Create notification for Customer A
    notif_a = Notification(
        user_id=user_a.id,
        type=NotificationType.SYSTEM,
        title="Секретное уведомление Алишера",
        message="Ваш статус повышен до Gold",
    )
    db.add(notif_a)
    db.commit()

    # Customer B attempts to mark as read or delete Customer A's notification
    res_b_notif_read = client.patch(f"/api/v1/notifications/{notif_a.id}/read", headers=headers_b)
    assert res_b_notif_read.status_code == 404

    res_b_notif_del = client.delete(f"/api/v1/notifications/{notif_a.id}", headers=headers_b)
    assert res_b_notif_del.status_code == 404


def test_sql_injection_and_xss_safety(client: TestClient) -> None:
    """Verify special characters, SQL payload patterns and XSS strings do not trigger errors."""
    attack_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT username, password_hash FROM users --",
        "<script>alert('XSS')</script>",
        "../../etc/passwd",
        "%27%20OR%201=1--",
        "\\x00\\x27\\x22",
    ]

    for payload in attack_payloads:
        # 1. Catalog search
        res_cat = client.get(f"/api/v1/catalog/products?q={payload}")
        assert res_cat.status_code == 200
        assert "items" in res_cat.json()

        # 2. Content search
        res_blog = client.get(f"/api/v1/content/articles?search={payload}")
        assert res_blog.status_code == 200
        assert "items" in res_blog.json()
