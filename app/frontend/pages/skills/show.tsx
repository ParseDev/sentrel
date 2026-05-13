import { Head, Link, router } from "@inertiajs/react"
import { ArrowLeft, Edit2, GitFork, Sparkles, Users, Building2, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SkillFile {
  id: number
  path: string
  content: string
  file_type: string
}

interface Skill {
  id: number
  slug: string
  name: string
  description: string | null
  category: string | null
  source: string
  visibility: "private" | "org" | "marketplace"
  published: boolean
  version: number
  install_count: number
  owned_by_me: boolean
  created_by: string | null
  required_capabilities: string[]
  required_integrations: string[]
  files: SkillFile[]
}

interface Props {
  skill: Skill
  can_edit: boolean
}

function csrf(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""
}

export default function SkillShow({ skill, can_edit }: Props) {
  function publish() {
    router.post(`/skills/${skill.slug}/publish`, {}, { headers: { "X-CSRF-Token": csrf() } })
  }
  function unpublish() {
    router.post(`/skills/${skill.slug}/unpublish`, {}, { headers: { "X-CSRF-Token": csrf() } })
  }
  function fork() {
    if (!confirm(`Fork "${skill.name}" into your workspace?`)) return
    router.post(`/skills/${skill.slug}/fork`, {}, { headers: { "X-CSRF-Token": csrf() } })
  }
  function destroy() {
    if (!confirm(`Delete skill "${skill.name}"? This cannot be undone.`)) return
    router.delete(`/skills/${skill.slug}`, { headers: { "X-CSRF-Token": csrf() } })
  }

  const skillMd = skill.files.find((f) => f.path === "SKILL.md") || skill.files[0]

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: "/" },
        { label: "Skills", href: "/skills" },
        { label: skill.name },
      ]}
    >
      <Head title={`${skill.name} · skill`} />

      <PageHeader
        eyebrow="Skill"
        title={skill.name}
        description={skill.description || `A reusable instruction bundle.`}
        action={
          <div className="flex items-center gap-2">
            {can_edit ? (
              <Button asChild variant="outline">
                <Link href={`/skills/${skill.slug}/edit`}>
                  <Edit2 className="size-4 mr-1.5" />
                  Edit
                </Link>
              </Button>
            ) : skill.source !== "built_in" || skill.visibility === "marketplace" ? (
              <Button onClick={fork} variant="outline">
                <GitFork className="size-4 mr-1.5" />
                Fork
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="max-w-3xl space-y-5">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {skill.source === "built_in" ? (
                <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" /> System</Badge>
              ) : skill.owned_by_me ? (
                <Badge variant="outline" className="gap-1"><Building2 className="size-3" /> Yours</Badge>
              ) : (
                <Badge variant="outline" className="gap-1"><Users className="size-3" /> Community</Badge>
              )}
              <Badge variant="outline">v{skill.version}</Badge>
              <Badge variant={skill.published ? "default" : "outline"}>
                {skill.published ? "Published" : "Draft"}
              </Badge>
              {skill.category && <Badge variant="outline">{skill.category}</Badge>}
              {skill.install_count > 0 && (
                <span className="text-muted-foreground">{skill.install_count} installs</span>
              )}
              <span className="ml-auto text-muted-foreground font-mono text-[10px]">{skill.slug}</span>
            </div>
            {skill.required_capabilities?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Requires capabilities:</span>{" "}
                {skill.required_capabilities.join(", ")}
              </div>
            )}
            {skill.required_integrations?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Requires integrations:</span>{" "}
                {skill.required_integrations.join(", ")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5" />
              <span className="font-mono">{skillMd?.path || "SKILL.md"}</span>
              <span className="ml-auto">{skill.files.length} file{skill.files.length === 1 ? "" : "s"}</span>
            </div>
            {skillMd ? (
              <article className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{skillMd.content}</ReactMarkdown>
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">No SKILL.md content yet.</p>
            )}
          </CardContent>
        </Card>

        {skill.files.length > 1 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Other files
              </div>
              <ul className="space-y-1">
                {skill.files.filter((f) => f.path !== "SKILL.md").map((f) => (
                  <li key={f.id} className="text-xs flex items-center gap-2 font-mono text-muted-foreground">
                    <FileText className="size-3" />
                    {f.path} <span className="text-[10px]">({f.content.length} chars)</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {can_edit && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            {skill.published ? (
              <Button onClick={unpublish} variant="outline">Unpublish</Button>
            ) : (
              <Button onClick={publish}>Publish v{skill.version + 1}</Button>
            )}
            <Button onClick={destroy} variant="ghost" className="text-destructive">
              Delete
            </Button>
          </div>
        )}

        <div className="pt-2">
          <Link href="/skills" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="size-3" /> Back to skills
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
