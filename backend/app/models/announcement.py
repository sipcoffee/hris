from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    posted_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    posted_by: Mapped["User"] = relationship("User")  # noqa: F821
