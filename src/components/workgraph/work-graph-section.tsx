"use client";

import { useMemo } from "react";

import { FlowGraph } from "@/components/graph/flow-graph";
import { deriveFlowState, type FlowBeat } from "@/components/graph/flow-state";
import { edgePath, type FlowLayout } from "@/components/graph/geometry";
import { useBeatTimeline } from "@/components/graph/use-beat-timeline";
import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * The same idea as the workflow, told as breadth rather than sequence.
 *
 * One thing completes at the top and three things fall out of it. Those three
 * each spawn more, everything converges, and the only way out is another lap.
 * The diagram says "there is always more work than you think" without a
 * sentence of explanation.
 */

const LAYOUT: FlowLayout = {
  width: 1600,
  height: 1000,
  nodes: [
    { id: "ship", label: siteCopy.graph.nodes.ship, x: 800, y: 110 },
    { id: "test", label: siteCopy.graph.nodes.test, x: 240, y: 380 },
    { id: "market", label: siteCopy.graph.nodes.market, x: 800, y: 380 },
    { id: "docs", label: siteCopy.graph.nodes.docs, x: 1360, y: 380 },
    { id: "debug", label: siteCopy.graph.nodes.debug, x: 240, y: 650 },
    {
      id: "distribute",
      label: siteCopy.graph.nodes.distribute,
      x: 800,
      y: 650,
    },
    { id: "iterate", label: siteCopy.graph.nodes.iterate, x: 470, y: 920 },
    { id: "build", label: siteCopy.graph.nodes.build, x: 1010, y: 920 },
  ],
  edges: [
    { from: "ship", to: "test", fromSide: "bottom", toSide: "top" },
    { from: "ship", to: "market", fromSide: "bottom", toSide: "top" },
    { from: "ship", to: "docs", fromSide: "bottom", toSide: "top" },
    { from: "test", to: "debug", fromSide: "bottom", toSide: "top" },
    { from: "market", to: "distribute", fromSide: "bottom", toSide: "top" },
    { from: "debug", to: "iterate", fromSide: "bottom", toSide: "left" },
    { from: "distribute", to: "iterate", fromSide: "bottom", toSide: "top" },
    { from: "iterate", to: "build", fromSide: "right", toSide: "left" },
    // The return leg, down the right channel and back up to the top. It closes
    // the cycle, which is the section's whole point: without it BUILD is a dead
    // end and the diagram says "and then nothing happened", while the right third
    // of the canvas sits empty and the left is crowded.
    {
      from: "build",
      to: "ship",
      fromSide: "right",
      toSide: "right",
      via: [
        { x: 1520, y: 920 },
        { x: 1520, y: 110 },
      ],
    },
  ],
};

const SEQUENCE = [
  "ship",
  "test",
  "market",
  "docs",
  "debug",
  "distribute",
  "iterate",
  "build",
];

const S = siteCopy.workflow.status;

const BRANCH: [string, string][] = [
  ["ship", "test"],
  ["ship", "market"],
  ["ship", "docs"],
];

const BEATS: FlowBeat[] = [
  { hold: 700, nodes: { ship: "running" } },
  { hold: 900, nodes: { ship: "done" } },
  // The branch. Three things appear where there was one.
  {
    hold: 1400,
    nodes: { test: "queued", market: "queued", docs: "queued" },
    draw: BRANCH,
    pulse: BRANCH,
  },
  { hold: 900, nodes: { test: "running", market: "running", docs: "running" } },
  {
    hold: 1300,
    nodes: {
      test: "done",
      market: "done",
      docs: "done",
      debug: "queued",
      distribute: "queued",
    },
    draw: [
      ["test", "debug"],
      ["market", "distribute"],
    ],
    pulse: [
      ["test", "debug"],
      ["market", "distribute"],
    ],
  },
  { hold: 900, nodes: { debug: "running", distribute: "running" } },
  {
    hold: 1300,
    nodes: { debug: "done", distribute: "done", iterate: "queued" },
    draw: [
      ["debug", "iterate"],
      ["distribute", "iterate"],
    ],
    pulse: [
      ["debug", "iterate"],
      ["distribute", "iterate"],
    ],
  },
  { hold: 900, nodes: { iterate: "running" } },
  {
    hold: 1300,
    nodes: { iterate: "done", build: "queued" },
    draw: [["iterate", "build"]],
    pulse: [["iterate", "build"]],
  },
  { hold: 900, nodes: { build: "running" } },
  // The last beat closes the cycle, so the section ends on the loop rather than
  // on a node with nothing after it.
  {
    hold: 900,
    nodes: { build: "done" },
    draw: [["build", "ship"]],
    pulse: [["build", "ship"]],
  },
];

/** The return leg, kept pulsing once the cycle has closed. */
const CLOSING_LOOP: [string, string][] = [["build", "ship"]];

export function WorkGraphSection() {
  const reduced = usePrefersReducedMotion();
  const { ref, active } = useBeatTimeline(
    BEATS.map((beat) => beat.hold),
    { event: "graph_section_view" },
  );

  const { states, statuses, drawnEdges, pulsingEdges } = useMemo(
    () => deriveFlowState(BEATS, active, LAYOUT.nodes, S, CLOSING_LOOP),
    [active],
  );

  return (
    <Section id="graph" labelledBy="graph-label">
      <Container>
        <h2
          className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
          id="graph-label"
        >
          {siteCopy.graph.headline}
        </h2>
        <p className="mt-6 max-w-measure text-lead text-ink-muted">
          {siteCopy.graph.body}
        </p>

        <div className="mt-12 sm:mt-16" ref={ref}>
          <FlowGraph
            animated={!reduced}
            drawnEdges={drawnEdges}
            label={`One completed task branching into ${SEQUENCE.slice(1).join(", ")}, all converging and looping back.`}
            layout={LAYOUT}
            pulsingEdges={pulsingEdges}
            sequence={SEQUENCE}
            states={states}
            statuses={statuses}
          />
        </div>

        <p className="mt-10 font-mono text-xs tracking-label text-ink-muted uppercase sm:mt-12">
          {siteCopy.graph.caption}
        </p>
      </Container>
    </Section>
  );
}

/** Exported for the geometry tests. */
export const graphLayout = LAYOUT;
export const graphEdgePaths = (): string[] => {
  const nodes = new Map(LAYOUT.nodes.map((node) => [node.id, node]));
  return LAYOUT.edges.map((edge) => edgePath(edge, nodes));
};
export const graphBeats = BEATS;
