import re
from typing import Any
from urllib.parse import quote_plus

from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError

from app.services.browser_manager import BrowserManager

EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
SOCIAL_DOMAINS = {
    "facebook": "facebook.com",
    "instagram": "instagram.com",
    "linkedin": "linkedin.com",
    "x": "x.com",
    "youtube": "youtube.com",
    "tiktok": "tiktok.com",
}


class PlaywrightService:
    def __init__(self, browser_manager: BrowserManager):
        self.browser_manager = browser_manager

    async def scrape_google_maps(
        self,
        keyword: str,
        location: str,
        max_results: int = 10,
        browser_engine: str | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        query = quote_plus(f"{keyword} {location}")
        url = f"https://www.google.com/maps/search/{query}"

        async with self.browser_manager.session(browser_engine) as session:
            page = await session.new_page(viewport={"width": 1440, "height": 1024})
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3500)

            await self._scroll_results(page, max_results=max_results)
            businesses = await self._collect_result_cards(page, max_results=max_results)

            detailed = []
            for business in businesses[:max_results]:
                detail_page = await session.new_page(viewport={"width": 1440, "height": 1024})
                try:
                    await detail_page.goto(business["maps_url"], wait_until="domcontentloaded", timeout=25000)
                    await detail_page.wait_for_timeout(1600)
                    business.update(await self._extract_place_details(detail_page))
                except PlaywrightTimeoutError:
                    business["status"] = "timeout"
                finally:
                    await detail_page.close()
                detailed.append(business)

            await page.close()
            return session.engine, detailed

    async def enrich_businesses(
        self,
        businesses: list[dict[str, Any]],
        *,
        include_socials: bool,
        include_emails: bool,
        browser_engine: str | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        if not businesses:
            resolved_engine = self.browser_manager.resolve_engine(browser_engine)
            return resolved_engine, []

        async with self.browser_manager.session(browser_engine) as session:
            enriched = []
            for business in businesses:
                website = business.get("website")
                if not website:
                    enriched.append({**business, "emails": [], "social_links": {}, "content_excerpt": ""})
                    continue

                page = await session.new_page(viewport={"width": 1440, "height": 1024})
                try:
                    await page.goto(website, wait_until="domcontentloaded", timeout=25000)
                    await page.wait_for_timeout(1200)
                    text = await page.evaluate(
                        "() => document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 6000) ?? ''"
                    )
                    hrefs = await page.locator("a[href]").evaluate_all("(els) => els.map((el) => el.href)")
                    emails = sorted(set(EMAIL_PATTERN.findall(text))) if include_emails else []
                    socials = self._extract_social_links(hrefs) if include_socials else {}
                    enriched.append(
                        {
                            **business,
                            "emails": emails,
                            "social_links": socials,
                            "content_excerpt": text[:1200],
                        }
                    )
                except PlaywrightTimeoutError:
                    enriched.append(
                        {
                            **business,
                            "emails": [],
                            "social_links": {},
                            "content_excerpt": "",
                            "enrichment_status": "timeout",
                        }
                    )
                finally:
                    await page.close()
        return session.engine, enriched

    async def _scroll_results(self, page: Page, *, max_results: int) -> None:
        panel = page.locator('div[role="feed"]').first
        if await panel.count() == 0:
            return

        previous_count = 0
        stable_rounds = 0
        while stable_rounds < 3 and previous_count < max_results * 2:
            current_count = await page.locator('a[href*="/maps/place/"]').count()
            if current_count == previous_count:
                stable_rounds += 1
            else:
                stable_rounds = 0
            previous_count = current_count
            await panel.evaluate("(node) => node.scrollBy(0, node.scrollHeight)")
            await page.wait_for_timeout(1200)

    async def _collect_result_cards(self, page: Page, *, max_results: int) -> list[dict[str, Any]]:
        anchors = page.locator('a[href*="/maps/place/"]')
        count = await anchors.count()
        seen = set()
        results = []

        for index in range(count):
            anchor = anchors.nth(index)
            href = await anchor.get_attribute("href")
            if not href or href in seen:
                continue
            seen.add(href)
            label = await anchor.get_attribute("aria-label")
            results.append(
                {
                    "name": label or f"Business {len(results) + 1}",
                    "maps_url": href,
                }
            )
            if len(results) >= max_results:
                break
        return results

    async def _extract_place_details(self, page: Page) -> dict[str, Any]:
        return {
            "website": await self._attribute_from_selectors(
                page,
                selectors=['a[data-item-id="authority"]', 'a[aria-label^="Website"]'],
                attribute="href",
            ),
            "phone": await self._text_from_selectors(
                page,
                selectors=['button[data-item-id^="phone:tel"]', 'button[aria-label^="Phone"]'],
            ),
            "address": await self._text_from_selectors(
                page,
                selectors=['button[data-item-id="address"]', 'button[aria-label^="Address"]'],
            ),
            "location": await self._text_from_selectors(
                page,
                selectors=['button[data-item-id="address"]', 'button[aria-label^="Address"]'],
            ),
        }

    async def _text_from_selectors(self, page: Page, *, selectors: list[str]) -> str:
        for selector in selectors:
            locator = page.locator(selector).first
            if await locator.count():
                text = (await locator.text_content()) or ""
                cleaned = " ".join(text.split()).strip()
                if cleaned:
                    return cleaned
                aria = await locator.get_attribute("aria-label")
                if aria:
                    return aria
        return ""

    async def _attribute_from_selectors(self, page: Page, *, selectors: list[str], attribute: str) -> str:
        for selector in selectors:
            locator = page.locator(selector).first
            if await locator.count():
                value = await locator.get_attribute(attribute)
                if value:
                    return value
        return ""

    def _extract_social_links(self, links: list[str]) -> dict[str, str]:
        socials: dict[str, str] = {}
        for href in links:
            for key, domain in SOCIAL_DOMAINS.items():
                if domain in href and key not in socials:
                    socials[key] = href
        return socials
