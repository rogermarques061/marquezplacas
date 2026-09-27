# Marquez Placas

PWA para gerenciar as vendas das plaquinhas NFC de avaliação (R$80 a unidade / R$130 o kit com 2)
e o pós-venda (site R$647 + manutenção R$97/mês).

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Postgres, Auth, Edge Functions) · PWA com Web Push.

## Status

| Etapa | Situação |
| --- | --- |
| 1. Banco de dados + formulário público | ✅ |
| 2. Painel do vendedor (login, validar venda, venda manual) | ✅ |
| 3. Dashboard | ✅ |
| 4. Leads / funil pós-venda (Kanban + lista) | ✅ |
| 5. Usuários e convites | ⏳ |
| 6. Notificações push | ⏳ |

## Como rodar

1. Crie um projeto no [Supabase](https://supabase.com).
2. Rode a migração `supabase/migrations/20260927000001_schema_inicial.sql`
   (SQL Editor → cole e execute, ou `supabase db push` com a CLI).
3. Em **Authentication → Sign In / Providers**, desative "Allow new users to sign up"
   (os vendedores entram só por convite). O **primeiro usuário criado vira admin**.
4. Copie `.env.example` para `.env` e preencha com a URL e a chave `anon` do projeto.
5. `npm install` e `npm run dev`.

O formulário público fica em `/`. Esse é o link que vai no QR code / mensagem para o comprador.

## Banco de dados

Principais regras (todas no banco, não dependem do front):

- **Formulário público** não acessa as tabelas: chama a função `enviar_formulario()`,
  que valida os dados, força `status_venda = 'pendente'` e não devolve nada sensível.
- **`total_plaquinhas`** é calculado pelo banco (kit conta 2).
- Uma venda só pode ficar **validada** com tipo, quantidade, valor e forma de pagamento preenchidos.
- **Validar a venda cria o lead** automaticamente, com temperatura pela resposta "já tem site?"
  (Não tenho = quente, Desatualizado = morno, Funciona bem = frio). Cancelar uma venda validada
  remove o lead se ele ainda não saiu da primeira etapa.
- Toda **mudança de etapa** do lead grava `lead_historico` (quem e quando), marca a data em que fechou
  o site e liga a manutenção ao chegar em "Manutenção ativa".
- **RLS** em todas as tabelas; só admin muda papéis e exclui registros.

Testes do schema (Postgres local): `supabase/tests/`.

## Modo demonstração

Sem `.env`, o app roda com dados de exemplo em memória (nada é salvo) e mostra uma barra
para alternar entre a visão do comprador e a do vendedor.
