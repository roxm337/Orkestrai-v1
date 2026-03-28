import asyncio
import json
import re
from typing import Any

from groq import Groq

from app.core.config import Settings

JSON_BLOCK_PATTERN = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)


class GroqService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = Groq(api_key=settings.groq_api_key)

    async def generate(self, prompt: str, *, system_prompt: str | None = None) -> str:
        try:
            return await asyncio.to_thread(self._generate_sync, prompt, system_prompt)
        except Exception:  # noqa: BLE001
            return ""

    def _generate_sync(self, prompt: str, system_prompt: str | None = None) -> str:
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        completion = self.client.chat.completions.create(
            model=self.settings.groq_model,
            messages=messages,
            temperature=self.settings.groq_temperature,
        )
        content = completion.choices[0].message.content
        return content.strip() if isinstance(content, str) else ""

    async def analyze_business(self, business: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
        prompt = f"""
You are helping build a local business website.
Create a compact JSON object with keys:
- description
- branding_style
- website_sections
- hero_headline
- hero_subheadline
- services
- calls_to_action

Business data:
{json.dumps(business, indent=2)}

Analysis preferences:
{json.dumps(config, indent=2)}
""".strip()

        response = await self.generate(
            prompt,
            system_prompt="Respond with clean JSON only. Keep it concise and practical for a small-business website.",
        )

        parsed = self._parse_json(response)
        if isinstance(parsed, dict):
            return parsed

        description = business.get("content_excerpt") or business.get("name", "Local business")
        website_sections = ["Hero", "Services", "Why Choose Us", "Testimonials", "Contact"]
        return {
            "description": f"{business.get('name', 'This business')} serves {business.get('location', 'its local area')} with a clear, trustworthy offer.",
            "branding_style": {
                "tone": config.get("tone", "friendly"),
                "visual_direction": "clean, local, approachable",
            },
            "website_sections": website_sections,
            "hero_headline": business.get("name", "Local Business"),
            "hero_subheadline": description[:160] if isinstance(description, str) else "Professional local service.",
            "services": ["Consultation", "Core Service", "Ongoing Support"],
            "calls_to_action": ["Book a call", "Request a quote", "Visit the business"],
        }

    async def plan_website(self, business: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
        analysis = business.get("analysis", {})
        prompt = f"""
You are a senior product designer and frontend engineer.
Create a JSON-only website implementation blueprint for a local business lead.
The output must be practical for a file-based static website generator.

Return one JSON object with keys:
- site_name
- tagline
- audience
- palette: object with background, surface, text, muted, accent, accent_soft, border
- typography: object with heading_family, body_family
- navigation: string array
- pages: array of page objects
  Each page object must have:
  - slug
  - title
  - purpose
  - meta_description
  - sections: array of section objects
    Each section object must have:
    - kind
    - eyebrow
    - headline
    - body
    - bullets: string array
    - cta_label
- contact: object with phone, email, address, website, primary_cta
- implementation_notes: string array

Rules:
- Use the business name, offer, location, website copy, emails, socials, and analysis summary.
- Keep it realistic for a local business microsite.
- Create a usable visual palette and clear page structure.
- Prefer 3-4 pages max.
- Keep copy concise and conversion-oriented.

Business profile:
{json.dumps(business, indent=2)}

Website generation config:
{json.dumps(config, indent=2)}

Analysis summary:
{json.dumps(analysis, indent=2)}
""".strip()

        response = await self.generate(
            prompt,
            system_prompt="Reply with JSON only. No prose. Make the blueprint implementation-ready.",
        )

        parsed = self._parse_json(response)
        if isinstance(parsed, dict):
            return self._normalize_blueprint(parsed, business, config)

        return self._fallback_website_blueprint(business, config)

    async def decide_browser_action(self, goal: str, observation: dict[str, Any]) -> dict[str, Any]:
        prompt = f"""
Goal: {goal}
Observation:
{json.dumps(observation, indent=2)}

Pick one JSON action:
{{"action":"click","selector":"..."}}
{{"action":"type","selector":"...","text":"..."}}
{{"action":"extract"}}
{{"action":"done"}}
""".strip()
        response = await self.generate(prompt, system_prompt="Reply with JSON only.")
        parsed = self._parse_json(response)
        if isinstance(parsed, dict):
            return parsed
        return {"action": "extract"}

    def _parse_json(self, response: str) -> dict[str, Any] | list[Any] | None:
        if not response:
            return None

        candidates = [response.strip()]
        fenced = JSON_BLOCK_PATTERN.search(response)
        if fenced:
            candidates.insert(0, fenced.group(1).strip())

        for candidate in candidates:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                start = candidate.find("{")
                end = candidate.rfind("}")
                if start != -1 and end != -1 and end > start:
                    try:
                        return json.loads(candidate[start : end + 1])
                    except json.JSONDecodeError:
                        continue
        return None

    def _normalize_blueprint(self, blueprint: dict[str, Any], business: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
        fallback = self._fallback_website_blueprint(business, config)
        pages = blueprint.get("pages")
        normalized_pages = pages if isinstance(pages, list) and pages else fallback["pages"]

        return {
            "site_name": str(blueprint.get("site_name") or fallback["site_name"]),
            "tagline": str(blueprint.get("tagline") or fallback["tagline"]),
            "audience": str(blueprint.get("audience") or fallback["audience"]),
            "palette": {
                **fallback["palette"],
                **(blueprint.get("palette") if isinstance(blueprint.get("palette"), dict) else {}),
            },
            "typography": {
                **fallback["typography"],
                **(blueprint.get("typography") if isinstance(blueprint.get("typography"), dict) else {}),
            },
            "navigation": [str(item) for item in (blueprint.get("navigation") or fallback["navigation"])],
            "pages": [self._normalize_page(page, index, fallback["pages"]) for index, page in enumerate(normalized_pages)],
            "contact": {
                **fallback["contact"],
                **(blueprint.get("contact") if isinstance(blueprint.get("contact"), dict) else {}),
            },
            "implementation_notes": [
                str(item) for item in (blueprint.get("implementation_notes") or fallback["implementation_notes"])
            ],
        }

    def _normalize_page(self, page: Any, index: int, fallback_pages: list[dict[str, Any]]) -> dict[str, Any]:
        fallback = fallback_pages[min(index, len(fallback_pages) - 1)]
        if not isinstance(page, dict):
            return fallback

        sections = page.get("sections")
        normalized_sections = sections if isinstance(sections, list) and sections else fallback["sections"]

        return {
            "slug": str(page.get("slug") or fallback["slug"]),
            "title": str(page.get("title") or fallback["title"]),
            "purpose": str(page.get("purpose") or fallback["purpose"]),
            "meta_description": str(page.get("meta_description") or fallback["meta_description"]),
            "sections": [self._normalize_section(section, idx, fallback["sections"]) for idx, section in enumerate(normalized_sections)],
        }

    def _normalize_section(self, section: Any, index: int, fallback_sections: list[dict[str, Any]]) -> dict[str, Any]:
        fallback = fallback_sections[min(index, len(fallback_sections) - 1)]
        if not isinstance(section, dict):
            return fallback

        bullets = section.get("bullets")
        return {
            "kind": str(section.get("kind") or fallback["kind"]),
            "eyebrow": str(section.get("eyebrow") or fallback["eyebrow"]),
            "headline": str(section.get("headline") or fallback["headline"]),
            "body": str(section.get("body") or fallback["body"]),
            "bullets": [str(item) for item in bullets] if isinstance(bullets, list) and bullets else fallback["bullets"],
            "cta_label": str(section.get("cta_label") or fallback["cta_label"]),
        }

    def _fallback_website_blueprint(self, business: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
        name = business.get("name", "Generated Business")
        location = business.get("location") or business.get("address") or "the local area"
        excerpt = business.get("content_excerpt") or business.get("analysis", {}).get("description") or ""
        services = business.get("analysis", {}).get("services") or ["Consulting", "Delivery", "Support"]
        cta = (business.get("analysis", {}).get("calls_to_action") or ["Book a call"])[0]
        accent = "#7c3aed" if config.get("theme") == "midnight-signal" else "#2563eb"

        return {
            "site_name": name,
            "tagline": f"Trusted service in {location}",
            "audience": "Local customers ready to book or request a quote",
            "palette": {
                "background": "#f8fafc",
                "surface": "#ffffff",
                "text": "#0f172a",
                "muted": "#64748b",
                "accent": accent,
                "accent_soft": "#ede9fe" if accent == "#7c3aed" else "#dbeafe",
                "border": "#e2e8f0",
            },
            "typography": {
                "heading_family": "Sora",
                "body_family": "Inter",
            },
            "navigation": ["Home", "Services", "About", "Contact"],
            "pages": [
                {
                    "slug": "index",
                    "title": "Home",
                    "purpose": "Present the offer and drive inquiries.",
                    "meta_description": f"{name} helps customers in {location}.",
                    "sections": [
                        {
                            "kind": "hero",
                            "eyebrow": "Local business profile",
                            "headline": name,
                            "body": excerpt[:240] if excerpt else f"{name} serves customers in {location} with a clear, dependable offer.",
                            "bullets": services[:3],
                            "cta_label": cta,
                        },
                        {
                            "kind": "proof",
                            "eyebrow": "Why customers choose them",
                            "headline": f"Built for {location}",
                            "body": "Highlight trust, responsiveness, and the strongest local positioning signal from the research.",
                            "bullets": ["Fast response", "Clear offer", "Local credibility"],
                            "cta_label": "Request a quote",
                        },
                    ],
                },
                {
                    "slug": "services",
                    "title": "Services",
                    "purpose": "Turn research into service-focused sections.",
                    "meta_description": f"Explore services from {name}.",
                    "sections": [
                        {
                            "kind": "services",
                            "eyebrow": "Core offer",
                            "headline": "Services",
                            "body": "Organize the offer into readable cards with outcomes and next steps.",
                            "bullets": services[:4],
                            "cta_label": "Book a consultation",
                        }
                    ],
                },
                {
                    "slug": "contact",
                    "title": "Contact",
                    "purpose": "Capture leads and make contact details easy to scan.",
                    "meta_description": f"Contact {name}.",
                    "sections": [
                        {
                            "kind": "contact",
                            "eyebrow": "Get in touch",
                            "headline": "Start the conversation",
                            "body": "Keep the call to action direct and local.",
                            "bullets": [location, business.get("phone", "Add phone"), business.get("website", "Add website")],
                            "cta_label": cta,
                        }
                    ],
                },
            ],
            "contact": {
                "phone": business.get("phone", ""),
                "email": (business.get("emails") or [""])[0],
                "address": business.get("address", ""),
                "website": business.get("website", ""),
                "primary_cta": cta,
            },
            "implementation_notes": [
                "Keep the visual system light, clean, and conversion-oriented.",
                "Use shared tokens and reusable section styles.",
                "Write files so an agent can safely update content and layout later.",
            ],
        }
