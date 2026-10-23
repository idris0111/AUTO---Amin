import re
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import Case, Select, case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import (
    Brand,
    Category,
    OEMNumber,
    Product,
    ProductCrossReference,
    ProductImage,
    ProductSpecification,
    ProductStatus,
)
from app.schemas.catalog import (
    BrandCreate,
    BrandUpdate,
    CategoryCreate,
    CategoryUpdate,
    ProductCreate,
    ProductUpdate,
)


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def _ensure_unique_slug(model, db: Session, slug: str, exclude_id: uuid.UUID | None = None) -> str:
    candidate = slug
    query = select(model.id).where(model.slug == candidate)
    if exclude_id is not None:
        query = query.where(model.id != exclude_id)
    while db.scalar(query) is not None:
        candidate = f"{candidate}-2"
        query = select(model.id).where(model.slug == candidate)
        if exclude_id is not None:
            query = query.where(model.id != exclude_id)
    return candidate


def category_descendant_ids(db: Session, category_id: uuid.UUID) -> list[uuid.UUID]:
    """Collect a category and all of its descendants in Python.

    Portable across SQLite and PostgreSQL (raw recursive SQL would have to
    handle each dialect's UUID storage format separately).
    """
    rows = db.execute(select(Category.id, Category.parent_id)).all()
    children_by_parent: dict[uuid.UUID | None, list[uuid.UUID]] = {}
    for row_id, parent_id in rows:
        children_by_parent.setdefault(parent_id, []).append(row_id)
    result: list[uuid.UUID] = []
    stack = [category_id]
    seen: set[uuid.UUID] = set()
    while stack:
        current = stack.pop()
        if current in seen:
            continue
        seen.add(current)
        result.append(current)
        stack.extend(children_by_parent.get(current, []))
    return result


def build_category_tree(db: Session, include_inactive: bool = False) -> list[Category]:
    query = select(Category).order_by(Category.position, Category.name)
    if not include_inactive:
        query = query.where(Category.is_active.is_(True))
    categories = list(db.scalars(query))
    by_parent: dict[uuid.UUID | None, list[Category]] = {}
    for category in categories:
        by_parent.setdefault(category.parent_id, []).append(category)
    for category in categories:
        category.children = by_parent.get(category.id, [])
    return by_parent.get(None, [])


def _assert_parent_acyclic(db: Session, category_id: uuid.UUID, new_parent_id: uuid.UUID | None) -> None:
    if new_parent_id is None:
        return
    if new_parent_id == category_id:
        raise HTTPException(status_code=400, detail="Category cannot be its own parent")
    ancestors = category_descendant_ids(db, new_parent_id)
    if category_id in ancestors:
        raise HTTPException(status_code=400, detail="Cannot move category under its descendant")


def create_category(db: Session, data: CategoryCreate) -> Category:
    if data.parent_id is not None and db.get(Category, data.parent_id) is None:
        raise HTTPException(status_code=404, detail="Parent category not found")
    slug = _ensure_unique_slug(Category, db, data.slug)
    category = Category(**data.model_dump(exclude={"slug"}), slug=slug)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category: Category, data: CategoryUpdate) -> Category:
    values = data.model_dump(exclude_unset=True)
    if "parent_id" in values:
        _assert_parent_acyclic(db, category.id, values["parent_id"])
        if values["parent_id"] is not None and db.get(Category, values["parent_id"]) is None:
            raise HTTPException(status_code=404, detail="Parent category not found")
    if "slug" in values:
        values["slug"] = _ensure_unique_slug(Category, db, values["slug"], exclude_id=category.id)
    for field, value in values.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    child_count = db.scalar(select(func.count(Category.id)).where(Category.parent_id == category.id))
    if child_count:
        raise HTTPException(status_code=400, detail="Delete or move child categories first")
    product_count = db.scalar(select(func.count(Product.id)).where(Product.category_id == category.id))
    if product_count:
        raise HTTPException(status_code=400, detail="Category still has products")
    db.delete(category)
    db.commit()


def create_brand(db: Session, data: BrandCreate) -> Brand:
    slug = _ensure_unique_slug(Brand, db, data.slug)
    brand = Brand(**data.model_dump(exclude={"slug"}), slug=slug)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


