from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)


class PostedBy(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    posted_at: datetime
    posted_by: PostedBy
