"use client";

import { useEffect, useState, type FC } from "react";
import { XIcon, PlusIcon, FileText } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAuiState,
  useAui,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { useFilePreviewOptional } from "@/contexts/file-preview";
import { cn } from "@/lib/utils";

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const src = s.attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

// Read the underlying File for the current attachment (any type — the legacy
// useAttachmentSrc only returned it for images). Used to feed the side-panel
// preview with a fresh-sent file blob.
function useAttachmentFile(): File | undefined {
  return useAuiState((s) => (s.attachment as { file?: File }).file);
}

const AttachmentThumb: FC = () => {
  const src = useAttachmentSrc();

  return (
    <Avatar className="aui-attachment-tile-avatar h-full w-full rounded-none">
      <AvatarImage
        src={src}
        alt="Attachment preview"
        className="aui-attachment-tile-image object-cover"
      />
      <AvatarFallback>
        <FileText className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";

  const isImage = useAuiState((s) => s.attachment.type === "image");
  const filename = useAuiState((s) => s.attachment.name as string | undefined);

  const status = useAuiState(
    useShallow((s) => s.attachment.status),
  );
  const isUploading = status?.type === "running";
  const uploadProgress = isUploading && "progress" in status
    ? Math.min(1, Math.max(0, status.progress))
    : 0;
  const isError = status?.type === "incomplete" && (status as { reason?: string }).reason === "error";

  // Both images and document chips open in the global side-panel previewer
  // (PDFs render inline via iframe, images full-size, etc.). Falls back to
  // nothing if no <FilePreviewProvider> is mounted upstream.
  const previewer = useFilePreviewOptional();
  const file = useAttachmentFile();
  const handleOpen = () => {
    if (isUploading || isError || !previewer) return;
    if (file) previewer.open(file);
  };

  if (isImage) {
    return (
      <AttachmentPrimitive.Root className="aui-attachment-root relative aui-attachment-root-composer only:*:first:size-24">
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            "aui-attachment-tile relative size-14 cursor-pointer overflow-hidden rounded-[calc(var(--composer-radius)-var(--composer-padding))] border bg-muted transition-opacity hover:opacity-75",
            isError && "border-destructive",
          )}
          aria-label={filename || "Image attachment"}
          title={filename}
        >
          <AttachmentThumb />
          {isUploading && <UploadOverlay progress={uploadProgress} />}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/15">
              <XIcon className="size-4 text-destructive" />
            </div>
          )}
        </button>
        {isComposer && !isUploading && <AttachmentRemove />}
      </AttachmentPrimitive.Root>
    );
  }

  // Document / file chip — matches the reload-restored card rendered by
  // markdown-text.tsx so freshly-sent and historical attachments look the
  // same. PDF badge, filename, "Click to open" subtitle.
  const isPdf = (filename || "").toLowerCase().endsWith(".pdf") ||
    (filename || "").toLowerCase().includes(".pdf");

  return (
    <AttachmentPrimitive.Root className="aui-attachment-root relative">
      <button
        type="button"
        onClick={handleOpen}
        disabled={isUploading || isError}
        className={cn(
          "aui-attachment-chip group relative inline-flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-xs no-underline hover:border-[var(--border-strong)] transition-colors max-w-[320px] disabled:cursor-default",
          isError && "border-destructive",
          isUploading && "opacity-90",
        )}
        aria-label={filename || "Attachment"}
        title={filename}
      >
        <div className="relative shrink-0 flex size-9 items-center justify-center rounded-md bg-muted">
          {isUploading ? (
            <svg className="size-7 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" strokeWidth="3" className="stroke-muted-foreground/25" />
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 13}`}
                strokeDashoffset={`${2 * Math.PI * 13 * (1 - uploadProgress)}`}
                strokeLinecap="round"
                className="stroke-foreground transition-all duration-150"
              />
            </svg>
          ) : isError ? (
            <XIcon className="size-4 text-destructive" />
          ) : isPdf ? (
            <span className="text-[9px] font-semibold tracking-wider text-red-500">PDF</span>
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5 text-left">
          <div className="block truncate font-medium text-foreground/90">
            {filename || <AttachmentPrimitive.Name />}
          </div>
          <div className="block text-[10px] text-muted-foreground mt-0.5">
            {isUploading
              ? `Uploading ${Math.round(uploadProgress * 100)}%`
              : isError
              ? "Upload failed"
              : "Click to preview"}
          </div>
        </div>
      </button>
      {isComposer && !isUploading && <AttachmentRemove />}
    </AttachmentPrimitive.Root>
  );
};

// Image-tile upload progress overlay (extracted so both image and the chip
// fallback can share the rendering).
const UploadOverlay: FC<{ progress: number }> = ({ progress }) => (
  <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
    <div className="relative size-7">
      <svg className="size-7 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="13" fill="none" strokeWidth="3" className="stroke-muted-foreground/25" />
        <circle
          cx="16"
          cy="16"
          r="13"
          fill="none"
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 13}`}
          strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress)}`}
          strokeLinecap="round"
          className="stroke-foreground transition-all duration-150"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium tabular-nums">
        {Math.round(progress * 100)}
      </span>
    </div>
  </div>
);

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
      <TooltipIconButton
        tooltip="Remove file"
        className="aui-attachment-tile-remove absolute top-1.5 right-1.5 size-3.5 rounded-full bg-white text-muted-foreground opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black hover:[&_svg]:text-destructive"
        side="top"
      >
        <XIcon className="aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" />
      </TooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
      <MessagePrimitive.Attachments>
        {() => <AttachmentUI />}
      </MessagePrimitive.Attachments>
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div className="aui-composer-attachments flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden">
      <ComposerPrimitive.Attachments>
        {() => <AttachmentUI />}
      </ComposerPrimitive.Attachments>
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  return (
    <ComposerPrimitive.AddAttachment asChild>
      <TooltipIconButton
        tooltip="Add Attachment"
        side="bottom"
        variant="ghost"
        size="icon"
        className="aui-composer-add-attachment size-8 rounded-full p-1 font-semibold text-xs hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
        aria-label="Add Attachment"
      >
        <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
};
