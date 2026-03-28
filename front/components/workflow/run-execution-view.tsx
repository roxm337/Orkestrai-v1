"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Sparkles } from "lucide-react";

import { getApiBaseUrl, getRun, getRunAssets, getWebSocketUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GeneratedAsset, WorkflowRun } from "@/types/workflow";

type Props = {
  initialRun: WorkflowRun;
};

function statusTone(status: string) {
  if (status === "completed" || status === "failed" || status === "running" || status === "queued") {
    return status;
  }

  return "default";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGeneratedAsset(value: unknown): value is GeneratedAsset {
  return isRecord(value) && typeof value.slug === "string" && typeof value.path === "string";
}

function extractGeneratedAssets(results: Record<string, unknown> | undefined) {
  if (!results) {
    return [] as GeneratedAsset[];
  }

  return Object.values(results).flatMap((result) => {
    if (!isRecord(result)) {
      return [];
    }

    const candidates: unknown[] = [];
    if (Array.isArray(result.sites)) {
      candidates.push(...result.sites);
    }
    if (Array.isArray(result.generated_sites)) {
      candidates.push(...result.generated_sites);
    }
    if (isGeneratedAsset(result)) {
      candidates.push(result);
    }

    return candidates.filter(isGeneratedAsset);
  });
}

function mergeGeneratedAssets(...collections: GeneratedAsset[][]) {
  const merged = new Map<string, GeneratedAsset>();

  for (const collection of collections) {
    for (const asset of collection) {
      const key = `${asset.slug}:${asset.path}`;
      const current = merged.get(key);
      merged.set(key, {
        ...current,
        ...asset,
        files: asset.files?.length ? asset.files : current?.files ?? [],
        blueprint: asset.blueprint ?? current?.blueprint,
        architecture: asset.architecture ?? current?.architecture
      });
    }
  }

  return Array.from(merged.values());
}

function buildAssetUrl(runId: string, asset: GeneratedAsset) {
  const origin = getApiBaseUrl().replace(/\/api$/, "");
  const entrypoint = asset.entrypoint ?? "index.html";
  return `${origin}/storage/${runId}/${asset.slug}/${entrypoint}`;
}

export function RunExecutionView({ initialRun }: Props) {
  const [run, setRun] = useState(initialRun);
  const [events, setEvents] = useState(initialRun.logs ?? []);
  const [fileAssets, setFileAssets] = useState<GeneratedAsset[]>([]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const [latest, assets] = await Promise.all([getRun(initialRun.id), getRunAssets(initialRun.id)]);
        if (active && latest) {
          setRun(latest);
          setEvents(latest.logs ?? []);
        }
        if (active) {
          setFileAssets(assets);
        }
      } catch {
        // Keep the last known state on transient polling failures.
      }
    }

    void refresh();
    const interval = setInterval(async () => {
      await refresh();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [initialRun.id]);

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl(initialRun.id));
    socket.onmessage = (message) => {
      const payload = JSON.parse(message.data);
      if (payload.type === "snapshot") {
        setRun((current) => ({
          ...current,
          status: payload.status ?? current.status,
          progress: payload.progress ?? current.progress,
          current_node_id: payload.currentNodeId ?? current.current_node_id,
          current_node_label: payload.currentNodeLabel ?? current.current_node_label,
          results: payload.results ?? current.results,
          logs: payload.logs ?? current.logs
        }));
        setEvents(payload.logs ?? []);
        return;
      }

      setEvents((current) => [...current, payload]);
      setRun((current) => ({
        ...current,
        status: payload.type === "completed" ? "completed" : payload.type === "failed" ? "failed" : current.status,
        progress: payload.progress ?? current.progress,
        current_node_id: payload.nodeId ?? current.current_node_id,
        current_node_label: payload.nodeLabel ?? current.current_node_label,
        logs: [...current.logs, payload]
      }));
    };

    return () => {
      socket.close();
    };
  }, [initialRun.id]);

  const nodes = useMemo(() => run.workflow_snapshot?.nodes ?? [], [run.workflow_snapshot]);
  const workflowHasWebsiteGenerator = useMemo(
    () => nodes.some((node) => node.data?.type === "website_generator"),
    [nodes]
  );
  const generatedSites = useMemo(
    () => mergeGeneratedAssets(extractGeneratedAssets(run.results), fileAssets),
    [fileAssets, run.results]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.12fr,0.88fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">Execution status</CardTitle>
              <CardDescription>Live run state.</CardDescription>
            </div>
            <Badge tone={statusTone(run.status)}>{run.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Workflow progress</span>
              <span>{Math.round((run.progress ?? 0) * 100)}%</span>
            </div>
            <Progress value={(run.progress ?? 0) * 100} className="mt-3" />
          </div>

          <div className="space-y-3">
            {nodes.map((node) => {
              const isActive = node.id === run.current_node_id;
              const nodeResult = run.results?.[node.id] as { count?: number } | undefined;
              return (
                <div
                  key={node.id}
                  className={`rounded-[24px] border px-4 py-4 transition ${
                    isActive ? "border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.06]" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{node.data.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{node.data.description}</p>
                    </div>
                    {nodeResult?.count ? <Badge>{nodeResult.count} items</Badge> : null}
                  </div>
                  {isActive ? (
                    <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#c4b5fd]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Running now
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Live logs</CardTitle>
            <CardDescription>Recent events.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[430px] space-y-3 overflow-auto pr-2">
              {events.length ? (
                [...events].reverse().map((event, index) => (
                  <div key={`${event.timestamp ?? "event"}-${index}`} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-950">{event.message}</p>
                        {event.nodeLabel ? <p className="mt-1 text-xs text-slate-500">{event.nodeLabel}</p> : null}
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{event.type}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No events yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Generated assets</CardTitle>
            <CardDescription>Outputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {generatedSites.length ? (
              generatedSites.map((site, index) => (
                <div
                  key={`${String(site.slug)}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{site.businessName || "Generated site"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {site.blueprint?.pages?.length ? `${site.blueprint.pages.length} pages` : `${site.files.length} files`}
                      {site.theme ? ` • ${site.theme}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{site.path}</p>
                  </div>
                  <a
                    href={buildAssetUrl(run.id, site)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    View live
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                {!workflowHasWebsiteGenerator
                  ? "This run stops before website generation. Add a Create website node, save, and run again."
                  : run.status === "completed"
                    ? "No generated files were attached to this run."
                    : "Outputs will appear here once the website bundle is generated."}
              </div>
            )}

            <Link className="inline-flex items-center gap-2 text-sm font-medium text-[#7c3aed]" href={`/workflows/${run.workflow_id}`}>
              <Bot className="h-4 w-4" />
              Return to workflow
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
