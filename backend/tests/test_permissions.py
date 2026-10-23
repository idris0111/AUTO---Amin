from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from tests.conftest import register_and_login


def test_customer_cannot_access_admin_api(client: TestClient, user_payload: dict[str, str]) -> None:
    tokens = register_and_login(client, user_payload)
    response = client.get(
        "/api/v1/admin/users", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert response.status_code == 403


def test_admin_can_list_users(
    client: TestClient, db: Session, user_payload: dict[str, str]
) -> None:
    tokens = register_and_login(client, user_payload)
    user = db.scalar(select(User).where(User.email == user_payload["email"]))
    assert user is not None
    user.role = UserRole.ADMIN
    db.commit()
    response = client.get(
        "/api/v1/admin/users", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert response.status_code == 200
    assert len(response.json()) == 1

