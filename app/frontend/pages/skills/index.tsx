import { Head, Link } from "@inertiajs/react"
import { useMemo, useState } from "react"
import { Search, Plus, Wrench, Sparkles, Users, Building2 } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Source = "all" | "mine" | "org" | "marketplace" | "system"

interface SkillCard {
  id: number
  slug: string
  name: string
  description: string | null
  category: string | null
  icon: string | null
  source: string
  visibility: "private" | "org" | "marketplace"
  published: boolean
  version: number
  install_count: number
  organization_id: number | null
  owned_by_me: boolean
  created_by: string | null
  updated_at: string
}

interface Props {
  skills: SkillCard[]
  categories: string[]
  filters: { category?: string | null; q?: string | null; visibility?: string | null }
}

export default function SkillsIndex({ skills, categories, filters }: Props) {
  const [query, setQuery] = useState(filters.q || "")
  const [source, setSource] = useState<Source>("all")
  const [category, setCategory] = useState<string>(filters.category || "all")

  const filtered = useMemo(() => {
    let rows = skills
    if (source === "mine")        rows = rows.filter((s) => s.owned_by_me)
    if (source === "org")         rows = rows.filter((s) => s.owned_by_me)
    if (source === "marketplace") rows = rows.filter((s) => s.visibility === "marketplace" && !s.owned_by_me && s.source !== "built_in")
    if (source === "system")      rows = rows.filter((s) => s.source === "built_in")
    if (category !== "all")       rows = rows.filter((s) => s.category === category)
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q),
      )
    }
    return rows
  }, [skills, source, category, query])

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: "/" },
        { label: "Skills" },
      ]}
    >
      <Head title="Skills" />

      <PageHeader
        eyebrow="Library"
        title="Skills"
        description="Reusable instruction packets agents install — multi-file SKILL.md bundles. Browse the marketplace, fork a public one, or author your own."
        action={
          <Button asChild>
            <Link href="/skills/new">
              <Plus className="size-4 mr-1.5" />
              New skill
            </Link>
          </Button>
        }
      />

      <div className="max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, slug, description…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            {(["all", "mine", "marketplace", "system"] as Source[]).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  source === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : s === "mine" ? "My org" : s === "marketplace" ? "Marketplace" : "System"}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs h-9"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No skills match.{" "}
              <button onClick={() => { setQuery(""); setSource("all"); setCategory("all") }} className="text-foreground underline-offset-2 hover:underline">
                Clear filters
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => (
              <Link key={s.slug} href={`/skills/${s.slug}`} className="block group">
                <Card className="h-full transition-colors group-hover:border-foreground/40">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Wrench className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{s.name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{s.slug}</div>
                      </div>
                      {s.source === "built_in" ? (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Sparkles className="size-3" /> System
                        </Badge>
                      ) : s.owned_by_me ? (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Building2 className="size-3" /> Yours
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Users className="size-3" /> Community
                        </Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{s.description}</p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>{s.category || "uncategorized"} · v{s.version}{s.published ? "" : " · draft"}</span>
                      {s.install_count > 0 && <span>{s.install_count} installs</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
