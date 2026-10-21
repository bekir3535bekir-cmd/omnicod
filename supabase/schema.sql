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
-- Personel tablolara doğrudan erişemez (yalnızca mesajlar ve bildirimler).
-- Personel verileri staff_data() ile, tutar/ödeme/maaş/fiyat alanları ÇIKARILMIŞ olarak alır.
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
    if t in ('messages','notifications') then
      execute format('create policy studyom_kendi_studyosu on public.%I for all to authenticated
        using (studio_id = public.current_studio_id())
        with check (studio_id = public.current_studio_id())', t);
    else
      execute format('create policy studyom_kendi_studyosu on public.%I for all to authenticated
        using (studio_id = public.current_studio_id() and public.current_role_in_studio() = ''admin'')
        with check (studio_id = public.current_studio_id() and public.current_role_in_studio() = ''admin'')', t);
    end if;
  end loop;
end $$;

-- Randevu onayı: personelin eklediği randevu yönetici onaylayana kadar "bekliyor" durumundadır
alter table public.appointments add column if not exists approval text not null default 'onaylandı';
alter table public.appointments add column if not exists requested_by text not null default '';
alter table public.appointments add column if not exists request_info jsonb not null default '{}'::jsonb;

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
  return json_build_object('studio_id', s.id, 'name', s.name, 'portal_code', s.portal_code, 'role', 'admin');
end $$;

-- Eski "katılım koduyla personel olarak katıl" kaldırıldı: personel hesabını yalnızca yönetici açar
drop function if exists public.join_studio(text);

-- Müşteri portalı kodu: müşteri elle girişte stüdyosunu bu kodla belirtir (personel yetkisi VERMEZ)
alter table public.studios add column if not exists portal_code text;
update public.studios set portal_code = upper(substr(md5(random()::text || id::text), 1, 6)) where portal_code is null;
alter table public.studios alter column portal_code set default upper(substr(md5(random()::text), 1, 6));
create unique index if not exists studios_portal_code_idx on public.studios(portal_code);

-- Müşteri girişi deneme kaydı (tahmin yoluyla girişi engellemek için)
create table if not exists public.portal_attempts (
  portal_code text not null,
  created_at  timestamptz not null default now()
);
create index if not exists portal_attempts_idx on public.portal_attempts(portal_code, created_at);
alter table public.portal_attempts enable row level security;   -- kural yok: yalnızca fonksiyonlar erişir

-- Personelin kendini Ekip listesindeki kaydıyla eşleştirmesi (bildirimler için)
create or replace function public.set_my_team_id(p_team_id text) returns void
language sql security definer set search_path = public as $$
  update studio_members set team_id = p_team_id where user_id = auth.uid() and (team_id is null or role = 'admin')
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

-- Müşteri girişi: portal kodu + ad soyad + telefonun son 4 hanesi → müşteri numarası
-- Arama yalnızca o stüdyonun müşterilerinde yapılır; bir kod için saatte en fazla 10 hatalı deneme.
drop function if exists public.find_client(text, text);
create or replace function public.find_client(p_code text, p_name text, p_phone4 text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare v_code text := upper(trim(coalesce(p_code, ''))); v_studio uuid; v_id text;
begin
  delete from portal_attempts where created_at < now() - interval '1 day';
  if (select count(*) from portal_attempts where portal_code = v_code and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Çok fazla hatalı deneme. Lütfen bir saat sonra tekrar deneyin.';
  end if;
  select id into v_studio from studios where portal_code = v_code;
  if v_studio is not null and coalesce(p_phone4, '') ~ '^[0-9]{4}$' then
    select id into v_id from clients
    where studio_id = v_studio
      and lower(trim(name)) = lower(trim(p_name))
      and right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 4) = p_phone4
    limit 1;
  end if;
  if v_id is null then insert into portal_attempts(portal_code) values (left(v_code, 12)); end if;
  return v_id;
end $$;

-- Giriş yapan kullanıcının stüdyo bilgisi (uygulama açılışta çağırır)
create or replace function public.my_studio() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('studio_id', s.id, 'name', s.name, 'portal_code', s.portal_code,
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
          from appointments where client_id = p_client_id and approval <> 'bekliyor') a), '[]'::json),
      'gallery', coalesce((select json_agg(g) from (
          select id, title, category, url, client_id, emoji, color from gallery where client_id = p_client_id) g), '[]'::json)
    )
  else null end
$$;

