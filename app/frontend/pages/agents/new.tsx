import { Head, Link, useForm } from "@inertiajs/react"
import { ArrowLeft } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
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
    <AppLayout>
      <Head title="New Agent" />

      <div className="mb-8">
        <Link href={agentsPath()} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" />
          Back to Agents
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Agent</h1>
        <p className="text-muted-foreground">Add a new AI employee to your team</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Who is this agent?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Sarah"
                  value={data.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="sarah-sdr"
                  value={data.slug}
                  onChange={(e) => setData("slug", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Used in email addresses and URLs</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={data.role} onValueChange={(v) => setData("role", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_TEMPLATES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Model</CardTitle>
            <CardDescription>Which model powers this agent?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={data.ai_config.provider}
                  onValueChange={(v) => {
                    const models = MODELS[v] || []
                    setData({
                      ...data,
                      ai_config: {
                        ...data.ai_config,
                        provider: v,
                        model_id: models[0]?.value || "",
                      },
                    })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  key={data.ai_config.provider}
                  value={data.ai_config.model_id}
                  onValueChange={(v) => setData({
                    ...data,
                    ai_config: { ...data.ai_config, model_id: v },
                  })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Tell this agent who they are and what they do</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identity_md">Identity</Label>
              <textarea
                id="identity_md"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="I am Sarah, an SDR at ScribeMD. My email is sarah-sdr@scribemd.com..."
                value={data.identity_md}
                onChange={(e) => setData("identity_md", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personality_md">Personality</Label>
              <textarea
                id="personality_md"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="I'm professional but friendly. I keep emails short and to the point..."
                value={data.personality_md}
                onChange={(e) => setData("personality_md", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions_md">Instructions</Label>
              <textarea
                id="instructions_md"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="1. Search Apollo for leads matching our ICP&#10;2. Draft personalized cold emails&#10;3. Follow up after 3 days if no reply&#10;4. Book meetings with interested leads..."
                value={data.instructions_md}
                onChange={(e) => setData("instructions_md", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={agentsPath()}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={processing}>
            {processing ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </form>
    </AppLayout>
  )
}
