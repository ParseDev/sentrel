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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={agentPath(agent.id)} className="block">
              <Card className="hover:border-[#D4A843]/40 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1.5">{agent.role}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`size-2.5 rounded-full ${statusColor[agent.status] || "bg-gray-400"}`} />
                    <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {agent.ai_config && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {agent.ai_config.model_id}
                    </p>
                  )}
                  {agent.manager && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reports to {agent.manager.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
