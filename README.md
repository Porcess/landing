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
lifecycle, the stats gate and collector, and a WCAG 2 A/AA axe audit on the page
and on the confirmation, error, sign-in, and dashboard states. It runs against a
production build on its own port, never against the dev server, because a dev
server and a build share `.next`.

It runs with `DATABASE_URL` forced empty, so it exercises the fail-closed
signup path and the dashboard's unconfigured state rather than writing to a real
database. The aggregation maths is covered by unit tests, which can control
their input.

## Environment

| Variable                         | Purpose                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                   | Server-only PostgreSQL connection. Holds two tables: the signup list and the analytics events. Unset means `POST /early-access` answers 503 rather than pretending to succeed. |
| `STATS_PASSWORD`                 | Password for the private dashboard at `/a/n/stats`. Unset means the whole private area returns 404, so an unconfigured deployment does not advertise that it exists.           |
| `STATS_RETENTION_DAYS`           | How long `pnpm stats:purge` keeps analytics events. Defaults to 365. Signups are never purged.                                                                                 |
| `EARLY_ACCESS_WEBHOOK_URL`       | Optional. Forwards each stored signup to an email provider or list tool.                                                                                                       |
| `EARLY_ACCESS_WEBHOOK_TOKEN`     | Optional bearer token for that forward.                                                                                                                                        |
| `NEXT_PUBLIC_SITE_URL`           | Canonical origin for metadata, Open Graph, sitemap, and robots.                                                                                                                |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Optional override for where events are sent. Unset is the normal case: the page posts to its own `/analytics`, so the numbers stay in our database.                            |

`NEXT_PUBLIC_*` values are visible to browsers and must never hold a secret.

## The private dashboard

`/a/n/stats` reports page views, unique visitors, clicks, section engagement,
the signup funnel, attribution, and the early-access list itself, with a CSV
export. It is private in three separate ways, because one of them is not a
control: the path is unlisted, `robots.txt` disallows `/a/`, and the page carries
`noindex`. What actually protects it is `STATS_PASSWORD`, exchanged for a signed
`httpOnly` cookie scoped to `/a/n/stats`. Sessions need no database, and
rotating the password invalidates every existing one.

Nobody reaches the dashboard by accident, and it never counts its own visits:
`track` refuses to record anything under the private prefix.

Nothing about a visitor is stored beyond a random id their own browser
generates. No IP address, no user agent, no fingerprint. Clearing site data
resets that id, which is why the visitor count is honest rather than exact.

## How it is put together

- `src/content/copy.ts` holds every string a visitor can read, so the page's
  wording is reviewable in one place.
- `src/components/hero/` is the signature moment: a hairline sweeps across the
  word and the two letters it crosses change places. Each swapping letter is
  drawn twice inside one grid cell, which is what keeps the word from reflowing
  mid animation.
- `src/lib/early-access/store.ts` holds the signup write, and the unique index
  on `email_normalized` is what makes duplicate submissions impossible rather
  than merely unlikely. It uses `pg` rather than a Neon-specific driver, so the
  same code path runs against a local Postgres in development and a hosted one
  in production, which keeps the signup path testable locally.
- `src/lib/db.ts` owns the one connection pool, shared by signups and stats, and
  reports honestly when there is no database rather than looking like an empty
  result set.
- `src/lib/analytics-events.ts` is the event vocabulary, imported by both the
  page that emits events and the endpoint that accepts them. Anything not named
  there is refused, so a hostile caller cannot write arbitrary text into a row.
- `src/lib/stats/queries.ts` holds every number the dashboard shows, with the
  gap filling and funnel arithmetic split out as pure functions so they can be
  tested without a database.
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
- **Analytics is first party.** Events go to this repository's own `/analytics`
  and no third-party script is loaded, so no visitor is handed to anyone else.
  `NEXT_PUBLIC_ANALYTICS_ENDPOINT` exists to point them elsewhere deliberately,
  not to switch analytics on.
- **The dashboard never flatters the numbers.** It shows missing data as missing
  rather than as zero, does not clamp a funnel step that exceeds the one before
  it, and reports the database as unreachable when it is.

## Not in scope

No accounts, no CMS, no admin panel, and no pricing. The only authenticated
surface is the read-only stats dashboard, which has one password and no user
model. No marketing email is sent from this repository, so `email_verified` is
reserved in the analytics taxonomy and never emitted. The application itself
lives separately, at `app.porcess.com`.
