"use client";

import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { FormEvent, useEffect, useState } from "react";

export default function AdminLogin() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("unauthorized") === "1")
      setError(
        "This account is not authorized to access the administration area.",
      );
    if (params.get("error") === "invalid_recovery_link")
      setError("This password recovery link is invalid or has expired.");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setError(
        "Authentication is unavailable because Supabase is not configured.",
      );
      setLoading(false);
      return;
    }

    if (resetMode) {
      const email = String(form.get("email") ?? "").trim();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/admin/reset-password`,
        },
      );
      setLoading(false);
      if (resetError) {
        setError(
          "We could not send a recovery email. Verify the address and try again.",
        );
        return;
      }
      setSuccess(
        "If this account is registered, a recovery email has been sent.",
      );
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setLoading(false);

    if (signInError) {
      setError("Authentication failed. Check your email and password.");
      return;
    }

    window.location.assign("/admin");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <form
        onSubmit={submit}
        className="glass-panel w-full max-w-md p-7 sm:p-9"
      >
        <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
          // administrator access
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          {resetMode ? "Recover password" : "Sign in"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#77847e]">
          {resetMode
            ? "Request a secure password reset link for the authorized account."
            : "Authenticate to access the private portfolio CMS."}
        </p>

        <label
          className="mt-7 block font-mono text-[10px] uppercase text-[#77847e]"
          htmlFor="email"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 h-12 w-full border border-white/[0.08] bg-black/10 px-4 outline-none focus:border-[#00ff91]/40"
        />

        {!resetMode && (
          <>
            <label
              className="mt-4 block font-mono text-[10px] uppercase text-[#77847e]"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 h-12 w-full border border-white/[0.08] bg-black/10 px-4 outline-none focus:border-[#00ff91]/40"
            />
          </>
        )}

        <button
          disabled={loading}
          className="mt-6 h-12 w-full bg-[#00ff91] font-mono text-xs font-bold uppercase text-[#06110b] disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : resetMode
              ? "Send recovery link"
              : "Authenticate"}
        </button>

        <button
          type="button"
          onClick={() => {
            setResetMode((current) => !current);
            setError("");
            setSuccess("");
          }}
          className="mt-4 w-full font-mono text-[10px] uppercase text-[#77847e] hover:text-[#00ff91]"
        >
          {resetMode ? "Back to sign in" : "Forgot password?"}
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
