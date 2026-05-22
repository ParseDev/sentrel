import { router } from "@inertiajs/react"
import { Trash2, X } from "lucide-react"
import { useState } from "react"

interface Props {
  selectedIds: number[]
  onClear: () => void
  deletePath: string
  // Display name in messages: "Delete 3 templates" → noun: "template"
  noun: string
  // Total rows in the filtered dataset (not the current page). When supplied
  // and larger than the current selection, the bar surfaces a "Select all N
  // matching" escalation so users can act across pages in one click.
  totalCount?: number
  // Filter params (q, category, etc.) that scoped the index. Echoed back on
  // bulk_destroy so the backend rebuilds the same scope when select_all=true.
  filterParams?: Record<string, string | undefined>
  // Optional extra actions rendered between delete + clear
  extra?: React.ReactNode
}

// Floating sticky action bar at the bottom of an admin index page.
// Visible whenever ≥1 row is checkboxed. Confirms before destruction.
export default function BulkActionBar({
  selectedIds,
  onClear,
  deletePath,
  noun,
  totalCount,
  filterParams = {},
  extra,
}: Props) {
  const [allMatching, setAllMatching] = useState(false)

  if (selectedIds.length === 0) return null

  const canEscalate = !!totalCount && totalCount > selectedIds.length
  const effectiveCount = allMatching ? (totalCount ?? selectedIds.length) : selectedIds.length

  function destroy() {
    const label = `${effectiveCount} ${noun}${effectiveCount === 1 ? "" : "s"}`
    const message = allMatching
      ? `Delete ${label} matching the current filter — across ALL pages? This can't be undone.`
      : `Delete ${label}? This can't be undone.`
    if (!confirm(message)) return

    const payload = allMatching
      ? { select_all: "true", ...stripEmpty(filterParams) }
      : { ids: selectedIds.map(String) }

    router.post(deletePath, payload, {
      preserveScroll: true,
      onSuccess: () => {
        setAllMatching(false)
        onClear()
      },
    })
  }

  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-lg">
      <span className="text-xs text-muted-foreground">
        {allMatching
          ? `All ${totalCount} matching selected`
          : `${selectedIds.length} selected on this page`}
      </span>
      {canEscalate && (
        <button
          type="button"
          onClick={() => setAllMatching((v) => !v)}
          className="text-xs text-[var(--color-indigo)] hover:underline"
        >
          {allMatching
            ? "Clear all-matching"
            : `Select all ${totalCount} matching`}
        </button>
      )}
      <div className="h-4 w-px bg-border" />
      {extra}
      <button
        onClick={destroy}
        className="flex items-center gap-1 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100"
      >
        <Trash2 className="size-3" /> Delete
      </button>
      <button
        onClick={() => {
          setAllMatching(false)
          onClear()
        }}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        title="Clear selection"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function stripEmpty(obj: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && String(v).length > 0) out[k] = String(v)
  }
  return out
}
