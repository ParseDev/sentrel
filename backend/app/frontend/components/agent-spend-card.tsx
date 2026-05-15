import { useState } from "react"
import { DollarSign, TrendingUp } from "lucide-react"

interface SpendSummary {
  runs: number
  input_tokens: number
  output_tokens: number
  cache_read: number
  cache_written: number
  cost_usd: number
  top_models: Array<{ model_id: string; runs: number; cost_usd: number }>
}

interface Props {
  spend: {
    today: SpendSummary
    seven_day: SpendSummary
    thirty_day: SpendSummary
  }
}

type Range = "today" | "seven_day" | "thirty_day"

const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  seven_day: "7 days",
  thirty_day: "30 days",
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)
const fmtCost = (n: number) =>
  n >= 1
    ? `$${n.toFixed(2)}`
    : n >= 0.01
      ? `$${n.toFixed(3)}`
      : n > 0
        ? `$${n.toFixed(4)}`
        : "$0"

export function AgentSpendCard({ spend }: Props) {
  const [range, setRange] = useState<Range>("seven_day")
  const s = spend[range]
  const totalTokens = s.input_tokens + s.output_tokens

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="text-muted-foreground size-4" />
          <h3 className="text-sm font-semibold">Spend</h3>
        </div>
        <div className="flex gap-0.5 rounded-md border p-0.5 text-xs">
          {(Object.keys(RANGE_LABELS) as Range[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={
                "rounded px-2 py-0.5 transition-colors " +
                (range === k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Cost" value={fmtCost(s.cost_usd)} />
        <Metric label="Runs" value={fmt(s.runs)} />
        <Metric label="Tokens" value={fmt(totalTokens)} />
      </div>

      {s.runs > 0 && (
        <div className="mt-3 border-t pt-3 text-xs">
          <div className="text-muted-foreground mb-1.5 flex items-center gap-1">
            <TrendingUp className="size-3" /> Breakdown
          </div>
          <div className="space-y-1 font-mono">
            <Row label="Input tokens"    value={fmt(s.input_tokens)} />
            <Row label="Output tokens"   value={fmt(s.output_tokens)} />
            {s.cache_read > 0 && <Row label="Cache read"  value={fmt(s.cache_read)} muted />}
            {s.cache_written > 0 && <Row label="Cache written" value={fmt(s.cache_written)} muted />}
          </div>
        </div>
      )}

      {s.top_models.length > 0 && (
        <div className="mt-3 border-t pt-3 text-xs">
          <div className="text-muted-foreground mb-1.5">Top models</div>
          <div className="space-y-1 font-mono">
            {s.top_models.map((m) => (
              <Row
                key={m.model_id}
                label={(m.model_id || "(none)").replace(/^claude-/, "")}
                value={`${fmtCost(m.cost_usd)} · ${fmt(m.runs)} runs`}
              />
            ))}
          </div>
        </div>
      )}

      {s.runs === 0 && (
        <p className="text-muted-foreground mt-3 border-t pt-3 text-xs italic">
          No runs in this range yet.
        </p>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-semibold">{value}</div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={"flex justify-between gap-3 " + (muted ? "text-muted-foreground" : "")}>
      <span className="truncate">{label}</span>
      <span>{value}</span>
    </div>
  )
}
