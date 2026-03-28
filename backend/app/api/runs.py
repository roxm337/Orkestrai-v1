from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status

from app.api.deps import get_event_bus, get_run_queue
from app.core.database import SessionLocal, get_db
from app.models.workflow import Workflow, WorkflowRun
from app.schemas.run import RunRead

router = APIRouter(tags=["runs"])


@router.get("/runs", response_model=list[RunRead])
def list_runs(db: Session = Depends(get_db)):
    runs = db.scalars(select(WorkflowRun).order_by(desc(WorkflowRun.created_at))).all()
    return runs


@router.get("/runs/{run_id}", response_model=RunRead)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run


@router.post("/workflows/{workflow_id}/runs", response_model=RunRead, status_code=status.HTTP_202_ACCEPTED)
async def create_run(
    workflow_id: str,
    db: Session = Depends(get_db),
    run_queue=Depends(get_run_queue),
):
    workflow = db.get(Workflow, workflow_id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    run = WorkflowRun(
        workflow_id=workflow.id,
        status="queued",
        workflow_snapshot=workflow.definition,
        results={},
        logs=[],
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    await run_queue.enqueue(run.id)
    return run


@router.websocket("/ws/runs/{run_id}")
async def run_events_socket(websocket: WebSocket, run_id: str):
    await websocket.accept()
    event_bus = websocket.app.state.event_bus
    queue = await event_bus.subscribe(run_id)

    with SessionLocal() as db:
        run = db.get(WorkflowRun, run_id)
        if run is None:
            await websocket.send_json({"type": "error", "message": "Run not found", "runId": run_id})
            await websocket.close(code=4404)
            await event_bus.unsubscribe(run_id, queue)
            return
        await websocket.send_json(
            {
                "type": "snapshot",
                "runId": run.id,
                "status": run.status,
                "progress": run.progress,
                "currentNodeId": run.current_node_id,
                "currentNodeLabel": run.current_node_label,
                "results": run.results,
                "logs": run.logs,
            }
        )

    try:
        while True:
            event = await queue.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    finally:
        await event_bus.unsubscribe(run_id, queue)
