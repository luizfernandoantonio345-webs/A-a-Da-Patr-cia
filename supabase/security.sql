-- ============================================================
-- AÇAÍ DA PATRÍCIA · Segurança (RLS) — rode DEPOIS do schema.sql
-- Regra geral:
--   • Cardápio: leitura pública (o cliente precisa ver).
--   • Criar pedido: liberado ao cliente anônimo (ele pede pelo QR).
--   • Mudar status, fechar comanda e editar cardápio: só equipe logada.
-- ============================================================

-- Liga RLS em todas as tabelas
alter table categories            enable row level security;
alter table products              enable row level security;
alter table option_groups         enable row level security;
alter table product_option_groups enable row level security;
alter table options               enable row level security;
alter table comandas              enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table order_item_options    enable row level security;

-- ---------- CARDÁPIO: leitura pública ----------
create policy "menu leitura publica" on categories            for select using (true);
create policy "menu leitura publica" on products              for select using (true);
create policy "menu leitura publica" on option_groups         for select using (true);
create policy "menu leitura publica" on product_option_groups for select using (true);
create policy "menu leitura publica" on options               for select using (true);

-- ---------- CARDÁPIO: só equipe logada gerencia ----------
create policy "menu admin" on categories            for all to authenticated using (true) with check (true);
create policy "menu admin" on products              for all to authenticated using (true) with check (true);
create policy "menu admin" on option_groups         for all to authenticated using (true) with check (true);
create policy "menu admin" on product_option_groups for all to authenticated using (true) with check (true);
create policy "menu admin" on options               for all to authenticated using (true) with check (true);

-- ---------- COMANDAS ----------
-- leitura liberada (o app resolve o token do QR); alteração só equipe
create policy "comanda leitura"   on comandas for select using (true);
create policy "comanda equipe"    on comandas for update to authenticated using (true) with check (true);
create policy "comanda equipe ins" on comandas for insert to authenticated with check (true);
create policy "comanda equipe del" on comandas for delete to authenticated using (true);

-- ---------- PEDIDOS ----------
-- cliente anônimo cria e lê a própria conta; só equipe muda status/apaga
create policy "pedido leitura" on orders for select using (true);
create policy "pedido criar"   on orders for insert with check (true);
create policy "pedido equipe"  on orders for update to authenticated using (true) with check (true);
create policy "pedido equipe del" on orders for delete to authenticated using (true);

create policy "item leitura" on order_items for select using (true);
create policy "item criar"   on order_items for insert with check (true);
create policy "item equipe"  on order_items for update to authenticated using (true) with check (true);
create policy "item equipe del" on order_items for delete to authenticated using (true);

create policy "opt leitura" on order_item_options for select using (true);
create policy "opt criar"   on order_item_options for insert with check (true);
create policy "opt equipe del" on order_item_options for delete to authenticated using (true);

-- ============================================================
-- NOTA: este é um nível de segurança pragmático para 1 loja:
-- protege a edição do cardápio, o status dos pedidos e o fechamento
-- de comanda (só equipe logada). A leitura de pedidos fica pública por
-- simplicidade. Se quiser blindar 100% a leitura de pedidos, o próximo
-- passo é resolver a comanda por uma função RPC com o token, em vez de
-- SELECT direto — dá pra endurecer quando quiser.
-- ============================================================
