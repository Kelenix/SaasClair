-- Classement plus fin des visites (lot B6) : deux canaux de plus.
-- - social : réseaux sociaux autres que LinkedIn et Meta (X, YouTube, Reddit, TikTok…) ;
-- - ai : assistants d'intelligence artificielle (ChatGPT, Perplexity, Claude, Gemini, Copilot…).
-- Les visites déjà reçues gardent leur canal (« Autre site » le plus souvent).

alter table public.events drop constraint events_channel_check;
alter table public.events add constraint events_channel_check check (
  channel in (
    'seo', 'ads', 'linkedin', 'instagram', 'social', 'ai', 'partners', 'email', 'referral', 'direct'
  )
);

alter table public.profiles drop constraint profiles_signup_channel_check;
alter table public.profiles add constraint profiles_signup_channel_check check (
  signup_channel in (
    'seo', 'ads', 'linkedin', 'instagram', 'social', 'ai', 'partners', 'email', 'referral', 'direct'
  )
);

create or replace function public.clean_channel(value text, referrer text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when value in (
      'seo', 'ads', 'linkedin', 'instagram', 'social', 'ai', 'partners', 'email', 'referral', 'direct'
    ) then value
    when coalesce(referrer, '') <> '' then 'referral'
    else 'direct'
  end;
$$;
