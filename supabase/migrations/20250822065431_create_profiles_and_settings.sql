-- =================================================================
--  TheraLingua AI - 創世憲法 v2.1 (修正版)
--  修正了 CREATE TRIGGER 的致命語法錯誤。
-- =================================================================

-- -----------------------------------------------------------------
--  第一章: 核心公民檔案 (Profiles Table)
-- -----------------------------------------------------------------
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text,
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- -----------------------------------------------------------------
--  第二章: 用戶個人化設定 (User Settings Table)
-- -----------------------------------------------------------------
create table public.user_settings (
  user_id uuid not null references public.profiles on delete cascade,
  language varchar(20) default 'en',
  sug_lvl varchar(20),
  cur_lvl varchar(20),
  primary key (user_id)
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings."
  on public.user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can update their own settings."
  on public.user_settings for update
  using ( auth.uid() = user_id );

-- -----------------------------------------------------------------
--  第三章: 核心自動化機制 (Triggers)
-- -----------------------------------------------------------------
create or replace function public.handle_new_user_setup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  
  insert into public.user_settings (user_id, language, cur_lvl, sug_lvl)
  values (new.id, 'en', 'Kindergarten', null);
  
  return new;
end;
$$;

-- -----------------------------------------------------------------
--  ✨✨✨ 唯一的、致命的、決定性的修正，就在這裡！ ✨✨✨
--  將 "PROCEDURE" 改為 "FUNCTION"
-- -----------------------------------------------------------------
create trigger on_auth_user_created_setup_profile_and_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_setup();

