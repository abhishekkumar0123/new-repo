import { AdminCollection } from "@/components/admin-collection";

export default function Page() {
  return (
    <AdminCollection
      table="contact_messages"
      title="Contact messages"
      canCreate={false}
      description="Review server-validated contact submissions and update their status."
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "subject", label: "Subject" },
        { name: "message", label: "Message", type: "textarea", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["new", "read", "archived"],
        },
      ]}
    />
  );
}
