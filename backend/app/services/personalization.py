import logging
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import Category, Product, ProductStatus
from app.models.commerce import OrderItem
from app.models.user import User
from app.models.vehicle import ProductCompatibility, UserVehicle
from app.schemas.catalog import ProductBrandBrief, ProductCategoryBrief, ProductListItem
from app.schemas.personalization import (
    FrequentlyBoughtTogetherResponse,
    GarageRecommendationsResponse,
)
from app.services.vehicles import compute_fitment

logger = logging.getLogger(__name__)

COMPLEMENTARY_CATEGORIES: dict[str, list[str]] = {
    "brake-system": ["brake-system", "oils"],
    "filters": ["oils", "filters"],
    "oils": ["filters", "engine"],
    "engine": ["electronics", "filters", "oils"],
    "suspension": ["suspension"],
    "electronics": ["electronics", "engine"],
}


def _product_to_list_item(product: Product, fitment: str | None = None) -> ProductListItem:
    primary_image = next((image for image in product.images if image.is_primary), None)
    if primary_image is None and product.images:
        primary_image = product.images[0]

    return ProductListItem(
        id=product.id,
        name=product.name,
        slug=product.slug,
        sku=product.sku,
        price=product.price,
        old_price=product.old_price,
        stock_quantity=product.stock_quantity,
        rating_avg=product.rating_avg,
        rating_count=product.rating_count,
        brand=ProductBrandBrief(
            id=product.brand.id,
            name=product.brand.name,
            slug=product.brand.slug,
            logo_url=product.brand.logo_url,
        ),
        category=ProductCategoryBrief(
            id=product.category.id,
            name=product.category.name,
            slug=product.category.slug,
        ),
        image_url=primary_image.url if primary_image else None,
        fitment=fitment,
    )


