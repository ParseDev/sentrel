import { useState } from "react"
import { Head, router } from "@inertiajs/react"
import { Plug, Trash2, Check, Sparkles, AlertTriangle, Terminal, RefreshCw } from "lucide-react"

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
  scope?: "org" | "user"
  owner_user_id?: number | null
  is_mine?: boolean
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
  requested_services?: string[]
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

export default function IntegrationsIndex({ integrations, supported_services = [], requested_services = [], ai_accounts = [], oauth_configured = { anthropic: false, openai: false } }: Props) {
  const requestedSet = new Set(requested_services)
  const [showCatalog, setShowCatalog] = useState(false)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [optimisticRequested, setOptimisticRequested] = useState<Set<string>>(new Set())

  async function requestIntegration(slug: string) {
    if (requestedSet.has(slug) || optimisticRequested.has(slug) || requesting) return
    setRequesting(slug)
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""
    try {
      const res = await fetch(`/integrations/${slug}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setOptimisticRequested((prev) => {
          const next = new Set(prev)
          next.add(slug)
          return next
        })
      }
    } finally {
      setRequesting(null)
    }
  }

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

  async function connect(serviceName: string, scope: "org" | "user" = "org") {
    // Get the Composio OAuth URL from Rails, then open in a popup
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""
    const res = await fetch(`/integrations/${serviceName}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ scope }),
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
  // Scope toggle — managing the workspace bucket (everyone shares) or your
  // personal bucket (just you). Default to workspace; flip to 'yours' for
  // personal Gmail / LinkedIn / etc.
  const [scopeView, setScopeView] = useState<"org" | "user">("org")

  // Sidebar-driven layout: left rail of categories (with "All" first), right
  // pane shows the selected category's services. Both Available and Catalog
  // entries appear in the same grid — Connected/Available items get the
  // solid Connect treatment, Catalog-only items get the dashed Request
  // treatment. Sorted available-first within each category so the user
  // always sees what they can use today before what they can ask for.
  const matchesQuery = (s: SupportedService) => {
    if (!query) return true
    const q = query.toLowerCase()
    return s.slug.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
  }
  const allFiltered = supported_services
    .filter(matchesQuery)
    .sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1))

  const CATEGORY_ORDER = ["Sales", "Communication", "Productivity", "Engineering", "Finance", "Content", "Other"]
  const categoryCounts = allFiltered.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1
    return acc
  }, {})
  const sidebarCategories = ["All", ...CATEGORY_ORDER.filter((c) => categoryCounts[c]),
    ...Object.keys(categoryCounts).filter((c) => !CATEGORY_ORDER.includes(c))]

  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [pageSize, setPageSize] = useState<number>(60)

  // When a search lands the selected category may have zero hits; jump back
  // to "All" so the user sees something instead of an empty pane.
  const visibleForCategory = selectedCategory === "All"
    ? allFiltered
    : allFiltered.filter((s) => s.category === selectedCategory)

  const totalInCategory = visibleForCategory.length
  const pagedSlice = visibleForCategory.slice(0, pageSize)

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

      <div className="mb-3 flex items-center gap-1 rounded-md border bg-card p-1 w-fit">
        <button
          onClick={() => setScopeView("org")}
          className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
            scopeView === "org"
              ? "bg-[var(--indigo-surface)] text-[var(--color-indigo)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Workspace · everyone
        </button>
        <button
          onClick={() => setScopeView("user")}
          className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
            scopeView === "user"
              ? "bg-[var(--indigo-surface)] text-[var(--color-indigo)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yours · just you
        </button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        {scopeView === "org"
          ? "Connections shared across the workspace. Your teammates' agents can use these too."
          : "Personal connections. Only your chats and your agents see these — your teammates can't."}
      </p>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={scopeView === "org" ? "Search workspace integrations…" : "Search your personal integrations…"}
          className="h-9 w-full max-w-md rounded-md border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--color-indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo-surface)]"
        />
        <button
          type="button"
          onClick={() => router.post("/integrations/refresh", {}, { preserveScroll: true })}
          className="flex items-center gap-1 text-xs font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground"
          title="Refresh the catalog from Composio (use after adding/removing an auth config)"
        >
          <RefreshCw className="size-3" /> Refresh
        </button>
        <a
          href="https://app.composio.dev/auth-configs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          + Add more →
        </a>
      </div>

      <div className="space-y-8">
        <div>
          <Overline className="mb-3 flex items-center gap-2">
            <Sparkles className="size-3.5" /> AI accounts (subscription auth)
          </Overline>
          <p className="text-xs text-muted-foreground mb-3">
            Run agents on your Claude Pro / Max / Team subscription instead of paying per token.
            Subject to subscription rate limits — best for hands-on use, not autonomous fleets.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {ai_accounts.filter((a) => a.provider === "anthropic").map((acc) => {
              const meta = AI_PROVIDER_META[acc.provider]
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
                  {acc.connected ? (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPasteOpen("anthropic")}
                      >
                        Replace token
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => router.delete(`/oauth/${acc.provider}/disconnect`)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => setPasteOpen("anthropic")}
                    >
                      Paste token
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {pasteOpen === "anthropic" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => !pasteBusy && setPasteOpen(null)}
          >
            <div
              className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="size-4 text-[var(--color-indigo)]" />
                <h2 className="text-sm font-semibold">Connect your Claude account</h2>
              </div>
              <ol className="text-xs text-muted-foreground space-y-2 mb-4 list-decimal list-inside">
                <li>
                  On your laptop, run <code className="font-mono bg-muted px-1.5 py-0.5 rounded">claude /login</code> in any terminal.
                  Complete the browser sign-in.
                </li>
                <li>
                  Copy the credentials to your clipboard:
                  <div className="mt-1.5 space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">macOS (Keychain)</div>
                    <pre className="rounded bg-muted p-2 text-[10px] font-mono leading-relaxed overflow-x-auto">security find-generic-password -s &quot;Claude Code-credentials&quot; -w | pbcopy</pre>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mt-1.5">Linux / WSL</div>
                    <pre className="rounded bg-muted p-2 text-[10px] font-mono leading-relaxed overflow-x-auto">cat ~/.claude/.credentials.json | xclip -selection clipboard</pre>
                  </div>
                </li>
                <li>Paste the JSON below and submit. Tokens are stored encrypted at rest.</li>
              </ol>
              <textarea
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                placeholder='{"claudeAiOauth":{"accessToken":"sk-ant-...","refreshToken":"...","expiresAt":...}}'
                className="w-full h-32 rounded-md border bg-background p-2 text-[11px] font-mono"
                disabled={pasteBusy}
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPasteOpen(null); setPasteValue("") }}
                  disabled={pasteBusy}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={submitPaste}
                  disabled={pasteBusy || !pasteValue.trim()}
                >
                  {pasteBusy ? "Saving…" : "Save token"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Two-pane layout: category sidebar on the left, paginated grid on
            the right. "All" is the first sidebar entry so users land on the
            full set without having to pick a category. Load-more pagination
            replaces the old hard cap so anyone hunting the long tail can
            scroll without re-running a search. */}
        <div className="grid grid-cols-[180px_1fr] gap-6">
          <aside className="border-r border-border pr-4">
            <Overline className="mb-2">Category</Overline>
            <ul className="space-y-0.5 text-sm">
              {sidebarCategories.map((cat) => {
                const count = cat === "All"
                  ? allFiltered.length
                  : (categoryCounts[cat] || 0)
                const active = selectedCategory === cat
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(cat); setPageSize(60) }}
                      className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left transition ${
                        active
                          ? "bg-muted text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className={`text-[10px] font-mono ${active ? "text-foreground" : "text-muted-foreground/70"}`}>
                        {count.toLocaleString()}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <main>
            {totalInCategory === 0 ? (
              <div className="py-12 text-center">
                <p className="font-mono text-sm text-muted-foreground">
                  {query ? `No matches for "${query}"` : "No services in this category"}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {pagedSlice.length.toLocaleString()} of {totalInCategory.toLocaleString()} services
                  {selectedCategory !== "All" && <> in <span className="font-medium text-foreground">{selectedCategory}</span></>}
                </p>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {pagedSlice.map((service) => {
                    const connected = service.available && integrations.find((i) =>
                      i.service_name === service.slug &&
                      (scopeView === "org" ? i.scope !== "user" : i.is_mine)
                    )
                    const isRequested = !service.available &&
                      (requestedSet.has(service.slug) || optimisticRequested.has(service.slug))

                    return (
                      <div
                        key={service.slug}
                        className={`group relative flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-all ${
                          connected
                            ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/[0.04]"
                            : service.available
                            ? "hover:border-[var(--border-strong)]"
                            : "border-dashed border-border/60 hover:border-border"
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
                              className={`size-6 object-contain ${service.available ? "" : "opacity-70"}`}
                              onError={(e) => {
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
                          <p className={`text-sm truncate ${connected ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                            {service.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {connected ? (
                              <span className="flex items-center gap-1.5 font-mono font-semibold text-[var(--color-success)]">
                                <span className="size-1 rounded-full bg-[var(--color-success)] animate-pulse-glow" />
                                CONNECTED
                              </span>
                            ) : (
                              service.description || service.category
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
                        ) : service.available ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 text-xs"
                            onClick={() => connect(service.slug, scopeView)}
                          >
                            Connect
                          </Button>
                        ) : isRequested ? (
                          <Badge variant="outline" className="h-7 shrink-0 text-[10px] gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3" /> Requested
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 text-xs"
                            disabled={requesting === service.slug}
                            onClick={() => requestIntegration(service.slug)}
                          >
                            {requesting === service.slug ? "…" : "Request"}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {pageSize < totalInCategory && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setPageSize((s) => s + 60)}
                    >
                      Load more · {(totalInCategory - pageSize).toLocaleString()} remaining
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </AppLayout>
  )
}
