-- Add voice call specific settings to scenario tables
alter table public.custom_scenarios add column if not exists voice_avatar_image_url text;
alter table public.platform_scenarios add column if not exists voice_avatar_image_url text;
alter table public.custom_scenarios add column if not exists elevenlabs_voice_id text;
alter table public.platform_scenarios add column if not exists elevenlabs_voice_id text;
