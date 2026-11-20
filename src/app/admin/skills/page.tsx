import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <div className="space-y-12">
      <AdminCollection
        table="skill_categories"
        title="Skill categories"
        description="Create categories such as Networking, Linux, Windows, SIEM, and Security Fundamentals."
        fields={[
          { name: "name", label: "Category name", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "display_order", label: "Display order", type: "number" },
          { name: "visible", label: "Visible", type: "checkbox" },
        ]}
      />
      <AdminCollection
        table="skills"
        title="Skills & arsenal"
        description="Manage skill cards, descriptions, icons, display order, and visibility. Add verified skills only."
        fields={[
          { name: "name", label: "Skill name", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "icon", label: "Icon name", placeholder: "Network" },
          {
            name: "indicator",
            label: "Optional experience indicator",
            placeholder: "Learning / foundational",
          },
          { name: "display_order", label: "Display order", type: "number" },
          { name: "visible", label: "Visible", type: "checkbox" },
        ]}
      />
    </div>
  );
}
