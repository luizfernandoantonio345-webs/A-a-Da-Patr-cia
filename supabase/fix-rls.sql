-- ============================================================
-- FIX: Políticas de acesso para o app funcionar corretamente
-- Execute no Supabase → SQL Editor
-- ============================================================

-- 1) Garante que as tabelas estão na publicação de tempo real
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table order_item_options;
alter publication supabase_realtime add table comandas;

-- 2) Habilita RLS nas tabelas operacionais
alter table categories          enable row level security;
alter table products            enable row level security;
alter table option_groups       enable row level security;
alter table product_option_groups enable row level security;
alter table options             enable row level security;
alter table comandas            enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table order_item_options  enable row level security;

-- 3) Cardápio: leitura pública (clientes e balcão)
drop policy if exists "cardapio_select" on categories;
drop policy if exists "cardapio_select" on products;
drop policy if exists "cardapio_select" on option_groups;
drop policy if exists "cardapio_select" on product_option_groups;
drop policy if exists "cardapio_select" on options;

create policy "cardapio_select" on categories          for select using (true);
create policy "cardapio_select" on products            for select using (true);
create policy "cardapio_select" on option_groups       for select using (true);
create policy "cardapio_select" on product_option_groups for select using (true);
create policy "cardapio_select" on options             for select using (true);

-- Cardápio: só equipe autenticada edita
create policy "cardapio_write" on categories          for all using (auth.role() = 'authenticated');
create policy "cardapio_write" on products            for all using (auth.role() = 'authenticated');
create policy "cardapio_write" on option_groups       for all using (auth.role() = 'authenticated');
create policy "cardapio_write" on product_option_groups for all using (auth.role() = 'authenticated');
create policy "cardapio_write" on options             for all using (auth.role() = 'authenticated');

-- 4) Comandas: leitura pública (cliente precisa ver pelo token)
drop policy if exists "comandas_select" on comandas;
drop policy if exists "comandas_update_open" on comandas;
drop policy if exists "comandas_write_staff" on comandas;

create policy "comandas_select"      on comandas for select using (true);
-- cliente anônimo pode abrir comanda (livre → aberta)
create policy "comandas_update_open" on comandas for update
  using (true)
  with check (status in ('livre', 'aberta'));
-- equipe fecha e gerencia
create policy "comandas_write_staff" on comandas for all
  using (auth.role() = 'authenticated');

-- 5) Pedidos: leitura pública (balcão, admin, tempo real)
drop policy if exists "orders_select"       on orders;
drop policy if exists "orders_insert_client" on orders;
drop policy if exists "orders_update_staff"  on orders;

create policy "orders_select"        on orders for select using (true);
-- cliente cria pedido
create policy "orders_insert_client" on orders for insert with check (true);
-- equipe muda status (novo → preparando → pronto → entregue)
create policy "orders_update_staff"  on orders for update using (true);

-- 6) Itens e opções: leitura + inserção pública
drop policy if exists "items_select"  on order_items;
drop policy if exists "items_insert"  on order_items;
drop policy if exists "opts_select"   on order_item_options;
drop policy if exists "opts_insert"   on order_item_options;

create policy "items_select" on order_items        for select using (true);
create policy "items_insert" on order_items        for insert with check (true);
create policy "opts_select"  on order_item_options for select using (true);
create policy "opts_insert"  on order_item_options for insert with check (true);
