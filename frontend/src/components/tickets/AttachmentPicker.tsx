import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { ATTACHMENT_LIMITS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format";

/**
 * Attachment UI. Files are validated and listed here, but only their metadata is sent —
 * actual upload/storage is out of scope for this version (documented in the README).
 */
export function AttachmentPicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (file.size > ATTACHMENT_LIMITS.maxBytes) {
        setError(`"${file.name}" is larger than 10 MB.`);
        continue;
      }
      if (next.length >= ATTACHMENT_LIMITS.maxFiles) {
        setError(`You can attach up to ${ATTACHMENT_LIMITS.maxFiles} files.`);
        break;
      }
      next.push(file);
    }
    onChange(next);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setError(null);
          addFiles(event.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center transition hover:border-brand-500 hover:bg-brand-50/40"
      >
        <Paperclip className="size-5 text-muted" />
        <p className="mt-1.5 text-sm text-ink">
          <span className="font-medium text-brand-700">Choose files</span> or drag them here
        </p>
        <p className="text-xs text-muted">Screenshots, photos of print defects, statements · up to 3 files, 10 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept="image/*,.pdf,.doc,.docx,.xlsx,.csv"
          onChange={(event) => {
            setError(null);
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
              <span className="truncate">
                {file.name} <span className="text-xs text-muted">· {formatFileSize(file.size)}</span>
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
