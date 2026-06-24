import { Head, Link } from "@inertiajs/react"
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"

interface Call {
  id: string
  at: string
  agent: string | null
  provider: string | null
  method: string | null
  path: string | null
  result: string
  upstream: number | null
  error: string | null
  error_kind: string | null
  latency_ms: number | null
}

interface Summary {
  provider: string | null
  calls: number
  errors: number
  error_rate: number
  p50_ms: number | null
}

interface Props {
  calls: Call[]
  summary: Summary[]
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function statusColor(c: Call) {
  if (c.result === "error") return "text-destructive"
  if (typeof c.upstream === "number" && c.upstream >= 400) return "text-amber-500"
  return "text-[var(--color-success)]"
}

export default function IntegrationActivity({ calls = [], summary = [] }: Props) {
  return (
    <AppLayout crumbs={[{ label: "Workspace", href: "/" }, { label: "Tools" }, { label: "Integrations", href: "/integrations" }, { label: "Activity" }]}>
      <Head title="Integration activity" />
      <PageHeader eyebrow="Tools" title="Integration activity" description="Every connected-app API call your agents make — latency, status, and errors." />

      <Link href="/integrations" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to integrations
      </Link>

      {/* Per-provider summary */}
      {summary.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summary.map((s) => (
            <div key={s.provider ?? "?"} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize text-foreground">{s.provider ?? "unknown"}</span>
                {s.errors > 0 ? (
                  <span className="flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle className="size-3" />{s.error_rate}%</span>
                ) : (
                  <CheckCircle2 className="size-3.5 text-[var(--color-success)]" />
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-3 text-xs text-muted-foreground">
                <span><span className="font-mono text-foreground">{s.calls}</span> calls</span>
                {s.p50_ms != null && <span><span className="font-mono text-foreground">{s.p50_ms}</span>ms p50</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent calls */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Agent</th>
              <th className="px-3 py-2 font-medium">Call</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Latency</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No connected-app calls yet. They'll show here once an agent uses an integration.</td></tr>
            )}
            {calls.map((c) => (
              <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{timeAgo(c.at)}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.agent ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="font-mono">
                    <span className="font-semibold capitalize text-foreground">{c.provider}</span>
                    <span className="text-muted-foreground"> {c.method} {c.path}</span>
                  </span>
                  {c.error && <div className="mt-0.5 text-[11px] text-destructive">{c.error_kind ? `${c.error_kind}: ` : ""}{c.error}</div>}
                </td>
                <td className={`whitespace-nowrap px-3 py-2 font-mono ${statusColor(c)}`}>
                  {c.result === "error" ? (c.error_kind ?? "error") : (c.upstream ?? "ok")}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-muted-foreground">{c.latency_ms != null ? `${c.latency_ms}ms` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}
