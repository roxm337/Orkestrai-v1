import asyncio
import contextlib
import json
from collections import defaultdict

from redis.asyncio import Redis


class EventBus:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis: Redis | None = None
        self.local_subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self.listener_task: asyncio.Task | None = None

    async def connect(self) -> None:
        try:
            self.redis = Redis.from_url(self.redis_url, decode_responses=True)
            await self.redis.ping()
            self.listener_task = asyncio.create_task(self._listen())
        except Exception:  # noqa: BLE001
            self.redis = None

    async def close(self) -> None:
        if self.listener_task:
            self.listener_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.listener_task
        if self.redis:
            await self.redis.close()

    async def publish(self, run_id: str, event: dict) -> None:
        if self.redis is None:
            await self._broadcast_local(run_id, event)
            return
        await self.redis.publish(self._channel(run_id), json.dumps(event))

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self.local_subscribers[run_id].add(queue)
        return queue

    async def unsubscribe(self, run_id: str, queue: asyncio.Queue) -> None:
        subscribers = self.local_subscribers.get(run_id)
        if not subscribers:
            return
        subscribers.discard(queue)
        if not subscribers:
            self.local_subscribers.pop(run_id, None)

    async def _listen(self) -> None:
        if self.redis is None:
            return
        pubsub = self.redis.pubsub()
        await pubsub.psubscribe("scrapeflow:runs:*")
        try:
            async for message in pubsub.listen():
                if message["type"] != "pmessage":
                    continue
                channel = str(message["channel"])
                run_id = channel.rsplit(":", maxsplit=1)[-1]
                payload = json.loads(message["data"])
                await self._broadcast_local(run_id, payload)
        finally:
            await pubsub.close()

    async def _broadcast_local(self, run_id: str, event: dict) -> None:
        for queue in list(self.local_subscribers.get(run_id, set())):
            await queue.put(event)

    def _channel(self, run_id: str) -> str:
        return f"scrapeflow:runs:{run_id}"


class RunQueue:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis: Redis | None = None
        self.local_queue: asyncio.Queue[str] = asyncio.Queue()
        self.key = "scrapeflow:workflow-runs"

    async def connect(self) -> None:
        try:
            self.redis = Redis.from_url(self.redis_url, decode_responses=True)
            await self.redis.ping()
        except Exception:  # noqa: BLE001
            self.redis = None

    async def close(self) -> None:
        if self.redis:
            await self.redis.close()

    async def enqueue(self, run_id: str) -> None:
        if self.redis is not None:
            await self.redis.lpush(self.key, run_id)
            return
        await self.local_queue.put(run_id)

    async def dequeue(self) -> str | None:
        if self.redis is not None:
            item = await self.redis.brpop(self.key, timeout=0)
            if item is None:
                return None
            _, run_id = item
            return str(run_id)
        return await self.local_queue.get()
