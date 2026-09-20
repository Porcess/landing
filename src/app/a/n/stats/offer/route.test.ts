import { beforeEach, describe, expect, it, vi } from "vitest";

const isAuthorised = vi.fn();
const statsDisabled = vi.fn();
const isSameOrigin = vi.fn();
const parseOfferInput = vi.fn();
const setActiveOffer = vi.fn();
const revalidatePath = vi.fn();
const notFound = vi.fn();

vi.mock("@/lib/stats/auth", () => ({
  isAuthorised: (...args: unknown[]) => isAuthorised(...args) as boolean,
  statsDisabled: () => statsDisabled() as boolean,
  STATS_PATH: "/a/n/stats",
}));

vi.mock("@/lib/request", () => ({
  isSameOrigin: (...args: unknown[]) => isSameOrigin(...args) as boolean,
}));

vi.mock("@/lib/offer/settings", () => ({
  parseOfferInput: (...args: unknown[]) => parseOfferInput(...args) as unknown,
  setActiveOffer: (...args: unknown[]) => setActiveOffer(...args) as unknown,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args) as unknown,
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFound() as never,
}));

const { GET, POST } = await import("./route");

function post(fields: Record<string, string>): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new Request("https://porcess.com/a/n/stats/offer", {
    method: "POST",
    body: form,
  });
}

const validFields = { percent: "75", basePriceCents: "2000" };

describe("POST /a/n/stats/offer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statsDisabled.mockReturnValue(false);
    isAuthorised.mockReturnValue(true);
    isSameOrigin.mockReturnValue(true);
    parseOfferInput.mockReturnValue({
      ok: true,
      offer: { percent: 75, basePriceCents: 2000 },
    });
    setActiveOffer.mockResolvedValue({
      ok: true,
      previous: { percent: 90, basePriceCents: 2000 },
      current: { percent: 75, basePriceCents: 2000 },
    });
  });

  it("saves a valid offer and returns to the dashboard", async () => {
    const response = await POST(post(validFields));

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "/a/n/stats?offer=saved#offer",
    );
    expect(setActiveOffer).toHaveBeenCalledWith({
      percent: 75,
      basePriceCents: 2000,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("does not exist without a session", async () => {
    isAuthorised.mockReturnValue(false);

    const response = await POST(post(validFields));

    expect(response.status).toBe(404);
    expect(setActiveOffer).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin post", async () => {
    isSameOrigin.mockReturnValue(false);

    const response = await POST(post(validFields));

    expect(response.status).toBe(403);
    expect(setActiveOffer).not.toHaveBeenCalled();
  });

  it("reports an invalid offer without writing", async () => {
    parseOfferInput.mockReturnValue({ ok: false });

    const response = await POST(post({ percent: "100", basePriceCents: "0" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "/a/n/stats?offer=invalid#offer",
    );
    expect(setActiveOffer).not.toHaveBeenCalled();
  });

  it("reports an unconfigured database", async () => {
    setActiveOffer.mockResolvedValue({ ok: false, reason: "unconfigured" });

    const response = await POST(post(validFields));

    expect(response.headers.get("Location")).toBe(
      "/a/n/stats?offer=unconfigured#offer",
    );
  });

  it("reports a failed write", async () => {
    setActiveOffer.mockResolvedValue({ ok: false, reason: "failed" });

    const response = await POST(post(validFields));

    expect(response.headers.get("Location")).toBe(
      "/a/n/stats?offer=failed#offer",
    );
  });

  it("disappears entirely when the dashboard is disabled", async () => {
    statsDisabled.mockReturnValue(true);

    await POST(post(validFields));

    expect(notFound).toHaveBeenCalled();
  });
});

describe("other methods", () => {
  it("answers GET with 405 and an Allow header", () => {
    const response = GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});
