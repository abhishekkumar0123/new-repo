import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <AdminCollection
      table="timeline_entries"
      title="Career timeline"
      description="Add truthful career, education, certification, and learning entries. Hide entries without deleting them."
      fields={[
        { name: "title", label: "Entry title", required: true },
        { name: "category", label: "Category", type: "select", options: ["Education", "Career", "Projects", "Cybersecurity", "Certifications", "Learning", "Achievements"] },
        { name: "organization", label: "Platform / organization" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "occurred_at", label: "Date", type: "date" },
        { name: "related_projects", label: "Related projects (slugs, comma separated)" },
        { name: "related_certifications", label: "Related certifications (IDs, comma separated)" },
        { name: "related_skills", label: "Related skills (IDs, comma separated)" },
        { name: "display_order", label: "Display order", type: "number" },
        { name: "visible", label: "Visible", type: "checkbox" },
      ]}
    />
  );
}
