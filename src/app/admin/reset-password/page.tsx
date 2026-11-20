"use client";

import { withBasePath } from "@/lib/base-path";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { FormEvent, useState } from "react";

export default function ResetPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setError(
        "Authentication is unavailable because Supabase is not configured.",
      );
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(
        "We could not update the password. The recovery link may be expired.",
      );
      return;
    }

    setSuccess("Password updated. Redirecting to the dashboard...");
    window.location.assign(withBasePath("/admin"));
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <form
        onSubmit={submit}
        className="glass-panel w-full max-w-md p-7 sm:p-9"
      >
        <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
          // secure recovery
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Set new password</h1>

        <label
          className="mt-7 block font-mono text-[10px] uppercase text-[#77847e]"
          htmlFor="password"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="mt-2 h-12 w-full border border-white/[0.08] bg-black/10 px-4 outline-none focus:border-[#00ff91]/40"
        />

        <label
          className="mt-4 block font-mono text-[10px] uppercase text-[#77847e]"
          htmlFor="confirmPassword"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="mt-2 h-12 w-full border border-white/[0.08] bg-black/10 px-4 outline-none focus:border-[#00ff91]/40"
        />

        <button
          disabled={loading}
          className="mt-6 h-12 w-full bg-[#00ff91] font-mono text-xs font-bold uppercase text-[#06110b] disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-[#ff7b72]" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 text-sm text-[#00ff91]" role="status">
            {success}
          </p>
        )}
      </form>
    </main>
  );
}
