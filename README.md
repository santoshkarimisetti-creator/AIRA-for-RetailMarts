# 🚀 AIRA — Autonomous Intelligent Retail Operating System

AIRA is a full-stack, enterprise-grade AI retail management operating system and command center. It bridges physical store operations with real-time neural inventory intelligence, live PostgreSQL database telemetry, offline local LLM SQL synthesis, 3D interactive store mapping, express POS barcode checkout, and multilingual Indian regional voice assistance.

---

## 🌟 Architecture & Highlights

```
                          ┌──────────────────────────────────────────────┐
                          │         React 19 + Vite 8 Desktop/POS        │
                          │   (Tailwind CSS, Three.js 3D, Web Audio API) │
                          └──────────────────────┬───────────────────────┘
                                                 │ REST API & WebSocket
                                                 ▼
                          ┌──────────────────────────────────────────────┐
                          │            FastAPI Python Backend            │
                          │   (SQLAlchemy ORM, Auto-Lifespan Management) │
                          └──────────────┬────────────────┬──────────────┘
                                         │                │
            ┌────────────────────────────┴─────┐    ┌─────┴────────────────────────────┐
            ▼                                  ▼    ▼                                  ▼
┌─────────────────────────┐  ┌─────────────────────────────────┐  ┌───────────────────────────────────┐
│  PostgreSQL Database    │  │ Local GPU STT (faster-whisper)  │  │ Local Ollama LLM (gemma3:4b)      │
│  (100 Products, 13k+    │  │ + Neural Audio TTS Streamer     │  │ Locked in VRAM during server run; │
│   Live Sales Records)   │  │ (Telugu, Hindi, Tamil, ML, EN)  │  │ Auto-unloaded on server shutdown  │
└─────────────────────────┘  └─────────────────────────────────┘  └───────────────────────────────────┘
```

### 1. 🧠 Intelligent Dual AI Assistant
* **Instant Multilingual Rule Assistant (< 20ms response time)**:
  Handles **15 strictly grouped question patterns** across **4 domains** in **Telugu (తెలుగు), Hindi (हिन्दी), Tamil (தமிழ்), Malayalam (മലയാളം), and English**:
  * **Profits**: Most profitable item, lowest profit/margin items, best margin products.
  * **Sales**: Today's sales & orders, total store revenue, top-selling products, least-sold / low sales items.
  * **Prices**: Specific product price checks (*"price of ghee"*, *"నెయ్యి ధర ఎంత?"*), highest priced item, cheapest item.
  * **Stocks**: Specific product stock inquiries (*"stock of milk"*), low-stock warnings, out-of-stock items, surplus stock, and live restock/sale operations.
* **Local Ollama Intelligence (`gemma3:4b`)**:
  Un-templated, complex, or open-ended analytical questions are routed to local Ollama to safely generate PostgreSQL SELECT queries and synthesize conversational responses strictly in the user's language.

### 2. ⚡ Autonomous Ollama GPU Lifecycle (Zero VRAM Waste)
* **Warm on Backend Startup**: As soon as the FastAPI server starts, it preloads `gemma3:4b` into GPU VRAM with indefinite `keep_alive: -1`.
* **Zero Idle Timeout**: A background heartbeat thread continuously maintains the active model state so it never becomes idle or drops out while the backend is active.
* **Auto-Eviction on Shutdown**: When the FastAPI server stops (`Ctrl+C`), the lifespan handler immediately sends `keep_alive: 0`, freeing 100% of GPU VRAM.

### 3. 🎙️ Multilingual Speech Recognition & Native Audio Synthesis
* **GPU-Accelerated STT (`faster-whisper`)**: Real-time voice transcription in ~0.8s on CUDA without timeouts.
* **Native Browser STT**: Web Speech recognition streaming regional language tags (`te-IN`, `hi-IN`, `ta-IN`, `ml-IN`, `en-IN`).
* **Neural TTS Audio Streamer (`/api/ai/tts`)**: Ensures every single Telugu, Hindi, Tamil, and Malayalam word is pronounced with authentic native inflection—no skipped words, no missed characters.

### 4. 🎯 One-Click Targeted Inventory Restock Navigation
* Clicking **Reorder** or **Restock** from AI Chat, Alerts, or AI Insights immediately redirects to `/app/inventory?highlight={productId}`.
* Automatically resets filters, smoothly scrolls the target card directly into the **center of the screen**, and highlights it with a glowing cyan selection ring and a **"Target Item"** badge.

### 5. 🛒 Express Supermarket POS Counter
* Camera barcode scanner (EAN-13, EAN-8, UPC, Code 128, QR Code) with horizontal/vertical orientation controls.
* USB/Bluetooth hardware barcode gun support.
* Dynamic UPI QR generation, cash change calculator, and supermarket receipt printing.

