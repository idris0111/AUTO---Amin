from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from tests.conftest import register_and_login


def _admin(client: TestClient, db: Session, payload: dict[str, str]) -> dict[str, str]:
    tokens = register_and_login(client, payload)
    user = db.scalar(select(User).where(User.email == payload["email"]))
    user.role = UserRole.ADMIN
    db.commit()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_coupon_admin_crud_and_validate(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    admin = _admin(client, db, {**user_payload, "email": "coupon-admin@example.com"})

    created = client.post(
        "/api/v1/admin/coupons",
        json={"code": "welcome10", "type": "percent", "value": "10", "min_order_amount": "100"},
        headers=admin,
    )
    assert created.status_code == 201, created.text
    coupon_id = created.json()["id"]
    assert created.json()["code"] == "WELCOME10"

    duplicate = client.post(
        "/api/v1/admin/coupons",
        json={"code": "welcome10", "type": "percent", "value": "5"},
        headers=admin,
    )
    assert duplicate.status_code == 409

    ok = client.post(
        "/api/v1/coupons/validate",
        json={"code": "welcome10", "subtotal": "200.00"},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json() == {"code": "WELCOME10", "discount": "20.00"}

    below_min = client.post(
        "/api/v1/coupons/validate",
        json={"code": "welcome10", "subtotal": "50.00"},
    )
    assert below_min.status_code == 400

    updated = client.patch(
        f"/api/v1/admin/coupons/{coupon_id}",
        json={"value": "15", "is_active": False},
        headers=admin,
    )
    assert updated.status_code == 200
    assert updated.json()["value"] == "15.00"
    assert updated.json()["is_active"] is False

    deactivated = client.post(
        "/api/v1/coupons/validate",
        json={"code": "welcome10", "subtotal": "200.00"},
    )
    assert deactivated.status_code == 404

    deleted = client.delete(f"/api/v1/admin/coupons/{coupon_id}", headers=admin)
    assert deleted.status_code == 204
    assert client.get("/api/v1/admin/coupons", headers=admin).json() == []


def test_checkout_with_fixed_coupon(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    admin_headers = _admin(client, db, {**user_payload, "email": "coupon-co-admin@example.com"})
    category = client.post(
        "/api/v1/admin/categories", json={"name": "Coupons Cat", "slug": "coupons-cat"}, headers=admin_headers
    ).json()
    brand = client.post(
        "/api/v1/admin/brands", json={"name": "Coupons Brand", "slug": "coupons-brand"}, headers=admin_headers
    ).json()
    product = client.post(
        "/api/v1/admin/products",
        json={
            "name": "Coupon Test Part",
            "sku": "CPN-001",
            "slug": "coupon-test-part",
            "brand_id": brand["id"],
            "category_id": category["id"],
            "price": "1000.00",
            "stock_quantity": 10,
            "status": "active",
        },
        headers=admin_headers,
    ).json()
    coupon = client.post(
        "/api/v1/admin/coupons",
        json={"code": "FIXED50", "type": "fixed", "value": "50"},
        headers=admin_headers,
    ).json()
    assert coupon["code"] == "FIXED50"

    tokens = register_and_login(client, {**user_payload, "email": "coupon-checkout@example.com"})
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    cart = client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)
    assert cart.status_code in (200, 201), cart.text

    order = client.post(
        "/api/v1/orders/checkout",
        json={
            "contact_name": "Тест Купон",
            "contact_phone": "+992900000000",
            "shipping_method": "pickup",
            "payment_method": "cash_on_delivery",
            "shipping_city": "Душанбе",
            "shipping_street": "Рудаки 1",
            "coupon_code": "fixed50",
        },
        headers=headers,
    )
    assert order.status_code == 201, order.text
    body = order.json()
    assert Decimal(body["discount"]) == Decimal("50.00")
    assert Decimal(body["total"]) == Decimal("1950.00")
    assert body["coupon_code"] == "FIXED50"

    coupon_after = client.get("/api/v1/admin/coupons", headers=admin_headers)
    used = next(c for c in coupon_after.json() if c["code"] == "FIXED50")
    assert used["used_count"] == 1

    reused = client.post(
        "/api/v1/coupons/validate",
        json={"code": "FIXED50", "subtotal": "100.00"},
    )
    assert reused.status_code == 200
