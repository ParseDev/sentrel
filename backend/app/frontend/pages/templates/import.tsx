import { useMemo, useRef, useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { AlertTriangle, ArrowLeft, ClipboardPaste, FileJson, FileUp, Link as LinkIcon, ShieldCheck } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface Props {
  supported_spec_versions: string[]
}

type Mode = "paste" | "file" | "url"

// Importer's exact spec_version contract.
function looksLikeAgentJson(parsed: unknown, supported: string[]): { ok: true } | { ok: false; reason: string } {
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "Top level must be a JSON object" }
  const obj = parsed as Record<string, unknown>
  if (!obj.spec_version) return { ok: false, reason: "Missing `spec_version`" }
  if (!supported.includes(String(obj.spec_version))) {
    return { ok: false, reason: `Unsupported spec_version ${String(obj.spec_version)} — this build accepts ${supported.join(", ")}` }
  }
  if (obj.kind && obj.kind !== "agent") return { ok: false, reason: `Unsupported kind \`${String(obj.kind)}\` (only \`agent\` is supported)` }
  if (!obj.name) return { ok: false, reason: "Missing `name`" }
  return { ok: true }
}

export default function TemplatesImport({ supported_spec_versions }: Props) {
  const [mode, setMode] = useState<Mode>("paste")
  const [pasted, setPasted] = useState("")
  const [url, setUrl] = useState("")
  const [fileBody, setFileBody] = useState("")
  const [fileName, setFileName] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeJson = mode === "paste" ? pasted : mode === "file" ? fileBody : ""

  const preview = useMemo(() => {
    if (mode === "url") return null
    if (!activeJson.trim()) return null
    try {
      const parsed = JSON.parse(activeJson)
      const verdict = looksLikeAgentJson(parsed, supported_spec_versions)
      const obj = parsed as Record<string, unknown>
      return {
        verdict,
        name:        typeof obj.name === "string" ? obj.name : "—",
        role:        typeof obj.role === "string" ? obj.role : null,
        category:    typeof obj.category === "string" ? obj.category : null,
        license:     typeof obj.license === "string" ? obj.license : null,
        spec_version: typeof obj.spec_version === "string" ? obj.spec_version : null,
        skill_count: Array.isArray(obj.skills) ? obj.skills.length : 0,
        integration_count: Array.isArray(obj.integrations_required) ? obj.integrations_required.length : 0,
      }
    } catch (e) {
      return { verdict: { ok: false as const, reason: `Invalid JSON: ${(e as Error).message}` }, name: "—", role: null, category: null, license: null, spec_version: null, skill_count: 0, integration_count: 0 }
    }
  }, [mode, activeJson, supported_spec_versions])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => setFileBody(String(reader.result || ""))
    reader.readAsText(f)
  }

  function submit() {
    setBusy(true)
    const body: Record<string, string | object> = {}
    if (mode === "paste") {
      try {
        body.definition = JSON.parse(pasted)
      } catch (e) {
        alert(`Paste is not valid JSON: ${(e as Error).message}`)
        setBusy(false)
        return
      }
    } else if (mode === "file") {
      try {
        body.definition = JSON.parse(fileBody)
      } catch (e) {
        alert(`File is not valid JSON: ${(e as Error).message}`)
        setBusy(false)
        return
      }
    } else {
      if (!/^https:\/\//i.test(url.trim())) {
        alert("URL must start with https://")
        setBusy(false)
        return
      }
      body.url = url.trim()
    }
    router.post("/agent_templates/import", body, {
      onError: () => setBusy(false),
      onFinish: () => setBusy(false),
    })
  }

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: "/" },
        { label: "Templates", href: "/agent_templates" },
        { label: "Import" },
      ]}
    >
      <Head title="Import agent template" />

      <PageHeader
        eyebrow="Library"
        title="Import from JSON"
        description="Bring in a community agent template from a pasted agent.json, a local file, or a public HTTPS URL."
        action={
          <Link href="/agent_templates">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ArrowLeft className="size-3.5" /> Back to library
            </Button>
          </Link>
        }
      />

      <div className="max-w-3xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-1 rounded-md border bg-card p-1 w-fit">
              <ModeTab active={mode === "paste"} onClick={() => setMode("paste")} icon={<ClipboardPaste className="size-3.5" />} label="Paste JSON" />
              <ModeTab active={mode === "file"}  onClick={() => setMode("file")}  icon={<FileUp className="size-3.5" />}        label="Upload file" />
              <ModeTab active={mode === "url"}   onClick={() => setMode("url")}   icon={<LinkIcon className="size-3.5" />}      label="From URL" />
            </div>

            {mode === "paste" && (
              <div className="space-y-2">
                <Label className="text-xs">agent.json contents</Label>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  rows={18}
                  spellCheck={false}
                  className="w-full font-mono text-[11.5px] leading-[1.6] rounded-md border border-input bg-background p-2.5"
                  placeholder='{"spec_version": "1.0", "kind": "agent", "name": "…", ...}'
                />
              </div>
            )}

            {mode === "file" && (
              <div className="space-y-2">
                <Label className="text-xs">Pick an agent.json file</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={onFile}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="size-3.5 mr-1.5" />
                    Choose file
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">
                    {fileName || "no file chosen"}
                  </span>
                </div>
                {fileBody && (
                  <pre className="rounded-md border border-border bg-muted/30 p-2.5 text-[11px] max-h-72 overflow-auto">
                    {fileBody.slice(0, 4000)}{fileBody.length > 4000 ? "\n…" : ""}
                  </pre>
                )}
              </div>
            )}

            {mode === "url" && (
              <div className="space-y-2">
                <Label className="text-xs">HTTPS URL to an agent.json</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://gist.githubusercontent.com/…/raw/some-agent.json"
                />
                <p className="text-[11px] text-muted-foreground">
                  Server-side fetch — HTTPS only, 1MB cap, 10s timeout. The response body
                  must be a valid agent.json.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
              <ShieldCheck className="size-3.5 mt-0.5 flex-shrink-0" />
              <div>
                Importing a template is safe — credentials and channel tokens were stripped on
                export. You'll wire up your own integrations + credentials when you hire the
                resulting template. Skill bundles with slug collisions in your workspace are
                silently forked (the existing one isn't touched).
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Link href="/agent_templates">
                <Button type="button" variant="outline" disabled={busy}>Cancel</Button>
              </Link>
              <Button
                type="button"
                onClick={submit}
                disabled={busy || (mode === "url" ? !url.trim() : !activeJson.trim())}
              >
                {busy ? "Importing…" : "Import template"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <FileJson className="size-3.5 text-muted-foreground" />
              Preview
            </div>
            {!preview ? (
              <p className="text-[11px] text-muted-foreground">
                {mode === "url"
                  ? "URL fetches happen server-side after you click Import — there's no client-side preview."
                  : "Paste or upload a file to see a quick summary here."}
              </p>
            ) : (
              <>
                {!preview.verdict.ok && (
                  <div className="flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-700 dark:text-red-300">
                    <AlertTriangle className="size-3.5 mt-0.5 flex-shrink-0" />
                    <span>{preview.verdict.reason}</span>
                  </div>
                )}
                <dl className="space-y-1.5 text-[11.5px]">
                  <Row k="Name"          v={preview.name} />
                  <Row k="Role"          v={preview.role || "—"} />
                  <Row k="Category"      v={preview.category || "—"} />
                  <Row k="License"       v={preview.license || "—"} />
                  <Row k="Spec version"  v={preview.spec_version || "—"} />
                  <Row k="Skills"        v={String(preview.skill_count)} />
                  <Row k="Integrations"  v={String(preview.integration_count)} />
                </dl>
                <p className="text-[10.5px] text-muted-foreground pt-1 border-t border-border">
                  Supported spec versions: {supported_spec_versions.join(", ")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right truncate font-medium">{v}</dd>
    </div>
  )
}
