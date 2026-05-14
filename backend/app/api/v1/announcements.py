from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementOut])
def list_announcements(
    db: DbSession,
    _: CurrentUser,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[Announcement]:
    return list(
        db.scalars(
            select(Announcement)
            .options(selectinload(Announcement.posted_by))
            .order_by(Announcement.posted_at.desc())
            .limit(limit)
        )
    )


@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreate, db: DbSession, admin: AdminUser
) -> Announcement:
    announcement = Announcement(
        title=payload.title,
        body=payload.body,
        posted_by_user_id=admin.id,
    )
    db.add(announcement)
    db.commit()
    announcement = db.scalar(
        select(Announcement)
        .options(selectinload(Announcement.posted_by))
        .where(Announcement.id == announcement.id)
    )
    assert announcement is not None
    return announcement


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(announcement_id: int, db: DbSession, _: AdminUser) -> None:
    announcement = db.get(Announcement, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    db.delete(announcement)
    db.commit()
