import { describe, expect, it } from "vitest";

import { deriveFlowState, statusFor, type FlowBeat } from "./flow-state";

const WORDS = {
  queued: "QUEUED",
  running: "RUNNING",
  done: "DONE",
  failed: "FAILED",
};

const nodes = [
  { id: "a", label: "A", x: 0, y: 0 },
  { id: "b", label: "B", x: 100, y: 0 },
  { id: "c", label: "C", x: 200, y: 0 },
];

const beats: FlowBeat[] = [
  {
    hold: 100,
    nodes: { a: "running" },
    draw: [["a", "b"]],
    pulse: [["a", "b"]],
  },
  { hold: 100, nodes: { a: "done", b: "queued" } },
  { hold: 100, nodes: { b: "failed" }, pulse: [["b", "c"]] },
  { hold: 100, nodes: { c: "done" } },
];

describe("statusFor", () => {
  it("maps every state to a word", () => {
    expect(statusFor("queued", WORDS)).toBe("QUEUED");
    expect(statusFor("running", WORDS)).toBe("RUNNING");
    expect(statusFor("done", WORDS)).toBe("DONE");
    expect(statusFor("failed", WORDS)).toBe("FAILED");
    expect(statusFor("absent", WORDS)).toBeUndefined();
  });
});

describe("deriveFlowState", () => {
  it("starts empty", () => {
    const state = deriveFlowState(beats, 0, nodes, WORDS);

    expect(state.states).toEqual({});
    expect(state.drawnEdges.size).toBe(0);
    expect(state.pulsingEdges.size).toBe(0);
    expect(state.statuses.a).toBeUndefined();
  });

  it("accumulates node states across beats", () => {
    // Two beats in: `a` was running, then marked done, and `b` has appeared.
    const state = deriveFlowState(beats, 2, nodes, WORDS);

    expect(state.states).toEqual({ a: "done", b: "queued" });
    expect(state.statuses.a).toBe("DONE");
    expect(state.statuses.b).toBe("QUEUED");
    expect(state.statuses.c).toBeUndefined();
  });

  it("keeps drawn edges once they are drawn", () => {
    const state = deriveFlowState(beats, 2, nodes, WORDS);
    expect(state.drawnEdges.has("a->b")).toBe(true);
  });

  it("pulses only the edges of the beat in progress", () => {
    const state = deriveFlowState(beats, 1, nodes, WORDS);
    expect([...state.pulsingEdges]).toEqual(["a->b"]);

    // Three beats in of four: still mid-script, so the beat in progress owns
    // the pulse rather than the settled set.
    const later = deriveFlowState(beats, 3, nodes, WORDS);
    expect([...later.pulsingEdges]).toEqual(["b->c"]);
  });

  it("hands settled pulses over once the script finishes", () => {
    const state = deriveFlowState(beats, beats.length, nodes, WORDS, [
      ["b", "c"],
    ]);

    expect([...state.pulsingEdges]).toEqual(["b->c"]);
    expect(state.states.b).toBe("failed");
  });

  it("never pulses anything after a script with no settled pulses", () => {
    const state = deriveFlowState(beats, beats.length, nodes, WORDS);
    expect(state.pulsingEdges.size).toBe(0);
  });
});
