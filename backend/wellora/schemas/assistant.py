from __future__ import annotations

from pydantic import BaseModel, Field

from wellora.schemas.common import NonEmptyStr


class UserQuery(BaseModel):
    text: NonEmptyStr = Field(..., min_length=1, max_length=2000)
    user_id: str | None = Field(default=None, max_length=128)
