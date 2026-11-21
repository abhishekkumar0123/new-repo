import { createSupabaseBrowser } from "@/lib/supabase/browser";

export async function getPortfolioData() {
  const supabase = createSupabaseBrowser();
  if (!supabase) return null;

  const [profile, sections, categories, skills, projects, writeups, certifications, labs, timeline, links, learning, settings] = await Promise.all([
    supabase.from("profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("site_sections").select("*").eq("visible", true).order("display_order"),
    supabase.from("skill_categories").select("*").eq("visible", true).order("display_order"),
    supabase.from("skills").select("*").eq("visible", true).order("display_order"),
    supabase.from("projects").select("*").eq("status", "published").order("display_order"),
    supabase.from("writeups").select("*").eq("status", "published").order("display_order"),
    supabase.from("certifications").select("*").eq("visible", true).order("display_order"),
    supabase.from("lab_entries").select("*").eq("visible", true).order("display_order"),
    supabase.from("timeline_entries").select("*").eq("visible", true).order("display_order"),
    supabase.from("social_links").select("*").eq("visible", true).order("display_order"),
    supabase.from("learning_items").select("*").eq("visible", true).order("display_order"),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return {
    profile: profile.data,
    sections: sections.data ?? [],
    categories: categories.data ?? [],
    skills: skills.data ?? [],
    projects: projects.data ?? [],
    writeups: writeups.data ?? [],
    certifications: certifications.data ?? [],
    labs: labs.data ?? [],
    timeline: timeline.data ?? [],
    links: links.data ?? [],
    learning: learning.data ?? [],
    settings: settings.data,
  };
}
