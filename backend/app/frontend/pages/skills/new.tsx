import { Head, Link, useForm } from "@inertiajs/react"
import { ArrowLeft, Wrench } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  categories: string[]
}

export default function SkillsNew({ categories }: Props) {
  const { data, setData, post, processing } = useForm({
    name: "",
    slug: "",
    description: "",
    category: "generic",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post("/skills")
  }

  function autoSlug(name: string) {
    setData("name", name)
    if (!data.slug || data.slug === slugify(data.name)) {
      setData("slug", slugify(name))
    }
  }

  function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
  }

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: "/" },
        { label: "Skills", href: "/skills" },
        { label: "New" },
      ]}
    >
      <Head title="New skill" />

      <PageHeader
        eyebrow="Library"
        title="Create skill"
        description="A skill is a small instruction packet (one or many files) the agent reads when it needs to do a specific job. After this step we'll drop you into a multi-file editor."
      />

      <div className="max-w-xl">
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  required
                  value={data.name}
                  onChange={(e) => autoSlug(e.target.value)}
                  placeholder="ScribeMD Articles publishing"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Slug</Label>
                <Input
                  required
                  value={data.slug}
                  onChange={(e) => setData("slug", slugify(e.target.value))}
                  placeholder="scribemd-articles"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">URL identifier. Lowercase letters, digits, hyphens.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Input
                  value={data.description}
                  onChange={(e) => setData("description", e.target.value)}
                  placeholder="What this skill does in one sentence"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <select
                  value={data.category}
                  onChange={(e) => setData("category", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Link href="/skills" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <ArrowLeft className="size-3" /> Cancel
                </Link>
                <Button type="submit" disabled={processing || !data.name.trim() || !data.slug.trim()}>
                  <Wrench className="size-3.5 mr-1.5" />
                  Create + edit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
