import { useState } from "react"
import { Head, router } from "@inertiajs/react"
import { Plug, Trash2, Check, Sparkles, AlertTriangle, Terminal } from "lucide-react"

import { Overline } from "@/components/brand"
import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SupportedService {
  slug: string
  label: string
  category: string
  description: string | null
  available: boolean
  logo: string | null
}

interface Integration {
  id: number
  service_name: string
  status: string
  scopes: string[]
  created_at: string
}

interface AiAccount {
  provider: "anthropic" | "openai"
  connected: boolean
  account_email: string | null
  expires_at: string | null
  last_refreshed_at: string | null
}

interface Props {
  integrations: Integration[]
  supported_services: SupportedService[]
  ai_accounts: AiAccount[]
  oauth_configured: { anthropic: boolean; openai: boolean }
}

const AI_PROVIDER_META: Record<string, { label: string; description: string; rateLimit: string }> = {
  anthropic: {
    label: "Anthropic Account",
    description: "Connect your Claude Pro / Max / Team subscription. Agents use your existing quota instead of metered API.",
    rateLimit: "~250 msgs / 5h on Pro · 5× on Max",
  },
  openai: {
    label: "OpenAI Account",
    description: "Connect your ChatGPT Plus / Pro / Business subscription. Same auth that Codex CLI uses.",
    rateLimit: "~80 msgs / 3h on Plus",
  },
}