def update_brand(db: Session, brand: Brand, data: BrandUpdate) -> Brand:
    values = data.model_dump(exclude_unset=True)
    if "slug" in values:
        values["slug"] = _ensure_unique_slug(Brand, db, values["slug"], exclude_id=brand.id)
    for field, value in values.items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return brand


def delete_brand(db: Session, brand: Brand) -> None:
    product_count = db.scalar(select(func.count(Product.id)).where(Product.brand_id == brand.id))
    if product_count:
        raise HTTPException(status_code=400, detail="Brand still has products")
    db.delete(brand)
    db.commit()


def _check_product_refs(db: Session, brand_id: uuid.UUID, category_id: uuid.UUID) -> None:
    if db.get(Brand, brand_id) is None:
        raise HTTPException(status_code=404, detail="Brand not found")
    if db.get(Category, category_id) is None:
        raise HTTPException(status_code=404, detail="Category not found")


def _replace_product_children(db: Session, product: Product, data: ProductCreate | ProductUpdate) -> None:
    if isinstance(data, ProductCreate) or data.images is not None:
        product.images = [ProductImage(**item.model_dump()) for item in (data.images or [])]
    if isinstance(data, ProductCreate) or data.specifications is not None:
        product.specifications = [
            ProductSpecification(**item.model_dump()) for item in (data.specifications or [])
        ]
    if isinstance(data, ProductCreate) or data.oem_numbers is not None:
        product.oem_numbers = [OEMNumber(**item.model_dump()) for item in (data.oem_numbers or [])]
    if isinstance(data, ProductCreate) or data.cross_references is not None:
        product.cross_references = [
            ProductCrossReference(**item.model_dump()) for item in (data.cross_references or [])
        ]


