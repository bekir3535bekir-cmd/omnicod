-- ════════════════════════════════════════════════════════════════
-- STÜDYOM — Supabase veritabanı kurulumu (çok stüdyolu)
-- Supabase paneli → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run
-- Birden fazla kez çalıştırılabilir; var olan verilere dokunmaz.
--
-- Mantık:
--  • Her stüdyo ayrı bir kayıttır. Her veri satırı bir stüdyoya aittir (studio_id).
--  • Kullanıcı (e-posta ile kayıt) bir stüdyoya "admin" ya da "personel" olarak bağlıdır.
--  • Kullanıcı yalnızca kendi stüdyosunun verisini görebilir/değiştirebilir (RLS).
--  • Aynı hesapla telefondan ve bilgisayardan giriş yapılınca aynı veri görülür.
-- ════════════════════════════════════════════════════════════════

-- ── Stüdyolar ve üyelik ──────────────────────────────────────────
create table if not exists public.studios (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  owner_id    uuid not null references auth.users(id) on delete cascade,
  join_code   text unique not null default upper(substr(md5(random()::text), 1, 6)),
  plan        text not null default 'trial',
  trial_start timestamptz not null default now(),
  plan_expiry timestamptz,
  profile     jsonb not null default '{}'::jsonb,   -- firma & kişi bilgileri (unvan, adres, vergi, IBAN...)
  created_at  timestamptz not null default now()
);
alter table public.studios add column if not exists profile jsonb not null default '{}'::jsonb;

