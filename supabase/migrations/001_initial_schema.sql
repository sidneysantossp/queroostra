create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'admin');
create type public.product_type as enum ('fresh', 'gratinated', 'beverage');
create type public.order_status as enum (
  'aguardando_pagamento', 'pagamento_confirmado', 'reserva_confirmada',
  'em_preparacao', 'saiu_para_entrega', 'entregue', 'cancelado'
);
create type public.payment_status as enum (
  'pending', 'confirmed', 'overdue', 'refunded', 'cancelled', 'failed'
);
create type public.payment_method as enum ('PIX', 'CREDIT_CARD');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  whatsapp text,
  alternate_phone text,
  role public.user_role not null default 'customer',
  active boolean not null default true,
  communication_preferences jsonb not null default '{"email":true,"whatsapp":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, whatsapp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'whatsapp'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  category_id uuid references public.product_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  product_type public.product_type not null,
  included_items jsonb not null default '[]'::jsonb,
  price numeric(12,2) not null check (price >= 0),
  promotional_price numeric(12,2) check (promotional_price is null or promotional_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  featured boolean not null default false,
  notes text,
  preparation_hours integer not null default 18 check (preparation_hours >= 0),
  delivery_rules jsonb not null default '{}'::jsonb,
  approximate_volume text,
  display_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_addons (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  image_path text,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  global boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_addon_links (
  product_id uuid not null references public.products(id) on delete cascade,
  addon_id uuid not null references public.product_addons(id) on delete cascade,
  primary key (product_id, addon_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_token uuid unique,
  status text not null default 'active' check (status in ('active', 'converted', 'expired')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or anonymous_token is not null)
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  addon_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table public.delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Casa',
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state char(2) not null,
  reference text,
  instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cep_start text,
  cep_end text,
  neighborhood text,
  city text,
  fee numeric(12,2) not null default 0,
  minimum_order numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_windows (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_time time not null,
  end_time time not null,
  default_capacity integer not null default 8 check (default_capacity >= 0),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operational_calendar (
  id uuid primary key default gen_random_uuid(),
  delivery_date date not null unique,
  availability_override boolean,
  capacity integer check (capacity is null or capacity >= 0),
  minimum_preparation_hours integer,
  order_cutoff timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operational_window_capacity (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.operational_calendar(id) on delete cascade,
  window_id uuid not null references public.delivery_windows(id) on delete cascade,
  capacity integer not null check (capacity >= 0),
  blocked boolean not null default false,
  unique (calendar_id, window_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  minimum_order numeric(12,2) not null default 0,
  usage_limit integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique,
  status public.order_status not null default 'aguardando_pagamento',
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method not null,
  payment_id text,
  customer_snapshot jsonb not null,
  address_snapshot jsonb not null,
  items_subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  coupon_id uuid references public.coupons(id) on delete set null,
  delivery_window text not null,
  notes text,
  idempotency_key uuid not null unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  addons jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_dates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  delivery_date date not null,
  delivery_window text not null,
  status public.order_status not null default 'reserva_confirmada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, delivery_date)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'asaas',
  provider_payment_id text unique,
  status public.payment_status not null default 'pending',
  method public.payment_method not null,
  amount numeric(12,2) not null,
  invoice_url text,
  pix_copy_paste text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  provider_payment_id text,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  sensitive boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  content_value jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);
create index order_dates_delivery_date_idx on public.order_dates(delivery_date);
create index payments_order_id_idx on public.payments(order_id);
create index payments_provider_id_idx on public.payments(provider_payment_id);
create index carts_user_id_idx on public.carts(user_id);
create index delivery_addresses_user_id_idx on public.delivery_addresses(user_id);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'product_categories', 'products', 'product_images',
    'product_addons', 'carts', 'cart_items', 'delivery_addresses',
    'delivery_zones', 'delivery_windows', 'operational_calendar',
    'coupons', 'orders', 'order_items', 'order_dates', 'payments',
    'admin_settings', 'site_content'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_addons enable row level security;
alter table public.product_addon_links enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.delivery_addresses enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.delivery_windows enable row level security;
alter table public.operational_calendar enable row level security;
alter table public.operational_window_capacity enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_dates enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_logs enable row level security;
alter table public.admin_settings enable row level security;
alter table public.site_content enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "public_read_categories" on public.product_categories for select using (active or public.is_admin());
create policy "public_read_products" on public.products for select using (active or public.is_admin());
create policy "public_read_product_images" on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and p.active) or public.is_admin()
);
create policy "public_read_addons" on public.product_addons for select using (active or public.is_admin());
create policy "public_read_addon_links" on public.product_addon_links for select using (true);
create policy "admins_manage_categories" on public.product_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_product_images" on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_addons" on public.product_addons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_addon_links" on public.product_addon_links for all using (public.is_admin()) with check (public.is_admin());

create policy "users_manage_own_carts" on public.carts for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
create policy "users_manage_own_cart_items" on public.cart_items for all
using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  or public.is_admin()
)
with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  or public.is_admin()
);
create policy "users_manage_own_addresses" on public.delivery_addresses for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "public_read_delivery_zones" on public.delivery_zones for select using (active or public.is_admin());
create policy "public_read_delivery_windows" on public.delivery_windows for select using (active or public.is_admin());
create policy "public_read_calendar" on public.operational_calendar for select using (true);
create policy "public_read_window_capacity" on public.operational_window_capacity for select using (true);
create policy "admins_manage_delivery_zones" on public.delivery_zones for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_delivery_windows" on public.delivery_windows for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_calendar" on public.operational_calendar for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_window_capacity" on public.operational_window_capacity for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

create policy "users_read_own_orders" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "users_read_own_order_items" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.is_admin()
);
create policy "users_read_own_order_dates" on public.order_dates for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.is_admin()
);
create policy "users_read_own_order_history" on public.order_status_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.is_admin()
);
create policy "users_read_own_payments" on public.payments for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.is_admin()
);
create policy "admins_manage_orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_order_items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_order_dates" on public.order_dates for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_order_history" on public.order_status_history for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_manage_payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_read_webhook_logs" on public.payment_webhook_logs for select using (public.is_admin());
create policy "admins_manage_settings" on public.admin_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "public_read_published_content" on public.site_content for select using (published or public.is_admin());
create policy "admins_manage_content" on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy "admins_read_audit_logs" on public.audit_logs for select using (public.is_admin());
create policy "admins_insert_audit_logs" on public.audit_logs
for insert with check (public.is_admin() and actor_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "public_read_site_assets" on storage.objects
for select using (bucket_id = 'site-assets');

insert into public.delivery_windows (label, start_time, end_time, default_capacity, display_order)
values
  ('10h às 12h', '10:00', '12:00', 8, 1),
  ('12h às 14h', '12:00', '14:00', 8, 2),
  ('14h às 16h', '14:00', '16:00', 8, 3),
  ('16h às 18h', '16:00', '18:00', 8, 4),
  ('18h às 20h', '18:00', '20:00', 8, 5);

insert into public.delivery_zones (name, cep_start, cep_end, city, fee, minimum_order)
values
  ('Zona Sul central', '04500000', '04799999', 'São Paulo', 14, 60),
  ('Zona Sul estendida', '04000000', '04999999', 'São Paulo', 18, 60);

insert into public.product_categories (id, name, slug, description, display_order)
values
  ('10000000-0000-4000-8000-000000000001', 'Experiências', 'experiencias', 'Experiências com ostras.', 1),
  ('10000000-0000-4000-8000-000000000002', 'Bebidas', 'bebidas', 'Bebidas e harmonizações.', 2)
on conflict (slug) do nothing;

insert into public.products (
  id, external_key, category_id, title, slug, short_description,
  full_description, product_type, included_items, price, stock,
  active, featured, preparation_hours, approximate_volume, display_order
)
values
  ('20000000-0000-4000-8000-000000000001', 'gratinada', '10000000-0000-4000-8000-000000000001', 'Brasa Gourmet', 'brasa-gourmet', 'Ostras gratinadas prontas para servir.', 'Uma seleção de ostras gratinadas para chegar quente e pronta para a mesa.', 'gratinated', '["Limões selecionados","Molho especial da casa","Embalagem térmica"]', 149.90, 30, true, true, 18, '12 unidades', 1),
  ('20000000-0000-4000-8000-000000000002', 'baby', '10000000-0000-4000-8000-000000000001', 'Experiência Degustação', 'experiencia-degustacao', 'Ostras baby para uma primeira experiência.', 'Porção leve e delicada de ostras baby.', 'fresh', '["Limões selecionados","Molho especial da casa","Gelo e sal"]', 69.90, 50, true, true, 18, '6 unidades', 2),
  ('20000000-0000-4000-8000-000000000003', 'tradicional', '10000000-0000-4000-8000-000000000001', 'Experiência Happy Hour', 'experiencia-happy-hour', 'Ostras tradicionais para compartilhar.', 'Porção equilibrada para encontros e brindes.', 'fresh', '["Limões selecionados","Molho especial da casa","Gelo e sal"]', 79.90, 50, true, true, 18, '8 unidades', 3),
  ('20000000-0000-4000-8000-000000000004', 'premium', '10000000-0000-4000-8000-000000000001', 'Reserva Premium', 'reserva-premium', 'Ostras grandes para ocasiões especiais.', 'Seleção premium montada sob demanda.', 'fresh', '["Limões selecionados","Molho especial da casa","Gelo e sal"]', 129.90, 25, true, true, 24, '10 unidades', 4),
  ('20000000-0000-4000-8000-000000000005', 'agua-sem-gas', '10000000-0000-4000-8000-000000000002', 'Água mineral sem gás', 'agua-sem-gas', 'Garrafa 500 ml', 'Garrafa 500 ml', 'beverage', '[]', 6.00, 100, true, false, 0, '500 ml', 10),
  ('20000000-0000-4000-8000-000000000006', 'agua-com-gas', '10000000-0000-4000-8000-000000000002', 'Água mineral com gás', 'agua-com-gas', 'Garrafa 500 ml', 'Garrafa 500 ml', 'beverage', '[]', 7.00, 100, true, false, 0, '500 ml', 11),
  ('20000000-0000-4000-8000-000000000007', 'coca-cola', '10000000-0000-4000-8000-000000000002', 'Coca-Cola', 'coca-cola', 'Lata 350 ml', 'Lata 350 ml', 'beverage', '[]', 8.50, 100, true, false, 0, '350 ml', 12),
  ('20000000-0000-4000-8000-000000000008', 'guarana', '10000000-0000-4000-8000-000000000002', 'Guaraná', 'guarana', 'Lata 350 ml', 'Lata 350 ml', 'beverage', '[]', 8.50, 100, true, false, 0, '350 ml', 13),
  ('20000000-0000-4000-8000-000000000009', 'fanta', '10000000-0000-4000-8000-000000000002', 'Fanta Laranja', 'fanta', 'Lata 350 ml', 'Lata 350 ml', 'beverage', '[]', 8.50, 100, true, false, 0, '350 ml', 14),
  ('20000000-0000-4000-8000-000000000010', 'brahma', '10000000-0000-4000-8000-000000000002', 'Brahma', 'brahma', 'Lata 350 ml', 'Lata 350 ml', 'beverage', '[]', 9.90, 100, true, false, 0, '350 ml', 15),
  ('20000000-0000-4000-8000-000000000011', 'heineken', '10000000-0000-4000-8000-000000000002', 'Heineken', 'heineken', 'Long neck 330 ml', 'Long neck 330 ml', 'beverage', '[]', 13.90, 100, true, false, 0, '330 ml', 16),
  ('20000000-0000-4000-8000-000000000012', 'itaipava', '10000000-0000-4000-8000-000000000002', 'Itaipava', 'itaipava', 'Lata 350 ml', 'Lata 350 ml', 'beverage', '[]', 8.90, 100, true, false, 0, '350 ml', 17),
  ('20000000-0000-4000-8000-000000000013', 'sauvignon-blanc', '10000000-0000-4000-8000-000000000002', 'Sauvignon Blanc', 'sauvignon-blanc', 'Vinho branco seco, 750 ml', 'Vinho branco seco, 750 ml', 'beverage', '[]', 89.90, 100, true, false, 0, '750 ml', 18),
  ('20000000-0000-4000-8000-000000000014', 'chardonnay', '10000000-0000-4000-8000-000000000002', 'Chardonnay', 'chardonnay', 'Vinho branco, 750 ml', 'Vinho branco, 750 ml', 'beverage', '[]', 109.90, 100, true, false, 0, '750 ml', 19),
  ('20000000-0000-4000-8000-000000000015', 'espumante-brut', '10000000-0000-4000-8000-000000000002', 'Espumante Brut', 'espumante-brut', 'Espumante nacional, 750 ml', 'Espumante nacional, 750 ml', 'beverage', '[]', 119.90, 100, true, false, 0, '750 ml', 20)
on conflict (external_key) do nothing;

insert into public.product_addons (
  id, external_key, name, description, price, stock, active, global
)
values
  ('30000000-0000-4000-8000-000000000001', 'limao-extra', 'Limão extra', 'Porção extra de limões selecionados.', 4.90, 100, true, false),
  ('30000000-0000-4000-8000-000000000002', 'molho-especial', 'Molho especial', 'Pote adicional do molho da casa.', 8.90, 80, true, false),
  ('30000000-0000-4000-8000-000000000003', 'gelo-extra', 'Gelo extra', 'Saco extra para manter a apresentação.', 6.00, 100, true, false),
  ('30000000-0000-4000-8000-000000000004', 'kit-descartavel', 'Kit descartável', 'Guardanapos, talheres e pratos.', 12.90, 100, true, true),
  ('30000000-0000-4000-8000-000000000005', 'embalagem-premium', 'Embalagem premium', 'Apresentação especial para presente.', 24.90, 40, true, true)
on conflict (external_key) do nothing;

insert into public.product_addon_links (product_id, addon_id)
select p.id, a.id
from public.products p
join public.product_addons a on (
  (a.external_key in ('limao-extra', 'molho-especial') and p.external_key in ('gratinada', 'baby', 'tradicional', 'premium'))
  or
  (a.external_key = 'gelo-extra' and p.external_key in ('baby', 'tradicional', 'premium'))
)
on conflict do nothing;

-- Depois do primeiro cadastro:
-- update public.profiles set role = 'admin'
-- where email = 'admin@queroostra.com.br';
