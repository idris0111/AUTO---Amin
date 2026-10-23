import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user_optional
from app.models.catalog import Brand, Product, ProductStatus
from app.models.user import User
from app.models.vehicle import UserVehicle
from app.schemas.catalog import (
    BrandRead,
    CategoryRead,
    PaginatedProducts,
    ProductComparisonResponse,
    ProductListItem,
    ProductRead,
)
from app.schemas.personalization import (
    FrequentlyBoughtTogetherResponse,
    GarageRecommendationsResponse,
)
from app.services import catalog as catalog_service
from app.services import vehicles as vehicle_service

router = APIRouter(prefix="/catalog", tags=["Catalog"])


def _product_list_item(product: Product, fitment: str | None = None) -> ProductListItem:
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
        brand=product.brand,
        category=product.category,
        image_url=primary_image.url if primary_image else None,
        fitment=fitment,
    )


def _resolve_vehicle(db: Session, user: User | None, vehicle_id: uuid.UUID | None) -> UserVehicle | None:
    if vehicle_id is None or user is None:
        return None
    return vehicle_service.get_user_vehicle(db, user, vehicle_id)


@router.get("/categories", response_model=list[CategoryRead])
def category_tree(response: Response, db: Session = Depends(get_db)) -> list[CategoryRead]:
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    return catalog_service.build_category_tree(db)


@router.get("/brands", response_model=list[BrandRead])
def list_brands(response: Response, db: Session = Depends(get_db)) -> list[Brand]:
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    return list(db.scalars(select(Brand).where(Brand.is_active.is_(True)).order_by(Brand.name)))


@router.get("/products", response_model=PaginatedProducts)
def list_products(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    category_id: uuid.UUID | None = None,
    brand_id: list[uuid.UUID] | None = Query(default=None),
    price_min: Decimal | None = Query(default=None, ge=0),
    price_max: Decimal | None = Query(default=None, ge=0),
    in_stock: bool | None = None,
    has_discount: bool | None = None,
    q: str | None = Query(default=None, max_length=200),
    sort: str = Query(default="newest"),
    vehicle_id: uuid.UUID | None = None,
) -> PaginatedProducts:
    vehicle = _resolve_vehicle(db, current_user, vehicle_id)
    items, total = catalog_service.list_products(
        db,
        offset=offset,
        limit=limit,
        category_id=category_id,
        brand_ids=brand_id,
        price_min=price_min,
        price_max=price_max,
        in_stock=in_stock,
        has_discount=has_discount,
        query=q,
        sort=sort,
        vehicle_make_id=vehicle.make_id if vehicle else None,
        vehicle_model_id=vehicle.model_id if vehicle else None,
        vehicle_year=vehicle.year if vehicle else None,
    )
    fitments: dict[uuid.UUID, str] = {}
    if vehicle is not None:
        fitments = {
            product.id: vehicle_service.compute_fitment(db, product.id, vehicle).value for product in items
        }
    return PaginatedProducts(
        items=[_product_list_item(product, fitments.get(product.id)) for product in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/products/compare", response_model=ProductComparisonResponse)
def compare_products_endpoint(
    ids: list[uuid.UUID] = Query(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    vehicle_id: uuid.UUID | None = None,
    make_id: uuid.UUID | None = None,
    model_id: uuid.UUID | None = None,
    year: int | None = None,
) -> ProductComparisonResponse:
    from types import SimpleNamespace

    vehicle = _resolve_vehicle(db, current_user, vehicle_id)
    if vehicle is None and make_id is not None:
        vehicle = SimpleNamespace(
            make_id=make_id,
            model_id=model_id,
            generation_id=None,
            modification_id=None,
            engine_id=None,
            year=year,
        )
    return catalog_service.compare_products(db, ids, vehicle_obj=vehicle)


@router.get("/recommendations/garage", response_model=GarageRecommendationsResponse)
def garage_recommendations_endpoint(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    vehicle_id: uuid.UUID | None = None,
    limit: int = Query(default=8, ge=1, le=20),
) -> GarageRecommendationsResponse:
    from app.services import personalization

    return personalization.get_garage_recommendations(
        db, user=current_user, vehicle_id=vehicle_id, limit=limit
    )


@router.get("/products/{slug}", response_model=ProductRead)
def product_detail(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    vehicle_id: uuid.UUID | None = None,
) -> ProductRead:
    product = catalog_service.get_product_by_slug(db, slug, count_view=True)
    data = ProductRead.model_validate(product)
    vehicle = _resolve_vehicle(db, current_user, vehicle_id)
    if vehicle is not None:
        data.fitment = vehicle_service.compute_fitment(db, product.id, vehicle).value
    return data


@router.get("/products/{slug}/related", response_model=list[ProductListItem])
def related_products(
    slug: str, db: Session = Depends(get_db), limit: int = Query(default=8, ge=1, le=20)
) -> list[ProductListItem]:
    product = catalog_service.get_product_by_slug(db, slug)
    related = list(
        db.scalars(
            select(Product)
            .where(
                Product.status == ProductStatus.ACTIVE,
                Product.id != product.id,
                (Product.category_id == product.category_id) | (Product.brand_id == product.brand_id),
            )
            .order_by(Product.views_count.desc())
            .limit(limit)
            .options(selectinload(Product.brand), selectinload(Product.category), selectinload(Product.images))
        )
    )
    return [_product_list_item(item) for item in related]



@router.get(
    "/products/{slug}/frequently-bought-together",
    response_model=FrequentlyBoughtTogetherResponse,
)
def frequently_bought_together_endpoint(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    vehicle_id: uuid.UUID | None = None,
    limit: int = Query(default=3, ge=1, le=6),
) -> FrequentlyBoughtTogetherResponse:
    from app.services import personalization

    product = catalog_service.get_product_by_slug(db, slug)
    vehicle = _resolve_vehicle(db, current_user, vehicle_id)
    return personalization.get_frequently_bought_together(
        db, product_id=product.id, vehicle_obj=vehicle, limit=limit
    )
