from datetime import date, datetime

from wellora.services.medications import dose_status

DAY = date(2026, 5, 1)


def at(hour, minute=0, day=DAY):
    return datetime(day.year, day.month, day.day, hour, minute)


def test_taken_wins():
    assert dose_status("08:00", True, DAY, at(23)) == "taken"


def test_upcoming_due_overdue():
    assert dose_status("08:00", False, DAY, at(7, 30)) == "upcoming"
    assert dose_status("08:00", False, DAY, at(8, 45)) == "due"
    assert dose_status("08:00", False, DAY, at(10)) == "overdue"


def test_past_days_are_missed():
    assert dose_status("08:00", False, DAY, at(9, day=date(2026, 5, 2))) == "missed"
