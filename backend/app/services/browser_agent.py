from typing import Any

from playwright.async_api import Page

from app.services.groq_service import GroqService


class BrowserAgent:
    """
    Lightweight observe-think-act loop for future autonomous browser tasks.
    The MVP keeps the first production flows deterministic and uses this class
    as the upgrade path for higher-variance tasks.
    """

    def __init__(self, groq_service: GroqService):
        self.groq_service = groq_service

    async def run(self, page: Page, goal: str, max_steps: int = 6) -> list[dict[str, Any]]:
        transcript: list[dict[str, Any]] = []
        for step in range(max_steps):
            observation = await page.evaluate(
                "() => ({ title: document.title, text: document.body?.innerText?.slice(0, 2000) ?? '' })"
            )
            decision = await self.groq_service.decide_browser_action(goal=goal, observation=observation)
            transcript.append({"step": step + 1, "observation": observation, "decision": decision})

            action = decision.get("action", "extract")
            if action == "done" or action == "extract":
                break
            if action == "click" and decision.get("selector"):
                await page.locator(decision["selector"]).first.click()
            elif action == "type" and decision.get("selector"):
                await page.locator(decision["selector"]).first.fill(decision.get("text", ""))
            else:
                break
        return transcript
