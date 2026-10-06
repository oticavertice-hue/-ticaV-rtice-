-- =====================================================================================
--  VÉRTICE DESIGN ÓPTICO · SCRIPT 02 · CATEGORIAS INICIAIS (com as especificações de cada uma)
--
--  >>> CONFIRA O PROJETO ANTES DE RODAR: este script é SÓ da VÉRTICE DESIGN ÓPTICO. <<<
--
--  · Rode UMA vez, logo depois do script 01. (Se rodar de novo, ele não duplica: pula as que já existem.)
--  · Depois disso a dona edita tudo pelo painel (Categorias): nomes, campos, ordem, fotos.
--  · As categorias aqui são o ponto de partida baseado em como as óticas organizam a vitrine.
-- =====================================================================================

insert into public.categorias (slug, nome, descricao, usa_medidas, usa_genero, ordem, ativo, campos)
values (
  'oculos-de-grau',
  'Óculos de Grau',
  'Armações para o dia a dia, para trabalho e para ocasiões especiais, prontas para receber a sua lente.',
  true,
  true,
  0,
  true,
  $j$[{"chave":"formato","rotulo":"Formato","tipo":"opcoes","opcoes":["Redondo","Oval","Panto","Quadrado","Retangular","Gatinho","Aviador","Hexagonal","Geométrico"],"filtro":true},{"chave":"material","rotulo":"Material","tipo":"opcoes","opcoes":["Acetato","Metal","Titânio","Aço inox","TR90","Nylon","Madeira","Misto (metal e acetato)"],"filtro":true},{"chave":"cor","rotulo":"Cor da armação","tipo":"opcoes","opcoes":["Preto","Marrom","Tartaruga","Dourado","Prata","Rosé","Transparente","Azul","Verde","Vermelho","Vinho","Bege","Cinza","Rosa","Bicolor"],"filtro":true},{"chave":"tipo_aro","rotulo":"Tipo de aro","tipo":"opcoes","opcoes":["Fechado","Meio aro (fio de nylon)","Sem aro (parafusado)"],"filtro":true},{"chave":"multifocal","rotulo":"Aceita lentes multifocais","tipo":"simnao","opcoes":[],"filtro":false}]$j$::jsonb
)
on conflict (slug) where excluida is null do nothing;

insert into public.categorias (slug, nome, descricao, usa_medidas, usa_genero, ordem, ativo, campos)
values (
  'oculos-de-sol',
  'Óculos de Sol',
  'Proteção UV com presença: armações de design e lentes que combinam com a sua luz.',
  true,
  true,
  1,
  true,
  $j$[{"chave":"formato","rotulo":"Formato","tipo":"opcoes","opcoes":["Redondo","Oval","Panto","Quadrado","Retangular","Gatinho","Aviador","Hexagonal","Geométrico"],"filtro":true},{"chave":"material","rotulo":"Material","tipo":"opcoes","opcoes":["Acetato","Metal","Titânio","Aço inox","TR90","Nylon","Madeira","Misto (metal e acetato)"],"filtro":true},{"chave":"cor","rotulo":"Cor da armação","tipo":"opcoes","opcoes":["Preto","Marrom","Tartaruga","Dourado","Prata","Rosé","Transparente","Azul","Verde","Vermelho","Vinho","Bege","Cinza","Rosa","Bicolor"],"filtro":true},{"chave":"cor_lente","rotulo":"Cor da lente","tipo":"opcoes","opcoes":["Fumê","Marrom","Verde","Cinza","Azul","Degradê","Espelhada","Rosa","Amarela"],"filtro":true},{"chave":"polarizado","rotulo":"Lente polarizada","tipo":"simnao","opcoes":[],"filtro":true},{"chave":"uv400","rotulo":"Proteção UV400","tipo":"simnao","opcoes":[],"filtro":false}]$j$::jsonb
)
on conflict (slug) where excluida is null do nothing;