### 6. 🏬 3D Store Digital Twin
* Interactive Three.js isometric 3D physical shelf mapping displaying live departmental stock fill percentages, critical shelf levels, and restock prompts.

---

## 🛠️ Step-by-Step Setup Guide (For New Users)

### Prerequisites
Before starting, ensure you have the following installed:
1. **Git**: [https://git-scm.com/](https://git-scm.com/)
2. **Node.js** (v18 or higher): [https://nodejs.org/](https://nodejs.org/)
3. **Python** (v3.10 to v3.13): [https://www.python.org/](https://www.python.org/)
4. **PostgreSQL** (v14 or higher): [https://www.postgresql.org/](https://www.postgresql.org/)
5. **Ollama**: [https://ollama.com/](https://ollama.com/)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/AIRA.git
cd AIRA
```

---

### Step 2: Set Up PostgreSQL Database
1. Open PostgreSQL CLI (`psql`) or pgAdmin and create the database:
   ```sql
   CREATE DATABASE aira_db;
   ```
2. Verify PostgreSQL is running on `localhost:5432` with username `postgres` and password `postgres` (or adjust credentials in `.env`).

---

### Step 3: Set Up Ollama Local LLM
1. Start the Ollama desktop application or daemon:
   ```bash
   ollama serve
   ```
2. Pull the lightweight, high-performance retail model:
   ```bash
   ollama pull gemma3:4b
   ```
   *(Note: You do not need to run a manual script to keep Ollama alive. When the AIRA backend starts, it will automatically lock the model in VRAM and release it when you stop the backend).*

---

### Step 4: Set Up & Start Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   * **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Copy `.env.example` to `.env`:
   * **Windows**: `copy .env.example .env`
   * **Linux/macOS**: `cp .env.example .env`
5. Seed the database with 100 products and 13,000+ realistic transaction records:
   ```bash
   python -m app.init_db
   ```
6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * REST API will be running at: `http://localhost:8000`
   * Interactive Swagger Docs: `http://localhost:8000/docs`

---

### Step 5: Set Up & Start Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Variables Reference

Located in `backend/.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/aira_db` | PostgreSQL connection string |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama local API base URL |
| `OLLAMA_MODEL` | `gemma3:4b` | Model tag used for Text-to-SQL & synthesis |
| `JWT_SECRET` | `aira_supermarket_secret_jwt_key_2026_retail_os` | Secret key for JWT session tokens |
| `STORE_NAME` | `AIRA Retail Mart` | Default name of the retail store |
| `STORE_CURRENCY`| `INR` | Store currency symbol (`₹`) |
| `PORT` | `8000` | Backend API port |

---

## 🧪 Testing Common Queries

Once both servers are running, test these voice or text queries in the Floating Assistant:

| Domain | Query | Language | Expected Result |
| :--- | :--- | :--- | :--- |
| **Sales** | *"which items sales are very low in our Store"* | English | Returns the 4 lowest-selling items + product cards in **< 0.03s** |
| **Prices** | *"Price of ghee?"* | English | Returns Amul Pure Ghee 1L Tin (`₹650.00`) in **< 0.01s** |
| **Sales** | *"ఈ రోజు అమ్మకాలు ఎంత?"* | Telugu | Speaks and displays today's sales in authentic Telugu |
| **Stocks** | *"నెయ్యి ధర ఎంత?"* | Telugu | Speaks Amul Pure Ghee price in pristine native Telugu audio |
| **Profits**| *"Which product gives highest profit?"* | English | Returns Saffola Gold Oil with exact total profit and margin |
| **Operations**| *"Restock 20 units of ghee"* | English | Commits live inventory restock directly to PostgreSQL |

---

## 📁 Repository Directory Structure

```
AIRA/
├── frontend/
│   ├── public/             # Static icons, brand logos, demo audio
│   ├── src/
│   │   ├── components/     # Navbar, Sidebar, FloatingAssistant, POS modals
│   │   ├── pages/          # Dashboard, POSCheckout, Inventory, SalesHistory, etc.
│   │   ├── services/       # geminiService.js (STT/TTS), api.js (Axios REST)
│   │   └── utils/          # demoData.js, userStore.js
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── ai/             # local_llm.py, rule_based_assistant.py, speech_to_text.py
│   │   ├── database.py     # SQLAlchemy PostgreSQL engine
│   │   ├── models.py       # User, Product, SalesRecord, Alert schemas
│   │   ├── init_db.py      # Database seeding script (100 products, 13k sales)
│   │   └── main.py         # FastAPI routes, TTS streamer, lifespan events
│   ├── requirements.txt    # Python package dependencies
│   └── .env.example        # Environment variable template
├── .gitignore
└── README.md
```

---

## 🛡️ License
Built for modern, data-driven retail store owners and independent merchants.
