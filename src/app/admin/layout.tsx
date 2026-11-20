"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/admin-guard";
import {
  LayoutDashboard,
  FolderKanban,
  Layers3,
  FileBadge,
  BookOpen,
  FlaskConical,
  Clock3,
  Mail,
  Images,
  Settings,
  UserRound,
  Sun,
  Moon,
} from "lucide-react";
import { AdminLogout } from "@/components/admin-logout";
import { useEffect, useState } from "react";

const links = [
  ["Overview", "/admin", LayoutDashboard],
  ["Projects", "/admin/projects", FolderKanban],
  ["Skills", "/admin/skills", Layers3],
  ["Certifications", "/admin/certifications", FileBadge],
  ["Writeups", "/admin/writeups", BookOpen],
  ["Labs", "/admin/labs", FlaskConical],
  ["Timeline", "/admin/timeline", Clock3],
  ["Messages", "/admin/messages", Mail],
  ["Media", "/admin/media", Images],
  ["Content", "/admin/content", UserRound],
  ["Settings", "/admin/settings", Settings],
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const normalizedPath =
    (pathname || "/").replace(/^\/new-repo(?=\/|$)/, "").replace(/\/+$/, "") ||
    "/";
  if (
    normalizedPath === "/admin/login" ||
    normalizedPath === "/admin/reset-password"
  ) {
    return <>{children}</>;
  }

  return <AdminGuard>{<AdminShell>{children}</AdminShell>}</AdminGuard>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("admin-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("admin-theme", next);
  }

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === "light" ? "dark" : "light");
    root.classList.add(theme === "dark" ? "dark" : "light");
    return () => root.classList.remove("dark", "light");
  }, [theme]);

  return (
    <div
      data-admin-theme={theme}
      className="admin-dashboard min-h-screen lg:grid lg:grid-cols-[240px_1fr]"
    >
      <aside className="border-b border-white/[0.07] bg-[#0d1310] lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-[72px] items-center border-b border-white/[0.07] px-5">
          <Link
            href="/admin"
            className="font-mono text-sm font-semibold text-[#00ff91]"
          >
            ABHISHEK / CMS
          </Link>
        </div>
        <nav className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-3 lg:grid-cols-1 lg:p-4">
          {links.map(([label, href, Icon]) => {
            const Component = Icon as React.ElementType;
            return (
              <Link
                key={String(href)}
                href={String(href)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-[11px] text-[#9ba8a1] transition hover:bg-[#00ff91]/[0.06] hover:text-[#00ff91]"
              >
                <Component size={15} />
                {String(label)}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="min-w-0">
        <header className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5 lg:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#77847e]">
            Private administration
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              title={theme === "dark" ? "Light theme" : "Dark theme"}
              className="grid size-9 place-items-center border border-white/[0.08] text-[#9ba8a1] transition hover:border-[#00ff91]/40 hover:text-[#00ff91]"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <AdminLogout />
          </div>
        </header>
        <div className="p-5 lg:p-8">{children}</div>
      </section>
    </div>
  );
}
