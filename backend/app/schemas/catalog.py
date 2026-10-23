import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.catalog import ProductStatus


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parent_id: uuid.UUID | None
    name: str
    slug: str
    description: str | None
    icon: str | None
    image_url: str | None
    position: int
    is_active: bool
    children: list["CategoryRead"] = []


class CategoryAdminBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=220, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    parent_id: uuid.UUID | None = None
    description: str | None = None
    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)
    icon: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)
    position: int = 0
    is_active: bool = True


class CategoryCreate(CategoryAdminBase):
    pass


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=220)
    parent_id: uuid.UUID | None = None
    description: str | None = None
    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)
    icon: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)
    position: int | None = None
    is_active: bool | None = None


class BrandRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    country: str | None
    logo_url: str | None
    description: str | None
    is_active: bool


class BrandCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=220, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    country: str | None = Field(default=None, max_length=100)
    logo_url: str | None = Field(default=None, max_length=500)
    description: str | None = None
    is_active: bool = True


class BrandUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=220)
    country: str | None = Field(default=None, max_length=100)
    logo_url: str | None = Field(default=None, max_length=500)
    description: str | None = None
    is_active: bool | None = None


class ProductImageIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    url: str = Field(min_length=1, max_length=500)
    alt: str | None = Field(default=None, max_length=300)
    position: int = 0
    is_primary: bool = False


class ProductImageRead(ProductImageIn):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    id: uuid.UUID


class ProductSpecificationIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    value: str = Field(min_length=1, max_length=500)
    unit: str | None = Field(default=None, max_length=50)
    position: int = 0


class ProductSpecificationRead(ProductSpecificationIn):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    id: uuid.UUID


class OEMNumberIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    number: str = Field(min_length=1, max_length=64)
    manufacturer: str | None = Field(default=None, max_length=200)


class OEMNumberRead(OEMNumberIn):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    id: uuid.UUID


class CrossReferenceIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    number: str = Field(min_length=1, max_length=64)
    brand_name: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=500)


class CrossReferenceRead(CrossReferenceIn):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    id: uuid.UUID


class ProductBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=300)
    sku: str = Field(min_length=1, max_length=64)
    slug: str = Field(min_length=1, max_length=250, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    brand_id: uuid.UUID
    category_id: uuid.UUID
    description: str | None = None
    short_description: str | None = Field(default=None, max_length=500)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    old_price: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    stock_quantity: int = Field(default=0, ge=0)
    status: ProductStatus = ProductStatus.DRAFT
    warranty_months: int | None = Field(default=None, ge=0)
    weight_kg: Decimal | None = Field(default=None, gt=0)
    length_mm: int | None = Field(default=None, ge=0)
    width_mm: int | None = Field(default=None, ge=0)
    height_mm: int | None = Field(default=None, ge=0)
    country_of_origin: str | None = Field(default=None, max_length=100)
    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)

    @field_validator("old_price")
    @classmethod
    def old_price_must_exceed_price(cls, value: Decimal | None, info) -> Decimal | None:
        price = info.data.get("price")
        if value is not None and price is not None and value <= price:
            raise ValueError("old_price must be greater than price")
        return value


class ProductCreate(ProductBase):
    images: list[ProductImageIn] = []
    specifications: list[ProductSpecificationIn] = []
    oem_numbers: list[OEMNumberIn] = []
    cross_references: list[CrossReferenceIn] = []


class ProductUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=300)
    slug: str | None = Field(default=None, min_length=1, max_length=250)
    brand_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    description: str | None = None
    short_description: str | None = Field(default=None, max_length=500)
    price: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    old_price: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    stock_quantity: int | None = Field(default=None, ge=0)
    status: ProductStatus | None = None
    warranty_months: int | None = Field(default=None, ge=0)
    weight_kg: Decimal | None = Field(default=None, gt=0)
    length_mm: int | None = Field(default=None, ge=0)
    width_mm: int | None = Field(default=None, ge=0)
    height_mm: int | None = Field(default=None, ge=0)
    country_of_origin: str | None = Field(default=None, max_length=100)
    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)
    images: list[ProductImageIn] | None = None
    specifications: list[ProductSpecificationIn] | None = None
    oem_numbers: list[OEMNumberIn] | None = None
    cross_references: list[CrossReferenceIn] | None = None


class ProductBrandBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    logo_url: str | None


class ProductCategoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    id: uuid.UUID
    status: ProductStatus
    rating_avg: Decimal
    rating_count: int
    views_count: int
    created_at: datetime
    updated_at: datetime
    brand: ProductBrandBrief
    category: ProductCategoryBrief
    images: list[ProductImageRead] = []
    specifications: list[ProductSpecificationRead] = []
    oem_numbers: list[OEMNumberRead] = []
    cross_references: list[CrossReferenceRead] = []
    fitment: str | None = None


class ProductListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    sku: str
    price: Decimal
    old_price: Decimal | None
    stock_quantity: int
    rating_avg: Decimal
    rating_count: int
    brand: ProductBrandBrief
    category: ProductCategoryBrief
    image_url: str | None = None
    fitment: str | None = None


class PaginatedProducts(BaseModel):
    items: list[ProductListItem]
    total: int
    offset: int
    limit: int


class SpecificationComparisonRow(BaseModel):
    name: str
    values: dict[str, str | None]
    is_different: bool


class ProductComparisonResponse(BaseModel):
    products: list[ProductRead]
    specifications_matrix: list[SpecificationComparisonRow]
    all_spec_names: list[str]
    is_same_category: bool
