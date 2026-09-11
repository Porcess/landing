"use client";

import { motion } from "motion/react";

import {
  edgePath,
  type FlowEdge,
  type FlowFrame,
  type FlowLayout,
} from "@/components/graph/geometry";
import { EASE_ENTER, PULSE_SECONDS } from "@/lib/motion";

/**
 * The SVG layer: edges only. Nodes are HTML drawn over the top, which is why
 * this has no text in it.
 *
 * Two overlapping paths per edge:
 *
 * - the base line, which draws itself on when the edge becomes reachable
 * - a pulse, a short bright dash that travels the same line, which is what makes
 *   the diagram read as work moving rather than as a picture of a diagram
 *
 * The dash is expressed through Motion's `pathLength`/`pathOffset` rather than a
 * hand-written `strokeDasharray`, because the dash geometry has to be in
 * path-length units to stay correct when the diagram scales.
 */

/** One traversal of an edge. Slow enough to follow with the eye. */
const PULSE_DURATION = PULSE_SECONDS;

export function FlowEdges({
  layout,
  frame,
  drawnEdges,
  pulsingEdges,
  animated,
}: {
  layout: FlowLayout;
  /** The derived content bounds, shared with the HTML node layer. */
  frame: FlowFrame;
  /** Edge keys that have been reached and should be visible. */
  drawnEdges: Set<string>;
  /** Edge keys currently carrying a pulse. */
  pulsingEdges: Set<string>;
  /** False under reduced motion: everything is drawn, nothing travels. */
  animated: boolean;
}) {
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 size-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
    >
      <defs>
        <marker
          id="flow-arrow"
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
          viewBox="0 0 7 7"
        >
          <path d="M 0 0 L 7 3.5 L 0 7 z" fill="var(--color-ink-muted)" />
        </marker>
        <marker
          id="flow-arrow-alert"
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
          viewBox="0 0 7 7"
        >
          <path d="M 0 0 L 7 3.5 L 0 7 z" fill="var(--color-danger)" />
        </marker>
      </defs>

      {layout.edges.map((edge) => {
        const key = edgeKey(edge);
        const d = edgePath(edge, nodes);
        if (d.length === 0) {
          return null;
        }

        const reached = drawnEdges.has(key);
        const pulsing = animated && pulsingEdges.has(key);
        const stroke = edge.failed
          ? "var(--color-danger)"
          : "var(--color-ink-muted)";

        return (
          <g key={key}>
            <motion.path
              animate={{ pathLength: reached ? 1 : 0 }}
              d={d}
              fill="none"
              initial={false}
              markerEnd={
                reached
                  ? `url(#${edge.failed ? "flow-arrow-alert" : "flow-arrow"})`
                  : undefined
              }
              opacity={edge.failed ? 0.9 : 0.55}
              stroke={stroke}
              strokeWidth={1}
              transition={
                animated
                  ? { duration: 0.55, ease: EASE_ENTER }
                  : { duration: 0 }
              }
              vectorEffect="non-scaling-stroke"
            />

            {pulsing ? (
              <motion.path
                animate={{ pathOffset: [0, 1] }}
                d={d}
                fill="none"
                initial={{ pathOffset: 0 }}
                // `pathLength` is the drawn fraction and `pathOffset` is where
                // that window sits, so a short fraction travelling 0 to 1 is a
                // pulse crossing the edge. Both are in path-length units, which
                // is what keeps the dash correct when the diagram scales.
                pathLength={0.14}
                stroke={
                  edge.failed ? "var(--color-danger)" : "var(--color-ink)"
                }
                strokeWidth={2}
                transition={{
                  duration: PULSE_DURATION,
                  ease: "linear",
                  repeat: Infinity,
                }}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function edgeKey(edge: FlowEdge): string {
  return `${edge.from}->${edge.to}`;
}
