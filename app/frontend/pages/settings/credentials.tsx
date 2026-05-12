import { Head, router } from "@inertiajs/react"
import { useEffect, useMemo, useState } from "react"
import { KeyRound, Plus, Trash2, Edit2, Cloud, Sparkles, Lock, RotateCw } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Kind = "llm_api_key" | "cloud_provider" | "generic"

interface FieldDef {
  key: string
  label: string
  sensitive?: boolean
  optional?: boolean
  multiline?: boolean
  primary?: boolean
}

interface Credential {
  id: number
  kind: Kind
  provider: string
  name: string
  display_suffix: string
  last_used_at: string | null
  agent_grants_count: number
  field_names: string[]
  meta: Record<string, unknown>
  created_at: string
}

interface Props {
  credentials: Credential[]
  kinds: Kind[]
  providers: Record<Kind, string[]>
  field_schemas: Record<string, FieldDef[]>
}

const KIND_LABEL: Record<Kind, string> = {
  llm_api_key: "LLM API keys",
  cloud_provider: "Cloud providers",
  generic: "Generic secrets",
}

const KIND_ICON: Record<Kind, typeof KeyRound> = {
  llm_api_key: Sparkles,
  cloud_provider: Cloud,
  generic: Lock,
}

const KIND_DESCRIPTION: Record<Kind, string> = {
  llm_api_key:
    "Used to authenticate the engine to your LLM provider. Auto-piped into each agent's runtime env so usage bills against your account.",
  cloud_provider:
    "Available to agents via the secrets.get(name) tool. Use for keys that let agents act on your cloud (deploy, provision, query infra).",
  generic:
    "Any other API key your agents need. Same secrets.get() access pattern as cloud creds.",
}

function csrf(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""
}

function lookupSchema(schemas: Record<string, FieldDef[]>, kind: Kind, provider: string): FieldDef[] {
  return schemas[`${kind}:${provider}`] || schemas[`${kind}:*`] || schemas.__default__ || [
    { key: "value", label: "Secret value", sensitive: true, primary: true },
  ]
}

