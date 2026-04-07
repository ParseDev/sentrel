import { Head, useForm } from "@inertiajs/react"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { settingsPath } from "@/routes"

interface Member {
  id: number
  name: string
  email: string
  role: string
  created_at: string
}

interface Props {
  organization: {
    id: number
    name: string
    slug: string
    email_domain: string | null
    email_domain_verified: boolean
  }
  members: Member[]
}

export default function SettingsShow({ organization, members }: Props) {
  const { data, setData, patch, processing } = useForm({
    organization: {
      name: organization.name,
      email_domain: organization.email_domain || "",
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    patch(settingsPath())
  }

  return (
    <AppLayout>
      <Head title="Settings" />
      <PageHeader title="Settings" description="Manage your organization" />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>General settings for your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={data.organization.name} onChange={(e) => setData("organization", { ...data.organization, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={organization.slug} disabled className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Used in URLs — cannot be changed</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                  {processing ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Domain</CardTitle>
            <CardDescription>Custom domain for agent email addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email_domain">Domain</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="email_domain"
                    placeholder="team.company.com"
                    value={data.organization.email_domain}
                    onChange={(e) => setData("organization", { ...data.organization, email_domain: e.target.value })}
                    className="flex-1"
                  />
                  {organization.email_domain_verified ? (
                    <Badge className="bg-green-600 shrink-0">Verified</Badge>
                  ) : organization.email_domain ? (
                    <Badge variant="secondary" className="shrink-0">Pending</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Agents will send emails from @{data.organization.email_domain || "your-domain.com"}
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                  {processing ? "Saving..." : "Save Domain"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>People who can manage agents in this organization</CardDescription>
              </div>
              <Button variant="outline" size="sm" disabled>
                Invite
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
