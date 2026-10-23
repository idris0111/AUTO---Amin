from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.analytics import AnalyticsDashboardResponse
from app.services import analytics as analytics_service

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics & BI"])


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
def get_analytics_dashboard(
    days: int = Query(default=7, ge=1, le=90),
    current_user: Annotated[User, Depends(require_permission(Permission.VIEW_STATISTICS))] = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> AnalyticsDashboardResponse:
    """Return comprehensive e-commerce BI metrics and charts."""
    return analytics_service.get_analytics_dashboard(db, days=days)

