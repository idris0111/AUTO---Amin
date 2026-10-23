from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from tests.conftest import register_and_login


def _admin(client: TestClient, db: Session, payload: dict[str, str]) -> dict[str, str]:
    tokens = register_and_login(client, payload)
    user = db.scalar(select(User).where(User.email == payload["email"]))
    user.role = UserRole.ADMIN
    db.commit()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_shipping_quote_known_city_and_free_threshold(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    admin = _admin(client, db, {**user_payload, "email": "ship-admin@example.com"})
    zone = client.post(
        "/api/v1/admin/shipping-zones",
        json={"city": "Истаравшан", "region": "Согдийская область", "fee": "40.00", "free_from": "800.00"},
        headers=admin,
    )
    assert zone.status_code == 201, zone.text

    quote = client.post("/api/v1/shipping/quote", json={"city": "Истаравшан", "subtotal": "100.00"})
    assert quote.status_code == 200
    assert quote.json()["fee"] == "40.00"
    assert quote.json()["zone_found"] is True

    free = client.post("/api/v1/shipping/quote", json={"city": "истаравшан", "subtotal": "900.00"})
    assert Decimal(free.json()["fee"]) == Decimal("0")

    fallback = client.post("/api/v1/shipping/quote", json={"city": "Неизвестный Город", "subtotal": "100.00"})
    assert fallback.json()["zone_found"] is False
    assert Decimal(fallback.json()["fee"]) > 0

    public = client.get("/api/v1/shipping/zones")
    assert public.status_code == 200
    assert any(z["city"] == "Истаравшан" for z in public.json())
