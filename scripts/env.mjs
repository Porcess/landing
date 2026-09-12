/**
 * Reads a value from the environment, falling back to `.env`.
 *
 * `next dev` loads `.env` for the application, but a plain `node scripts/...`
 * does not, so a script that tells you to put something in `.env` has to honour
 * `.env` or the message is a lie. The shell still wins when it sets the
 * variable, which is what makes a one-off override possible.
 */

import { readFile } from "node:fs/promises";

export async function envValue(name) {
  const fromShell = process.env[name];
  if (fromShell !== undefined && fromShell.length > 0) {
    return fromShell;
  }

  let source;
  try {
    source = await readFile(new URL("../.env", import.meta.url), "utf8");
  } catch {
    // No .env at all, which is normal on a deployed host.
    return undefined;
  }

  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (trimmed.slice(0, separator).trim() !== name) {
      continue;
    }

    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (value.length > 0) {
      return value;
    }
  }

  return undefined;
}
