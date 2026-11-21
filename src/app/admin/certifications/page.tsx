import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <div className="space-y-12">
      <AdminCollection
        table="certifications"
        title="Certifications"
        description="Only verified credentials you add should be published here."
        fields={[
          { name: "name", label: "Certificate name", required: true },
          { name: "issuer", label: "Issuing organization", required: true },
          { name: "issue_date", label: "Issue date", type: "date" },
          { name: "expiration_date", label: "Expiration date", type: "date" },
          { name: "image_url", label: "Certificate image URL", type: "url" },
          { name: "credential_url", label: "Credential URL", type: "url" },
          { name: "verification_id", label: "Verification ID" },
          {
            name: "status",
            label: "Learning status",
            type: "select",
            options: [
              "earned",
              "pursuing",
              "planned",
              "completed_training",
              "in_progress",
            ],
          },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "related_skills",
            label: "Related skills (comma separated)",
            type: "textarea",
          },
          {
            name: "related_projects",
            label: "Related project slugs (comma separated)",
            type: "textarea",
          },
          { name: "display_order", label: "Display order", type: "number" },
          { name: "visible", label: "Visible", type: "checkbox" },
        ]}
      />
      <AdminCollection
        table="learning_items"
        title="Learning tracker"
        description="Manage certifications, courses, labs, and learning goals. Only add progress you can verify."
        fields={[
          { name: "title", label: "Learning item", required: true },
          { name: "provider", label: "Provider" },
          { name: "category", label: "Category" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              "not_started",
              "planned",
              "in_progress",
              "completed",
              "earned",
            ],
          },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "target_date", label: "Target date", type: "date" },
          { name: "completed_date", label: "Completion date", type: "date" },
          { name: "progress", label: "Stored progress (%)", type: "number" },
          { name: "notes", label: "Notes", type: "textarea" },
          { name: "course_url", label: "Course or resource URL", type: "url" },
          { name: "credential_url", label: "Credential URL", type: "url" },
          {
            name: "related_skills",
            label: "Related skills (comma separated)",
            type: "textarea",
          },
          {
            name: "related_projects",
            label: "Related project slugs (comma separated)",
            type: "textarea",
          },
          { name: "display_order", label: "Display order", type: "number" },
          { name: "visible", label: "Visible", type: "checkbox" },
        ]}
      />
    </div>
  );
}
