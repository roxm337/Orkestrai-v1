import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import catalog, runs, workflows
from app.core.config import get_settings
from app.core.database import SessionLocal, init_db
from app.services.browser_manager import BrowserManager
from app.services.executor import WorkflowExecutor, run_worker
from app.services.groq_service import GroqService
from app.services.playwright_service import PlaywrightService
from app.services.redis_bus import EventBus, RunQueue
from app.services.website_generator import WebsiteGenerator

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    event_bus = EventBus(settings.redis_url)
    run_queue = RunQueue(settings.redis_url)
    await event_bus.connect()
    await run_queue.connect()
    browser_manager = BrowserManager(settings)

    executor = WorkflowExecutor(
        session_factory=SessionLocal,
        event_bus=event_bus,
        playwright_service=PlaywrightService(browser_manager),
        groq_service=GroqService(settings),
        website_generator=WebsiteGenerator(settings),
    )

    worker_task = asyncio.create_task(run_worker(run_queue, executor))

    app.state.event_bus = event_bus
    app.state.run_queue = run_queue
    app.state.executor = executor
    app.state.worker_task = worker_task

    try:
        yield
    finally:
        worker_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await worker_task
        await event_bus.close()
        await run_queue.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/storage", StaticFiles(directory=settings.generated_sites_dir), name="storage")

app.include_router(workflows.router, prefix=settings.api_prefix)
app.include_router(runs.router, prefix=settings.api_prefix)
app.include_router(catalog.router, prefix=settings.api_prefix)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "status": "ok",
        "docs": "/docs",
        "apiPrefix": settings.api_prefix,
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
