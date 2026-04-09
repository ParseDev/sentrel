import { Head, Link } from "@inertiajs/react"
import { Bot, CheckSquare, ShieldCheck, Activity, Plus } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { agentPath, newAgentPath } from "@/routes"
import type { Agent, DashboardStats } from "@/types"

interface Props {
  agents: Agent[]
  stats: DashboardStats
}

const statusColor: Record<string, string> = {
  running: "bg-green-500/100",
  pending: "bg-yellow-500",
  paused: "bg-gray-400",
  stopped: "bg-red-500",
  starting: "bg-blue-500/100",
}

export default function DashboardIndex({ agents, stats }: Props) {
  return (
    <AppLayout>
      <Head title="Dashboard" />

      <PageHeader title="Dashboard" description="Your AI team at a glance" />

      <div className="grid gap-3 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Agents</p>
              <p className="text-2xl font-bold mt-0.5">{stats.total_agents}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <Bot className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Running</p>
              <p className="text-2xl font-bold mt-0.5">{stats.running_agents}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10">
              <Activity className="size-4 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Approvals</p>
              <p className="text-2xl font-bold mt-0.5">{stats.pending_approvals}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
              <ShieldCheck className="size-4 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tasks In Progress</p>
              <p className="text-2xl font-bold mt-0.5">{stats.tasks_in_progress}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
              <CheckSquare className="size-4 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Agents</h2>
        {agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Create your first AI employee to get started"
            action={
              <Button asChild>
                <Link href={newAgentPath()}>
                  <Plus className="size-4 mr-2" />
                  Create Agent
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link key={agent.id} href={agentPath(agent.id)} className="block">
                <Card className="cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{agent.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{agent.role}</Badge>
                          {agent.ai_config && (
                            <span className="text-[10px] text-muted-foreground font-mono">{agent.ai_config.model_id}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`size-2 rounded-full ${statusColor[agent.status] || "bg-gray-400"}`} />
                      <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
