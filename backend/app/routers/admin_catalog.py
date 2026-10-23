import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import Permission, require_permission
from app.models.catalog import Brand, Category, Product
from app.models.user import User
from app.models.vehicle import (
    Engine,
    ProductCompatibility,
    VehicleGeneration,
    VehicleMake,
    VehicleModification,
    VehicleModel,
)
from app.schemas.catalog import (
    BrandCreate,
    BrandRead,
    BrandUpdate,
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)
from app.schemas.vehicle import (
    CompatibilityCreate,
    CompatibilityRead,
    EngineCreate,
    EngineRead,
    VehicleGenerationCreate,
    VehicleGenerationRead,
    VehicleMakeCreate,
    VehicleMakeRead,
    VehicleMakeWithModels,
    VehicleModelCreate,
    VehicleModelRead,
    VehicleModificationCreate,
    VehicleModificationRead,
)
from app.services import catalog as catalog_service
from app.services import inventory
from app.services import vehicles as vehicle_service

router = APIRouter(prefix="/admin", tags=["Admin Catalog"])

catalog_admin = Depends(require_permission(Permission.MANAGE_CATALOG))


class StockAdjustIn(BaseModel):
    delta: int = Field(description="Количество: положительное для прихода, отрицательное для списания")
    reason: str | None = Field(default=None, max_length=500)
    warehouse_id: uuid.UUID | None = None


