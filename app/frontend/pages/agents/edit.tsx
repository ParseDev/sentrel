import { Head, Link, useForm } from "@inertiajs/react"

import { Overline } from "@/components/brand"
import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { agentPath, agentsPath, dashboardPath } from "@/routes"
import type { Agent } from "@/types"

export default function AgentEdit({ agent }: { agent: Agent }) {
  const { data, setData, patch, processing } = useForm({
    name: agent.name,
    slug: agent.slug,
    role: agent.role,
    identity_md: agent.identity_md || "",
    personality_md: agent.personality_md || "",
    instructions_md: agent.instructions_md || "",
    email_signature_md: (agent as any).email_signature_md || "",
    heartbeat_enabled: agent.heartbeat_enabled,
    heartbeat_interval_minutes: agent.heartbeat_interval_minutes,
    ai_config: {
      provider: agent.ai_config?.provider || "anthropic",
      model_id: agent.ai_config?.model_id || "claude-sonnet-4-20250514",
      temperature: agent.ai_config?.temperature || 0.7,
      max_tokens: agent.ai_config?.max_tokens || 8192,
      thinking_level: agent.ai_config?.thinking_level || "none",
    },
    permissions: (agent as any).permissions || {},
    capabilities: (agent as any).capabilities || {
      knowledge_base: { enabled: false, always_retrieve: true, threshold: 0.75, top_k: 5 },
      scheduling:   { enabled: true },
      tasks:        { enabled: true },
      integrations: { enabled: true },
      recall:       { enabled: true },
      send_media:   { enabled: true },
    },
  })

  function setCap(key: string, patch: Record<string, unknown>) {
    setData("capabilities", {
      ...data.capabilities,
      [key]: { ...(data.capabilities as any)[key], ...patch },
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    patch(agentPath(agent.id))
  }

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: dashboardPath() },
        { label: "Agents", href: agentsPath() },
        { label: agent.name, href: agentPath(agent.id) },
        { label: "Edit" },
      ]}
    >
      <Head title={`Edit ${agent.name}`} />

      <PageHeader
        eyebrow="Configure"
        title={`Edit ${agent.name}`}
        description="Tune the agent's identity, model, permissions, and capabilities."
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Identity */}
        <section>
          <Overline className="mb-3">Identity</Overline>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={data.name} onChange={(e) => setData("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={data.slug} onChange={(e) => setData("slug", e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={data.role} onChange={(e) => setData("role", e.target.value)} required />
            </div>
          </div>
        </section>

        {/* Instructions */}
        <section>
          <Overline className="mb-3">Instructions</Overline>
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identity_md">Identity</Label>
              <textarea
                id="identity_md"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10"
                value={data.identity_md}
                onChange={(e) => setData("identity_md", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personality_md">Personality</Label>
              <textarea
                id="personality_md"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10"
                value={data.personality_md}
                onChange={(e) => setData("personality_md", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions_md">Instructions</Label>
              <textarea
                id="instructions_md"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10"
                value={data.instructions_md}
                onChange={(e) => setData("instructions_md", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Email Signature */}
        <section>
          <Overline className="mb-3">Email Signature</Overline>
          <div className="rounded-lg border border-border p-4 space-y-2">
            <Label htmlFor="email_signature_md">Signature appended to outgoing emails</Label>
            <textarea
              id="email_signature_md"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus-visible:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10"
              placeholder={`--\n${agent.name}\n${agent.role} @ Alchemy`}
              value={data.email_signature_md}
              onChange={(e) => setData("email_signature_md", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">If empty, a default signature with name and email will be used</p>
          </div>
        </section>

        {/* Heartbeat */}
        <section>
          <Overline className="mb-3">Heartbeat</Overline>
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="heartbeat_enabled"
                checked={data.heartbeat_enabled}
                onCheckedChange={(checked) => setData("heartbeat_enabled", !!checked)}
              />
              <Label htmlFor="heartbeat_enabled">Enable heartbeat</Label>
            </div>
            {data.heartbeat_enabled && (
              <div className="space-y-2">
                <Label htmlFor="heartbeat_interval">Check every (minutes)</Label>
                <Input
                  id="heartbeat_interval"
                  type="number"
                  min={5}
                  max={1440}
                  value={data.heartbeat_interval_minutes}
                  onChange={(e) => setData("heartbeat_interval_minutes", parseInt(e.target.value))}
                  className="w-32"
                />
              </div>
            )}
          </div>
        </section>

        {/* Capabilities */}
        <section>
          <Overline className="mb-3">Capabilities</Overline>
          <div className="rounded-lg border border-border p-4 space-y-4">
            {(["knowledge_base", "scheduling", "tasks", "integrations", "recall", "send_media"] as const).map((key) => {
              const cap = (data.capabilities as any)[key] || {}
              const labels: Record<string, { title: string; desc: string }> = {
                knowledge_base: { title: "Knowledge base (RAG)", desc: "Search over uploaded documents. Auto-enables on first upload." },
                scheduling:     { title: "Scheduling",            desc: "schedule_task, set_reminder tools." },
                tasks:          { title: "Task management",       desc: "create_task, comment_on_task tools." },
                integrations:   { title: "Integrations",          desc: "Third-party app access via Composio (Slack, Gmail, Notion, etc.)." },
                recall:         { title: "Recall / history",      desc: "search_messages, search_activity tools." },
                send_media:     { title: "Send media",            desc: "send_voice, send_image, send_file tools." },
              }
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{labels[key]!.title}</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{labels[key]!.desc}</p>
                    </div>
                    <Checkbox
                      checked={!!cap.enabled}
                      onCheckedChange={(v) => setCap(key, { enabled: !!v })}
                    />
                  </div>
                  {key === "knowledge_base" && cap.enabled && (
                    <div className="grid grid-cols-2 gap-3 pl-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Similarity threshold</Label>
                        <Input
                          type="number" min={0} max={1} step={0.05}
                          value={cap.threshold ?? 0.75}
                          onChange={(e) => setCap("knowledge_base", { threshold: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Top-k passages</Label>
                        <Input
                          type="number" min={1} max={20}
                          value={cap.top_k ?? 5}
                          onChange={(e) => setCap("knowledge_base", { top_k: parseInt(e.target.value, 10) })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Permissions */}
        <section>
          <Overline className="mb-3">Permissions</Overline>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Send Email</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Agent can compose and send emails</p>
              </div>
              <Select
                value={data.permissions?.send_email || "auto"}
                onValueChange={(v) => setData("permissions", { ...data.permissions, send_email: v })}
              >
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (send immediately)</SelectItem>
                  <SelectItem value="draft">Draft (requires approval)</SelectItem>
                  <SelectItem value="never">Never (disabled)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2 pb-8">
          <Button variant="outline" asChild>
            <Link href={agentPath(agent.id)}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={processing}>
            {processing ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </AppLayout>
  )
}
