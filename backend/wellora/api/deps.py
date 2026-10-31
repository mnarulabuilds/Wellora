"""Shared query-parameter dependencies."""

from datetime import date
from typing import Annotated

from fastapi import Query

UserIdQuery = Annotated[str, Query(min_length=1, max_length=128, description="Client-generated user id")]
OptionalDate = Annotated[date | None, Query(description="YYYY-MM-DD; defaults to today")]
