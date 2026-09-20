create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

insert into public.admin_users(user_id)
select id from auth.users order by created_at asc limit 1
on conflict (user_id) do nothing;

alter table public.admin_users enable row level security;

create or replace function public.is_amona_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;

create table if not exists public.site_images (
  slot text primary key,
  url text not null,
  alt_text text default '',
  updated_at timestamptz default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  customer_type text not null default 'all' check (customer_type in ('new','repeat','all')),
  tag text default '',
  title text not null,
  price text not null,
  description text default '',
  reserve_url text default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.site_images enable row level security;
alter table public.coupons enable row level security;

create policy "public read site images" on public.site_images for select using (true);
create policy "admin write site images" on public.site_images for all to authenticated using (public.is_amona_admin()) with check (public.is_amona_admin());
create policy "public read active coupons" on public.coupons for select using (is_active = true or public.is_amona_admin());
create policy "admin insert coupons" on public.coupons for insert to authenticated with check (public.is_amona_admin());
create policy "admin update coupons" on public.coupons for update to authenticated using (public.is_amona_admin()) with check (public.is_amona_admin());
create policy "admin delete coupons" on public.coupons for delete to authenticated using (public.is_amona_admin());

insert into public.coupons (customer_type,tag,title,price,description,reserve_url,is_active,sort_order)
select * from (values
('new','人気No.1','カット＋髪質改善カラー＋ハホニコトリートメント','¥14,000','W髪質改善で芯から補強し、潤いを閉じ込める高補修プラン。女性限定・併用不可・ブリーチなし','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000010873097&rootCd=10&storeId=H000794729',true,1),
('all','当日・前日限定','カット＋髪質改善カラー','¥11,000','通常 ¥13,000。予約日の前日または当日の平日限定。女性限定・併用不可','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000011108123&rootCd=10&storeId=H000794729',true,2),
('new','コスパ◎柔らか手触り','カット＋髪質改善カラー','¥12,000','Core配合で髪の芯を補強し、乾かすだけでまとまる艶髪へ。白髪染め可','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000010873176&rootCd=10&storeId=H000794729',true,3),
('new','パサつき解消','カット＋髪質改善TOKIOトリートメント','¥9,000','特許技術インカラミで髪を芯から補修し、強くしなやかな艶髪へ。女性限定・併用不可','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000010873197&rootCd=10&storeId=H000794729',true,4),
('all','頭皮すっきり','カット＋ヘッドスパ30分','¥8,800','炭酸クレンジングで頭皮をすっきり洗い、PJOLIケアで潤いを与えます。女性限定','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000011155160&rootCd=10&storeId=H000794729',true,5),
('new','柔らか質感','カット＋髪質改善縮毛矯正','¥18,500','Core配合でダメージを抑え、広がりや強いうねりもまとまる美髪へ。ロング料金なし','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000010873231&rootCd=10&storeId=H000794729',true,6),
('repeat','2回目・3回目限定','カット＋髪質改善カラー＋ハホニコトリートメント','¥14,000','W髪質改善で芯から補強し、潤いを閉じ込める高補修プラン。来店3回目までの女性限定','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000011109372&rootCd=10&storeId=H000794729',true,7),
('repeat','2回目・3回目限定','カット＋髪質改善カラー＋TOKIOトリートメント','¥16,000','CoreとTOKIOで内側・外側から補修する最高峰メニュー。女性限定・併用不可・ブリーチなし','https://beauty.hotpepper.jp/CSP/bt/reserve/?add=0&addMenu=0&couponId=CP00000011161663&rootCd=10&storeId=H000794729',true,8)
) as seed(customer_type,tag,title,price,description,reserve_url,is_active,sort_order)
where not exists (select 1 from public.coupons);

insert into storage.buckets (id,name,public) values ('site-images','site-images',true) on conflict (id) do update set public=true;
create policy "public view site image files" on storage.objects for select using (bucket_id='site-images');
create policy "admin upload site image files" on storage.objects for insert to authenticated with check (bucket_id='site-images' and public.is_amona_admin());
create policy "admin update site image files" on storage.objects for update to authenticated using (bucket_id='site-images' and public.is_amona_admin()) with check (bucket_id='site-images' and public.is_amona_admin());
create policy "admin delete site image files" on storage.objects for delete to authenticated using (bucket_id='site-images' and public.is_amona_admin());
