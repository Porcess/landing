import { describe, expect, it } from "vitest";

import {
  checkEmail,
  clampField,
  isValidEmail,
  normalizeEmail,
} from "./validation";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Builder@Example.COM ")).toBe(
      "builder@example.com",
    );
  });
});

describe("isValidEmail", () => {
  it.each(["builder@example.com", "first.last+tag@sub.domain.co", "a@b.co"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each([
    "",
    "   ",
    "builder",
    "builder@",
    "@example.com",
    "builder@example",
    "builder@@example.com",
    "builder@exam ple.com",
    "builder @example.com",
    ".builder@example.com",
    "builder.@example.com",
    "build..er@example.com",
    "builder@example..com",
    "builder@example.com-",
    `${"a".repeat(65)}@example.com`,
  ])("rejects %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("rejects anything longer than the address limit", () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(200)}.com`;
    expect(`${local}@${domain}`.length).toBeGreaterThan(254);
    expect(isValidEmail(`${local}@${domain}`)).toBe(false);
  });
});

describe("checkEmail", () => {
  it("distinguishes an empty submission from an invalid one", () => {
    expect(checkEmail("")).toEqual({ ok: false, problem: "empty" });
    expect(checkEmail("   ")).toEqual({ ok: false, problem: "empty" });
    expect(checkEmail(undefined)).toEqual({ ok: false, problem: "empty" });
    expect(checkEmail(42)).toEqual({ ok: false, problem: "empty" });
    expect(checkEmail("nope")).toEqual({ ok: false, problem: "invalid" });
  });

  it("returns the trimmed address and its normalized form", () => {
    expect(checkEmail(" Builder@Example.com ")).toEqual({
      ok: true,
      email: "Builder@Example.com",
      normalized: "builder@example.com",
    });
  });
});

describe("clampField", () => {
  it("collapses whitespace, trims and bounds", () => {
    expect(clampField("  a   b  ")).toBe("a b");
    expect(clampField("x".repeat(600))).toHaveLength(512);
    expect(clampField("x".repeat(600), 10)).toHaveLength(10);
  });

  it("returns null for anything that is not usable text", () => {
    expect(clampField("")).toBeNull();
    expect(clampField("   ")).toBeNull();
    expect(clampField(undefined)).toBeNull();
    expect(clampField(7)).toBeNull();
  });
});
