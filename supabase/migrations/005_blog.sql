-- Blog editorial Quero Ostra
-- Execute no SQL Editor do Supabase.

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.blog_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  featured_image text,
  image_alt text,
  author_name text not null default 'Quero Ostra',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  focus_keyword text,
  tags text[] not null default '{}',
  reading_time integer not null default 5 check (reading_time > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_date_idx
  on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_category_idx
  on public.blog_posts (category_id);
create index if not exists blog_posts_slug_idx
  on public.blog_posts (slug);

drop trigger if exists set_blog_categories_updated_at on public.blog_categories;
create trigger set_blog_categories_updated_at
before update on public.blog_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;

drop policy if exists "public_read_blog_categories" on public.blog_categories;
create policy "public_read_blog_categories" on public.blog_categories
for select using (active or public.is_admin());

drop policy if exists "public_read_published_blog_posts" on public.blog_posts;
create policy "public_read_published_blog_posts" on public.blog_posts
for select using (
  (status = 'published' and published_at is not null and published_at <= now())
  or public.is_admin()
);

drop policy if exists "admins_manage_blog_categories" on public.blog_categories;
create policy "admins_manage_blog_categories" on public.blog_categories
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins_manage_blog_posts" on public.blog_posts;
create policy "admins_manage_blog_posts" on public.blog_posts
for all using (public.is_admin()) with check (public.is_admin());

insert into public.blog_categories (name, slug, description)
values
  ('Guia de Ostras', 'guia-de-ostras', 'Conteúdos para conhecer, escolher e servir ostras.'),
  ('Onde comer em São Paulo', 'onde-comer-em-sao-paulo', 'Guias e referências sobre ostras em São Paulo.'),
  ('Harmonização', 'harmonizacao', 'Bebidas, acompanhamentos e ocasiões para servir ostras.'),
  ('Entrega e Conservação', 'entrega-e-conservacao', 'Orientações sobre entrega programada, conservação e consumo.')
on conflict (slug) do nothing;
