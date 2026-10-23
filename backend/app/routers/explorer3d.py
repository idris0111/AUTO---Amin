import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user_optional
from app.models.user import User
from app.schemas.explorer3d import AssemblyDetailResponse, AssemblySummary
from app.services import explorer3d as explorer_service
from app.services import vehicles as vehicle_service

router = APIRouter(prefix="/3d", tags=["3D Parts Explorer"])


@router.get("/assemblies", response_model=list[AssemblySummary])
def list_assemblies(response: Response) -> list[AssemblySummary]:
    """Return all available interactive 3D vehicle assemblies."""
    response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=1200"
    return explorer_service.list_assemblies()


@router.get("/assemblies/{assembly_id}", response_model=AssemblyDetailResponse)
def get_assembly_detail(
    assembly_id: str,
    db: Session = Depends(get_db),
    vehicle_id: Optional[uuid.UUID] = Query(default=None),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> AssemblyDetailResponse:
    """Get full node hierarchy, 3D exploded vectors, and matched catalog products for a specific assembly."""
    vehicle_obj = None
    if vehicle_id is not None and current_user is not None:
        vehicle_obj = vehicle_service.get_user_vehicle(db, current_user, vehicle_id)

    return explorer_service.get_assembly_detail(
        db=db,
        assembly_id=assembly_id,
        vehicle_obj=vehicle_obj,
    )

