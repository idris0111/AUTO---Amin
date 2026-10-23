import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.commerce import Order, OrderItem, OrderStatus, PaymentMethod, ShippingMethod
from app.models.inventory import MovementType, StockMovement, Warehouse, WarehouseStock
from app.models.user import User, UserRole
from tests.conftest import register_and_login


def setup_admin_and_customer(client: TestClient, db: Session):
    admin_tokens = register_and_login(
        client,
        {
            "email": "admin_dash@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Админ",
            "last_name": "Главный",
        },
    )
    admin_user = db.scalar(select(User).where(User.email == "admin_dash@autouniverse.tj"))
    assert admin_user is not None
    admin_user.role = UserRole.ADMIN
    db.commit()

    cust_tokens = register_and_login(
        client,
        {
            "email": "customer_dash@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Иван",
            "last_name": "Покупатель",
        },
    )
    cust_user = db.scalar(select(User).where(User.email == "customer_dash@autouniverse.tj"))
    assert cust_user is not None

    return admin_tokens, admin_user, cust_user


def test_admin_users_filtering_and_patch(client: TestClient, db: Session) -> None:
    admin_tokens, admin_user, cust_user = setup_admin_and_customer(client, db)
    headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

    # 1. Filter by search query
    res = client.get("/api/v1/admin/users?q=Иван", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["email"] == "customer_dash@autouniverse.tj"

    # 2. Filter by role
    res = client.get("/api/v1/admin/users?role=customer", headers=headers)
    assert res.status_code == 200
    assert any(u["id"] == str(cust_user.id) for u in res.json())

    # 3. Patch user role and status
    res = client.patch(
        f"/api/v1/admin/users/{cust_user.id}",
        json={"role": "warehouse_manager", "is_active": False},
        headers=headers,
    )
    assert res.status_code == 200
    patched = res.json()
    assert patched["role"] == "warehouse_manager"
    assert patched["is_active"] is False


def test_admin_inventory_warehouses_and_movements(client: TestClient, db: Session) -> None:
    admin_tokens, admin_user, _ = setup_admin_and_customer(client, db)
    headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

    # Setup warehouse, brand, category, product, stock
    wh = Warehouse(code="DUSH-1", name="Главный распределительный склад", city="Душанбе", is_default=True)
    db.add(wh)
    db.flush()

    brand = Brand(name="Bosch Test", slug=f"bosch-test-{uuid.uuid4().hex[:6]}")
    cat = Category(name="Фильтры", slug=f"filters-{uuid.uuid4().hex[:6]}")
    db.add_all([brand, cat])
    db.flush()

    prod = Product(
        name="Масляный фильтр Bosch F026",
        sku=f"BOSCH-OIL-{uuid.uuid4().hex[:6]}",
        slug=f"bosch-oil-{uuid.uuid4().hex[:6]}",
        brand_id=brand.id,
        category_id=cat.id,
        price=Decimal("120.00"),
        stock_quantity=25,
        status=ProductStatus.ACTIVE,
    )
    db.add(prod)
    db.flush()

    stock_item = WarehouseStock(warehouse_id=wh.id, product_id=prod.id, quantity=25)
    movement = StockMovement(
        warehouse_id=wh.id,
        product_id=prod.id,
        movement_type=MovementType.RECEIPT,
        quantity_delta=25,
        balance_after=25,
        reason="Начальное оприходование партии",
    )
    db.add_all([stock_item, movement])
    db.commit()

    # Query warehouses
    res = client.get("/api/v1/admin/inventory/warehouses", headers=headers)
    assert res.status_code == 200
    wh_list = res.json()
    assert len(wh_list) >= 1
    found_wh = next(w for w in wh_list if w["id"] == str(wh.id))
    assert found_wh["code"] == "DUSH-1"
    assert found_wh["items_count"] >= 1

    # Query movements ledger
    res = client.get("/api/v1/admin/inventory/movements", headers=headers)
    assert res.status_code == 200
    mv_list = res.json()
    assert len(mv_list) >= 1
    found_mv = next(m for m in mv_list if m["product_id"] == str(prod.id))
    assert found_mv["quantity_delta"] == 25
    assert found_mv["product_name"] == prod.name
    assert found_mv["product_sku"] == prod.sku


def test_admin_order_detail_and_loyalty_adjust(client: TestClient, db: Session) -> None:
    admin_tokens, admin_user, cust_user = setup_admin_and_customer(client, db)
    headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

    # Setup real product for order item FK
    brand = Brand(name="NGK Brand", slug=f"ngk-{uuid.uuid4().hex[:6]}")
    cat = Category(name="Зажигание", slug=f"ignition-{uuid.uuid4().hex[:6]}")
    db.add_all([brand, cat])
    db.flush()

    prod = Product(
        name="Свеча зажигания NGK Laser Iridium",
        sku="NGK-ILZKR7B11",
        slug=f"ngk-spark-{uuid.uuid4().hex[:6]}",
        brand_id=brand.id,
        category_id=cat.id,
        price=Decimal("75.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    db.add(prod)
    db.flush()

    # Create test order
    order = Order(
        number=f"TJ-ADMIN-{uuid.uuid4().hex[:6].upper()}",
        user_id=cust_user.id,
        status=OrderStatus.PENDING,
        currency="TJS",
        subtotal=Decimal("300.00"),
        shipping_cost=Decimal("20.00"),
        discount=Decimal("0.00"),
        points_redeemed=50,
        points_discount=Decimal("50.00"),
        total=Decimal("270.00"),
        contact_name="Иван Покупатель",
        contact_phone="+992900000000",
        contact_email=cust_user.email,
        shipping_city="Душанбе",
        shipping_street="пр. Рудаки 15",
        payment_method=PaymentMethod.CASH_ON_DELIVERY,
        shipping_method=ShippingMethod.COURIER,
    )
    db.add(order)
    db.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=prod.id,
        product_name="Свеча зажигания NGK Laser Iridium",
        product_sku="NGK-ILZKR7B11",
        quantity=4,
        unit_price=Decimal("75.00"),
        line_total=Decimal("300.00"),
    )
    db.add(item)
    db.commit()

    # 1. Fetch order details for admin inspector
    res = client.get(f"/api/v1/admin/orders/{order.id}", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert detail["number"] == order.number
    assert detail["contact_name"] == "Иван Покупатель"
    assert detail["points_redeemed"] == 50
    assert float(detail["points_discount"]) == 50.00
    assert len(detail["items"]) == 1
    assert detail["items"][0]["product_sku"] == "NGK-ILZKR7B11"

    # 2. Adjust loyalty points
    res = client.post(
        f"/api/v1/admin/loyalty/{cust_user.id}/adjust",
        json={"amount": 250, "description": "Компенсация задержки доставки"},
        headers=headers,
    )
    assert res.status_code == 200
    acc = res.json()
    assert acc["points_balance"] >= 250
