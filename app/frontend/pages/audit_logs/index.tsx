import { Head, router } from "@inertiajs/react"
import { ScrollText } from "lucide-react"

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
}

interface Props {
  logs: LogEntry[]
  agents: { id: number; name: string; slug: string }[]
}

export default function AuditLogsIndex({ logs, agents }: Props) {
  function filterByAgent(agentId: string) {
    router.get("/audit_logs", { agent_id: agentId === "all" ? undefined : agentId }, { preserveState: true })
  }

  return (
    <AppLayout>
      <Head title="Audit Log" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Every action your agents take</p>
        </div>
        <Select onValueChange={filterByAgent} defaultValue="all">
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Filter by agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg">
          <ScrollText className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium mb-1">No activity yet</p>
          <p className="text-xs text-muted-foreground">Agent actions, tool calls, and decisions will be logged here</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tool</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-sm">
                    {log.agent?.name || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="text-[10px]">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                    {log.tool_name || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.status && (
                      <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-[10px]">
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
