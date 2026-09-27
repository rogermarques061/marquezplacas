-- Formulário gerado pelo painel ("Gerar formulário"): o cliente preenche no
-- celular do vendedor logado, então a venda já nasce atribuída a ele.
-- Pelo link público (anon) continua sem vendedor.
create or replace function public.enviar_formulario(
  p_nome           text,
  p_whatsapp       text,
  p_instagram      text,
  p_segmento       public.segmento,
  p_tem_site       public.tem_site,
  p_como_encontram public.como_encontram,
  p_aceite_contato boolean
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_whatsapp text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_instagram text := nullif(ltrim(trim(coalesce(p_instagram, '')), '@'), '');
  v_vendedor uuid := case when public.is_membro() then auth.uid() end;
begin
  if coalesce(p_aceite_contato, false) is not true then
    raise exception 'É preciso aceitar o contato pelo WhatsApp';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Nome inválido';
  end if;
  if v_whatsapp !~ '^[0-9]{10,11}$' then
    raise exception 'WhatsApp inválido';
  end if;

  insert into public.vendas (origem, nome, whatsapp, instagram, segmento, tem_site,
                             como_encontram, aceite_contato, status_venda, vendedor_id)
  values ('formulario', trim(p_nome), v_whatsapp, v_instagram, p_segmento, p_tem_site,
          p_como_encontram, true, 'pendente', v_vendedor)
  returning id into v_id;

  return v_id;
end;
$$;
