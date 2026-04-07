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
  running: "bg-green-500",
  pending: "bg-yellow-500",
  paused: "bg-gray-400",
  stopped: "bg-red-500",
  starting: "bg-blue-500",
}

export default function DashboardIndex({ agents, stats }: Props) {
  return (
    <AppLayout>
      <Head title="Dashboard" />

      <PageHeader title="Dashboard" description="Your AI team at a glance" />

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_agents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.running_agents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_approvals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks In Progress</CardTitle>
            <CheckSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks_in_progress}</div>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link key={agent.id} href={agentPath(agent.id)} className="block">
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {agent.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-2 rounded-full ${statusColor[agent.status] || "bg-gray-400"}`}
                      />
                      <span className="text-xs text-muted-foreground capitalize">
                        {agent.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="mb-2">
                      {agent.role}
                    </Badge>
                    {agent.ai_config && (
                      <p className="text-xs text-muted-foreground">
                        {agent.ai_config.provider}/{agent.ai_config.model_id}
                      </p>
                    )}
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
