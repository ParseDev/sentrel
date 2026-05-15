import { usePage } from "@inertiajs/react"
import { useEffect } from "react"
import { toast } from "sonner"

interface FlashData {
  success?: string
  error?: string
}

export function useFlash() {
  const { flash } = usePage<{ flash: FlashData }>().props

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (flash?.success) toast.success(flash.success)
      if (flash?.error) toast.error(flash.error)
    }, 0)
    return () => clearTimeout(timeout)
  }, [flash])
}
