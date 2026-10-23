from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.commerce import Order
from app.models.user import User, UserRole
from tests.conftest import register_and_login


def _seed_product(db: Session, price: Decimal = Decimal("500.00"), stock: int = 20) -> Product:
    cat = Category(name="Тормозная система", slug=f"cat-{price}", position=1)
    brand = Brand(name="Bosch", slug=f"bosch-{price}")
    db.add_all([cat, brand])
    db.flush()
    prod = Product(
        name="Тормозной диск Bosch",
        sku=f"SKU-{price}",
        slug=f"bosch-disc-{price}",
        brand_id=brand.id,
        category_id=cat.id,
        price=price,
        stock_quantity=stock,
        status=ProductStatus.ACTIVE,
    )
    db.add(prod)
    db.commit()
    return prod


def test_loyalty_account_creation_welcome_bonus(
    client: TestClient, user_payload: dict[str, str]
) -> None:
    tokens = register_and_login(client, {**user_payload, "email": "loyalty-user1@example.com"})
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    res = client.get("/api/v1/loyalty/me", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["points_balance"] == 100
    assert data["lifetime_points"] == 100
    assert data["total_spent"] == "0.00"
    assert data["tier_info"]["current_tier"] == "silver"
    assert data["tier_info"]["cashback_percent"] == 3
    assert len(data["recent_transactions"]) == 1
    assert data["recent_transactions"][0]["type"] == "welcome"
    assert data["recent_transactions"][0]["amount"] == 100


def test_quote_points_discount(
    client: TestClient, user_payload: dict[str, str]
) -> None:
    tokens = register_and_login(client, {**user_payload, "email": "loyalty-user2@example.com"})
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Cart subtotal 500 TJS, user has 100 points. 30% of 500 = 150 max. User balance = 100 max.
    res = client.post(
        "/api/v1/loyalty/quote-discount?subtotal=500.00",
        json={"points": 40},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["points_applied"] == 40
    assert data["discount_amount"] == "40"
    assert data["remaining_balance"] == 60
    assert data["max_allowed_points"] == 100


def test_checkout_with_points_redemption_and_cancellation_refund(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    tokens = register_and_login(client, {**user_payload, "email": "loyalty-user3@example.com"})
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    prod = _seed_product(db, price=Decimal("400.00"), stock=10)

    # Add to cart
    add_res = client.post(
        "/api/v1/cart/items",
        json={"product_id": str(prod.id), "quantity": 1},
        headers=headers,
    )
    assert add_res.status_code == 201

    # Checkout redeeming 60 points
    checkout_payload = {
        "contact_name": "Test Customer",
        "contact_phone": "+992900000000",
        "contact_email": "loyalty-user3@example.com",
        "shipping_method": "pickup",
        "payment_method": "cash_on_delivery",
        "shipping_city": "Душанбе",
        "shipping_street": "Рудаки 1",
        "points_to_redeem": 60,
    }
    order_res = client.post("/api/v1/orders/checkout", json=checkout_payload, headers=headers)
    assert order_res.status_code == 201, order_res.text
    order_data = order_res.json()
    order_id = order_data["id"]

    assert order_data["subtotal"] == "400.00"
    assert order_data["points_redeemed"] == 60
    assert order_data["points_discount"] == "60.00"
    # total is 400 - 60 = 340
    assert order_data["total"] == "340.00"

    # Verify loyalty account balance deducted from 100 to 40
    account_res = client.get("/api/v1/loyalty/me", headers=headers)
    assert account_res.status_code == 200
    account_data = account_res.json()
    assert account_data["points_balance"] == 40
    tx_types = [t["type"] for t in account_data["recent_transactions"]]
    assert "redemption" in tx_types

    # Cancel order -> points must be refunded
    cancel_res = client.post(f"/api/v1/orders/{order_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200

    # Verify loyalty points restored back to 100
    account_after_cancel = client.get("/api/v1/loyalty/me", headers=headers).json()
    assert account_after_cancel["points_balance"] == 100
    tx_types_after = [t["type"] for t in account_after_cancel["recent_transactions"]]
    assert "refund" in tx_types_after


def test_order_completion_accrues_cashback_and_tier_upgrade(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    # 1. Register customer
    cust_tokens = register_and_login(client, {**user_payload, "email": "loyalty-buyer@example.com"})
    cust_headers = {"Authorization": f"Bearer {cust_tokens['access_token']}"}

    # 2. Register admin
    admin_tokens = register_and_login(client, {**user_payload, "email": "loyalty-admin@example.com"})
    admin_user = db.scalar(select(User).where(User.email == "loyalty-admin@example.com"))
    admin_user.role = UserRole.ADMIN
    db.commit()
    admin_headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

    prod = _seed_product(db, price=Decimal("3500.00"), stock=5)

    client.post(
        "/api/v1/cart/items",
        json={"product_id": str(prod.id), "quantity": 1},
        headers=cust_headers,
    )
    order_res = client.post(
        "/api/v1/orders/checkout",
        json={
            "contact_name": "Buyer",
            "contact_phone": "+992900000000",
            "shipping_method": "pickup",
            "payment_method": "cash_on_delivery",
            "shipping_city": "Душанбе",
            "shipping_street": "Рудаки 2",
            "points_to_redeem": 0,
        },
        headers=cust_headers,
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # Admin moves order: pending -> confirmed -> processing -> packed -> shipped -> delivered -> completed
    for target in ["confirmed", "processing", "packed", "shipped", "delivered", "completed"]:
        chg = client.patch(
            f"/api/v1/admin/orders/{order_id}/status",
            json={"status": target},
            headers=admin_headers,
        )
        assert chg.status_code == 200, f"Failed on {target}: {chg.text}"

    # Customer loyalty check
    acc = client.get("/api/v1/loyalty/me", headers=cust_headers).json()
    # 3500 TJS qualifies for GOLD tier (>= 3000 TJS)!
    assert acc["tier_info"]["current_tier"] == "gold"
    assert acc["tier_info"]["cashback_percent"] == 5
    # Cashback: 5% of 3500 = 175 points earned! + 100 welcome = 275 points
    assert acc["points_balance"] == 275
    assert acc["lifetime_points"] == 275
    tx_types = [t["type"] for t in acc["recent_transactions"]]
    assert "accrual" in tx_types

