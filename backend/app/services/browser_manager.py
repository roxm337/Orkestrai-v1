from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Literal

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from app.core.config import Settings

BrowserEngine = Literal["playwright", "lightpanda"]


@dataclass
class BrowserSession:
    engine: BrowserEngine
    browser: Browser
    context: BrowserContext

    async def new_page(self, *, viewport: dict[str, int] | None = None) -> Page:
        page = await self.context.new_page()
        if viewport:
            await page.set_viewport_size(viewport)
        return page


class BrowserManager:
    def __init__(self, settings: Settings):
        self.settings = settings

    @asynccontextmanager
    async def session(self, preferred_engine: str | None = None):
        requested_engine = self.resolve_engine(preferred_engine)
        try:
            async with self._open_session(requested_engine) as browser_session:
                yield browser_session
                return
        except Exception:
            if requested_engine == "lightpanda" and self.settings.lightpanda_fallback_to_playwright:
                async with self._open_session("playwright") as browser_session:
                    yield browser_session
                    return
            raise

    @asynccontextmanager
    async def _open_session(self, engine: BrowserEngine):
        async with async_playwright() as playwright:
            if engine == "lightpanda":
                browser = await playwright.chromium.connect_over_cdp(self.settings.lightpanda_cdp_url)
                context = browser.contexts[0] if browser.contexts else await browser.new_context()
            else:
                browser = await playwright.chromium.launch(headless=self.settings.playwright_headless)
                context = await browser.new_context()

            session = BrowserSession(engine=engine, browser=browser, context=context)
            try:
                yield session
            finally:
                if engine == "playwright":
                    await context.close()
                else:
                    for page in list(context.pages):
                        await page.close()
                await browser.close()

    def resolve_engine(self, preferred_engine: str | None) -> BrowserEngine:
        candidate = (preferred_engine or self.settings.browser_engine_default).strip().lower()
        if candidate not in {"playwright", "lightpanda"}:
            return "playwright"
        return candidate  # type: ignore[return-value]
