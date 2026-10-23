import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.shipping import ShippingZone
from app.schemas.shipping import ShippingQuoteRead, ShippingZoneCreate, ShippingZoneUpdate

DEFAULT_COURIER_FEE = Decimal("60.00")


def quote_for_city(db: Session, city: str, subtotal: Decimal) -> ShippingQuoteRead:
    zone = db.scalar(
        select(ShippingZone).where(ShippingZone.city.ilike(city.strip()), ShippingZone.is_active.is_(True))
    )
    if zone is None:
        return ShippingQuoteRead(
            city=city,
            fee=DEFAULT_COURIER_FEE,
            eta_days_min=2,
            eta_days_max=5,
            zone_found=False,
        )
    fee = Decimal("0") if zone.free_from is not None and subtotal >= zone.free_from else zone.fee
    return ShippingQuoteRead(
        city=zone.city,
        fee=fee,
        eta_days_min=zone.eta_days_min,
        eta_days_max=zone.eta_days_max,
        zone_found=True,
    )


def courier_fee(db: Session, city: str, subtotal: Decimal) -> Decimal:
    return quote_for_city(db, city, subtotal).fee


def list_zones(db: Session) -> list[ShippingZone]:
    return list(db.scalars(select(ShippingZone).order_by(ShippingZone.city)))


def create_zone(db: Session, data: ShippingZoneCreate) -> ShippingZone:
    if db.scalar(select(ShippingZone.id).where(ShippingZone.city == data.city)):
        raise HTTPException(status_code=409, detail="Зона для города уже существует")
    zone = ShippingZone(**data.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


def update_zone(db: Session, zone_id: uuid.UUID, data: ShippingZoneUpdate) -> ShippingZone:
    zone = db.get(ShippingZone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Shipping zone not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(zone, key, value)
    db.commit()
    db.refresh(zone)
    return zone


def delete_zone(db: Session, zone_id: uuid.UUID) -> None:
    zone = db.get(ShippingZone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Shipping zone not found")
    db.delete(zone)
    db.commit()
