-- The early access list.
--
-- Deliberately narrow: an email address, when it arrived, where it came from,
-- and the offer it locked in. No IP address, no user agent, no name, no
-- company. Anything else can be asked for later, from people who chose to give
-- it.
--
-- `offer_percent` and `base_price_cents` are snapshots taken at signup time, not
-- references to the current offer. A visitor keeps the price that was on the
-- page when they joined, so changing the active offer never rewrites history.
-- Existing rows predate the offer column and therefore carry the default, 90%
-- off a $20 base.

create table if not exists early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null,
  created_at timestamptz not null default now(),
  referrer text,
  landing_page_version text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  offer_percent integer not null default 90,
  base_price_cents integer not null default 2000,
  constraint early_access_signups_email_normalized_key unique (email_normalized),
  constraint early_access_signups_email_length check (char_length(email) <= 254)
);

-- The signup table predates offers; add the snapshot columns in place so an
-- already-deployed database migrates without a rewrite.
alter table early_access_signups
  add column if not exists offer_percent integer not null default 90;

alter table early_access_signups
  add column if not exists base_price_cents integer not null default 2000;

-- The one active offer.
--
-- A singleton row rather than a settings blob: the offer is a single value the
-- whole page reads, and a typed column is what keeps a bad edit (a 140% discount,
-- a negative price) from ever being stored. The dashboard edits this row.
--
-- `percent` is the discount, `base_price_cents` the undiscounted monthly price.
-- The displayed price is derived from both, never stored here.

create table if not exists offer_settings (
  id boolean primary key default true,
  percent integer not null default 90,
  base_price_cents integer not null default 2000,
  updated_at timestamptz not null default now(),
  constraint offer_settings_singleton check (id),
  constraint offer_settings_percent_range check (percent between 0 and 99),
  constraint offer_settings_base_price_positive check (base_price_cents > 0)
);

insert into offer_settings (id, percent, base_price_cents)
values (true, 90, 2000)
on conflict (id) do nothing;

-- What the offer used to be.
--
-- Append-only. Every dashboard edit records the value it replaced, so the
-- sequence of offers (90, then 75, then 50) is recoverable without trusting
-- anything the page happened to show at the time.

create table if not exists offer_history (
  id bigserial primary key,
  percent integer not null,
  base_price_cents integer not null,
  previous_percent integer,
  previous_base_price_cents integer,
  changed_at timestamptz not null default now()
);

create index if not exists offer_history_changed_at_idx
  on offer_history (changed_at desc);

-- What the page did, as opposed to who did it.
--
-- Every row is one thing a browser reported: a page view, a click, a section
-- coming into view, a form step. Anonymous by construction. No IP address, no
-- user agent, no fingerprint. The only identifier is `visitor`, a random value
-- the browser generates for itself and can clear by clearing its storage, which
-- is what makes unique visitors countable without surveilling anyone.
--
-- `occurred_at` is when this server received the event, never the visitor's
-- clock. Day and hour buckets are computed in UTC so the numbers do not move
-- when a database happens to be configured in another timezone.

create table if not exists analytics_events (
  id bigserial primary key,
  name text not null,
  path text not null default '/',
  visitor text,
  landing_page_version text not null,
  occurred_at timestamptz not null default now(),
  properties jsonb not null default '{}'::jsonb,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  constraint analytics_events_name_length check (char_length(name) <= 64),
  constraint analytics_events_path_length check (char_length(path) <= 256)
);

create index if not exists analytics_events_occurred_at_idx
  on analytics_events (occurred_at desc);

create index if not exists analytics_events_name_occurred_at_idx
  on analytics_events (name, occurred_at desc);

create index if not exists analytics_events_visitor_idx
  on analytics_events (visitor)
  where visitor is not null;
