import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <div className="space-y-12">
      <AdminCollection
        table="profile"
        title="Profile content"
        description="Edit the hero, about biography, objective, learning focus, and profile image. Record ID 1 is the site profile."
        canCreate={false}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "title", label: "Professional title" },
          { name: "introduction", label: "Introduction", type: "textarea" },
          { name: "biography", label: "Biography", type: "textarea" },
          { name: "objective", label: "Career objective", type: "textarea" },
          { name: "learning_focus", label: "Current learning focus" },
          { name: "profile_image", label: "Profile image URL", type: "url" },
          { name: "resume_url", label: "Resume PDF URL", type: "url" },
          { name: "availability", label: "Availability badge" },
        ]}
      />
      <AdminCollection
        table="site_sections"
        title="Homepage sections"
        description="Control section copy, layout, ordering, and visibility."
        fields={[
          { name: "key", label: "Section key", required: true },
          { name: "title", label: "Section title", required: true },
          { name: "subtitle", label: "Subtitle" },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "layout",
            label: "Layout",
            type: "select",
            options: ["grid", "split", "list", "case-files"],
          },
          { name: "display_order", label: "Display order", type: "number" },
          { name: "visible", label: "Visible", type: "checkbox" },
        ]}
      />
    </div>
  );
}
