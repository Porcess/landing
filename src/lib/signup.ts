"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this visitor has already joined the early list.
 *
 * Module scope rather than per component state, because the page offers the
 * field in more than one place. Signing up in any one of them has to settle all
 * of them: being asked again for an address you have just handed over is the
 * fastest way for a page to look like it was not paying attention.
 *
 * The answer is also mirrored into local storage, so a reload does not ask
 * again either. That is the behaviour anyone expects from a form they have
 * already filled in, and it is the difference between a page that remembered
 * and a page that forgot the moment it was refreshed.
 *
 * The server cannot know, so it always renders the form and the stored answer
 * arrives on hydration. That is why this is local storage and not a cookie:
 * reading a cookie would make an otherwise static page dynamic for everybody.
 */

export type SignupStatus = "subscribed" | "already_subscribed";

const STORAGE_KEY = "porcess.early-access";

let status: SignupStatus | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function isStatus(value: unknown): value is SignupStatus {
  return value === "subscribed" || value === "already_subscribed";
}

/**
 * Read storage once, lazily, on the first client snapshot.
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
    if (isStatus(stored)) {
      status = stored;
    }
  } catch {
    // Storage is unavailable. Nothing to recover from.
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function markSubscribed(next: SignupStatus) {
  if (status !== null) {
    return;
  }
  status = next;
  loaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The confirmation still stands for this page view.
  }
  emit();
}

/** For tests, which need a fresh visitor between cases. */
export function forgetSignup() {
  status = null;
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

function read(): SignupStatus | null {
  load();
  return status;
}

/** The server has no answer, so it renders the form and hydration corrects it. */
function readOnServer(): SignupStatus | null {
  return null;
}

export function useSignupStatus(): SignupStatus | null {
  return useSyncExternalStore(subscribe, read, readOnServer);
}
