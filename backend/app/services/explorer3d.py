import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import Category, Product, ProductStatus
from app.schemas.catalog import ProductBrandBrief, ProductCategoryBrief, ProductListItem
from app.schemas.explorer3d import (
    AssemblyDetailResponse,
    AssemblyNodePart,
    AssemblySummary,
)
from app.services.vehicles import compute_fitment

logger = logging.getLogger(__name__)

ASSEMBLIES_CONFIG = {
    "brakes": {
        "title": "Передний тормозной узел в сборе",
        "subsystem": "Тормозная система",
        "description": "Дисковый вентилируемый тормозной механизм с плавающим суппортом и двухколодочной компоновкой.",
        "difficulty": "medium",
        "camera_initial": {"x": 0.0, "y": 1.2, "z": 5.5},
        "nodes": [
            {
                "node_id": "brake_disc",
                "name": "Вентилируемый тормозной диск",
                "description": "Чугунный ротор с внутренними радиальными каналами охлаждения для эффективного теплоотвода.",
                "category_slug": "brake-system",
                "keywords": ["диск", "disc"],
                "exploded_offset": [0.0, 0.0, -1.8],
            },
            {
                "node_id": "brake_pads_inner",
                "name": "Тормозная колодка (внутренняя)",
                "description": "Фрикционная пластина со стороны тормозного поршня с встроенной противоскрипной пластиной.",
                "category_slug": "brake-system",
                "keywords": ["колодк", "pad"],
                "exploded_offset": [0.0, 0.0, -0.7],
            },
            {
                "node_id": "brake_caliper",
                "name": "Тормозной суппорт с поршнем",
                "description": "Литой гидравлический суппорт с пыльником, уплотнительной манжетой и штуцером прокачки.",
                "category_slug": "brake-system",
                "keywords": ["суппорт", "тормоз", "brembo"],
                "exploded_offset": [0.0, 0.6, 0.9],
            },
            {
                "node_id": "brake_pads_outer",
                "name": "Тормозная колодка (внешняя)",
                "description": "Прижимная колодка с датчиком критического износа и термостойким фрикционным слоем.",
                "category_slug": "brake-system",
                "keywords": ["колодк", "pad"],
                "exploded_offset": [0.0, 0.0, 1.6],
            },
            {
                "node_id": "brake_hose",
                "name": "Тормозной шланг высокого давления",
                "description": "Армированный гибкий шланг с антикоррозийным штуцером для подачи тормозной жидкости DOT-4.",
                "category_slug": "brake-system",
                "keywords": ["шланг", "жидкость", "тормоз"],
                "exploded_offset": [1.2, 1.4, 0.5],
            },
        ],
    },
    "suspension": {
        "title": "Передняя стойка подвески (MacPherson)",
        "subsystem": "Подвеска и рулевое управление",
        "description": "Телескопическая стойка амортизатора с витой цилиндрической пружиной и поворотным кулаком.",
        "difficulty": "hard",
        "camera_initial": {"x": 0.0, "y": 0.5, "z": 6.0},
        "nodes": [
            {
                "node_id": "shock_absorber",
                "name": "Амортизатор передний газомасляный",
                "description": "Двухтрубный амортизатор с хромированным штоком повышенной износостойкости.",
                "category_slug": "suspension",
                "keywords": ["амортизатор", "стойк", "sachs"],
                "exploded_offset": [0.0, -1.8, 0.0],
            },
            {
                "node_id": "spring",
                "name": "Пружина подвески цилиндрическая",
                "description": "Пружина из пружинно-рессорной стали переменного шага навивки с полимерной защитой.",
                "category_slug": "suspension",
                "keywords": ["пружин", "амортизатор", "подвеск"],
                "exploded_offset": [0.0, 0.2, 0.0],
            },
            {
                "node_id": "strut_mount",
                "name": "Верхняя опора стойки с подшипником",
                "description": "Резинометаллическая виброизолирующая опора с упорным шариковым подшипником.",
                "category_slug": "suspension",
                "keywords": ["опор", "подшипник", "сайлентблок"],
                "exploded_offset": [0.0, 2.0, 0.0],
            },
            {
                "node_id": "tie_rod",
                "name": "Рулевая тяга с шаровым шарниром",
                "description": "Кованая рулевая тяга с защитным чехлом из эластомера и резьбовой регулировкой схождения.",
                "category_slug": "suspension",
                "keywords": ["тяг", "рулев", "lemforder"],
                "exploded_offset": [1.8, -0.6, 0.0],
            },
        ],
    },
    "timing_drive": {
        "title": "Узел привода газораспределительного механизма (ГРМ)",
        "subsystem": "Двигатель",
        "description": "Зубчатый ременной привод распредвала с натяжным роликом и помпой охлаждения.",
        "difficulty": "professional",
        "camera_initial": {"x": 0.0, "y": 0.0, "z": 5.5},
        "nodes": [
            {
                "node_id": "timing_belt",
                "name": "Ремень зубчатый привода ГРМ",
                "description": "Усиленный полихлоропреновый ремень с полиамидной тканью зубьев и стекловолоконным кордом.",
                "category_slug": "engine",
                "keywords": ["ремень", "грм", "gates"],
                "exploded_offset": [0.0, 0.0, 1.4],
            },
            {
                "node_id": "crank_pulley",
                "name": "Шкив коленчатого вала демпферный",
                "description": "Зубчатый ведущий шкив с резиновым демпфером крутильных колебаний.",
                "category_slug": "engine",
                "keywords": ["шкив", "прокладк", "коленвал"],
                "exploded_offset": [0.0, -1.4, -0.7],
            },
            {
                "node_id": "tensioner_pulley",
                "name": "Ролик натяжителя ремня ГРМ",
                "description": "Автоматический натяжной ролик с эксцентриковым механизмом и закрытым подшипником.",
                "category_slug": "engine",
                "keywords": ["ролик", "натяжител", "ремень"],
                "exploded_offset": [-1.4, 0.8, 0.3],
            },
            {
                "node_id": "water_pump",
                "name": "Насос водяной системы охлаждения (помпа)",
                "description": "Водяная помпа с металлической крыльчаткой и керамическим торцевым уплотнением вала.",
                "category_slug": "engine",
                "keywords": ["помп", "насос", "прокладк"],
                "exploded_offset": [1.4, 0.4, -0.5],
            },
        ],
    },
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


def list_assemblies() -> list[AssemblySummary]:
    results = []
    for a_id, cfg in ASSEMBLIES_CONFIG.items():
        results.append(
            AssemblySummary(
                id=a_id,
                title=cfg["title"],
                subsystem=cfg["subsystem"],
                description=cfg["description"],
                parts_count=len(cfg["nodes"]),
                difficulty=cfg["difficulty"],
            )
        )
    return results


def get_assembly_detail(
    db: Session,
    assembly_id: str,
    vehicle_obj: Any | None = None,
) -> AssemblyDetailResponse:
    cfg = ASSEMBLIES_CONFIG.get(assembly_id)
    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"3D Assembly '{assembly_id}' not found",
        )

    nodes_result: list[AssemblyNodePart] = []

    for node_cfg in cfg["nodes"]:
        cat_slug = node_cfg["category_slug"]
        keywords = node_cfg["keywords"]

        # Find matching product in database
        category = db.scalar(select(Category).where(Category.slug == cat_slug))
        matched_product: Product | None = None

        if category:
            query = (
                select(Product)
                .options(
                    selectinload(Product.brand),
                    selectinload(Product.category),
                    selectinload(Product.images),
                )
                .where(
                    Product.status == ProductStatus.ACTIVE,
                    Product.category_id == category.id,
                )
            )

            # Filter by keywords if possible
            candidates = list(db.scalars(query))
            for cand in candidates:
                name_low = cand.name.lower()
                if any(kw in name_low for kw in keywords):
                    matched_product = cand
                    break

            if not matched_product and candidates:
                matched_product = candidates[0]

        # If still none found, fallback to any active product
        if not matched_product:
            matched_product = db.scalar(
                select(Product)
                .options(
                    selectinload(Product.brand),
                    selectinload(Product.category),
                    selectinload(Product.images),
                )
                .where(Product.status == ProductStatus.ACTIVE)
                .limit(1)
            )

        list_item: ProductListItem | None = None
        if matched_product:
            fitment_status = None
            if vehicle_obj is not None:
                fitment_status = compute_fitment(db, matched_product.id, vehicle_obj).value

            list_item = _product_to_list_item(matched_product, fitment=fitment_status)

        nodes_result.append(
            AssemblyNodePart(
                node_id=node_cfg["node_id"],
                name=node_cfg["name"],
                description=node_cfg["description"],
                category_slug=cat_slug,
                exploded_offset=node_cfg["exploded_offset"],
                matching_product=list_item,
            )
        )

    vehicle_title = None
    if vehicle_obj is not None:
        parts = []
        if getattr(vehicle_obj, "name", None):
            parts.append(vehicle_obj.name)
        elif getattr(vehicle_obj, "make", None):
            parts.append(vehicle_obj.make.name)
        if parts:
            vehicle_title = " ".join(parts)

    return AssemblyDetailResponse(
        id=assembly_id,
        title=cfg["title"],
        subsystem=cfg["subsystem"],
        description=cfg["description"],
        nodes=nodes_result,
        camera_initial=cfg["camera_initial"],
        vehicle_fitment_summary=vehicle_title,
    )

