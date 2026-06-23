-- Perfis editoriais e autoria verificavel do blog Quero Ostra.
-- Execute no SQL Editor do Supabase depois de 005_blog.sql.

create table if not exists public.blog_authors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  slug text not null unique,
  job_title text not null default '',
  short_bio text not null default '',
  biography text not null default '',
  photo_url text,
  photo_alt text,
  education text[] not null default '{}',
  certifications text[] not null default '{}',
  awards text[] not null default '{}',
  expertise text[] not null default '{}',
  linkedin_url text,
  instagram_url text,
  portfolio_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts
  add column if not exists author_id uuid references public.blog_authors(id) on delete set null;

create index if not exists blog_authors_slug_idx on public.blog_authors (slug);
create index if not exists blog_posts_author_idx on public.blog_posts (author_id);

drop trigger if exists set_blog_authors_updated_at on public.blog_authors;
create trigger set_blog_authors_updated_at before update on public.blog_authors
for each row execute function public.set_updated_at();

alter table public.blog_authors enable row level security;

drop policy if exists "public_read_active_blog_authors" on public.blog_authors;
create policy "public_read_active_blog_authors" on public.blog_authors
for select using (active or public.is_admin());

drop policy if exists "admins_manage_blog_authors" on public.blog_authors;
create policy "admins_manage_blog_authors" on public.blog_authors
for all using (public.is_admin()) with check (public.is_admin());
