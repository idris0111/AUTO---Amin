import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud.users import create_address
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Address, User
from app.schemas.user import AddressCreate, AddressRead, AddressUpdate

router = APIRouter(prefix="/addresses", tags=["Addresses"])


def owned_address(db: Session, user_id: uuid.UUID, address_id: uuid.UUID) -> Address:
    address = db.scalar(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    )
    if address is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    return address


def clear_default(db: Session, user_id: uuid.UUID, except_id: uuid.UUID | None = None) -> None:
    query = update(Address).where(Address.user_id == user_id)
    if except_id is not None:
        query = query.where(Address.id != except_id)
    db.execute(query.values(is_default=False))


@router.get("", response_model=list[AddressRead])
def list_addresses(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[Address]:
    return list(
        db.scalars(
            select(Address).where(Address.user_id == current_user.id).order_by(Address.created_at)
        )
    )


@router.post("", response_model=AddressRead, status_code=status.HTTP_201_CREATED)
def add_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Address:
    if data.is_default:
        clear_default(db, current_user.id)
    try:
        address = create_address(db, current_user, data)
        db.commit()
        db.refresh(address)
        return address
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Address label already exists") from exc


@router.patch("/{address_id}", response_model=AddressRead)
def update_address(
    address_id: uuid.UUID,
    data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Address:
    address = owned_address(db, current_user.id, address_id)
    values = data.model_dump(exclude_unset=True)
    if values.get("is_default"):
        clear_default(db, current_user.id, address.id)
    for field, value in values.items():
        setattr(address, field, value.strip() if isinstance(value, str) else value)
    try:
        db.commit()
        db.refresh(address)
        return address
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Address label already exists") from exc


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    address = owned_address(db, current_user.id, address_id)
    db.delete(address)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