def _get_or_404(db: Session, model, entity_id: uuid.UUID, label: str):
    entity = db.get(model, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return entity


@router.get("/categories", response_model=list[CategoryRead])
def admin_category_tree(_: User = catalog_admin, db: Session = Depends(get_db)) -> list[CategoryRead]:
    return catalog_service.build_category_tree(db, include_inactive=True)


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def admin_create_category(
    data: CategoryCreate, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Category:
    return catalog_service.create_category(db, data)


@router.patch("/categories/{category_id}", response_model=CategoryRead)
def admin_update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    _: User = catalog_admin,
    db: Session = Depends(get_db),
) -> Category:
    category = _get_or_404(db, Category, category_id, "Category")
    return catalog_service.update_category(db, category, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_category(
    category_id: uuid.UUID, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Response:
    category = _get_or_404(db, Category, category_id, "Category")
    catalog_service.delete_category(db, category)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/brands", response_model=list[BrandRead])
def admin_list_brands(_: User = catalog_admin, db: Session = Depends(get_db)) -> list[Brand]:
    return list(db.scalars(select(Brand).order_by(Brand.name)))


@router.post("/brands", response_model=BrandRead, status_code=status.HTTP_201_CREATED)
def admin_create_brand(
    data: BrandCreate, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Brand:
    return catalog_service.create_brand(db, data)


@router.patch("/brands/{brand_id}", response_model=BrandRead)
def admin_update_brand(
    brand_id: uuid.UUID, data: BrandUpdate, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Brand:
    brand = _get_or_404(db, Brand, brand_id, "Brand")
    return catalog_service.update_brand(db, brand, data)


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_brand(
    brand_id: uuid.UUID, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Response:
    brand = _get_or_404(db, Brand, brand_id, "Brand")
    catalog_service.delete_brand(db, brand)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/products", response_model=list[ProductRead])
def admin_list_products(
    _: User = catalog_admin,
    db: Session = Depends(get_db),
    offset: int = 0,
    limit: int = 100,
) -> list:
    return list(
        db.scalars(
            select(Product)
            .options(*catalog_service.PRODUCT_LOADS)
            .order_by(Product.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def admin_create_product(
    data: ProductCreate, admin: User = catalog_admin, db: Session = Depends(get_db)
) -> Product:
    return catalog_service.create_product(db, data, actor_id=admin.id)


@router.get("/products/{product_id}", response_model=ProductRead)
def admin_get_product(
    product_id: uuid.UUID, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Product:
    return catalog_service.get_product(db, product_id)


@router.patch("/products/{product_id}", response_model=ProductRead)
def admin_update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    admin: User = catalog_admin,
    db: Session = Depends(get_db),
) -> Product:
    product = catalog_service.get_product(db, product_id)
    return catalog_service.update_product(db, product, data, actor_id=admin.id)


@router.post("/products/{product_id}/stock-adjust", response_model=ProductRead)
def admin_adjust_product_stock(
    product_id: uuid.UUID,
    data: StockAdjustIn,
    admin: User = catalog_admin,
    db: Session = Depends(get_db),
) -> Product:
    product = catalog_service.get_product(db, product_id)
    movement_type = (
        inventory.MovementType.RECEIPT if data.delta > 0 else inventory.MovementType.WRITE_OFF
    )
    inventory.change_stock(
        db,
        product_id=product.id,
        delta=data.delta,
        movement_type=movement_type,
        warehouse_id=data.warehouse_id,
        user_id=admin.id,
        reason=data.reason or ("Ручная корректировка остатка" if data.delta > 0 else "Списание товара"),
    )
    db.commit()
    return catalog_service.get_product(db, product.id)




@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_product(
    product_id: uuid.UUID, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Response:
    product = catalog_service.get_product(db, product_id)
    catalog_service.delete_product(db, product)
    return Response(status_code=status.HTTP_204_NO_CONTENT)



@router.get("/products/{product_id}/compatibilities", response_model=list[CompatibilityRead])
def admin_list_compatibilities(
    product_id: uuid.UUID, _: User = catalog_admin, db: Session = Depends(get_db)
) -> list:
    catalog_service.get_product(db, product_id)
    return list(
        db.scalars(select(ProductCompatibility).where(ProductCompatibility.product_id == product_id))
    )


@router.post(
    "/products/{product_id}/compatibilities",
    response_model=CompatibilityRead,
    status_code=status.HTTP_201_CREATED,
)
def admin_add_compatibility(
    product_id: uuid.UUID,
    data: CompatibilityCreate,
    _: User = catalog_admin,
    db: Session = Depends(get_db),
) -> ProductCompatibility:
    catalog_service.get_product(db, product_id)
    return vehicle_service.add_compatibility(db, product_id, data)


@router.delete("/compatibilities/{compatibility_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_compatibility(
    compatibility_id: uuid.UUID, _: User = catalog_admin, db: Session = Depends(get_db)
) -> Response:
    row = _get_or_404(db, ProductCompatibility, compatibility_id, "Compatibility")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/vehicles", response_model=list[VehicleMakeWithModels])
def admin_vehicle_tree(_: User = catalog_admin, db: Session = Depends(get_db)) -> list:
    return list(
        db.scalars(
            select(VehicleMake)
            .options(selectinload(VehicleMake.models))
            .order_by(VehicleMake.name)
        )
    )


@router.post("/vehicles/makes", response_model=VehicleMakeRead, status_code=status.HTTP_201_CREATED)
def admin_create_make(
    data: VehicleMakeCreate, _: User = catalog_admin, db: Session = Depends(get_db)
) -> VehicleMake:
    if db.scalar(select(VehicleMake.id).where(VehicleMake.slug == data.slug)):
        raise HTTPException(status_code=409, detail="Make slug already exists")
    make = VehicleMake(**data.model_dump())
    db.add(make)
    db.commit()
    db.refresh(make)
    return make


@router.post(
    "/vehicles/makes/{make_id}/models", response_model=VehicleModelRead, status_code=status.HTTP_201_CREATED
)
def admin_create_model(
    make_id: uuid.UUID,
    data: VehicleModelCreate,
    _: User = catalog_admin,
    db: Session = Depends(get_db),
) -> VehicleModel:
    _get_or_404(db, VehicleMake, make_id, "Make")
    if db.scalar(select(VehicleModel.id).where(VehicleModel.make_id == make_id, VehicleModel.slug == data.slug)):
        raise HTTPException(status_code=409, detail="Model slug already exists")
    model = VehicleModel(make_id=make_id, **data.model_dump())
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.post(
    "/vehicles/models/{model_id}/generations",
    response_model=VehicleGenerationRead,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_generation(
    model_id: uuid.UUID,
    data: VehicleGenerationCreate,
    _: User = catalog_admin,
    db: Session = Depends(get_db),
) -> VehicleGeneration:
    _get_or_404(db, VehicleModel, model_id, "Model")
    generation = VehicleGeneration(model_id=model_id, **data.model_dump())
    db.add(generation)
    db.commit()
    db.refresh(generation)
    return generation


@router.post(
    "/vehicles/generations/{generation_id}/modifications",
    response_model=VehicleModificationRead,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_modification(
    generation_id: uuid.UUID,
    data: VehicleModificationCreate,
    _: User = catalog_admin,
    db: Session = Depends(get_db),
) -> VehicleModification:
    _get_or_404(db, VehicleGeneration, generation_id, "Generation")
    modification = VehicleModification(generation_id=generation_id, **data.model_dump())
    db.add(modification)
    db.commit()
    db.refresh(modification)
    return modification


@router.post(
    "/vehicles/modifications/{modification_id}/engines",
    response_model=EngineRead,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_engine(
    modification_id: uuid.UUID,
    data: EngineCreate,
    _: User = catalog_admin,
    db: Session = Depends(get_db),
) -> Engine:
    _get_or_404(db, VehicleModification, modification_id, "Modification")
    engine = Engine(modification_id=modification_id, **data.model_dump())
    db.add(engine)
    db.commit()
    db.refresh(engine)
    return engine
