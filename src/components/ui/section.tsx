import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** The single page measure and gutter. Nothing below the layout sets its own. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-page px-6 sm:px-8 lg:px-12",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Vertical rhythm for a page section. Every section uses the same beat so the
 * page reads as one composition rather than a stack of unrelated blocks.
 */
export function Section({
  id,
  labelledBy,
  children,
  className,
}: {
  id?: string;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("py-20 sm:py-28 lg:py-36", className)}
    >
      {children}
    </section>
  );
}
