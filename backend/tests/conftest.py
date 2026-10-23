import os
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker

_tmpdir = Path(tempfile.mkdtemp(prefix="autouniverse-tests-"))
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or f"sqlite:///{_tmpdir / 'test.db'}"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-longer-than-thirty-two-characters")
os.environ["APP_ENV"] = "test"

from app.database import Base, configure_sqlite_engine, get_db  # noqa: E402
from app.main import app  # noqa: E402

connect_args = {"check_same_thread": False, "timeout": 30} if TEST_DATABASE_URL.startswith("sqlite") else {}
test_engine = create_engine(TEST_DATABASE_URL, connect_args=connect_args)
if test_engine.dialect.name == "sqlite":
    configure_sqlite_engine(test_engine)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def database_schema():
    existing_tables = inspect(test_engine).get_table_names()
    if existing_tables and not TEST_DATABASE_URL.startswith("sqlite"):
        raise RuntimeError(
            "The test database must be empty; refusing to remove existing tables: "
            + ", ".join(sorted(existing_tables))
        )
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if not os.getenv("TEST_DATABASE_URL"):
        shutil.rmtree(_tmpdir, ignore_errors=True)


@pytest.fixture
def db(database_schema) -> Session:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> TestClient:
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user_payload() -> dict[str, str]:
    return {
        "email": "customer@example.com",
        "password": "StrongPassword123!",
        "first_name": "Test",
        "last_name": "Customer",
    }


def register_and_login(client: TestClient, payload: dict[str, str]) -> dict[str, str]:
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    response = client.post(
        "/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]}
    )
    assert response.status_code == 200
    return response.json()
