"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { uploadProblemReportImage } from "@/lib/actions/problem-report-actions";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { MAX_PROBLEM_REPORT_ATTACHMENTS } from "@/lib/problem-report-attachments";
import { shrinkScreenshotForUpload } from "@/lib/components/portrait/resize-image";

export function useReportAttachments() {
  const [urls, setUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function add(file: File) {
    if (urls.length >= MAX_PROBLEM_REPORT_ATTACHMENTS) {
      toast.error(`Не більше ${MAX_PROBLEM_REPORT_ATTACHMENTS} картинок`);
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadShrunk(file);
      if (url) setUrls((previous) => [...previous, url]);
    } finally {
      setIsUploading(false);
    }
  }

  const remove = (url: string) => setUrls((previous) => previous.filter((candidate) => candidate !== url));
  const clear = () => setUrls([]);

  return { urls, isUploading, add, remove, clear };
}

async function uploadShrunk(file: File): Promise<string | null> {
  try {
    const shrunk = await shrinkScreenshotForUpload(file);
    if (shrunk.size > MAX_IMAGE_UPLOAD_BYTES) {
      toast.error("Картинка завелика навіть після стискання");
      return null;
    }
    const formData = new FormData();
    formData.append("file", shrunk, "screenshot.webp");
    const result = await uploadProblemReportImage(formData);
    if (!result.success) {
      toast.error(result.error);
      return null;
    }
    return result.url;
  } catch {
    toast.error("Не вдалося прочитати картинку");
    return null;
  }
}

type Props = { attachments: ReturnType<typeof useReportAttachments>; disabled?: boolean };

export function ReportAttachments({ attachments, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = !disabled && !attachments.isUploading && attachments.urls.length < MAX_PROBLEM_REPORT_ATTACHMENTS;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {attachments.urls.map((url) => (
        <AttachmentThumbnail key={url} url={url} onRemove={() => attachments.remove(url)} />
      ))}
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-16 items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 text-xs text-slate-300 transition hover:border-white/40 hover:text-slate-100 disabled:opacity-50"
      >
        <ImagePlus className="h-4 w-4" />
        {attachments.isUploading ? "Завантаження…" : "Додати скріншот"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_MIME_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void attachments.add(file);
        }}
      />
    </div>
  );
}

function AttachmentThumbnail({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Прибрати картинку"
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950/80 text-slate-200 hover:bg-slate-900"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
