-- ============================================================
-- AÇAÍ DA PATRÍCIA · Comanda digital presencial — SCHEMA v1
-- PostgreSQL / Supabase
--
-- Modelo: cliente escaneia o QR da comanda, pede pelo celular,
-- a cozinha recebe em tempo real, e o pagamento é no caixa.
-- Rode este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Extensão p/ UUID (Supabase já tem, mas garantimos)
create extension if not exists "pgcrypto";

-- ============================================================
-- 1) CARDÁPIO
-- ============================================================

create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort        int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(10,2) not null default 0,   -- preço base (0 se for montável)
  image_url    text,                               -- foto real do produto
  is_build     boolean not null default false,     -- true = "Monte seu Açaí"
  active       boolean not null default true,      -- ligar/desligar no admin
  sold_out     boolean not null default false,     -- "esgotado" na hora
  sort         int  not null default 0,
  created_at   timestamptz not null default now()
);

-- Grupos de opção do montador (Tamanho, Frutas, Cremes, Crocantes, Premium)
create table option_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  min_pick   int  not null default 0,   -- mínimo de escolhas
  max_pick   int,                        -- null = sem limite
  required   boolean not null default false,
  sort       int  not null default 0
);

-- Liga um produto montável aos seus grupos de opção
create table product_option_groups (
  product_id       uuid not null references products(id) on delete cascade,
  option_group_id  uuid not null references option_groups(id) on delete cascade,
  sort             int not null default 0,
  primary key (product_id, option_group_id)
);

-- Opções dentro de cada grupo (ex.: 500ml, Nutella, Morango...)
create table options (
  id               uuid primary key default gen_random_uuid(),
  option_group_id  uuid not null references option_groups(id) on delete cascade,
  name             text not null,
  price            numeric(10,2) not null default 0,  -- adicional pago (0 = grátis)
  color            text,                               -- p/ ilustração do copo
  active           boolean not null default true,
  sort             int not null default 0
);

-- ============================================================
-- 2) OPERAÇÃO (comandas, pedidos)
-- ============================================================

-- Comandas físicas numeradas (os cartões laminados com QR)
create table comandas (
  id          uuid primary key default gen_random_uuid(),
  number      int not null unique,                 -- 1, 2, 3... impresso no cartão
  token       uuid not null default gen_random_uuid(), -- vai na URL do QR (/c/{token})
  status      text not null default 'livre'
              check (status in ('livre','aberta','fechada')),
  opened_at   timestamptz,
  closed_at   timestamptz,
  created_at  timestamptz not null default now()
);

create table orders (
  id          uuid primary key default gen_random_uuid(),
  comanda_id  uuid not null references comandas(id) on delete cascade,
  status      text not null default 'novo'
              check (status in ('novo','preparando','pronto','entregue')),
  note        text,
  total       numeric(10,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id),
  name        text not null,          -- snapshot do nome (preço muda, histórico não)
  unit_price  numeric(10,2) not null,
  qty         int not null default 1
);

-- Adicionais escolhidos em cada item (snapshot)
create table order_item_options (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references order_items(id) on delete cascade,
  name           text not null,
  price          numeric(10,2) not null default 0
);

-- ============================================================
-- 3) ÍNDICES
-- ============================================================
create index on products (category_id);
create index on orders (comanda_id);
create index on orders (status);
create index on order_items (order_id);

-- ============================================================
-- 4) updated_at automático nos pedidos
-- ============================================================
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_orders_touch
before update on orders
for each row execute function touch_updated_at();

-- ============================================================
-- 5) TEMPO REAL — a cozinha recebe o pedido no mesmo instante
--    (Supabase Realtime escuta estas tabelas)
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table comandas;

-- ============================================================
-- 6) SEED — cardápio de exemplo (a Patrícia edita depois no admin)
-- ============================================================

-- categorias
insert into categories (name, sort) values
  ('Açaí no copo', 1), ('Gourmet', 2), ('Vitaminas', 3), ('Milkshake', 4);

-- grupos de opção do montador
insert into option_groups (name, min_pick, max_pick, required, sort) values
  ('Tamanho', 1, 1, true, 1),
  ('Frutas', 0, null, false, 2),
  ('Cremes & caldas', 0, null, false, 3),
  ('Crocantes', 0, null, false, 4),
  ('Premium', 0, null, false, 5);

