from copy import deepcopy
from typing import Any

from app.services.node_catalog import get_node_catalog, get_node_template


def normalize_workflow_definition(definition: dict[str, Any] | None) -> dict[str, Any]:
    normalized = deepcopy(definition or {})
    normalized["nodes"] = _normalize_nodes(normalized.get("nodes", []))
    normalized["edges"] = _normalize_edges(normalized.get("edges", []), normalized["nodes"])
    normalized["viewport"] = _normalize_viewport(normalized.get("viewport"))
    _append_website_generator_if_needed(normalized)
    return normalized


def _normalize_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    catalog_map = {item["type"]: item for item in get_node_catalog()}
    normalized_nodes: list[dict[str, Any]] = []

    for index, node in enumerate(nodes):
        node_data = deepcopy(node.get("data", {}))
        node_type = node_data.get("type")
        template = catalog_map.get(node_type, {})
        normalized_nodes.append(
            {
                "id": node.get("id") or f"node-{index + 1}",
                "type": node.get("type", "workflowNode"),
                "position": {
                    "x": float(node.get("position", {}).get("x", 80 + index * 300)),
                    "y": float(node.get("position", {}).get("y", 180)),
                },
                "data": {
                    "type": node_type or template.get("type", "custom"),
                    "label": node_data.get("label") or template.get("label", "Untitled node"),
                    "description": node_data.get("description", template.get("description", "")),
                    "category": node_data.get("category") or template.get("category"),
                    "runtime": node_data.get("runtime") or template.get("runtime"),
                    "accent": node_data.get("accent") or template.get("accent"),
                    "inputs": list(node_data.get("inputs") or template.get("inputs") or []),
                    "outputs": list(node_data.get("outputs") or template.get("outputs") or []),
                    "config": {
                        **deepcopy(template.get("defaultConfig", {})),
                        **deepcopy(node_data.get("config", {})),
                    },
                },
            }
        )

    return normalized_nodes


def _normalize_edges(edges: list[dict[str, Any]], nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    node_ids = {node["id"] for node in nodes}
    normalized_edges: list[dict[str, Any]] = []
    seen_pairs: set[tuple[str, str]] = set()

    for index, edge in enumerate(edges):
        source = edge.get("source")
        target = edge.get("target")
        if source not in node_ids or target not in node_ids:
            continue
        pair = (source, target)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        normalized_edges.append(
            {
                "id": edge.get("id") or f"edge-{index + 1}",
                "source": source,
                "target": target,
            }
        )

    return normalized_edges


def _normalize_viewport(viewport: dict[str, Any] | None) -> dict[str, Any]:
    viewport = viewport or {}
    return {
        "x": float(viewport.get("x", 0)),
        "y": float(viewport.get("y", 0)),
        "zoom": float(viewport.get("zoom", 1)),
    }


def _append_website_generator_if_needed(definition: dict[str, Any]) -> None:
    nodes = definition["nodes"]
    edges = definition["edges"]
    node_types = {node["data"]["type"] for node in nodes}

    if "website_generator" in node_types or "analysis" not in node_types:
        return

    outgoing_sources = {edge["source"] for edge in edges}
    source_node = next(
        (
            node
            for node in reversed(nodes)
            if node["data"]["type"] == "analysis" and node["id"] not in outgoing_sources
        ),
        None,
    )

    if source_node is None:
        source_node = next((node for node in reversed(nodes) if node["data"]["type"] == "analysis"), None)

    if source_node is None:
        return

    template = get_node_template("website_generator")
    node_id = _unique_id({node["id"] for node in nodes}, "website")
    edge_id = _unique_id({edge["id"] for edge in edges}, "edge")

    nodes.append(
        {
            "id": node_id,
            "type": "workflowNode",
            "position": {
                "x": float(source_node["position"]["x"]) + 320,
                "y": float(source_node["position"]["y"]),
            },
            "data": {
                "type": template["type"],
                "label": template["label"],
                "description": template["description"],
                "category": template.get("category"),
                "runtime": template.get("runtime"),
                "accent": template.get("accent"),
                "inputs": list(template.get("inputs", [])),
                "outputs": list(template.get("outputs", [])),
                "config": deepcopy(template.get("defaultConfig", {})),
            },
        }
    )
    edges.append(
        {
            "id": edge_id,
            "source": source_node["id"],
            "target": node_id,
        }
    )


def _unique_id(existing: set[str], prefix: str) -> str:
    index = 1
    candidate = f"{prefix}-{index}"
    while candidate in existing:
        index += 1
        candidate = f"{prefix}-{index}"
    return candidate
