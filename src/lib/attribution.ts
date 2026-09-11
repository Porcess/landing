/**
 * First-touch attribution.
 *
 * A visitor usually arrives from a campaign link and may submit the form after
 * scrolling, reloading or navigating within the page, so the parameters are
 * captured on the first view and reused for every later event and the signup
 * itself. Everything here degrades silently: private browsing modes that block
 * storage must never break the page.
 */

export type Attribution = {
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

const STORAGE_KEY = "porcess.attribution.v1";

export const EMPTY_ATTRIBUTION: Attribution = {
  referrer: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
};

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];

/** Pure mapping from raw query values to the stored shape. */
export function readAttribution(search: string, referrer: string): Attribution {
  const params = new URLSearchParams(search);
  const value = (key: UtmKey): string | null => {
    const raw = params.get(key);
    if (raw === null) {
      return null;
    }
    const trimmed = raw.trim().slice(0, 512);
    return trimmed.length === 0 ? null : trimmed;
  };

  const host = referrer.trim().slice(0, 512);

  return {
    referrer: host.length === 0 ? null : host,
    utmSource: value("utm_source"),
    utmMedium: value("utm_medium"),
    utmCampaign: value("utm_campaign"),
    utmContent: value("utm_content"),
    utmTerm: value("utm_term"),
  };
}

/** True when the record carries at least one campaign signal. */
export function hasAttribution(attribution: Attribution): boolean {
  return Object.values(attribution).some((entry) => entry !== null);
}

function readStore(): Attribution | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const pick = (key: keyof Attribution): string | null =>
      typeof record[key] === "string" ? (record[key] as string) : null;

    return {
      referrer: pick("referrer"),
      utmSource: pick("utmSource"),
      utmMedium: pick("utmMedium"),
      utmCampaign: pick("utmCampaign"),
      utmContent: pick("utmContent"),
      utmTerm: pick("utmTerm"),
    };
  } catch {
    return null;
  }
}

function writeStore(attribution: Attribution): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Storage is unavailable. Attribution stays best effort.
  }
}

/**
 * Records the arrival once per session. A later visit within the same session
 * never overwrites the first touch, which is what campaign reporting expects.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = readStore();
  if (existing !== null) {
    return;
  }

  const fresh = readAttribution(
    window.location.search,
    document.referrer ?? "",
  );

  if (hasAttribution(fresh)) {
    writeStore(fresh);
  }
}

/** The attribution to attach to an event or a signup. Never throws. */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") {
    return EMPTY_ATTRIBUTION;
  }

  return (
    readStore() ??
    readAttribution(window.location.search, document.referrer ?? "")
  );
}
