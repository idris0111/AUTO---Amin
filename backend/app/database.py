from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def configure_sqlite_engine(engine: Engine) -> None:
    """Enable foreign keys, WAL and busy timeout for SQLite engines."""

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record):  # noqa: ARG001
        # SQLite's built-in lower() only handles ASCII; override it with a
        # Unicode-aware version so Cyrillic ILIKE/lower searches work.
        dbapi_connection.create_function(
            "lower", 1, lambda value: value.lower() if isinstance(value, str) else value
        )
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()


def _sqlite_file_path(database_url: str) -> Path | None:
    raw = database_url.removeprefix("sqlite:///")
    raw = raw.split("?")[0]
    if not raw or raw == ":memory:" or raw.startswith("file:"):
        return None
    return Path(raw).expanduser()


settings = get_settings()

_engine_kwargs: dict = {"pool_pre_ping": True}
if settings.database_url.startswith("sqlite"):
    sqlite_path = _sqlite_file_path(settings.database_url)
    if sqlite_path is not None:
        sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    _engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}

engine = create_engine(settings.database_url, **_engine_kwargs)
if engine.dialect.name == "sqlite":
    configure_sqlite_engine(engine)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
