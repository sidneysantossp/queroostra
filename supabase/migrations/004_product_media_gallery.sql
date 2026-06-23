-- Galeria multimidia de produtos
-- Execute este arquivo no SQL Editor do Supabase.

alter table public.products
  add column if not exists included_items jsonb not null default '[]'::jsonb;

alter table public.product_images
  add column if not exists media_type text not null default 'image',
  add column if not exists mime_type text,
  add column if not exists poster_path text;

alter table public.product_images
  drop constraint if exists product_images_media_type_check;

alter table public.product_images
  add constraint product_images_media_type_check
  check (media_type in ('image', 'video'));

create index if not exists product_images_product_order_idx
  on public.product_images (product_id, display_order);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  83886080,
  array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_read_products" on storage.objects;
create policy "public_read_products" on storage.objects
for select using (bucket_id = 'products');
