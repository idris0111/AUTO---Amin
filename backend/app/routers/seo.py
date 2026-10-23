from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import seo as seo_service

router = APIRouter(tags=["SEO"])


@router.get("/seo/sitemap.xml", response_class=Response)
@router.get("/sitemap.xml", response_class=Response)
def get_sitemap_xml(db: Session = Depends(get_db)) -> Response:
    """Generate dynamic XML sitemap conforming to sitemaps.org standard."""
    xml_content = seo_service.generate_sitemap_xml(db)
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/seo/robots.txt", response_class=Response)
@router.get("/robots.txt", response_class=Response)
def get_robots_txt() -> Response:
    """Generate production robots.txt file."""
    txt_content = seo_service.generate_robots_txt()
    return Response(
        content=txt_content,
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/api/v1/seo/meta")
def get_seo_meta_defaults(response: Response) -> dict:
    """Get site-wide SEO metadata defaults."""
    response.headers["Cache-Control"] = "public, max-age=1800, stale-while-revalidate=3600"
    return {
        "site_name": "Auto Universe Tajikistan",
        "default_title": "Auto Universe — Премиальные автозапчасти в Душанбе и Таджикистане",
        "default_description": (
            "Оригинальные премиальные автозапчасти, моторные масла, расходники и фильтры "
            "с гарантией совместимости по VIN и доставкой по всему Таджикистану."
        ),
        "default_keywords": (
            "автозапчасти душанбе, запчасти bmw mercedes audi toyota таджикистан, "
            "доставка автозапчастей, моторное масло motul, brembo, bosch"
        ),
        "site_url": "https://autouniverse.tj",
        "og_image": "https://autouniverse.tj/og-image.jpg",
        "locale": "ru_TJ",
        "alternate_locales": ["tg_TJ", "en_US"],
    }
