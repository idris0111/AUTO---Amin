import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=10, max_length=4000)


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    rating: int
    text: str
    status: str
    is_verified_purchase: bool
    created_at: datetime
    author_name: str


class FavoriteToggleResult(BaseModel):
    product_id: uuid.UUID
    is_favorite: bool
