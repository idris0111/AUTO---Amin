import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import Permission, require_permission
from app.schemas.coupon import CouponCreate, CouponRead, CouponUpdate, CouponValidateRequest, CouponValidateResult
from app.services import coupons as coupon_service

router = APIRouter(tags=["Coupons"])


@router.post("/coupons/validate", response_model=CouponValidateResult)
def validate_coupon(data: CouponValidateRequest, db: Session = Depends(get_db)) -> CouponValidateResult:
    discount = coupon_service.validate_coupon(db, data.code, data.subtotal)
    return CouponValidateResult(code=data.code.strip().upper(), discount=discount)


@router.get("/admin/coupons", response_model=list[CouponRead])
def admin_list_coupons(
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> list[CouponRead]:
    return coupon_service.list_coupons(db)


@router.post("/admin/coupons", response_model=CouponRead, status_code=201)
def admin_create_coupon(
    data: CouponCreate,
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> CouponRead:
    return coupon_service.create_coupon(db, data)


@router.patch("/admin/coupons/{coupon_id}", response_model=CouponRead)
def admin_update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> CouponRead:
    return coupon_service.update_coupon(db, coupon_id, data)


@router.delete("/admin/coupons/{coupon_id}", status_code=204)
def admin_delete_coupon(
    coupon_id: uuid.UUID,
    _: None = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> None:
    coupon_service.delete_coupon(db, coupon_id)
