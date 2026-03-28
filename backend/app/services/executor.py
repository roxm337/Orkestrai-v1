import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import sessionmaker

from app.services.groq_service import GroqService
from app.models.workflow import WorkflowRun
from app.services.graph import topological_sort
from app.services.playwright_service import PlaywrightService
from app.services.website_generator import WebsiteGenerator


class WorkflowExecutor:
    def __init__(
        self,
        session_factory: sessionmaker,
        event_bus,
        playwright_service: PlaywrightService,
        groq_service: GroqService,
        website_generator: WebsiteGenerator,
    ):
        self.session_factory = session_factory
        self.event_bus = event_bus
        self.playwright_service = playwright_service
        self.groq_service = groq_service
        self.website_generator = website_generator

    async def execute_run(self, run_id: str) -> None:
        definition = {}
        with self.session_factory() as db:
            run = db.get(WorkflowRun, run_id)
            if run is None:
                return
            definition = deepcopy(run.workflow_snapshot or {})
            run.status = "running"
            run.progress = 0.0
            run.started_at = datetime.now(timezone.utc)
            run.error = None
            db.add(run)
            db.commit()

        await self._publish(run_id, "status", "Workflow queued task has started.", progress=0.02)

        try:
            ordered_nodes = topological_sort(definition.get("nodes", []), definition.get("edges", []))
            payload: dict[str, Any] = {"businesses": [], "generated_sites": []}

            for index, node in enumerate(ordered_nodes, start=1):
                node_id = node["id"]
                node_data = node["data"]
                label = node_data["label"]
                progress = index / max(len(ordered_nodes), 1)

                await self._set_current_node(run_id, node_id=node_id, node_label=label, progress=max(progress - 0.08, 0.05))
                await self._publish(run_id, "node_started", f"Starting {label}.", node_id=node_id, node_label=label, progress=progress)

                output = await self._execute_node(node_data["type"], node_data.get("config", {}), payload, run_id)
                payload = self._merge_payload(payload, node_data["type"], output)
                await self._store_node_result(run_id, node_id=node_id, result=output, progress=progress)
                await self._publish(
                    run_id,
                    "node_completed",
                    f"Completed {label}.",
                    node_id=node_id,
                    node_label=label,
                    progress=progress,
                )

            with self.session_factory() as db:
                run = db.get(WorkflowRun, run_id)
                if run is None:
                    return
                run.status = "completed"
                run.progress = 1.0
                run.current_node_id = None
                run.current_node_label = None
                run.finished_at = datetime.now(timezone.utc)
                db.add(run)
                db.commit()

            await self._publish(run_id, "completed", "Workflow finished successfully.", progress=1.0)
        except Exception as exc:  # noqa: BLE001
            with self.session_factory() as db:
                run = db.get(WorkflowRun, run_id)
                if run is not None:
                    run.status = "failed"
                    run.error = str(exc)
                    run.finished_at = datetime.now(timezone.utc)
                    db.add(run)
                    db.commit()

            await self._publish(run_id, "failed", str(exc), progress=1.0)

    async def _execute_node(
        self,
        node_type: str,
        config: dict[str, Any],
        payload: dict[str, Any],
        run_id: str,
    ) -> dict[str, Any]:
        if node_type == "scraper":
            engine, businesses = await self.playwright_service.scrape_google_maps(
                keyword=config.get("keyword", "coffee shop"),
                location=config.get("location", "Austin, Texas"),
                max_results=int(config.get("maxResults", 10)),
                browser_engine=config.get("browserEngine"),
            )
            return {"businesses": businesses, "count": len(businesses), "browser_engine": engine}

        if node_type == "enrichment":
            engine, businesses = await self.playwright_service.enrich_businesses(
                payload.get("businesses", []),
                include_socials=bool(config.get("includeSocials", True)),
                include_emails=bool(config.get("includeEmails", True)),
                browser_engine=config.get("browserEngine"),
            )
            return {"businesses": businesses, "count": len(businesses), "browser_engine": engine}

        if node_type == "analysis":
            analyzed = []
            for business in payload.get("businesses", []):
                summary = await self.groq_service.analyze_business(business, config=config)
                analyzed.append({**business, "analysis": summary})
            return {"businesses": analyzed, "count": len(analyzed)}

        if node_type == "website_generator":
            sites = []
            for business in payload.get("businesses", []):
                site = await self.website_generator.generate_site(
                    run_id=run_id,
                    business=business,
                    config=config,
                )
                sites.append(site)
            return {"sites": sites, "count": len(sites)}

        raise ValueError(f"Unsupported node type: {node_type}")

    def _merge_payload(self, payload: dict[str, Any], node_type: str, output: dict[str, Any]) -> dict[str, Any]:
        next_payload = deepcopy(payload)
        if node_type in {"scraper", "enrichment", "analysis"}:
            next_payload["businesses"] = output.get("businesses", [])
        if node_type == "website_generator":
            next_payload["generated_sites"] = output.get("sites", [])
        return next_payload

    async def _set_current_node(self, run_id: str, node_id: str, node_label: str, progress: float) -> None:
        with self.session_factory() as db:
            run = db.get(WorkflowRun, run_id)
            if run is None:
                return
            run.current_node_id = node_id
            run.current_node_label = node_label
            run.progress = progress
            db.add(run)
            db.commit()

    async def _store_node_result(self, run_id: str, node_id: str, result: dict[str, Any], progress: float) -> None:
        with self.session_factory() as db:
            run = db.get(WorkflowRun, run_id)
            if run is None:
                return
            results = dict(run.results or {})
            results[node_id] = result
            run.results = results
            run.progress = progress
            db.add(run)
            db.commit()

    async def _publish(
        self,
        run_id: str,
        event_type: str,
        message: str,
        *,
        node_id: str | None = None,
        node_label: str | None = None,
        progress: float | None = None,
    ) -> None:
        event = {
            "type": event_type,
            "runId": run_id,
            "message": message,
            "nodeId": node_id,
            "nodeLabel": node_label,
            "progress": progress,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        with self.session_factory() as db:
            run = db.get(WorkflowRun, run_id)
            if run is not None:
                logs = list(run.logs or [])
                logs.append(event)
                run.logs = logs[-400:]
                if progress is not None:
                    run.progress = progress
                db.add(run)
                db.commit()

        await self.event_bus.publish(run_id, event)


async def run_worker(queue, executor: WorkflowExecutor) -> None:
    while True:
        run_id = await queue.dequeue()
        if run_id is None:
            await asyncio.sleep(1)
            continue
        await executor.execute_run(run_id)
