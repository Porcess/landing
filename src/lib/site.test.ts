import { afterEach, describe, expect, it, vi } from "vitest";

async function siteUrlWith(value: string | undefined): Promise<string> {
  vi.resetModules();
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
  }
  const mod = await import("./site");
  return mod.SITE_URL;
}

describe("SITE_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to production when unset", async () => {
    await expect(siteUrlWith(undefined)).resolves.toBe("https://porcess.com");
  });

  it("falls back on an empty Vercel placeholder instead of throwing", async () => {
    await expect(siteUrlWith("")).resolves.toBe("https://porcess.com");
  });

  it("falls back on whitespace or an unparsable value", async () => {
    await expect(siteUrlWith("   ")).resolves.toBe("https://porcess.com");
    await expect(siteUrlWith("not a url")).resolves.toBe("https://porcess.com");
  });

  it("keeps a valid URL and strips trailing slashes", async () => {
    await expect(siteUrlWith("https://porcess.com///")).resolves.toBe(
      "https://porcess.com",
    );
    await expect(siteUrlWith("http://localhost:3105")).resolves.toBe(
      "http://localhost:3105",
    );
  });

  it("is always a valid metadataBase", async () => {
    for (const value of [undefined, "", "   ", "not a url"] as const) {
      const url = await siteUrlWith(value);
      expect(() => new URL(url)).not.toThrow();
    }
  });
});
