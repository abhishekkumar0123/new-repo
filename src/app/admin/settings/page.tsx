import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <div className="space-y-12">
      <AdminCollection
        table="site_settings"
        title="Website settings"
        description="Configure site identity, terminal text, contact visibility, and SEO metadata. Record ID 1 is the global setting."
        canCreate={false}
        fields={[
          { name: "site_name", label: "Site name" },
          { name: "terminal_welcome", label: "Terminal welcome message" },
          { name: "contact_email", label: "Contact email", type: "email" },
          {
            name: "public_email_visible",
            label: "Public email visible",
            type: "checkbox",
          },
          { name: "seo_title", label: "SEO title" },
          {
            name: "seo_description",
            label: "SEO description",
            type: "textarea",
          },
          { name: "og_image", label: "Open Graph image URL", type: "url" },
        ]}
      />
      <AdminCollection
        table="social_links"
        title="Social links"
        description="Manage GitHub, LinkedIn, and other profile links."
        fields={[
          { name: "platform", label: "Platform", required: true },
          { name: "url", label: "URL", type: "url", required: true },
          { name: "icon", label: "Icon name" },
          { name: "display_order", label: "Display order", type: "number" },
          { name: "visible", label: "Visible", type: "checkbox" },
        ]}
      />
    </div>
  );
}
