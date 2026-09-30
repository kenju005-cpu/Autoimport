-- AutoImport V18 · Supabase/PostgreSQL
-- Ejecutar en SQL Editor sobre un proyecto nuevo.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('admin','client','staff')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,role,full_name)
  values(new.id,'client',coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.public_leads (
  id uuid primary key default gen_random_uuid(), name text not null, phone text, email text,
  vehicle text, budget numeric, min_year integer, max_km integer,
  status text not null default 'nuevo', created_at timestamptz not null default now()
);

create table if not exists public.workspace_records (
  external_id text primary key,
  owner_id uuid not null references public.profiles(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  external_record_id text unique,
  client_id uuid references public.profiles(id), client_email text,
  owner_id uuid references public.profiles(id), reference text,
  requested_vehicle text not null, budget numeric, min_profit numeric, target_profit numeric,
  requirements jsonb not null default '{}'::jsonb,
  status text not null default 'Encargo recibido', internal_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists orders_client_idx on public.orders(client_id);
create index if not exists orders_client_email_idx on public.orders(lower(client_email));

create table if not exists public.vehicle_candidates (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  source text, source_listing_id text, vehicle_data jsonb not null default '{}'::jsonb,
  internal_analysis jsonb not null default '{}'::jsonb, client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
  candidate_id uuid references public.vehicle_candidates(id), final_price numeric, deposit_amount numeric,
  status text not null default 'Borrador', client_payload jsonb not null default '{}'::jsonb,
  internal_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  version integer not null default 1, content jsonb not null default '{}'::jsonb,
  accepted_at timestamptz, accepted_name text, acceptance_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  direction text not null check(direction in ('to_intermediary','to_seller')),
  concept text not null, amount numeric not null, status text not null default 'pending',
  method text, reference text, paid_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  owner_user_id uuid references public.profiles(id), kind text not null,
  storage_path text not null unique, original_name text, client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.current_role() returns text
language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid();
$$;

create or replace function public.link_my_orders() returns integer
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  if auth.uid() is null then return 0; end if;
  update public.orders set client_id=auth.uid(),updated_at=now()
  where client_id is null and client_email is not null
    and lower(client_email)=lower(coalesce(auth.jwt()->>'email',''));
  get diagnostics n=row_count;
  return n;
end; $$;

create or replace function public.my_client_dashboard() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('orders',coalesce(jsonb_agg(item order by item->>'updated_at' desc),'[]'::jsonb))
  from (
    select jsonb_build_object(
      'id',o.id,'reference',o.reference,'requested_vehicle',o.requested_vehicle,'budget',o.budget,
      'status',o.status,'created_at',o.created_at,'updated_at',o.updated_at,
      'proposal',(select to_jsonb(p)-'internal_payload' from public.proposals p where p.order_id=o.id limit 1),
      'contract',(select jsonb_build_object('accepted_at',c.accepted_at,'accepted_name',c.accepted_name,'acceptance_reference',c.acceptance_reference,'content',c.content) from public.contracts c where c.order_id=o.id order by c.version desc,c.created_at desc limit 1),
      'payments',(select coalesce(jsonb_agg(to_jsonb(py) order by py.created_at),'[]'::jsonb) from public.payments py where py.order_id=o.id),
      'documents',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'kind',d.kind,'original_name',d.original_name,'created_at',d.created_at) order by d.created_at),'[]'::jsonb) from public.documents d where d.order_id=o.id and d.client_visible)
    ) item
    from public.orders o where o.client_id=auth.uid()
  ) s;
$$;

create or replace function public.my_document_path(p_document_id uuid) returns text
language sql stable security definer set search_path=public as $$
  select d.storage_path from public.documents d join public.orders o on o.id=d.order_id
  where d.id=p_document_id and d.client_visible and o.client_id=auth.uid() limit 1;
$$;

create or replace function public.can_read_document_path(p_path text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.documents d join public.orders o on o.id=d.order_id
    where d.storage_path=p_path and d.client_visible and o.client_id=auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.public_leads enable row level security;
alter table public.workspace_records enable row level security;
alter table public.orders enable row level security;
alter table public.vehicle_candidates enable row level security;
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;

revoke all on table public.profiles,public.public_leads,public.workspace_records,public.orders,public.vehicle_candidates,public.proposals,public.contracts,public.payments,public.documents from anon,authenticated;
grant insert on public.public_leads to anon,authenticated;
grant select on public.public_leads,public.profiles to authenticated;
grant select,insert,update,delete on public.workspace_records,public.orders,public.vehicle_candidates,public.proposals,public.contracts,public.payments,public.documents to authenticated;

revoke all on function public.current_role(),public.link_my_orders(),public.my_client_dashboard(),public.my_document_path(uuid),public.can_read_document_path(text) from public,anon;
grant execute on function public.current_role(),public.link_my_orders(),public.my_client_dashboard(),public.my_document_path(uuid),public.can_read_document_path(text) to authenticated;

create policy "public lead insert" on public.public_leads for insert to anon,authenticated with check(true);
create policy "staff lead read" on public.public_leads for select to authenticated using(public.current_role() in ('admin','staff'));
create policy "profile self/staff read" on public.profiles for select to authenticated using(id=auth.uid() or public.current_role() in ('admin','staff'));
create policy "staff workspace" on public.workspace_records for all to authenticated using(public.current_role() in ('admin','staff')) with check(public.current_role() in ('admin','staff'));
create policy "staff orders" on public.orders for all to authenticated using(public.current_role() in ('admin','staff')) with check(public.current_role() in ('admin','staff'));
create policy "staff candidates" on public.vehicle_candidates for all to authenticated using(public.current_role() in ('admin','staff')) with check(public.current_role() in ('admin','staff'));
create policy "staff proposals" on public.proposals for all to authenticated using(public.current_role() in ('admin','staff')) with check(public.current_role() in ('admin','staff'));
create policy "staff contracts" on public.contracts for all to authenticated using(public.current_role() in ('admin','staff')) with check(public.current_role() in ('admin','staff'));
create policy "staff payments" on public.payments for all to authenticated using(public.current_role() in ('admin','staff')) with check(public.current_role() in ('admin','staff'));
create policy "staff documents" on public.documents for all to authenticated using(public.current_role() in ('admin','staff')) with check(public.current_role() in ('admin','staff'));

insert into storage.buckets(id,name,public) values('order-documents','order-documents',false)
on conflict(id) do update set public=false;

drop policy if exists "staff upload order docs" on storage.objects;
drop policy if exists "staff read order docs" on storage.objects;
drop policy if exists "staff delete order docs" on storage.objects;
drop policy if exists "client read shared docs" on storage.objects;
create policy "staff upload order docs" on storage.objects for insert to authenticated
with check(bucket_id='order-documents' and public.current_role() in ('admin','staff'));
create policy "staff read order docs" on storage.objects for select to authenticated
using(bucket_id='order-documents' and public.current_role() in ('admin','staff'));
create policy "staff delete order docs" on storage.objects for delete to authenticated
using(bucket_id='order-documents' and public.current_role() in ('admin','staff'));
create policy "client read shared docs" on storage.objects for select to authenticated
using(bucket_id='order-documents' and public.can_read_document_path(storage.objects.name));
