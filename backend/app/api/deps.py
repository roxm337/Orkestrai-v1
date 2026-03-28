from fastapi import Request

from app.core.database import get_db


def get_event_bus(request: Request):
    return request.app.state.event_bus


def get_run_queue(request: Request):
    return request.app.state.run_queue


def get_executor(request: Request):
    return request.app.state.executor

