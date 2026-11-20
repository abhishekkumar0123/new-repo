"use client";

import { useEffect, useState } from "react";
import { Upload, Trash2, ImageIcon } from "lucide-react";

type Media = {
  id: string;
  name: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
};

export default function Page() {
  const [rows, setRows] = useState<Media[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/media_assets", {
      cache: "no-store",
    });
    const body = await response.json();
    if (response.ok) setRows(body.data ?? []);
    else setError(body.error || "Unable to load media");
  }
  useEffect(() => {
    void load();
  }, []);

  async function upload(file?: File) {
    if (!file) return;
    setLoading(true);
    setError("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/media", {
      method: "POST",
      body: form,
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(body.error || "Upload failed");
      return;
    }
    await load();
  }
  async function remove(row: Media) {
    if (!window.confirm("Delete this media asset? This cannot be undone."))
      return;
    const response = await fetch(
      `/api/admin/media_assets?id=${encodeURIComponent(row.id)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
          // media library
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Images &amp; documents</h1>
        <p className="mt-2 text-sm text-[#77847e]">
          JPG, PNG, WebP images and PDF resumes up to 10 MB.
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 border border-[#ff7b72]/25 px-4 py-3 text-sm text-[#ff7b72]"
        >
          {error}
        </div>
      )}
      <label className="mb-6 flex h-32 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-[#00ff91]/30 bg-[#00ff91]/[0.03] font-mono text-xs text-[#9ba8a1]">
        <Upload size={20} className="text-[#00ff91]" />
        <span>{loading ? "Uploading..." : "Choose file to upload"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => void upload(event.target.files?.[0])}
          className="hidden"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="glass-panel overflow-hidden">
            <div className="grid h-44 place-items-center border-b border-white/[0.07] bg-black/10">
              {row.mime_type?.startsWith("image/") && row.public_url ? (
                <img
                  src={row.public_url}
                  alt={row.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="text-[#00ff91]/40" size={48} />
              )}
            </div>
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <p className="mt-1 font-mono text-[9px] uppercase text-[#77847e]">
                  {row.mime_type} ·{" "}
                  {Math.max(1, Math.round(row.size_bytes / 1024))} KB
                </p>
              </div>
              <button
                onClick={() => void remove(row)}
                aria-label="Delete"
                className="grid size-9 shrink-0 place-items-center border border-white/[0.08] text-[#77847e] hover:text-[#ff7b72]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
