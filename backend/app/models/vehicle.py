import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import UTCDateTime
from app.database import Base


class VehicleMake(Base):
    __tablename__ = "vehicle_makes"
    __table_args__ = (UniqueConstraint("slug", name="uq_vehicle_make_slug"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(120))
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    models: Mapped[list["VehicleModel"]] = relationship(
        back_populates="make", cascade="all, delete-orphan"
    )


class VehicleModel(Base):
    __tablename__ = "vehicle_models"
    __table_args__ = (
        UniqueConstraint("make_id", "slug", name="uq_vehicle_model_slug"),
        Index("ix_vehicle_models_make_id", "make_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    make_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_makes.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(120))
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), index=True)

    make: Mapped[VehicleMake] = relationship(back_populates="models")
    generations: Mapped[list["VehicleGeneration"]] = relationship(
        back_populates="model", cascade="all, delete-orphan"
    )


class VehicleGeneration(Base):
    __tablename__ = "vehicle_generations"
    __table_args__ = (
        UniqueConstraint("model_id", "name", name="uq_vehicle_generation_name"),
        Index("ix_vehicle_generations_model_id", "model_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    model_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_models.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    body_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    year_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_to: Mapped[int | None] = mapped_column(Integer, nullable=True)

    model: Mapped[VehicleModel] = relationship(back_populates="generations")
    modifications: Mapped[list["VehicleModification"]] = relationship(
        back_populates="generation", cascade="all, delete-orphan"
    )


class VehicleModification(Base):
    __tablename__ = "vehicle_modifications"
    __table_args__ = (
        UniqueConstraint("generation_id", "name", name="uq_vehicle_modification_name"),
        Index("ix_vehicle_modifications_generation_id", "generation_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    generation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vehicle_generations.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(150))
    year_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_to: Mapped[int | None] = mapped_column(Integer, nullable=True)

    generation: Mapped[VehicleGeneration] = relationship(back_populates="modifications")
    engines: Mapped[list["Engine"]] = relationship(back_populates="modification", cascade="all, delete-orphan")


class Engine(Base):
    __tablename__ = "engines"
    __table_args__ = (
        UniqueConstraint("modification_id", "name", name="uq_engine_name"),
        Index("ix_engines_modification_id", "modification_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    modification_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vehicle_modifications.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(150))
    displacement_l: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    power_hp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fuel_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    modification: Mapped[VehicleModification] = relationship(back_populates="engines")


class ProductCompatibility(Base):
    """Link between a product and a vehicle specification level.

    The most specific level available identifies the vehicle; unset finer
    fields mean "applies to every child of the specified level".
    """

    __tablename__ = "product_compatibilities"
    __table_args__ = (
        Index("ix_product_compatibilities_product_id", "product_id"),
        Index("ix_product_compatibilities_make_id", "make_id"),
        Index("ix_product_compatibilities_model_id", "model_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    make_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_makes.id", ondelete="CASCADE"))
    model_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vehicle_models.id", ondelete="CASCADE"), nullable=True
    )
    generation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vehicle_generations.id", ondelete="CASCADE"), nullable=True
    )
    modification_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vehicle_modifications.id", ondelete="CASCADE"), nullable=True
    )
    engine_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("engines.id", ondelete="CASCADE"), nullable=True)
    year_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_to: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    product: Mapped["Product"] = relationship()  # noqa: F821
    make: Mapped[VehicleMake] = relationship()
    model: Mapped[VehicleModel | None] = relationship()
    generation: Mapped[VehicleGeneration | None] = relationship()
    modification: Mapped[VehicleModification | None] = relationship()
    engine: Mapped[Engine | None] = relationship()


class UserVehicle(Base):
    __tablename__ = "user_vehicles"
    __table_args__ = (
        Index("ix_user_vehicles_user_id", "user_id"),
        UniqueConstraint("user_id", "name", name="uq_user_vehicle_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    make_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_makes.id", ondelete="RESTRICT"))
    model_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vehicle_models.id", ondelete="RESTRICT"), nullable=True
    )
    generation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vehicle_generations.id", ondelete="RESTRICT"), nullable=True
    )
    modification_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vehicle_modifications.id", ondelete="RESTRICT"), nullable=True
    )
    engine_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("engines.id", ondelete="RESTRICT"), nullable=True
    )
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vin: Mapped[str | None] = mapped_column(String(17), nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    make: Mapped[VehicleMake] = relationship()
    model: Mapped[VehicleModel | None] = relationship()
    generation: Mapped[VehicleGeneration | None] = relationship()
    modification: Mapped[VehicleModification | None] = relationship()
    engine: Mapped[Engine | None] = relationship()
