import Link from "next/link";
import { ArrowRight, Bot, Command, PlayCircle, Sparkles, WandSparkles } from "lucide-react";

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
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr),360px]">
        <Card className="overflow-hidden border-[#8b5cf6]/16 bg-[linear-gradient(135deg,rgba(124,58,237,0.12),rgba(59,130,246,0.08)_35%,rgba(255,255,255,0.94)_100%)]">
          <CardHeader className="gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
              Lead OS
            </div>
            <CardTitle className="max-w-4xl text-4xl leading-tight md:text-5xl">
              Build cleaner lead workflows.
            </CardTitle>
            <CardDescription className="max-w-3xl text-[15px] leading-7">
              Build, run, and monitor in one place.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Workflows", value: workflows.length, hint: "Saved flows" },
                { label: "Active runs", value: runningCount, hint: "Live now" },
                { label: "Command", value: "Cmd + K", hint: "AI actions" }
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{item.value}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.hint}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/workflows/new?mode=blank">
                <Button variant="accent" size="lg">
                  Open blank canvas
                </Button>
              </Link>
              <Link href="/workflows/new">
                <Button variant="secondary" size="lg">
                  Load AI template
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">What makes it feel premium</CardTitle>
            <CardDescription>Clear, fast, focused.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { title: "Command palette", copy: "Create flows fast.", icon: Command },
              { title: "Local agents", copy: "Attach agent roles.", icon: Bot },
              { title: "Execution view", copy: "Track every run.", icon: PlayCircle }
            ].map((item) => (
              <div key={item.title} className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.copy}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-[#8b5cf6]">
                    <item.icon className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Saved workflows</CardTitle>
            <CardDescription>Open and edit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflows.length ? (
              workflows.map((workflow) => (
                <Link
                  key={workflow.id}
                  href={`/workflows/${workflow.id}`}
                  className="block rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{workflow.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500 line-clamp-2">{workflow.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                No workflows yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recent runs</CardTitle>
            <CardDescription>Latest activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.length ? (
              runs.slice(0, 6).map((run) => (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="block rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-[#8b5cf6]">
                        <WandSparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{run.current_node_label ?? "Queued workflow run"}</p>
                        <p className="mt-1 text-xs text-slate-500">{Math.round((run.progress ?? 0) * 100)}% complete</p>
                      </div>
                    </div>
                    <Badge tone={toneFor(run.status)}>{run.status}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                No runs yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
