"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function ContactForm() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const name = String(data.name ?? "").trim();
    const email = String(data.email ?? "").trim();
    const subject = String(data.subject ?? "").trim();
    const message = String(data.message ?? "").trim();
    const website = String(data.website ?? "").trim();

    if (website) {
      setLoading(false);
      setStatus("Message sent successfully.");
      form.reset();
      return;
    }
    if (
      name.length < 2 ||
      name.length > 100 ||
      email.length < 3 ||
      email.length > 254 ||
      message.length < 10 ||
      message.length > 5000
    ) {
      setLoading(false);
      setStatus("Please check the form fields.");
      return;
    }

    try {
      const raw = sessionStorage.getItem("contact-throttle");
      const record = raw
        ? (JSON.parse(raw) as { count: number; resetAt: number })
        : null;
      const now = Date.now();
      if (record && record.resetAt > now && record.count >= 5) {
        setLoading(false);
        setStatus("Too many submissions. Please try again later.");
        return;
      }
      sessionStorage.setItem(
        "contact-throttle",
        JSON.stringify(
          record && record.resetAt > now
            ? { count: record.count + 1, resetAt: record.resetAt }
            : { count: 1, resetAt: now + 10 * 60 * 1000 },
        ),
      );
    } catch {}

    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      setStatus("Contact service is not configured.");
      return;
    }
    const { error } = await supabase
      .from("contact_messages")
      .insert({ name, email, subject, message });
    setLoading(false);
    if (error) {
      setStatus("Unable to submit the message.");
      return;
    }
    form.reset();
    setStatus("Message sent successfully.");
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <input
        name="name"
        required
        minLength={2}
        maxLength={100}
        aria-label="Name"
        placeholder="Your name"
        className="h-12 border border-white/[0.08] bg-black/10 px-4 text-sm outline-none focus:border-[#00ff91]/40"
      />
      <input
        name="email"
        required
        type="email"
        maxLength={254}
        aria-label="Email"
        placeholder="Email address"
        className="h-12 border border-white/[0.08] bg-black/10 px-4 text-sm outline-none focus:border-[#00ff91]/40"
      />
      <input
        name="subject"
        maxLength={150}
        aria-label="Subject"
        placeholder="Subject"
        className="h-12 border border-white/[0.08] bg-black/10 px-4 text-sm outline-none focus:border-[#00ff91]/40"
      />
      <textarea
        name="message"
        required
        minLength={10}
        maxLength={5000}
        aria-label="Message"
        placeholder="Message"
        rows={5}
        className="resize-none border border-white/[0.08] bg-black/10 p-4 text-sm outline-none focus:border-[#00ff91]/40"
      />
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button
        data-magnetic
        disabled={loading}
        className="inline-flex h-12 items-center justify-center gap-2 bg-[#00ff91] font-mono text-xs font-bold uppercase text-[#06110b] disabled:opacity-60"
        aria-disabled={loading}
      >
        <Send size={14} />
        {loading ? "Sending..." : "Send message"}
      </button>
      {status && (
        <p role="status" className="text-sm text-[#9ba8a1]">
          {status}
        </p>
      )}
    </form>
  );
}
