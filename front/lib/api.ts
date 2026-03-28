import {
  fallbackNodeCatalog,
  fallbackSampleWorkflow,
  type GeneratedAsset,
  type NodeCatalogItem,
  type WorkflowPayload,
  type WorkflowRecord,
  type WorkflowRun
} from "@/types/workflow";

function resolveApiBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.SCRAPEFLOW_INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
}

async function fetchJson<T>(path: string, init?: RequestInit, fallback?: T): Promise<T> {
  const apiBaseUrl = resolveApiBaseUrl();
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      cache: init?.cache ?? "no-store"
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

export async function getWorkflows() {
  return fetchJson<WorkflowRecord[]>("/workflows", undefined, []);
}

export async function getWorkflow(id: string) {
  return fetchJson<WorkflowRecord | null>(`/workflows/${id}`, undefined, null);
}

export async function createWorkflow(payload: WorkflowPayload) {
  return fetchJson<WorkflowRecord>("/workflows", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateWorkflow(id: string, payload: WorkflowPayload) {
  return fetchJson<WorkflowRecord>(`/workflows/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function getRuns() {
  return fetchJson<WorkflowRun[]>("/runs", undefined, []);
}

export async function getRun(id: string) {
  return fetchJson<WorkflowRun | null>(`/runs/${id}`, undefined, null);
}

export async function getRunAssets(runId: string) {
  return fetchJson<GeneratedAsset[]>(`/runs/${runId}/assets`, undefined, []);
}

export async function createRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`/workflows/${workflowId}/runs`, {
    method: "POST"
  });
}

export async function getNodeCatalog() {
  const data = await fetchJson<{ items: NodeCatalogItem[] }>("/catalog/nodes", undefined, {
    items: fallbackNodeCatalog
  });
  return data.items;
}

export async function getSampleWorkflow() {
  return fetchJson<WorkflowPayload>("/catalog/sample-workflow", undefined, fallbackSampleWorkflow);
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

export function getWebSocketUrl(runId: string) {
  const origin = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/api$/, "");
  const wsOrigin = origin.replace(/^http/, "ws");
  return `${wsOrigin}/ws/runs/${runId}`;
}
