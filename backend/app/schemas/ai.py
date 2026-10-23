import uuid
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class QuickSymptomPrompt(BaseModel):
    id: str
    title: str
    symptom: str
    system_category: str
    icon: str
    short_description: str


class AiDiagnosticRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    symptom: str = Field(
        min_length=3,
        max_length=1500,
        description="Описание проблемы или симптома неисправности автомобиля",
    )
    vehicle_id: uuid.UUID | None = Field(
        default=None,
        description="ID сохранённого автомобиля в гараже пользователя",
    )
    make_id: uuid.UUID | None = Field(default=None, description="ID марки автомобиля")
    model_id: uuid.UUID | None = Field(default=None, description="ID модели автомобиля")
    generation_id: uuid.UUID | None = Field(default=None, description="ID поколения автомобиля")
    modification_id: uuid.UUID | None = Field(default=None, description="ID модификации")
    engine_id: uuid.UUID | None = Field(default=None, description="ID двигателя")
    year: int | None = Field(default=None, ge=1950, le=2030, description="Год выпуска")
    mileage_km: int | None = Field(default=None, ge=0, le=2000000, description="Текущий пробег (км)")


class RecommendedProduct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    sku: str
    price: Decimal
    old_price: Decimal | None
    stock_quantity: int
    rating_avg: Decimal
    brand_name: str
    category_name: str
    category_slug: str
    image_url: str | None = None
    fitment_status: Literal["compatible", "not_compatible", "unknown"]
    relevance_reason: str


class AiDiagnosticResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    query_symptom: str
    vehicle_summary: str | None
    system_affected: str
    urgency: Literal["low", "medium", "high", "critical"]
    primary_diagnosis: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    possible_causes: list[str]
    safety_warning: str | None = None
    can_drive: bool
    diagnostic_steps: list[str]
    estimated_repair_time: str
    difficulty: Literal["easy", "medium", "hard", "professional"]
    recommended_products: list[RecommendedProduct] = []
    advice: str
    is_ai_enhanced: bool = False

