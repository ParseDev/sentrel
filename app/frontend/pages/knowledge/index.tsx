import { Head, Link } from "@inertiajs/react"
import { ArrowLeft } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import KnowledgePanel, { type KnowledgeDocument } from "@/components/knowledge-panel"

interface Props {
  agent: { id: string; name: string; slug: string }
  documents: KnowledgeDocument[]
}

export default function KnowledgeIndex({ agent, documents }: Props) {
  return (
    <AppLayout>
      <Head title={`Knowledge — ${agent.name}`} />
      <div className="flex items-center gap-3 mb-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/agents/${agent.id}`}><ArrowLeft className="size-4" /> Back to agent</Link>
        </Button>
      </div>
      <KnowledgePanel agentId={agent.id} agentName={agent.name} documents={documents} />
    </AppLayout>
  )
}
