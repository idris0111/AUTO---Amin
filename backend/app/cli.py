import argparse
import getpass

from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User, UserRole


def create_admin(email: str) -> None:
    password = getpass.getpass("Admin password: ")
    if len(password) < 10:
        raise SystemExit("Password must contain at least 10 characters")
    with SessionLocal() as db:
        admin = User(
            email=email.strip().lower(),
            password_hash=hash_password(password),
            first_name="Store",
            last_name="Administrator",
            role=UserRole.ADMIN,
        )
        db.add(admin)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise SystemExit("A user with this email already exists") from exc
    print(f"Admin {email} created")


def main() -> None:
    parser = argparse.ArgumentParser(description="Premium Auto Parts maintenance commands")
    subparsers = parser.add_subparsers(dest="command", required=True)
    admin_parser = subparsers.add_parser("create-admin", help="Create the first administrator")
    admin_parser.add_argument("--email", required=True)
    args = parser.parse_args()
    if args.command == "create-admin":
        create_admin(args.email)


if __name__ == "__main__":
    main()

