import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const insertSignup = vi.fn();

vi.mock("@/lib/early-access/store", () => ({
  insertSignup: (input: unknown) => insertSignup(input) as unknown,
  targetDatabase: () => "test-database",
}));

// `after()` only exists inside a request lifecycle.
vi.mock("next/server", () => ({
  after: () => undefined,
}));

const { GET, POST } = await import("./route");

function post(
  body: unknown,
  origin?: string,
  url = "https://porcess.com/early-access",
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin === undefined ? {} : { origin }),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

const validSubmission = {
  email: "Builder@Example.com",
  attribution: {
    referrer: "https://news.ycombinator.com/",
    utmSource: "hn",
    utmMedium: "social",
    utmCampaign: "launch",
    utmContent: null,
    utmTerm: null,
  },
};

describe("POST /early-access", () => {
  beforeEach(() => {
    insertSignup.mockReset();
    insertSignup.mockResolvedValue({ status: "subscribed", id: "abc" });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores a new address and reports success", async () => {
    const response = await POST(post(validSubmission));

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ status: "subscribed" });
    expect(insertSignup).toHaveBeenCalledTimes(1);
    expect(insertSignup.mock.calls[0][0]).toMatchObject({
      email: "Builder@Example.com",
      emailNormalized: "builder@example.com",
      attribution: { utmSource: "hn" },
    });
  });

  it("treats a repeat address as success rather than an error", async () => {
    insertSignup.mockResolvedValue({ status: "already_subscribed" });

    const response = await POST(post(validSubmission));

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ status: "already_subscribed" });
  });

  it("accepts a filled honeypot silently and stores nothing", async () => {
    const response = await POST(
      post({ ...validSubmission, honeypot: "bot-was-here" }),
    );

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ status: "subscribed" });
    expect(insertSignup).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty submission", { email: "" }, "empty"],
    ["a malformed address", { email: "not-an-email" }, "invalid"],
    ["a missing address", {}, "empty"],
  ])(
    "rejects %s without touching storage",
    async (_label, payload, problem) => {
      const response = await POST(post(payload));

      expect(response.status).toBe(400);
      expect(await body(response)).toEqual({ status: "invalid", problem });
      expect(insertSignup).not.toHaveBeenCalled();
    },
  );

  it("rejects a body that is too large", async () => {
    const response = await POST(post("x".repeat(5000)));

    expect(response.status).toBe(413);
    expect(insertSignup).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin submission", async () => {
    const response = await POST(post(validSubmission, "https://spam.example"));

    expect(response.status).toBe(403);
    expect(insertSignup).not.toHaveBeenCalled();
  });

  it("allows a same-origin submission that carries an origin header", async () => {
    const response = await POST(post(validSubmission, "https://porcess.com"));

    expect(response.status).toBe(200);
  });

  it("treats loopback forms of the same machine and port as same-origin", async () => {
    // The production server can canonicalize its own hostname to `localhost`
    // while the page was reached over `127.0.0.1`. That must not read as a
    // forgery, or no signup from that address can ever succeed.
    const response = await POST(
      post(
        validSubmission,
        "http://127.0.0.1:3106",
        "http://localhost:3106/early-access",
      ),
    );

    expect(response.status).toBe(200);
    expect(insertSignup).toHaveBeenCalledTimes(1);
  });

  it("still rejects a loopback origin aimed at a different port", async () => {
    const response = await POST(
      post(
        validSubmission,
        "http://127.0.0.1:3106",
        "http://localhost:3105/early-access",
      ),
    );

    expect(response.status).toBe(403);
    expect(insertSignup).not.toHaveBeenCalled();
  });

  it("fails closed when the database is not configured", async () => {
    insertSignup.mockResolvedValue({ status: "unconfigured" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(post(validSubmission));

    expect(response.status).toBe(503);
    expect(await body(response)).toEqual({ status: "unconfigured" });
  });

  it("reports a storage failure without leaking the reason", async () => {
    insertSignup.mockRejectedValue(new Error("connection refused to db-host"));
    const logger = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(post(validSubmission));

    expect(response.status).toBe(500);
    expect(await body(response)).toEqual({ status: "error" });

    // The log names the target database and the failure, but the response
    // carries neither, so a misconfigured deploy is diagnosable without
    // exposing internals to the visitor.
    const logged = logger.mock.calls.flat().join(" ");
    expect(logged).toContain("test-database");
    expect(logged).toContain("connection refused");
  });

  it("never writes an address into a log line", async () => {
    await POST(post(validSubmission));

    const logged = vi.mocked(console.info).mock.calls.flat().join(" ");
    expect(logged).not.toContain("Builder@Example.com");
    expect(logged).not.toContain("builder@example.com");
  });
});

describe("other methods", () => {
  it("answers GET with 405 and an Allow header", async () => {
    const response = GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});
