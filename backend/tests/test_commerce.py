from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from tests.conftest import register_and_login


def setup_admin_product(client: TestClient, db: Session, user_payload: dict[str, str], email: str) -> dict:
    tokens = register_and_login(client, {**user_payload, "email": email})
    user = db.scalar(select(User).where(User.email == email))
    user.role = UserRole.ADMIN
    db.commit()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    category = client.post(
        "/api/v1/admin/categories", json={"name": "Filters", "slug": "filters"}, headers=headers
    ).json()
    brand = client.post(
        "/api/v1/admin/brands", json={"name": "Mann", "slug": "mann"}, headers=headers
    ).json()
    product = client.post(
        "/api/v1/admin/products",
        json={
            "name": "Oil Filter W 712/95",
            "sku": "W71295",
            "slug": "mann-oil-filter",
            "brand_id": brand["id"],
            "category_id": category["id"],
            "price": "45.00",
            "stock_quantity": 5,
            "status": "active",
        },
        headers=headers,
    )
    assert product.status_code == 201, product.text
    return {**tokens, "headers": headers, "product": product.json()}


def test_guest_cart_flow(client: TestClient, db: Session, user_payload: dict[str, str]) -> None:
    admin_tokens = setup_admin_product(client, db, user_payload, "cart-admin@example.com")
    guest_id = "guest-123"
    guest_headers = {"X-Guest-Id": guest_id}
    product_id = admin_tokens["product"]["id"]

    empty = client.get("/api/v1/cart", headers=guest_headers)
    assert empty.status_code == 200
    assert empty.json()["items"] == []

    added = client.post(
        "/api/v1/cart/items", json={"product_id": product_id, "quantity": 2}, headers=guest_headers
    )
    assert added.status_code == 201, added.text
    body = added.json()
    assert body["count"] == 2
    assert body["subtotal"] == "90.00"

    item_id = body["items"][0]["id"]
    updated = client.patch(f"/api/v1/cart/items/{item_id}", json={"quantity": 3}, headers=guest_headers)
    assert updated.json()["count"] == 3

    too_many = client.patch(f"/api/v1/cart/items/{item_id}", json={"quantity": 50}, headers=guest_headers)
    assert too_many.status_code == 400

    removed = client.delete(f"/api/v1/cart/items/{item_id}", headers=guest_headers)
    assert removed.json()["items"] == []


