# Açaí da Patrícia — Comanda digital

Sistema de comanda presencial. O cliente escaneia o QR da comanda na mesa, pede pelo celular,
a cozinha recebe em tempo real, e o pagamento é feito no caixa (PIX ou maquininha).

**Stack:** Next.js (React) + TypeScript + Tailwind + Supabase (Postgres + Realtime). Deploy grátis na Vercel.

## Telas

- `/c/<token>` — **Cliente**: cardápio, montador de açaí guiado, envia pedido, vê a conta em tempo real.
- `/balcao` — **Balcão/cozinha**: pedidos caindo ao vivo (com som), muda status, fecha a comanda no caixa.
- `/admin` — **Admin**: liga/desliga produto, marca esgotado, muda preço e gera os QR das 15 comandas pra imprimir.

## Passo a passo pra colocar no ar

### 1) Banco (Supabase)
1. Crie um projeto grátis em https://supabase.com
2. Vá em **SQL Editor** → rode `supabase/schema.sql` (tabelas + tempo real + cardápio de exemplo + 15 comandas).
3. Em seguida rode `supabase/security.sql` (ativa o RLS: leitura do cardápio pública, edição só para a equipe logada).
4. Em **Authentication → Users**, crie um usuário para a Patrícia e um para o balcão (e-mail + senha).
5. Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.

### 2) Variáveis de ambiente
Copie `.env.local.example` para `.env.local` e preencha:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3) Rodar local
```
npm install
npm run dev
```
Abra http://localhost:3000 . Para testar o cliente, pegue um token de comanda:
no Supabase, tabela `comandas`, copie um `token` e acesse `/c/<token>`.
Abra `/balcao` noutra aba e veja o pedido cair em tempo real.

### 4) Publicar (Vercel)
1. Suba o projeto num repositório (GitHub).
2. Em https://vercel.com importe o repo, adicione as duas variáveis de ambiente e faça deploy.
3. Pronto: o app fica num endereço tipo `acaidapatricia.vercel.app` (dá pra ligar um domínio próprio depois).

### 5) Imprimir as comandas
Abra `/admin` → aba **Comandas & QR** → imprima a página. Cada QR já aponta pra `/c/<token>` da comanda certa.
Plastifique os cartões (igual ao modelo do Gelato) e distribua nas mesas.

## Segurança (já incluída)
- **Login da equipe**: `/balcao` e `/admin` exigem login (Supabase Auth). Crie os usuários em Authentication → Users.
- **RLS** (`supabase/security.sql`): cardápio com leitura pública; edição do cardápio, mudança de status e fechamento de comanda só para equipe logada; cliente anônimo só consegue criar o próprio pedido via QR.
- Endurecimento opcional (blindar leitura de pedidos por token via RPC) está anotado no fim do `security.sql`.

## Próximos passos (fase 2)
- Impressão automática na térmica (ESC/POS via ponte local).
- Relatórios (faturamento do dia, mais vendidos, horário de pico).
- Cashback/fidelidade.
- Fotos reais dos produtos (campo `image_url` já existe — é só preencher).
