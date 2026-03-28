from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RunRead(BaseModel):
    id: str
    workflow_id: str
    status: str
    progress: float
    current_node_id: str | None = None
    current_node_label: str | None = None
    results: dict[str, Any] = Field(default_factory=dict)
    logs: list[dict[str, Any]] = Field(default_factory=list)
    error: str | None = None
    workflow_snapshot: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
