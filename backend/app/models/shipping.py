import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import UTCDateTime
from app.database import Base


class ShippingZone(Base):
    __tablename__ = "shipping_zones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    city: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fee: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    free_from: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    eta_days_min: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    eta_days_max: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