export default function CredentialsPage({ credentials, kinds, providers, field_schemas }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Credential | null>(null)
  const grouped = useMemo(() => {
    const g: Record<Kind, Credential[]> = { llm_api_key: [], cloud_provider: [], generic: [] }
    for (const c of credentials) g[c.kind].push(c)
    return g
  }, [credentials])

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: "/" },
        { label: "Settings", href: "/settings" },
        { label: "Credentials" },
      ]}
    >
      <Head title="Credentials" />

      <PageHeader
        eyebrow="Settings"
        title="Credentials"
        description="Store API keys and cloud secrets once; agents reuse them through env (LLM keys) or the secrets.get tool (everything else)."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            Add credential
          </Button>
        }
      />

      <div className="space-y-8 max-w-3xl">
        {kinds.map((kind) => {
          const Icon = KIND_ICON[kind]
          const items = grouped[kind] ?? []
          return (
            <section key={kind}>
              <div className="flex items-baseline gap-2 mb-2">
                <Icon className="size-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">{KIND_LABEL[kind]}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{KIND_DESCRIPTION[kind]}</p>

              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-xs text-muted-foreground">
                    No {KIND_LABEL[kind].toLowerCase()} yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {items.map((c) => (
                    <CredentialRow
                      key={c.id}
                      cred={c}
                      onEdit={() => setEditing(c)}
                      onDelete={() => {
                        if (!confirm(`Delete ${c.provider} credential “${c.name}”?`)) return
                        router.delete(`/settings/credentials/${c.id}`)
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {addOpen && (
        <CredentialModal
          providers={providers}
          fieldSchemas={field_schemas}
          onClose={() => setAddOpen(false)}
          mode="create"
        />
      )}
      {editing && (
        <CredentialModal
          providers={providers}
          fieldSchemas={field_schemas}
          onClose={() => setEditing(null)}
          mode="edit"
          cred={editing}
        />
      )}
    </AppLayout>
  )
}

function CredentialRow({ cred, onEdit, onDelete }: { cred: Credential; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card>
      <CardContent className="py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{cred.name}</span>
            <Badge variant="secondary" className="text-[10px] uppercase">{cred.provider}</Badge>
            {cred.agent_grants_count > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {cred.agent_grants_count} {cred.agent_grants_count === 1 ? "agent" : "agents"}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            <span className="font-mono">…{cred.display_suffix}</span>
            {cred.last_used_at && (
              <span className="ml-3">last used {new Date(cred.last_used_at).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit} title="Rotate / rename">
            <Edit2 className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CredentialModal({
  providers,
  fieldSchemas,
  onClose,
  mode,
  cred,
}: {
  providers: Record<Kind, string[]>
  fieldSchemas: Record<string, FieldDef[]>
  onClose: () => void
  mode: "create" | "edit"
  cred?: Credential
}) {
  const [kind, setKind] = useState<Kind>(cred?.kind ?? "llm_api_key")
  const [provider, setProvider] = useState(cred?.provider ?? providers.llm_api_key[0] ?? "anthropic")
  const [name, setName] = useState(cred?.name ?? "")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Resolves the field set for the current (kind, provider). Re-computed on
  // every change so swapping AWS → Heroku swaps the form inputs immediately.
  const schema = useMemo<FieldDef[]>(
    () => lookupSchema(fieldSchemas, kind, provider),
    [fieldSchemas, kind, provider],
  )

  // Reset field state when the schema changes so stale values from a prior
  // provider don't leak into the new shape (AWS access_key_id → Heroku api_key).
  useEffect(() => {
    setFields({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, provider])

  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const payload = { credential: { kind, provider, name, fields } }
    if (mode === "create") {
      router.post("/settings/credentials", payload, {
        headers: { "X-CSRF-Token": csrf() },
        onFinish: () => setBusy(false),
        onSuccess: onClose,
      })
    } else if (cred) {
      router.patch(`/settings/credentials/${cred.id}`, payload, {
        headers: { "X-CSRF-Token": csrf() },
        onFinish: () => setBusy(false),
        onSuccess: onClose,
      })
    }
  }

  const providerList = providers[kind] ?? []

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add credential" : `Rotate ${cred?.name}`}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Stored encrypted. Agents read it via env (LLM keys) or the secrets.get tool (cloud + generic)."
              : "Leave a field blank to keep its current value; fill it to rotate."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {mode === "create" && (
            <>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={kind} onValueChange={(v) => { setKind(v as Kind); setProvider(providers[v as Kind][0] || "") }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llm_api_key">LLM API key</SelectItem>
                    <SelectItem value="cloud_provider">Cloud provider</SelectItem>
                    <SelectItem value="generic">Generic secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                  <SelectContent>
                    {providerList.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Not listed? Type below.</p>
                <Input
                  placeholder="custom provider slug"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              required
              placeholder="production-anthropic"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Friendly label. Must be unique per provider.</p>
          </div>

          {schema.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>
                {f.label}
                {f.optional && <span className="text-muted-foreground"> (optional)</span>}
              </Label>
              {f.multiline ? (
                <textarea
                  required={mode === "create" && !f.optional}
                  rows={5}
                  autoComplete={f.sensitive ? "new-password" : "off"}
                  value={fields[f.key] || ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  placeholder={f.sensitive ? "•••" : ""}
                />
              ) : (
                <Input
                  type={f.sensitive ? "password" : "text"}
                  autoComplete={f.sensitive ? "new-password" : "off"}
                  required={mode === "create" && !f.optional}
                  placeholder={mode === "edit" ? "(unchanged)" : f.sensitive ? "•••" : ""}
                  value={fields[f.key] || ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              )}
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? <RotateCw className="size-3.5 animate-spin mr-1.5" /> : null}
              {mode === "create" ? "Add credential" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
