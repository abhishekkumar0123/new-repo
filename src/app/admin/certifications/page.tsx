import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
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
        { name: "display_order", label: "Display order", type: "number" },
        { name: "visible", label: "Visible", type: "checkbox" },
      ]}
    />
  );
}
