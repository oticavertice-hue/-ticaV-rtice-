-- =====================================================================================
--  VÉRTICE DESIGN ÓPTICO · SCRIPT 03 · ESTOQUE E CATÁLOGO
--
--  >>> CONFIRA O PROJETO ANTES DE RODAR: este script é SÓ da VÉRTICE DESIGN ÓPTICO. <<<
--  >>> Projeto: YIVUGOTNODUEMJXZROQR                                                  <<<
--  >>> https://supabase.com/dashboard/project/yivugotnoduemjxzroqr/sql/new            <<<
--
--  · Rode DEPOIS do 01 e do 02, e ANTES de subir o código novo no GitHub.
--  · Pode rodar mais de uma vez. Não apaga nenhum dado.
--  · No SQL Editor, selecione TUDO (Ctrl+A) antes de clicar em Run.
-- =====================================================================================

-- ---------- 1. Quantidade em estoque de cada produto -------------------------------------
alter table public.produtos add column if not exists estoque integer not null default 0;

-- ---------- 2. Histórico de entradas e saídas ------------------------------------------
create table if not exists public.movimentos (
  id            uuid primary key default gen_random_uuid(),
  produto_id    uuid not null references public.produtos(id) on delete cascade,
  tipo          text not null check (tipo in ('entrada', 'saida')),
  quantidade    integer not null check (quantidade > 0),
  motivo        text not null default '',
  usuario       uuid default auth.uid(),
  usuario_nome  text not null default '',
  estornado     boolean not null default false,
  estorno_de    uuid references public.movimentos(id) on delete set null,
  criado        timestamptz not null default now()
);
create index if not exists movimentos_produto_idx on public.movimentos (produto_id, criado desc);
create index if not exists movimentos_criado_idx on public.movimentos (criado desc);

alter table public.movimentos enable row level security;
-- quem trabalha na loja lê; ninguém grava direto: só pelas duas funções abaixo
drop policy if exists "vt movimentos staff le" on public.movimentos;
create policy "vt movimentos staff le" on public.movimentos for select to authenticated
  using (public.vt_is_staff());

-- Entrada ou saída. Trava a linha do produto (duas pessoas ao mesmo tempo não bagunçam a conta)
-- e não deixa o estoque ficar negativo. Devolve o estoque novo.
create or replace function public.vt_mover_estoque(p_produto uuid, p_tipo text, p_qtd integer, p_motivo text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  atual integer;
  novo  integer;
  quem  text;
begin
  if not public.vt_is_staff() then raise exception 'sem permissao'; end if;
  if p_tipo not in ('entrada', 'saida') then raise exception 'tipo invalido'; end if;
  if p_qtd is null or p_qtd <= 0 then raise exception 'quantidade invalida'; end if;

  select estoque into atual from public.produtos where id = p_produto for update;
  if not found then raise exception 'produto nao encontrado'; end if;

  novo := case when p_tipo = 'entrada' then atual + p_qtd else atual - p_qtd end;
  if novo < 0 then raise exception 'estoque insuficiente: so tem %', atual; end if;

  update public.produtos set estoque = novo, atualizado = now() where id = p_produto;

  select coalesce(nullif(p.nome, ''), p.email, '') into quem from public.profiles p where p.id = auth.uid();
  insert into public.movimentos (produto_id, tipo, quantidade, motivo, usuario_nome)
  values (p_produto, p_tipo, p_qtd, coalesce(p_motivo, ''), coalesce(quem, ''));

  return novo;
end;
$$;
grant execute on function public.vt_mover_estoque(uuid, text, integer, text) to authenticated;

-- Desfazer (estorno): lança o movimento contrário e marca o original. Devolve o estoque novo.
create or replace function public.vt_desfazer_movimento(p_mov uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  m     public.movimentos%rowtype;
  atual integer;
  novo  integer;
  quem  text;
begin
  if not public.vt_is_staff() then raise exception 'sem permissao'; end if;

  select * into m from public.movimentos where id = p_mov for update;
  if not found then raise exception 'movimento nao encontrado'; end if;
  if m.estornado then raise exception 'este movimento ja foi desfeito'; end if;
  if m.estorno_de is not null then raise exception 'um estorno nao pode ser desfeito'; end if;

  select estoque into atual from public.produtos where id = m.produto_id for update;
  novo := case when m.tipo = 'entrada' then atual - m.quantidade else atual + m.quantidade end;
  if novo < 0 then raise exception 'estoque insuficiente: so tem %', atual; end if;

  update public.produtos set estoque = novo, atualizado = now() where id = m.produto_id;
  update public.movimentos set estornado = true where id = m.id;

  select coalesce(nullif(p.nome, ''), p.email, '') into quem from public.profiles p where p.id = auth.uid();
  insert into public.movimentos (produto_id, tipo, quantidade, motivo, usuario_nome, estorno_de)
  values (m.produto_id, case when m.tipo = 'entrada' then 'saida' else 'entrada' end,
          m.quantidade, 'Desfeito: ' || m.motivo, coalesce(quem, ''), m.id);

  return novo;
end;
$$;
grant execute on function public.vt_desfazer_movimento(uuid) to authenticated;

-- ---------- 3. Catálogo público --------------------------------------------------------
-- O público deixa de ler a tabela de produtos direto (RLS esconde linha, não coluna: a quantidade
-- em estoque ficaria visível pela API). Agora o catálogo lê por esta função, que só diz se o
-- produto está disponível, sem mostrar quantas peças existem.
drop policy if exists "vt produtos publico" on public.produtos;

create or replace function public.vt_catalogo()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'categorias', coalesce((
      select json_agg(json_build_object(
               'id', c.id, 'nome', c.nome, 'slug', c.slug, 'descricao', c.descricao,
               'foto', c.foto, 'campos', c.campos, 'ordem', c.ordem)
             order by c.ordem, c.nome)
      from public.categorias c
      where c.ativo and c.excluida is null), '[]'::json),
    'produtos', coalesce((
      select json_agg(json_build_object(
               'id', p.id, 'categoria_id', p.categoria_id, 'nome', p.nome, 'codigo', p.codigo,
               'marca', p.marca, 'descricao', p.descricao, 'preco', p.preco, 'preco_antigo', p.preco_antigo,
               'fotos', p.fotos, 'specs', p.specs, 'novo', p.novo, 'destaque', p.destaque,
               'disponivel', p.estoque > 0, 'criado', p.criado)
             order by p.destaque desc, p.criado desc)
      from public.produtos p
      join public.categorias c on c.id = p.categoria_id and c.ativo and c.excluida is null
      where p.ativo and p.excluida is null), '[]'::json),
    'config', coalesce((select dados::json from public.configuracoes where id = 1), '{}'::json)
  );
$$;
grant execute on function public.vt_catalogo() to anon, authenticated;

-- ---------- 4. Conferência --------------------------------------------------------------
-- Tem que aparecer 4 linhas, todas com "ok = true".
select 'coluna estoque' as item,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'produtos' and column_name = 'estoque') as ok
union all
select f, exists (select 1 from information_schema.routines where routine_schema = 'public' and routine_name = f)
  from unnest(array['vt_mover_estoque', 'vt_desfazer_movimento', 'vt_catalogo']) as f;
