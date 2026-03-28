import asyncio
import json
from typing import Any

from groq import Groq

from app.core.config import Settings


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

        if response:
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                pass

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
        if response:
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                pass
        return {"action": "extract"}
