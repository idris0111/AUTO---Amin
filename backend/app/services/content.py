import math
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.models.content import Article, ArticleCategory
from app.models.user import User
from app.schemas.content import (
    ArticleCreate,
    ArticleDetail,
    ArticleListResponse,
    ArticleSummary,
    ArticleUpdate,
    CategorySummary,
    estimate_reading_time,
    slugify,
)

CATEGORY_TITLES: dict[ArticleCategory, str] = {
    ArticleCategory.GUIDE: "Руководства",
    ArticleCategory.MAINTENANCE: "Техобслуживание",
    ArticleCategory.DIY: "Своими руками",
    ArticleCategory.REVIEW: "Обзоры и сравнения",
    ArticleCategory.NEWS: "Новости и тренды",
}


def list_articles(
    db: Session,
    category: ArticleCategory | None = None,
    tag: str | None = None,
    search: str | None = None,
    is_published: bool | None = True,
    page: int = 1,
    per_page: int = 12,
) -> ArticleListResponse:
    query = select(Article)

    if is_published is not None:
        query = query.where(Article.is_published == is_published)

    if category:
        query = query.where(Article.category == category)

    if tag:
        # SQLite / Postgres JSON search or substring
        query = query.where(func.lower(Article.tags).contains(tag.lower()))

    if search:
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Article.title).like(term),
                func.lower(Article.excerpt).like(term),
                func.lower(Article.content).like(term),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0

    total_pages = max(1, math.ceil(total / per_page)) if total > 0 else 1
    offset = (max(1, page) - 1) * per_page

    items = db.scalars(
        query.order_by(Article.published_at.desc().nullslast(), Article.created_at.desc())
        .offset(offset)
        .limit(per_page)
    ).all()

    summaries = [
        ArticleSummary.model_validate(item)
        for item in items
    ]

    return ArticleListResponse(
        items=summaries,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def get_article(
    db: Session,
    slug_or_id: str,
    increment_views: bool = True,
    published_only: bool = True,
) -> ArticleDetail:
    query = select(Article)

    is_uuid = False
    try:
        val_uuid = uuid.UUID(slug_or_id)
        query = query.where(Article.id == val_uuid)
        is_uuid = True
    except ValueError:
        query = query.where(Article.slug == slug_or_id)

    if published_only:
        query = query.where(Article.is_published == True)  # noqa: E712

    article = db.scalar(query)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статья не найдена")

    if increment_views:
        # Atomic view count increment
        db.execute(
            update(Article)
            .where(Article.id == article.id)
            .values(views_count=Article.views_count + 1)
        )
        db.commit()
        db.refresh(article)

    author_name = None
    if article.author_id:
        author = db.scalar(select(User).where(User.id == article.author_id))
        if author:
            parts = [p for p in (author.first_name, author.last_name) if p]
            author_name = " ".join(parts) if parts else author.email

    detail = ArticleDetail(
        id=article.id,
        slug=article.slug,
        title=article.title,
        excerpt=article.excerpt,
        content=article.content,
        cover_image=article.cover_image,
        category=article.category,
        tags=article.tags or [],
        is_published=article.is_published,
        views_count=article.views_count,
        reading_time_minutes=article.reading_time_minutes,
        seo_title=article.seo_title,
        seo_description=article.seo_description,
        seo_keywords=article.seo_keywords,
        author_id=article.author_id,
        author_name=author_name,
        created_at=article.created_at,
        updated_at=article.updated_at,
        published_at=article.published_at,
    )
    return detail


def create_article(
    db: Session,
    payload: ArticleCreate,
    author_id: uuid.UUID | None = None,
) -> ArticleDetail:
    raw_slug = payload.slug or slugify(payload.title)
    final_slug = raw_slug

    # Ensure unique slug
    counter = 1
    while db.scalar(select(Article.id).where(Article.slug == final_slug)):
        final_slug = f"{raw_slug}-{counter}"
        counter += 1

    reading_time = estimate_reading_time(payload.content)
    now = datetime.now(timezone.utc)

    article = Article(
        slug=final_slug,
        title=payload.title.strip(),
        excerpt=payload.excerpt.strip(),
        content=payload.content.strip(),
        cover_image=payload.cover_image,
        category=payload.category,
        tags=payload.tags,
        is_published=payload.is_published,
        views_count=0,
        reading_time_minutes=reading_time,
        seo_title=payload.seo_title or payload.title.strip(),
        seo_description=payload.seo_description or payload.excerpt.strip(),
        seo_keywords=payload.seo_keywords,
        author_id=author_id,
        published_at=now if payload.is_published else None,
    )
    db.add(article)
    db.commit()
    db.refresh(article)

    return get_article(db, str(article.id), increment_views=False, published_only=False)


def update_article(
    db: Session,
    article_id: uuid.UUID,
    payload: ArticleUpdate,
) -> ArticleDetail:
    article = db.scalar(select(Article).where(Article.id == article_id))
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статья не найдена")

    update_data = payload.model_dump(exclude_unset=True)

    if "title" in update_data and update_data["title"]:
        article.title = update_data["title"].strip()

    if "slug" in update_data and update_data["slug"]:
        new_slug = update_data["slug"].strip()
        existing = db.scalar(
            select(Article.id).where(Article.slug == new_slug, Article.id != article_id)
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Статья с таким адресом (slug) уже существует",
            )
        article.slug = new_slug

    if "excerpt" in update_data and update_data["excerpt"]:
        article.excerpt = update_data["excerpt"].strip()

    if "content" in update_data and update_data["content"]:
        article.content = update_data["content"].strip()
        article.reading_time_minutes = estimate_reading_time(article.content)

    if "category" in update_data and update_data["category"]:
        article.category = update_data["category"]

    if "cover_image" in update_data:
        article.cover_image = update_data["cover_image"]

    if "tags" in update_data and update_data["tags"] is not None:
        article.tags = update_data["tags"]

    if "seo_title" in update_data:
        article.seo_title = update_data["seo_title"]

    if "seo_description" in update_data:
        article.seo_description = update_data["seo_description"]

    if "seo_keywords" in update_data:
        article.seo_keywords = update_data["seo_keywords"]

    if "is_published" in update_data and update_data["is_published"] is not None:
        was_published = article.is_published
        article.is_published = update_data["is_published"]
        if article.is_published and not was_published:
            article.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(article)
    return get_article(db, str(article.id), increment_views=False, published_only=False)


def delete_article(db: Session, article_id: uuid.UUID) -> dict[str, Any]:
    article = db.scalar(select(Article).where(Article.id == article_id))
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статья не найдена")

    db.delete(article)
    db.commit()
    return {"success": True, "id": str(article_id)}


def toggle_publish(db: Session, article_id: uuid.UUID) -> ArticleDetail:
    article = db.scalar(select(Article).where(Article.id == article_id))
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статья не найдена")

    article.is_published = not article.is_published
    if article.is_published and not article.published_at:
        article.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(article)
    return get_article(db, str(article.id), increment_views=False, published_only=False)


def get_categories_summary(db: Session) -> list[CategorySummary]:
    results = []
    for cat in ArticleCategory:
        count = db.scalar(
            select(func.count(Article.id)).where(
                Article.category == cat, Article.is_published == True  # noqa: E712
            )
        ) or 0
        results.append(
            CategorySummary(
                category=cat,
                label=CATEGORY_TITLES.get(cat, cat.value),
                count=count,
            )
        )
    return results
