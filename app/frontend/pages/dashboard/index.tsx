import { Head, Link } from "@inertiajs/react"
import { Bot, CheckSquare, ShieldCheck, Activity, Plus } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { agentPath, newAgentPath } from "@/routes"
import type { Agent, DashboardStats } from "@/types"

interface Props {
  agents: Agent[]
  stats: DashboardStats
}

const statusConfig: Record<string, { color: string; pulse: boolean; label: string }> = {
  running: { color: "bg-emerald-500", pulse: true, label: "Running" },
  pending: { color: "bg-amber-500", pulse: false, label: "Pending" },
  paused: { color: "bg-zinc-400", pulse: false, label: "Paused" },
  stopped: { color: "bg-red-500", pulse: false, label: "Stopped" },
  starting: { color: "bg-blue-500", pulse: true, label: "Starting" },
}

export default function DashboardIndex({ agents, stats }: Props) {
  const runningCount = agents.filter((a) => a.status === "running").length

  return (
    <AppLayout>
      <Head title="Dashboard" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {runningCount > 0
              ? `${runningCount} agent${runningCount > 1 ? "s" : ""} working right now`
              : "Your AI workforce at a glance"}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={newAgentPath()}>
            <Plus className="size-3.5 mr-1.5" />
            New Agent
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-10">
        {[
          { label: "Total Agents", value: stats.total_agents, icon: Bot, accent: false },
          { label: "Running", value: stats.running_agents, icon: Activity, accent: stats.running_agents > 0 },
          { label: "Approvals", value: stats.pending_approvals, icon: ShieldCheck, accent: stats.pending_approvals > 0 },
          { label: "Active Tasks", value: stats.tasks_in_progress, icon: CheckSquare, accent: stats.tasks_in_progress > 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border px-4 py-3.5 ${
              stat.accent
                ? "border-[var(--color-cyan-border)] bg-[var(--color-cyan-surface)]"
                : "border-border"
            }`}
          >
            <stat.icon className={`size-4 mb-2 ${stat.accent ? "text-[var(--color-cyan)]" : "text-muted-foreground"}`} />
            <p className="text-2xl font-semibold leading-none">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Agents */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Your Agents</h2>

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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => {
              const st = statusConfig[agent.status] || statusConfig.stopped
              const preview = agent.instructions_md || agent.identity_md || null

              return (
                <Link key={agent.id} href={agentPath(agent.id)} className="block group">
                  <div className="rounded-xl border border-border p-5 transition-all hover:border-muted-foreground/20 hover:shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex flex-col h-full min-h-[180px]">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
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

                    <div className="flex-1 mb-4">
                      {preview ? (
                        <p className="text-[13px] text-muted-foreground/50 leading-relaxed line-clamp-3">{preview}</p>
                      ) : (
                        <p className="text-[13px] text-muted-foreground/30 italic">No instructions set</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      {agent.ai_config && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {agent.ai_config.model_id}
                        </span>
                      )}
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
      </div>
    </AppLayout>
  )
}
