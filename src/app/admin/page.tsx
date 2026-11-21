"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import {
  FolderKanban,
  FileText,
  Award,
  Layers3,
  Mail,
  Clock3,
  Images,
  UserRound,
  Settings,
  ShieldAlert,
  FlaskConical,
  BookOpen,
} from "lucide-react";

const statTables: { label: string; key: string; filter?: string; Icon: React.ElementType }[] = [
  { label: "Total projects", key: "projects", Icon: FolderKanban },
  { label: "Published projects", key: "projects", filter: "published", Icon: FileText },
  { label: "Draft projects", key: "projects", filter: "draft", Icon: FolderKanban },
  { label: "Writeups", key: "writeups", Icon: FileText },
  { label: "Published writeups", key: "writeups", filter: "published", Icon: BookOpen },
  { label: "Certifications", key: "certifications", Icon: Award },
  { label: "Skills", key: "skills", Icon: Layers3 },
  { label: "Timeline entries", key: "timeline_entries", Icon: Clock3 },
  { label: "Social links", key: "social_links", Icon: Images },
  { label: "Contact messages", key: "contact_messages", Icon: Mail },
  { label: "Lab entries", key: "lab_entries", Icon: FlaskConical },
  { label: "Media assets", key: "media_assets", Icon: Images },
];

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setConnected(true);

    const fetchCounts = async () => {
      const results: Record<string, number> = {};
      await Promise.all(
        statTables.map(async ({ key, filter }) => {
          let query = supabase
            .from(key)
            .select("*", { count: "exact", head: true });
          if (filter === "published" && key === "projects") {
            query = query.eq("status", "published");
          } else if (filter === "draft" && key === "projects") {
            query = query.eq("status", "draft");
          } else if (filter === "published" && key === "writeups") {
            query = query.eq("status", "published");
          }
          const { count, error } = await query;
          if (!error) {
            results[key] = count ?? 0;
          }
        }),
      );
      setCounts(results);
      setLoading(false);
    };

    void fetchCounts();
  }, []);

  const cards = statTables.map(({ label, key, Icon }) => {
    const Component = Icon as React.ElementType;
    const value = counts[key] ?? (loading ? 0 : 0);
    return (
      <article
        key={String(label)}
        className="glass-panel p-5"
      >
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase text-[#77847e]">
            {String(label)}
          </p>
          <Component size={16} className="text-[#00ff91]" />
        </div>
        <p className="mt-5 text-3xl font-semibold">
          {loading ? "–" : String(value)}
        </p>
      </article>
    );
  });

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
          // overview
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Content dashboard
        </h1>
        <p className="mt-2 text-sm text-[#77847e]">
          Real-time statistics from your Supabase CMS. All counts reflect
          current database state.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards}
      </div>
      <section className="glass-panel mt-5 p-6">
        <h2 className="font-mono text-xs uppercase text-[#00ff91]">
          System status
        </h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#77847e]">Supabase connection</span>
            <span
              className={`font-mono text-[10px] ${connected ? "text-[#00ff91]" : "text-[#ff7b72]"}`}
            >
              {connected ? "Connected" : "Not configured"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#77847e]">Authorization</span>
            <span className="font-mono text-[10px] text-[#00ff91]">
              RLS + admin_users enforced
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#77847e]">Static export</span>
            <span className="font-mono text-[10px] text-[#00ff91]">
              GitHub Pages compatible
            </span>
          </div>
        </div>
      </section>
      <section className="glass-panel mt-5 p-6">
        <h2 className="font-mono text-xs uppercase text-[#00ff91]">
          Quick actions
        </h2>
        <p className="mt-2 text-sm text-[#77847e]">
          Select a content area from the sidebar to create, edit, or manage
          CMS records.
        </p>
      </section>
    </div>
  );
}
