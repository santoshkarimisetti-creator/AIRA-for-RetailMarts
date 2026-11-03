# 🚀 AIRA — Artificial Intelligence for Retail Analytics

AIRA (**Artificial Intelligence for Retail Analytics**) is an intelligent full-stack retail management and analytics platform engineered for supermarkets, grocery stores, and independent merchants. It bridges daily store operations with real-time PostgreSQL sales telemetry, offline local LLM Text-to-SQL query generation, responsive inventory management with targeted reorder navigation, express POS barcode checkout, and multilingual Indian regional voice assistance.

> [!IMPORTANT]
> **Project Scope & Terminology Notice**: The official title of this project is **Artificial Intelligence for Retail Analytics (AIRA)**. All autonomous retail capabilities (such as automated supplier reordering, autonomous multi-agent replenishment, and automated shelf actuation) are strictly designated under **[Future Scope](#-future-scope--roadmap-autonomous-retail-operations)**. They are not active in the current implementation, which maintains human-in-the-loop control for store managers.

---

## 🌟 Architecture & High-Level Flow

```
                          ┌──────────────────────────────────────────────┐
                          │         React 19 + Vite 8 Desktop/POS        │
                          │   (Tailwind CSS, Lucide, Recharts, Three.js) │
                          └──────────────────────┬───────────────────────┘
                                                 │ REST API (JSON / Audio)
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
│  (100 Products, 13k+    │  │ + Concurrent Chunked TTS Audio  │  │ Pre-warmed & locked in GPU VRAM;  │
│   Live Sales Records)   │  │ (Telugu, Hindi, Tamil, ML, EN)  │  │ Auto-unloaded on server shutdown  │
└─────────────────────────┘  └─────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 🧩 Key Implemented Features

### 1. 🧠 Intelligent Dual AI Assistant
* **Instant Multilingual Rule Assistant (< 20ms response time)**:
  Handles **15 strictly grouped question patterns** across **4 core domains** in **Telugu (తెలుగు), Hindi (हिन्दी), Tamil (தமிழ்), Malayalam (മലയാളം), and English**:
  * **Profits**: Most profitable product, lowest profit/margin products, highest margin items.
  * **Sales**: Today's sales & orders, total store revenue, top-selling items, least-sold / low sales products.
  * **Prices**: Specific product price inquiries (*"price of ghee"*, *"నెయ్యి ధర ఎంత?"*), highest priced item, cheapest item in store.
  * **Stocks**: Specific product stock inquiries (*"stock of milk"*), low-stock warnings, out-of-stock items, surplus stock, and live restock/sale adjustments.
* **15 Dynamic Quick-Suggestion Pills**:
  The Floating Assistant drawer features a horizontally scrollable chip deck populated with all 15 partitioned questions dynamically translated into the store manager's selected language.
* **Offline Local Ollama Intelligence (`gemma3:4b`)**:
  Un-templated or open-ended analytical questions are routed to a local Ollama model to safely generate PostgreSQL SELECT queries and synthesize conversational responses strictly in the user's language without cloud dependency.

### 2. ⚡ Automated Ollama GPU Lifespan Management (Zero VRAM Waste)
* **Warmup on Backend Startup**: As soon as the FastAPI server starts, it preloads `gemma3:4b` into GPU VRAM with `keep_alive: -1`.
* **Zero Idle Timeout**: A background heartbeat thread continuously pings the active model state every 2 minutes so it remains warm and never drops out while the backend is active.
* **Clean Eviction on Shutdown**: When the FastAPI server stops (`Ctrl+C`), the lifespan handler sends `keep_alive: 0`, freeing 100% of GPU VRAM immediately.

### 3. 🎙️ Multilingual Speech Recognition & Concurrent Neural TTS
* **GPU-Accelerated STT (`faster-whisper`)**: Real-time voice transcription in ~0.8s on CUDA with fallback to native browser Web Speech API.
* **Native Browser STT**: Web Speech recognition streaming regional language tags (`te-IN`, `hi-IN`, `ta-IN`, `ml-IN`, `en-IN`).
* **Concurrent Chunked Neural TTS Streamer (`/api/ai/tts`)**:
  Intelligently segments responses at natural word boundaries ($\le 85$ chars) and fetches audio streams concurrently via `ThreadPoolExecutor` to eliminate length constraints. Ensures every single Telugu, Hindi, Tamil, and Malayalam word is pronounced with authentic native inflection without dropped syllables or character skipping.

### 4. 🎯 One-Click Targeted Inventory Restock Navigation
* Clicking **Reorder** or **Restock** from AI Chat, Alerts, or AI Insights immediately redirects to `/app/inventory?highlight={productId}`.
* Automatically resets filters, smoothly scrolls the target card directly into the **center of the screen**, and highlights it with a glowing cyan selection ring and an animated **"Target Item"** badge for quick verification.

### 5. 🛒 Express Supermarket POS Counter
* Camera barcode scanner (`html5-qrcode`) supporting EAN-13, EAN-8, UPC, Code 128, and QR Code with orientation controls.
* USB and Bluetooth hardware barcode gun scanner support.
* Dynamic UPI QR code modal, cash change calculator, and instant supermarket receipt printing.

### 6. 🏬 3D Store Visualizer & Floor Overview
* Interactive Three.js isometric 3D department view visualizing store departmental stock levels, low-stock warnings, and section status embedded within the Dashboard and Store Health views.

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

*(All questions are also localized into Hindi, Tamil, and Malayalam in the assistant).*

---

## 🔮 Future Scope & Roadmap (Autonomous Retail Operations)

The following advanced capabilities represent the planned research and development evolution of the AIRA platform:

1. **Autonomous Multi-Agent Replenishment**:
   Fully autonomous AI agents that interface directly with supplier APIs / B2B EDI networks to trigger purchase orders automatically when safety thresholds are breached, removing human reorder latency.
2. **Computer Vision Shelf Overhead Tracking**:
   Ceiling-mounted smart edge camera feeds with object detection and customer spatial tracking for automated queue-less walkout checkout and real-time empty shelf alerts.
3. **Smart IoT Shelf Weight Sensors**:
   Hardware weight sensors deployed under physical store shelves to continuously detect SKU count decrements and cross-verify POS inventory telemetry.
4. **Autonomous Vendor Negotiation Bots**:
   AI agents communicating directly with FMCG vendors via WhatsApp Business API / automated email to negotiate dynamic bulk discount tiers.
5. **Reinforcement Learning Dynamic Markdown Engine**:
   Real-time algorithmic price adjustments for perishable items based on approaching expiry dates, current footfall velocity, and margin preservation targets.
6. **Multi-Branch Cross-Store Mesh**:
   Decentralized synchronization across multiple supermarket chain outlets for automated inter-branch stock balancing.

---

## 🛠️ Step-by-Step Setup Guide

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
2. Pull the lightweight retail model:
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
