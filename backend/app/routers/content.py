import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.database import get_db
from app.dependencies import get_current_user, require_permission
from app.models.content import ArticleCategory
from app.models.user import User
from app.schemas.content import (
    ArticleCreate,
    ArticleDetail,
    ArticleListResponse,
    ArticleUpdate,
    CategorySummary,
)
from app.services import content as content_service

router = APIRouter(prefix="/content", tags=["Content & Blog"])
admin_router = APIRouter(prefix="/admin/content", tags=["Admin Content"])


# ==========================================
# PUBLIC ENDPOINTS
# ==========================================

@router.get("/articles", response_model=ArticleListResponse)
def get_articles(
    category: ArticleCategory | None = None,
    tag: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
) -> ArticleListResponse:
    """Get published articles with pagination, category filtering and full-text search."""
    return content_service.list_articles(
        db=db,
        category=category,
        tag=tag,
        search=search,
        is_published=True,
        page=page,
        per_page=per_page,
    )


@router.get("/articles/{slug_or_id}", response_model=ArticleDetail)
def get_article_detail(
    slug_or_id: str,
    db: Session = Depends(get_db),
) -> ArticleDetail:
    """Get published article detail by slug or ID and increment view counter."""
    return content_service.get_article(
        db=db,
        slug_or_id=slug_or_id,
        increment_views=True,
        published_only=True,
    )


@router.get("/categories", response_model=list[CategorySummary])
def get_categories(
    response: Response,
    db: Session = Depends(get_db),
) -> list[CategorySummary]:
    """Get content categories with published article counts."""
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    return content_service.get_categories_summary(db)


# ==========================================
# ADMIN / STAFF ENDPOINTS
# ==========================================

@admin_router.get("/articles", response_model=ArticleListResponse)
def admin_get_articles(
    category: ArticleCategory | None = None,
    search: str | None = None,
    is_published: bool | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: Annotated[User, Depends(require_permission(Permission.MANAGE_CONTENT))] = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> ArticleListResponse:
    """Staff endpoint: list all articles including drafts."""
    return content_service.list_articles(
        db=db,
        category=category,
        search=search,
        is_published=is_published,
        page=page,
        per_page=per_page,
    )


@admin_router.post("/articles", response_model=ArticleDetail, status_code=status.HTTP_201_CREATED)
def admin_create_article(
    payload: ArticleCreate,
    current_user: Annotated[User, Depends(require_permission(Permission.MANAGE_CONTENT))] = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> ArticleDetail:
    """Staff endpoint: create a new knowledge-base or blog article."""
    return content_service.create_article(
        db=db,
        payload=payload,
        author_id=current_user.id if current_user else None,
    )


@admin_router.put("/articles/{article_id}", response_model=ArticleDetail)
def admin_update_article(
    article_id: uuid.UUID,
    payload: ArticleUpdate,
    current_user: Annotated[User, Depends(require_permission(Permission.MANAGE_CONTENT))] = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> ArticleDetail:
    """Staff endpoint: update an existing article."""
    return content_service.update_article(
        db=db,
        article_id=article_id,
        payload=payload,
    )


@admin_router.delete("/articles/{article_id}")
def admin_delete_article(
    article_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_permission(Permission.MANAGE_CONTENT))] = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> dict:
    """Staff endpoint: delete an article."""
    return content_service.delete_article(db=db, article_id=article_id)


@admin_router.patch("/articles/{article_id}/toggle-publish", response_model=ArticleDetail)
def admin_toggle_publish(
    article_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_permission(Permission.MANAGE_CONTENT))] = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> ArticleDetail:
    """Staff endpoint: toggle draft / published status."""
    return content_service.toggle_publish(db=db, article_id=article_id)

