import Link from "next/link";
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
} from "lucide-react";
import { AdminLogout } from "@/components/admin-logout";

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
  return (
    <div className="min-h-screen bg-[#090c0b] lg:grid lg:grid-cols-[240px_1fr]">
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
          <AdminLogout />
        </header>
        <div className="p-5 lg:p-8">{children}</div>
      </section>
    </div>
  );
}
