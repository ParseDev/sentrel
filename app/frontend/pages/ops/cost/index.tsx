import { Head, router, Link } from "@inertiajs/react"
import { Zap, TrendingDown, Activity, Cpu } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PerModel {
  model_id: string
  cost: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

interface Props {
  days: number
  total_cost_usd: number
  total_runs: number
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  cache_savings_usd: number
  cache_read_tokens: number
  daily: { date: string; agent_id: number; cost: number }[]
  per_agent: { agent_id: number; agent_name: string | null; cost: number }[]
  per_job_type: { action: string; cost: number }[]
  per_model: PerModel[]
}

function fmtCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}¢`
  return `$${usd.toFixed(4)}`
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function modelLabel(id: string): string {
  return id.replace(/^claude-/, "").replace(/^gpt-/, "")
}

export default function OpsCostIndex({ days, total_cost_usd, total_runs, total_tokens, total_input_tokens, total_output_tokens, cache_savings_usd, cache_read_tokens, daily, per_agent, per_job_type, per_model }: Props) {
  function updateDays(v: string) {
    router.get("/ops/cost", { days: v }, { preserveState: true })
  }

  // Rollup daily across all agents for the chart
  const dailyTotals = new Map<string, number>()
  for (const d of daily) {
    dailyTotals.set(d.date, (dailyTotals.get(d.date) || 0) + d.cost)
  }
  const chartData = [...dailyTotals.entries()].sort(([a], [b]) => a.localeCompare(b))
  const maxCost = Math.max(...chartData.map(([, c]) => c), 0.0001)

  return (
    <AppLayout
      crumbs={[
        { label: "Control plane", href: "/" },
        { label: "Ops", href: "/ops/runs" },
        { label: "Cost" },
      ]}
      topBarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="h-8">
            <Link href="/ops/runs">Runs</Link>
          </Button>
          <Select onValueChange={updateDays} defaultValue={String(days)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Head title="Cost — Ops" />

      <PageHeader
        eyebrow="Observability"
        title="Cost"
        description="API spend, cache savings, and per-agent breakdown for your workspace."
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBig icon={Zap} label="Total spent" value={fmtCost(total_cost_usd)} sublabel={`over ${days} days`} />
        <StatBig
          icon={Cpu}
          label="Total tokens"
          value={fmtTokens(total_tokens)}
          sublabel={`${fmtTokens(total_input_tokens)} in · ${fmtTokens(total_output_tokens)} out`}
        />
        <StatBig icon={Activity} label="Runs" value={total_runs.toString()} sublabel={`${(total_cost_usd / Math.max(1, total_runs)).toFixed(4)}$ avg`} />
        <StatBig icon={TrendingDown} label="Cache savings" value={fmtCost(cache_savings_usd)} sublabel={`${(cache_read_tokens / 1_000_000).toFixed(2)}M cached reads`} tone="good" />
      </div>

      {/* Daily chart */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Daily spend</h2>
        {chartData.length === 0 ? (
          <div className="text-sm text-muted-foreground italic py-6 text-center">No activity in this period</div>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {chartData.map(([date, cost]) => {
              const height = Math.max(4, (cost / maxCost) * 100)
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 tabular-nums whitespace-nowrap">
                    {fmtCost(cost)}
                  </div>
                  <div
                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-colors"
                    style={{ height: `${height}%` }}
                    title={`${date}: ${fmtCost(cost)}`}
                  />
                  <div className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Per model — tokens + cost */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">By model</h2>
        {per_model.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">No data</div>
        ) : (
          <PerModelChart per_model={per_model} total_cost_usd={total_cost_usd} total_tokens={total_tokens} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Per agent */}
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium mb-3">By agent</h2>
          {per_agent.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No data</div>
          ) : (
            <div className="space-y-2">
              {per_agent.sort((a, b) => b.cost - a.cost).map((row) => {
                const pct = (row.cost / Math.max(0.0001, total_cost_usd)) * 100
                return (
                  <div key={row.agent_id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{row.agent_name || `Agent #${row.agent_id}`}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.cost)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Per job type */}
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium mb-3">By job type</h2>
          {per_job_type.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No data</div>
          ) : (
            <div className="space-y-2">
              {per_job_type.sort((a, b) => b.cost - a.cost).map((row) => {
                const pct = (row.cost / Math.max(0.0001, total_cost_usd)) * 100
                return (
                  <div key={row.action}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize">{row.action.replace(/_/g, " ")}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.cost)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function StatBig({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sublabel?: string
  tone?: "default" | "good"
}) {
  const toneClasses = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Icon className="size-3" />
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${toneClasses}`}>{value}</div>
      {sublabel && <div className="text-[11px] text-muted-foreground mt-1">{sublabel}</div>}
    </div>
  )
}

function PerModelChart({
  per_model,
  total_cost_usd,
  total_tokens,
}: {
  per_model: PerModel[]
  total_cost_usd: number
  total_tokens: number
}) {
  const sorted = [...per_model].sort((a, b) => b.cost - a.cost)
  const maxTokens = Math.max(...sorted.map((m) => m.total_tokens), 1)
  const maxCost = Math.max(...sorted.map((m) => m.cost), 0.0001)

  return (
    <div className="space-y-4">
      {/* Side-by-side histogram: tokens (blue) and cost (purple) per model */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sorted.length}, minmax(0, 1fr))` }}>
        {sorted.map((m) => {
          const tokenH = Math.max(4, (m.total_tokens / maxTokens) * 100)
          const costH = Math.max(4, (m.cost / maxCost) * 100)
          return (
            <div key={m.model_id} className="flex flex-col items-center gap-1.5">
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div
                  className="w-1/2 rounded-t bg-blue-500 hover:bg-blue-600 transition-colors"
                  style={{ height: `${tokenH}%` }}
                  title={`${fmtTokens(m.total_tokens)} tokens`}
                />
                <div
                  className="w-1/2 rounded-t bg-purple-500 hover:bg-purple-600 transition-colors"
                  style={{ height: `${costH}%` }}
                  title={fmtCost(m.cost)}
                />
              </div>
              <div className="font-mono text-[10px] text-muted-foreground truncate w-full text-center">
                {modelLabel(m.model_id)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend + per-row totals table */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-blue-500" /> Tokens
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-purple-500" /> Cost
        </span>
      </div>

      <div className="border-t pt-3 space-y-2">
        {sorted.map((m) => {
          const costPct = (m.cost / Math.max(0.0001, total_cost_usd)) * 100
          const tokenPct = (m.total_tokens / Math.max(1, total_tokens)) * 100
          return (
            <div key={m.model_id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-xs">
              <span className="font-mono truncate">{modelLabel(m.model_id)}</span>
              <span className="tabular-nums text-muted-foreground">
                {fmtTokens(m.total_tokens)} ({tokenPct.toFixed(1)}%)
              </span>
              <span className="tabular-nums text-muted-foreground">
                {fmtCost(m.cost)} ({costPct.toFixed(1)}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
