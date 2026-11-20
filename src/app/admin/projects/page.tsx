import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <AdminCollection
      table="projects"
      title="Projects / Case files"
      description="Manage fictional or verified investigation case files with publish, draft, ordering, and featured controls."
      fields={[
        { name: "title", label: "Project title", required: true },
        {
          name: "slug",
          label: "Unique slug",
          required: true,
          placeholder: "network-traffic-investigation",
        },
        { name: "case_id", label: "Case ID", placeholder: "CASE-001" },
        {
          name: "short_description",
          label: "Short description",
          type: "textarea",
          required: true,
        },
        { name: "objective", label: "Objective", type: "textarea" },
        {
          name: "environment",
          label: "Environment / lab setup",
          type: "textarea",
        },
        {
          name: "report",
          label: "Full investigation report",
          type: "textarea",
        },
        { name: "evidence", label: "Evidence", type: "textarea" },
        { name: "findings", label: "Findings", type: "textarea" },
        {
          name: "process",
          label: "Detection / analysis process",
          type: "textarea",
        },
        { name: "lessons", label: "Lessons learned", type: "textarea" },
        {
          name: "category",
          label: "Category",
          placeholder: "Network analysis",
        },
        {
          name: "difficulty",
          label: "Difficulty",
          type: "select",
          options: ["Beginner", "Intermediate", "Advanced"],
        },
        { name: "github_url", label: "GitHub link", type: "url" },
        { name: "live_url", label: "Live demo link", type: "url" },
        {
          name: "status",
          label: "Publication status",
          type: "select",
          options: ["draft", "published", "archived"],
        },
        { name: "featured", label: "Featured", type: "checkbox" },
        { name: "is_demo", label: "Sample / demo data", type: "checkbox" },
        { name: "display_order", label: "Display order", type: "number" },
      ]}
    />
  );
}
