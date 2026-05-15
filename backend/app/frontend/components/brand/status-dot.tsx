import { cn } from "@/lib/utils"

interface StatusDotProps {
  status: "online" | "idle" | "error" | "offline" | "working"
  pulse?: boolean
  /** Add a ring the color of the surface behind, useful for avatar corners */
  ring?: boolean
  className?: string
}

const STATUS_COLOR: Record<StatusDotProps["status"], string> = {
  online: "bg-[var(--color-success)]",
  working: "bg-[var(--cyan)]",
  idle: "bg-[var(--color-warning)]",
  error: "bg-[var(--destructive)]",
  offline: "bg-muted-foreground/50",
}

export function StatusDot({ status, pulse = false, ring = false, className }: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex size-2 items-center justify-center", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-60 animate-ping",
            STATUS_COLOR[status],
          )}
        />
      )}
      <span
        className={cn(
          "relative size-2 rounded-full",
          ring && "ring-2 ring-[var(--card)]",
          STATUS_COLOR[status],
        )}
      />
    </span>
  )
}
