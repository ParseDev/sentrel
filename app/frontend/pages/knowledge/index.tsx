import { Head } from "@inertiajs/react"

import { PageHeader } from "@/components/page-header"
import AppLayout from "@/layouts/app-layout"
import KnowledgePanel, { type KnowledgeDocument } from "@/components/knowledge-panel"
import { agentPath, agentsPath, dashboardPath } from "@/routes"

interface Props {
  agent: { id: string; name: string; slug: string }
  documents: KnowledgeDocument[]
}

export default function KnowledgeIndex({ agent, documents }: Props) {
  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: dashboardPath() },
        { label: "Agents", href: agentsPath() },
        { label: agent.name, href: agentPath(agent.id) },
        { label: "Knowledge" },
      ]}
    >
      <Head title={`Knowledge — ${agent.name}`} />

      <PageHeader
        eyebrow="RAG"
        title={`${agent.name}'s knowledge`}
        description="Upload documents this agent can retrieve from when answering."
      />

      <KnowledgePanel agentId={agent.id} agentName={agent.name} documents={documents} />
    </AppLayout>
  )
}
