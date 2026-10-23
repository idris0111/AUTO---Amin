import math
import re
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.content import ArticleCategory


def slugify(text: str) -> str:
    """Produce an ASCII-friendly or sanitized url slug."""
    # Transliterate Russian/Cyrillic to Latin
    translit_map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'ғ': 'gh', 'ӣ': 'i', 'қ': 'q', 'ӯ': 'u', 'ҳ': 'h', 'ҷ': 'j'
    }
    lowered = text.strip().lower()
    transliterated = "".join(translit_map.get(ch, ch) for ch in lowered)
    cleaned = re.sub(r'[^a-z0-9\s-]', '', transliterated)
    slug = re.sub(r'[\s-]+', '-', cleaned).strip('-')
    return slug or f"article-{uuid.uuid4().hex[:8]}"


def estimate_reading_time(text: str, words_per_minute: int = 180) -> int:
    """Calculate reading time in minutes."""
    words = len(re.findall(r'\w+', text))
    minutes = math.ceil(words / words_per_minute)
    return max(1, minutes)


class ArticleBase(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    excerpt: str = Field(min_length=10)
    category: ArticleCategory = ArticleCategory.GUIDE
    cover_image: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_published: bool = True
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None


class ArticleCreate(ArticleBase):
    slug: str | None = Field(default=None, max_length=160)
    content: str = Field(min_length=20)


class ArticleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    slug: str | None = Field(default=None, max_length=160)
    excerpt: str | None = Field(default=None, min_length=10)
    content: str | None = Field(default=None, min_length=20)
    category: ArticleCategory | None = None
    cover_image: str | None = None
    tags: list[str] | None = None
    is_published: bool | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None


class ArticleSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    excerpt: str
    category: ArticleCategory
    cover_image: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_published: bool
    views_count: int
    reading_time_minutes: int
    published_at: datetime | None = None
    created_at: datetime


class ArticleDetail(ArticleSummary):
    content: str
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None
    updated_at: datetime
    author_id: uuid.UUID | None = None
    author_name: str | None = None


class ArticleListResponse(BaseModel):
    items: list[ArticleSummary]
    total: int
    page: int
    per_page: int
    total_pages: int


class CategorySummary(BaseModel):
    category: ArticleCategory
    label: str
    count: int

