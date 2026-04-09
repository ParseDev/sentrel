import { Head, router } from "@inertiajs/react"
import { ShieldCheck, Check, X, Mail } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Review actions your agents want to take</p>
      </div>

      {approvals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg">
          <ShieldCheck className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium mb-1">No approvals yet</p>
          <p className="text-xs text-muted-foreground">When agents need permission to act, requests appear here</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Pending ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((approval) => (
              <div key={approval.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{approval.agent.name}</span>
                      <span className="text-xs text-muted-foreground">wants to</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">{approval.tool_name}</Badge>
                    </div>

                    {approval.tool_name === "send_email" ? (
                      <EmailPreview data={approval.tool_input} />
                    ) : (
                      <>
                        {approval.context && (
                          <p className="text-sm text-muted-foreground mb-2">{approval.context}</p>
                        )}
                        <pre className="text-xs text-muted-foreground bg-muted p-2.5 rounded-md overflow-auto max-h-24 font-mono">
                          {JSON.stringify(approval.tool_input, null, 2)}
                        </pre>
                      </>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(approval.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleApproval(approval.id, "approved")}>
                      <Check className="size-3 mr-1" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleApproval(approval.id, "rejected")}>
                      <X className="size-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">History</h2>
          <div className="space-y-1">
            {reviewed.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between rounded-md px-3 py-2.5 border border-border opacity-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{approval.agent.name}</span>
                  <Badge variant="secondary" className="font-mono text-[10px]">{approval.tool_name}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={approval.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                    {approval.status}
                  </Badge>
                  {approval.reviewed_by && (
                    <span className="text-[10px] text-muted-foreground">by {approval.reviewed_by.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function EmailPreview({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Mail className="size-3" />
        Email Draft
      </div>
      <div className="space-y-0.5 text-xs">
        <div className="flex gap-2">
          <span className="font-medium w-10 shrink-0 text-muted-foreground">From</span>
          <span>{data.from_name as string} &lt;{data.from_address as string}&gt;</span>
        </div>
        <div className="flex gap-2">
          <span className="font-medium w-10 shrink-0 text-muted-foreground">To</span>
          <span>{Array.isArray(data.to) ? (data.to as string[]).join(", ") : data.to as string}</span>
        </div>
        {Array.isArray(data.cc) && data.cc.length > 0 && (
          <div className="flex gap-2">
            <span className="font-medium w-10 shrink-0 text-muted-foreground">CC</span>
            <span>{(data.cc as string[]).join(", ")}</span>
          </div>
        )}
      </div>
      <div className="border-t border-border pt-2">
        <p className="font-medium text-sm">{data.subject as string}</p>
      </div>
      <div className="border-t border-border pt-2 text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
        {String(data.body_text || data.body_html || "")}
      </div>
    </div>
  )
}
