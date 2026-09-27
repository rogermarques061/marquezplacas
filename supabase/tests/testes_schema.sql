\set ON_ERROR_STOP 1
-- usuários: o primeiro vira admin
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'roger@x.com'), ('00000000-0000-0000-0000-00000000000b', 'vend@x.com');
select nome, papel from public.profiles order by email;

-- formulário como anon
set role anon;
select public.enviar_formulario('Maria Silva', '(11) 98765-4321', '@mariadoces', 'alimentacao', 'nao_tem', 'instagram', true) is not null as form_ok;
do $$ begin perform public.enviar_formulario('Maria', '119', null, null, null, null, true); raise exception 'devia falhar';
exception when others then if sqlerrm = 'devia falhar' then raise; end if; raise notice 'ok, rejeitou: %', sqlerrm; end $$;
select count(*) as anon_ve_zero_vendas from public.vendas;
reset role;

-- vendedor valida a venda
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.vendas set tipo_venda='kit', quantidade=2, valor_total=260, forma_pagamento='pix', status_pagamento='pago',
  vendedor_id='00000000-0000-0000-0000-00000000000b', status_venda='validada' where nome='Maria Silva';
select whatsapp, instagram, total_plaquinhas, valor_total, validada_em is not null as validada from public.vendas;
select etapa, temperatura, responsavel_id is not null as tem_resp from public.leads;
-- vendedor não se promove
do $$ begin update public.profiles set papel='admin' where id = auth.uid(); raise exception 'promoveu';
exception when others then if sqlerrm = 'promoveu' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;
-- muda etapa
update public.leads set etapa='fechou_site';
update public.leads set etapa='manutencao_ativa';
select etapa, manutencao_ativa, site_fechado_em is not null as fechou, manutencao_desde is not null as desde from public.leads;
select etapa_anterior, etapa_nova, usuario_id is not null as quem from public.lead_historico order by created_at, etapa_nova;
-- venda validada incompleta rejeitada
do $$ begin insert into public.vendas (origem, nome, whatsapp, status_venda) values ('manual','Zé','11999999999','validada'); raise exception 'aceitou';
exception when check_violation then raise notice 'ok, check'; end $$;
-- não pode inserir histórico direto
do $$ begin insert into public.lead_historico (lead_id, etapa_nova) select id, 'perdido' from public.leads; raise exception 'inseriu';
exception when insufficient_privilege then raise notice 'ok, historico protegido'; end $$;
reset role;

-- venda manual já validada: ganha validada_em e lead
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.vendas (origem, nome, whatsapp, tipo_venda, quantidade, valor_total, forma_pagamento, status_venda, vendedor_id)
values ('manual', 'Zé do Bar', '11912345678', 'unidade', 1, 80, 'dinheiro', 'validada', auth.uid());
select v.nome, v.validada_em is not null as validada, l.etapa, l.temperatura
from public.vendas v join public.leads l on l.venda_id = v.id where v.nome = 'Zé do Bar';
reset role;

-- formulário gerado pelo vendedor logado: venda fica com ele
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.enviar_formulario('Bia Doces', '11977776666', null, 'alimentacao', 'nao_tem', 'google', true) is not null as enviado;
reset role;
select vendedor_id = '00000000-0000-0000-0000-00000000000b' as atribuida_ao_vendedor from public.vendas where nome = 'Bia Doces';
-- link público (anon, sem usuário): sem vendedor
set request.jwt.claim.sub = '';
set role anon;
select public.enviar_formulario('Anônimo Teste', '11966665555', null, null, null, null, true) is not null as anon_ok;
reset role;
select vendedor_id is null as publico_sem_vendedor from public.vendas where nome = 'Anônimo Teste';

-- notificações: sem config não chama; formulário (pendente) não notifica mais — só a validação
select count(*) as chamadas_sem_config from net.chamadas;
insert into vault.decrypted_secrets values ('notificar_venda_url', 'https://x.supabase.co/functions/v1/notificar-venda'), ('notificar_venda_segredo', 's3gr3do');
set request.jwt.claim.sub = '';
set role anon;
select public.enviar_formulario('Lia Nails', '11955554444', null, 'beleza_estetica', 'nao_tem', 'instagram', true) is not null as ok;
reset role;
insert into public.vendas (origem, nome, whatsapp) values ('manual', 'Manual Não Notifica', '11944443333');
select count(*) as formulario_nao_notifica from net.chamadas;

-- notificação na validação + dados do dia
delete from net.chamadas;
update public.vendas set tipo_venda='kit', quantidade=2, valor_total=260, forma_pagamento='pix', status_venda='validada' where nome = 'Lia Nails';
insert into public.vendas (origem, nome, whatsapp, tipo_venda, quantidade, valor_total, forma_pagamento, status_venda) values ('manual', 'Bar do Zé', '11933332222', 'unidade', 1, 80, 'dinheiro', 'validada');
insert into public.vendas (origem, nome, whatsapp) values ('manual', 'Pendente Não Notifica', '11922221111');
select count(*) as chamadas_validacao from net.chamadas;
select public.dados_notificacao((select id from public.vendas where nome = 'Bar do Zé')) ->> 'total_dia' as total_dia_apos_bar,
       public.dados_notificacao((select id from public.vendas where nome = 'Bar do Zé')) ->> 'vendas_dia' as vendas_dia;
