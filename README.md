# Porcess landing page

The public pre-launch page for Porcess, served at <https://porcess.com>.

This is a self-contained Next.js application. It shares no code with the product
frontend in `../frontend`. It explains the current Porcess agent workflows,
collects early-access signups, and keeps analytics and signup storage local to
this landing repository.

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

The browser suite covers the product hero and agent deck, the pricing section,
responsive layout, the full form lifecycle, the stats gate, the collector, and a
WCAG 2 A/AA axe audit on the public page and on the confirmation, error,
sign-in, and dashboard states. It runs against a production build on its own
port, never against the dev server, because a dev server and a build share
`.next`.

It runs with `DATABASE_URL` forced empty, so it exercises the fail-closed
signup path, the default offer, and the dashboard's unconfigured state rather
than writing to a real database. The aggregation and offer maths are covered by
unit tests, which can control their input.

One spec (`e2e/offer.spec.ts`) changes the offer and creates a signup, so it is
skipped unless `E2E_DATABASE_URL` points at a disposable database. That variable
also becomes the test server's `DATABASE_URL`. It restores the offer it found,
but the signup row it creates is real, which is why it must never point at a
database whose contents matter.

## Environment

| Variable                         | Purpose                                                                                                                                                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | Server-only PostgreSQL connection. Holds the signup list, the analytics events, and the active offer with its change history. Unset means `POST /early-access` answers 503 rather than pretending to succeed, and the page falls back to the default offer. |
| `STATS_PASSWORD`                 | Password for the private dashboard at `/a/n/stats`. Unset means the whole private area returns 404, so an unconfigured deployment does not advertise that it exists.                                                                                        |
| `STATS_RETENTION_DAYS`           | How long `pnpm stats:purge` keeps analytics events. Defaults to 365. Signups are never purged.                                                                                                                                                              |
| `EARLY_ACCESS_WEBHOOK_URL`       | Optional. Forwards each stored signup to an email provider or list tool.                                                                                                                                                                                    |
| `EARLY_ACCESS_WEBHOOK_TOKEN`     | Optional bearer token for that forward.                                                                                                                                                                                                                     |
| `NEXT_PUBLIC_SITE_URL`           | Canonical origin for metadata, Open Graph, sitemap, and robots.                                                                                                                                                                                             |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Optional override for where events are sent. Unset is the normal case: the page posts to its own `/analytics`, so the numbers stay in our database.                                                                                                         |

`NEXT_PUBLIC_*` values are visible to browsers and must never hold a secret.

## The private dashboard

`/a/n/stats` reports page views, unique visitors, clicks, section engagement,
the signup funnel, attribution, and the early-access list itself, with a CSV
export. It is private in three separate ways, because one of them is not a
control: the path is unlisted, `robots.txt` disallows `/a/`, and the page carries
`noindex`. What actually protects it is `STATS_PASSWORD`, exchanged for a signed
`httpOnly` cookie scoped to `/a/n/stats`. Sessions need no database, and
rotating the password invalidates every existing one.

The dashboard also owns the offer. The Offer block shows the active discount,
the base price, the derived price, and the history of every change, and its form
(`POST /a/n/stats/offer`) is the one way to change the offer the landing page
advertises. Signups snapshot the offer that was live when they joined, so a
change never rewrites what an existing member was promised.

Nobody reaches the dashboard by accident, and it never counts its own visits:
`track` refuses to record anything under the private prefix.

Nothing about a visitor is stored beyond a random id their own browser
generates. No IP address, no user agent, no fingerprint. Clearing site data
resets that id, which is why the visitor count is honest rather than exact.

## How it is put together

- `src/content/copy.ts` holds every string a visitor can read, so the page's
  wording is reviewable in one place. The discount is written as a `{percent}`
  template there and filled with the active offer by `fillOffer`.
- `src/lib/offer/` is the offer: `format.ts` derives the price, the label, and
  the formatting as pure functions, and `settings.ts` reads and writes the
  active offer. Reads are total (a missing or unreadable database returns the
  launch offer), writes report failure explicitly.
- `src/components/agents/` owns the editorial agent deck and its per-agent
  workflow artwork. `src/components/hero/product-hero.tsx` composes the deck
  with the product explanation and early-access form, and
  `src/components/pricing/pricing-section.tsx` shows the active offer against
  its base price.
- `src/lib/early-access/store.ts` holds the signup write, and the unique index
  on `email_normalized` is what makes duplicate submissions impossible rather
  than merely unlikely. It snapshots the active offer onto the row, and falls
  back to the pre-offer insert so an unmigrated database still accepts signups.
  It uses `pg` rather than a Neon-specific driver, so the same code path runs
  against a local Postgres in development and a hosted one in production, which
  keeps the signup path testable locally.
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

Three rules apply to every string on the page, and all of them override the
literal phrasing in the original brief:

1. **No em-dashes or en-dashes anywhere**, including the document title. Use a
   hyphen, a comma, a colon, or two sentences.
2. **At most one middot per line.** Lists that were written as dot-joined
   strings are rendered as separate items instead.
3. **The discount is never a literal.** Every string that names it uses the
   `{percent}` placeholder and is filled from the active offer at render time,
   so the page cannot advertise a discount a signup will not lock in. The offer
   is stated as a bare percentage with no duration, scope, or companion promise.

`src/content/copy.test.ts` enforces all three, including against the filled
offer strings, so the templates are checked rather than only the literals.

## Design decisions worth knowing

- **Editorial agent deck.** The four cards are product-specific workflow
  illustrations, not generic feature tiles or screenshots of unsupported UI.
- **Light canvas, restrained color.** The ground is warm and quiet; color is
  reserved for the agent cards and literal workflow signals.
- **Two radii on controls and cards.** 2px on interactive controls and 16px on
  the oversized agent cards.
- **The offer is data, not copy.** One active offer lives in the database and is
  changed from the dashboard; the pricing section shows it against the $20 base,
  and each signup snapshots the offer it joined at. Changing the offer never
  rewrites an existing member's promise.
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

No accounts, no CMS, and no billing. There is a pricing section and an editable
offer, but no checkout, no card handling, and no subscription: the offer is a
number the signup list is tagged with, not a transaction. The only authenticated
surface is the stats dashboard, which has one password and no user model. No
marketing email is sent from this repository, so `email_verified` is reserved in
the analytics taxonomy and never emitted. The application itself lives
separately, at `app.porcess.com`.
