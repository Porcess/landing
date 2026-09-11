# Porcess landing page

The public pre-launch page for Porcess, served at <https://porcess.com>.

This is a self-contained Next.js application. It shares no code with the product
frontend in `../frontend` and deliberately does not describe what the product
does: it sells the problem, withholds the solution, and collects early-access
signups.

## Running it

```text
pnpm install
cp .env.example .env      # then set DATABASE_URL
pnpm db:migrate
pnpm dev                  # http://127.0.0.1:3105
```

This directory is its own pnpm root. It is intentionally absent from the parent
`pnpm-workspace.yaml` so the parent repository's `pnpm check` and CI never pick
it up. Run commands from inside `porcess-landing/`, not from the repository
root.

## Checks

```text
pnpm check        # format, lint, typecheck, unit tests, production build
pnpm test:e2e     # builds, then runs the browser suite
```

The browser suite covers the hero animation and its reduced-motion and
no-scripting fallbacks, layout at 320/375/430/768/1440/1920, the full form
lifecycle, and a WCAG 2 A/AA axe audit on the page and on the confirmation and
error states. It runs against a production build on its own port, never against
the dev server, because a dev server and a build share `.next`.

## Environment

| Variable                         | Purpose                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | Server-only PostgreSQL connection for signups. Any standard Postgres works, hosted or local. Unset means `POST /early-access` answers 503 rather than pretending to succeed. |
| `EARLY_ACCESS_WEBHOOK_URL`       | Optional. Forwards each stored signup to an email provider or list tool.                                                                                                     |
| `EARLY_ACCESS_WEBHOOK_TOKEN`     | Optional bearer token for that forward.                                                                                                                                      |
| `NEXT_PUBLIC_SITE_URL`           | Canonical origin for metadata, Open Graph, sitemap, and robots.                                                                                                              |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Optional event collector. Unset means events are dropped and no third-party script is loaded.                                                                                |

`NEXT_PUBLIC_*` values are visible to browsers and must never hold a secret.

## How it is put together

- `src/content/copy.ts` holds every string a visitor can read, so the page's
  wording is reviewable in one place.
- `src/components/hero/` is the signature moment: a hairline sweeps across the
  word and the two letters it crosses change places. Each swapping letter is
  drawn twice inside one grid cell, which is what keeps the word from reflowing
  mid animation.
- `src/lib/early-access/store.ts` is the only persistence, and the unique index
  on `email_normalized` is what makes duplicate submissions impossible rather
  than merely unlikely. It uses `pg` rather than a Neon-specific driver, so the
  same code path runs against a local Postgres in development and a hosted one
  in production, which keeps the signup path testable locally.
- `db/schema.sql` is applied by `pnpm db:migrate` and is safe to re-run.

### Copy rules

Two rules apply to every string on the page, and both override the literal
phrasing in the original brief:

1. **No em-dashes or en-dashes anywhere**, including the document title. Use a
   hyphen, a comma, a colon, or two sentences.
2. **At most one middot per line.** Lists that were written as dot-joined
   strings are rendered as separate items instead.

`e2e/landing.spec.ts` does not enforce these; review `src/content/copy.ts`
directly when changing copy.

## Design decisions worth knowing

- **Monochrome, no accent hue.** The signature is the letter swap, not a colour.
  There is exactly one inverted section, the closing call to action.
- **Two radii only.** 2px on interactive controls, 0 on everything else.
- **No images, no icons, no WebGL.** Type, hairlines, and motion carry the page.
  The teaser is deliberately non-representational: it is not a product mock, and
  there are no screenshots of the real product anywhere on this site.
- **No fake social proof.** No testimonials, counters, logos, or metrics, because
  none are real yet. Add them only when they are.
- **Analytics is inert by default.** No provider is bundled; setting
  `NEXT_PUBLIC_ANALYTICS_ENDPOINT` turns events on.

## Not in scope

No authentication, dashboard, CMS, admin panel, pricing, or accounts. No
marketing email is sent from this repository, so `email_verified` is reserved in
the analytics taxonomy and never emitted. The application itself lives
separately, at `app.porcess.com`.
