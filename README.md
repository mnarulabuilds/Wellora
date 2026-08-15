# Wellora - AI Health Assistant (v2.0)

Wellora is a production-grade holistic health and longevity assistant application designed to guide users towards sustainable, healthier lifestyles through personalized coaching, NLP-driven query analysis, dual offline/online data synchronization, and data-driven metabolic reports.

## Project Structure

- **backend/**: Python FastAPI application handling NLP intent detection, biometric modeling (Mifflin-St Jeor), SQLite WAL database persistence, and health score algorithms.
- **frontend/**: React Native application (Expo + TypeScript) providing a luxury cyber-dark UI, live goal progress rings, interactive analytics charts, and conversational AI assistant.

---

## Prerequisites

- **Node.js**: v18+ and npm
- **Python**: 3.9+

---

## Getting Started

### 1. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm  # Optional: for enhanced named entity recognition
```

Run the backend server:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
The API documentation and endpoints will be live at `http://localhost:8000/docs`.

To run the backend test suite:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

---

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Run type-checking:

```bash
npx tsc --noEmit
```

Run the Expo development client:

```bash
npx expo start
```

---

## Key Features

- **Personalized Health Reports**: Biometric analysis computing BMI, TDEE, macro gram targets (Protein, Carbs, Fats), and 12-week weight trajectories.
- **Conversational AI Assistant**: Persistent chat history, weighted multi-intent NLP engine, context-infused feedback, and 1-tap suggestion chips.
- **Live Progress & Habit Tracking**: Real-time circular progress rings for Daily Calories, Active Exercise Minutes, and Hydration (with 1-tap `+250ml` quick-add).
- **Interactive Weekly Visual Analytics**: Switchable weekly trends between workout minutes and calorie intake.
- **Dual Layer Offline/Online Sync**: Offline queue mechanism ensuring zero data loss during network interruptions, automatically draining upon reconnection.
- **Metric & Imperial System Support**: Seamless switching between kg/cm and lbs/in.
- **Production-Grade Resilience**: SQLite WAL concurrency mode, input validation bounds, and structured error handlers.

---

## Technology Stack

- **Frontend**: React Native, Expo Router, TypeScript, React Native Chart Kit, Lucide/Ionicons
- **Backend**: FastAPI, Python 3.14+, Pydantic v2, SQLite (WAL mode), Uvicorn
- **AI & NLP**: Custom Multi-Intent Weighted NLP Classifier + spaCy NER support
