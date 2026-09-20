"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this visitor has already joined the early list, and the offer they
 * locked in.
 *
 * Module scope rather than per component state, because the page offers the
 * field in more than one place. Signing up in any one of them has to settle all
 * of them: being asked again for an address you have just handed over is the
 * fastest way for a page to look like it was not paying attention.
 *
 * The answer is also mirrored into local storage, so a reload does not ask
 * again either. The offer is stored alongside it, because the confirmation says
 * which discount the visitor actually joined at, and after a reload that has to
 * still be their offer rather than whatever the page is currently advertising.
 *
 * The server cannot know, so it always renders the form and the stored answer
 * arrives on hydration. That is why this is local storage and not a cookie:
 * reading a cookie would make the page dynamic for everybody.
 */

export type SignupStatus = "subscribed" | "already_subscribed";

export type SignupOffer = { percent: number; basePriceCents: number };

export type SignupState = { status: SignupStatus; offer: SignupOffer | null };

const STORAGE_KEY = "porcess.early-access";

let state: SignupState | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function isStatus(value: unknown): value is SignupStatus {
  return value === "subscribed" || value === "already_subscribed";
}

function parseOffer(value: unknown): SignupOffer | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as { percent?: unknown; basePriceCents?: unknown };
  return typeof candidate.percent === "number" &&
    typeof candidate.basePriceCents === "number"
    ? { percent: candidate.percent, basePriceCents: candidate.basePriceCents }
    : null;
}

/**
 * Read storage once, lazily, on the first client snapshot.
 *
 * A plain status string is accepted as well as the current object: a visitor who
 * signed up before the offer was stored must still not be asked again, and their
 * confirmation falls back to the active offer.
 *
 * Storage can throw outright rather than merely be empty, so every access is
 * guarded. A visitor who blocks it still gets a page that works; it just cannot
 * remember them, which is not worth interrupting anyone about.
 */
function load() {
  if (loaded) {
    return;
  }
  loaded = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return;
    }

    if (isStatus(stored)) {
      state = { status: stored, offer: null };
      return;
    }

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed === "object" && parsed !== null) {
      const candidate = parsed as { status?: unknown; offer?: unknown };
      if (isStatus(candidate.status)) {
        state = {
          status: candidate.status,
          offer: parseOffer(candidate.offer),
        };
      }
    }
  } catch {
    // Storage is unavailable or held something unreadable. Nothing to recover.
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function markSubscribed(next: SignupState) {
  if (state !== null) {
    return;
  }
  state = next;
  loaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The confirmation still stands for this page view.
  }
  emit();
}

/** For tests, which need a fresh visitor between cases. */
export function forgetSignup() {
  state = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  // Back to unread rather than merely empty, so the next snapshot consults
  // storage again: a test that seeds it is describing a visitor who has been
  // here before, and one that does not is describing a visitor who has not.
  loaded = false;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read(): SignupState | null {
  load();
  return state;
}

/** The server has no answer, so it renders the form and hydration corrects it. */
function readOnServer(): SignupState | null {
  return null;
}

export function useSignupStatus(): SignupState | null {
  return useSyncExternalStore(subscribe, read, readOnServer);
}
