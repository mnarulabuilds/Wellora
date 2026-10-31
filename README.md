# Wellora — Personal Health Companion (v3)

Wellora helps you look after your everyday health in one place: track meals and macros against personal targets, never miss a medication dose, log blood pressure / sugar / heart rate with healthy‑range checks, follow sleep and recovery, build habits, see a weekly progress report, and ask a coach that knows what you've logged.

| Area | What you can do |
| --- | --- |
| **Nutrition** | Search a 45‑item food library (incl. Indian staples: roti, dal, idli, poha, paneer…), add custom foods, log servings by meal, and see calories + protein/carbs/fat vs. targets derived from your goals. |
| **Medications** | Add medicines with dosage, times and instructions. Daily local notifications on iOS/Android, a "due / overdue" card on Home, one‑tap check‑off, 7‑day adherence. |
| **Vitals** | Blood pressure, heart rate, glucose (fasting / post‑meal), SpO₂, temperature — each reading is classified against standard adult ranges with plain‑language advice and trend charts. |
| **Sleep & recovery** | Log hours/quality; a daily recovery score combines sleep, hydration, training load and habits. |
| **Weight & habits** | Weigh‑ins with BMI and trend chart; customisable daily habit checklist. |
| **Insights** | Weekly report (this week vs. last) with highlights, BMI/TDEE, macro split and 12‑week projection. |
| **Coach** | Intent‑aware assistant that personalises replies with your logs and suggests follow‑ups (with medical‑safety guardrails). |
| **Your data** | Offline queue that syncs when you're back online, one‑tap CSV/JSON export, and "delete all my data". |

---

## Quick start (one command)

Requirements: Docker Desktop (or Docker Engine + Compose v2).

```bash
docker compose up --build        # or: make up
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:8080 |
| API + interactive docs | http://localhost:8000/docs |

Data is stored in the `wellora-data` Docker volume, so it survives restarts.

Useful commands (run `make` to list them all):

```bash
make up       # build & start in the background
make logs     # follow logs
make test     # run backend + frontend lint & tests inside Docker
make demo     # start with sample activity for the demo user
make down     # stop (keeps data)
make reset    # stop and delete all data
```

Configuration lives in `.env` (copy `.env.example`). The most important setting is **`TZ`** (defaults to `Asia/Kolkata`) — it decides when a new day starts and when a dose becomes "overdue". Ports can be changed with `WEB_PORT` / `API_PORT`.

> On a phone: the same Expo app runs natively (`cd frontend && npx expo start`, with `EXPO_PUBLIC_API_BASE_URL` pointing at your machine's IP). Medication push reminders need the native app; the web build shows due doses on the Home screen.

---

## Architecture

```
┌──────────── browser / Expo app ────────────┐        ┌──────────── backend (FastAPI) ────────────┐
│ app/          screens (expo-router)        │  /api  │ api/routes/     thin HTTP layer           │
│ components/   ui/ primitives, dashboard/   │ ─────▶ │ services/       business logic (pure)     │
│ hooks/        useFocusData, useDebounced   │ nginx  │ repositories/   SQL per aggregate          │
│ lib/api/      typed client per domain      │        │ schemas/        Pydantic validation        │
│ lib/          storage, format, offline,    │        │ db/             schema.sql, seed, conn     │
│               notifications, confirm       │        │ core/           config, errors, dates      │
└────────────────────────────────────────────┘        └──────────────── SQLite (WAL) ─────────────┘
```

**Backend** (`backend/wellora/`) is layered so each piece is testable on its own:

- `api/routes/*` only parse/validate requests and shape responses; errors are raised as domain exceptions (`NotFoundError`, `ConflictError`) and rendered uniformly as `{"status": "error", "message": …, "detail"?: […]}`.
- `services/*` hold the logic — BMR/TDEE/macros (`health.py`), streaks & summaries (`activity.py`), recovery & health scores (`scoring.py`), nutrition, medication schedules/adherence, vitals classification, weekly reports, export and the coach. Most functions are pure and unit‑tested directly.
- `repositories/*` are the only place SQL lives; every query is parameterised and scoped by `user_id`.
- `db/schema.sql` is idempotent and applied on startup; `get_connection()` commits/rolls back/closes automatically.

**Frontend** (`frontend/`) is an Expo Router app (iOS, Android, web):

- `lib/api/` — one module per domain over a shared axios client; network failures are queued offline, validation errors are surfaced (never queued).
- `components/ui/` — `Screen`, `Card`, `Button`, `Field`, `Sheet`, `Segmented`, `ProgressBar`, `EmptyState`, `StatusPill` give every screen consistent spacing, loading/empty/error states and accessibility labels.
- `components/dashboard/` — the Home screen is composed from small, tested components instead of one 1,100‑line file.
- All writes are stamped with the device's local date/time so "today" always matches the user's day.

### API overview

| Domain | Endpoints |
| --- | --- |
| Profile & data | `POST/GET /users/profile`, `GET /users/stats`, `GET /users/export?format=json\|csv`, `DELETE /users/data` |
| Activities | `POST /log_activity`, `GET/PUT/DELETE /activity_logs`, `GET /daily_summary`, `/activity_history`, `/streaks` |
| Nutrition | `GET /foods/search`, `/foods/popular`, `POST /foods`, `POST /nutrition/log`, `GET /nutrition/daily` |
| Medications | `GET/POST /medications`, `PUT/DELETE /medications/{id}`, `GET /medications/schedule`, `/medications/adherence`, `POST /medications/{id}/doses/toggle` |
| Vitals | `POST/GET /vitals`, `GET /vitals/latest`, `DELETE /vitals/{id}` |
| Sleep / habits / weight | `/sleep/*`, `/habits/*`, `/weight/*` |
| Reports | `GET /dashboard`, `GET /reports/weekly`, `GET /recovery/score`, `POST /generate_report`, `POST /calculate_health_score` |
| Coach | `POST /analyze_query` |

Full, interactive schema: http://localhost:8000/docs.

---

## Quality

| | Backend | Frontend |
| --- | --- | --- |
| Lint / format | `ruff check`, `ruff format` | ESLint (`eslint-config-expo`), Prettier |
| Types | Pydantic v2 models | TypeScript strict |
| Tests | pytest — 98 unit + API tests, ~94% coverage, each test on its own temp DB | Jest + Testing Library — 58 tests for formatting, API contract, offline sync, storage and components |

Run everything in Docker with `make test`, or natively:

```bash
cd backend  && pip install -r requirements-dev.txt && ruff check . && pytest --cov=wellora
cd frontend && npm ci && npm run lint && npm run typecheck && npm test
```

CI (`.github/workflows/ci.yml`) runs both suites, then builds the Docker images and smoke‑tests the running stack.

---

## Notes & limitations

- Wellora is a wellness tool, **not a medical device**. Vital ranges are general adult guidelines; the app tells users to consult a clinician about abnormal readings.
- Users are identified by an anonymous per‑device id (no login yet). Before exposing the API publicly, add authentication and restrict `CORS_ORIGINS`.
- SQLite is ideal for a personal/self‑hosted deployment; the repository layer keeps a move to Postgres contained.
