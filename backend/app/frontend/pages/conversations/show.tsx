import { Head } from "@inertiajs/react"
import { ArrowDownLeft, ArrowUpRight, Mail, MessageSquare, Phone, Send } from "lucide-react"

import { Overline, StatusDot } from "@/components/brand"
import { Badge } from "@/components/ui/badge"
import AppLayout from "@/layouts/app-layout"
import { agentPath, agentsPath, dashboardPath } from "@/routes"

interface Message {
  id: number
  role: "user" | "assistant" | "system"
  content: string
  direction: string | null
  channel: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface Props {
  agent: { id: number; name: string; slug: string; role: string }
  conversation: {
    id: number
    kind: string
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    subject: string | null
    status: string
  }
  messages: Message[]
}

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  whatsapp: Phone,
  telegram: Send,
  web: MessageSquare,
  sms: Phone,
}

export default function ConversationShow({ agent, conversation, messages }: Props) {
  const contact =
    conversation.contact_name ??
    conversation.contact_email ??
    conversation.contact_phone ??
    "Unknown"
  const channel = messages[0]?.channel ?? "web"
  const ChannelIcon = CHANNEL_ICON[channel] ?? MessageSquare

  return (
    <AppLayout
      crumbs={[
        { label: "Workspace", href: dashboardPath() },
        { label: "Agents", href: agentsPath() },
        { label: agent.name, href: agentPath(agent.id) },
        { label: contact },
      ]}
    >
      <Head title={`${contact} — ${agent.name}`} />

      <div className="mb-6 rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-md border"
              style={{
                background: "var(--indigo-surface)",
                borderColor: "var(--indigo-border)",
              }}
            >
              <ChannelIcon className="size-5 text-[var(--color-indigo)]" />
            </div>
            <div>
              <Overline>{channel} · {conversation.kind}</Overline>
              <h1 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
                {contact}
              </h1>
              {conversation.subject && (
                <p className="mt-0.5 text-sm text-muted-foreground">{conversation.subject}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <StatusDot status={conversation.status === "open" ? "online" : "offline"} />
              {conversation.status}
            </div>
            <Badge variant="outline">{messages.length} msg</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-3xl space-y-2">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            agentName={agent.name}
            contact={contact}
            channel={channel}
          />
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <MessageSquare className="size-6 text-muted-foreground/50" />
            <p className="font-mono text-sm text-muted-foreground">
              No messages in this conversation yet.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function MessageBubble({
  message,
  agentName,
  contact,
  channel,
}: {
  message: Message
  agentName: string
  contact: string
  channel: string
}) {
  const isOutbound = message.direction === "outbound" || message.role === "assistant"
  const sender = isOutbound ? agentName : contact
  const DirectionIcon = isOutbound ? ArrowUpRight : ArrowDownLeft

  const emailMeta = message.metadata as { to?: string; cc?: string[]; subject?: string }

  return (
    <div
      className={`rounded-lg border p-4 ${
        isOutbound ? "border-[var(--indigo-border)] bg-[var(--indigo-surface)]/50" : "bg-card"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DirectionIcon
            className={`size-3.5 ${
              isOutbound ? "text-[var(--color-indigo)]" : "text-[var(--color-success)]"
            }`}
          />
          <span className="text-sm font-semibold text-foreground">{sender}</span>
          {channel === "email" && emailMeta.to && (
            <span className="font-mono text-[11px] text-muted-foreground">
              → {isOutbound ? emailMeta.to : agentName}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {new Date(message.created_at).toLocaleString()}
        </span>
      </div>

      {channel === "email" && emailMeta.subject && (
        <p className="mb-2 text-sm font-medium text-foreground">{emailMeta.subject}</p>
      )}

      {channel === "email" && emailMeta.cc && emailMeta.cc.length > 0 && (
        <p className="mb-2 font-mono text-[11px] text-muted-foreground">
          cc: {emailMeta.cc.join(", ")}
        </p>
      )}

      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {message.content}
      </div>
    </div>
  )
}
