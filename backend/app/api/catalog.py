from fastapi import APIRouter

from app.services.node_catalog import SAMPLE_WORKFLOW, get_node_catalog

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/nodes")
def list_node_catalog():
    return {"items": get_node_catalog()}


@router.get("/sample-workflow")
def get_sample_workflow():
    return SAMPLE_WORKFLOW
