from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class WorkflowPosition(BaseModel):
    x: float = 0
    y: float = 0


class WorkflowNodeData(BaseModel):
    type: str
    label: str
    description: str = ""
    category: str | None = None
    runtime: str | None = None
    accent: str | None = None
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)


class WorkflowNode(BaseModel):
    id: str
    type: str = "workflowNode"
    position: WorkflowPosition = Field(default_factory=WorkflowPosition)
    data: WorkflowNodeData


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str


class WorkflowDefinition(BaseModel):
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)
    viewport: dict[str, Any] = Field(default_factory=lambda: {"x": 0, "y": 0, "zoom": 1})


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    definition: WorkflowDefinition


class WorkflowUpdate(WorkflowCreate):
    pass


class WorkflowSummary(BaseModel):
    id: str
    name: str
    description: str
    definition: WorkflowDefinition
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowRead(WorkflowSummary):
    pass
