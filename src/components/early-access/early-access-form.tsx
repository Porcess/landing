"use client";

import { useEffect, useId, useRef, useState } from "react";

import { siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { cn } from "@/lib/cn";
import { markSubscribed, useSignupStatus } from "@/lib/signup";
import { LANDING_VERSION } from "@/lib/site";
import { checkEmail } from "@/lib/validation";

/**
 * The only interactive element on the page.
 *
 * Used twice: opening the page and closing it. There is one tone, because the
 * page has one surface now that the closing slab is gone.
 *
 * The subscribed state lives in a module store rather than here, so the second
 * placement stops asking as soon as the first has been answered. The fields are
 * not merely disabled on success, they are gone: there is nothing left to fill
 * in anywhere on the page.
 */

type Phase = "idle" | "submitting";

export function EarlyAccessForm({
  showPromise = false,
  placement,
}: {
  showPromise?: boolean;
  placement: "hero" | "earlyAccess";
}) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  const signup = useSignupStatus();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const startedRef = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  /** Whether this instance is the one that answered the field. */
  const actedRef = useRef(false);
  const submitting = phase === "submitting";

  useEffect(() => {
    // Only the form that was actually submitted takes focus. Every other
    // placement switches to the same confirmation, and none of them should pull
    // the caret away from wherever the visitor happens to be reading.
    if (signup !== null && actedRef.current) {
      successRef.current?.focus();
    }
  }, [signup]);

  function onFirstKeystroke() {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    track("email_started", { placement });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    // Recorded on the press itself, before validation, so the funnel shows the
    // attempts that were rejected in the browser instead of quietly losing
    // them. A click count that only includes valid submissions cannot be used
    // to tell "nobody clicked" apart from "everyone typed it wrong".
    track("early_access_cta_clicked", { placement, source: "form" });

    const check = checkEmail(email);
    if (!check.ok) {
      setError(
        check.problem === "empty" ? siteCopy.form.empty : siteCopy.form.invalid,
      );
      track("email_failed", { placement, reason: "invalid" });
      return;
    }

    setError(null);
    setPhase("submitting");

    try {
      const response = await fetch("/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: check.email,
          honeypot,
          landingPageVersion: LANDING_VERSION,
          attribution: getAttribution(),
        }),
      });

      const payload: unknown = await response.json().catch(() => null);
      const status =
        typeof payload === "object" && payload !== null
          ? (payload as { status?: unknown }).status
          : undefined;

      if (
        response.ok &&
        (status === "subscribed" || status === "already_subscribed")
      ) {
        actedRef.current = true;
        markSubscribed(status);
        track("email_submitted", {
          placement,
          duplicate: status === "already_subscribed",
        });
        return;
      }

      if (status === "unconfigured" || response.status === 503) {
        setError(siteCopy.form.unavailable);
        track("email_failed", { placement, reason: "unavailable" });
      } else if (status === "invalid") {
        setError(siteCopy.form.invalid);
        track("email_failed", { placement, reason: "invalid" });
      } else {
        setError(siteCopy.form.failed);
        track("email_failed", { placement, reason: "error" });
      }
      setPhase("idle");
    } catch {
      setError(siteCopy.form.failed);
      track("email_failed", { placement, reason: "error" });
      setPhase("idle");
    }
  }

  // Anyone who has joined the list sees the confirmation, wherever the field
  // appears on the page. No input, no button, nothing still asking.
  if (signup !== null) {
    return (
      <div data-early-access={placement}>
        <div
          className="border-t border-hairline-strong pt-5 outline-none"
          ref={successRef}
          tabIndex={-1}
        >
          <div role="status">
            <p className="font-display text-lead font-medium">
              {siteCopy.form.success.headline}
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              {siteCopy.form.success.welcome}
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              {siteCopy.form.success.month}
            </p>
            {signup === "already_subscribed" ? (
              <p className="mt-4 text-sm text-ink-muted">
                {siteCopy.form.success.duplicate}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className="relative flex flex-col gap-3"
      data-early-access={placement}
      noValidate
      onSubmit={onSubmit}
    >
      <label
        className="font-mono text-xs tracking-label text-ink-muted uppercase"
        htmlFor={fieldId}
      >
        {siteCopy.form.label}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-describedby={hintId}
          aria-invalid={error !== null}
          autoComplete="email"
          className="focus-ring h-12 w-full rounded-xs border border-hairline-strong bg-ground-raised px-4 text-base text-ink transition-colors duration-150 placeholder:text-ink-muted sm:flex-1"
          id={fieldId}
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            onFirstKeystroke();
          }}
          placeholder={siteCopy.form.placeholder}
          required
          type="email"
          value={email}
        />

        <button
          className="focus-ring h-12 shrink-0 rounded-xs bg-ink px-6 font-mono text-xs tracking-label whitespace-nowrap text-ground uppercase transition-colors duration-150 hover:bg-ink-muted active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? siteCopy.form.submitting : siteCopy.form.submit}
        </button>
      </div>

      {/* Off-screen, never focusable, never shown to anyone reading the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 size-px overflow-hidden opacity-0"
      >
        <label htmlFor={`${fieldId}-company`}>Company</label>
        <input
          autoComplete="off"
          id={`${fieldId}-company`}
          name="company"
          onChange={(event) => setHoneypot(event.target.value)}
          tabIndex={-1}
          value={honeypot}
        />
      </div>

      {/* One reserved row, so switching between hint and error never shifts. */}
      <p
        className={cn(
          "min-h-5 text-sm",
          error ? "text-danger" : "text-ink-muted",
        )}
        id={hintId}
        {...(error ? { role: "alert" } : {})}
      >
        {error ?? siteCopy.form.idleHint}
      </p>

      {showPromise ? (
        <p className="text-sm text-ink">{siteCopy.form.heroNote}</p>
      ) : null}
    </form>
  );
}
