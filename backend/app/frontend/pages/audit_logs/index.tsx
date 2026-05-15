import { Head, router } from "@inertiajs/react"
import { ScrollText } from "lucide-react"
import { useMemo, useState } from "react"

import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LogEntry {
  id: number
  action: string
  tool_name: string | null
  input: Record<string, unknown>
  output: Record<string, unknown>
  status: string | null
  created_at: string
  agent: { id: number; name: string; slug: string } | null
  acting_user_id: number | null
  acting_user: { id: number; name: string; email: string } | null
}

interface Filters {
  agent_id?: string | null
  action_filter?: string | null
  actor?: "all" | "human" | "agent"
}

interface Props {
  logs: LogEntry[]
  agents: { id: number; name: string; slug: string }[]
  filters: Filters
}

export default function AuditLogsIndex({ logs, agents, filters }: Props) {
  const [status, setStatus] = useState<"all" | "success" | "failed">("all")
  const [query, setQuery] = useState("")

  function navigate(patch: Record<string, string | undefined>) {
    router.get(
      "/audit_logs",
      {
        agent_id: filters.agent_id || undefined,
        action_filter: filters.action_filter || undefined,
        actor: filters.actor && filters.actor !== "all" ? filters.actor : undefined,
        ...patch,
      },
      { preserveState: true },
    )
  }

  function filterByAgent(agentId: string) {
    navigate({ agent_id: agentId === "all" ? undefined : agentId })
  }

  function filterByActor(actor: string) {
    navigate({ actor: actor === "all" ? undefined : actor })
  }

  const visible = useMemo(() => {
    return logs.filter((log) => {
      if (status !== "all" && log.status !== status) return false
      if (!query) return true
      const q = query.toLowerCase()
      return (
        log.action.toLowerCase().includes(q) ||
        (log.tool_name ?? "").toLowerCase().includes(q) ||
        (log.agent?.name ?? "").toLowerCase().includes(q)
      )
    })
  }, [logs, status, query])

  return (
    <AppLayout
      crumbs={[
        { label: "Control panel", href: "/" },
        { label: "Audit log" },
      ]}
      topBarActions={
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, tool, agent…"
            className="h-8 w-56 rounded-md border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--color-indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo-surface)]"
          />
          <Select onValueChange={filterByAgent} defaultValue="all">
            <SelectTrigger className="h-8 w-40 text-xs">
              <ScrollText className="mr-1 size-3" />
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Head title="Audit Log" />

      <PageHeader
        eyebrow="Control panel"
        title="Audit log"
        description="A chronological ledger of every tool call, every approval, every run."
      />

      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            {(["all", "success", "failed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-sm px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                  status === s
                    ? "bg-[var(--indigo-surface)] text-[var(--color-indigo)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Server-side filter: who triggered the audit row. "Human" =
              acting_user_id IS NOT NULL (someone clicked Send / Approve
              through an agent's identity). "Agent" = autonomous run. */}
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            {(["all", "human", "agent"] as const).map((a) => (
              <button
                key={a}
                onClick={() => filterByActor(a)}
                className={`rounded-sm px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                  (filters.actor || "all") === a
                    ? "bg-[var(--indigo-surface)] text-[var(--color-indigo)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {a === "all" ? "Any actor" : a === "human" ? "Human-acted" : "Agent-autonomous"}
              </button>
            ))}
          </div>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {visible.length} of {logs.length}
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <ScrollText className="mb-3 size-8 text-muted-foreground/30" />
          <p className="mb-1 font-display text-sm font-semibold">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Agent actions, tool calls, and decisions will be logged here.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">No logs match your filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left">Time</th>
                <th className="px-4 py-2.5 text-left">Agent</th>
                <th className="px-4 py-2.5 text-left">Actor</th>
                <th className="px-4 py-2.5 text-left">Action</th>
                <th className="px-4 py-2.5 text-left">Tool</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium">{log.agent?.name || "—"}</td>
                  <td className="px-4 py-2.5">
                    {log.acting_user ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">Human</Badge>
                        <span className="text-xs text-muted-foreground truncate max-w-[12rem]">{log.acting_user.name}</span>
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Agent</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                    {log.tool_name || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.status && (
                      <Badge variant={log.status === "success" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}
