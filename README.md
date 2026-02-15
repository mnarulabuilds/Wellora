# Wellora - AI Health Assistant

Wellora is a comprehensive health assistant application designed to guide users towards a healthier lifestyle through personalized feedback, NLP-driven queries, and data-driven health reports.

## Project Structure

- **backend/**: Python FastAPI application handling NLP, ML logic, and health calculations.
- **frontend/**: React Native application (Expo) providing the user interface.

## Prerequisites

- Node.js & npm
- Python 3.8+

## Getting Started

### 1. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm  # Optional: for advanced NLP features later
```

Run the server:

```bash
uvicorn app:app --reload
```
The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Run the application:

```bash
npx expo start
```

## Features

- **Personalized Health Reports**: Input your metrics and get tailored advice.
- **AI Health Assistant**: Ask natural language questions about diet, fitness, and sleep.
- **Visual Analytics**: Interactive charts showing your health projections.
- **Diet & Activity Tracking**: (Coming Soon)

## Technology Stack

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: FastAPI, Python
- **AI/ML**: scikit-learn (logic), spaCy (NLP)
