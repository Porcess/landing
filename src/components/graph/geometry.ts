/**
 * Geometry for the flow diagrams.
 *
 * A diagram is declared as nodes with a centre point and a size, plus edges that
 * name the two nodes and which side of each they attach to. Everything else
 * (anchor points, path strings, the loop that closes a cycle) is derived, so a
 * section describes its flow rather than a pile of hand-tuned coordinates.
 *
 * Positions live in a fixed design space. The rendering layer maps that space
 * onto a box with the same aspect ratio, which is what keeps curves and stroke
 * weights undistorted at every width.
 */

export type Side = "top" | "right" | "bottom" | "left";

export type FlowPoint = { x: number; y: number };

export type FlowNode = {
  id: string;
  label: string;
  /** Centre of the box, in design-space units. */
  x: number;
  y: number;
  /** Box size in design-space units. Node labels are HTML, so this only lays out. */
  w?: number;
  h?: number;
};

export type FlowEdge = {
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
  /** Explicit waypoints, for edges that must route around the diagram. */
  via?: FlowPoint[];
  /**
   * How the edge is drawn when there are no waypoints. `curve` is a soft
   * bezier, `line` is straight.
   */
  shape?: "curve" | "line";
  /** Marks a failure path, so it can be drawn in the alert tone. */
  failed?: boolean;
};

export type FlowLayout = {
  /** Design space. The container is given the same aspect ratio. */
  width: number;
  height: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const DEFAULT_NODE_W = 240;
export const DEFAULT_NODE_H = 76;

export function nodeSize(node: FlowNode): { w: number; h: number } {
  return { w: node.w ?? DEFAULT_NODE_W, h: node.h ?? DEFAULT_NODE_H };
}

export function anchor(node: FlowNode, side: Side): FlowPoint {
  const { w, h } = nodeSize(node);
  switch (side) {
    case "top":
      return { x: node.x, y: node.y - h / 2 };
    case "bottom":
      return { x: node.x, y: node.y + h / 2 };
    case "left":
      return { x: node.x - w / 2, y: node.y };
    case "right":
      return { x: node.x + w / 2, y: node.y };
  }
}

/** Where a curved edge leaves its node, so the tangent points the right way. */
function controlOffset(side: Side, distance: number): FlowPoint {
  switch (side) {
    case "top":
      return { x: 0, y: -distance };
    case "bottom":
      return { x: 0, y: distance };
    case "left":
      return { x: -distance, y: 0 };
    case "right":
      return { x: distance, y: 0 };
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Builds the SVG path for an edge. Curved edges bow out of each node along the
 * side it attaches to, which is what stops a fan of edges from collapsing onto
 * one line as they leave a shared source.
 */
export function edgePath(edge: FlowEdge, nodes: Map<string, FlowNode>): string {
  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (from === undefined || to === undefined) {
    return "";
  }

  const start = anchor(from, edge.fromSide);
  const end = anchor(to, edge.toSide);

  if (edge.via !== undefined && edge.via.length > 0) {
    const points = [start, ...edge.via, end];
    return points
      .map((point, index) =>
        index === 0
          ? `M ${round(point.x)} ${round(point.y)}`
          : `L ${round(point.x)} ${round(point.y)}`,
      )
      .join(" ");
  }

  if (edge.shape === "line") {
    return `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`;
  }

  // Bow proportional to the distance travelled, capped so long edges do not
  // swing out into a balloon.
  const distance = Math.min(
    180,
    Math.max(
      48,
      (Math.abs(end.x - start.x) + Math.abs(end.y - start.y)) * 0.35,
    ),
  );

  const c1 = controlOffset(edge.fromSide, distance);
  const c2 = controlOffset(edge.toSide, distance);

  return [
    `M ${round(start.x)} ${round(start.y)}`,
    `C ${round(start.x + c1.x)} ${round(start.y + c1.y)}`,
    `${round(end.x + c2.x)} ${round(end.y + c2.y)}`,
    `${round(end.x)} ${round(end.y)}`,
  ].join(" ");
}

/** Percentage position and size, for placing HTML nodes over the SVG layer. */
export function nodeBoxPercent(
  node: FlowNode,
  layout: FlowLayout,
): { left: string; top: string; width: string; height: string } {
  const { w, h } = nodeSize(node);
  return {
    left: `${((node.x - w / 2) / layout.width) * 100}%`,
    top: `${((node.y - h / 2) / layout.height) * 100}%`,
    width: `${(w / layout.width) * 100}%`,
    height: `${(h / layout.height) * 100}%`,
  };
}