def create_product(db: Session, data: ProductCreate, actor_id: uuid.UUID | None = None) -> Product:
    _check_product_refs(db, data.brand_id, data.category_id)
    if db.scalar(select(Product.id).where(Product.sku == data.sku)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    if db.scalar(select(Product.id).where(Product.slug == data.slug)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
    payload = data.model_dump(
        exclude={"images", "specifications", "oem_numbers", "cross_references", "stock_quantity"}
    )
    product = Product(**payload, stock_quantity=0)
    db.add(product)
    _replace_product_children(db, product, data)
    db.flush()
    # Opening stock goes through the inventory ledger (default warehouse).
    from app.services import inventory

    if data.stock_quantity:
        inventory.change_stock(
            db,
            product_id=product.id,
            delta=data.stock_quantity,
            movement_type=inventory.MovementType.RECEIPT,
            user_id=actor_id,
            reason="Initial stock on product creation",
        )
    db.commit()
    return get_product(db, product.id)


def update_product(
    db: Session, product: Product, data: ProductUpdate, actor_id: uuid.UUID | None = None
) -> Product:
    values = data.model_dump(
        exclude_unset=True,
        exclude={"images", "specifications", "oem_numbers", "cross_references"},
    )
    new_stock = values.pop("stock_quantity", None)
    brand_id = values.get("brand_id", product.brand_id)
    category_id = values.get("category_id", product.category_id)
    _check_product_refs(db, brand_id, category_id)
    if "sku" in values and db.scalar(
        select(Product.id).where(Product.sku == values["sku"], Product.id != product.id)
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    if "slug" in values and db.scalar(
        select(Product.id).where(Product.slug == values["slug"], Product.id != product.id)
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
    if values.get("old_price") is not None and values.get("price") is not None:
        if values["old_price"] <= values["price"]:
            raise HTTPException(status_code=400, detail="old_price must be greater than price")
    for field, value in values.items():
        setattr(product, field, value)
    if product.old_price is not None and product.old_price <= product.price:
        raise HTTPException(status_code=400, detail="old_price must be greater than price")
    _replace_product_children(db, product, data)
    db.flush()
    if new_stock is not None:
        from app.services import inventory

        inventory.set_total_stock(
            db,
            product_id=product.id,
            new_total=new_stock,
            user_id=actor_id,
            reason="Stock set from product edit",
        )
    db.commit()
    return get_product(db, product.id)


def delete_product(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()


PRODUCT_LOADS = (
    selectinload(Product.brand),
    selectinload(Product.category),
    selectinload(Product.images),
    selectinload(Product.specifications),
    selectinload(Product.oem_numbers),
    selectinload(Product.cross_references),
)


def get_product(db: Session, product_id: uuid.UUID) -> Product:
    product = db.scalar(select(Product).options(*PRODUCT_LOADS).where(Product.id == product_id))
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def get_product_by_slug(db: Session, slug: str, count_view: bool = False) -> Product:
    product = db.scalar(select(Product).options(*PRODUCT_LOADS).where(Product.slug == slug))
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if count_view:
        product.views_count += 1
        db.commit()
    return product


def search_terms(query: str) -> list[str]:
    """Split a search query into terms, keeping Cyrillic and Latin letters/digits."""
    return [term for term in re.split(r"[^\w№+-]+", query.strip().lower(), flags=re.UNICODE) if term]


def _relevance_rank(query: str) -> Case:
    """Portable relevance ranking (exact SKU > exact name > prefix > substring)."""
    lowered = query.strip().lower()
    prefix = f"{lowered}%"
    return case(
        (func.lower(Product.sku) == lowered, 0),
        (func.lower(Product.name) == lowered, 1),
        (func.lower(Product.name).like(prefix), 2),
        (func.lower(Product.sku).like(prefix), 3),
        else_=4,
    )


def apply_product_filters(
    db: Session,
    base: Select,
    *,
    category_id: uuid.UUID | None = None,
    brand_ids: list[uuid.UUID] | None = None,
    price_min: Decimal | None = None,
    price_max: Decimal | None = None,
    in_stock: bool | None = None,
    has_discount: bool | None = None,
    query: str | None = None,
    vehicle_make_id: uuid.UUID | None = None,
    vehicle_model_id: uuid.UUID | None = None,
    vehicle_year: int | None = None,
) -> Select:
    if category_id is not None:
        ids = category_descendant_ids(db, category_id)
        base = base.where(Product.category_id.in_(ids))
    if brand_ids:
        base = base.where(Product.brand_id.in_(brand_ids))
    if price_min is not None:
        base = base.where(Product.price >= price_min)
    if price_max is not None:
        base = base.where(Product.price <= price_max)
    if in_stock:
        base = base.where(Product.stock_quantity > 0)
    if has_discount:
        base = base.where(Product.old_price.is_not(None))
    if query:
        for term in search_terms(query):
            pattern = f"%{term}%"
            oem_ids = select(OEMNumber.product_id).where(func.lower(OEMNumber.number).like(pattern))
            cross_ids = select(ProductCrossReference.product_id).where(
                func.lower(ProductCrossReference.number).like(pattern)
            )
            base = base.where(
                or_(
                    func.lower(Product.name).like(pattern),
                    func.lower(Product.sku).like(pattern),
                    func.lower(Product.description).like(pattern),
                    Product.id.in_(oem_ids),
                    Product.id.in_(cross_ids),
                )
            )
    if vehicle_make_id is not None:
        from app.models.vehicle import ProductCompatibility

        compat = select(ProductCompatibility.product_id).where(
            ProductCompatibility.make_id == vehicle_make_id
        )
        if vehicle_model_id is not None:
            compat = compat.where(
                or_(
                    ProductCompatibility.model_id.is_(None),
                    ProductCompatibility.model_id == vehicle_model_id,
                )
            )
        if vehicle_year is not None:
            compat = compat.where(
                or_(ProductCompatibility.year_from.is_(None), ProductCompatibility.year_from <= vehicle_year)
            ).where(
                or_(ProductCompatibility.year_to.is_(None), ProductCompatibility.year_to >= vehicle_year)
            )
        base = base.where(Product.id.in_(compat))
    return base


SORT_OPTIONS = {
    "newest": Product.created_at.desc(),
    "oldest": Product.created_at.asc(),
    "price_asc": Product.price.asc(),
    "price_desc": Product.price.desc(),
    "rating": Product.rating_avg.desc(),
    "popular": Product.views_count.desc(),
    "name_asc": Product.name.asc(),
    "discount": case(
        (Product.old_price > 0, (Product.old_price - Product.price) / Product.old_price),
        else_=0,
    ).desc(),
}


def list_products(
    db: Session,
    *,
    offset: int = 0,
    limit: int = 20,
    category_id: uuid.UUID | None = None,
    brand_ids: list[uuid.UUID] | None = None,
    price_min: Decimal | None = None,
    price_max: Decimal | None = None,
    in_stock: bool | None = None,
    has_discount: bool | None = None,
    query: str | None = None,
    sort: str = "newest",
    vehicle_make_id: uuid.UUID | None = None,
    vehicle_model_id: uuid.UUID | None = None,
    vehicle_year: int | None = None,
    include_unpublished: bool = False,
) -> tuple[list[Product], int]:
    base = select(Product)
    if not include_unpublished:
        base = base.where(Product.status == ProductStatus.ACTIVE)
    base = apply_product_filters(
        db,
        base,
        category_id=category_id,
        brand_ids=brand_ids,
        price_min=price_min,
        price_max=price_max,
        in_stock=in_stock,
        has_discount=has_discount,
        query=query,
        vehicle_make_id=vehicle_make_id,
        vehicle_model_id=vehicle_model_id,
        vehicle_year=vehicle_year,
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    if query and sort == "newest":
        base = base.order_by(
            _relevance_rank(query), Product.views_count.desc(), Product.created_at.desc()
        )
    else:
        base = base.order_by(SORT_OPTIONS.get(sort, Product.created_at.desc()))
    items = list(
        db.scalars(
            base.options(
                selectinload(Product.brand), selectinload(Product.category), selectinload(Product.images)
            )
            .offset(offset)
            .limit(limit)
        )
    )
    return items, total


def compare_products(
    db: Session,
    product_ids: list[uuid.UUID],
    vehicle_obj: object | None = None,
):
    from app.schemas.catalog import (
        ProductComparisonResponse,
        ProductRead,
        SpecificationComparisonRow,
    )
    from app.services.vehicles import compute_fitment

    if not product_ids:
        return ProductComparisonResponse(
            products=[],
            specifications_matrix=[],
            all_spec_names=[],
            is_same_category=True,
        )

    query = select(Product).options(*PRODUCT_LOADS).where(Product.id.in_(product_ids))
    products_db = list(db.scalars(query))
    prod_map = {p.id: p for p in products_db}
    ordered_products = [prod_map[pid] for pid in product_ids if pid in prod_map]

    product_reads: list[ProductRead] = []
    category_ids: set[uuid.UUID] = set()

    for p in ordered_products:
        p_read = ProductRead.model_validate(p)
        category_ids.add(p.category_id)
        if vehicle_obj is not None:
            p_read.fitment = compute_fitment(db, p.id, vehicle_obj).value
        product_reads.append(p_read)

    specs_by_product: dict[str, dict[str, str]] = {}
    all_spec_names: list[str] = []
    seen_specs: set[str] = set()

    for p_read in product_reads:
        p_id_str = str(p_read.id)
        specs_by_product[p_id_str] = {}
        for spec in p_read.specifications:
            val = spec.value
            if spec.unit:
                val = f"{val} {spec.unit}"
            specs_by_product[p_id_str][spec.name] = val
            if spec.name not in seen_specs:
                seen_specs.add(spec.name)
                all_spec_names.append(spec.name)

    specifications_matrix: list[SpecificationComparisonRow] = []
    for spec_name in all_spec_names:
        val_map: dict[str, str | None] = {}
        distinct_vals: set[str | None] = set()
        for p_read in product_reads:
            p_id_str = str(p_read.id)
            val = specs_by_product.get(p_id_str, {}).get(spec_name)
            val_map[p_id_str] = val
            distinct_vals.add(val)

        is_different = len(distinct_vals) > 1
        specifications_matrix.append(
            SpecificationComparisonRow(
                name=spec_name,
                values=val_map,
                is_different=is_different,
            )
        )

    return ProductComparisonResponse(
        products=product_reads,
        specifications_matrix=specifications_matrix,
        all_spec_names=all_spec_names,
        is_same_category=(len(category_ids) <= 1),
    )
