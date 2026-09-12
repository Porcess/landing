"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { siteCopy } from "@/content/copy";
import { cn } from "@/lib/cn";

/**
 * The byline with one role lit at a time.
 *
 * Color only, never size or weight: the line keeps the exact same box on every
 * beat, so the form below it never moves. It advances only while the hero is on
 * screen and the tab is visible.
 *
 * Under reduced motion the highlight still travels along the line. Only the
 * cross fade is dropped, so the color arrives at once instead of easing: what
 * the preference asks to be spared is motion, and a 500ms interpolation is the
 * motion here. Switching the rotation off instead was a misreading of it, and
 * it left reduced-motion visitors with a byline frozen on "founders".
 */

const CADENCE_MS = 2400;
const FADE_CLASS = "transition-colors duration-500 motion-reduce:duration-0";

export function BuiltBy() {
  const roles = siteCopy.hero.roles;
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;

    // Starts assuming the line is on screen, so a missing or never-firing
    // observer cannot leave the byline stuck on the first role. The observer's
    // job is to pause it while the hero is scrolled away, not to start it.
    let onScreen = true;

    const observer =
      node === null
        ? null
        : new IntersectionObserver(
            (entries) => {
              onScreen = entries[0]?.isIntersecting ?? true;
            },
            // Any sliver counts. A threshold above zero would freeze the
            // rotation whenever the line happened to sit half cut by the fold.
            { threshold: 0 },
          );

    if (node !== null && observer !== null) {
      observer.observe(node);
    }

    const timer = window.setInterval(() => {
      if (onScreen && document.visibilityState === "visible") {
        setIndex((current) => (current + 1) % roles.length);
      }
    }, CADENCE_MS);

    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [roles.length]);

  return (
    <span data-built-by ref={ref}>
      {siteCopy.hero.builtByPrefix}{" "}
      {roles.map((role, roleIndex) => (
        <Fragment key={role}>
          {roleIndex > 0
            ? roleIndex === roles.length - 1
              ? " & "
              : ", "
            : null}
          <span
            className={cn(
              FADE_CLASS,
              roleIndex === index ? "text-ink" : undefined,
            )}
            data-role={role}
          >
            {role}
          </span>
        </Fragment>
      ))}
      .
    </span>
  );
}
