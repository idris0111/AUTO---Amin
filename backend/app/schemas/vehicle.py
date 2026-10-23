import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field



class EngineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    displacement_l: Decimal | None
    power_hp: int | None
    fuel_type: str | None


class VehicleModificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    year_from: int | None
    year_to: int | None
    engines: list[EngineRead] = []


class VehicleGenerationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    body_code: str | None
    year_from: int | None
    year_to: int | None
    modifications: list[VehicleModificationRead] = []


class VehicleModelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    category: str | None
    generations: list[VehicleGenerationRead] = []


class VehicleMakeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    country: str | None
    logo_url: str | None


class VehicleMakeWithModels(VehicleMakeRead):
    models: list[VehicleModelRead] = []


class VehicleMakeCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    country: str | None = Field(default=None, max_length=100)
    logo_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class VehicleModelCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    category: str | None = Field(default=None, max_length=100)
    is_active: bool = True


class VehicleGenerationCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    body_code: str | None = Field(default=None, max_length=50)
    year_from: int | None = Field(default=None, ge=1900, le=2100)
    year_to: int | None = Field(default=None, ge=1900, le=2100)


class VehicleModificationCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    year_from: int | None = Field(default=None, ge=1900, le=2100)
    year_to: int | None = Field(default=None, ge=1900, le=2100)


class EngineCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    displacement_l: Decimal | None = Field(default=None, gt=0)
    power_hp: int | None = Field(default=None, gt=0)
    fuel_type: str | None = Field(default=None, max_length=50)


class CompatibilityCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    make_id: uuid.UUID
    model_id: uuid.UUID | None = None
    generation_id: uuid.UUID | None = None
    modification_id: uuid.UUID | None = None
    engine_id: uuid.UUID | None = None
    year_from: int | None = Field(default=None, ge=1900, le=2100)
    year_to: int | None = Field(default=None, ge=1900, le=2100)
    note: str | None = Field(default=None, max_length=500)


class CompatibilityRead(CompatibilityCreate):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    id: uuid.UUID
    product_id: uuid.UUID


class UserVehicleBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    make_id: uuid.UUID
    model_id: uuid.UUID | None = None
    generation_id: uuid.UUID | None = None
    modification_id: uuid.UUID | None = None
    engine_id: uuid.UUID | None = None
    year: int | None = Field(default=None, ge=1900, le=2100)
    vin: str | None = Field(default=None, min_length=17, max_length=17)
    is_primary: bool = False


class UserVehicleCreate(UserVehicleBase):
    pass


class UserVehicleUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    make_id: uuid.UUID | None = None
    model_id: uuid.UUID | None = None
    generation_id: uuid.UUID | None = None
    modification_id: uuid.UUID | None = None
    engine_id: uuid.UUID | None = None
    year: int | None = Field(default=None, ge=1900, le=2100)
    vin: str | None = Field(default=None, min_length=17, max_length=17)
    is_primary: bool | None = None


class UserVehicleRead(UserVehicleBase):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    id: uuid.UUID
    make: VehicleMakeRead
    model: VehicleModelRead | None = None
    generation: VehicleGenerationRead | None = None
    modification: VehicleModificationRead | None = None
    engine: EngineRead | None = None


class CompatibilityStatus(BaseModel):
    product_id: uuid.UUID
    vehicle_id: uuid.UUID | None = None
    status: str
    reason: str | None = None
