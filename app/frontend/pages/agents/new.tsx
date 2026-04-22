import { Head, Link, useForm } from "@inertiajs/react"
import { ArrowRight, Sparkles } from "lucide-react"

import { Overline } from "@/components/brand"
import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { agentsPath } from "@/routes"

const ROLE_TEMPLATES = [
  { value: "SDR", label: "SDR", description: "Sales development, outreach, lead qualification" },
  { value: "Content Writer", label: "Content Writer", description: "Blog posts, social media, marketing copy" },
  { value: "Finance", label: "Finance", description: "Expense tracking, invoicing, reports" },
  { value: "Engineer", label: "Engineer", description: "Code review, bug fixes, CI/CD" },
  { value: "QA", label: "QA", description: "Testing, bug reports, quality assurance" },
  { value: "Support", label: "Support", description: "Customer support, ticket resolution" },
  { value: "Custom", label: "Custom", description: "Define your own role" },
]

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
  { value: "openrouter", label: "OpenRouter" },
]

const MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  google: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  openrouter: [
    { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4 (via OpenRouter)" },
    { value: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)" },
  ],
}

export default function AgentNew() {
  const { data, setData, post, processing } = useForm({
    name: "",
    slug: "",
    role: "SDR",
    identity_md: "",
    personality_md: "",
    instructions_md: "",
    heartbeat_enabled: true,
    heartbeat_interval_minutes: 30,
    ai_config: {
      provider: "anthropic",
      model_id: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 8192,
      thinking_level: "none",
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post(agentsPath())
  }

  function handleNameChange(name: string) {
    setData({
      ...data,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    })
  }

  const availableModels = MODELS[data.ai_config.provider] || []

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: "/" },
        { label: "Agents", href: agentsPath() },
        { label: "New" },
      ]}
    >
      <Head title="New Agent" />

      <PageHeader
        eyebrow="Hire"
        title="Create a new agent"
        description="Give them an identity, pick a model, write the instructions they'll follow."
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Identity */}
        <section>
          <Overline className="mb-3">Identity</Overline>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Sarah" value={data.name} onChange={(e) => handleNameChange(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" placeholder="sarah-sdr" value={data.slug} onChange={(e) => setData("slug", e.target.value)} required />
                <p className="text-[10px] text-muted-foreground">Used in email addresses and URLs</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={data.role} onValueChange={(v) => setData("role", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_TEMPLATES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <span className="font-medium">{role.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{role.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* AI Model */}
        <section>
          <Overline className="mb-3">
            <Sparkles className="size-3" />
            AI model
          </Overline>
          <div className="rounded-lg border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={data.ai_config.provider}
                  onValueChange={(v) => {
                    const models = MODELS[v] || []
                    setData({ ...data, ai_config: { ...data.ai_config, provider: v, model_id: models[0]?.value || "" } })
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  key={data.ai_config.provider}
                  value={data.ai_config.model_id}
                  onValueChange={(v) => setData({ ...data, ai_config: { ...data.ai_config, model_id: v } })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Instructions */}
        <section>
          <Overline className="mb-3">Instructions</Overline>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identity_md">Identity</Label>
              <textarea
                id="identity_md"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10"
                placeholder="I am Sarah, an SDR at ScribeMD. My email is sarah-sdr@scribemd.com..."
                value={data.identity_md}
                onChange={(e) => setData("identity_md", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personality_md">Personality</Label>
              <textarea
                id="personality_md"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10"
                placeholder="I'm professional but friendly. I keep emails short and to the point..."
                value={data.personality_md}
                onChange={(e) => setData("personality_md", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions_md">Instructions</Label>
              <textarea
                id="instructions_md"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-signal)]/10"
                placeholder={"1. Search Apollo for leads matching our ICP\n2. Draft personalized cold emails\n3. Follow up after 3 days if no reply"}
                value={data.instructions_md}
                onChange={(e) => setData("instructions_md", e.target.value)}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between gap-2 border-t pt-6 pb-10">
          <p className="font-mono text-[11px] text-muted-foreground">
            You can edit every field later.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={agentsPath()}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={processing} className="gap-1.5">
              {processing ? "Creating…" : (
                <>
                  Create agent <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}
