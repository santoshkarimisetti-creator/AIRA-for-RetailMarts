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
│  (100 Products, 13k+    │  │ + Concurrent Chunked TTS Audio  │  │ Locked in VRAM during server run; │
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
* **15 Dynamic Quick-Suggestion Pills**:
  The Floating Assistant drawer features a horizontally scrollable chip deck populated with all 15 partitioned questions dynamically localized into the user's selected language.
* **Local Ollama Intelligence (`gemma3:4b`)**:
  Un-templated, complex, or open-ended analytical questions are routed to local Ollama to safely generate PostgreSQL SELECT queries and synthesize conversational responses strictly in the user's language.

### 2. ⚡ Autonomous Ollama GPU Lifecycle (Zero VRAM Waste)
* **Warm on Backend Startup**: As soon as the FastAPI server starts, it preloads `gemma3:4b` into GPU VRAM with indefinite `keep_alive: -1`.
* **Zero Idle Timeout**: A background heartbeat thread continuously maintains the active model state every 2 minutes so it never becomes idle or drops out while the backend is active.
* **Auto-Eviction on Shutdown**: When the FastAPI server stops (`Ctrl+C`), the lifespan handler immediately sends `keep_alive: 0`, freeing 100% of GPU VRAM.

### 3. 🎙️ Multilingual Speech Recognition & Concurrent Neural TTS
* **GPU-Accelerated STT (`faster-whisper`)**: Real-time voice transcription in ~0.8s on CUDA without timeouts.
* **Native Browser STT**: Web Speech recognition streaming regional language tags (`te-IN`, `hi-IN`, `ta-IN`, `ml-IN`, `en-IN`).
* **Concurrent Chunked Neural TTS Streamer (`/api/ai/tts`)**:
  Intelligently segments text at word boundaries ($\le 85$ chars) and fetches audio streams concurrently via `ThreadPoolExecutor` to eliminate Google TTS length limits. Ensures every single Telugu, Hindi, Tamil, and Malayalam word is pronounced with authentic native inflection—no skipped words, no missed characters.

### 4. 🎯 One-Click Targeted Inventory Restock Navigation
* Clicking **Reorder** or **Restock** from AI Chat, Alerts, or AI Insights immediately redirects to `/app/inventory?highlight={productId}`.
* Automatically resets filters, smoothly scrolls the target card directly into the **center of the screen**, and highlights it with a glowing cyan selection ring and an animated **"Target Item"** badge.

### 5. 🛒 Express Supermarket POS Counter
* Camera barcode scanner (EAN-13, EAN-8, UPC, Code 128, QR Code) with horizontal/vertical orientation controls.
* USB/Bluetooth hardware barcode gun support.
* Dynamic UPI QR generation, cash change calculator, and supermarket receipt printing.

### 6. 🏬 3D Store Digital Twin
* Interactive Three.js isometric 3D physical shelf mapping displaying live departmental stock fill percentages, critical shelf levels, and restock prompts.

---

## 📋 The 15 Assistant Questions (Grouped by Category)

| Domain | # | Question Intent | English Suggestion Pill | Telugu Suggestion Pill (తెలుగు) |
| :--- | :--- | :--- | :--- | :--- |
| **Sales** | 1 | Today's Sales | *"What are today's sales?"* | *"ఈ రోజు అమ్మకాలు ఎంత?"* |
| | 2 | Low Sales / Least Sold | *"Which items sales are very low in our Store"* | *"స్టోర్‌లో తక్కువగా అమ్ముడైన వస్తువులు ఏవి?"* |
| | 3 | Store Revenue | *"Total sales of the store"* | *"స్టోర్ మొత్తం అమ్మకాలు ఎంత?"* |
| | 4 | Top Selling Items | *"Which items are top selling?"* | *"ఎక్కువగా అమ్ముడవుతున్న వస్తువులు ఏవి?"* |
| **Profits** | 5 | Highest Profit | *"Which product gives highest profit?"* | *"ఏ వస్తువు ఎక్కువ లాభం ఇస్తుంది?"* |
| | 6 | Lowest Profit | *"Which items have the lowest profit?"* | *"తక్కువ లాభం ఇచ్చే వస్తువులు ఏవి?"* |
| | 7 | Best Margins | *"Highest margin items"* | *"అత్యధిక మార్జిన్ ఉన్న వస్తువులు ఏవి?"* |
| **Prices** | 8 | Specific Price Check | *"Price of ghee?"* | *"నెయ్యి ధర ఎంత?"* |
| | 9 | Most Expensive Item | *"Most expensive product"* | *"అత్యంత ఖరీదైన వస్తువు ఏది?"* |
| | 10 | Cheapest Item | *"Cheapest product in store"* | *"అతి తక్కువ ధర గల వస్తువు ఏది?"* |
| **Stocks** | 11 | Specific Stock Check | *"How much stock of milk is left?"* | *"పాలు ఎంత స్టాక్ ఉంది?"* |
| | 12 | Low Stock Reorder | *"Which items are low in stock?"* | *"ఏ వస్తువుల స్టాక్ తక్కువగా ఉంది?"* |
| | 13 | Out of Stock | *"Which items are out of stock?"* | *"స్టాక్ పూర్తిగా అయిపోయిన వస్తువులు ఏవి?"* |
| | 14 | Plenty / Surplus Stock | *"Items with plenty of stock"* | *"ఎక్కువ స్టాక్ ఉన్న వస్తువులు ఏవి?"* |
| | 15 | Live Inventory Action | *"Restock 20 units of ghee"* | *"20 యూనిట్ల నెయ్యి యాడ్ చేయండి"* |

*(Also localized into Hindi, Tamil, and Malayalam in the assistant).*

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
git clone https://github.com/santoshkarimisetti-creator/AIRA-for-RetailMarts.git
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
   *(Note: You do not need to keep Ollama manually alive. When the AIRA backend starts, it will automatically lock the model in VRAM and release it when you stop the backend).*

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
