import { Head, useForm } from "@inertiajs/react"
import { useState } from "react"
import * as icons from "lucide-react"

import { Overline } from "@/components/brand"
import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { agentsPath } from "@/routes"

interface Template {
  slug: string
  name: string
  role: string
  description: string
  icon: string
  capabilities: Record<string, { enabled?: boolean; [k: string]: unknown }>
  suggested_skill_slugs: string[]
  suggested_manager_role: string | null
  variables: string[]
}

interface AgentSummary {
  id: string
  name: string
  slug: string
  role: string
}

interface Props {
  templates: Template[]
  agents: AgentSummary[]
}

const CAPABILITY_LABELS: Record<string, string> = {
  knowledge_base: "Knowledge base",
  scheduling:     "Scheduling",
  tasks:          "Tasks",
  integrations:   "Integrations",
  recall:         "Recall",
  send_media:     "Send media",
}

export default function AgentNew({ templates, agents }: Props) {
  const [picked, setPicked] = useState<Template | null>(null)

  const { data, setData, post, processing } = useForm({
    name: "",
    slug: "",
    role: "",
    manager_id: "none" as string,
    template_slug: "",
    ai_config: {
      provider: "anthropic",
      model_id: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 8192,
      thinking_level: "none",
    },
    capabilities: {} as Record<string, { enabled?: boolean; [k: string]: unknown }>,
  })

  function choose(t: Template) {
    setPicked(t)
    // Prefill defaults from the template. Manager defaults to the first agent
    // whose role matches suggested_manager_role (if any).
    const mgr = t.suggested_manager_role
      ? agents.find((a) => a.role.toLowerCase() === t.suggested_manager_role!.toLowerCase())
      : null
    setData({
      ...data,
      role: t.role,
      template_slug: t.slug,
      manager_id: mgr?.id || "none",
      capabilities: t.capabilities,
    })
  }

  function handleNameChange(name: string) {
    setData({
      ...data,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    })
  }

  function toggleCap(key: string, enabled: boolean) {
    setData("capabilities", {
      ...data.capabilities,
      [key]: { ...(data.capabilities[key] || {}), enabled },
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post(agentsPath())
  }

  // Step 1 — template picker
  if (!picked) {
    return (
      <AppLayout crumbs={[{ label: "Workspace", href: "/" }, { label: "Agents", href: agentsPath() }, { label: "New" }]}>
        <Head title="New agent" />
        <PageHeader
          eyebrow="Hire"
          title="Pick a role"
          description="Each template ships with ready-made identity, personality, instructions, and a suggested skill pack. You can edit them once the agent is created."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
          {templates.map((t) => {
            const Icon = (icons as any)[t.icon] || icons.User
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => choose(t)}
                className="group rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="size-4" />
                  </div>
                  <div className="font-medium text-sm">{t.name}</div>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>
                <div className="flex flex-wrap gap-1">
                  {t.suggested_manager_role && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      reports to {t.suggested_manager_role}
                    </span>
                  )}
                  {t.suggested_skill_slugs.slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </AppLayout>
    )
  }

  // Step 2 — minimal details form
  const PickedIcon = (icons as any)[picked.icon] || icons.User

  return (
    <AppLayout crumbs={[{ label: "Workspace", href: "/" }, { label: "Agents", href: agentsPath() }, { label: "New" }]}>
      <Head title={`New ${picked.name}`} />
      <PageHeader
        eyebrow={picked.name}
        title={`Hire your ${picked.role}`}
        description={picked.description}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <section>
          <Overline className="mb-3">Identity</Overline>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="size-10 rounded-md bg-muted flex items-center justify-center">
                <PickedIcon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{picked.name} template</div>
                <div className="text-xs text-muted-foreground">Identity, personality, and instructions will be filled in from the template. You can edit them on the agent's Identity tab after creation.</div>
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setPicked(null)}>
                Change template
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="e.g. Alex, Sarah, Marcus" value={data.name} onChange={(e) => handleNameChange(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={data.slug} onChange={(e) => setData("slug", e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={data.role} onChange={(e) => setData("role", e.target.value)} required />
              <p className="text-[10px] text-muted-foreground">Free-text. Used by other agents to target this one via <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-muted">assign_to_role</code>.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">Reports to</Label>
              <Select value={data.manager_id} onValueChange={(v) => setData("manager_id", v)}>
                <SelectTrigger id="manager">
                  <SelectValue placeholder="No manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager (top level)</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} <span className="text-muted-foreground">— {a.role}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {picked.suggested_manager_role && (
                <p className="text-[10px] text-muted-foreground">Template suggests a manager with role: <strong>{picked.suggested_manager_role}</strong></p>
              )}
            </div>
          </div>
        </section>

        <section>
          <Overline className="mb-3">Model</Overline>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={data.ai_config.provider} onValueChange={(v) => setData("ai_config", { ...data.ai_config, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={data.ai_config.model_id} onChange={(e) => setData("ai_config", { ...data.ai_config, model_id: e.target.value })} />
              </div>
            </div>
          </div>
        </section>

        <section>
          <Overline className="mb-3">Capabilities</Overline>
          <div className="rounded-lg border bg-card p-5 space-y-3">
            {Object.keys(CAPABILITY_LABELS).map((key) => {
              const enabled = data.capabilities[key]?.enabled === true
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">{CAPABILITY_LABELS[key]}</div>
                    <div className="text-[10px] text-muted-foreground">{capabilityHint(key)}</div>
                  </div>
                  <Checkbox checked={enabled} onCheckedChange={(v) => toggleCap(key, !!v)} />
                </div>
              )
            })}
          </div>
        </section>

        <div className="flex justify-end gap-2 pb-8 max-w-2xl">
          <Button type="button" variant="ghost" onClick={() => setPicked(null)}>Back</Button>
          <Button type="submit" disabled={processing || !data.name}>
            {processing ? "Creating…" : `Hire ${data.name || picked.name}`}
          </Button>
        </div>
      </form>
    </AppLayout>
  )
}

function capabilityHint(key: string): string {
  switch (key) {
    case "knowledge_base": return "RAG retrieval against uploaded docs."
    case "scheduling":     return "schedule_task, set_reminder tools."
    case "tasks":          return "create_task, comment_on_task, write_checkpoint."
    case "integrations":   return "Third-party apps via Composio (Gmail, Notion, etc.)."
    case "recall":         return "search_messages, search_activity."
    case "send_media":     return "send_voice, send_image, send_file."
    default:               return ""
  }
}
