import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.vehicle import VehicleMake, VehicleModel
from app.schemas.vehicle import (
    UserVehicleCreate,
    UserVehicleRead,
    UserVehicleUpdate,
    VehicleMakeWithModels,
    VehicleModelRead,
)
from app.services import vehicles as vehicle_service

public_router = APIRouter(prefix="/vehicles", tags=["Vehicles"])
garage_router = APIRouter(prefix="/garage", tags=["Garage"])


@public_router.get("", response_model=list[VehicleMakeWithModels])
def vehicle_tree(db: Session = Depends(get_db)) -> list:
    return vehicle_service.make_model_tree(db)


@public_router.get("/{make_slug}/models", response_model=list[VehicleModelRead])
def models_by_make(make_slug: str, db: Session = Depends(get_db)) -> list[VehicleModel]:
    make = db.scalar(
        select(VehicleMake).where(VehicleMake.slug == make_slug, VehicleMake.is_active.is_(True))
    )
    if make is None:
        return []
    return list(
        db.scalars(
            select(VehicleModel)
            .where(VehicleModel.make_id == make.id, VehicleModel.is_active.is_(True))
            .order_by(VehicleModel.name)
        )
    )


@garage_router.get("", response_model=list[UserVehicleRead])
def list_vehicles(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list:
    return vehicle_service.list_user_vehicles(db, current_user)


@garage_router.post("", response_model=UserVehicleRead, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    data: UserVehicleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserVehicleRead:
    return vehicle_service.create_user_vehicle(db, current_user, data)


@garage_router.get("/{vehicle_id}", response_model=UserVehicleRead)
def read_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserVehicleRead:
    return vehicle_service.get_user_vehicle(db, current_user, vehicle_id)


@garage_router.patch("/{vehicle_id}", response_model=UserVehicleRead)
def edit_vehicle(
    vehicle_id: uuid.UUID,
    data: UserVehicleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserVehicleRead:
    vehicle = vehicle_service.get_user_vehicle(db, current_user, vehicle_id)
    return vehicle_service.update_user_vehicle(db, current_user, vehicle, data)


@garage_router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    vehicle = vehicle_service.get_user_vehicle(db, current_user, vehicle_id)
    vehicle_service.delete_user_vehicle(db, vehicle)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