-- opções (Tamanho)
insert into options (option_group_id, name, price, color, sort)
select id, v.name, v.price, '#5B2A88', v.sort
from option_groups g,
     (values ('300ml',14,1),('500ml',18,2),('700ml',24,3),('1 Litro',34,4)) as v(name,price,sort)
where g.name = 'Tamanho';

-- opções (Frutas)
insert into options (option_group_id, name, price, color, sort)
select id, v.name, 0, v.color, v.sort
from option_groups g,
     (values ('Banana','#F4D35E',1),('Morango','#E24C86',2),('Kiwi','#7FB53E',3),('Manga','#F5A623',4),('Uva','#7A4FA3',5)) as v(name,color,sort)
where g.name = 'Frutas';

-- opções (Cremes & caldas)
insert into options (option_group_id, name, price, color, sort)
select id, v.name, 0, v.color, v.sort
from option_groups g,
     (values ('Creme de Ninho','#F1E6CE',1),('Leite condensado','#FFF7E8',2),('Mel','#F5A623',3),('Ganache','#4A2C1B',4)) as v(name,color,sort)
where g.name = 'Cremes & caldas';

-- opções (Crocantes)
insert into options (option_group_id, name, price, color, sort)
select id, v.name, 0, v.color, v.sort
from option_groups g,
     (values ('Granola','#B98B4E',1),('Paçoca','#D9A85B',2),('Amendoim','#C89B5A',3),('Confete','#E24C86',4)) as v(name,color,sort)
where g.name = 'Crocantes';

-- opções (Premium — pagas)
insert into options (option_group_id, name, price, color, sort)
select id, v.name, v.price, v.color, v.sort
from option_groups g,
     (values ('Nutella',6,'#3E2416',1),('Leite Ninho extra',5,'#F1E6CE',2),('Ovomaltine',4,'#8A5A2B',3),('Brownie',6,'#4A2C1B',4),('Whey Protein',8,'#FFF7E8',5)) as v(name,price,color,sort)
where g.name = 'Premium';

-- produto montável (Monte seu Açaí)
with c as (select id from categories where name='Açaí no copo')
insert into products (category_id, name, description, price, is_build, sort)
select c.id, 'Monte seu Açaí', 'Do tamanho e do jeito que você ama.', 14, true, 1 from c;

-- liga o montável a todos os grupos de opção
insert into product_option_groups (product_id, option_group_id, sort)
select p.id, g.id, g.sort
from products p, option_groups g
where p.name = 'Monte seu Açaí';

-- produtos fixos (Gourmet)
with c as (select id from categories where name='Gourmet')
insert into products (category_id, name, description, price, sort)
select c.id, v.name, v.desc, v.price, v.sort from c,
 (values
  ('Taça Mineirinha','500ml · doce de leite e amendoim torrado.',28.90,1),
  ('Red White Velvet','500ml · creme de ninho e morangos frescos.',29.90,2),
  ('Taça Supreme','500ml · seleção de frutas frescas.',39.90,3),
  ('Taça Tropical','500ml · manga e kiwi.',29.90,4)
 ) as v(name,desc,price,sort);

-- Vitaminas / Milkshake
with c as (select id from categories where name='Vitaminas')
insert into products (category_id, name, description, price, sort)
select c.id, v.name, v.desc, v.price, v.sort from c,
 (values ('Vitamina de Açaí','Batido com leite e banana · 400ml.',16.00,1),
         ('Vitamina Power','Açaí, banana, aveia e mel · 400ml.',18.00,2)) as v(name,desc,price,sort);

with c as (select id from categories where name='Milkshake')
insert into products (category_id, name, description, price, sort)
select c.id, v.name, v.desc, v.price, v.sort from c,
 (values ('Milkshake de Açaí','Cremoso, calda e chantilly · 400ml.',18.00,1),
         ('Shake Ninho c/ Nutella','O queridinho da casa · 400ml.',20.00,2)) as v(name,desc,price,sort);

-- comandas físicas: gera 15 (ajuste a quantidade conforme as mesas)
insert into comandas (number)
select generate_series(1, 15);

-- ============================================================
-- 7) SEGURANÇA (RLS) — resumo do que fazer depois:
--   • Leitura pública do cardápio (categories/products/options): liberada.
--   • Criar pedido a partir de uma comanda 'aberta': permitido pelo token do QR.
--   • Mudar status / fechar comanda / editar cardápio: só equipe autenticada
--     (Supabase Auth). Definimos as policies na etapa do painel.
-- ============================================================
