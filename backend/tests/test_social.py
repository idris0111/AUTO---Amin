from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from tests.conftest import register_and_login


def _admin_headers(client: TestClient, db: Session, payload: dict[str, str]) -> dict[str, str]:
    tokens = register_and_login(client, payload)
    user = db.scalar(select(User).where(User.email == payload["email"]))
    user.role = UserRole.ADMIN
    db.commit()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _seed_product(client: TestClient, headers: dict[str, str]) -> dict:
    category = client.post(
        "/api/v1/admin/categories", json={"name": "Suspension", "slug": "suspension"}, headers=headers
    ).json()
    brand = client.post(
        "/api/v1/admin/brands", json={"name": "KYB", "slug": "kyb"}, headers=headers
    ).json()
    product = client.post(
        "/api/v1/admin/products",
        json={
            "name": "KYB Excel-G Shock Absorber",
            "sku": "KYB-334121",
            "slug": "kyb-excel-g-shock",
            "brand_id": brand["id"],
            "category_id": category["id"],
            "price": "560.00",
            "stock_quantity": 6,
            "status": "active",
        },
        headers=headers,
    )
    assert product.status_code == 201, product.text
    return product.json()


def test_favorite_toggle_and_list(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    admin = _admin_headers(client, db, {**user_payload, "email": "fav-admin@example.com"})
    product = _seed_product(client, admin)

    customer = register_and_login(client, {**user_payload, "email": "fav-user@example.com"})
    headers = {"Authorization": f"Bearer {customer['access_token']}"}

    on = client.post(f"/api/v1/favorites/{product['id']}", headers=headers)
    assert on.status_code == 200
    assert on.json()["is_favorite"] is True

    listed = client.get("/api/v1/favorites", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    off = client.post(f"/api/v1/favorites/{product['id']}", headers=headers)
    assert off.json()["is_favorite"] is False
    assert client.get("/api/v1/favorites", headers=headers).json() == []


def test_review_flow_and_rating_recalculation(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    admin = _admin_headers(client, db, {**user_payload, "email": "rev-admin@example.com"})
    product = _seed_product(client, admin)

    customer = register_and_login(client, {**user_payload, "email": "rev-user@example.com"})
    headers = {"Authorization": f"Bearer {customer['access_token']}"}

    created = client.post(
        f"/api/v1/products/{product['id']}/reviews",
        json={"rating": 5, "text": "Отличный амортизатор, машина как новая."},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["is_verified_purchase"] is False
    assert body["status"] == "pending"

    duplicate = client.post(
        f"/api/v1/products/{product['id']}/reviews",
        json={"rating": 4, "text": "Повторная попытка написать отзыв."},
        headers=headers,
    )
    assert duplicate.status_code == 409

    public = client.get(f"/api/v1/products/{product['id']}/reviews")
    assert public.status_code == 200
    assert public.json() == []

    moderated = client.patch(
        f"/api/v1/admin/reviews/{body['id']}",
        json={"status": "approved"},
        headers=admin,
    )
    assert moderated.status_code == 200

    public = client.get(f"/api/v1/products/{product['id']}/reviews")
    assert len(public.json()) == 1
    assert public.json()[0]["author_name"]

    detail = client.get(f"/api/v1/catalog/products/{product['slug']}")
    assert detail.json()["rating_avg"] == "5.00"
    assert detail.json()["rating_count"] == 1
