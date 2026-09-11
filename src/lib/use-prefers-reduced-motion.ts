"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's reduced-motion preference, read in a way that is safe to branch
 * on during render.
 *
 * A component that renders a different tree under reduced motion cannot read the
 * media query directly: the server has no answer, so the first client render
 * would disagree with the markup it is hydrating. `useSyncExternalStore` takes
 * an explicit server snapshot, which lets React hydrate from the server's answer
 * and then re-render with the real one.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** Must be stable, and must match what the server rendered. */
function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
