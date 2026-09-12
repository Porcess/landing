-- The only table this repository owns.
--
-- Deliberately narrow: an email address, when it arrived, and where it came
-- from. No IP address, no user agent, no name, no company. Anything else can be
-- asked for later, from people who chose to give it.

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
  constraint early_access_signups_email_normalized_key unique (email_normalized),
  constraint early_access_signups_email_length check (char_length(email) <= 254)
);

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
