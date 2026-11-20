import { Plus, Search } from "lucide-react";

export function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
            // manage
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        </div>
        <button
          disabled
          className="inline-flex h-10 items-center gap-2 bg-[#00ff91]/20 px-4 font-mono text-[10px] uppercase text-[#77847e]"
        >
          <Plus size={14} />
          Add new
        </button>
      </div>
      <div className="mb-4 flex h-11 items-center gap-3 border border-white/[0.07] px-4">
        <Search size={14} className="text-[#77847e]" />
        <input
          disabled
          aria-label="Search"
          placeholder="Search entries..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#77847e]"
        />
      </div>
      <div className="glass-panel min-h-64 p-6">
        <p className="font-semibold">CMS collection ready</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77847e]">
          {description} Configure Supabase, add an administrator authorization
          row, then the collection will connect to database CRUD.
        </p>
      </div>
    </div>
  );
}
