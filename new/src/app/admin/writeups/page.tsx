import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <AdminCollection
      table="writeups"
      title="Writeups & articles"
      description="Manage lab walkthroughs, investigations, tool tutorials, CTF writeups, and learning notes."
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "slug", label: "Unique slug", required: true },
        { name: "summary", label: "Summary", type: "textarea" },
        {
          name: "content",
          label: "Article content",
          type: "textarea",
          required: true,
        },
        {
          name: "category",
          label: "Category",
          type: "select",
          options: [
            "Lab walkthrough",
            "Security investigation",
            "Learning note",
            "Tool tutorial",
            "CTF writeup",
          ],
        },
        { name: "cover_image", label: "Cover image URL", type: "url" },
        {
          name: "status",
          label: "Publication status",
          type: "select",
          options: ["draft", "published", "archived"],
        },
        { name: "is_demo", label: "Sample / demo data", type: "checkbox" },
        { name: "display_order", label: "Display order", type: "number" },
      ]}
    />
  );
}
