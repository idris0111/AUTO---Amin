import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import Permission, require_permission
from app.schemas.shipping import (
    ShippingQuoteRead,
    ShippingQuoteRequest,
    ShippingZoneCreate,
    ShippingZoneRead,
    ShippingZoneUpdate,
)
from app.services import shipping as shipping_service

router = APIRouter(tags=["Shipping"])


@router.post("/shipping/quote", response_model=ShippingQuoteRead)
def shipping_quote(data: ShippingQuoteRequest, db: Session = Depends(get_db)) -> ShippingQuoteRead:
    return shipping_service.quote_for_city(db, data.city, data.subtotal)


@router.get("/shipping/zones", response_model=list[ShippingZoneRead])
def public_zones(db: Session = Depends(get_db)) -> list[ShippingZoneRead]:
    return [z for z in shipping_service.list_zones(db) if z.is_active]


@router.get("/admin/shipping-zones", response_model=list[ShippingZoneRead])
def admin_list_zones(
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> list[ShippingZoneRead]:
    return shipping_service.list_zones(db)


@router.post("/admin/shipping-zones", response_model=ShippingZoneRead, status_code=201)
def admin_create_zone(
    data: ShippingZoneCreate,
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> ShippingZoneRead:
    return shipping_service.create_zone(db, data)


@router.patch("/admin/shipping-zones/{zone_id}", response_model=ShippingZoneRead)
def admin_update_zone(
    zone_id: uuid.UUID,
    data: ShippingZoneUpdate,
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> ShippingZoneRead:
    return shipping_service.update_zone(db, zone_id, data)


@router.delete("/admin/shipping-zones/{zone_id}", status_code=204)
def admin_delete_zone(
    zone_id: uuid.UUID,
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> None:
    shipping_service.delete_zone(db, zone_id)
