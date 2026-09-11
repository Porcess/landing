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
