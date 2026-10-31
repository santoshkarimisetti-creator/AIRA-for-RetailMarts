# AIRA – Local AI Services & Integration Guide

This document describes how AIRA's 100% offline, local AI architecture operates, including speech recognition (faster-whisper), local LLM inference (Ollama), and PostgreSQL business intelligence.

---

## 1. Architecture Overview

```
[ User Microphone / Text Input ]
               │
               ▼
   [ Frontend: FloatingAssistant.jsx ]
               │
      (HTTP POST /api/ai/voice or /api/ai/chat)
               │
               ▼
     [ FastAPI Backend: app.main ]
         ├── Speech-to-Text: faster-whisper (CTranslate2 small int8, CPU/GPU)
         │       └── Transcribes audio and auto-detects language (te/en)
         ├── Local LLM Engine: app.ai.local_llm
         │       └── Connects to Ollama (http://localhost:11434/api/chat)
         └── Database Grounding: app.ai.rule_based_assistant
                 └── Queries PostgreSQL aira_db for real sales, stock, margins
```

---

## 2. Models & Components

| Component | Model / Engine | Configuration |
| :--- | :--- | :--- |
| **Speech-to-Text** | `faster-whisper-small` | `device="cpu"`, `compute_type="int8"`, VAD filter |
| **Supported Languages** | English (`en`), Telugu (`te`) | Automatic language identification |
| **Local LLM** | `gemma3:4b` | Ollama API (`http://localhost:11434/api/chat`) |
| **Database** | PostgreSQL 18.6 (`aira_db`) | Real-time ORM queries on `products`, `sales_records` |

---

## 3. Starting the Project

### Step 1: Start PostgreSQL
Ensure PostgreSQL is running locally on port `5432` with database `aira_db`.

### Step 2: Start Ollama (Local LLM Server)
```powershell
ollama serve
```
*(Verify models with `ollama list`)*

### Step 3: Start AIRA Backend (FastAPI)
```powershell
cd D:\AIRA\backend
python -m uvicorn app.main:app --reload --port 8000
```

### Step 4: Start AIRA Frontend (React + Vite)
```powershell
cd D:\AIRA\frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. API Endpoints

- `POST /api/ai/voice`: Uploads audio recording (`.webm`, `.wav`), transcribes with faster-whisper, identifies language (Telugu/English), and answers with PostgreSQL business facts.
- `POST /api/ai/chat`: Accepts JSON query (`{ "message": "...", "language": "te-IN" }`) and returns intelligent response.
- `GET /api/dashboard/stats`: Returns live dashboard KPIs with genuine historical comparisons.
- `GET /api/sales/history`: Returns transaction history with date range and product search filters.

