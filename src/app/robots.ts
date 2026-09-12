import type { MetadataRoute } from "next";

import { PRIVATE_PREFIX, SITE_URL } from "@/lib/site";

/**
 * The site is meant to be found, which is why the public pages are open.
 *
 * `/a/` is the exception: it holds the private dashboard, and the point of the
 * obscure path is that nobody arrives by accident. `noindex` on the page itself
 * covers the case where a crawler is handed the link anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [PRIVATE_PREFIX] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
