import { Head, router } from "@inertiajs/react"
import { Plug, Trash2 } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const AVAILABLE_INTEGRATIONS = [
  { name: "apollo", label: "Apollo", description: "CRM and lead generation", category: "Sales" },
  { name: "hubspot", label: "HubSpot", description: "CRM, marketing, and sales", category: "Sales" },
  { name: "salesforce", label: "Salesforce", description: "Enterprise CRM", category: "Sales" },
  { name: "gmail", label: "Gmail", description: "Email", category: "Communication" },
  { name: "slack", label: "Slack", description: "Team messaging", category: "Communication" },
  { name: "google_calendar", label: "Google Calendar", description: "Scheduling", category: "Productivity" },
  { name: "google_sheets", label: "Google Sheets", description: "Spreadsheets", category: "Productivity" },
  { name: "stripe", label: "Stripe", description: "Payments and billing", category: "Finance" },
  { name: "github", label: "GitHub", description: "Code and PRs", category: "Engineering" },
  { name: "linear", label: "Linear", description: "Issue tracking", category: "Engineering" },
  { name: "notion", label: "Notion", description: "Docs and wiki", category: "Productivity" },
  { name: "wordpress", label: "WordPress", description: "Content publishing", category: "Content" },
]

interface Integration {
  id: number
  service_name: string
  status: string
  scopes: string[]
  created_at: string
}

export default function IntegrationsIndex({ integrations }: { integrations: Integration[] }) {
  const connectedNames = integrations.map((i) => i.service_name)

  function connect(serviceName: string) {
    router.post("/integrations", {
      integration: { service_name: serviceName, status: "connected" },
    })
  }

  function disconnect(id: number) {
    router.delete(`/integrations/${id}`)
  }

  const categories = [...new Set(AVAILABLE_INTEGRATIONS.map((i) => i.category))]

  return (
    <AppLayout>
      <Head title="Integrations" />

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Connect your tools — agents use them to get work done</p>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_INTEGRATIONS.filter((i) => i.category === category).map((service) => {
              const connected = integrations.find((i) => i.service_name === service.name)
              return (
                <Card key={service.name}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <Plug className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{service.label}</p>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    {connected ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600 text-xs">Connected</Badge>
                        <Button variant="ghost" size="sm" onClick={() => disconnect(connected.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => connect(service.name)}>
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </AppLayout>
  )
}
