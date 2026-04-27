import { Link } from "@inertiajs/react"
import { ArrowUpRight, DollarSign } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { opsCostPath } from "@/routes"

export interface SpendSummary {
  days: number
  total_cost_usd: number
  total_tokens: number
  total_runs: number
  daily: { date: string; cost: number }[]
}

interface Props {
  spend: SpendSummary
}

function fmtCost(usd: number): string {
  if (usd <= 0) return "$0"
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}¢`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)
}

export function TokenUsagePopover({ spend }: Props) {
  const series = spend.daily
  const maxCost = Math.max(...series.map((d) => d.cost), 0.0001)

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Token usage"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <DollarSign className="size-3.5 text-muted-foreground" />
        <span className="tabular-nums">{fmtCost(spend.total_cost_usd)}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="size-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Token usage</h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {spend.days}d
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 px-4 pb-3">
          <Metric label="Cost" value={fmtCost(spend.total_cost_usd)} />
          <Metric label="Tokens" value={fmtNum(spend.total_tokens)} />
          <Metric label="Runs" value={fmtNum(spend.total_runs)} />
        </div>

        <div className="border-t px-4 py-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Daily spend
          </div>
          {series.length === 0 ? (
            <div className="py-4 text-center text-xs italic text-muted-foreground">
              No activity yet
            </div>
          ) : (
            <div className="flex h-16 items-end gap-0.5">
              {series.map((d) => {
                const height = Math.max(2, (d.cost / maxCost) * 100)
                return (
                  <div
                    key={d.date}
                    className="flex-1 rounded-sm bg-[var(--color-indigo)]/70 hover:bg-[var(--color-indigo)] transition-colors"
                    style={{ height: `${height}%` }}
                    title={`${d.date}: ${fmtCost(d.cost)}`}
                  />
                )
              })}
            </div>
          )}
        </div>

        <Link
          href={opsCostPath()}
          className="group flex items-center justify-between border-t px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-[var(--muted)]"
        >
          <span>See detailed breakdown</span>
          <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </PopoverContent>
    </Popover>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-base font-semibold tabular-nums">
        {value}
      </div>
    </div>
  )
}
