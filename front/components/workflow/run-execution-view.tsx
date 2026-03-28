"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getRun, getWebSocketUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WorkflowRun } from "@/types/workflow";

type Props = {
  initialRun: WorkflowRun;
};

function statusTone(status: string) {
  if (status === "completed" || status === "failed" || status === "running" || status === "queued") {
    return status;
  }
  return "default";
}

export function RunExecutionView({ initialRun }: Props) {
  const [run, setRun] = useState(initialRun);
  const [events, setEvents] = useState(initialRun.logs ?? []);

  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const latest = await getRun(initialRun.id);
        if (active && latest) {
          setRun(latest);
          setEvents(latest.logs ?? []);
        }
      } catch {
        // Keep the last known state on transient polling failures.
      }
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
  const generatedSites = Object.values(run.results ?? {})
    .flatMap((result) => ((result as { sites?: Array<Record<string, unknown>> }).sites ?? []))
    .filter(Boolean) as Array<Record<string, unknown>>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>Execution status</CardTitle>
            <Badge tone={statusTone(run.status)}>{run.status}</Badge>
          </div>
          <CardDescription>Track the workflow with a clean step-by-step execution timeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Progress</span>
              <span>{Math.round((run.progress ?? 0) * 100)}%</span>
            </div>
            <Progress value={(run.progress ?? 0) * 100} />
          </div>

          <div className="space-y-3">
            {nodes.map((node) => {
              const isActive = node.id === run.current_node_id;
              const nodeResult = run.results?.[node.id] as { count?: number } | undefined;
              return (
                <div
                  key={node.id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    isActive ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{node.data.label}</p>
                      <p className="text-sm text-slate-500">{node.data.description}</p>
                    </div>
                    {nodeResult?.count ? <Badge>{nodeResult.count} items</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Live logs</CardTitle>
            <CardDescription>Event messages stay compact and easy to scan while the worker runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] space-y-3 overflow-auto pr-2">
              {events.length ? (
                events.map((event, index) => (
                  <div key={`${event.timestamp ?? "event"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{event.message}</p>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{event.type}</span>
                    </div>
                    {event.nodeLabel ? <p className="mt-1 text-xs text-slate-500">{event.nodeLabel}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Waiting for the worker to publish events.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated assets</CardTitle>
            <CardDescription>Preview outputs and jump back to the workflow without losing context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {generatedSites.length ? (
              generatedSites.map((site, index) => (
                <div
                  key={`${String(site.slug)}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-slate-950">{String(site.businessName ?? "Generated site")}</p>
                    <p className="mt-1 text-sm text-slate-500">{String(site.path ?? "")}</p>
                  </div>
                  <a
                    href={`http://localhost:8000/storage/${run.id}/${String(site.slug)}/index.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    View live
                  </a>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Generated site paths will appear here once the website node finishes.</p>
            )}
            <Link className="inline-flex text-sm font-medium text-sky-700" href={`/workflows/${run.workflow_id}`}>
              Return to workflow
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