-- ── Personel hesapları (yönetici oluşturur, şifreyi yönetici belirler) ──
-- Personel telefon numarası + şifre ile giriş yapar. Sistem içinde hesabın e-postası
-- p<telefon>@personel.studyom.gesblabs.com biçimindedir (bu adrese e-posta gönderilmez).

-- Yeni açılan personel hesabını yöneticinin stüdyosuna bağla
create or replace function public.add_staff(p_user_id uuid, p_team_id text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_studio uuid := public.current_studio_id(); v_email text;
begin
  if public.current_role_in_studio() is distinct from 'admin' then raise exception 'Yetki yok'; end if;
  -- Yalnızca az önce açılmış personel hesapları bağlanabilir (başkasının hesabı ele geçirilemez)
  select email into v_email from auth.users where id = p_user_id and created_at > now() - interval '15 minutes';
  if v_email is null or v_email not like '%@personel.studyom.gesblabs.com' then raise exception 'Geçersiz personel hesabı'; end if;
  if exists (select 1 from studio_members where user_id = p_user_id) then raise exception 'Bu hesap zaten bir stüdyoya bağlı'; end if;
  if exists (select 1 from studio_members where studio_id = v_studio and team_id = p_team_id) then
    raise exception 'Bu personelin zaten bir giriş hesabı var';
  end if;
  insert into studio_members(studio_id, user_id, role, team_id) values (v_studio, p_user_id, 'personel', p_team_id);
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_user_id;
end $$;

-- Stüdyonun personel hesapları (hangi ekip üyesinin giriş hesabı var)
create or replace function public.staff_accounts() returns json
language sql stable security definer set search_path = public, auth as $$
  select coalesce(json_agg(json_build_object('team_id', m.team_id,
           'phone', substr(split_part(u.email, '@', 1), 2))), '[]'::json)
  from studio_members m join auth.users u on u.id = m.user_id
  where m.studio_id = public.current_studio_id() and m.role = 'personel'
    and public.current_role_in_studio() = 'admin'
$$;

-- Yönetici personelin şifresini değiştirir
create or replace function public.set_staff_password(p_team_id text, p_password text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid;
begin
  if public.current_role_in_studio() is distinct from 'admin' then raise exception 'Yetki yok'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Şifre en az 6 karakter olmalı'; end if;
  select user_id into v_uid from studio_members
    where studio_id = public.current_studio_id() and team_id = p_team_id and role = 'personel';
  if v_uid is null then raise exception 'Personel hesabı bulunamadı'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
    where id = v_uid;
end $$;

-- Yönetici personelin uygulama erişimini kaldırır (hesap silinir)
create or replace function public.remove_staff(p_team_id text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid;
begin
  if public.current_role_in_studio() is distinct from 'admin' then raise exception 'Yetki yok'; end if;
  select user_id into v_uid from studio_members
    where studio_id = public.current_studio_id() and team_id = p_team_id and role = 'personel';
  if v_uid is null then return; end if;
  delete from auth.users where id = v_uid;
end $$;

-- Hesabımı sil (App Store / Google Play zorunluluğu)
-- Yönetici silerse: stüdyo, tüm verileri ve personel hesapları da silinir.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_studio uuid := public.current_studio_id(); v_role text := public.current_role_in_studio(); v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş yapılmamış'; end if;
  if v_role = 'admin' then
    delete from auth.users where id in (select user_id from studio_members where studio_id = v_studio and user_id <> v_me);
    delete from studios where id = v_studio;
  end if;
  delete from auth.users where id = v_me;
end $$;

-- ── Personel verisi (finans alanları olmadan) ─────────────────────
-- Personel müşteri, randevu, paket, ekip ve vardiya bilgilerini görür;
-- tutar, kapora, ödemeler, paket fiyatı, maaş ve ücret alanları hiç gönderilmez.
create or replace function public.staff_data() returns json
language plpgsql stable security definer set search_path = public as $$
declare v_studio uuid := public.current_studio_id(); v_me text;
begin
  if v_studio is null then raise exception 'Stüdyo bulunamadı'; end if;
  select team_id into v_me from studio_members where user_id = auth.uid();
  return json_build_object(
    'clients', coalesce((select json_agg(c) from (
        select id, name, phone, email, type, package, notes, date, status, process,
               referral_source, referral_name, anniversary_date
        from clients where studio_id = v_studio) c), '[]'::json),
    'appointments', coalesce((select json_agg(a) from (
        select id, client_name, client_id, date, time, location, type, package, notes, reminder_days, status,
               staff_name, staff_ids, approval, requested_by, request_info
        from appointments where studio_id = v_studio
          and (approval <> 'bekliyor' or requested_by = coalesce(v_me, '-'))) a), '[]'::json),
    'packages', coalesce((select json_agg(p) from (
        select id, name, color, includes, note from packages where studio_id = v_studio) p), '[]'::json),
    'team', coalesce((select json_agg(m) from (
        select id, name, role, phone, color from team where studio_id = v_studio) m), '[]'::json),
    'shifts', coalesce((select json_agg(s) from (
        select id, member_id, member_name, date, appointment_id, client_name, type, status, title, start, "end", location, note
        from shifts where studio_id = v_studio) s), '[]'::json),
    'locations', coalesce((select json_agg(l) from (
        select id, name, address, note from locations where studio_id = v_studio) l), '[]'::json)
  );
end $$;

-- Personel randevu ekler: "bekliyor" olarak kaydedilir, yöneticiye bildirim gider.
-- Tutar/kapora alınmaz; yönetici onaylarken girer.
create or replace function public.submit_appointment(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_studio uuid := public.current_studio_id(); v_me text; v_name text; v_id text := left(coalesce(p->>'id', ''), 64);
begin
  if v_studio is null then raise exception 'Stüdyo bulunamadı'; end if;
  if v_id = '' or coalesce(trim(p->>'client_name'), '') = '' or coalesce(p->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Müşteri adı ve tarih gerekli';
  end if;
  if exists (select 1 from appointments where studio_id = v_studio and id = v_id) then raise exception 'Bu randevu zaten kayıtlı'; end if;
  select team_id into v_me from studio_members where user_id = auth.uid();
  select name into v_name from team where studio_id = v_studio and id = v_me;
  insert into appointments(studio_id, id, client_name, client_id, date, time, location, type, package, notes,
                           reminder_days, status, staff_name, staff_ids, approval, requested_by, request_info)
  values (v_studio, v_id, left(trim(p->>'client_name'), 200), '', p->>'date', left(coalesce(p->>'time', ''), 5),
          left(coalesce(p->>'location', ''), 300), left(coalesce(p->>'type', 'Düğün'), 50), left(coalesce(p->>'package', ''), 100),
          left(coalesce(p->>'notes', ''), 2000), coalesce(nullif(p->>'reminder_days', '')::int, 3), 'onaylı',
          left(coalesce(p->>'staff_name', ''), 300),
          case when jsonb_typeof(p->'staff_ids') = 'array' then p->'staff_ids' else '[]'::jsonb end,
          'bekliyor', coalesce(v_me, ''),
          jsonb_build_object('client_phone', left(coalesce(p->>'client_phone', ''), 30),
                             'extra_dates', case when jsonb_typeof(p->'extra_dates') = 'array' then p->'extra_dates' else '[]'::jsonb end,
                             'requested_by_name', coalesce(v_name, 'Personel'),
                             'requested_at', to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD"T"HH24:MI:SS')));
  insert into notifications(studio_id, id, team_id, member_name, appointment_id, title, body, created_at, date, read)
  values (v_studio, 'onay-' || v_id, 'admin', coalesce(v_name, 'Personel'), v_id,
          'Onay bekleyen randevu: ' || left(trim(p->>'client_name'), 120) || ' — ' || left(coalesce(p->>'type', 'Düğün'), 50),
          coalesce(v_name, 'Personel') || ' ekledi · ' || to_char(to_date(p->>'date', 'YYYY-MM-DD'), 'DD.MM.YYYY')
            || coalesce(' · ' || nullif(left(p->>'location', 120), ''), ''),
          to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD"T"HH24:MI:SS'), p->>'date', false);
end $$;

-- Fonksiyon yetkileri
revoke all on function public.create_studio(text), public.set_my_team_id(text),
  public.my_studio(), public.proof_data(text), public.current_studio_id(), public.current_role_in_studio(),
  public.update_studio_profile(jsonb), public.find_client(text, text, text),
  public.add_staff(uuid, text), public.staff_accounts(), public.set_staff_password(text, text),
  public.remove_staff(text), public.delete_my_account(), public.staff_data(), public.submit_appointment(jsonb) from public;
grant execute on function public.create_studio(text), public.set_my_team_id(text),
  public.my_studio(), public.current_studio_id(), public.current_role_in_studio(),
  public.update_studio_profile(jsonb),
  public.add_staff(uuid, text), public.staff_accounts(), public.set_staff_password(text, text),
  public.remove_staff(text), public.delete_my_account(), public.staff_data(), public.submit_appointment(jsonb) to authenticated;
grant execute on function public.proof_data(text), public.find_client(text, text, text) to anon, authenticated;