def get_garage_recommendations(
    db: Session,
    user: User | None = None,
    vehicle_id: uuid.UUID | None = None,
    limit: int = 8,
) -> GarageRecommendationsResponse:
    target_vehicle: UserVehicle | None = None

    if vehicle_id is not None:
        target_vehicle = db.get(UserVehicle, vehicle_id)
    elif user is not None:
        target_vehicle = db.scalar(
            select(UserVehicle)
            .where(UserVehicle.user_id == user.id)
            .order_by(UserVehicle.is_primary.desc(), UserVehicle.created_at.desc())
            .limit(1)
        )

    if target_vehicle is None:
        target_vehicle = db.scalar(select(UserVehicle).limit(1))

    if target_vehicle is None:
        return GarageRecommendationsResponse(
            vehicle_id=None,
            vehicle_name="Любой автомобиль",
            maintenance_parts=[],
            popular_compatible=[],
        )

    parts_name = [target_vehicle.name]
    if target_vehicle.make:
        parts_name.append(target_vehicle.make.name)
    if target_vehicle.model:
        parts_name.append(target_vehicle.model.name)
    if target_vehicle.year:
        parts_name.append(f"({target_vehicle.year})")
    vehicle_title = " ".join(parts_name)

    # Find products with compatibility
    compat_subq = (
        select(ProductCompatibility.product_id)
        .where(ProductCompatibility.make_id == target_vehicle.make_id)
        .distinct()
    )

    base_query = (
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.images),
        )
        .where(
            Product.status == ProductStatus.ACTIVE,
            Product.id.in_(compat_subq),
        )
    )

    all_compatible = list(db.scalars(base_query))

    # Verify fitment strictly with compute_fitment
    verified_compatible: list[Product] = []
    for prod in all_compatible:
        fit = compute_fitment(db, prod.id, target_vehicle)
        if fit.value == "compatible":
            verified_compatible.append(prod)

    # If strict fitment returned nothing (e.g., loose demo data), keep all matching make
    candidates = verified_compatible if verified_compatible else all_compatible

    # Split into maintenance (filters, oils, brake pads) and general
    maintenance_slugs = {"filters", "oils", "brake-system"}
    maintenance_items: list[ProductListItem] = []
    popular_items: list[ProductListItem] = []

    def _is_maintenance_category(cat: Category | None) -> bool:
        if not cat:
            return False
        s = cat.slug.lower()
        return s in maintenance_slugs or "filter" in s or "oil" in s or "brake" in s

    for prod in candidates:
        list_item = _product_to_list_item(prod, fitment="compatible")
        if prod.category and _is_maintenance_category(prod.category):
            maintenance_items.append(list_item)
        else:
            popular_items.append(list_item)

    if not popular_items and maintenance_items:
        popular_items = maintenance_items[len(maintenance_items) // 2 :]

    return GarageRecommendationsResponse(
        vehicle_id=target_vehicle.id,
        vehicle_name=vehicle_title,
        maintenance_parts=maintenance_items[:limit],
        popular_compatible=popular_items[:limit],
    )


def get_frequently_bought_together(
    db: Session,
    product_id: uuid.UUID,
    vehicle_obj: Any | None = None,
    limit: int = 3,
) -> FrequentlyBoughtTogetherResponse:
    target = db.scalar(
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.images),
        )
        .where(Product.id == product_id)
    )

    if target is None:
        return FrequentlyBoughtTogetherResponse(
            target_product_id=product_id,
            items=[],
            total_bundle_price=Decimal("0.00"),
            total_savings=Decimal("0.00"),
        )

    bundle_product_ids: list[uuid.UUID] = []

    # 1. Check order_items co-occurrence
    order_ids_subq = select(OrderItem.order_id).where(OrderItem.product_id == product_id)
    co_rows = list(
        db.execute(
            select(OrderItem.product_id, func.count(OrderItem.id).label("freq"))
            .where(
                OrderItem.order_id.in_(order_ids_subq),
                OrderItem.product_id != product_id,
            )
            .group_by(OrderItem.product_id)
            .order_by(text("freq DESC"))
            .limit(limit)
        )
    )

    for row in co_rows:
        bundle_product_ids.append(row[0])

    # 2. Complementary categories fallback
    if len(bundle_product_ids) < limit and target.category:
        cat_slug = target.category.slug
        target_complementary = COMPLEMENTARY_CATEGORIES.get(cat_slug, [cat_slug])

        categories = list(
            db.scalars(select(Category).where(Category.slug.in_(target_complementary)))
        )
        cat_ids = [c.id for c in categories]

        needed = limit - len(bundle_product_ids)
        suppl_query = (
            select(Product.id)
            .where(
                Product.status == ProductStatus.ACTIVE,
                Product.id != product_id,
                Product.id.not_in(bundle_product_ids) if bundle_product_ids else True,
                Product.category_id.in_(cat_ids),
            )
            .order_by(Product.stock_quantity.desc(), Product.rating_avg.desc())
            .limit(needed)
        )
        for supp_id in db.scalars(suppl_query):
            bundle_product_ids.append(supp_id)

    # Fetch loaded bundle products
    items: list[ProductListItem] = []
    total_price = target.price
    total_savings = Decimal("0.00")
    if target.old_price and target.old_price > target.price:
        total_savings += target.old_price - target.price

    if bundle_product_ids:
        bundle_products = list(
            db.scalars(
                select(Product)
                .options(
                    selectinload(Product.brand),
                    selectinload(Product.category),
                    selectinload(Product.images),
                )
                .where(Product.id.in_(bundle_product_ids))
            )
        )

        for bp in bundle_products:
            fitment_status = None
            if vehicle_obj is not None:
                fitment_status = compute_fitment(db, bp.id, vehicle_obj).value

            items.append(_product_to_list_item(bp, fitment=fitment_status))
            total_price += bp.price
            if bp.old_price and bp.old_price > bp.price:
                total_savings += bp.old_price - bp.price

    return FrequentlyBoughtTogetherResponse(
        target_product_id=product_id,
        items=items,
        total_bundle_price=total_price,
        total_savings=total_savings,
    )
