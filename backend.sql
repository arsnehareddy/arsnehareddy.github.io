-- Run this once in a NEW Supabase project's SQL Editor.
-- The owner check uses the trusted Google identity stored by Supabase Auth.
begin;
create or replace function public.is_portfolio_owner()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.identities i
    where i.user_id = auth.uid()
      and i.provider = 'google'
      and lower(i.identity_data->>'email') = 'snehareddypatlolla05@gmail.com'
      and coalesce(i.identity_data->>'email_verified','false') = 'true'
  );
$$;
revoke all on function public.is_portfolio_owner() from public;
grant execute on function public.is_portfolio_owner() to authenticated;

create table if not exists public.portfolio_content (
  id text primary key check (id = 'main'),
  content jsonb not null check (jsonb_typeof(content)='object' and length(content::text)<2097152),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_drafts (
  id text primary key check (id = 'main'),
  content jsonb not null check (jsonb_typeof(content)='object' and length(content::text)<2097152),
  updated_at timestamptz not null default now()
);
alter table public.portfolio_content enable row level security;
alter table public.portfolio_drafts enable row level security;
revoke all on public.portfolio_content, public.portfolio_drafts from anon, authenticated;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update on public.portfolio_content to authenticated;
grant select, insert, update on public.portfolio_drafts to authenticated;

drop policy if exists "portfolio public read" on public.portfolio_content;
create policy "portfolio public read" on public.portfolio_content for select to anon, authenticated using (true);
drop policy if exists "portfolio owner insert" on public.portfolio_content;
create policy "portfolio owner insert" on public.portfolio_content for insert to authenticated with check (public.is_portfolio_owner());
drop policy if exists "portfolio owner update" on public.portfolio_content;
create policy "portfolio owner update" on public.portfolio_content for update to authenticated using (public.is_portfolio_owner()) with check (public.is_portfolio_owner());
drop policy if exists "portfolio draft read" on public.portfolio_drafts;
create policy "portfolio draft read" on public.portfolio_drafts for select to authenticated using (public.is_portfolio_owner());
drop policy if exists "portfolio draft insert" on public.portfolio_drafts;
create policy "portfolio draft insert" on public.portfolio_drafts for insert to authenticated with check (public.is_portfolio_owner());
drop policy if exists "portfolio draft update" on public.portfolio_drafts;
create policy "portfolio draft update" on public.portfolio_drafts for update to authenticated using (public.is_portfolio_owner()) with check (public.is_portfolio_owner());

create or replace function public.publish_portfolio(new_content jsonb, expected_version bigint)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare current_version bigint;
begin
  if not public.is_portfolio_owner() then raise exception 'This account cannot publish the portfolio'; end if;
  if new_content->>'mainHTML' is null then raise exception 'Missing portfolio content'; end if;
  select version into current_version from public.portfolio_content where id='main' for update;
  if current_version is null then
    if expected_version <> 0 then raise exception 'The portfolio changed. Refresh and reopen your saved draft.'; end if;
    insert into public.portfolio_content(id,content,version) values('main',new_content,1);
    return jsonb_build_object('version',1);
  end if;
  if current_version <> expected_version then raise exception 'Another device published a newer version. Save your draft, refresh, then reopen it.'; end if;
  update public.portfolio_content set content=new_content,version=current_version+1,updated_at=now() where id='main';
  return jsonb_build_object('version',current_version+1);
end;
$$;
revoke all on function public.publish_portfolio(jsonb,bigint) from public;
grant execute on function public.publish_portfolio(jsonb,bigint) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portfolio-media','portfolio-media',true,52428800,array['image/jpeg','image/png','image/webp','image/avif','image/gif','image/heic','image/heif','video/mp4','video/webm'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "portfolio media owner read" on storage.objects;
create policy "portfolio media owner read" on storage.objects for select to authenticated using (bucket_id='portfolio-media' and public.is_portfolio_owner());
drop policy if exists "portfolio media owner upload" on storage.objects;
create policy "portfolio media owner upload" on storage.objects for insert to authenticated with check (bucket_id='portfolio-media' and public.is_portfolio_owner() and (storage.foldername(name))[1]='originals');
-- Public media URLs are readable. No visitor or other Google account can upload.
-- Objects are immutable and named by their original-byte SHA-256 hash.
-- No UPDATE or DELETE grants are added for media, protecting published originals.
commit;
