import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  attemptBlocked,
  clearedCookie,
  clearFailures,
  issueSession,
  passwordMatches,
  readSessionCookie,
  recordFailure,
  resetAttempts,
  sessionCookie,
  sessionValid,
  SESSION_DAYS,
  statsDisabled,
  statsPassword,
} from "./auth";

const NOW = new Date("2026-09-12T10:00:00.000Z");

describe("the configured password", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is absent when nothing is set, which disables the whole area", () => {
    vi.stubEnv("STATS_PASSWORD", "");

    expect(statsPassword()).toBeNull();
    expect(statsDisabled()).toBe(true);
  });

  it("is present when set", () => {
    vi.stubEnv("STATS_PASSWORD", "correct horse");

    expect(statsPassword()).toBe("correct horse");
    expect(statsDisabled()).toBe(false);
  });

  it("compares without accepting a prefix or an empty string", () => {
    vi.stubEnv("STATS_PASSWORD", "correct horse");

    expect(passwordMatches("correct horse")).toBe(true);
    expect(passwordMatches("correct hors")).toBe(false);
    expect(passwordMatches("correct horse ")).toBe(false);
    expect(passwordMatches("")).toBe(false);
  });
});

describe("sessions", () => {
  beforeEach(() => {
    vi.stubEnv("STATS_PASSWORD", "correct horse");
    resetAttempts();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a token it just issued", () => {
    const { token } = issueSession(NOW);

    expect(sessionValid(token, NOW)).toBe(true);
  });

  it("expires after the configured window and not before", () => {
    const { token } = issueSession(NOW);
    const justInside = new Date(
      NOW.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000 - 1000,
    );
    const past = new Date(
      NOW.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000 + 1000,
    );

    expect(sessionValid(token, justInside)).toBe(true);
    expect(sessionValid(token, past)).toBe(false);
  });

  it("refuses a token whose expiry was edited", () => {
    const { token } = issueSession(NOW);
    const signature = token.slice(token.indexOf(".") + 1);
    const forged = `${String(Math.floor(NOW.getTime() / 1000) + 100_000)}.${signature}`;

    expect(sessionValid(forged, NOW)).toBe(false);
  });

  it("refuses a token signed with a different password", () => {
    const { token } = issueSession(NOW);
    vi.stubEnv("STATS_PASSWORD", "a different password");

    // Rotating the password has to sign everyone out.
    expect(sessionValid(token, NOW)).toBe(false);
  });

  it("refuses a malformed or absent token", () => {
    for (const value of [
      undefined,
      "",
      ".",
      "abc",
      "abc.",
      ".def",
      "not-an-int.zz",
    ]) {
      expect(sessionValid(value, NOW)).toBe(false);
    }
  });

  it("refuses everything when no password is configured", () => {
    const { token } = issueSession(NOW);
    vi.stubEnv("STATS_PASSWORD", "");

    expect(sessionValid(token, NOW)).toBe(false);
  });

  it("reads its own cookie out of a crowded header", () => {
    expect(readSessionCookie("other=1; porcess_stats=abc.def; another=2")).toBe(
      "abc.def",
    );
    expect(readSessionCookie("other=1")).toBeUndefined();
    expect(readSessionCookie(null)).toBeUndefined();
  });

  it("marks the cookie httpOnly and scoped to the private path", () => {
    const cookie = sessionCookie("abc.def", NOW, true);

    expect(cookie).toContain("Path=/a/n/stats");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    // Scoped tightly: it must never be sent to the public page.
    expect(cookie).not.toContain("Path=/;");
  });

  it("omits Secure when the request did not arrive over TLS", () => {
    // A Secure cookie is dropped over plain http, which would make every
    // correct password look wrong in local development.
    expect(sessionCookie("abc.def", NOW, false)).not.toContain("Secure");
  });

  it("clears with an already expired cookie", () => {
    const cookie = clearedCookie(false);

    expect(cookie).toContain("porcess_stats=");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970");
  });
});

describe("login attempts", () => {
  beforeEach(() => {
    resetAttempts();
  });

  it("allows five failures an hour and then blocks", () => {
    const key = "caller";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(attemptBlocked(key, NOW)).toBe(false);
      recordFailure(key, NOW);
    }

    expect(attemptBlocked(key, NOW)).toBe(true);
  });

  it("forgets the failures once the window passes", () => {
    const key = "caller";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordFailure(key, NOW);
    }
    expect(attemptBlocked(key, NOW)).toBe(true);

    const later = new Date(NOW.getTime() + 60 * 60 * 1000 + 1000);
    expect(attemptBlocked(key, later)).toBe(false);
  });

  it("counts callers separately", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordFailure("noisy", NOW);
    }

    expect(attemptBlocked("noisy", NOW)).toBe(true);
    expect(attemptBlocked("quiet", NOW)).toBe(false);
  });

  it("forgets a caller's failures on a correct password", () => {
    recordFailure("caller", NOW);
    clearFailures("caller");

    expect(attemptBlocked("caller", NOW)).toBe(false);
  });
});
