import type { NodeState } from "@/components/graph/flow-node";
import type { FlowNode } from "@/components/graph/geometry";

/**
 * A scripted flow, expressed as beats.
 *
 * Each beat merges its changes into the running state, so a beat describes only
 * what is new. Sections declare their story as data and share this projection
 * rather than each deriving statuses and edge sets by hand.
 */
export type FlowBeat = {
  /** How long the beat holds before the next one. */
  hold: number;
  nodes?: Record<string, NodeState>;
  /** Edges that become drawn at this beat. */
  draw?: [string, string][];
  /** Edges that carry a pulse during this beat. */
  pulse?: [string, string][];
};

export type FlowState = {
  states: Record<string, NodeState>;
  statuses: Record<string, string | undefined>;
  drawnEdges: Set<string>;
  pulsingEdges: Set<string>;
};

/** The status word for a node state. Always text, never colour alone. */
export function statusFor(
  state: NodeState,
  words: { queued: string; running: string; done: string; failed: string },
): string | undefined {
  switch (state) {
    case "queued":
      return words.queued;
    case "running":
      return words.running;
    case "done":
      return words.done;
    case "failed":
      return words.failed;
    case "absent":
      return undefined;
  }
}

/**
 * Projects the first `active` beats into renderable state.
 *
 * Once the script has finished, `settledPulses` keeps chosen edges alive so a
 * resolved diagram still breathes instead of freezing on its final frame.
 */
export function deriveFlowState(
  beats: FlowBeat[],
  active: number,
  nodes: FlowNode[],
  statusWords: {
    queued: string;
    running: string;
    done: string;
    failed: string;
  },
  settledPulses: [string, string][] = [],
): FlowState {
  const states: Record<string, NodeState> = {};
  const drawnEdges = new Set<string>();
  const pulsingEdges = new Set<string>();

  for (let index = 0; index < active && index < beats.length; index += 1) {
    const beat = beats[index];
    if (beat === undefined) {
      continue;
    }

    Object.assign(states, beat.nodes ?? {});
    for (const [from, to] of beat.draw ?? []) {
      drawnEdges.add(`${from}->${to}`);
    }
  }

  if (active >= beats.length) {
    for (const [from, to] of settledPulses) {
      pulsingEdges.add(`${from}->${to}`);
    }
  } else {
    for (const [from, to] of beats[active - 1]?.pulse ?? []) {
      pulsingEdges.add(`${from}->${to}`);
    }
  }

  const statuses: Record<string, string | undefined> = {};
  for (const node of nodes) {
    statuses[node.id] = statusFor(states[node.id] ?? "absent", statusWords);
  }

  return { states, statuses, drawnEdges, pulsingEdges };
}
