-- =====================================================================================
--  VÉRTICE DESIGN ÓPTICO · SCRIPT 01 · BANCO COMPLETO (tabelas, regras, funções e fotos)
--
--  >>> CONFIRA O PROJETO ANTES DE RODAR: este script é SÓ da VÉRTICE DESIGN ÓPTICO. <<<
--  >>> O endereço do SQL Editor tem que ser o do projeto da Vértice.                  <<<
--
--  · Pode rodar mais de uma vez: usa "if not exists", "create or replace" e "drop policy if exists".
--  · Não apaga nenhum dado.
--  · Rode ANTES de subir o código no GitHub (o site novo procura colunas que precisam existir).
--  · No SQL Editor, selecione TUDO (Ctrl+A) antes de clicar em Run: "Run selected" roda só o trecho marcado.
-- =====================================================================================

-- ---------- 1. Perfis: quem entra no painel e com qual permissão ----------------------

create table if not exists public.profiles (
  id      uuid primary key references auth.users(id) on delete cascade,
  email   text,
  nome    text not null default '',
  role    text not null default 'func' check (role in ('admin', 'func')),
  criado  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- admin = dona da loja (tudo). func = funcionário (cadastra e edita produtos; não mexe em ajustes nem apaga de vez).
create or replace function public.vt_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
create or replace function public.vt_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;
grant execute on function public.vt_is_admin() to anon, authenticated;
grant execute on function public.vt_is_staff() to anon, authenticated;

-- Todo usuário novo ganha um perfil. O PRIMEIRO usuário criado vira admin; os seguintes, func.
create or replace function public.vt_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when exists (select 1 from public.profiles where role = 'admin') then 'func' else 'admin' end)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists vt_on_auth_user_created on auth.users;
create trigger vt_on_auth_user_created
  after insert on auth.users
  for each row execute function public.vt_novo_usuario();

-- Quem já existia antes deste script também ganha perfil (o mais antigo vira admin se ainda não houver um).
insert into public.profiles (id, email, role)
select u.id, u.email,
       case when not exists (select 1 from public.profiles where role = 'admin')
             and u.id = (select id from auth.users order by created_at asc limit 1)
            then 'admin' else 'func' end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

drop policy if exists "vt perfil le" on public.profiles;
create policy "vt perfil le" on public.profiles for select to authenticated
  using (id = auth.uid() or public.vt_is_admin());
drop policy if exists "vt perfil admin altera" on public.profiles;
create policy "vt perfil admin altera" on public.profiles for update to authenticated
  using (public.vt_is_admin()) with check (public.vt_is_admin());

-- ---------- 2. Categorias (com as especificações de cada uma) -------------------------

create table if not exists public.categorias (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  slug         text not null,
  descricao    text not null default '',
  foto         text not null default '',
  campos       jsonb not null default '[]'::jsonb,   -- [{chave, rotulo, tipo: opcoes|texto|simnao, opcoes: [], filtro: bool}]
  usa_medidas  boolean not null default true,
  usa_genero   boolean not null default true,
  ordem        integer not null default 0,
  ativo        boolean not null default true,
  criado       timestamptz not null default now(),
  atualizado   timestamptz,
  excluida     timestamptz                            -- lixeira: nada some de verdade sem o botão "Apagar de vez"
);
-- o apelido (slug) só precisa ser único entre as categorias que NÃO estão na lixeira
create unique index if not exists categorias_slug_uq on public.categorias (slug) where excluida is null;

-- ---------- 3. Produtos ----------------------------------------------------------------

create table if not exists public.produtos (
  id              uuid primary key default gen_random_uuid(),
  categoria_id    uuid not null references public.categorias(id) on delete restrict,
  nome            text not null,
  codigo          text not null default '',
  marca           text not null default '',
  genero          text not null default '',
  descricao       text not null default '',
  preco           numeric(12,2),                      -- vazio = "sob consulta"
  preco_antigo    numeric(12,2),
  preco_a_partir  boolean not null default false,
  fotos           text[] not null default '{}',       -- a primeira é a capa
  specs           jsonb not null default '{}'::jsonb, -- valores dos campos da categoria
  medidas         jsonb not null default '{}'::jsonb, -- {lente, ponte, haste} em mm
  destaque        boolean not null default false,
  novo            boolean not null default false,
  indisponivel    boolean not null default false,
  ativo           boolean not null default true,
  criado          timestamptz not null default now(),
  atualizado      timestamptz,
  excluida        timestamptz
);
create index if not exists produtos_categoria_idx on public.produtos (categoria_id);
create index if not exists produtos_visivel_idx   on public.produtos (ativo, excluida);

