"use client";

import { motion } from "motion/react";

import { FlowEdges, edgeKey } from "@/components/graph/flow-edges";
import { FlowNodeCard, type NodeState } from "@/components/graph/flow-node";
import {
  contentFrame,
  nodeBoxPercent,
  type FlowLayout,
} from "@/components/graph/geometry";
import { cn } from "@/lib/cn";
import { EASE_ENTER, PULSE_SECONDS } from "@/lib/motion";

/**
 * A flow diagram, in two deliberate compositions rather than one shrunken one.
 *
 * Wide: nodes are absolutely positioned HTML over an SVG edge layer, on a box
 * whose aspect ratio matches the design space exactly. That equality is what
 * makes the percentage positions and the SVG coordinates line up, and it is why
 * nothing is distorted when the box scales. Wide starts at `lg`: at `md` widths
 * the design-space node boxes render too narrow for labels like DISTRIBUTE,
 * which bled past the card border.
 *
 * Narrow: the same story told as a vertical rail. A branching diagram squeezed
 * onto a narrow screen is unreadable, so anything below `lg` gets a sequence
 * with the same states, the same statuses and the same pulses down a single
 * line.
 */

const APPEAR_EASE = EASE_ENTER;
const PULSE_DURATION = PULSE_SECONDS;

export function FlowGraph({
  layout,
  states,
  statuses,
  sequence,
  drawnEdges,
  pulsingEdges,
  animated,
  label,
}: {
  layout: FlowLayout;
  states: Record<string, NodeState>;
  statuses: Record<string, string | undefined>;
  /** Node ids in rail order, for the narrow composition. */
  sequence: string[];
  drawnEdges: Set<string>;
  pulsingEdges: Set<string>;
  animated: boolean;
  label: string;
}) {
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

  // The frame is derived from what the diagram actually draws, so it spans the
  // content column exactly instead of leaving a lopsided margin.
  const frame = contentFrame(layout);

  return (
    <>
      {/* Wide: the branching diagram. */}
      <div
        className="relative hidden w-full lg:block"
        role="img"
        aria-label={label}
        style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
      >
        <FlowEdges
          animated={animated}
          drawnEdges={drawnEdges}
          frame={frame}
          layout={layout}
          pulsingEdges={pulsingEdges}
        />

        {layout.nodes.map((node) => {
          const state = states[node.id] ?? "absent";
          const present = state !== "absent";
          const box = nodeBoxPercent(node, frame);

          return (
            <motion.div
              animate={{ opacity: present ? 1 : 0, y: present ? 0 : 10 }}
              className="absolute"
              initial={false}
              key={node.id}
              style={box}
              transition={
                animated
                  ? { duration: 0.5, ease: APPEAR_EASE }
                  : { duration: 0 }
              }
            >
              <FlowNodeCard
                label={node.label}
                state={state}
                statusText={statuses[node.id]}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Narrow: the same flow as a rail.
          No `role` here. An earlier revision put `role="img"` on this list,
          which hid the list semantics and left every `li` orphaned in the
          accessibility tree. The order carries the meaning on its own. */}
      <ol aria-label={label} className="flex flex-col lg:hidden">
        {sequence.map((id, index) => {
          const node = nodes.get(id);
          if (node === undefined) {
            return null;
          }

          const state = states[id] ?? "absent";
          const present = state !== "absent";
          const nextId = sequence[index + 1];
          const connectorDrawn =
            nextId !== undefined && drawnEdges.has(`${id}->${nextId}`);
          const connectorPulsing =
            nextId !== undefined && pulsingEdges.has(`${id}->${nextId}`);

          return (
            <li key={id}>
              <motion.div
                animate={{ opacity: present ? 1 : 0 }}
                initial={false}
                transition={
                  animated
                    ? { duration: 0.45, ease: APPEAR_EASE }
                    : { duration: 0 }
                }
              >
                <div className="h-14 w-full">
                  <FlowNodeCard
                    label={node.label}
                    state={state}
                    statusText={statuses[id]}
                  />
                </div>
              </motion.div>

              {nextId !== undefined ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    "relative ml-8 h-8 w-px",
                    connectorDrawn ? "bg-hairline-strong" : "bg-hairline",
                  )}
                >
                  {connectorPulsing && animated ? (
                    <motion.span
                      animate={{ y: ["-100%", "100%"] }}
                      className="absolute inset-x-0 top-0 block h-3 bg-ink"
                      initial={{ y: "-100%" }}
                      transition={{
                        duration: PULSE_DURATION / 2,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}

export { edgeKey };
