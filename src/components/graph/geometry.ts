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
  frame: FlowFrame,
): { left: string; top: string; width: string; height: string } {
  const { w, h } = nodeSize(node);
  return {
    left: `${((node.x - w / 2 - frame.x) / frame.width) * 100}%`,
    top: `${((node.y - h / 2 - frame.y) / frame.height) * 100}%`,
    width: `${(w / frame.width) * 100}%`,
    height: `${(h / frame.height) * 100}%`,
  };
}

/** The rectangle a diagram actually occupies, in design-space units. */
export type FlowFrame = { x: number; y: number; width: number; height: number };

/**
 * The bounding box of everything a diagram draws: every node box, plus any
 * routing waypoints, which is what includes the return lanes that run outside
 * the node grid.
 *
 * This is the frame the diagram is rendered in, and deriving it rather than
 * using the declared design space is what aligns a diagram to the text column.
 * A declared box is almost never the same size as its content, so rendering into
 * it leaves a different margin on each side: the workflow diagram was inset 58px
 * on the left and 144px on the right, against text that starts at exactly 144.
 * The eye reads that as "misaligned" long before it can say why. With the frame
 * derived, both insets are zero by construction, and each diagram spans the
 * column edge to edge.
 */
export function contentFrame(layout: FlowLayout): FlowFrame {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of layout.nodes) {
    const { w, h } = nodeSize(node);
    minX = Math.min(minX, node.x - w / 2);
    maxX = Math.max(maxX, node.x + w / 2);
    minY = Math.min(minY, node.y - h / 2);
    maxY = Math.max(maxY, node.y + h / 2);
  }

  for (const edge of layout.edges) {
    for (const point of edge.via ?? []) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