-- ---------- 4. Ofertas (faixas de destaque da vitrine) --------------------------------

create table if not exists public.banners (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  subtitulo      text not null default '',
  botao          text not null default '',
  destino_tipo   text not null default 'nenhum' check (destino_tipo in ('nenhum', 'whatsapp', 'categoria', 'produto', 'link')),
  destino_valor  text not null default '',
  foto           text not null default '',
  inicio         date,
  fim            date,
  ordem          integer not null default 0,
  ativo          boolean not null default true,
  criado         timestamptz not null default now(),
  atualizado     timestamptz,
  excluida       timestamptz
);

-- ---------- 5. Configuração da loja (uma linha só) ------------------------------------

create table if not exists public.configuracoes (
  id          integer primary key default 1 check (id = 1),
  dados       jsonb not null default '{}'::jsonb,     -- só o que a dona mudou; o resto vem dos padrões do site
  atualizado  timestamptz
);
insert into public.configuracoes (id, dados) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ---------- 6. Contagem de acessos (sem nome, telefone, IP ou localização) -------------

create table if not exists public.catalog_visits (
  id          uuid primary key default gen_random_uuid(),
  visitor     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists catalog_visits_data_idx on public.catalog_visits (created_at);

-- ---------- 7. Regras de acesso (RLS) --------------------------------------------------
-- RLS esconde LINHA, não coluna. Aqui não existe dado sigiloso nas tabelas lidas pelo público (sem custo, sem margem).

alter table public.categorias     enable row level security;
alter table public.produtos       enable row level security;
alter table public.banners        enable row level security;
alter table public.configuracoes  enable row level security;
alter table public.catalog_visits enable row level security;   -- sem política: ninguém lê nem escreve direto

-- categorias
drop policy if exists "vt categorias publico" on public.categorias;
create policy "vt categorias publico" on public.categorias for select to anon, authenticated
  using (ativo and excluida is null);
drop policy if exists "vt categorias staff le" on public.categorias;
create policy "vt categorias staff le" on public.categorias for select to authenticated
  using (public.vt_is_staff());
drop policy if exists "vt categorias admin" on public.categorias;
create policy "vt categorias admin" on public.categorias for all to authenticated
  using (public.vt_is_admin()) with check (public.vt_is_admin());

-- produtos
drop policy if exists "vt produtos publico" on public.produtos;
create policy "vt produtos publico" on public.produtos for select to anon, authenticated
  using (ativo and excluida is null);
drop policy if exists "vt produtos staff le" on public.produtos;
create policy "vt produtos staff le" on public.produtos for select to authenticated
  using (public.vt_is_staff());
drop policy if exists "vt produtos staff insere" on public.produtos;
create policy "vt produtos staff insere" on public.produtos for insert to authenticated
  with check (public.vt_is_staff());
drop policy if exists "vt produtos staff altera" on public.produtos;
create policy "vt produtos staff altera" on public.produtos for update to authenticated
  using (public.vt_is_staff()) with check (public.vt_is_staff());
drop policy if exists "vt produtos admin apaga" on public.produtos;
create policy "vt produtos admin apaga" on public.produtos for delete to authenticated
  using (public.vt_is_admin());

-- ofertas
drop policy if exists "vt banners publico" on public.banners;
create policy "vt banners publico" on public.banners for select to anon, authenticated
  using (ativo and excluida is null);
drop policy if exists "vt banners staff le" on public.banners;
create policy "vt banners staff le" on public.banners for select to authenticated
  using (public.vt_is_staff());
drop policy if exists "vt banners admin" on public.banners;
create policy "vt banners admin" on public.banners for all to authenticated
  using (public.vt_is_admin()) with check (public.vt_is_admin());

-- configuração: todo mundo lê (são os textos do site); só admin altera
drop policy if exists "vt config le" on public.configuracoes;
create policy "vt config le" on public.configuracoes for select to anon, authenticated using (true);
drop policy if exists "vt config admin" on public.configuracoes;
create policy "vt config admin" on public.configuracoes for all to authenticated
  using (public.vt_is_admin()) with check (public.vt_is_admin());

-- ---------- 8. Funções: acessos ---------------------------------------------------------

create or replace function public.vt_log_visit(p_visitor text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null or length(p_visitor) < 6 or length(p_visitor) > 64 then return; end if;
  -- a mesma pessoa só conta de novo depois de 30 minutos (atualizar a página não infla o número)
  if exists (select 1 from public.catalog_visits v
              where v.visitor = p_visitor and v.created_at > now() - interval '30 minutes') then
    return;
  end if;
  insert into public.catalog_visits (visitor) values (p_visitor);
end;
$$;
grant execute on function public.vt_log_visit(text) to anon, authenticated;

-- Totais e série dos últimos 14 dias, no horário de Brasília (o banco roda em UTC). Só admin.
create or replace function public.vt_stats()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  r json;
begin
  if not public.vt_is_admin() then raise exception 'sem permissao'; end if;
  select json_build_object(
    'hoje',  (select count(*) from public.catalog_visits where (created_at at time zone 'America/Sao_Paulo')::date = hoje),
    'd7',    (select count(*) from public.catalog_visits where (created_at at time zone 'America/Sao_Paulo')::date > hoje - 7),
    'd30',   (select count(*) from public.catalog_visits where (created_at at time zone 'America/Sao_Paulo')::date > hoje - 30),
    'total', (select count(*) from public.catalog_visits),
    'porDia', (
      select coalesce(json_agg(json_build_object('dia', to_char(d, 'YYYY-MM-DD'), 'n', coalesce(c.n, 0)) order by d), '[]'::json)
      from generate_series(hoje - 13, hoje, interval '1 day') as d
      left join (
        select (created_at at time zone 'America/Sao_Paulo')::date as dia, count(*) as n
        from public.catalog_visits group by 1
      ) c on c.dia = d::date
    )
  ) into r;
  return r;
end;
$$;
grant execute on function public.vt_stats() to authenticated;

-- ---------- 9. Fotos (Storage) -----------------------------------------------------------

-- Bucket público (as fotos da vitrine precisam abrir sem login). Só imagens, até 5 MB cada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vertice', 'vertice', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lista dos arquivos e tamanhos, para o medidor de espaço e a limpeza de arquivos sem uso (só admin).
create or replace function public.vt_storage_list()
returns table (nome text, tamanho bigint, criado timestamptz)
language plpgsql stable security definer set search_path = public, storage as $$
begin
  if not public.vt_is_admin() then raise exception 'sem permissao'; end if;
  return query
    select o.name::text, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
    from storage.objects o
    where o.bucket_id = 'vertice';
end;
$$;
grant execute on function public.vt_storage_list() to authenticated;

-- Permissões do Storage. Em alguns projetos a tabela storage.objects não pertence ao usuário do SQL Editor;
-- por isso cada política está num bloco que NÃO derruba o resto do script se falhar.
do $$
begin
  begin
    execute 'drop policy if exists "vertice envia arquivo" on storage.objects';
    execute 'create policy "vertice envia arquivo" on storage.objects for insert to authenticated '
         || 'with check (bucket_id = ''vertice'' and public.vt_is_staff())';
    raise notice 'OK: permissao de ENVIAR arquivo criada.';
  exception when others then
    raise notice 'ATENCAO: crie a permissao de ENVIAR pelo painel (Storage > Policies). Motivo: %', sqlerrm;
  end;
  begin
    execute 'drop policy if exists "vertice apaga arquivo" on storage.objects';
    execute 'create policy "vertice apaga arquivo" on storage.objects for delete to authenticated '
         || 'using (bucket_id = ''vertice'' and public.vt_is_staff())';
    raise notice 'OK: permissao de APAGAR arquivo criada.';
  exception when others then
    raise notice 'ATENCAO: crie a permissao de APAGAR pelo painel: Storage > Policies > vertice > New policy > For full customization > DELETE > authenticated > USING bucket_id = ''vertice''. Motivo: %', sqlerrm;
  end;
  begin
    execute 'drop policy if exists "vertice le arquivo" on storage.objects';
    execute 'create policy "vertice le arquivo" on storage.objects for select to anon, authenticated '
         || 'using (bucket_id = ''vertice'')';
    raise notice 'OK: permissao de LER arquivo criada.';
  exception when others then
    raise notice 'ATENCAO: crie a permissao de LER pelo painel. Motivo: %', sqlerrm;
  end;
end $$;

-- ---------- 10. Conferência (rode depois; tem que aparecer 3 linhas de política e o bucket "vertice") ----------

select policyname, cmd from pg_policies
 where schemaname = 'storage' and tablename = 'objects' and policyname like 'vertice %'
 order by policyname;

select id, name, public, file_size_limit from storage.buckets where id = 'vertice';
