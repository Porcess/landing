"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";

/**
 * Opens the session: records how the visitor arrived and that they saw the
 * page. Mounted once from the root layout, renders nothing.
 */
export function SessionStart() {
  useEffect(() => {
    captureAttribution();
    track("page_view");
  }, []);

  return null;
}
