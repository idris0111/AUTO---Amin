import uuid
from enum import Enum

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.user import User
from app.models.vehicle import (
    Engine,
    ProductCompatibility,
    UserVehicle,
    VehicleGeneration,
    VehicleMake,
    VehicleModification,
    VehicleModel,
)
from app.schemas.vehicle import UserVehicleCreate, UserVehicleUpdate


class FitmentStatus(str, Enum):
    COMPATIBLE = "compatible"
    NOT_COMPATIBLE = "not_compatible"
    UNKNOWN = "unknown"


VEHICLE_LOADS = (
    selectinload(UserVehicle.make),
    selectinload(UserVehicle.model),
    selectinload(UserVehicle.generation),
    selectinload(UserVehicle.modification),
    selectinload(UserVehicle.engine),
)


def _validate_hierarchy(
    db: Session,
    make_id: uuid.UUID,
    model_id: uuid.UUID | None,
    generation_id: uuid.UUID | None,
    modification_id: uuid.UUID | None,
    engine_id: uuid.UUID | None,
) -> None:
    if db.get(VehicleMake, make_id) is None:
        raise HTTPException(status_code=404, detail="Vehicle make not found")
    if model_id is not None:
        model = db.get(VehicleModel, model_id)
        if model is None or model.make_id != make_id:
            raise HTTPException(status_code=404, detail="Model not found for this make")
    if generation_id is not None:
        generation = db.get(VehicleGeneration, generation_id)
        if generation is None or (model_id is not None and generation.model_id != model_id):
            raise HTTPException(status_code=404, detail="Generation not found for this model")
    if modification_id is not None:
        modification = db.get(VehicleModification, modification_id)
        if modification is None or (
            generation_id is not None and modification.generation_id != generation_id
        ):
            raise HTTPException(status_code=404, detail="Modification not found for this generation")
    if engine_id is not None:
        engine = db.get(Engine, engine_id)
        if engine is None or (
            modification_id is not None and engine.modification_id != modification_id
        ):
            raise HTTPException(status_code=404, detail="Engine not found for this modification")


def _clear_primary(db: Session, user_id: uuid.UUID, except_id: uuid.UUID | None = None) -> None:
    query = select(UserVehicle).where(UserVehicle.user_id == user_id, UserVehicle.is_primary.is_(True))
    if except_id is not None:
        query = query.where(UserVehicle.id != except_id)
    for vehicle in db.scalars(query):
        vehicle.is_primary = False


def list_user_vehicles(db: Session, user: User) -> list[UserVehicle]:
    return list(
        db.scalars(
            select(UserVehicle)
            .options(*VEHICLE_LOADS)
            .where(UserVehicle.user_id == user.id)
            .order_by(UserVehicle.is_primary.desc(), UserVehicle.created_at)
        )
    )


def get_user_vehicle(db: Session, user: User, vehicle_id: uuid.UUID) -> UserVehicle:
    vehicle = db.scalar(
        select(UserVehicle)
        .options(*VEHICLE_LOADS)
        .where(UserVehicle.id == vehicle_id, UserVehicle.user_id == user.id)
    )
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


def create_user_vehicle(db: Session, user: User, data: UserVehicleCreate) -> UserVehicle:
    _validate_hierarchy(db, data.make_id, data.model_id, data.generation_id, data.modification_id, data.engine_id)
    existing = db.scalar(
        select(UserVehicle.id).where(UserVehicle.user_id == user.id, UserVehicle.name == data.name)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vehicle name already exists")
    if data.is_primary:
        _clear_primary(db, user.id)
    vehicle = UserVehicle(user_id=user.id, **data.model_dump())
    db.add(vehicle)
    db.commit()
    return get_user_vehicle(db, user, vehicle.id)


def update_user_vehicle(
    db: Session, user: User, vehicle: UserVehicle, data: UserVehicleUpdate
) -> UserVehicle:
    values = data.model_dump(exclude_unset=True)
    make_id = values.get("make_id", vehicle.make_id)
    model_id = values.get("model_id", vehicle.model_id)
    generation_id = values.get("generation_id", vehicle.generation_id)
    modification_id = values.get("modification_id", vehicle.modification_id)
    engine_id = values.get("engine_id", vehicle.engine_id)
    _validate_hierarchy(db, make_id, model_id, generation_id, modification_id, engine_id)
    if "name" in values:
        clash = db.scalar(
            select(UserVehicle.id).where(
                UserVehicle.user_id == user.id,
                UserVehicle.name == values["name"],
                UserVehicle.id != vehicle.id,
            )
        )
        if clash is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vehicle name already exists")
    if values.get("is_primary"):
        _clear_primary(db, user.id, except_id=vehicle.id)
    for field, value in values.items():
        setattr(vehicle, field, value)
    db.commit()
    return get_user_vehicle(db, user, vehicle.id)


def delete_user_vehicle(db: Session, vehicle: UserVehicle) -> None:
    db.delete(vehicle)
    db.commit()


def compute_fitment(db: Session, product_id: uuid.UUID, vehicle: UserVehicle) -> FitmentStatus:
    rows = list(
        db.scalars(select(ProductCompatibility).where(ProductCompatibility.product_id == product_id))
    )
    if not rows:
        return FitmentStatus.UNKNOWN
    for row in rows:
        if row.make_id != vehicle.make_id:
            continue
        if row.model_id is not None and vehicle.model_id != row.model_id:
            continue
        if row.generation_id is not None and vehicle.generation_id != row.generation_id:
            continue
        if row.modification_id is not None and vehicle.modification_id != row.modification_id:
            continue
        if row.engine_id is not None and vehicle.engine_id != row.engine_id:
            continue
        if vehicle.year is not None:
            if row.year_from is not None and vehicle.year < row.year_from:
                continue
            if row.year_to is not None and vehicle.year > row.year_to:
                continue
        return FitmentStatus.COMPATIBLE
    return FitmentStatus.NOT_COMPATIBLE


def add_compatibility(db: Session, product_id: uuid.UUID, data) -> ProductCompatibility:
    _validate_hierarchy(
        db, data.make_id, data.model_id, data.generation_id, data.modification_id, data.engine_id
    )
    row = ProductCompatibility(product_id=product_id, **data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_model_tree(db: Session) -> list[VehicleMake]:
    makes = list(
        db.scalars(
            select(VehicleMake)
            .where(VehicleMake.is_active.is_(True))
            .options(selectinload(VehicleMake.models).selectinload(VehicleModel.generations).selectinload(
                VehicleGeneration.modifications
            ).selectinload(VehicleModification.engines))
            .order_by(VehicleMake.name)
        )
    )
    return makes
