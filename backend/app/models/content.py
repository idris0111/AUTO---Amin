import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, JSON, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import UTCDateTime
from app.database import Base


class ArticleCategory(str, enum.Enum):
    GUIDE = "guide"              # Руководство
    MAINTENANCE = "maintenance"  # Техобслуживание
    DIY = "diy"                  # Своими руками
    REVIEW = "review"            # Обзоры и сравнения
    NEWS = "news"                # Новости и тренды


article_category_enum = Enum(
    ArticleCategory,
    name="article_category",
    native_enum=False,
    create_constraint=False,
    length=32,
)


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = (
        Index("ix_articles_slug", "slug", unique=True),
        Index("ix_articles_category", "category"),
        Index("ix_articles_is_published", "is_published"),
        Index("ix_articles_published_at", "published_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title: Mapped[str] = mapped_column(String(255))
    excerpt: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[ArticleCategory] = mapped_column(article_category_enum, default=ArticleCategory.GUIDE)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, server_default=text("'[]'"))
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    views_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=5, server_default=text("5"))

    # SEO metadata
    seo_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seo_keywords: Mapped[str | None] = mapped_column(String(500), nullable=True)

    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), onupdate=func.now())
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, server_default=func.now())

    author: Mapped["User | None"] = relationship()  # noqa: F821

