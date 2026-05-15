import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-5">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}
