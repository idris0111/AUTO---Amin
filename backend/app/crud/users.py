import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import Address, User
from app.schemas.auth import RegisterRequest
from app.schemas.user import AddressCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


def get_user(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def create_user(db: Session, data: RegisterRequest, password_hash: str) -> User:
    user = User(
        email=str(data.email).lower(),
        password_hash=password_hash,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        phone=data.phone,
    )
    db.add(user)
    db.flush()
    return user


def create_address(db: Session, user: User, data: AddressCreate) -> Address:
    address = Address(user_id=user.id, **data.model_dump())
    db.add(address)
    db.flush()
    return address

