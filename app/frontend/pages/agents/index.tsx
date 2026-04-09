import { Head, Link } from "@inertiajs/react"
import { Bot, Plus, Search } from "lucide-react"
import { useState } from "react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { agentPath, newAgentPath } from "@/routes"
import type { Agent } from "@/types"

const statusConfig: Record<string, { color: string; pulse: boolean; label: string }> = {
  running: { color: "bg-emerald-500", pulse: true, label: "Running" },
  pending: { color: "bg-amber-500", pulse: false, label: "Pending" },
  paused: { color: "bg-zinc-400", pulse: false, label: "Paused" },
  stopped: { color: "bg-red-500", pulse: false, label: "Stopped" },
  starting: { color: "bg-blue-500", pulse: true, label: "Starting" },
}

export default function AgentsIndex({ agents }: { agents: Agent[] }) {
  const [search, setSearch] = useState("")

  const filtered = search
    ? agents.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.role.toLowerCase().includes(search.toLowerCase())
      )
    : agents

  return (
    <AppLayout>
      <Head title="Agents" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} in your team
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={newAgentPath()}>
            <Plus className="size-3.5 mr-1.5" />
            New Agent
          </Link>
        </Button>
      </div>

      {/* Search */}
      {agents.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            placeholder="Search agents..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Cards */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-border mb-5">
            <Bot className="size-7 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium mb-1">No agents yet</p>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            Create your first AI employee — give them a role, personality, and instructions.
          </p>
          <Button asChild>
            <Link href={newAgentPath()}>
              <Plus className="size-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No agents match "{search}"</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => {
            const st = statusConfig[agent.status] || statusConfig.stopped
            const preview = agent.instructions_md || agent.identity_md || null

            return (
              <Link key={agent.id} href={agentPath(agent.id)} className="block group">
                <div className="rounded-xl border border-border p-5 transition-all hover:border-muted-foreground/20 hover:shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex flex-col h-full min-h-[180px]">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-cyan)]/15 text-sm font-bold text-[var(--color-cyan)]">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <div className={`size-3 rounded-full border-2 border-card ${st.color}`}>
                            {st.pulse && <div className={`size-3 rounded-full ${st.color} animate-ping absolute inset-0 opacity-40`} />}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[15px] leading-tight tracking-tight">{agent.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{agent.role}</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] mt-0.5 ${
                        agent.status === "running"
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : ""
                      }`}
                    >
                      {st.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  <div className="flex-1 mb-4">
                    {preview ? (
                      <p className="text-[13px] text-muted-foreground/50 leading-relaxed line-clamp-3">
                        {preview}
                      </p>
                    ) : (
                      <p className="text-[13px] text-muted-foreground/30 italic">No instructions set</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      {agent.ai_config && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {agent.ai_config.model_id}
                        </span>
                      )}
                    </div>
                    {agent.manager && (
                      <span className="text-[10px] text-muted-foreground">→ {agent.manager.name}</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
