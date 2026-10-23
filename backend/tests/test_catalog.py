
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from tests.conftest import register_and_login


def make_admin(db: Session, user_payload: dict[str, str]) -> dict[str, str]:
    tokens = register_and_login(db_token_client_holder["client"], user_payload)
    user = db.scalar(select(User).where(User.email == user_payload["email"]))
    assert user is not None
    user.role = UserRole.ADMIN
    db.commit()
    return tokens


db_token_client_holder: dict[str, TestClient] = {}


CATEGORY = {"name": "Brake Pads", "slug": "brake-pads"}
BRAND = {"name": "Bosch", "slug": "bosch", "country": "Germany"}


def product_payload(brand_id: str, category_id: str) -> dict:
    return {
        "name": "Bosch Brake Pad Set",
        "sku": "BP-1001",
        "slug": "bosch-brake-pad-set",
        "brand_id": brand_id,
        "category_id": category_id,
        "price": "129.00",
        "old_price": "159.00",
        "stock_quantity": 10,
        "status": "active",
        "description": "Front axle brake pads for passenger cars",
        "images": [{"url": "https://cdn.example.com/pad.jpg", "alt": "Brake pad", "is_primary": True}],
        "specifications": [{"name": "Axle", "value": "Front"}, {"name": "Material", "value": "Ceramic"}],
        "oem_numbers": [{"number": "0986494542"}],
        "cross_references": [{"number": "BP-2001", "brand_name": "ATE"}],
    }


def setup_catalog(client: TestClient, db: Session, tokens: dict[str, str]) -> tuple[str, str]:
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    category = client.post("/api/v1/admin/categories", json=CATEGORY, headers=headers)
    assert category.status_code == 201, category.text
    brand = client.post("/api/v1/admin/brands", json=BRAND, headers=headers)
    assert brand.status_code == 201, brand.text
    return brand.json()["id"], category.json()["id"]


def test_admin_requires_permission(client: TestClient, user_payload: dict[str, str]) -> None:
    tokens = register_and_login(client, user_payload)
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.get("/api/v1/admin/categories", headers=headers).status_code == 403
    assert client.post("/api/v1/admin/categories", json=CATEGORY, headers=headers).status_code == 403


