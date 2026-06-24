import { useState } from "react"
import { toast } from "sonner"
import Nango from "@nangohq/frontend"
import { KeyRound, ShieldCheck, Building2, Check, Loader2, ArrowRight, Plug, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ConnectMode = "managed" | "byo_oauth" | "byo_token"

export interface CatalogApp {
  slug: string
  label: string
  category: string
  description: string | null
  logo: string | null
  auth_type: string
  modes: ConnectMode[]
  review: "none" | "google" | "gated"
}

interface OrgConfig {
  provider: string
  mode: ConnectMode
  client_id: string | null
  has_secret: boolean
}

interface Props {
  app: CatalogApp
  scope: "org" | "user"
  orgConfig?: OrgConfig
  connectBaseUrl?: string | null
  onClose: () => void
  onConnected: () => void
}

function csrf() {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-Token": csrf() },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

const MODE_META: Record<ConnectMode, { label: string; icon: typeof KeyRound; blurb: string }> = {
  managed:   { label: "One-click", icon: ShieldCheck, blurb: "Connect instantly through Sentrel — recommended." },
  byo_token: { label: "Paste a token", icon: KeyRound, blurb: "Use your own API key or token. Works immediately." },
  byo_oauth: { label: "Use your own app", icon: Building2, blurb: "Run OAuth on your own credentials. Sentrel stays out of the data path." },
}

export function ConnectModal({ app, scope, orgConfig, connectBaseUrl, onClose, onConnected }: Props) {
  const modes = app.modes.length ? app.modes : (["managed"] as ConnectMode[])
  const [mode, setMode] = useState<ConnectMode>(modes[0])
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState("")
  const [clientId, setClientId] = useState(orgConfig?.client_id ?? "")
  const [clientSecret, setClientSecret] = useState("")

  // Managed / BYO-OAuth: mint a Nango Connect session, open the Connect UI,
  // and finalize with the connection id the UI hands back.
  async function runNangoConnect(m: ConnectMode) {
    setBusy(true)
    try {
      if (m === "byo_oauth") {
        if (!clientId || (!clientSecret && !orgConfig?.has_secret)) {
          toast.error("Enter your app's client ID and secret first.")
          return
        }
        const saved = await postJson(`/integrations/${app.slug}/org_config`, {
          mode: "byo_oauth", client_id: clientId, client_secret: clientSecret,
        })
        if (!saved.ok) {
          toast.error(saved.data.error || "Couldn't save your app credentials.")
          return
        }
      }

      const sess = await postJson(`/integrations/${app.slug}/nango_session`, { scope })
      if (!sess.ok || !sess.data.session_token) {
        toast.error(sess.data.error || "Couldn't start the connection.")
        return
      }

      // Open the Nango Connect popup, then close OUR modal immediately. Our
      // Radix dialog traps focus + pointer events, so if it stays mounted it
      // blocks the popup's "Connect" button (you'd have to dismiss ours first).
      // The popup lives on document.body, independent of this component, so it
      // survives unmount; the rest of this flow runs via closure.
      const connectPromise = openNangoConnectUI(
        sess.data.connect_base_url || connectBaseUrl,
        sess.data.session_token,
      )
      onClose()
      const connectionId = await connectPromise
      if (!connectionId) {
        toast.message("Connection cancelled.")
        return
      }

      const fin = await postJson(`/integrations/${app.slug}/nango_finalize`, { connection_id: connectionId, scope })
      if (!fin.ok) {
        toast.error(fin.data.error || "Couldn't finalize the connection.")
        return
      }
      toast.success(`${app.label} connected`)
      onConnected()
    } catch (err) {
      toast.error(`Connection failed: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function pasteToken() {
    if (!token.trim()) {
      toast.error("Paste a token first.")
      return
    }
    setBusy(true)
    try {
      const res = await postJson(`/integrations/${app.slug}/paste_token`, { token: token.trim(), scope })
      if (!res.ok) {
        toast.error(res.data.error || "Couldn't save the token.")
        return
      }
      toast.success(`${app.label} connected`)
      onConnected()
    } finally {
      setBusy(false)
    }
  }

  function submit() {
    if (mode === "byo_token") pasteToken()
    else runNangoConnect(mode)
  }

  // Gated providers (Meta/LinkedIn/TikTok) aren't review-approved for one-click
  // yet — flag that on the managed option so users reach for paste-token.
  const managedPending = app.review === "gated"
  const reviewNote =
    app.review === "gated" ? "One-click is pending app review — paste a token to use it today."
    : app.review === "google" ? "Google one-click needs verification — or paste a token now."
    : null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        {/* Header with the app's logo */}
        <DialogHeader className="space-y-0 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {app.logo ? (
                <img src={app.logo} alt={app.label} className="size-6 object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
              ) : (
                <Plug className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">Connect {app.label}</DialogTitle>
              <p className="text-xs text-muted-foreground">{app.category}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {reviewNote && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              {reviewNote}
            </p>
          )}

          {/* Mode picker — only when there's a real choice */}
          {modes.length > 1 && (
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                How do you want to connect?
              </Label>
              <div className="grid gap-2">
                {modes.map((m, i) => {
                  const meta = MODE_META[m]
                  const Icon = meta.icon
                  const active = mode === m
                  const recommended = i === 0 && !(m === "managed" && managedPending)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`group flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                        active
                          ? "border-[var(--color-indigo)] bg-[var(--indigo-surface)] ring-1 ring-[var(--color-indigo)]"
                          : "border-border hover:border-[var(--border-strong)] hover:bg-muted/40"
                      }`}
                    >
                      <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${
                        active ? "bg-[var(--color-indigo)] text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{meta.label}</span>
                          {recommended && (
                            <span className="rounded-full bg-[var(--color-indigo)]/15 px-1.5 py-px text-[10px] font-medium text-[var(--color-indigo)]">
                              Recommended
                            </span>
                          )}
                          {m === "managed" && managedPending && (
                            <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">Pending review</span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{meta.blurb}</span>
                      </span>
                      {active && <Check className="mt-1 size-4 shrink-0 text-[var(--color-indigo)]" strokeWidth={2.5} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Inputs for the selected mode */}
          {mode === "byo_token" && (
            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-xs">API key / token</Label>
              <Input id="token" type="password" value={token} autoFocus
                onChange={(e) => setToken(e.target.value)} placeholder="paste your token"
                onKeyDown={(e) => e.key === "Enter" && submit()} />
              <p className="text-[11px] text-muted-foreground">Stored encrypted. Only this agent / workspace can use it.</p>
            </div>
          )}

          {mode === "byo_oauth" && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="client_id" className="text-xs">Client ID</Label>
                <Input id="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="your app's client id" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_secret" className="text-xs">Client secret</Label>
                <Input id="client_secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={orgConfig?.has_secret ? "•••••• (saved — leave blank to keep)" : "your app's client secret"} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Set the callback to <code className="rounded bg-muted px-1">{(connectBaseUrl || "").replace(/^https?:\/\//, "")}/oauth/callback</code> in your app.
              </p>
            </div>
          )}

          {/* Primary action */}
          <Button disabled={busy} onClick={submit} className="w-full gap-1.5">
            {busy ? (
              <><Loader2 className="size-4 animate-spin" /> Connecting…</>
            ) : mode === "byo_token" ? (
              <>Connect with token <ArrowRight className="size-4" /></>
            ) : mode === "byo_oauth" ? (
              <>Save & connect <ArrowRight className="size-4" /></>
            ) : (
              <>Connect with Sentrel <ArrowRight className="size-4" /></>
            )}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" /> Encrypted & scoped to your workspace
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Opens the self-hosted Nango Connect UI and resolves with the new connection
// id (or null if the user cancelled). Drives the hosted Connect UI popup and
// reports the result via the SDK's onEvent callback.
async function openNangoConnectUI(baseUrl: string | null | undefined, sessionToken: string): Promise<string | null> {
  if (!baseUrl) throw new Error("Nango Connect URL not configured")
  const nango = new Nango({ connectSessionToken: sessionToken })

  return new Promise<string | null>((resolve) => {
    const connect = nango.openConnectUI({
      baseURL: baseUrl,
      // The Connect UI is served from `baseUrl` (connect.sentrel.ai) and the
      // Nango API is reachable same-origin there (Caddy routes /api,/connect,…
      // to the server). Point apiURL at the same host so the SPA's calls stay
      // same-origin — not the SDK default (api.nango.dev) or the admin domain.
      apiURL: baseUrl,
      sessionToken,
      onEvent: (event) => {
        if (event.type === "connect") {
          resolve(event.payload.connectionId)
        } else if (event.type === "close") {
          resolve(null)
        } else if (event.type === "error") {
          toast.error(event.payload.errorMessage || "Connection error")
          resolve(null)
        }
      },
    })
    // The session token can be set after open() in case it arrived async.
    connect.setSessionToken(sessionToken)
  })
}
