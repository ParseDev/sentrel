import { router } from "@inertiajs/react"
import { Trash2, X } from "lucide-react"

interface Props {
  selectedIds: number[]
  onClear: () => void
  deletePath: string
  // Display name in messages: "Delete 3 templates" → noun: "template"
  noun: string
  // Optional extra actions rendered between delete + clear
  extra?: React.ReactNode
}

// Floating sticky action bar at the bottom of an admin index page.
// Visible whenever ≥1 row is checkboxed. Confirms before destruction.
export default function BulkActionBar({ selectedIds, onClear, deletePath, noun, extra }: Props) {
  if (selectedIds.length === 0) return null

  function destroy() {
    if (!confirm(`Delete ${selectedIds.length} ${noun}${selectedIds.length === 1 ? "" : "s"}? This can't be undone.`)) return
    router.post(deletePath, { ids: selectedIds }, {
      preserveScroll: true,
      onSuccess: onClear,
    })
  }

  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-lg">
      <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
      <div className="h-4 w-px bg-border" />
      {extra}
      <button
        onClick={destroy}
        className="flex items-center gap-1 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100"
      >
        <Trash2 className="size-3" /> Delete
      </button>
      <button
        onClick={onClear}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        title="Clear selection"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
