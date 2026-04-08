import { Head, Link } from "@inertiajs/react"
import { Bot, Plus } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { agentPath, newAgentPath } from "@/routes"
import type { Agent } from "@/types"

const statusColor: Record<string, string> = {
  running: "bg-green-500",
  pending: "bg-yellow-500",
  paused: "bg-gray-400",
  stopped: "bg-red-500",
  starting: "bg-blue-500",
}

export default function AgentsIndex({ agents }: { agents: Agent[] }) {
  return (
    <AppLayout>
      <Head title="Agents" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Manage your AI workforce</p>
        </div>
        <Button asChild>
          <Link href={newAgentPath()}>
            <Plus className="size-4 mr-2" />
            New Agent
          </Link>
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="size-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No agents yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">Create your first AI employee to get started</p>
            <Button asChild>
              <Link href={newAgentPath()}>
                <Plus className="size-4 mr-2" />
                Create Agent
              </Link>
            </Button>
          </CardContent>
        </Card>
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
                      {agent.manager && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">Reports to {agent.manager.name}</p>
                      )}
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
    </AppLayout>
  )
}
