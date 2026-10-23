import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.vehicle import ProductCompatibility, VehicleMake, VehicleModel


def test_get_quick_symptoms(client: TestClient) -> None:
    response = client.get("/api/v1/ai/symptoms")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    ids = [item["id"] for item in data]
    assert "brake_squeak" in ids
    assert "suspension_knock" in ids
    assert "battery_start" in ids


def test_diagnose_brakes_symptom(client: TestClient, db: Session) -> None:
    # Seed a category and product for brakes
    category = Category(
        name="Тормозная система",
        slug="brake-system",
        description="Колодки и диски",
        position=1,
    )
    brand = Brand(name="Brembo", slug="brembo")
    db.add_all([category, brand])
    db.flush()

    product = Product(
        name="Колодки передние Brembo",
        sku="BR-TEST-001",
        slug="brembo-test-pads",
        brand_id=brand.id,
        category_id=category.id,
        price=Decimal("450.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    db.add(product)
    db.commit()

    payload = {
        "symptom": "Скрипят передние тормоза при нажатии на педаль на перекрестках",
    }
    response = client.post("/api/v1/ai/diagnose", json=payload)
    assert response.status_code == 200
    result = response.json()

    assert result["system_affected"] == "Тормозная система"
    assert result["urgency"] == "high"
    assert result["can_drive"] is True
    assert len(result["diagnostic_steps"]) >= 3
    assert len(result["possible_causes"]) >= 2
    assert "Brembo" in result["recommended_products"][0]["name"]
    assert result["recommended_products"][0]["sku"] == "BR-TEST-001"
    assert result["recommended_products"][0]["fitment_status"] == "unknown"


def test_diagnose_with_vehicle_fitment(client: TestClient, db: Session) -> None:
    # Seed category, brand, product and vehicle make/model
    category = Category(
        name="Подвеска",
        slug="suspension",
        description="Амортизаторы и рычаги",
        position=2,
    )
    brand = Brand(name="Sachs", slug="sachs")
    db.add_all([category, brand])
    db.flush()

    product = Product(
        name="Амортизатор передний Sachs",
        sku="SCH-TEST-002",
        slug="sachs-test-shock",
        brand_id=brand.id,
        category_id=category.id,
        price=Decimal("890.00"),
        stock_quantity=5,
        status=ProductStatus.ACTIVE,
    )
    db.add(product)
    db.flush()

    make = VehicleMake(name="Toyota", slug="toyota")
    db.add(make)
    db.flush()
    model = VehicleModel(make_id=make.id, name="Camry", slug="camry")
    db.add(model)
    db.flush()

    # Add compatibility
    compat = ProductCompatibility(
        product_id=product.id,
        make_id=make.id,
        model_id=model.id,
    )
    db.add(compat)
    db.commit()

    payload = {
        "symptom": "Глухой стук в передней подвеске на ямах и лежачих полицейских",
        "make_id": str(make.id),
        "model_id": str(model.id),
        "year": 2020,
    }
    response = client.post("/api/v1/ai/diagnose", json=payload)
    assert response.status_code == 200
    result = response.json()

    assert result["system_affected"] == "Подвеска и рулевое управление"
    assert result["vehicle_summary"] is not None
    assert "Toyota Camry" in result["vehicle_summary"]

    recommended = result["recommended_products"]
    assert len(recommended) >= 1
    # Check that compatible product is marked compatible
    matching = [p for p in recommended if p["sku"] == "SCH-TEST-002"]
    assert len(matching) == 1
    assert matching[0]["fitment_status"] == "compatible"


def test_diagnose_validation_error(client: TestClient) -> None:
    # Symptom too short (< 3 characters)
    response = client.post("/api/v1/ai/diagnose", json={"symptom": "ok"})
    assert response.status_code == 422

