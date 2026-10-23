import uuid
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Brand, Category, Product, ProductStatus
from app.models.content import Article, ArticleCategory
from app.models.user import User, UserRole
from tests.conftest import register_and_login


def test_public_content_articles_and_views(client: TestClient, db: Session) -> None:
    # 0. Seed test article
    article = Article(
        slug="vybor-tormoznyh-diskov-i-kolodok",
        title="Как правильно выбрать тормозные диски и колодки в Таджикистане",
        excerpt="Руководство по выбору тормозных колодок и дисков в условиях жары и гор.",
        content="Подробное руководство по тормозной системе автомобиля с вентилируемыми дисками.",
        category=ArticleCategory.GUIDE,
        tags=["тормоза", "диски", "колодки"],
        is_published=True,
        views_count=10,
        reading_time_minutes=5,
    )
    db.add(article)
    db.commit()

    # 1. Fetch public articles list
    res = client.get("/api/v1/content/articles")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 1
    first_article = data["items"][0]
    first_slug = first_article["slug"]

    # 2. Filter by category
    res_cat = client.get("/api/v1/content/articles?category=guide")
    assert res_cat.status_code == 200
    for item in res_cat.json()["items"]:
        assert item["category"] == "guide"

    # 3. Search query
    res_search = client.get("/api/v1/content/articles?search=тормоз")
    assert res_search.status_code == 200
    assert any("тормоз" in a["title"].lower() or "тормоз" in a["excerpt"].lower() for a in res_search.json()["items"])

    # 4. Fetch detail by slug and verify atomic view increment
    initial_views = first_article["views_count"]
    res_detail = client.get(f"/api/v1/content/articles/{first_slug}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["slug"] == first_slug
    assert detail["views_count"] == initial_views + 1
    assert "content" in detail
    assert len(detail["content"]) > 10

    # 5. Fetch categories summary
    res_cats = client.get("/api/v1/content/categories")
    assert res_cats.status_code == 200
    cats = res_cats.json()
    assert len(cats) >= 5
    guide_cat = next((c for c in cats if c["category"] == "guide"), None)
    assert guide_cat is not None
    assert guide_cat["count"] >= 1


def test_admin_article_crud_and_permissions(client: TestClient, db: Session) -> None:
    # 1. Register customer
    cust_tokens = register_and_login(
        client,
        {
            "email": "content_reader@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Карим",
            "last_name": "Читатель",
        },
    )
    cust_headers = {"Authorization": f"Bearer {cust_tokens['access_token']}"}

    # 2. Register content manager
    mgr_tokens = register_and_login(
        client,
        {
            "email": "content_editor@autouniverse.tj",
            "password": "Password123!",
            "first_name": "Шоди",
            "last_name": "Редактор",
        },
    )
    mgr_headers = {"Authorization": f"Bearer {mgr_tokens['access_token']}"}
    mgr_user = db.scalar(select(User).where(User.email == "content_editor@autouniverse.tj"))
    assert mgr_user is not None
    mgr_user.role = UserRole.CONTENT_MANAGER
    db.commit()

    # 3. Customer forbidden from admin endpoints
    res_forbidden = client.post(
        "/api/v1/admin/content/articles",
        headers=cust_headers,
        json={
            "title": "Хакерская статья",
            "excerpt": "Попытка несанкционированной публикации статьи.",
            "content": "Текст статьи без надлежащих прав доступа к системе.",
            "category": "diy",
        },
    )
    assert res_forbidden.status_code == 403

    # 4. Content manager creates a draft article
    create_payload = {
        "title": "Замена воздушного фильтра своими руками за 5 минут",
        "excerpt": "Простая пошаговая инструкция для любого водителя без специнструмента.",
        "content": "Для замены салонного и воздушного фильтров двигателя вам потребуется только отвертка и 5 минут времени. Отстегните клипсы корпуса воздушного фильтра, извлеките старый элемент и удалите накопившуюся пыль пылесосом.",
        "category": "diy",
        "tags": ["фильтры", "diy", "техобслуживание"],
        "is_published": False,
        "seo_title": "Замена воздушного фильтра авто своими руками | Auto Universe",
        "seo_description": "Как самостоятельно поменять воздушный фильтр двигателя за 5 минут.",
        "seo_keywords": "воздушный фильтр замена, своими руками, man filter душанбе",
    }
    res_create = client.post(
        "/api/v1/admin/content/articles",
        headers=mgr_headers,
        json=create_payload,
    )
    assert res_create.status_code == 201
    created_data = res_create.json()
    art_id = created_data["id"]
    slug = created_data["slug"]
    assert created_data["is_published"] is False
    assert created_data["author_name"] == "Шоди Редактор"

    # 5. Draft is not visible in public listing
    res_pub = client.get(f"/api/v1/content/articles/{slug}")
    assert res_pub.status_code == 404

    # 6. Toggle publish
    res_toggle = client.patch(
        f"/api/v1/admin/content/articles/{art_id}/toggle-publish",
        headers=mgr_headers,
    )
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_published"] is True

    # Now it is publicly visible!
    res_pub_now = client.get(f"/api/v1/content/articles/{slug}")
    assert res_pub_now.status_code == 200

    # 7. Update article
    res_update = client.put(
        f"/api/v1/admin/content/articles/{art_id}",
        headers=mgr_headers,
        json={"title": "Замена воздушного фильтра двигателя: пошаговое руководство"},
    )
    assert res_update.status_code == 200
    assert res_update.json()["title"] == "Замена воздушного фильтра двигателя: пошаговое руководство"

    # 8. Delete article
    res_del = client.delete(
        f"/api/v1/admin/content/articles/{art_id}",
        headers=mgr_headers,
    )
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # Verify deleted
    res_check = client.get(f"/api/v1/content/articles/{slug}")
    assert res_check.status_code == 404


def test_seo_sitemap_and_robots(client: TestClient, db: Session) -> None:
    # Seed an article and category
    cat = Category(
        name="Тормозная система",
        slug="tormoznaya-sistema",
        is_active=True,
    )
    art = Article(
        slug="vybor-tormoznyh-diskov-i-kolodok",
        title="Как правильно выбрать тормозные диски и колодки в Таджикистане",
        excerpt="Руководство по выбору тормозных колодок и дисков в условиях жары и гор.",
        content="Подробное руководство по тормозной системе автомобиля с вентилируемыми дисками.",
        category=ArticleCategory.GUIDE,
        tags=["тормоза", "диски", "колодки"],
        is_published=True,
    )
    db.add(cat)
    db.add(art)
    db.commit()

    # 1. Sitemap XML
    res_sitemap = client.get("/sitemap.xml")
    assert res_sitemap.status_code == 200
    assert "application/xml" in res_sitemap.headers.get("content-type", "")
    xml_text = res_sitemap.text
    assert '<?xml version="1.0" encoding="UTF-8"?>' in xml_text
    assert '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' in xml_text
    assert "<loc>https://autouniverse.tj/</loc>" in xml_text
    assert "<loc>https://autouniverse.tj/catalog</loc>" in xml_text
    assert "<loc>https://autouniverse.tj/blog</loc>" in xml_text
    assert "<loc>https://autouniverse.tj/ai-mechanic</loc>" in xml_text
    assert "<loc>https://autouniverse.tj/support</loc>" in xml_text
    assert "/blog/vybor-tormoznyh-diskov-i-kolodok" in xml_text
    assert "/catalog?category=tormoznaya-sistema" in xml_text

    # 2. Also test API alias for sitemap
    res_alias = client.get("/seo/sitemap.xml")
    assert res_alias.status_code == 200
    assert "/blog/" in res_alias.text

    # 3. Robots.txt
    res_robots = client.get("/robots.txt")
    assert res_robots.status_code == 200
    assert "text/plain" in res_robots.headers.get("content-type", "")
    txt = res_robots.text
    assert "User-agent: *" in txt
    assert "Disallow: /admin" in txt
    assert "Disallow: /checkout" in txt
    assert "Disallow: /profile" in txt
    assert "Sitemap: https://autouniverse.tj/sitemap.xml" in txt

    # 4. SEO meta defaults endpoint
    res_meta = client.get("/api/v1/seo/meta")
    assert res_meta.status_code == 200
    meta = res_meta.json()
    assert meta["site_name"] == "Auto Universe Tajikistan"
    assert "Душанбе" in meta["default_title"]
    assert meta["site_url"] == "https://autouniverse.tj"

