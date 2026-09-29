# Marquez Placas

PWA para gerenciar as vendas das plaquinhas NFC de avaliação (R$80 a unidade / R$130 o kit com 2)
e o pós-venda (site R$647 + manutenção R$97/mês).

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Postgres, Auth, Edge Functions) · PWA com Web Push.

## O que tem

| Área | O que faz |
| --- | --- |
| **Vendas → Gerar formulário** | Abre o formulário em tela cheia no celular do vendedor; o cliente preenche e a venda cai como pendente, já no nome do vendedor. |
| **Link público** (`/formulario`) | Mesmo formulário, para o cliente preencher no celular dele. |
| **Conferir venda** | Tipo (unidade/kit), quantidade, valor calculado e editável, plaquinhas físicas, pagamento, vendedor, observações. Validar / cancelar / reabrir. Venda manual. |
| **Visão geral** | Faturamento do dia e do mês, gráfico diário, indicadores, unidade × kit, segmentos, ranking e receita do pós-venda (sites e MRR). |
| **Prospecção → Na rua** | Busca negócios dos nichos (restaurante, nail, estética, salão, sobrancelha, barbearia, tatuador, ótica) num bairro ou perto de você, mostra no mapa as regiões com mais lojas a pé e monta a rota otimizada (abre no Google Maps). Marque visitei / interessado / vendeu / não quis. |
| **Prospecção → No X1** | Mesma busca, focada em quem tem telefone: botão de WhatsApp com mensagem pronta (editável), procurar contato de quem não tem telefone, contatos manuais e lista com o status de cada um. |
| **Leads** | Kanban (arrastar entre etapas) e lista com filtros. Temperatura automática pela resposta "já tem site?". Ficha com WhatsApp, reunião, anotações e histórico. |
| **Ajustes** | Notificações neste aparelho, perfil, link do formulário e equipe (admin: convidar, trocar papel, remover). |
| **Notificações** | A cada venda validada: "Opa! Mais uma plaquinha vendida. Valor de R$ 130,00" — o título muda a cada venda, e o dia comemora as metas de R$ 500, 1.000, 1.500, 2.000, 2.500, 3.000 (e recordes depois). Textos em `supabase/functions/notificar-venda/mensagens.ts`. |

Sem `.env`, o app mostra um aviso de configuração pendente. A demonstração com dados de exemplo só liga com `VITE_DEMO=1`.

## Colocando no ar

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrações de `supabase/migrations/` **em ordem** (SQL Editor, ou `supabase db push` com a CLI).
3. **Authentication → Sign In / Providers:** desative *Allow new users to sign up* (entrada só por convite).
4. **Authentication → URL Configuration:** em *Site URL* coloque o endereço do app
   (ex.: `https://placas.marquez.digital`) e em *Redirect URLs* adicione `https://placas.marquez.digital/definir-senha`.
5. Crie o **primeiro usuário** em *Authentication → Users → Add user*. O primeiro vira **admin** automaticamente;
   os próximos você convida pelo app, em Ajustes.

> Os e-mails de convite e de "esqueci minha senha" saem pelo e-mail padrão do Supabase, que tem limite baixo
> por hora. Para uso real, configure um SMTP próprio em *Authentication → Emails → SMTP Settings*.

### 2. Notificações (VAPID) e Edge Functions

Gere as chaves e um segredo aleatório:

```bash
npx web-push generate-vapid-keys
openssl rand -hex 32
```

Guarde tudo no **Vault** do banco (SQL Editor). As Edge Functions leem a configuração de lá, então não
é preciso configurar secrets pela CLI:

```sql
select vault.create_secret('<chave pública VAPID>', 'vapid_publica');
select vault.create_secret('<chave privada VAPID>', 'vapid_privada');
select vault.create_secret('mailto:contato@seudominio.com.br', 'vapid_contato');
select vault.create_secret('<segredo aleatório>', 'notificar_venda_segredo');
select vault.create_secret('https://SEU-PROJETO.supabase.co/functions/v1/notificar-venda', 'notificar_venda_url');
```

### 3. Publicar as Edge Functions

```bash
supabase link --project-ref SEU-PROJETO
supabase functions deploy notificar-venda --no-verify-jwt
supabase functions deploy gerenciar-usuarios
```

### 4. App

Copie `.env.example` para `.env` e preencha a URL, a chave pública (`anon`/`sb_publishable_…`) e a chave VAPID **pública**. Depois:

```bash
npm install
npm run build   # gera dist/, pronto para Vercel, Netlify, Cloudflare Pages etc.
```

**Na Vercel:** cadastre as três variáveis em *Settings → Environment Variables* com o tipo **Config**
(não *Secret*: variáveis `VITE_` vão para o navegador e a Vercel recusa como secreto). Depois de mudar
variáveis, é preciso um novo deploy para elas entrarem no site.

Na hospedagem, configure para **todas as rotas servirem o `index.html`** (SPA). Na Vercel e na Netlify isso é o padrão
para projetos Vite; no Netlify, se precisar, crie `public/_redirects` com `/* /index.html 200`.

### 5. Notificações no celular

- **Android:** abra o app, vá em **Ajustes** e ative as notificações. Dá para instalar pelo próprio Ajustes.
- **iPhone (iOS 16.4+):** abra no **Safari** → Compartilhar → **Adicionar à Tela de Início** → abra pelo ícone
  → Ajustes → ative. A Apple só libera notificação para app instalado.

Cada aparelho ativa separado; quem desinstala o app sai da lista sozinho no próximo envio.

## Dados da prospecção

Os negócios vêm do **OpenStreetMap** (gratuito, sem chave): endereço pelo Photon/Nominatim e lojas pelo Overpass.
Os servidores públicos do Overpass oscilam e recusam as Edge Functions, então a consulta sai pelo banco
(`consultar_overpass`, extensão `http`), revezando servidores e guardando cada resultado por 7 dias.
Cobertura de telefone é baixa (~20%); para mais contatos dá para trocar a fonte pelo Google Places (pago).

## Regras que ficam no banco

- O formulário público não lê nem altera tabelas: usa a função `enviar_formulario()`, que valida e força `pendente`.
  Quando chamada por um vendedor logado (Gerar formulário), a venda já fica no nome dele.
- `total_plaquinhas` é calculado pelo banco (kit conta 2). Venda só fica validada com os dados completos.
- Validar cria o lead (temperatura: Não tenho = quente, Desatualizado = morno, Funciona bem = frio).
  Cancelar uma validada remove o lead se ele ainda não andou no funil.
- Mudança de etapa grava histórico (quem e quando), marca a data do fechamento do site e liga a manutenção.
- RLS em todas as tabelas; só admin muda papéis e exclui registros.
- Notificação nunca bloqueia o cadastro da venda: se o envio falhar, a venda entra do mesmo jeito.

## Testes

- Banco: `supabase/tests/` (roda num Postgres local com o stub do ambiente Supabase).
- `npm run lint` e `npm run build`.
