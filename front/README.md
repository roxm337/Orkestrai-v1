# ScrapeFlow MVP

ScrapeFlow is a visual automation platform for lead generation and website generation.

The MVP lets users:

1. Design workflows with a drag-and-drop builder
2. Scrape business leads from Google Maps with Playwright
3. Enrich leads from their websites and social links
4. Analyze businesses with Groq
5. Generate starter Next.js websites from workflow output
6. Run everything from a dashboard with live execution logs

## Stack

### Backend
- FastAPI
- PostgreSQL
- Redis
- Playwright
- Lightpanda
- Groq

### Frontend
- Next.js App Router
- TailwindCSS
- ShadCN-style UI primitives
- React Flow

### Execution model
- Workflow definitions stored as JSON
- Topological sorting for node execution
- Redis-backed queue with local fallback
- WebSocket event stream for run updates
- Deterministic first-pass agents with Groq-powered analysis

## Architecture

```text
scrapeflow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── storage/generated-sites/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.local.example
└── docker-compose.yml
```

## Core services

### 1. Scraper node
- Deterministic Playwright flow
- Per-node browser engine switcher
- Searches Google Maps
- Extracts business name, Maps URL, website, phone, and address

### 2. Enrichment node
- Visits business websites
- Can run through Playwright or Lightpanda
- Extracts emails, social links, and content excerpts
- Keeps the first MVP pass stable and explainable

### 3. Analysis node
- Calls Groq chat completions
- Produces:
  - business description
  - branding direction
  - website sections
  - hero copy
  - calls to action

### 4. Website generator node
- Writes starter Next.js projects to `backend/storage/generated-sites/<run-id>/<slug>/`
- Uses generated analysis content to populate the template

### 5. Workflow engine
- Stores workflows in PostgreSQL
- Stores run snapshots and outputs
- Executes nodes in topological order
- Publishes live updates over Redis pub/sub and WebSockets
- Routes browser nodes through a dual-browser manager

## Local setup

### 1. Start infrastructure

```bash
docker compose up -d postgres redis lightpanda
```

### 2. Configure Groq credentials

```bash
export GROQ_API_KEY=<your-api-key>
```

### 3. Backend

```bash
cd backend
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### 5. Open the app

- Dashboard: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

If you run the frontend in Docker but still want browser calls to hit your local machine, keep:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api`
- `SCRAPEFLOW_INTERNAL_API_BASE_URL=http://backend:8000/api`

## Full Docker flow

```bash
docker compose up --build
```

This launches PostgreSQL, Redis, Lightpanda, FastAPI, and Next.js together.

## Dual-browser manager

ScrapeFlow now supports two browser backends behind one service layer:

- `playwright`: launches local Chromium through Playwright
- `lightpanda`: connects to a Lightpanda CDP server and uses the same Playwright page API

Configuration lives in `backend/.env`:

```env
BROWSER_ENGINE_DEFAULT=playwright
LIGHTPANDA_CDP_URL=http://localhost:9222
LIGHTPANDA_FALLBACK_TO_PLAYWRIGHT=true
```

Per-node switching is done through workflow config:

- scraper nodes default to `browserEngine=playwright`
- enrichment nodes default to `browserEngine=lightpanda`

If Lightpanda is unavailable and fallback is enabled, ScrapeFlow automatically falls back to Playwright.

## API overview

### Workflows
- `GET /api/workflows`
- `POST /api/workflows`
- `GET /api/workflows/{workflow_id}`
- `PUT /api/workflows/{workflow_id}`
- `DELETE /api/workflows/{workflow_id}`

### Runs
- `GET /api/runs`
- `GET /api/runs/{run_id}`
- `POST /api/workflows/{workflow_id}/runs`
- `WS /ws/runs/{run_id}`

### Catalog
- `GET /api/catalog/nodes`
- `GET /api/catalog/sample-workflow`

## Agent model

The MVP keeps the production path simple:

1. Observe with Playwright
2. Execute deterministic scraping or extraction
3. Use Groq for summarization and strategic generation
4. Generate local assets from structured results

The backend also includes a lightweight `BrowserAgent` class that follows the observe-think-act loop for future autonomous browser tasks.

## Notes

- Google Maps selectors change over time, so the scraper is intentionally best-effort and easy to adapt.
- Lightpanda is beta software and some sites may still need Playwright for better compatibility.
- Redis is used for the queue and live event stream, but the app falls back locally if Redis is unavailable during development.
- Generated websites are starter projects, not deployed apps. They are meant to be reviewed, refined, and then launched.
- Groq is a hosted external API, so the platform is no longer fully local-only.
