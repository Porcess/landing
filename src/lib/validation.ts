/**
 * Email validation shared by the browser and the route handler.
 *
 * Deliberately hand written and dependency free: the only field on this page is
 * an email address, and the route is the authority. Anything that passes here
 * is still checked by the database's unique index.
 */

export const EMAIL_MAX_LENGTH = 254;
const LOCAL_MAX_LENGTH = 64;
const FIELD_MAX_LENGTH = 512;

/**
 * Pragmatic validation: one `@`, no whitespace, a dotted domain, sane lengths.
 * It is intentionally not RFC 5322 complete, since no validator is, and the
 * real confirmation is whether mail is ever deliverable.
 */
const EMAIL_SHAPE = /^[^\s@,;:<>()[\]\\]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export type EmailProblem = "empty" | "invalid";

export type EmailCheck =
  | { ok: true; email: string; normalized: string }
  | { ok: false; problem: EmailProblem };

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const email = value.trim();

  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) {
    return false;
  }

  const local = email.slice(0, at);
  if (local.length > LOCAL_MAX_LENGTH) {
    return false;
  }

  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }

  if (!EMAIL_SHAPE.test(email)) {
    return false;
  }

  const domain = email.slice(at + 1);
  return !domain.endsWith("-") && !domain.includes("..");
}

export function checkEmail(raw: unknown): EmailCheck {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, problem: "empty" };
  }

  const email = raw.trim();
  if (!isValidEmail(email)) {
    return { ok: false, problem: "invalid" };
  }

  return { ok: true, email, normalized: normalizeEmail(email) };
}

/** Bounds free-form attribution fields so a hostile payload cannot bloat a row. */
export function clampField(
  value: unknown,
  max = FIELD_MAX_LENGTH,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, max);
}