def test_checkout_and_order_lifecycle(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    admin = setup_admin_product(client, db, user_payload, "order-admin@example.com")
    product_id = admin["product"]["id"]

    customer = register_and_login(client, {**user_payload, "email": "buyer@example.com"})
    headers = {"Authorization": f"Bearer {customer['access_token']}"}

    guest_id = "guest-checkout"
    client.post(
        "/api/v1/cart/items",
        json={"product_id": product_id, "quantity": 2},
        headers={"X-Guest-Id": guest_id, **headers},
    )
    merged = client.post("/api/v1/cart/merge", headers={"X-Guest-Id": guest_id, **headers})
    assert merged.status_code == 200

    order = client.post(
        "/api/v1/orders/checkout",
        json={
            "contact_name": "Test Buyer",
            "contact_phone": "+992900000000",
            "shipping_method": "pickup",
            "payment_method": "cash_on_delivery",
            "shipping_city": "Dushanbe",
            "shipping_street": "Rudaki 1",
        },
        headers=headers,
    )
    assert order.status_code == 201, order.text
    body = order.json()
    assert body["total"] == "90.00"
    assert body["status"] == "pending"
    order_id = body["id"]

    stock = client.get("/api/v1/catalog/products/mann-oil-filter").json()["stock_quantity"]
    assert stock == 3

    listed = client.get("/api/v1/orders", headers=headers)
    assert listed.json()["total"] == 1

    detail = client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert detail.status_code == 200
    assert len(detail.json()["items"]) == 1

    forbidden = client.get(
        f"/api/v1/orders/{order_id}",
        headers={"Authorization": f"Bearer {admin['access_token']}"},
    )
    assert forbidden.status_code == 404

    status_change = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "confirmed"},
        headers=admin["headers"],
    )
    assert status_change.status_code == 200, status_change.text

    invalid_transition = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "delivered"},
        headers=admin["headers"],
    )
    assert invalid_transition.status_code == 400

    cancelled = client.post(f"/api/v1/orders/{order_id}/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    restored_stock = client.get("/api/v1/catalog/products/mann-oil-filter").json()["stock_quantity"]
    assert restored_stock == 5

    reorder = client.post(f"/api/v1/orders/{order_id}/reorder", headers=headers)
    assert reorder.status_code == 200
    assert reorder.json()["count"] == 2


def test_restock_on_customer_cancel(client: TestClient, db: Session, user_payload: dict[str, str]) -> None:
    admin = setup_admin_product(client, db, user_payload, "cancel-admin@example.com")
    customer = register_and_login(client, {**user_payload, "email": "cancel-user@example.com"})
    headers = {"Authorization": f"Bearer {customer['access_token']}"}
    client.post(
        "/api/v1/cart/items", json={"product_id": admin["product"]["id"], "quantity": 1}, headers=headers
    )
    order = client.post(
        "/api/v1/orders/checkout",
        json={
            "contact_name": "Cancel User",
            "contact_phone": "+992900000001",
            "shipping_method": "pickup",
            "payment_method": "cash_on_delivery",
            "shipping_city": "Dushanbe",
            "shipping_street": "Somewhere 1",
        },
        headers=headers,
    )
    assert order.status_code == 201
    stock = client.get("/api/v1/catalog/products/mann-oil-filter").json()["stock_quantity"]
    assert stock == 4
    client.post(f"/api/v1/orders/{order.json()['id']}/cancel", headers=headers)
    stock = client.get("/api/v1/catalog/products/mann-oil-filter").json()["stock_quantity"]
    assert stock == 5


def test_admin_stock_adjustment_and_admin_cancel(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    admin = setup_admin_product(client, db, user_payload, "stock-adjust-admin@example.com")
    product_id = admin["product"]["id"]

    # Increase stock by 10
    res = client.post(
        f"/api/v1/admin/products/{product_id}/stock-adjust",
        json={"delta": 10, "reason": "Приход от поставщика"},
        headers=admin["headers"],
    )
    assert res.status_code == 200
    assert res.json()["stock_quantity"] == 15

    # Decrease stock by 3
    res = client.post(
        f"/api/v1/admin/products/{product_id}/stock-adjust",
        json={"delta": -3, "reason": "Списание брака"},
        headers=admin["headers"],
    )
    assert res.status_code == 200
    assert res.json()["stock_quantity"] == 12

    # Cannot reduce below 0 (409 Conflict)
    res_fail = client.post(
        f"/api/v1/admin/products/{product_id}/stock-adjust",
        json={"delta": -100, "reason": "Слишком много"},
        headers=admin["headers"],
    )
    assert res_fail.status_code == 409

    # Customer orders 2
    customer = register_and_login(client, {**user_payload, "email": "buyer2@example.com"})
    headers = {"Authorization": f"Bearer {customer['access_token']}"}
    client.post(
        "/api/v1/cart/items", json={"product_id": product_id, "quantity": 2}, headers=headers
    )
    order_res = client.post(
        "/api/v1/orders/checkout",
        json={
            "contact_name": "Buyer Two",
            "contact_phone": "+992900000002",
            "shipping_method": "pickup",
            "payment_method": "cash_on_delivery",
            "shipping_city": "Dushanbe",
            "shipping_street": "Rudaki 2",
        },
        headers=headers,
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # Stock is now 10
    stock = client.get("/api/v1/catalog/products/mann-oil-filter").json()["stock_quantity"]
    assert stock == 10

    # Admin cancels order -> restocks to 12
    cancel_res = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "cancelled", "note": "Клиент передумал"},
        headers=admin["headers"],
    )
    assert cancel_res.status_code == 200
    stock_after_cancel = client.get("/api/v1/catalog/products/mann-oil-filter").json()["stock_quantity"]
    assert stock_after_cancel == 12
