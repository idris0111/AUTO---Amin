import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.commerce import Order
from app.models.inventory import Warehouse, WarehouseStock


def _seed_quick_product(db: Session, stock: int = 5) -> Product:
    brand = db.scalar(select(Brand).where(Brand.name == "Porsche Tequipment"))
    if not brand:
        brand = Brand(name="Porsche Tequipment", slug=f"porsche-{uuid.uuid4().hex[:6]}")
        db.add(brand)
        db.flush()

    category = db.scalar(select(Category).where(Category.name == "Тормозная система"))
    if not category:
        category = Category(name="Тормозная система", slug=f"brakes-{uuid.uuid4().hex[:6]}")
        db.add(category)
        db.flush()

    product = Product(
        name="Тормозной диск Porsche Ceramic Composite Brake",
        slug=f"porsche-pccb-{uuid.uuid4().hex[:8]}",
        sku=f"PCCB-{uuid.uuid4().hex[:6].upper()}",
        price=Decimal("12500.00"),
        stock_quantity=stock,
        status=ProductStatus.ACTIVE,
        category_id=category.id,
        brand_id=brand.id,
    )
    db.add(product)
    db.flush()

    warehouse = db.scalar(select(Warehouse).where(Warehouse.is_default.is_(True)))
    if not warehouse:
        warehouse = Warehouse(code=f"WH-{uuid.uuid4().hex[:6]}", name="Основной склад Душанбе", is_default=True, is_active=True)
        db.add(warehouse)
        db.flush()

    wh_stock = WarehouseStock(
        warehouse_id=warehouse.id,
        product_id=product.id,
        quantity=stock,
    )
    db.add(wh_stock)
    db.commit()
    db.refresh(product)
    return product


def test_quick_order_guest_success(client: TestClient, db: Session) -> None:
    prod = _seed_quick_product(db, stock=10)

    payload = {
        "product_id": str(prod.id),
        "quantity": 2,
        "customer_name": "Рустам Каримов",
        "customer_phone": "+992901234567",
        "contact_method": "whatsapp",
        "comment": "Позвоните перед доставкой в районе Исмоили Сомони",
    }

    res = client.post("/api/v1/orders/quick-order", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "order_id" in data
    assert data["order_number"].startswith("AU-")
    assert Decimal(str(data["total"])) == Decimal("25000.00")
    assert "успешно" in data["message"].lower()

    # Verify order in DB
    order = db.scalar(select(Order).where(Order.id == uuid.UUID(data["order_id"])))
    assert order is not None
    assert order.contact_name == "Рустам Каримов"
    assert "whatsapp" in order.customer_note.lower()

    # Verify stock reduction
    db.refresh(prod)
    assert prod.stock_quantity == 8


def test_quick_order_insufficient_stock(client: TestClient, db: Session) -> None:
    prod = _seed_quick_product(db, stock=1)

    payload = {
        "product_id": str(prod.id),
        "quantity": 5,
        "customer_name": "Азиз",
        "customer_phone": "+992931112233",
        "contact_method": "phone",
    }

    res = client.post("/api/v1/orders/quick-order", json=payload)
    assert res.status_code == 409
    assert "Недостаточно товара" in res.json()["detail"]
