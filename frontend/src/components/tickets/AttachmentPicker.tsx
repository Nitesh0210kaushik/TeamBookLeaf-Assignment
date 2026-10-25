import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { ATTACHMENT_LIMITS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format";

function rejectionFor(file: File, count: number) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ATTACHMENT_LIMITS.extensions.includes(extension)) {
    return `"${file.name}" isn't supported. Use ${ATTACHMENT_LIMITS.label}.`;
  }
  if (file.size > ATTACHMENT_LIMITS.maxBytes) return `"${file.name}" is larger than 10 MB.`;
  if (count >= ATTACHMENT_LIMITS.maxFiles) {
    return `You can attach up to ${ATTACHMENT_LIMITS.maxFiles} files.`;
  }
  return null;
}

/** File picker with drag and drop. `compact` renders a small button for reply boxes. */
export function AttachmentPicker({
  files,
  onChange,
  compact = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    let firstError: string | null = null;
    for (const file of Array.from(incoming)) {
      const rejection = rejectionFor(file, next.length);
      if (rejection) firstError ??= rejection;
      else next.push(file);
    }
    setError(firstError);
    onChange(next);
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      {compact ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={files.length >= ATTACHMENT_LIMITS.maxFiles}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip className="size-4" /> Attach files
        </button>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center transition outline-none hover:border-brand-500 hover:bg-brand-50/40 focus-visible:ring-3 focus-visible:ring-brand-200"
        >
          <Paperclip className="size-5 text-muted" />
          <p className="mt-1.5 text-sm text-ink">
            <span className="font-medium text-brand-700">Choose files</span> or drag them here
          </p>
          <p className="text-xs text-muted">
            {ATTACHMENT_LIMITS.label} · up to {ATTACHMENT_LIMITS.maxFiles} files, 10 MB each
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ATTACHMENT_LIMITS.accept}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-1.5 text-sm"
            >
              <span className="truncate">
                {file.name}{" "}
                <span className="text-xs text-muted">· {formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="rounded p-1 text-muted hover:bg-slate-100 hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
