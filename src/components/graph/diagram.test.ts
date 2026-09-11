import { describe, expect, it } from "vitest";

import { edgePath } from "./geometry";
import {
  graphBeats,
  graphLayout,
} from "@/components/workgraph/work-graph-section";
import {
  workflowBeats,
  workflowEdgePaths,
  workflowLayout,
  workflowSequence,
} from "@/components/workflow/workflow-section";

/**
 * The diagrams are data, so the data can be checked. These catch the mistakes
 * that are otherwise invisible until someone looks at the rendered page: an edge
 * pointing at a node that does not exist, a node sitting outside the design box,
 * or a story whose statuses never resolve.
 */

const diagrams = [
  { name: "workflow", layout: workflowLayout, beats: workflowBeats },
  { name: "work graph", layout: graphLayout, beats: graphBeats },
];

describe.each(diagrams)("$name diagram", ({ layout, beats }) => {
  const ids = new Set(layout.nodes.map((node) => node.id));

  it("has nodes and edges", () => {
    expect(layout.nodes.length).toBeGreaterThan(3);
    expect(layout.edges.length).toBeGreaterThan(3);
  });

  it("points every edge at nodes that exist", () => {
    for (const edge of layout.edges) {
      expect(ids.has(edge.from), `missing ${edge.from}`).toBe(true);
      expect(ids.has(edge.to), `missing ${edge.to}`).toBe(true);
    }
  });

  it("keeps every node fully inside the design box", () => {
    for (const node of layout.nodes) {
      const w = node.w ?? 240;
      const h = node.h ?? 76;
      expect(node.x - w / 2).toBeGreaterThanOrEqual(0);
      expect(node.x + w / 2).toBeLessThanOrEqual(layout.width);
      expect(node.y - h / 2).toBeGreaterThanOrEqual(0);
      expect(node.y + h / 2).toBeLessThanOrEqual(layout.height);
    }
  });

  it("gives every node a label", () => {
    for (const node of layout.nodes) {
      expect(node.label.length).toBeGreaterThan(0);
    }
  });

  it("produces a valid path for every edge", () => {
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
    for (const edge of layout.edges) {
      const d = edgePath(edge, nodes);
      expect(d.length).toBeGreaterThan(0);
      expect(d).not.toMatch(/NaN|undefined/);
    }
  });

  it("only draws and pulses edges that exist", () => {
    const keys = new Set(
      layout.edges.map((edge) => `${edge.from}->${edge.to}`),
    );

    for (const beat of beats) {
      for (const [from, to] of [...(beat.draw ?? []), ...(beat.pulse ?? [])]) {
        expect(
          keys.has(`${from}->${to}`),
          `${from}->${to} is not an edge`,
        ).toBe(true);
      }
    }
  });

  it("only names nodes that exist", () => {
    for (const beat of beats) {
      for (const id of Object.keys(beat.nodes ?? {})) {
        expect(ids.has(id), `${id} is not a node`).toBe(true);
      }
    }
  });

  it("resolves every node it introduces", () => {
    // A node left as `running` at the end means the story stops mid-sentence.
    const final: Record<string, string> = {};
    for (const beat of beats) {
      Object.assign(final, beat.nodes ?? {});
    }

    const unresolved = Object.entries(final)
      .filter(([, state]) => state === "running" || state === "queued")
      .map(([id]) => id);

    expect(unresolved).toEqual([]);
  });

  it("has a positive hold on every beat", () => {
    for (const beat of beats) {
      expect(beat.hold).toBeGreaterThan(0);
    }
  });
});

describe("workflow", () => {
  it("tells the failure story", () => {
    expect(workflowLayout.edges.some((edge) => edge.failed)).toBe(true);
  });

  it("loops back to where it started", () => {
    const first = workflowSequence[0];
    const last = workflowSequence.at(-1);
    expect(first).toBeDefined();
    expect(
      workflowLayout.edges.some(
        (edge) => edge.from === last && edge.to === first,
      ),
    ).toBe(true);
  });

  it("draws every edge, so nothing is left dangling", () => {
    const drawn = workflowEdgePaths();
    expect(drawn.every((d) => d.length > 0)).toBe(true);
  });
});
