"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Save } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

const ALLOWED_TABLES = new Set([
  "profile",
  "site_sections",
  "skill_categories",
  "skills",
  "projects",
  "project_images",
  "writeups",
  "certifications",
  "lab_entries",
  "timeline_entries",
  "social_links",
  "media_assets",
  "contact_messages",
  "site_settings",
]);

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
  const supabase = createSupabaseBrowser();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Record<string, unknown> | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    if (!ALLOWED_TABLES.has(table)) {
      setError("Invalid collection");
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured");
      setLoading(false);
      return;
    }
    let query = supabase.from(table).select("*").limit(500);
    const orderedTables = new Set([
      "site_sections",
      "skill_categories",
      "skills",
      "projects",
      "project_images",
      "writeups",
      "certifications",
      "lab_entries",
      "timeline_entries",
      "social_links",
    ]);
    if (orderedTables.has(table))
      query = query.order("display_order", {
        ascending: true,
        nullsFirst: false,
      });
    if (table === "projects" || table === "writeups")
      query = query.order("updated_at", { ascending: false });
    const { data, error: queryError } = await query;
    if (queryError) setError(queryError.message);
    else {
      const loadedRows = data ?? [];
      if (loadedRows.length === 0 && table === "profile") {
        setRows([
          {
            id: 1,
            name: "ABHISHEK",
            title: "Cybersecurity Fresher",
            introduction: "",
            biography: "",
            objective: "",
            learning_focus: "",
            profile_image: null,
            resume_url: null,
            availability: null,
          },
        ]);
      } else if (loadedRows.length === 0 && table === "site_settings") {
        setRows([
          {
            id: 1,
            site_name: "Abhishek",
            terminal_welcome: "Welcome to abhishek.security",
            terminal_enabled_commands: [
              "help",
              "whoami",
              "about",
              "skills",
              "projects",
              "contact",
              "clear",
            ],
            contact_email: null,
            public_email_visible: true,
            seo_title: null,
            seo_description: null,
            og_image: null,
          },
        ]);
      } else {
        setRows(loadedRows);
      }
    }
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
    if (!ALLOWED_TABLES.has(table)) {
      setError("Invalid collection");
      return;
    }
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }
    const allowed = Object.fromEntries(
      Object.entries(editor)
        .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))
        .slice(0, 40),
    );
    if (Object.keys(allowed).length === 0) {
      setError("No valid fields");
      return;
    }
    const mutation =
      table === "profile" || table === "site_settings"
        ? supabase
            .from(table)
            .upsert({ id: 1, ...allowed }, { onConflict: "id" })
        : editor.id !== undefined
          ? supabase.from(table).update(allowed).eq("id", editor.id)
          : supabase.from(table).insert(allowed);
    const { error: mutationError } = await mutation;
    if (mutationError) {
      setError(mutationError.message);
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
    if (!ALLOWED_TABLES.has(table)) {
      setError("Invalid collection");
      return;
    }
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }
    if (table === "media_assets") {
      const { data: asset } = await supabase
        .from("media_assets")
        .select("storage_path")
        .eq("id", row.id)
        .single();
      if (asset?.storage_path)
        await supabase.storage
          .from("portfolio-media")
          .remove([asset.storage_path]);
    }
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", row.id);
    if (deleteError) setError(deleteError.message);
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
                  className="inline-flex h-9 items-center gap-2 border border-white/[0.08] px-3 font-mono text-[10px] uppercase text-[#9ba8a1] hover:border-[#00ff91]/40 hover:text-[#00ff91]"
                >
                  <Pencil size={14} />
                  Edit
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
                        placeholder={field.placeholder}
                        className="min-h-[120px] w-full rounded-md border border-white/[0.08] bg-[#0a0f0c] p-4 font-mono text-sm placeholder:text-[#77847e] focus:ring-1 focus:ring-[#00ff91]/30"
                      />
                    </label>
                  );
                return (
                  <label key={field.name}>
                    <span className="mb-2 block font-mono text-[10px] uppercase text-[#77847e]">
                      {field.label}
                    </span>
                    {field.type === "select" ? (
                      <select
                        value={String(value ?? "")}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            [field.name]: event.target.value,
                          })
                        }
                        required={field.required}
                        className="block w-full rounded-md border border-white/[0.08] bg-[#0a0f0c] p-3 font-mono text-sm text-[#e1e1e1] placeholder:text-[#77847e] focus:ring-1 focus:ring-[#00ff91]/30"
                      >
                        <option value="" disabled>
                          {field.placeholder ?? "Select an option"}
                        </option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          field.type === "email"
                            ? "email"
                            : field.type === "url"
                              ? "url"
                              : field.type === "date"
                                ? "date"
                                : "text"
                        }
                        value={String(value ?? "")}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            [field.name]: event.target.value,
                          })
                        }
                        required={field.required}
                        placeholder={field.placeholder}
                        className="block w-full rounded-md border border-white/[0.08] bg-[#0a0f0c] p-3 font-mono text-sm placeholder:text-[#77847e] focus:ring-1 focus:ring-[#00ff91]/30"
                      />
                    )}
                  </label>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-[#00ff91]/10 px-4 font-mono text-sm text-[#00ff91] transition-colors hover:bg-[#00ff91]/20"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#00ff91] px-4 font-mono text-sm text-[#06110b] transition-colors hover:bg-[#00ff91]/90"
              >
                <Save size={16} />
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
