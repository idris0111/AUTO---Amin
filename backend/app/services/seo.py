from datetime import datetime, timezone
from xml.sax.saxutils import escape

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Category, Product, ProductStatus
from app.models.content import Article


def _format_date(dt: datetime | None) -> str:
    if not dt:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return dt.strftime("%Y-%m-%d")


def generate_sitemap_xml(db: Session, base_url: str = "https://autouniverse.tj") -> str:
    """Generate dynamic XML sitemap conforming to sitemaps.org standard."""
    base = base_url.rstrip("/")
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    # 1. Static Core Landing Pages
    static_routes = [
        ("/", "1.0", "daily"),
        ("/catalog", "0.9", "daily"),
        ("/blog", "0.8", "daily"),
        ("/ai-mechanic", "0.8", "weekly"),
        ("/garage", "0.8", "weekly"),
        ("/support", "0.6", "monthly"),
    ]
    for path, priority, changefreq in static_routes:
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{escape(base + path)}</loc>")
        xml_lines.append(f"    <lastmod>{now_str}</lastmod>")
        xml_lines.append(f"    <changefreq>{changefreq}</changefreq>")
        xml_lines.append(f"    <priority>{priority}</priority>")
        xml_lines.append("  </url>")

    # 2. Product Categories
    categories = db.scalars(select(Category)).all()
    for cat in categories:
        loc = f"{base}/catalog?category={cat.slug}"
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{escape(loc)}</loc>")
        xml_lines.append(f"    <lastmod>{now_str}</lastmod>")
        xml_lines.append("    <changefreq>weekly</changefreq>")
        xml_lines.append("    <priority>0.8</priority>")
        xml_lines.append("  </url>")

    # 3. Active Catalog Products
    products = db.scalars(select(Product).where(Product.status == ProductStatus.ACTIVE)).all()
    for prod in products:
        loc = f"{base}/catalog/{prod.slug}"
        lastmod = _format_date(prod.updated_at if hasattr(prod, "updated_at") else None)
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{escape(loc)}</loc>")
        xml_lines.append(f"    <lastmod>{lastmod}</lastmod>")
        xml_lines.append("    <changefreq>weekly</changefreq>")
        xml_lines.append("    <priority>0.8</priority>")
        xml_lines.append("  </url>")

    # 4. Published Knowledge Base Articles
    articles = db.scalars(
        select(Article).where(Article.is_published == True)  # noqa: E712
    ).all()
    for art in articles:
        loc = f"{base}/blog/{art.slug}"
        lastmod = _format_date(art.updated_at or art.published_at or art.created_at)
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{escape(loc)}</loc>")
        xml_lines.append(f"    <lastmod>{lastmod}</lastmod>")
        xml_lines.append("    <changefreq>weekly</changefreq>")
        xml_lines.append("    <priority>0.7</priority>")
        xml_lines.append("  </url>")

    xml_lines.append("</urlset>")
    return "\n".join(xml_lines)


def generate_robots_txt(base_url: str = "https://autouniverse.tj") -> str:
    """Generate production robots.txt file."""
    base = base_url.rstrip("/")
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /admin/\n"
        "Disallow: /profile\n"
        "Disallow: /profile/\n"
        "Disallow: /checkout\n"
        "Disallow: /checkout/\n"
        "Disallow: /orders\n"
        "Disallow: /orders/\n"
        "Disallow: /api/\n"
        "Allow: /api/v1/seo/sitemap.xml\n"
        "Allow: /api/v1/content/\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )
