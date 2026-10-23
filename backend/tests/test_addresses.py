from fastapi.testclient import TestClient

from tests.conftest import register_and_login


ADDRESS = {
    "label": "Home",
    "recipient_name": "Test Customer",
    "phone": "+998901234567",
    "country": "Uzbekistan",
    "city": "Tashkent",
    "street": "Amir Temur avenue 1",
    "postal_code": "100000",
    "is_default": True,
}


def test_user_cannot_read_or_change_another_users_address(
    client: TestClient, user_payload: dict[str, str]
) -> None:
    first_tokens = register_and_login(client, user_payload)
    created = client.post(
        "/api/v1/addresses",
        json=ADDRESS,
        headers={"Authorization": f"Bearer {first_tokens['access_token']}"},
    )
    assert created.status_code == 201
    address_id = created.json()["id"]

    second_payload = {**user_payload, "email": "second@example.com"}
    second_tokens = register_and_login(client, second_payload)
    headers = {"Authorization": f"Bearer {second_tokens['access_token']}"}
    assert client.get("/api/v1/addresses", headers=headers).json() == []
    assert client.patch(
        f"/api/v1/addresses/{address_id}", json={"city": "Samarkand"}, headers=headers
    ).status_code == 404
    assert client.delete(f"/api/v1/addresses/{address_id}", headers=headers).status_code == 404

