# Vértice Design Óptico — Contexto do projeto

> **Para o Claude (ou quem for continuar):** leia tudo antes de propor mudanças, junto com o
> PADRAO-APLICATIVOS.md. Ao terminar cada mudança, atualize o "Histórico" e as seções que mudaram.
>
> Última atualização: 06/10/2026

## 1. O que é e para quem

Ótica **Vértice Design Óptico**, em Uberlândia (Shopping Park). A dona é técnica em óptica, embaixadora
ZEISS, com mais de 10 anos de experiência. Armações a partir de R$ 249,90.

Duas partes no mesmo código:

- **App de gestão** (com login), no endereço principal: estoque, categorias e ajustes.
- **Catálogo público** (sem login), no endereço com **`/catalogo`**: o cliente escolhe as armações,
  responde o formulário da ótica e envia tudo pelo WhatsApp.

## 2. Onde fica cada coisa

- **Código:** GitHub, repositório privado `vertice-vitrine`, versão `main`.
- **Publicação:** Cloudflare Workers, Worker `vertice-vitrine` (tem que ser igual ao `name` do `wrangler.toml`).
  Build command `npm run build` · Deploy command `npx wrangler deploy`.
- **Banco, login e fotos:** Supabase, projeto **`yivugotnoduemjxzroqr`**.
  SQL: `https://supabase.com/dashboard/project/yivugotnoduemjxzroqr/sql/new`
- **Bucket das fotos:** `vertice` (público). Pastas: `produtos/`, `site/` (abertura), `categorias/`.
- **WhatsApp dos pedidos:** (34) 9 9856-3693 — fica em Ajustes → Dados da loja (no banco, não no código).
- **Instagram:** @verticedesign_optico.
- **Chave pública:** `src/config.js` (publishable key). A `service_role` nunca entra no código.

## 3. Tecnologia e arquivos

React 18 + Vite 5, sem TypeScript, sem biblioteca de componentes, estilos inline com o objeto de cores `C`.
Fontes: **Cinzel** (títulos, combina com as letras da logo) e **Montserrat** (texto), pelo Google Fonts.

- `src/main.jsx` — "catalogo" no endereço abre o Catálogo; o resto abre o App. Cada um carrega só o seu código.
- `src/config.js` — endereço e chave pública do Supabase.
- `src/api.js` — TODAS as chamadas ao banco. Encolhe a foto antes de subir, apaga arquivo de verdade.
- `src/padroes.js` — o que o app e o catálogo usam juntos: dados padrão da loja, **formulário padrão**,
  mensagens do WhatsApp, horários (Brasília), dinheiro, link do WhatsApp (web.whatsapp.com no computador).
