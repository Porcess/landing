/**
 * A random id the browser keeps for itself.
 *
 * This is what makes "unique visitors" a real number without surveilling
 * anyone. It is generated here, not derived: not from the address, not from the
 * user agent, not from anything about the device. Two people on the same
 * machine and browser profile are the same visitor; one person on two devices
 * is two, which is the honest limit of a first-party identifier and is worth
 * saying out loud rather than pretending the number is exact.
 *
 * Clearing site data resets it, and that is a feature. Nothing else in the
 * application depends on it, so losing it costs nothing but a slightly higher
 * visitor count.
 */

const STORAGE_KEY = "porcess.visitor.v1";

let cached: string | null = null;

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the older path below.
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * The visitor's id, creating one on first use. Returns null when storage is
 * unavailable, which is normal in private modes and must never throw.
 */
export function getVisitorId(): string | null {
  if (cached !== null) {
    return cached;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing !== null && existing.length > 0) {
      cached = existing;
      return cached;
    }

    const created = randomId();
    window.localStorage.setItem(STORAGE_KEY, created);
    cached = created;
    return cached;
  } catch {
    return null;
  }
}
