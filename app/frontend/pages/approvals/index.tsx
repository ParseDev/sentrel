import { Head, router } from "@inertiajs/react"
import { ShieldCheck, Check, X } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Approval {
  id: number
  tool_name: string
  tool_input: Record<string, unknown>
  context: string | null
  status: string
  reviewed_at: string | null
  created_at: string
  agent: { id: number; name: string; slug: string }
  reviewed_by: { id: number; name: string } | null
}

export default function ApprovalsIndex({ approvals }: { approvals: Approval[] }) {
  const pending = approvals.filter((a) => a.status === "pending")
  const reviewed = approvals.filter((a) => a.status !== "pending")

  function handleApproval(id: number, status: "approved" | "rejected") {
    router.patch(`/pending_approvals/${id}`, { status }, { preserveScroll: true })
  }

  return (
    <AppLayout>
      <Head title="Approvals" />

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">Review actions your agents want to take</p>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#D4A843]" />
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((approval) => (
              <Card key={approval.id} className="border-[#D4A843]/30">
                <CardContent className="flex items-start justify-between py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{approval.agent.name}</span>
                      <span className="text-muted-foreground">wants to</span>
                      <Badge variant="secondary" className="font-mono text-xs">{approval.tool_name}</Badge>
                    </div>
                    {approval.context && (
                      <p className="text-sm text-muted-foreground mt-1">{approval.context}</p>
                    )}
                    <pre className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded overflow-auto max-h-24">
                      {JSON.stringify(approval.tool_input, null, 2)}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(approval.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={() => handleApproval(approval.id, "approved")}>
                      <Check className="size-4 mr-1" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleApproval(approval.id, "rejected")}>
                      <X className="size-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 text-muted-foreground">History</h2>
          <div className="space-y-2">
            {reviewed.map((approval) => (
              <Card key={approval.id} className="opacity-60">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{approval.agent.name}</span>
                    <Badge variant="secondary" className="font-mono text-xs">{approval.tool_name}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={approval.status === "approved" ? "default" : "destructive"}>
                      {approval.status}
                    </Badge>
                    {approval.reviewed_by && (
                      <span className="text-xs text-muted-foreground">by {approval.reviewed_by.name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {approvals.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShieldCheck className="size-12 mx-auto mb-4 opacity-30" />
            <p>No approvals yet</p>
            <p className="text-xs mt-1">When agents need permission to act, requests appear here</p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  )
}
