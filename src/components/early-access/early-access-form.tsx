"use client";

import { useEffect, useId, useRef, useState } from "react";

import { siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { cn } from "@/lib/cn";
import { LANDING_VERSION } from "@/lib/site";
import { checkEmail } from "@/lib/validation";

/**
 * The only interactive element on the page.
 *
 * Used twice: in the hero on the dark ground, and in the closing section on the
 * inverted slab. The tone map keeps both placements on the same tokens, which
 * is what keeps the inversion honest rather than a second design.
 */

type Tone = "ground" | "slab";

const TONES: Record<
  Tone,
  {
    label: string;
    input: string;
    ring: string;
    button: string;
    alert: string;
    hint: string;
    rule: string;
  }
> = {
  ground: {
    label: "text-ink-muted",
    input:
      "border-hairline-strong bg-ground-raised text-ink placeholder:text-ink-muted",
    ring: "focus-ring",
    button: "bg-ink text-ground hover:bg-ink-muted",
    alert: "text-danger",
    hint: "text-ink-muted",
    rule: "border-hairline-strong",
  },
  slab: {
    label: "text-slab-ink-muted",
    input:
      "border-slab-ink/30 bg-slab-ink/5 text-slab-ink placeholder:text-slab-ink-muted",
    ring: "focus-ring-inverse",
    button: "bg-ground text-ink hover:bg-slab-ink",
    alert: "text-danger-on-light",
    hint: "text-slab-ink-muted",
    rule: "border-slab-ink/25",
  },
};

type Phase = "idle" | "submitting" | "done";

export function EarlyAccessForm({
  tone = "ground",
  showPromise = false,
  placement,
}: {
  tone?: Tone;
  showPromise?: boolean;
  placement: "hero" | "earlyAccess" | "final";
}) {
  const styles = TONES[tone];
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const startedRef = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const submitting = phase === "submitting";

  useEffect(() => {
    if (phase === "done") {
      // Move focus to the confirmation so keyboard users are not left on a
      // control that no longer exists. The live region sits inside, so this
      // does not double announce the text.
      successRef.current?.focus();
    }
  }, [phase]);

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

    const check = checkEmail(email);
    if (!check.ok) {
      setError(
        check.problem === "empty" ? siteCopy.form.empty : siteCopy.form.invalid,
      );
      return;
    }

    setError(null);
    setPhase("submitting");
    track("early_access_cta_clicked", { placement, source: "form" });

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
        setAlreadySubscribed(status === "already_subscribed");
        setPhase("done");
        track("email_submitted", {
          placement,
          duplicate: status === "already_subscribed",
        });
        return;
      }

      if (status === "unconfigured" || response.status === 503) {
        setError(siteCopy.form.unavailable);
      } else if (status === "invalid") {
        setError(siteCopy.form.invalid);
      } else {
        setError(siteCopy.form.failed);
      }
      setPhase("idle");
    } catch {
      setError(siteCopy.form.failed);
      setPhase("idle");
    }
  }

  if (phase === "done") {
    return (
      <div data-early-access={placement}>
        <div
          ref={successRef}
          tabIndex={-1}
          className={cn("border-t pt-5 outline-none", styles.rule)}
        >
          <div role="status">
            <p className="font-display text-lead font-medium">
              {siteCopy.form.success.headline}
            </p>
            <p className={cn("mt-2 text-sm", styles.hint)}>
              {siteCopy.form.success.welcome}
            </p>
            <p className={cn("mt-4 text-sm", styles.hint)}>
              {siteCopy.form.success.month}
            </p>
            <p className={cn("mt-1 text-sm", styles.hint)}>
              {siteCopy.form.success.later}
            </p>
            {alreadySubscribed ? (
              <p className={cn("mt-4 text-sm", styles.hint)}>
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
        className={cn(
          "font-mono text-xs tracking-label uppercase",
          styles.label,
        )}
        htmlFor={fieldId}
      >
        {siteCopy.form.label}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-describedby={hintId}
          aria-invalid={error !== null}
          autoComplete="email"
          className={cn(
            "h-12 w-full rounded-xs border px-4 text-base transition-colors duration-150 sm:flex-1",
            styles.input,
            styles.ring,
          )}
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
          className={cn(
            "h-12 shrink-0 rounded-xs px-6 font-mono text-xs tracking-label whitespace-nowrap uppercase transition-colors duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
            styles.button,
            styles.ring,
          )}
          disabled={submitting}
          type="submit"
        >
          {submitting ? siteCopy.form.submitting : siteCopy.form.submit}
        </button>
      </div>

      {/* Off-screen, never focusable, never shown to anyone reading the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 -left-2 size-px overflow-hidden opacity-0"
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
        className={cn("min-h-5 text-sm", error ? styles.alert : styles.hint)}
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