export default function IntegrationsIndex({ integrations, supported_services = [], ai_accounts = [], oauth_configured = { anthropic: false, openai: false } }: Props) {
  const [pasteOpen, setPasteOpen] = useState<null | "anthropic">(null)
  const [pasteValue, setPasteValue] = useState("")
  const [pasteBusy, setPasteBusy] = useState(false)

  async function submitPaste() {
    if (!pasteValue.trim()) return
    setPasteBusy(true)
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""
    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/oauth/anthropic/import_token"
    const t = document.createElement("input")
    t.type = "hidden"; t.name = "authenticity_token"; t.value = csrf
    const c = document.createElement("input")
    c.type = "hidden"; c.name = "credentials"; c.value = pasteValue
    form.appendChild(t); form.appendChild(c)
    document.body.appendChild(form)
    form.submit()
  }

  async function connect(serviceName: string) {
    // Get the Composio OAuth URL from Rails, then open in a popup
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""
    const res = await fetch(`/integrations/${serviceName}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrfToken },
    })
    const data = await res.json()
    if (data.redirect_url) {
      const popup = window.open(data.redirect_url, "composio-connect", "width=600,height=700,left=200,top=100")
      // Poll for popup close, then refresh
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer)
          router.reload()
        }
      }, 500)
    } else if (data.error) {
      alert(data.error)
    }
  }

  function disconnect(id: number) {
    router.delete(`/integrations/${id}`)
  }

  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)

  // Filter by search, then group by category. With ~500 toolkits in Composio
  // we limit each category to its top 12 unless the user opens the full list,
  // OR they're searching (search results always show all matches).
  const filtered = supported_services.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    return s.slug.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
  })
  const grouped = filtered.reduce<Record<string, SupportedService[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s)
    return acc
  }, {})
  // Stable category order: known buckets first, Other last.
  const CATEGORY_ORDER = ["Sales", "Communication", "Productivity", "Engineering", "Finance", "Content", "Other"]
  const categories = CATEGORY_ORDER.filter((c) => grouped[c]).concat(
    Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c))
  )

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: "/" },
        { label: "Integrations" },
      ]}
    >
      <Head title="Integrations" />

      <PageHeader
        eyebrow="Tools"
        title="Integrations"
        description="Connect the services your agents work inside. OAuth once, they use them forever."
      />

      <div className="mb-4 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 500+ services — Gmail, Notion, Salesforce, Stripe…"
          className="h-9 w-full max-w-md rounded-md border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--color-indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo-surface)]"
        />
        {!query && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            {showAll ? "Show curated only" : "Show all 500+"}
          </button>
        )}
      </div>

      <div className="space-y-8">
        {/* AI accounts (subscription auth) — temporarily hidden. claude.ai/oauth/authorize
            requires a UUID client_id, not a self-identifying URL, so OAuth flow is on hold
            until we either register an Anthropic developer app or ship a paste-token UX.
            Backend scaffolding (oauth_credentials table, refresh job, billing proxy) stays
            in place so the section can be re-enabled without re-doing the wiring. */}
        {false && (
        <div>
          <Overline className="mb-3 flex items-center gap-2">
            <Sparkles className="size-3.5" /> AI accounts (subscription auth)
          </Overline>
          <p className="text-xs text-muted-foreground mb-3">
            Run agents on your Claude Pro / ChatGPT Plus subscription instead of paying per token.
            Subject to subscription rate limits — best for hands-on use, not autonomous fleets.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {ai_accounts.map((acc) => {
              const meta = AI_PROVIDER_META[acc.provider]
              const configured = oauth_configured[acc.provider]
              return (
                <div
                  key={acc.provider}
                  className={`group relative flex items-start gap-3 rounded-lg border px-3.5 py-3 transition-all ${
                    acc.connected
                      ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/[0.04]"
                      : "hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div
                    className={`relative flex size-9 shrink-0 items-center justify-center rounded-md border ${
                      acc.connected
                        ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Sparkles className="size-4" />
                    {acc.connected && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[var(--color-success)] text-white ring-2 ring-background">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground mb-1">{meta.description}</p>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/80">
                      Limit: {meta.rateLimit}
                    </p>
                    {acc.connected && acc.account_email && (
                      <p className="text-[11px] mt-1 font-mono text-[var(--color-success)]">
                        {acc.account_email}
                      </p>
                    )}
                  </div>
                  {!configured ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <AlertTriangle className="size-3" /> Not configured
                    </Badge>
                  ) : acc.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => router.delete(`/oauth/${acc.provider}/disconnect`)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => (window.location.href = `/oauth/${acc.provider}/connect`)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        )}

        {categories.map((category) => {
          // When the user is searching OR clicked "Show all 500+", render
          // every match. Otherwise cap each category at 12 with a "+N more"
          // chip linking to the showAll toggle.
          const all = grouped[category]
          const cap = (query || showAll) ? all.length : 12
          const visible = all.slice(0, cap)
          const overflow = all.length - visible.length
          return (
          <div key={category}>
            <Overline className="mb-3">{category}</Overline>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((service) => {
                const connected = integrations.find((i) => i.service_name === service.slug)
                const setupPending = !service.available
                return (
                  <div
                    key={service.slug}
                    className={`group relative flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-all ${
                      connected
                        ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/[0.04]"
                        : setupPending
                          ? "border-dashed opacity-60"
                          : "hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div
                      className={`relative flex size-9 shrink-0 items-center justify-center rounded-md border overflow-hidden ${
                        connected
                          ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {service.logo ? (
                        <img
                          src={service.logo}
                          alt={service.label}
                          className="size-6 object-contain"
                          onError={(e) => {
                            // Hide broken images so the Plug fallback shows.
                            (e.currentTarget as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <Plug className="size-4" />
                      )}
                      {connected && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[var(--color-success)] text-white ring-2 ring-background">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${connected ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                        {service.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {connected ? (
                          <span className="flex items-center gap-1.5 font-mono font-semibold text-[var(--color-success)]">
                            <span className="size-1 rounded-full bg-[var(--color-success)] animate-pulse-glow" />
                            CONNECTED
                          </span>
                        ) : setupPending ? (
                          <span className="font-mono uppercase tracking-wide text-[10px] text-muted-foreground/80">
                            Setup required in integration dashboard
                          </span>
                        ) : (
                          service.description
                        )}
                      </p>
                    </div>
                    {connected ? (
                      <button
                        onClick={() => disconnect(connected.id)}
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label={`Disconnect ${service.label}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : setupPending ? (
                      <a
                        href="https://app.composio.dev/auth-configs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        title="Open integration dashboard"
                      >
                        Set up →
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                        onClick={() => connect(service.slug)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                )
              })}
              {overflow > 0 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="flex items-center justify-center rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  + {overflow} more in {category}
                </button>
              )}
            </div>
          </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
