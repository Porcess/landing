import type { NextConfig } from "next";

/**
 * Baseline response headers for a public marketing page.
 *
 * `Referrer-Policy` stays at the default strict-origin-when-cross-origin value
 * on purpose: signup attribution reads `document.referrer`, which this policy
 * still supplies (origin only) for cross-site arrivals.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  /**
   * `pg` must not be bundled: it opens TCP/TLS sockets and does dynamic requires
   * that a bundler rewrites into something that cannot connect at runtime. It
   * stays a normal runtime dependency resolved from node_modules.
   */
  serverExternalPackages: ["pg"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
