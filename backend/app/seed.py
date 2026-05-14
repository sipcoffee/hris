"""Seed the database with the admin user.

Run with: python -m app.seed
"""
from sqlalchemy import select

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User, UserRole


def main() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True,
                must_change_password=False,
            )
            db.add(admin)
            print(f"Created admin: {settings.ADMIN_EMAIL}")
        else:
            print(f"Admin already exists: {settings.ADMIN_EMAIL}")

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
