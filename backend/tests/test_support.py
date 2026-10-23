import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.commerce import Order, OrderStatus, PaymentMethod, ShippingMethod
from app.models.notification import Notification, NotificationType
from app.models.support import SupportTicket, TicketCategory, TicketStatus
from app.models.user import User, UserRole
from tests.conftest import register_and_login


def test_support_ticket_lifecycle(client: TestClient, db: Session) -> None:
    # 1. Register customer
    cust_tokens = register_and_login(
        client,
        {
            "email": "support_cust@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Бахром",
            "last_name": "Клиентов",
        },
    )
    cust_headers = {"Authorization": f"Bearer {cust_tokens['access_token']}"}
    cust_user = db.scalar(select(User).where(User.email == "support_cust@autouniverse.tj"))
    assert cust_user is not None

    # 2. Register staff / support agent
    staff_tokens = register_and_login(
        client,
        {
            "email": "support_agent@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Сардор",
            "last_name": "Специалист",
        },
    )
    staff_headers = {"Authorization": f"Bearer {staff_tokens['access_token']}"}
    staff_user = db.scalar(select(User).where(User.email == "support_agent@autouniverse.tj"))
    assert staff_user is not None
    staff_user.role = UserRole.SUPPORT
    db.commit()

    # 3. Customer creates a ticket
    res = client.post(
        "/api/v1/support/tickets",
        json={
            "subject": "Вопрос по совместимости тормозных колодок",
            "category": "part_selection",
            "message": "Подойдут ли колодки Brembo P83024 на мой Land Cruiser Prado 150?",
        },
        headers=cust_headers,
    )
    assert res.status_code == 201
    ticket_data = res.json()
    ticket_id = ticket_data["id"]
    assert ticket_data["number"].startswith("SUP-")
    assert ticket_data["status"] == "open"
    assert len(ticket_data["messages"]) == 1
    assert ticket_data["messages"][0]["is_staff"] is False

    # 4. Customer lists their tickets
    res = client.get("/api/v1/support/tickets", headers=cust_headers)
    assert res.status_code == 200
    list_data = res.json()
    assert list_data["total"] >= 1
    assert any(t["id"] == ticket_id for t in list_data["items"])

    # 5. Non-staff customer cannot access admin support endpoint
    res = client.get("/api/v1/admin/support/tickets", headers=cust_headers)
    assert res.status_code == 403

    # 6. Staff lists tickets
    res = client.get("/api/v1/admin/support/tickets", headers=staff_headers)
    assert res.status_code == 200
    admin_list = res.json()
    assert any(t["id"] == ticket_id for t in admin_list["items"])

    # 7. Staff replies to the customer
    res = client.post(
        f"/api/v1/admin/support/tickets/{ticket_id}/messages",
        json={"body": "Да, артикул Brembo P83024 идеально совместим со штатной тормозной системой Prado 150."},
        headers=staff_headers,
    )
    assert res.status_code == 200
    updated_detail = res.json()
    assert updated_detail["status"] == "awaiting_customer"
    assert len(updated_detail["messages"]) == 2
    assert updated_detail["messages"][-1]["is_staff"] is True

    # 8. Check that customer received in-app notification about staff reply
    res = client.get("/api/v1/notifications", headers=cust_headers)
    assert res.status_code == 200
    notifs = res.json()["items"]
    assert any(n["type"] == "support_reply" and ticket_data["number"] in n["title"] for n in notifs)

    # 9. Customer replies back
    res = client.post(
        f"/api/v1/support/tickets/{ticket_id}/messages",
        json={"body": "Спасибо за быстрый ответ! Оформляю заказ."},
        headers=cust_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"
    assert len(res.json()["messages"]) == 3

    # 10. Staff resolves and closes ticket
    res = client.patch(
        f"/api/v1/admin/support/tickets/{ticket_id}",
        json={"status": "resolved"},
        headers=staff_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "resolved"


def test_ticket_with_order_and_idor_protection(client: TestClient, db: Session) -> None:
    # Customer 1
    c1_tokens = register_and_login(
        client,
        {
            "email": "c1_support@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Алишер",
            "last_name": "Тестов",
        },
    )
    c1_user = db.scalar(select(User).where(User.email == "c1_support@autouniverse.tj"))
    assert c1_user is not None

    # Customer 2
    c2_tokens = register_and_login(
        client,
        {
            "email": "c2_support@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Далер",
            "last_name": "Тестов",
        },
    )

    # Create Order for Customer 1
    order = Order(
        number="TJ-SUP-ORD-1",
        user_id=c1_user.id,
        status=OrderStatus.CONFIRMED,
        currency="TJS",
        subtotal=Decimal("200.00"),
        shipping_cost=Decimal("20.00"),
        discount=Decimal("0.00"),
        total=Decimal("220.00"),
        contact_name="Алишер",
        contact_phone="+992900000001",
        contact_email="c1_support@autouniverse.tj",
        shipping_city="Душанбе",
        shipping_street="ул. Пушкина 10",
        payment_method=PaymentMethod.CASH_ON_DELIVERY,
        shipping_method=ShippingMethod.COURIER,
    )
    db.add(order)
    db.commit()

    # Customer 2 tries to link Customer 1's order to a ticket -> 404 (IDOR prevention)
    res = client.post(
        "/api/v1/support/tickets",
        json={
            "subject": "Чужой заказ",
            "category": "order",
            "message": "Пытаюсь привязать чужой заказ",
            "order_id": str(order.id),
        },
        headers={"Authorization": f"Bearer {c2_tokens['access_token']}"},
    )
    assert res.status_code == 404

    # Customer 1 links their own order -> 201 Created
    res = client.post(
        "/api/v1/support/tickets",
        json={
            "subject": "Уточнить время доставки",
            "category": "order",
            "message": "Уточните, пожалуйста, прибудет ли курьер до 15:00?",
            "order_id": str(order.id),
        },
        headers={"Authorization": f"Bearer {c1_tokens['access_token']}"},
    )
    assert res.status_code == 201
    assert res.json()["order_number"] == "TJ-SUP-ORD-1"