insert into public.categorias (slug, nome, descricao, usa_medidas, usa_genero, ordem, ativo, campos)
values (
  'clip-on',
  'Clip-on',
  'Óculos de grau com clipe solar: duas armações em uma, sem abrir mão da sua receita.',
  true,
  true,
  2,
  true,
  $j$[{"chave":"formato","rotulo":"Formato","tipo":"opcoes","opcoes":["Redondo","Oval","Panto","Quadrado","Retangular","Gatinho","Aviador","Hexagonal","Geométrico"],"filtro":true},{"chave":"material","rotulo":"Material","tipo":"opcoes","opcoes":["Acetato","Metal","Titânio","Aço inox","TR90","Nylon","Madeira","Misto (metal e acetato)"],"filtro":true},{"chave":"cor","rotulo":"Cor da armação","tipo":"opcoes","opcoes":["Preto","Marrom","Tartaruga","Dourado","Prata","Rosé","Transparente","Azul","Verde","Vermelho","Vinho","Bege","Cinza","Rosa","Bicolor"],"filtro":true},{"chave":"cor_lente","rotulo":"Cor do clipe","tipo":"opcoes","opcoes":["Fumê","Marrom","Verde","Cinza","Azul","Degradê","Espelhada","Rosa","Amarela"],"filtro":true},{"chave":"polarizado","rotulo":"Clipe polarizado","tipo":"simnao","opcoes":[],"filtro":true}]$j$::jsonb
)
on conflict (slug) where excluida is null do nothing;

insert into public.categorias (slug, nome, descricao, usa_medidas, usa_genero, ordem, ativo, campos)
values (
  'infantil',
  'Infantil',
  'Armações leves, flexíveis e resistentes, pensadas para quem não para quieto.',
  true,
  false,
  3,
  true,
  $j$[{"chave":"formato","rotulo":"Formato","tipo":"opcoes","opcoes":["Redondo","Oval","Panto","Quadrado","Retangular","Gatinho","Aviador","Hexagonal","Geométrico"],"filtro":true},{"chave":"material","rotulo":"Material","tipo":"opcoes","opcoes":["Silicone","TR90","Acetato","Metal flexível"],"filtro":true},{"chave":"cor","rotulo":"Cor da armação","tipo":"opcoes","opcoes":["Preto","Marrom","Tartaruga","Dourado","Prata","Rosé","Transparente","Azul","Verde","Vermelho","Vinho","Bege","Cinza","Rosa","Bicolor"],"filtro":true},{"chave":"faixa_etaria","rotulo":"Faixa etária","tipo":"opcoes","opcoes":["0 a 3 anos","4 a 7 anos","8 a 12 anos"],"filtro":true},{"chave":"finalidade","rotulo":"Finalidade","tipo":"opcoes","opcoes":["Grau","Sol"],"filtro":true}]$j$::jsonb
)
on conflict (slug) where excluida is null do nothing;

insert into public.categorias (slug, nome, descricao, usa_medidas, usa_genero, ordem, ativo, campos)
values (
  'lentes',
  'Lentes',
  'Visão simples, multifocais, fotossensíveis e com filtro de luz azul, indicadas após a análise da sua receita.',
  false,
  false,
  4,
  true,
  $j$[{"chave":"tipo_lente","rotulo":"Tipo de lente","tipo":"opcoes","opcoes":["Visão simples","Multifocal","Fotossensível","Filtro de luz azul","Solar graduada"],"filtro":true},{"chave":"indice","rotulo":"Índice de refração","tipo":"opcoes","opcoes":["1.50","1.56","1.61","1.67","1.74"],"filtro":true},{"chave":"tratamento","rotulo":"Tratamentos","tipo":"texto","opcoes":[],"filtro":false}]$j$::jsonb
)
on conflict (slug) where excluida is null do nothing;

insert into public.categorias (slug, nome, descricao, usa_medidas, usa_genero, ordem, ativo, campos)
values (
  'acessorios',
  'Acessórios',
  'Estojos, flanelas, correntes e tudo para cuidar bem dos seus óculos.',
  false,
  false,
  5,
  true,
  $j$[{"chave":"tipo","rotulo":"Tipo","tipo":"opcoes","opcoes":["Estojo","Flanela","Corrente","Cordão","Spray limpa-lentes","Kit de limpeza"],"filtro":true},{"chave":"material","rotulo":"Material","tipo":"texto","opcoes":[],"filtro":false},{"chave":"cor","rotulo":"Cor","tipo":"texto","opcoes":[],"filtro":false}]$j$::jsonb
)
on conflict (slug) where excluida is null do nothing;

-- Conferência: tem que listar as 6 categorias.
select ordem, nome, slug, jsonb_array_length(campos) as campos from public.categorias where excluida is null order by ordem;