create table if not exists public.studio_members (
  studio_id  uuid not null references public.studios(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'personel' check (role in ('admin','personel')),
  team_id    text,                       -- personelin "Ekip" listesindeki kaydı
  created_at timestamptz not null default now(),
  primary key (studio_id, user_id)
);
create unique index if not exists studio_members_one_studio_per_user on public.studio_members(user_id);

-- Giriş yapan kullanıcının stüdyosu ve rolü
create or replace function public.current_studio_id() returns uuid
language sql stable security definer set search_path = public as $$
  select studio_id from studio_members where user_id = auth.uid() limit 1
$$;
create or replace function public.current_role_in_studio() returns text
language sql stable security definer set search_path = public as $$
  select role from studio_members where user_id = auth.uid() limit 1
$$;

-- ── Uygulama tabloları ───────────────────────────────────────────
-- Not: Uygulama tarihleri "2026-10-24" biçiminde metin gönderiyor (boş olabilir) → text.

create table if not exists public.clients (
  id text primary key, name text not null default '', phone text default '', email text default '',
  type text, package text, notes text default '', date text default '',
  total_amount numeric default 0, paid numeric default 0, status text,
  payments jsonb default '[]'::jsonb, process jsonb default '{}'::jsonb,
  referral_source text default '', referral_name text default '', anniversary_date text default ''
);
create table if not exists public.appointments (
  id text primary key, client_name text default '', client_id text default '', date text default '',
  time text default '', location text default '', type text default 'Düğün', package text default '',
  notes text default '', reminder_days integer default 3, status text default 'onaylı',
  total_amount numeric default 0, kapora numeric default 0,
  staff_name text default '', staff_ids jsonb default '[]'::jsonb
);
create table if not exists public.packages (
  id text primary key, name text not null default '', price numeric default 0, color text,
  includes jsonb default '[]'::jsonb, note text default ''
);
create table if not exists public.incomes (
  id text primary key, client_name text default '', amount numeric default 0, type text default '',
  method text default 'Nakit', date text default '', note text default '', category text default ''
);
create table if not exists public.expenses (
  id text primary key, amount numeric default 0, category text default '', description text default '',
  date text default '', method text default 'Nakit'
);
create table if not exists public.reminders (
  id text primary key, title text default '', linked_type text default '', linked_id text default '',
  trigger_date text default '', trigger_time text default '09:00', days_before integer default 0,
  done boolean default false
);
create table if not exists public.contracts (
  id text primary key, client_name text default '', package text default '', sign_date text default '',
  event_date text default '', total numeric default 0, deposit numeric default 0,
  status text default 'taslak', terms text default ''
);
create table if not exists public.team (
  id text primary key, name text default '', role text default '', phone text default '',
  color text default '', salary numeric default 0, total_earned numeric default 0, total_paid numeric default 0
);
create table if not exists public.shifts (
  id text primary key, member_id text default '', member_name text default '', date text default '',
  appointment_id text default '', client_name text default '', type text default '',
  status text default 'planlandı', fee numeric default 0, title text default '',
  start text default '08:00', "end" text default '18:00', location text default '', note text default ''
);
create table if not exists public.gallery (
  id text primary key, title text default '', category text default '', url text default '',
  client_id text default '', emoji text default '📷', color text default ''
);
create table if not exists public.quotes (
  id text primary key, client_name text default '', package text default '', base_price numeric default 0,
  items jsonb default '[]'::jsonb, discount numeric default 0, total numeric default 0,
  note text default '', date text default '', status text default 'taslak'
);
create table if not exists public.locations (
  id text primary key, name text default '', address text default '', note text default ''
);
create table if not exists public.messages (
  id text primary key, client_id text default '', client_name text default '', unread integer default 0,
  last_msg text default '', chat jsonb default '[]'::jsonb
);
create table if not exists public.notifications (
  id text primary key, team_id text default '', member_name text default '', appointment_id text default '',
  title text default '', body text default '', created_at text default '', date text default '',
  read boolean default false
);
create table if not exists public.notes (
  id text primary key, text text default '', tag text default 'genel', date text default '',
  time text default '00:00', starred boolean default false
);
create table if not exists public.weekly_reports (
  id text primary key, week_start text, week_end text, week_label text, created_at text,
  appointments_count integer default 0, income numeric default 0, overdue_payments integer default 0,
  overdue_deliveries integer default 0, appointments_data jsonb default '[]'::jsonb,
  pending_payments_data jsonb default '[]'::jsonb, suggestions_data jsonb default '[]'::jsonb
);

-- ── Her tabloya stüdyo bağlantısı + güvenlik kuralı ──────────────
-- studio_id otomatik doldurulur (uygulamanın göndermesine gerek yok).
-- Finans tabloları yalnızca admin'e açıktır; diğerleri stüdyodaki herkese.
do $$
declare t text;
begin
  foreach t in array array['clients','appointments','packages','incomes','expenses','reminders',
    'contracts','team','shifts','gallery','quotes','locations','messages','notifications','notes','weekly_reports']
  loop
    execute format('alter table public.%I add column if not exists studio_id uuid references public.studios(id) on delete cascade', t);
    execute format('alter table public.%I alter column studio_id set default public.current_studio_id()', t);
    execute format('create index if not exists %I on public.%I(studio_id)', t || '_studio_idx', t);
    -- Kayıt numaraları stüdyo bazında benzersiz: birincil anahtar (studio_id, id)
    if not exists (select 1 from pg_constraint where conname = t || '_studio_pk') then
      execute format('delete from public.%I where studio_id is null', t);
      execute format('alter table public.%I alter column studio_id set not null', t);
      execute format('alter table public.%I drop constraint if exists %I', t, t || '_pkey');
      execute format('alter table public.%I add constraint %I primary key (studio_id, id)', t, t || '_studio_pk');
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists studyom_giris_yapan_kullanici on public.%I', t);
    execute format('drop policy if exists studyom_kendi_studyosu on public.%I', t);
    if t in ('incomes','expenses','contracts','quotes','weekly_reports') then
      execute format('create policy studyom_kendi_studyosu on public.%I for all to authenticated
        using (studio_id = public.current_studio_id() and public.current_role_in_studio() = ''admin'')
        with check (studio_id = public.current_studio_id() and public.current_role_in_studio() = ''admin'')', t);
    else
      execute format('create policy studyom_kendi_studyosu on public.%I for all to authenticated
        using (studio_id = public.current_studio_id())
        with check (studio_id = public.current_studio_id())', t);
    end if;
  end loop;
end $$;

-- Stüdyo ve üyelik tabloları: kullanıcı yalnızca kendi stüdyosunu görür
alter table public.studios enable row level security;
alter table public.studio_members enable row level security;
drop policy if exists studyom_studyo_oku on public.studios;
create policy studyom_studyo_oku on public.studios for select to authenticated
  using (id = public.current_studio_id());
-- Stüdyo kaydı doğrudan güncellenemez (plan/deneme alanları korunur); firma bilgisi RPC ile kaydedilir
drop policy if exists studyom_studyo_guncelle on public.studios;
drop policy if exists studyom_uyeler_oku on public.studio_members;
create policy studyom_uyeler_oku on public.studio_members for select to authenticated
  using (studio_id = public.current_studio_id());

-- ── Kayıt sonrası işlemler (uygulama çağırır) ────────────────────
-- Yeni stüdyo oluştur: kayıt olan kişi stüdyonun admin'i olur
create or replace function public.create_studio(p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare s studios;
begin
  if auth.uid() is null then raise exception 'Giriş yapılmamış'; end if;
  if exists (select 1 from studio_members where user_id = auth.uid()) then
    raise exception 'Bu hesap zaten bir stüdyoya bağlı';
  end if;
  insert into studios(name, owner_id) values (coalesce(nullif(trim(p_name), ''), 'Stüdyom'), auth.uid()) returning * into s;
  insert into studio_members(studio_id, user_id, role) values (s.id, auth.uid(), 'admin');
  return json_build_object('studio_id', s.id, 'name', s.name, 'join_code', s.join_code, 'role', 'admin');
end $$;

-- Personel: stüdyonun katılım koduyla stüdyoya bağlan
create or replace function public.join_studio(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare s studios;
begin
  if auth.uid() is null then raise exception 'Giriş yapılmamış'; end if;
  if exists (select 1 from studio_members where user_id = auth.uid()) then
    raise exception 'Bu hesap zaten bir stüdyoya bağlı';
  end if;
  select * into s from studios where join_code = upper(trim(p_code));
  if s.id is null then raise exception 'Katılım kodu geçersiz'; end if;
  insert into studio_members(studio_id, user_id, role) values (s.id, auth.uid(), 'personel');
  return json_build_object('studio_id', s.id, 'name', s.name, 'role', 'personel');
end $$;

-- Personelin kendini Ekip listesindeki kaydıyla eşleştirmesi (bildirimler için)
create or replace function public.set_my_team_id(p_team_id text) returns void
language sql security definer set search_path = public as $$
  update studio_members set team_id = p_team_id where user_id = auth.uid()
$$;

-- Firma & kişi bilgilerini kaydet (yalnızca admin)
create or replace function public.update_studio_profile(p_profile jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role_in_studio() is distinct from 'admin' then raise exception 'Yetki yok'; end if;
  update studios set profile = coalesce(p_profile, '{}'::jsonb),
    name = coalesce(nullif(trim(p_profile->>'studio'), ''), name)
  where id = public.current_studio_id();
end $$;

-- Müşteri girişi: ad soyad + telefonun son 4 hanesi → müşteri numarası
create or replace function public.find_client(p_name text, p_phone4 text) returns text
language sql stable security definer set search_path = public as $$
  select id from clients
  where lower(trim(name)) = lower(trim(p_name))
    and length(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) >= 4
    and right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 4) = p_phone4
  limit 1
$$;

-- Giriş yapan kullanıcının stüdyo bilgisi (uygulama açılışta çağırır)
create or replace function public.my_studio() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('studio_id', s.id, 'name', s.name, 'join_code', case when m.role = 'admin' then s.join_code end,
    'role', m.role, 'team_id', m.team_id, 'plan', s.plan, 'trial_start', s.trial_start, 'plan_expiry', s.plan_expiry,
    'profile', s.profile)
  from studio_members m join studios s on s.id = m.studio_id
  where m.user_id = auth.uid() limit 1
$$;

-- ── Müşteri fotoğraf seçim linki (?proof=MÜŞTERİ_ID) ─────────────
-- Giriş yapmamış müşteri yalnızca kendi müşteri numarasıyla kendi bilgilerini görür.
create or replace function public.proof_data(p_client_id text) returns json
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from clients where id = p_client_id) then
    json_build_object(
      'client', (select row_to_json(c) from (
          select id, name, type, date, package, process, total_amount, paid from clients where id = p_client_id) c),
      'appointments', coalesce((select json_agg(a) from (
          select id, client_id, client_name, date, time, location, type, package, status
          from appointments where client_id = p_client_id) a), '[]'::json),
      'gallery', coalesce((select json_agg(g) from (
          select id, title, category, url, client_id, emoji, color from gallery where client_id = p_client_id) g), '[]'::json)
    )
  else null end
$$;

-- Fonksiyon yetkileri
revoke all on function public.create_studio(text), public.join_studio(text), public.set_my_team_id(text),
  public.my_studio(), public.proof_data(text), public.current_studio_id(), public.current_role_in_studio(),
  public.update_studio_profile(jsonb), public.find_client(text, text) from public;
grant execute on function public.create_studio(text), public.join_studio(text), public.set_my_team_id(text),
  public.my_studio(), public.current_studio_id(), public.current_role_in_studio(),
  public.update_studio_profile(jsonb) to authenticated;
grant execute on function public.proof_data(text), public.find_client(text, text) to anon, authenticated;
