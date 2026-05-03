create or replace function public.bootstrap_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, timezone, coach_tone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'Demo user'
    ),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'America/Santiago'),
    coalesce(new.raw_user_meta_data ->> 'coach_tone', 'collaborative')
  )
  on conflict (user_id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        timezone = coalesce(public.profiles.timezone, excluded.timezone),
        coach_tone = coalesce(public.profiles.coach_tone, excluded.coach_tone),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.bootstrap_profile_from_auth_user();
