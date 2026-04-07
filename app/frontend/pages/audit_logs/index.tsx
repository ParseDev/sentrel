import { Head, router } from "@inertiajs/react"
import { ScrollText } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Every action your agents take</p>
        </div>
        <Select onValueChange={filterByAgent} defaultValue="all">
          <SelectTrigger className="w-48">
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
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ScrollText className="size-12 mb-4 opacity-30" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {log.agent?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {log.tool_name || "—"}
                  </TableCell>
                  <TableCell>
                    {log.status && (
                      <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">
                        {log.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  )
}