def test_product_crud_and_public_read(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    db_token_client_holder["client"] = client
    tokens = make_admin(db, user_payload)
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    brand_id, category_id = setup_catalog(client, db, tokens)

    created = client.post(
        "/api/v1/admin/products", json=product_payload(brand_id, category_id), headers=headers
    )
    assert created.status_code == 201, created.text
    product_id = created.json()["id"]

    duplicate = client.post(
        "/api/v1/admin/products", json=product_payload(brand_id, category_id), headers=headers
    )
    assert duplicate.status_code == 409

    listed = client.get("/api/v1/catalog/products")
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Bosch Brake Pad Set"
    assert body["items"][0]["image_url"] == "https://cdn.example.com/pad.jpg"

    detail = client.get("/api/v1/catalog/products/bosch-brake-pad-set")
    assert detail.status_code == 200
    assert len(detail.json()["oem_numbers"]) == 1
    assert len(detail.json()["specifications"]) == 2

    updated = client.patch(
        f"/api/v1/admin/products/{product_id}",
        json={"price": "119.00", "status": "draft"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert client.get("/api/v1/catalog/products").json()["total"] == 0

    assert client.delete(f"/api/v1/admin/products/{product_id}", headers=headers).status_code == 204


def test_search_and_filters(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    db_token_client_holder["client"] = client
    tokens = make_admin(db, {**user_payload, "email": "search-admin@example.com"})
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    brand_id, category_id = setup_catalog(client, db, tokens)

    payload = product_payload(brand_id, category_id)
    payload.update({"sku": "OEM-998877", "slug": "oem-filter", "name": "Oil Filter Premium"})
    created = client.post("/api/v1/admin/products", json=payload, headers=headers)
    assert created.status_code == 201, created.text

    by_name = client.get("/api/v1/catalog/products", params={"q": "oil filter"})
    assert by_name.json()["total"] == 1

    by_sku = client.get("/api/v1/catalog/products", params={"q": "OEM-998877"})
    assert by_sku.json()["total"] == 1

    by_typo = client.get("/api/v1/catalog/products", params={"q": "oil filte"})
    assert by_typo.json()["total"] == 1

    cheap = client.get("/api/v1/catalog/products", params={"price_max": "50"})
    assert cheap.json()["total"] == 0

    discounted = client.get("/api/v1/catalog/products", params={"has_discount": True})
    assert discounted.json()["total"] == 1

    in_stock = client.get("/api/v1/catalog/products", params={"in_stock": True})
    assert in_stock.json()["total"] == 1


def test_vehicle_tree_and_garage(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    db_token_client_holder["client"] = client
    tokens = make_admin(db, {**user_payload, "email": "garage-admin@example.com"})
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    make = client.post(
        "/api/v1/admin/vehicles/makes",
        json={"name": "Toyota", "slug": "toyota", "country": "Japan"},
        headers=headers,
    )
    assert make.status_code == 201, make.text
    model = client.post(
        f"/api/v1/admin/vehicles/makes/{make.json()['id']}/models",
        json={"name": "Camry", "slug": "camry"},
        headers=headers,
    )
    assert model.status_code == 201, model.text
    generation = client.post(
        f"/api/v1/admin/vehicles/models/{model.json()['id']}/generations",
        json={"name": "XV70", "year_from": 2017, "year_to": 2024},
        headers=headers,
    )
    assert generation.status_code == 201, generation.text

    tree = client.get("/api/v1/vehicles")
    assert tree.status_code == 200
    assert tree.json()[0]["name"] == "Toyota"
    assert tree.json()[0]["models"][0]["generations"][0]["name"] == "XV70"

    customer = register_and_login(client, {**user_payload, "email": "driver@example.com"})
    garage_headers = {"Authorization": f"Bearer {customer['access_token']}"}
    created = client.post(
        "/api/v1/garage",
        json={
            "name": "My Camry",
            "make_id": make.json()["id"],
            "model_id": model.json()["id"],
            "generation_id": generation.json()["id"],
            "year": 2019,
            "is_primary": True,
        },
        headers=garage_headers,
    )
    assert created.status_code == 201, created.text
    assert created.json()["is_primary"] is True

    listed = client.get("/api/v1/garage", headers=garage_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    vehicle_id = created.json()["id"]
    other_user = register_and_login(client, {**user_payload, "email": "thief@example.com"})
    assert client.get(
        f"/api/v1/garage/{vehicle_id}",
        headers={"Authorization": f"Bearer {other_user['access_token']}"},
    ).status_code == 404

    assert client.delete(
        f"/api/v1/garage/{vehicle_id}", headers=garage_headers
    ).status_code == 204


def test_fitment_compatibility(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    db_token_client_holder["client"] = client
    tokens = make_admin(db, {**user_payload, "email": "fit-admin@example.com"})
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    brand_id, category_id = setup_catalog(client, db, tokens)

    make = client.post(
        "/api/v1/admin/vehicles/makes",
        json={"name": "Honda", "slug": "honda"},
        headers=headers,
    ).json()
    model = client.post(
        f"/api/v1/admin/vehicles/makes/{make['id']}/models",
        json={"name": "Civic", "slug": "civic"},
        headers=headers,
    ).json()
    other_make = client.post(
        "/api/v1/admin/vehicles/makes",
        json={"name": "Ford", "slug": "ford"},
        headers=headers,
    ).json()

    payload = product_payload(brand_id, category_id)
    payload.update({"slug": "civic-pads", "sku": "CIV-1", "name": "Civic Brake Pads"})
    product = client.post("/api/v1/admin/products", json=payload, headers=headers).json()

    compat = client.post(
        f"/api/v1/admin/products/{product['id']}/compatibilities",
        json={"make_id": make["id"], "model_id": model["id"], "year_from": 2016, "year_to": 2022},
        headers=headers,
    )
    assert compat.status_code == 201, compat.text

    customer = register_and_login(client, {**user_payload, "email": "civic-owner@example.com"})
    garage_headers = {"Authorization": f"Bearer {customer['access_token']}"}

    def add_vehicle(payload: dict) -> dict:
        response = client.post("/api/v1/garage", json=payload, headers=garage_headers)
        assert response.status_code == 201, response.text
        return response.json()

    good = add_vehicle(
        {
            "name": "Civic 2019",
            "make_id": make["id"],
            "model_id": model["id"],
            "year": 2019,
        }
    )
    wrong_year = add_vehicle(
        {
            "name": "Civic 2024",
            "make_id": make["id"],
            "model_id": model["id"],
            "year": 2024,
        }
    )
    other_brand = add_vehicle({"name": "Focus", "make_id": other_make["id"]})

    detail = client.get(
        "/api/v1/catalog/products/civic-pads",
        params={"vehicle_id": good["id"]},
        headers=garage_headers,
    )
    assert detail.json()["fitment"] == "compatible"

    detail = client.get(
        "/api/v1/catalog/products/civic-pads",
        params={"vehicle_id": wrong_year["id"]},
        headers=garage_headers,
    )
    assert detail.json()["fitment"] == "not_compatible"

    detail = client.get(
        "/api/v1/catalog/products/civic-pads",
        params={"vehicle_id": other_brand["id"]},
        headers=garage_headers,
    )
    assert detail.json()["fitment"] == "not_compatible"

    unlinked = client.post(
        "/api/v1/admin/products",
        json={**product_payload(brand_id, category_id), "slug": "unlinked", "sku": "UNL-1"},
        headers=headers,
    )
    assert unlinked.status_code == 201, unlinked.text
    detail = client.get(
        "/api/v1/catalog/products/unlinked",
        params={"vehicle_id": good["id"]},
        headers=garage_headers,
    )
    assert detail.json()["fitment"] == "unknown"
