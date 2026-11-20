import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <AdminCollection
      table="lab_entries"
      title="CTF & labs"
      description="Manage platforms, profiles, achievements, ranks, scores, and logos."
      fields={[
        { name: "platform", label: "Platform name", required: true },
        { name: "username", label: "Username" },
        { name: "profile_url", label: "Profile URL", type: "url" },
        { name: "achievement", label: "Achievement" },
        {
          name: "rank",
          label: "Rank",
          placeholder: "Only add if officially provided",
        },
        {
          name: "score",
          label: "Score",
          placeholder: "Only add if officially provided",
        },
        { name: "description", label: "Description", type: "textarea" },
        { name: "logo_url", label: "Logo URL", type: "url" },
        { name: "display_order", label: "Display order", type: "number" },
        { name: "visible", label: "Visible", type: "checkbox" },
      ]}
    />
  );
}
