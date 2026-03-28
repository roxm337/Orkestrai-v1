from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GeneratedAssetRead(BaseModel):
    businessName: str
    slug: str
    path: str
    files: list[str] = Field(default_factory=list)
    entrypoint: str = "index.html"
    theme: str | None = None
    architecture: dict[str, list[str]] | list[str] = Field(default_factory=dict)
    blueprint: dict[str, Any] = Field(default_factory=dict)


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
