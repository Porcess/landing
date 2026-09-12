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
 * The centrepiece: work moving through a pipeline, one step failing, the failure
 * creating extra work, and the flow only closing by looping back to the start.
 *
 * The diagram carries the story, which is the point. Nothing here explains what
 * Porcess does. It shows the shape of the problem, and stops.
 *
 * The layout is a design space with a fixed aspect ratio, which is what lets the
 * percentage-placed nodes and the SVG edges agree at every width.
 */

const LAYOUT: FlowLayout = {
  width: 1600,
  height: 900,
  nodes: [
    { id: "build", label: siteCopy.workflow.nodes.build, x: 200, y: 150 },
    { id: "test", label: siteCopy.workflow.nodes.test, x: 560, y: 150 },
    { id: "ship", label: siteCopy.workflow.nodes.ship, x: 920, y: 150 },
    { id: "debug", label: siteCopy.workflow.nodes.debug, x: 920, y: 430 },
    { id: "market", label: siteCopy.workflow.nodes.market, x: 1280, y: 430 },
    {
      id: "distribute",
      label: siteCopy.workflow.nodes.distribute,
      x: 1280,
      y: 700,
    },
    { id: "iterate", label: siteCopy.workflow.nodes.iterate, x: 560, y: 700 },
  ],
  edges: [
    { from: "build", to: "test", fromSide: "right", toSide: "left" },
    { from: "test", to: "ship", fromSide: "right", toSide: "left" },
    { from: "ship", to: "market", fromSide: "right", toSide: "top" },
    // The failure path, drawn in the alert tone.
    {
      from: "ship",
      to: "debug",
      fromSide: "bottom",
      toSide: "top",
      failed: true,
    },
    { from: "debug", to: "distribute", fromSide: "right", toSide: "top" },
    { from: "market", to: "distribute", fromSide: "bottom", toSide: "top" },
    { from: "distribute", to: "iterate", fromSide: "left", toSide: "right" },
    // The loop that closes the cycle, routed down the left edge so it reads as a
    // return to the start rather than as another step forward.
    {
      from: "iterate",
      to: "build",
      fromSide: "left",
      toSide: "left",
      via: [
        { x: 40, y: 700 },
        { x: 40, y: 150 },
      ],
    },
  ],
};

/** Rail order for the narrow composition: the story, one node at a time. */
const SEQUENCE = [
  "build",
  "test",
  "ship",
  "debug",
  "market",
  "distribute",
  "iterate",
];

const S = siteCopy.workflow.status;

/** The loop, kept pulsing once the flow has resolved. */
const CLOSING_LOOP: [string, string][] = [["iterate", "build"]];

const BEATS: FlowBeat[] = [
  {
    hold: 900,
    nodes: { build: "running", test: "queued" },
    draw: [["build", "test"]],
    pulse: [["build", "test"]],
  },
  { hold: 1200, nodes: { build: "done", test: "running" } },
  {
    hold: 1200,
    nodes: { test: "done", ship: "running" },
    draw: [["test", "ship"]],
    pulse: [["test", "ship"]],
  },
  // The step that goes wrong, and the extra work it creates.
  {
    hold: 1500,
    nodes: { ship: "failed", debug: "queued" },
    draw: [["ship", "debug"]],
    pulse: [["ship", "debug"]],
  },
  { hold: 1100, nodes: { debug: "running" } },
  {
    hold: 1200,
    nodes: { debug: "done", market: "running" },
    draw: [["ship", "market"]],
    pulse: [["ship", "market"]],
  },
  {
    hold: 1300,
    nodes: { market: "done", distribute: "running" },
    draw: [
      ["market", "distribute"],
      ["debug", "distribute"],
    ],
    pulse: [["market", "distribute"]],
  },
  {
    hold: 1300,
    nodes: { distribute: "done", iterate: "running" },
    draw: [["distribute", "iterate"]],
    pulse: [["distribute", "iterate"]],
  },
  {
    hold: 1500,
    nodes: { iterate: "done" },
    draw: [["iterate", "build"]],
    pulse: [["iterate", "build"]],
  },
];

export function WorkflowSection() {
  const reduced = usePrefersReducedMotion();
  const { ref, active } = useBeatTimeline(
    BEATS.map((beat) => beat.hold),
    { event: "workflow_section_view" },
  );

  const { states, statuses, drawnEdges, pulsingEdges } = useMemo(
    () => deriveFlowState(BEATS, active, LAYOUT.nodes, S, CLOSING_LOOP),
    [active],
  );

  const resolved = active >= BEATS.length;

  return (
    <Section id="workflow" labelledBy="workflow-label">
      <Container>
        <h2
          className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
          id="workflow-label"
        >
          {siteCopy.workflow.headline}
        </h2>

        <div className="mt-12 sm:mt-16" ref={ref}>
          <FlowGraph
            animated={!reduced}
            drawnEdges={drawnEdges}
            label={`A pipeline moving through ${SEQUENCE.join(", ")}. One step fails and the flow loops back to the start.`}
            layout={LAYOUT}
            pulsingEdges={pulsingEdges}
            sequence={SEQUENCE}
            states={states}
            statuses={statuses}
          />
        </div>

        <div className="mt-10 flex flex-col gap-6 sm:mt-12">
          <p className="font-mono text-xs tracking-label text-ink-muted uppercase">
            {siteCopy.workflow.caption}
          </p>

          {/* The verdict lands only once the flow has resolved, so the line has
              something to refer to by the time it appears. */}
          <div
            aria-hidden={resolved ? undefined : true}
            className={
              resolved
                ? "opacity-100 transition-opacity duration-700"
                : "opacity-0 transition-opacity duration-300"
            }
          >
            <p className="font-display text-lead font-medium text-ink">
              {siteCopy.workflow.verdict}
            </p>
            <p className="mt-2 font-display text-lead font-medium text-ink-muted">
              {siteCopy.workflow.follow}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/** Exported for the geometry and script tests. */
export const workflowLayout = LAYOUT;
export const workflowEdgePaths = (): string[] => {
  const nodes = new Map(LAYOUT.nodes.map((node) => [node.id, node]));
  return LAYOUT.edges.map((edge) => edgePath(edge, nodes));
};
export const workflowBeats = BEATS;
export const workflowSequence = SEQUENCE;