- `src/ui.jsx` — peças de tela do app: Modal (portal, dvh, teclado, trava do fundo com contador), botões, campos.
- `src/App.jsx` — app de gestão: Login, Início, Estoque, ficha do produto, cadastro, Categorias.
- `src/Ajustes.jsx` — todas as telas de Ajustes.
- `src/Catalog.jsx` — o catálogo público inteiro (tem a própria cópia do Modal, com o tema escuro).
- `public/logo.jpg` — **a logo exatamente como a cliente mandou**, só recortada (tirada a parte da loja desfocada à direita).
- `public/emblema.jpg` — só o "V" da mesma imagem, para ícone redondo e rodapé.
- `public/favicon.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `manifest.webmanifest`.

## 4. Banco

Scripts já rodados, nesta ordem:

1. `vertice_01_schema.sql` — perfis, categorias, produtos, banners (sem uso hoje), configurações, acessos, bucket.
2. `vertice_02_categorias_iniciais.sql` — 6 categorias com as especificações de cada uma.
3. `vertice_03_estoque.sql` — coluna `estoque`, tabela `movimentos`, funções `vt_mover_estoque`,
   `vt_desfazer_movimento` e `vt_catalogo()`. Tira a leitura pública direta da tabela de produtos.

Tabelas principais:

- `profiles` — `role` `admin` ou `func`. **O primeiro usuário criado vira admin**; os outros entram como `func`.
- `categorias` — `nome`, `slug`, `descricao`, `campos` (jsonb: `[{chave, rotulo, tipo: opcoes|texto|simnao, opcoes}]`), `ordem`, `ativo`, `excluida`.
- `produtos` — `nome`, `codigo` (VT-001…), `marca`, `preco`, `preco_antigo`, `fotos` (array, a primeira é a capa),
  `specs` (jsonb com os valores das especificações), `novo`, `destaque`, `ativo`, `estoque`, `excluida`.
- `movimentos` — entrada/saída com `motivo`, quem fez, `estornado`, `estorno_de`.
- `configuracoes` (id = 1) — `dados` jsonb com **só o que a dona mudou**; o resto vem de `padroes.js`.
- `catalog_visits` — acessos (código sorteado, sem dado pessoal).

Regras importantes:

- O estoque só muda pelas funções (trava a linha, não deixa ficar negativo, grava o histórico).
- O catálogo lê por `vt_catalogo()`, que diz só se o produto está **disponível**, sem mostrar a quantidade.
- Excluir manda para a **lixeira** (`excluida`). "Apagar de vez" apaga também as fotos do servidor.

## 5. O que cada tela faz

**App**
- **Início:** modelos, peças em estoque, esgotados, botões (novo produto, divulgar o catálogo no WhatsApp,
  copiar o link), atenção no estoque, últimas entradas e saídas, acessos ao catálogo (só admin).
- **Estoque:** busca, filtros (categoria, esgotados, estoque baixo, escondidos). Toque abre a **ficha**:
  fotos, estoque, preço, especificações, **Entrada / Saída** com motivo, histórico com **desfazer**,
  editar, esconder do catálogo, ver no catálogo, excluir (admin).
- **Cadastro do produto:** até 6 fotos (a primeira é a capa, setas para reordenar), nome, categoria, marca,
  código automático, preço, preço antigo (mostra o desconto), quantidade inicial, especificações da categoria,
  descrição, "mostrar no catálogo", selo Novo, destaque. Cancelar apaga as fotos que subiram e não foram salvas.
- **Categorias (admin):** ordem do catálogo (setas), nome, frase, mostrar/esconder e o editor das especificações.
- **Ajustes (admin):** Dados da loja · Horários · **Chave Pix** · **Formulário do catálogo** · Mensagens do
  WhatsApp · Fotos da abertura · Textos do catálogo · Preferências · Usuários · Espaço das fotos · Lixeira.
  Equipe (`func`) vê só "Minha conta".

**Catálogo**
- **Abertura** em tela cheia: a logo como ela é, com as fotos da loja passando ao fundo (2,2 s, transição 0,75 s).
  Sem fotos, o fundo é a própria pedra da logo, desfocada.
- **Boas-vindas** e quatro quadros (consultoria, ZEISS, exame de vista, ajuste) — textos editáveis.
- **Como funciona** em três passos.
- **Coleção:** barra fixa com busca e categorias; cartões com foto, marca, especificações, preço, parcelas,
  selos Novo / desconto / esgotado, botão da sacola.
- **Ficha:** galeria deslizando (fotos lado a lado), foto ampliada, ficha técnica, "Tirar dúvida" no WhatsApp,
  compartilhar o modelo (link `/catalogo?p=<id>`).
- **Sacola** salva no navegador → **formulário da ótica** → WhatsApp.
- **Pedir orçamento** sem escolher armação (abre o mesmo formulário).
- **Visite a loja:** o círculo da localização (lente com escala de graus, endereço girando, mapa do Google
  dentro com filtro escuro, pino dourado com ondas, selo aberto/fechado no horário de Brasília), horários,
  Como chegar, Waze, WhatsApp, Instagram.
- **Rodapé** com o crédito do programador.

## 6. Regras de negócio da Vértice

- **O formulário** veio de uma conversa com a dona: ela pergunta se o cliente já tem a receita; se não tiver,
  oferece indicação de oftalmologista ou agendamento. Com receita, pergunta se já usa óculos ou é o primeiro.
  Pergunta a idade para saber se é multifocal (a partir dos 35, mais comum depois dos 40) e quantos óculos de grau.
  Ficou assim (editável em Ajustes → Formulário): nome · receita · já usa óculos (só se tem receita) ·
  quantos óculos de grau · para quem · idade · como prefere seguir (ir à loja ou orçamento pelo WhatsApp) ·
  forma de pagamento · observação.
- **Pix:** se o cliente escolhe uma forma de pagamento com a palavra "Pix", o catálogo mostra a chave com
  botão de copiar, e a chave vai no fim da mensagem. A chave fica em Ajustes → Chave Pix.
- **Lentes à parte**, conforme a receita: aparece na ficha, na sacola e na mensagem.
- Sem integração de pagamento (decisão do padrão).
- Produto esgotado some do catálogo (Preferências pode mudar isso).

## 7. Cuidados de celular e armadilhas deste projeto

- Tudo do padrão: box-sizing, trava de largura, `viewport-fit=cover`, dvh, 16px nos campos, Modal com portal,
  animação de aba só com opacidade, voltar do celular fechando janelas, campos declarados fora dos formulários.
- Fotos em `paddingTop` (sem `aspect-ratio`) por causa do Safari antigo.
- O mapa do Google dentro do círculo é um iframe com `pointer-events: none`; tocar no círculo abre o Maps.
  Se o iframe não carregar, aparece um mapa desenhado de reserva.
- A trava do fundo tem **contador**: a foto ampliada abre por cima da ficha, e só a última a fechar devolve a rolagem.

## 8. O que ainda falta

- Fotos reais dos produtos e das fotos da abertura (Ajustes → Fotos da abertura).
- Cadastrar a chave Pix.
- Confirmar os horários com a dona (lidos de um destaque do Instagram: seg–sex 09:30–18:30, sáb 10:00–15:30).
- Pôr o nome da dona em Ajustes → Usuários (aparece no Início e no histórico do estoque).
- Testar no iPhone e no Android: cadastro completo com foto, entrada/saída, pedido de teste pelo WhatsApp.

## 9. Histórico

- **06/10/2026 (manhã):** primeira versão (vitrine em `/` e painel em `/admin`, com CSS próprio).
  A cliente achou feia e a logo tinha sido redesenhada (só o "V" recortado e o nome reescrito em outra fonte).
- **06/10/2026 (tarde):** **refeito do zero no padrão de sempre** (como Caroline e Fran): app na raiz, catálogo
  em `/catalogo`, estilos inline. A **logo agora é a imagem original**, só recortada. Novo: estoque com
  entrada/saída e histórico com desfazer (SQL 03), formulário da ótica editável, chave Pix, círculo da
  localização mantido. A versão antiga ficou na pasta `_versao-antiga`, fora do repositório.
