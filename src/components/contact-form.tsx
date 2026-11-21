"use client";

import { FormEvent, useCallback, useState } from "react";
import { Send, Mail, Lock } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function ContactForm() {
  const [status, setStatus] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [messageLength, setMessageLength] = useState(0);

  const MAX_MESSAGE = 5000;

  const validate = useCallback(
    (data: { name: string; email: string; subject: string; message: string }) => {
      const next: Record<string, string> = {};
      if (!data.name || data.name.trim().length < 2) {
        next.name = "Name must be at least 2 characters.";
      } else if (data.name.trim().length > 100) {
        next.name = "Name must be under 100 characters.";
      }
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        next.email = "Please enter a valid email address.";
      }
      if (data.message && data.message.trim().length < 10) {
        next.message = "Message must be at least 10 characters.";
      } else if (data.message.trim().length > MAX_MESSAGE) {
        next.message = `Message must be under ${MAX_MESSAGE} characters.`;
      }
      return next;
    },
    [MAX_MESSAGE],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus({ text: "", type: "" });
    setErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };
    const website = String(formData.get("website") ?? "").trim();

    if (website) {
      setLoading(false);
      setStatus({ text: "Message sent successfully.", type: "success" });
      form.reset();
      setMessageLength(0);
      return;
    }

    const nextErrors = validate(data);
    if (Object.keys(nextErrors).length > 0) {
      setLoading(false);
      setErrors(nextErrors);
      setStatus({ text: "Please check the highlighted fields.", type: "error" });
      return;
    }

    try {
      const raw = sessionStorage.getItem("contact-throttle");
      const record = raw ? (JSON.parse(raw) as { count: number; resetAt: number }) : null;
      const now = Date.now();
      if (record && record.resetAt > now && record.count >= 5) {
        setLoading(false);
        setStatus({ text: "Too many submissions. Please try again later.", type: "error" });
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
      setStatus({ text: "Contact service is not configured.", type: "error" });
      return;
    }

    const { error } = await supabase
      .from("contact_messages")
      .insert({ name: data.name, email: data.email, subject: data.subject, message: data.message });

    setLoading(false);
    if (error) {
      setStatus({ text: "Unable to submit the message. Please try again.", type: "error" });
      return;
    }
    form.reset();
    setMessageLength(0);
    setStatus({ text: "Message sent successfully.", type: "success" });
  }

  const fieldConfig = [
    { name: "name", label: "Name", placeholder: "Your name", type: "text", required: true },
    { name: "email", label: "Email", placeholder: "Email address", type: "email", required: true },
    { name: "subject", label: "Subject", placeholder: "Subject", type: "text", required: false },
  ];

  return (
    <form onSubmit={submit} className="grid gap-3">
      {fieldConfig.map((field) => (
        <label key={field.name} className="block">
          <span className="mb-1.5 block font-mono text-[9px] uppercase text-[#77847e]">
            {field.label}
          </span>
          <input
            name={field.name}
            type={field.type}
            required={field.required}
            minLength={field.name === "name" ? 2 : undefined}
            maxLength={field.name === "name" ? 100 : 254}
            placeholder={field.placeholder}
            aria-required={field.required}
            aria-invalid={Boolean(errors[field.name])}
            className={`h-12 border rounded-md bg-black/10 pl-4 pr-4 text-sm outline-none transition focus:border-[#00ff91]/40 focus:ring-1 focus:ring-[#00ff91]/20 ${errors[field.name] ? "border-[#ff7b72]/50 focus:border-[#ff7b72]/60" : "border-white/[0.08]"}`}
          />
          {errors[field.name] && (
            <p className="mt-1 font-mono text-[9px] text-[#ff9a92]">
              {errors[field.name]}
            </p>
          )}
        </label>
      ))}
      <label className="block">
        <span className="mb-1.5 block font-mono text-[9px] uppercase text-[#77847e]">
          Message
        </span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={MAX_MESSAGE}
          placeholder="Tell me about your project, question, or opportunity."
          rows={5}
          aria-invalid={Boolean(errors.message)}
          onChange={(event) => setMessageLength(event.target.value.length)}
          className={`resize-none border rounded-md bg-black/10 p-4 text-sm outline-none transition focus:border-[#00ff91]/40 focus:ring-1 focus:ring-[#00ff91]/20 ${errors.message ? "border-[#ff7b72]/50 focus:border-[#ff7b72]/60" : "border-white/[0.08]"}`}
        />
        <div className="mt-1 flex justify-end">
          <span className="font-mono text-[9px] text-[#77847e]">
            {messageLength} / {MAX_MESSAGE}
          </span>
        </div>
        {errors.message && (
          <p className="mt-1 font-mono text-[9px] text-[#ff9a92]">
            {errors.message}
          </p>
        )}
      </label>
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
        className="inline-flex h-12 items-center justify-center gap-2 bg-[#00ff91] font-mono text-xs font-bold uppercase text-[#06110b] disabled:opacity-60 transition"
        aria-disabled={loading}
      >
        <Send size={14} />
        {loading ? "Sending…" : "Send message"}
      </button>
      {status.text && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-2 text-sm font-mono ${
            status.type === "success" ? "text-[#00ff91]" : "text-[#ff9a92]"
          }`}
        >
          {status.text}
        </p>
      )}
    </form>
  );
}
