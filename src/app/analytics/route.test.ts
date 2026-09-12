import { beforeEach, describe, expect, it, vi } from "vitest";

const insertEvent = vi.fn();

vi.mock("@/lib/analytics-store", () => ({
  insertEvent: (input: unknown) => insertEvent(input) as unknown,
}));

const { GET, POST } = await import("./route");

const SITE = "https://porcess.com/analytics";

function post(body: unknown, origin?: string): Request {
  return new Request(SITE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin === undefined ? {} : { origin }),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validEvent = {
  event: "page_view",
  path: "/",
  visitor: "6a3f0c9e-1111-2222-3333-444455556666",
  properties: { placement: "hero" },
  attribution: { utmSource: "hn" },
};

describe("POST /analytics", () => {
  beforeEach(() => {
    insertEvent.mockReset();
    insertEvent.mockResolvedValue({ status: "stored" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("stores a well formed event", async () => {
    const response = await POST(post(validEvent));

    expect(response.status).toBe(204);
    expect(insertEvent).toHaveBeenCalledTimes(1);
    expect(insertEvent.mock.calls[0]?.[0]).toMatchObject({
      name: "page_view",
      path: "/",
      visitor: "6a3f0c9e-1111-2222-3333-444455556666",
      properties: { placement: "hero" },
    });
  });

  it("refuses an event name it does not know", async () => {
    const response = await POST(post({ event: "totally_made_up" }));

    expect(response.status).toBe(400);
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    const response = await POST(post("not json at all"));

    expect(response.status).toBe(400);
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("refuses an oversized body", async () => {
    const response = await POST(
      post({ event: "page_view", pad: "x".repeat(4096) }),
    );

    expect(response.status).toBe(400);
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("refuses a cross origin post", async () => {
    const response = await POST(post(validEvent, "https://evil.example"));

    expect(response.status).toBe(400);
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("accepts its own loopback origin", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3106/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3106",
        },
        body: JSON.stringify(validEvent),
      }),
    );

    expect(response.status).toBe(204);
    expect(insertEvent).toHaveBeenCalledTimes(1);
  });

  it("still answers 204 when the database is unconfigured", async () => {
    insertEvent.mockResolvedValue({ status: "unconfigured" });

    const response = await POST(post(validEvent));

    // The visitor is never told, and the dashboard's health strip is where a
    // misconfigured deploy gets noticed instead.
    expect(response.status).toBe(204);
  });

  it("still answers 204 when the store throws", async () => {
    insertEvent.mockRejectedValue(new Error("connection refused"));

    const response = await POST(post(validEvent));

    expect(response.status).toBe(204);
  });

  it("clamps a hostile path and visitor rather than trusting them", async () => {
    await POST(
      post({
        ...validEvent,
        path: `/${"x".repeat(600)}`,
        visitor: "y".repeat(600),
      }),
    );

    const input = insertEvent.mock.calls[0]?.[0] as {
      path: string;
      visitor: string;
    };

    expect(input.path.length).toBeLessThanOrEqual(256);
    expect(input.visitor.length).toBeLessThanOrEqual(64);
  });

  it("refuses a path that is not a path", async () => {
    await POST(post({ ...validEvent, path: "https://evil.example/steal" }));

    const input = insertEvent.mock.calls[0]?.[0] as { path: string };
    expect(input.path).toBe("/");
  });

  it("answers 405 to a read", async () => {
    expect(GET().status).toBe(405);
  });
});
