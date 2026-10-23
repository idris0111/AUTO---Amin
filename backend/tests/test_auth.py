from fastapi.testclient import TestClient

from tests.conftest import register_and_login


def test_register_login_and_profile(client: TestClient, user_payload: dict[str, str]) -> None:
    tokens = register_and_login(client, user_payload)
    response = client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == user_payload["email"]
    assert response.json()["role"] == "customer"


def test_duplicate_registration_is_rejected(client: TestClient, user_payload: dict[str, str]) -> None:
    assert client.post("/api/v1/auth/register", json=user_payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=user_payload).status_code == 409


def test_refresh_token_is_rotated_once(client: TestClient, user_payload: dict[str, str]) -> None:
    tokens = register_and_login(client, user_payload)
    first = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert first.status_code == 200
    replay = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert replay.status_code == 401


def test_password_change_revokes_refresh_tokens(client: TestClient, user_payload: dict[str, str]) -> None:
    tokens = register_and_login(client, user_payload)
    response = client.post(
        "/api/v1/users/me/change-password",
        json={"current_password": user_payload["password"], "new_password": "NewStrongPassword456!"},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert response.status_code == 204
    assert client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    ).status_code == 401



def test_session_management(client: TestClient, user_payload: dict[str, str]) -> None:
    tokens = register_and_login(client, user_payload)
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    second = client.post(
        "/api/v1/auth/login",
        json={"email": user_payload["email"], "password": user_payload["password"]},
    )
    assert second.status_code == 200

    sessions = client.get("/api/v1/auth/sessions", headers=headers)
    assert sessions.status_code == 200
    assert len(sessions.json()) == 2

    session_id = sessions.json()[0]["id"]
    assert client.delete(f"/api/v1/auth/sessions/{session_id}", headers=headers).status_code == 204
    remaining = client.get("/api/v1/auth/sessions", headers=headers).json()
    assert len(remaining) == 1
    assert all(s["id"] != session_id for s in remaining)

    other = register_and_login(client, {**user_payload, "email": "other-sessions@example.com"})
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    assert client.delete(f"/api/v1/auth/sessions/{session_id}", headers=other_headers).status_code == 404

    assert client.delete("/api/v1/auth/sessions", headers=headers).status_code == 204
    assert client.get("/api/v1/auth/sessions", headers=headers).json() == []
    assert (
        client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code
        == 401
    )
