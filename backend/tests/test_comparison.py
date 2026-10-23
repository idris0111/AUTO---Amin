import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductSpecification, ProductStatus
from app.models.vehicle import ProductCompatibility, VehicleMake, VehicleModel


def test_compare_products_same_category(client: TestClient, db: Session) -> None:
    category = Category(name="Тормозные колодки", slug="test-compare-pads", position=1)
    brand_a = Brand(name="Brembo", slug="test-brembo-comp")
    brand_b = Brand(name="Bosch", slug="test-bosch-comp")
    db.add_all([category, brand_a, brand_b])
    db.flush()

    prod_1 = Product(
        name="Колодки передние Brembo",
        sku="CMP-001",
        slug="cmp-brembo-001",
        brand_id=brand_a.id,
        category_id=category.id,
        price=Decimal("600.00"),
        old_price=Decimal("700.00"),
        stock_quantity=15,
        status=ProductStatus.ACTIVE,
    )
    prod_1.specifications.append(
        ProductSpecification(name="Ось", value="Передняя", position=0)
    )
    prod_1.specifications.append(
        ProductSpecification(name="Материал", value="Керамика", position=1)
    )

    prod_2 = Product(
        name="Колодки передние Bosch",
        sku="CMP-002",
        slug="cmp-bosch-002",
        brand_id=brand_b.id,
        category_id=category.id,
        price=Decimal("450.00"),
        old_price=None,
        stock_quantity=8,
        status=ProductStatus.ACTIVE,
    )
    prod_2.specifications.append(
        ProductSpecification(name="Ось", value="Передняя", position=0)
    )
    prod_2.specifications.append(
        ProductSpecification(name="Материал", value="Полуметалл", position=1)
    )

    db.add_all([prod_1, prod_2])
    db.commit()

    response = client.get(
        "/api/v1/catalog/products/compare",
        params={"ids": [str(prod_1.id), str(prod_2.id)]},
    )
    assert response.status_code == 200, response.text
    data = response.json()

    assert len(data["products"]) == 2
    assert data["is_same_category"] is True
    assert "Ось" in data["all_spec_names"]
    assert "Материал" in data["all_spec_names"]

    matrix = {row["name"]: row for row in data["specifications_matrix"]}
    # 'Ось' is identical for both ("Передняя")
    assert matrix["Ось"]["is_different"] is False
    # 'Материал' is different ("Керамика" vs "Полуметалл")
    assert matrix["Материал"]["is_different"] is True


def test_compare_products_different_categories(client: TestClient, db: Session) -> None:
    cat_1 = Category(name="Фильтры", slug="test-cat-filters-comp", position=1)
    cat_2 = Category(name="Масла", slug="test-cat-oils-comp", position=2)
    brand = Brand(name="Mann", slug="test-mann-comp")
    db.add_all([cat_1, cat_2, brand])
    db.flush()

    prod_1 = Product(
        name="Фильтр масляный",
        sku="CMP-FILT",
        slug="cmp-filt",
        brand_id=brand.id,
        category_id=cat_1.id,
        price=Decimal("50.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    prod_2 = Product(
        name="Масло моторное",
        sku="CMP-OIL",
        slug="cmp-oil",
        brand_id=brand.id,
        category_id=cat_2.id,
        price=Decimal("200.00"),
        stock_quantity=5,
        status=ProductStatus.ACTIVE,
    )
    db.add_all([prod_1, prod_2])
    db.commit()

    response = client.get(
        "/api/v1/catalog/products/compare",
        params={"ids": [str(prod_1.id), str(prod_2.id)]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_same_category"] is False


def test_compare_products_with_fitment(client: TestClient, db: Session) -> None:
    cat = Category(name="Амортизаторы", slug="test-cat-shocks-comp", position=1)
    brand = Brand(name="Sachs", slug="test-sachs-comp")
    make = VehicleMake(name="Toyota", slug="test-toyota-comp")
    db.add_all([cat, brand, make])
    db.flush()

    model = VehicleModel(make_id=make.id, name="Camry", slug="test-camry-comp")
    db.add(model)
    db.flush()

    other_model = VehicleModel(make_id=make.id, name="Corolla", slug="test-corolla-comp")
    db.add(other_model)
    db.flush()

    prod_compat = Product(
        name="Стойка амортизатора Camry",
        sku="CMP-SHOCK-1",
        slug="cmp-shock-1",
        brand_id=brand.id,
        category_id=cat.id,
        price=Decimal("800.00"),
        stock_quantity=4,
        status=ProductStatus.ACTIVE,
    )
    prod_other = Product(
        name="Стойка амортизатора Corolla",
        sku="CMP-SHOCK-2",
        slug="cmp-shock-2",
        brand_id=brand.id,
        category_id=cat.id,
        price=Decimal("750.00"),
        stock_quantity=6,
        status=ProductStatus.ACTIVE,
    )
    db.add_all([prod_compat, prod_other])
    db.flush()

    # prod_compat fits Camry, prod_other fits Corolla
    db.add(
        ProductCompatibility(
            product_id=prod_compat.id,
            make_id=make.id,
            model_id=model.id,
        )
    )
    db.add(
        ProductCompatibility(
            product_id=prod_other.id,
            make_id=make.id,
            model_id=other_model.id,
        )
    )
    db.commit()

    response = client.get(
        "/api/v1/catalog/products/compare",
        params={
            "ids": [str(prod_compat.id), str(prod_other.id)],
            "make_id": str(make.id),
            "model_id": str(model.id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    products = {p["sku"]: p for p in data["products"]}
    assert products["CMP-SHOCK-1"]["fitment"] == "compatible"
    assert products["CMP-SHOCK-2"]["fitment"] == "not_compatible"
