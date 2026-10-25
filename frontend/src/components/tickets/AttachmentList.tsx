import { Download, Paperclip } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";
import { API_BASE_URL } from "@/store/api/baseApi";
import type { Attachment } from "@/types/api";

/** Downloadable file chips. The API checks access, so links work only for the ticket's author and admins. */
export function AttachmentList({
  ticketId,
  attachments,
  className,
}: {
  ticketId: string;
  attachments: Attachment[];
  className?: string;
}) {
  if (!attachments.length) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((file, index) => {
        const label = (
          <>
            <Paperclip className="size-3 shrink-0" />
            <span className="max-w-56 truncate">{file.fileName}</span>
            <span className="text-muted">· {formatFileSize(file.fileSize)}</span>
          </>
        );

        return (
          <li key={file.id ?? `${file.fileName}-${index}`}>
            {file.id ? (
              <a
                href={`${API_BASE_URL}/tickets/${ticketId}/attachments/${file.id}`}
                download={file.fileName}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink transition hover:border-brand-200 hover:bg-brand-50"
              >
                {label}
                <Download className="size-3 text-brand-700" />
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-muted"
                title="This file was not stored"
              >
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
