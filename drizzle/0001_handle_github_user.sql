-- Append this block to your latest Drizzle migration SQL file:

create or replace function public.handle_github_user()
returns trigger as $$
declare
    github_username text;
    github_email text;
    github_display_name text;
    github_avatar text;
begin
    if new.raw_app_meta_data->>'provider' = 'github' then
        github_username := new.raw_user_meta_data->>'user_name';
        github_email := new.raw_user_meta_data->>'email';
        github_display_name := new.raw_user_meta_data->>'name';
        github_avatar := new.raw_user_meta_data->>'avatar_url';

        if github_email is null or github_email = '' then
            raise exception 'GitHub email is required';
        end if;
        if github_display_name is null or github_display_name = '' then
            raise exception 'GitHub display name is required';
        if new.raw_user_meta_data->>'user_name' is null or new.raw_user_meta_data->>'user_name' = '' then
            -- Fallback or error if GitHub doesn't provide a username
            github_username := split_part(github_email, '@', 1);
        end if;

        insert into public.users (id, username, email, display_name, avatar_url)
        values (new.id::uuid, github_username, github_email, github_display_name, github_avatar)
        on conflict (username) do nothing;
    end if;

    return new;
end;
$$ language plpgsql security definer;

-- Drop the trigger first, then recreate it
drop trigger if exists github_user_trigger on auth.users;

create trigger github_user_trigger
after insert on auth.users
for each row execute function public.handle_github_user();
