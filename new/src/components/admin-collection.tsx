"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Save } from "lucide-react";

export type AdminField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "email"
    | "url"
    | "date"
    | "number"
    | "checkbox"
    | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

export function AdminCollection({
  table,
  title,
  description,
  fields,
  canCreate = true,
}: {
  table: string;
  title: string;
  description: string;
  fields: AdminField[];
  canCreate?: boolean;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Record<string, unknown> | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/${table}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Unable to load records");
    else setRows(body.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [table]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return rows.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(needle),
    );
  }, [rows, search]);

  function openCreate() {
    const initial: Record<string, unknown> = {};
    fields.forEach(
      (field) => (initial[field.name] = field.type === "checkbox" ? false : ""),
    );
    setEditor(initial);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setError("");
    const method = editor.id !== undefined ? "PUT" : "POST";
    const response = await fetch(`/api/admin/${table}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editor),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Unable to save record");
      return;
    }
    setEditor(null);
    await load();
  }

  async function remove(row: Record<string, unknown>) {
    if (
      !row.id ||
      !window.confirm("Delete this record? This cannot be undone.")
    )
      return;
    const response = await fetch(
      `/api/admin/${table}?id=${encodeURIComponent(String(row.id))}`,
      { method: "DELETE" },
    );
    const body = await response.json();
    if (!response.ok) setError(body.error || "Unable to delete record");
    else await load();
  }

  function displayValue(row: Record<string, unknown>) {
    const priority = fields
      .slice(0, 4)
      .map((field) => row[field.name])
      .filter((value) => value !== "" && value !== null && value !== undefined);
    return priority.length ? String(priority[0]) : "Untitled record";
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
            // manage
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#77847e]">{description}</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 bg-[#00ff91] px-4 font-mono text-[10px] font-bold uppercase text-[#06110b]"
          >
            <Plus size={14} />
            Add new
          </button>
        )}
      </div>

      <div className="mb-4 flex h-11 items-center gap-3 border border-white/[0.07] px-4">
        <Search size={14} className="text-[#77847e]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search"
          placeholder="Search entries..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#77847e]"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 border border-[#ff7b72]/25 bg-[#ff7b72]/[0.05] px-4 py-3 text-sm text-[#ff9a92]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-6 font-mono text-xs text-[#77847e]">
          Loading records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-6">
          <p className="font-semibold">No records found</p>
          <p className="mt-2 text-sm text-[#77847e]">
            Create a record or configure Supabase to load existing CMS data.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((row, index) => (
            <article
              key={String(row.id ?? index)}
              className="glass-panel flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{displayValue(row)}</p>
                <p className="mt-1 font-mono text-[10px] text-[#77847e]">
                  {fields
                    .filter(
                      (field) =>
                        row[field.name] !== undefined &&
                        row[field.name] != "" &&
                        field.type !== "textarea",
                    )
                    .slice(0, 3)
                    .map(
                      (field) => `${field.label}: ${String(row[field.name])}`,
                    )
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setEditor({ ...row })}
                  aria-label="Edit"
                  className="grid size-9 place-items-center border border-white/[0.08] text-[#9ba8a1] hover:border-[#00ff91]/40 hover:text-[#00ff91]"
                >
                  <Pencil size={14} />
                </button>
                {row.id !== undefined && (
                  <button
                    onClick={() => void remove(row)}
                    aria-label="Delete"
                    className="grid size-9 place-items-center border border-white/[0.08] text-[#9ba8a1] hover:border-[#ff7b72]/40 hover:text-[#ff7b72]"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editor && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-white/[0.09] bg-[#101915] p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase text-[#00ff91]">
                  Record editor
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {editor.id !== undefined ? "Edit record" : "Create record"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditor(null)}
                aria-label="Close"
                className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const value = editor[field.name];
                if (field.type === "checkbox")
                  return (
                    <label
                      key={field.name}
                      className="flex h-12 items-center gap-3 border border-white/[0.08] px-4 font-mono text-[10px] uppercase text-[#9ba8a1]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            [field.name]: event.target.checked,
                          })
                        }
                      />
                      {field.label}
                    </label>
                  );
                if (field.type === "textarea")
                  return (
                    <label key={field.name} className="sm:col-span-2">
                      <span className="mb-2 block font-mono text-[10px] uppercase text-[#77847e]">
                        {field.label}
                      </span>
                      <textarea
                        required={field.required}
                        value={String(value ?? "")}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            [field.name]: event.target.value,
                          })
                        }
                        rows={5}
                        placeholder={field.placeholder}
                        className="w-full resize-y border border-white/[0.08] bg-black/10 p-4 text-sm outline-none focus:border-[#00ff91]/40"
                      />
                    </label>
                  );
                if (field.type === "select")
                  return (
                    <label key={field.name}>
                      <span className="mb-2 block font-mono text-[10px] uppercase text-[#77847e]">
                        {field.label}
                      </span>
                      <select
                        required={field.required}
                        value={String(value ?? "")}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            [field.name]: event.target.value,
                          })
                        }
                        className="h-12 w-full border border-white/[0.08] bg-[#101915] px-3 text-sm outline-none"
                      >
                        <option value="">Select...</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                return (
                  <label key={field.name}>
                    <span className="mb-2 block font-mono text-[10px] uppercase text-[#77847e]">
                      {field.label}
                    </span>
                    <input
                      required={field.required}
                      type={field.type ?? "text"}
                      value={String(value ?? "")}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          [field.name]: event.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                      className="h-12 w-full border border-white/[0.08] bg-black/10 px-4 text-sm outline-none focus:border-[#00ff91]/40"
                    />
                  </label>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="h-11 px-4 font-mono text-[10px] uppercase text-[#77847e]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 bg-[#00ff91] px-5 font-mono text-[10px] font-bold uppercase text-[#06110b]"
              >
                <Save size={14} />
                Save record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
