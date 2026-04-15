import { Head } from "@inertiajs/react"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, Mail, MessageSquare, CheckSquare, AlertTriangle, Users } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"

interface Props {
  agents: Array<{ id: number; name: string; slug: string; role: string; status: string }>
  agent_totals: Record<number, { messages: number; emails: number; approvals: number; tasks: number; errors: number; conversations: number }>
  daily_data: Array<{ date: string; messages: number; emails: number; approvals_approved: number; approvals_rejected: number; errors: number }>
  channel_totals: Record<string, number>
  audit_rollups: Array<{ action: string; status: string; count: number }>
  days: number
  start_date: string
  end_date: string
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Mail; label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className={`size-4 ${color || ""}`} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

export default function ReportsIndex({ agents, agent_totals, daily_data, channel_totals, audit_rollups, days }: Props) {
  // Aggregate totals
  const totals = Object.values(agent_totals).reduce(
    (acc, t) => ({
      messages: acc.messages + t.messages,
      emails: acc.emails + t.emails,
      approvals: acc.approvals + t.approvals,
      tasks: acc.tasks + t.tasks,
      errors: acc.errors + t.errors,
      conversations: acc.conversations + t.conversations,
    }),
    { messages: 0, emails: 0, approvals: 0, tasks: 0, errors: 0, conversations: 0 }
  )

  const channelData = Object.entries(channel_totals).map(([name, value]) => ({
    name: name || "unknown",
    value,
  }))

  return (
    <AppLayout>
      <Head title="Reports" />

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Last {days} days of agent activity</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard icon={MessageSquare} label="Messages" value={totals.messages} />
        <StatCard icon={Mail} label="Emails Sent" value={totals.emails} />
        <StatCard icon={CheckSquare} label="Approvals" value={totals.approvals} />
        <StatCard icon={TrendingUp} label="Tasks Done" value={totals.tasks} />
        <StatCard icon={Users} label="Conversations" value={totals.conversations} />
        <StatCard icon={AlertTriangle} label="Errors" value={totals.errors} color="text-red-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Messages over time */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-4">Messages Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={daily_data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="messages" stroke="#3b82f6" strokeWidth={2} dot={false} name="Messages" />
              <Line type="monotone" dataKey="emails" stroke="#10b981" strokeWidth={2} dot={false} name="Emails" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Approval throughput */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-4">Approval Throughput</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={daily_data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="approvals_approved" fill="#10b981" name="Approved" stackId="a" />
              <Bar dataKey="approvals_rejected" fill="#ef4444" name="Rejected" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel breakdown */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-4">Channel Breakdown</h3>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {channelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">No channel data yet</div>
          )}
        </div>

        {/* Per-agent activity */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-4">Per-Agent Activity</h3>
          <div className="space-y-2">
            {agents.map((agent) => {
              const t = agent_totals[agent.id] || { messages: 0, emails: 0, approvals: 0, tasks: 0, errors: 0, conversations: 0 }
              const total = t.messages + t.emails + t.approvals + t.tasks
              return (
                <div key={agent.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{agent.name}</span>
                    <Badge variant="secondary" className="text-[9px]">{agent.role}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                    <span>{t.messages} msgs</span>
                    <span>{t.emails} emails</span>
                    <span>{t.approvals} approvals</span>
                    {t.errors > 0 && <span className="text-red-500">{t.errors} errors</span>}
                  </div>
                </div>
              )
            })}
            {agents.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No agents</div>}
          </div>
        </div>
      </div>

      {/* Audit log rollups */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium mb-4">Audit Log Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {audit_rollups.slice(0, 12).map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
              <div className="text-xs">
                <span className="font-medium">{r.action}</span>
                <Badge variant={r.status === "success" ? "default" : "destructive"} className="text-[8px] ml-1">{r.status}</Badge>
              </div>
              <span className="text-sm font-semibold tabular-nums">{r.count}</span>
            </div>
          ))}
          {audit_rollups.length === 0 && <div className="col-span-full text-sm text-muted-foreground text-center py-4">No audit data yet</div>}
        </div>
      </div>
    </AppLayout>
  )
}
