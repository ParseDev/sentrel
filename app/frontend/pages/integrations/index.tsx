import { Head, router } from "@inertiajs/react"
import { Plug, Trash2, Check } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
  function connect(serviceName: string) {
    router.post("/integrations", { integration: { service_name: serviceName, status: "connected" } })
  }

  function disconnect(id: number) {
    router.delete(`/integrations/${id}`)
  }

  const categories = [...new Set(AVAILABLE_INTEGRATIONS.map((i) => i.category))]

  return (
    <AppLayout>
      <Head title="Integrations" />

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Connect your tools — agents use them to get work done</p>
      </div>

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category}>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{category}</h2>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {AVAILABLE_INTEGRATIONS.filter((i) => i.category === category).map((service) => {
                const connected = integrations.find((i) => i.service_name === service.name)
                return (
                  <div
                    key={service.name}
                    className={`flex items-center gap-3 rounded-lg border border-border px-3.5 py-3 transition-colors ${
                      connected ? "" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted shrink-0">
                      <Plug className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{service.label}</p>
                      <p className="text-[11px] text-muted-foreground">{service.description}</p>
                    </div>
                    {connected ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="default" className="text-[10px] bg-emerald-600">
                          <Check className="size-2.5 mr-0.5" />
                          Connected
                        </Badge>
                        <button
                          onClick={() => disconnect(connected.id)}
                          className="flex items-center justify-center size-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => connect(service.name)}>
                        Connect
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
