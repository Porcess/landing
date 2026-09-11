import { cn } from "@/lib/cn";

/**
 * One box in a flow diagram.
 *
 * Real HTML rather than SVG text, so the label stays crisp and stays honest
 * about its size at every width instead of being scaled by the diagram.
 *
 * Status is always written out as a word. Colour is never the only signal: the
 * alert tone is reinforcement for the word FAILED, not a replacement for it.
 */

export type NodeState = "absent" | "queued" | "running" | "done" | "failed";

export function FlowNodeCard({
  label,
  state,
  statusText,
  className,
}: {
  label: string;
  state: NodeState;
  statusText?: string;
  className?: string;
}) {
  if (state === "absent") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-center gap-1 border bg-ground px-4 sm:px-5",
        state === "running" && "border-ink",
        state === "failed" && "border-danger",
        (state === "queued" || state === "done") && "border-hairline-strong",
        className,
      )}
    >
      <span
        className={cn(
          // `leading-none` on both lines so the gap between the label and its
          // status is the flex gap rather than an inherited line box, which is
          // what made the two lines sit unevenly in a short card.
          "font-mono text-xs leading-none tracking-label uppercase sm:text-sm",
          state === "running" && "text-ink",
          state === "failed" && "text-danger",
          (state === "queued" || state === "done") && "text-ink-muted",
        )}
      >
        {label}
      </span>

      {statusText !== undefined ? (
        <span
          className={cn(
            "flex items-center gap-2 font-mono text-micro leading-none tracking-label uppercase",
            state === "running" && "text-ink",
            state === "failed" && "text-danger",
            (state === "queued" || state === "done") && "text-ink-muted",
          )}
        >
          {state === "running" || state === "failed" ? (
            <span
              aria-hidden="true"
              className={cn(
                "node-running-marker block size-1.5",
                state === "failed" ? "bg-danger" : "bg-ink",
              )}
            />
          ) : null}
          {statusText}
        </span>
      ) : null}
    </div>
  );
}
