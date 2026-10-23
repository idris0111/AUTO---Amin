import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.commerce import Order, OrderItem, PaymentMethod, ShippingMethod
from app.models.user import User, UserRole
from app.models.vehicle import ProductCompatibility, UserVehicle, VehicleMake, VehicleModel


def test_garage_recommendations(client: TestClient, db: Session) -> None:
    cat_filter = Category(name="Фильтры", slug="filters-pers-test", position=1)
    brand = Brand(name="Mann", slug="mann-pers-test")
    make = VehicleMake(name="Toyota", slug="toyota-pers-test")
    db.add_all([cat_filter, brand, make])
    db.flush()

    model = VehicleModel(make_id=make.id, name="Camry", slug="camry-pers-test")
    db.add(model)
    db.flush()

    user = User(
        email="test_pers_user@example.com",
        password_hash="fakehash",
        first_name="Pers",
        last_name="User",
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    db.flush()

    vehicle = UserVehicle(
        user_id=user.id,
        make_id=make.id,
        model_id=model.id,
        name="Моя Камри",
        year=2021,
        is_primary=True,
    )
    db.add(vehicle)
    db.flush()

    prod_filter = Product(
        name="Фильтр масляный Camry",
        sku="MFL-PERS-01",
        slug="mfl-pers-01",
        brand_id=brand.id,
        category_id=cat_filter.id,
        price=Decimal("45.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    db.add(prod_filter)
    db.flush()

    db.add(
        ProductCompatibility(
            product_id=prod_filter.id,
            make_id=make.id,
            model_id=model.id,
        )
    )
    db.commit()

    response = client.get(
        "/api/v1/catalog/recommendations/garage",
        params={"vehicle_id": str(vehicle.id)},
    )
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["vehicle_id"] == str(vehicle.id)
    assert "Toyota Camry" in data["vehicle_name"]
    assert len(data["maintenance_parts"]) >= 1
    assert data["maintenance_parts"][0]["sku"] == "MFL-PERS-01"


def test_frequently_bought_together_with_order_history(client: TestClient, db: Session) -> None:
    cat = Category(name="Тормоза", slug="brakes-fbt-test", position=1)
    brand = Brand(name="Brembo", slug="brembo-fbt-test")
    db.add_all([cat, brand])
    db.flush()

    user = User(
        email="order_fbt_user@example.com",
        password_hash="fakehash",
        first_name="Buyer",
        last_name="Test",
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    db.flush()

    prod_pads = Product(
        name="Колодки передние Brembo",
        sku="BR-PADS-01",
        slug="br-pads-01",
        brand_id=brand.id,
        category_id=cat.id,
        price=Decimal("500.00"),
        old_price=Decimal("600.00"),
        stock_quantity=20,
        status=ProductStatus.ACTIVE,
    )
    prod_discs = Product(
        name="Диски тормозные Brembo",
        sku="BR-DISCS-01",
        slug="br-discs-01",
        brand_id=brand.id,
        category_id=cat.id,
        price=Decimal("1000.00"),
        stock_quantity=15,
        status=ProductStatus.ACTIVE,
    )
    db.add_all([prod_pads, prod_discs])
    db.flush()

    # Create an order with both items to simulate real purchase co-occurrence
    order = Order(
        user_id=user.id,
        number="AU-TEST-FBT-1",
        status="completed",
        shipping_method=ShippingMethod.COURIER,
        payment_method=PaymentMethod.CASH_ON_DELIVERY,
        subtotal=Decimal("1500.00"),
        total=Decimal("1500.00"),
        contact_name="Buyer Test",
        contact_phone="+992900000001",
        contact_email="buyer@example.com",
        shipping_city="Душанбе",
        shipping_street="Рудаки 1",
    )
    db.add(order)
    db.flush()

    db.add(
        OrderItem(
            order_id=order.id,
            product_id=prod_pads.id,
            product_name=prod_pads.name,
            product_sku=prod_pads.sku,
            quantity=1,
            unit_price=prod_pads.price,
            line_total=prod_pads.price,
        )
    )
    db.add(
        OrderItem(
            order_id=order.id,
            product_id=prod_discs.id,
            product_name=prod_discs.name,
            product_sku=prod_discs.sku,
            quantity=1,
            unit_price=prod_discs.price,
            line_total=prod_discs.price,
        )
    )
    db.commit()

    response = client.get(f"/api/v1/catalog/products/{prod_pads.slug}/frequently-bought-together")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["target_product_id"] == str(prod_pads.id)
    items = data["items"]
    assert len(items) >= 1
    assert items[0]["sku"] == "BR-DISCS-01"
    # Total bundle price = 500 + 1000 = 1500
    assert float(data["total_bundle_price"]) == 1500.0
