-- Migration 003: Create products storage bucket
-- Execute this in the Supabase SQL Editor

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "public_read_products" on storage.objects
for select using (bucket_id = 'products');
