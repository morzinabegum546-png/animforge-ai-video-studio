-- Dashboard-saved API keys live in system_settings. Lock the table so only the
-- backend (service role) can read it; the browser anon key must never see it.
alter table public.system_settings enable row level security;
-- (no policies = no access for anon/authenticated roles)

-- Make yourself admin once (replace the email) so you can save keys from Settings:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
