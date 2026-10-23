import uuid
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

from app.schemas.catalog import ProductListItem


class GarageRecommendationsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vehicle_id: uuid.UUID | None = None
    vehicle_name: str
    maintenance_parts: list[ProductListItem]
    popular_compatible: list[ProductListItem]


class FrequentlyBoughtTogetherResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_product_id: uuid.UUID
    items: list[ProductListItem]
    total_bundle_price: Decimal
    total_savings: Decimal

