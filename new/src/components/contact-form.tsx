"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

export function ContactForm() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setStatus(body.error || "Unable to send message.");
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
        disabled={loading}
        className="inline-flex h-12 items-center justify-center gap-2 bg-[#00ff91] font-mono text-xs font-bold uppercase text-[#06110b] disabled:opacity-60"
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
