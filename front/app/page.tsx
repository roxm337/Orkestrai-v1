import Link from "next/link";
import { ArrowRight, Clock3, Layers3, PlayCircle, Sparkles } from "lucide-react";

import { getRuns, getWorkflows } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function toneFor(status: string) {
  if (status === "completed" || status === "failed" || status === "running" || status === "queued") {
    return status;
  }
  return "default";
}

export default async function DashboardPage() {
  const [workflows, runs] = await Promise.all([getWorkflows(), getRuns()]);
  const runningCount = runs.filter((run) => run.status === "running" || run.status === "queued").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),360px]">
        <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(248,250,252,0.94))]">
          <CardHeader className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              Workflow builder
            </div>
            <CardTitle className="max-w-4xl text-4xl leading-tight md:text-5xl">
              Minimal workflow ops for scraping, enrichment, analysis, and site generation.
            </CardTitle>
            <CardDescription className="max-w-3xl text-[15px] leading-7">
              Build a clean automation graph, run it locally, and monitor each step without clutter. The interface is
              optimized for fast access, low cognitive load, and operator-style control.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Workflows</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{workflows.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Active runs</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{runningCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Latest engine</p>
                <p className="mt-2 text-sm font-semibold tracking-[-0.01em] text-slate-950">Playwright + Lightpanda</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/workflows/new?mode=blank">
                <Button variant="accent" size="lg">
                  Start from scratch
                </Button>
              </Link>
              <Link href="/workflows/new">
                <Button variant="secondary" size="lg">
                  Use sample flow
                </Button>
              </Link>
              <a href="#recent-runs">
                <Button variant="ghost" size="lg">
                  View recent runs
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 text-white">
          <CardHeader>
            <CardTitle className="text-white">Operator model</CardTitle>
            <CardDescription className="text-slate-300">
              The product flow is intentionally simple and direct, like a mature internal tool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Build with compact human-friendly nodes.",
              "Inspect node settings without leaving the canvas.",
              "Run workflows and stream status in real time.",
              "Keep the interface quiet and fast to scan."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Visual builder",
            value: "React Flow",
            copy: "Deterministic canvas for fast graph authoring.",
            icon: Layers3
          },
          {
            title: "Execution",
            value: `${runs.length} runs`,
            copy: "Status, logs, and active-node tracking in one place.",
            icon: PlayCircle
          },
          {
            title: "Latency",
            value: "Live",
            copy: "Fast access to the latest run state with websocket updates.",
            icon: Clock3
          }
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="mt-0 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{item.title}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.copy}</p>
              </div>
              <span className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <item.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>Clean access to saved graphs and quick edit entry points.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflows.length ? (
              workflows.map((workflow) => (
                <div key={workflow.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4">
                  <div>
                    <p className="font-medium text-slate-950">{workflow.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{workflow.description}</p>
                  </div>
                  <Link href={`/workflows/${workflow.id}`}>
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                No workflows saved yet. Start with the sample builder or open a blank canvas from scratch.
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="recent-runs">
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>Fast, table-like access to run health and current execution state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {runs.length ? (
              runs.slice(0, 6).map((run) => (
                <div key={run.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-4 w-4 text-sky-600" />
                      <p className="font-medium text-slate-950">{run.current_node_label ?? "Queued workflow run"}</p>
                    </div>
                    <Badge tone={toneFor(run.status)}>{run.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-500">
                    <span>{Math.round((run.progress ?? 0) * 100)}% complete</span>
                    <Link className="inline-flex items-center gap-1 font-medium text-sky-700" href={`/runs/${run.id}`}>
                      View run
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                No runs yet. Save a workflow and hit Run to queue your first local execution.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
