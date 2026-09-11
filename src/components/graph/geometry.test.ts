import { describe, expect, it } from "vitest";

import { anchor, edgePath, nodeBoxPercent, type FlowLayout } from "./geometry";

const layout: FlowLayout = {
  width: 1000,
  height: 500,
  nodes: [
    { id: "a", label: "A", x: 200, y: 100 },
    { id: "b", label: "B", x: 800, y: 400, w: 100, h: 50 },
  ],
  edges: [],
};

describe("anchor", () => {
  it("returns the midpoint of each side of the box", () => {
    const node = layout.nodes[1]!;

    expect(anchor(node, "top")).toEqual({ x: 800, y: 375 });
    expect(anchor(node, "bottom")).toEqual({ x: 800, y: 425 });
    expect(anchor(node, "left")).toEqual({ x: 750, y: 400 });
    expect(anchor(node, "right")).toEqual({ x: 850, y: 400 });
  });

  it("falls back to the default box size", () => {
    const node = layout.nodes[0]!;
    // Default width 240, height 76.
    expect(anchor(node, "left")).toEqual({ x: 80, y: 100 });
  });
});

describe("edgePath", () => {
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

  it("produces a cubic curve between two anchors", () => {
    const d = edgePath(
      { from: "a", to: "b", fromSide: "right", toSide: "left" },
      nodes,
    );

    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain(" C ");
    // Every number is finite, which is what a NaN coordinate would break.
    expect(d).not.toMatch(/NaN|undefined/);
  });

  it("produces a straight line when asked", () => {
    const d = edgePath(
      {
        from: "a",
        to: "b",
        fromSide: "right",
        toSide: "left",
        shape: "line",
      },
      nodes,
    );

    expect(d).toContain(" L ");
    expect(d).not.toContain(" C ");
  });

  it("routes through waypoints when given them", () => {
    const d = edgePath(
      {
        from: "a",
        to: "b",
        fromSide: "left",
        toSide: "left",
        via: [
          { x: 20, y: 300 },
          { x: 20, y: 400 },
        ],
      },
      nodes,
    );

    // Start, two waypoints, end: three line segments.
    expect(d.match(/L /g)).toHaveLength(3);
  });

  it("returns an empty path when a node is missing", () => {
    const d = edgePath(
      { from: "a", to: "nowhere", fromSide: "right", toSide: "left" },
      nodes,
    );
    expect(d).toBe("");
  });
});

describe("nodeBoxPercent", () => {
  it("positions a node as a percentage of the design space", () => {
    const box = nodeBoxPercent(layout.nodes[0]!, layout);

    // Centre 200 of 1000 wide, 240 wide: left edge 80, so 8%.
    expect(box.left).toBe("8%");
    expect(box.width).toBe("24%");
    expect(box.top).toBe("12.4%");
  });
});
