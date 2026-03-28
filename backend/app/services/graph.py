from collections import defaultdict, deque


def topological_sort(nodes: list[dict], edges: list[dict]) -> list[dict]:
    node_map = {node["id"]: node for node in nodes}
    incoming_count = {node["id"]: 0 for node in nodes}
    adjacency: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source not in node_map or target not in node_map:
            raise ValueError("Workflow edges must point to existing nodes.")
        adjacency[source].append(target)
        incoming_count[target] += 1

    queue = deque([node_id for node_id, count in incoming_count.items() if count == 0])
    ordered: list[dict] = []

    while queue:
        node_id = queue.popleft()
        ordered.append(node_map[node_id])
        for next_node in adjacency[node_id]:
            incoming_count[next_node] -= 1
            if incoming_count[next_node] == 0:
                queue.append(next_node)

    if len(ordered) != len(nodes):
        raise ValueError("Workflow contains a cycle. Remove circular connections and try again.")

    return ordered
