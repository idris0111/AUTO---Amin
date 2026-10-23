from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus


def test_list_assemblies(client: TestClient) -> None:
    response = client.get("/api/v1/3d/assemblies")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3

    ids = [item["id"] for item in data]
    assert "brakes" in ids
    assert "suspension" in ids
    assert "timing_drive" in ids

    brakes = next(item for item in data if item["id"] == "brakes")
    assert brakes["title"] == "Передний тормозной узел в сборе"
    assert brakes["subsystem"] == "Тормозная система"
    assert brakes["parts_count"] >= 5


def test_get_assembly_detail_brakes(client: TestClient, db: Session) -> None:
    # Seed matching category and product
    category = Category(
        name="Тормозная система",
        slug="brake-system",
        description="Тормоза",
        position=1,
    )
    brand = Brand(name="Brembo 3D", slug="brembo-3d")
    db.add_all([category, brand])
    db.flush()

    disc = Product(
        name="Вентилируемый тормозной диск Brembo Sport",
        sku="3D-BR-001",
        slug="3d-brembo-sport-disc",
        brand_id=brand.id,
        category_id=category.id,
        price=Decimal("890.00"),
        stock_quantity=8,
        status=ProductStatus.ACTIVE,
    )
    db.add(disc)
    db.commit()

    response = client.get("/api/v1/3d/assemblies/brakes")
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == "brakes"
    assert "nodes" in data
    assert len(data["nodes"]) >= 5

    # Check node structure
    disc_node = next(n for n in data["nodes"] if n["node_id"] == "brake_disc")
    assert disc_node["name"] == "Вентилируемый тормозной диск"
    assert len(disc_node["exploded_offset"]) == 3
    assert disc_node["matching_product"] is not None
    assert disc_node["matching_product"]["id"] == str(disc.id)
    assert disc_node["matching_product"]["sku"] == "3D-BR-001"


def test_get_assembly_detail_suspension(client: TestClient) -> None:
    response = client.get("/api/v1/3d/assemblies/suspension")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "suspension"
    node_ids = [n["node_id"] for n in data["nodes"]]
    assert "shock_absorber" in node_ids
    assert "spring" in node_ids


def test_get_assembly_detail_timing(client: TestClient) -> None:
    response = client.get("/api/v1/3d/assemblies/timing_drive")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "timing_drive"
    node_ids = [n["node_id"] for n in data["nodes"]]
    assert "timing_belt" in node_ids
    assert "water_pump" in node_ids


def test_get_assembly_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/3d/assemblies/warp_drive")
    assert response.status_code == 404
