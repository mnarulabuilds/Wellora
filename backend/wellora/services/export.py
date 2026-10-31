"""Export a user's complete data as JSON, or as a ZIP of CSV files."""

from __future__ import annotations

import csv
import io
import json
import zipfile
from typing import Any

from wellora.core.dates import now_iso
from wellora.repositories import activities as activity_repo
from wellora.repositories import habits as habit_repo
from wellora.repositories import medications as med_repo
from wellora.repositories import profiles as profile_repo
from wellora.repositories import sleep as sleep_repo
from wellora.repositories import vitals as vitals_repo
from wellora.repositories import weight as weight_repo

ALL_DATES = ("0000-01-01", "9999-12-31")


def collect(user_id: str) -> dict[str, Any]:
    return {
        "exported_at": now_iso(),
        "user_id": user_id,
        "profile": profile_repo.get(user_id),
        "activities": activity_repo.list_logs(user_id, limit=5000),
        "sleep": sleep_repo.list_logs(user_id, limit=5000),
        "weight": weight_repo.history(user_id, limit=5000),
        "habits": habit_repo.list_active(user_id),
        "vitals": vitals_repo.list_readings(user_id, limit=5000),
        "medications": med_repo.list_for_user(user_id, include_inactive=True),
        "medication_doses": med_repo.doses_between(user_id, *ALL_DATES),
    }


def to_json(data: dict[str, Any]) -> bytes:
    return json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")


def _rows_to_csv(rows: list[dict[str, Any]]) -> str:
    buffer = io.StringIO()
    if not rows:
        return ""
    fieldnames = list(rows[0].keys())
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({k: json.dumps(v) if isinstance(v, (dict, list)) else v for k, v in row.items()})
    return buffer.getvalue()


def to_csv_zip(data: dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for key, value in data.items():
            if isinstance(value, list):
                archive.writestr(f"{key}.csv", _rows_to_csv(value))
        if data.get("profile"):
            archive.writestr("profile.csv", _rows_to_csv([data["profile"]]))
    return buffer.getvalue()
