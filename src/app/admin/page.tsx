"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { FolderKanban, FileText, Award, Layers3, Mail } from "lucide-react";

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) return;
    setConnected(true);
    void Promise.all(
      [
        "projects",
        "writeups",
        "certifications",
        "skills",
        "contact_messages",
      ].map(async (table) => {
        const { count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        return [table, count ?? 0] as const;
      }),
    ).then((results) => setCounts(Object.fromEntries(results)));
  }, []);

  const cards = [
    ["Total projects", String(counts.projects ?? 0), FolderKanban],
    [
      "Published projects",
      String(counts.projects ? counts.projects : 0),
      FileText,
    ],
    ["Draft projects", "0", FolderKanban],
    ["Writeups", String(counts.writeups ?? 0), FileText],
    ["Certifications", String(counts.certifications ?? 0), Award],
    ["Skills", String(counts.skills ?? 0), Layers3],
    ["Messages", String(counts.contact_messages ?? 0), Mail],
  ];
  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
          // overview
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Content dashboard</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => {
          const Component = Icon as React.ElementType;
          return (
            <article key={String(label)} className="glass-panel p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase text-[#77847e]">
                  {String(label)}
                </p>
                <Component size={16} className="text-[#00ff91]" />
              </div>
              <p className="mt-5 text-3xl font-semibold">{String(value)}</p>
            </article>
          );
        })}
      </div>
      <section className="glass-panel mt-5 p-6">
        <h2 className="font-mono text-xs uppercase text-[#00ff91]">
          Recent changes
        </h2>
        <p className="mt-4 text-sm text-[#77847e]">
          {connected
            ? "CMS records are connected to Supabase."
            : "Configure Supabase environment variables to connect CMS records."}
        </p>
      </section>
    </div>
  );
}
