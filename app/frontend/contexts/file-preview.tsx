"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { FileText, ExternalLinkIcon, DownloadIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

export interface PreviewableFile {
  url: string
  filename: string
  contentType: string
  // Optional — when supplied, the file is a local Blob/File and the provider
  // owns the URL.createObjectURL lifecycle (revoked on close so the browser
  // can free the bytes).
  ownedObjectUrl?: boolean
}

interface FilePreviewContextValue {
  open: (file: PreviewableFile | File) => void
  close: () => void
}

const FilePreviewContext = createContext<FilePreviewContextValue | null>(null)

export function useFilePreview(): FilePreviewContextValue {
  const ctx = useContext(FilePreviewContext)
  if (!ctx) throw new Error("useFilePreview must be used inside <FilePreviewProvider>")
  return ctx
}

export function useFilePreviewOptional(): FilePreviewContextValue | null {
  return useContext(FilePreviewContext)
}

function isFile(value: PreviewableFile | File): value is File {
  return typeof File !== "undefined" && value instanceof File
}

export function FilePreviewProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PreviewableFile | null>(null)
  // Track blob URLs we created so close() can revoke them.
  const ownedRef = useRef<string | null>(null)

  const close = useCallback(() => {
    if (ownedRef.current) {
      try { URL.revokeObjectURL(ownedRef.current) } catch { /* noop */ }
      ownedRef.current = null
    }
    setCurrent(null)
  }, [])

  const open = useCallback((value: PreviewableFile | File) => {
    if (ownedRef.current) {
      try { URL.revokeObjectURL(ownedRef.current) } catch { /* noop */ }
      ownedRef.current = null
    }
    if (isFile(value)) {
      const url = URL.createObjectURL(value)
      ownedRef.current = url
      setCurrent({
        url,
        filename: value.name,
        contentType: value.type || "application/octet-stream",
        ownedObjectUrl: true,
      })
    } else {
      setCurrent(value)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (ownedRef.current) {
        try { URL.revokeObjectURL(ownedRef.current) } catch { /* noop */ }
      }
    }
  }, [])

  return (
    <FilePreviewContext.Provider value={{ open, close }}>
      {children}
      <Sheet open={!!current} onOpenChange={(o) => { if (!o) close() }}>
        <SheetContent
          side="right"
          className="w-full p-0 sm:max-w-2xl flex flex-col gap-0"
        >
          {current && (
            <>
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="truncate pr-8 text-sm">{current.filename}</SheetTitle>
                <SheetDescription className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {current.contentType || "file"}
                  </span>
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLinkIcon className="size-3" /> Open
                  </a>
                  <a
                    href={current.url}
                    download={current.filename}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <DownloadIcon className="size-3" /> Download
                  </a>
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-auto bg-muted/20">
                <PreviewBody {...current} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </FilePreviewContext.Provider>
  )
}

function PreviewBody({ url, filename, contentType }: PreviewableFile) {
  const lower = (filename || "").toLowerCase()
  const ct = (contentType || "").toLowerCase()

  if (ct.startsWith("image/")) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <img src={url} alt={filename} className="max-h-full max-w-full object-contain rounded-md" />
      </div>
    )
  }

  if (ct === "application/pdf" || lower.endsWith(".pdf")) {
    return (
      <iframe
        src={url}
        title={filename}
        className="size-full border-0"
      />
    )
  }

  if (ct.startsWith("text/") || ct === "application/json" || lower.endsWith(".md") || lower.endsWith(".csv")) {
    return (
      <iframe
        src={url}
        title={filename}
        className="size-full border-0 bg-background"
      />
    )
  }

  if (ct.startsWith("video/")) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <video src={url} controls className="max-h-full max-w-full" />
      </div>
    )
  }

  if (ct.startsWith("audio/")) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <audio src={url} controls />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      <FileText className="size-12" />
      <div>
        <div className="font-medium text-foreground">{filename}</div>
        <div className="text-xs">{contentType || "Unknown type"}</div>
      </div>
      <p className="text-xs">No inline preview available — open or download to view.</p>
    </div>
  )
}
