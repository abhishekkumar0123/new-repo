import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <AdminCollection
      table="timeline_entries"
      title="Learning timeline"
      description="Add truthful learning and project progress entries; hide entries without deleting them."
      fields={[
        { name: "title", label: "Entry title", required: true },
        { name: "organization", label: "Platform / organization" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "occurred_at", label: "Date", type: "date" },
        { name: "display_order", label: "Display order", type: "number" },
        { name: "visible", label: "Visible", type: "checkbox" },
      ]}
    />
  );
}
