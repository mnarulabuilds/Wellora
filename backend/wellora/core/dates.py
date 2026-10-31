"""Small date helpers so every module agrees on formats (ISO-8601, server-local time)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def today() -> date:
    return datetime.now().date()


def to_date(value: date | str | None) -> date:
    if value is None:
        return today()
    if isinstance(value, date):
        return value
    return date.fromisoformat(value[:10])


def day_bounds(day: date) -> tuple[str, str]:
    """Inclusive ISO timestamps covering the whole calendar day."""
    return (
        datetime.combine(day, time.min).isoformat(),
        datetime.combine(day, time.max).isoformat(),
    )


def date_range(end: date, days: int) -> list[date]:
    """``days`` consecutive dates ending at (and including) ``end``, oldest first."""
    return [end - timedelta(days=offset) for offset in range(days - 1, -1, -1)]
