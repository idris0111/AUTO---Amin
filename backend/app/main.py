from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.errors import register_error_handlers
from app.database import get_db
from app.routers import (
    addresses,
    admin,
    admin_catalog,
    admin_coupons,
    admin_orders,
    ai_mechanic,
    analytics,
    auth,
    catalog,
    commerce,
    content,
    explorer3d,
    loyalty,
    notifications,
    seo,
    shipping,
    social,
    support,
    users,
    vehicles,
)

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    debug=settings.debug,
    openapi_tags=[
        {"name": "Auth", "description": "Registration and JWT sessions"},
        {"name": "Users", "description": "Current user profile"},
        {"name": "Addresses", "description": "Current user's delivery addresses"},
        {"name": "Admin", "description": "Role-protected administration"},
        {"name": "Health", "description": "Service readiness"},
        {"name": "Catalog", "description": "Public product catalog"},
        {"name": "Vehicles", "description": "Vehicle makes and models"},
        {"name": "Garage", "description": "Current user's saved vehicles"},
        {"name": "Admin Catalog", "description": "Catalog and vehicle administration"},
        {"name": "Cart", "description": "Guest and customer cart"},
        {"name": "Orders", "description": "Checkout and order history"},
        {"name": "Admin Orders", "description": "Order processing and statistics"},
        {"name": "Shipping", "description": "Delivery zones and quotes"},
        {"name": "Coupons", "description": "Promo codes and discounts"},
        {"name": "Favorites & Reviews", "description": "Wishlist and product reviews"},
        {"name": "AI Mechanic", "description": "Intelligent car diagnostic and parts matcher"},
        {"name": "3D Parts Explorer", "description": "Interactive exploded-view 3D vehicle assembly viewer"},
        {"name": "Loyalty & Rewards", "description": "Cashback tiers, bonus points balance and ledger"},
        {"name": "Customer Support", "description": "Ticket support system and staff replies"},
        {"name": "Content & Blog", "description": "Knowledge base, automotive articles and guides"},
        {"name": "Admin Content", "description": "Staff management of knowledge base articles"},
        {"name": "SEO", "description": "Dynamic sitemap.xml, robots.txt and SEO metadata"},
    ],
)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)

for router in (
    auth.router,
    users.router,
    addresses.router,
    admin.router,
    catalog.router,
    vehicles.public_router,
    vehicles.garage_router,
    admin_catalog.router,
    commerce.cart_router,
    commerce.orders_router,
    admin_orders.router,
    admin_coupons.router,
    shipping.router,
    social.router,
    ai_mechanic.router,
    explorer3d.router,
    loyalty.router,
    notifications.router,
    support.router,
    content.router,
    content.admin_router,
    analytics.router,
):
    app.include_router(router, prefix=settings.api_v1_prefix)

app.include_router(seo.router)


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["Health"])
def readiness(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ready"}
