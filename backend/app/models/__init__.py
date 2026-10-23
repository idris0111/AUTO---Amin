from app.models.catalog import (
    Brand,
    Category,
    OEMNumber,
    Product,
    ProductCrossReference,
    ProductImage,
    ProductSpecification,
    ProductStatus,
)
from app.models.commerce import (
    ALLOWED_TRANSITIONS,
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    PaymentMethod,
    ShippingMethod,
)
from app.models.coupon import Coupon, CouponType
from app.models.loyalty import LoyaltyAccount, LoyaltyTier, LoyaltyTransaction, LoyaltyTransactionType
from app.models.inventory import MovementType, StockMovement, Warehouse, WarehouseStock
from app.models.shipping import ShippingZone
from app.models.social import Favorite, Review, ReviewStatus
from app.models.user import Address, RefreshToken, User, UserRole
from app.models.vehicle import (
    Engine,
    ProductCompatibility,
    UserVehicle,
    VehicleGeneration,
    VehicleMake,
    VehicleModification,
    VehicleModel,
)

__all__ = [
    "ALLOWED_TRANSITIONS",
    "Address",
    "Brand",
    "Cart",
    "CartItem",
    "Category",
    "Engine",
    "Coupon",
    "CouponType",
    "Favorite",
    "LoyaltyAccount",
    "LoyaltyTier",
    "LoyaltyTransaction",
    "LoyaltyTransactionType",
    "MovementType",
    "StockMovement",
    "Warehouse",
    "WarehouseStock",
    "OEMNumber",
    "Order",
    "OrderItem",
    "OrderStatus",
    "OrderStatusHistory",
    "PaymentMethod",
    "Product",
    "ProductCompatibility",
    "ProductCrossReference",
    "ProductImage",
    "ProductSpecification",
    "ProductStatus",
    "RefreshToken",
    "ShippingZone",
    "Review",
    "ReviewStatus",
    "ShippingMethod",
    "User",
    "UserRole",
    "UserVehicle",
    "VehicleGeneration",
    "VehicleMake",
    "VehicleModification",
    "VehicleModel",
]

from app.models.notification import (
    Notification,
    NotificationChannel,
    NotificationPreference,
    NotificationType,
)

__all__ += [
    "Notification",
    "NotificationChannel",
    "NotificationPreference",
    "NotificationType",
]

from app.models.support import (
    SupportTicket,
    TicketCategory,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)

__all__ += [
    "SupportTicket",
    "TicketCategory",
    "TicketMessage",
    "TicketPriority",
    "TicketStatus",
]

from app.models.content import (
    Article,
    ArticleCategory,
)

__all__ += [
    "Article",
    "ArticleCategory",
]
