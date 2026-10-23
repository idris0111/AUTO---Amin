import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import Permission, require_permission
from app.models.inventory import StockMovement, Warehouse, WarehouseStock
from app.models.user import User, UserRole
from app.schemas.loyalty import AdminAdjustPointsRequest, LoyaltyAccountRead
from app.schemas.user import UserAdminUpdate, UserRead
from app.services.auth import revoke_all_user_tokens

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserRead])
def list_users(
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, max_length=100),
    role: Optional[UserRole] = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[User]:
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.email).like(term),
                func.lower(User.first_name).like(term),
                func.lower(User.last_name).like(term),
            )
        )
    return list(db.scalars(stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)))


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user_access(
    user_id: uuid.UUID,
    data: UserAdminUpdate,
    admin: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id and data.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot block yourself")
    if user.id == admin.id and data.role is not None and data.role != admin.role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")

    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
        if not data.is_active:
            user.token_version += 1
            revoke_all_user_tokens(db, user.id)
    db.commit()
    db.refresh(user)
    return user


@router.get("/inventory/warehouses")
def list_warehouses(
    _: User = Depends(require_permission(Permission.MANAGE_CATALOG)),
    db: Session = Depends(get_db),
) -> list[dict]:
    warehouses = list(db.scalars(select(Warehouse).order_by(Warehouse.is_default.desc(), Warehouse.name)))
    results = []
    for wh in warehouses:
        total_items = db.scalar(
            select(func.coalesce(func.sum(WarehouseStock.quantity), 0)).where(WarehouseStock.warehouse_id == wh.id)
        ) or 0
        results.append({
            "id": wh.id,
            "code": wh.code,
            "name": wh.name,
            "city": wh.city,
            "address": wh.address,
            "is_default": wh.is_default,
            "is_active": wh.is_active,
            "total_items": total_items,
            "items_count": total_items,
            "created_at": wh.created_at,
        })
    return results


@router.get("/inventory/movements")
def list_stock_movements(
    _: User = Depends(require_permission(Permission.MANAGE_CATALOG)),
    db: Session = Depends(get_db),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[dict]:
    movements = list(
        db.scalars(
            select(StockMovement)
            .options(selectinload(StockMovement.warehouse), selectinload(StockMovement.product))
            .order_by(StockMovement.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )
    return [
        {
            "id": m.id,
            "product_id": m.product_id,
            "product_name": m.product.name if m.product else "Удалённый товар",
            "product_sku": m.product.sku if m.product else "—",
            "warehouse_code": m.warehouse.code if m.warehouse else "—",
            "warehouse_name": m.warehouse.name if m.warehouse else "—",
            "movement_type": m.movement_type,
            "quantity_delta": m.quantity_delta,
            "balance_after": m.balance_after,
            "order_id": m.order_id,
            "reason": m.reason,
            "created_at": m.created_at,
        }
        for m in movements
    ]


@router.post("/loyalty/{user_id}/adjust", response_model=LoyaltyAccountRead)
def admin_adjust_user_points(
    user_id: uuid.UUID,
    data: AdminAdjustPointsRequest,
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db),
) -> LoyaltyAccountRead:
    from app.services import loyalty as loyalty_service

    loyalty_service.admin_adjust_points(db, user_id, data.amount, data.description)
    return loyalty_service.get_account_profile(db, user_id)

