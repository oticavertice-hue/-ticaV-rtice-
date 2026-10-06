# CONTEXTO · Vértice Design Óptico (vitrine + painel)

Mantenha este arquivo atualizado ao fim de cada mudança. O histórico (seção 9) é a parte que mais salva tempo:
ele diz o que mudou e **por quê**, para ninguém desfazer sem querer uma correção que custou caro.

Segue o `PADRAO-APLICATIVOS.md` (Miguel Borges). Diferenças deste projeto em relação ao padrão estão na seção 6.

---

## 1. O que é e para quem

**Cliente:** Vértice Design Óptico, ótica em Uberlândia (MG), Av. José Abdulmassih, 1095, Loja 1, Shopping Park.
Instagram `@verticedesign_optico`. WhatsApp (34) 9 9856-3693. Dona: técnica em óptica, embaixadora ZEISS, +10 anos de mercado.

**O que é:** uma **vitrine online** (não é loja virtual: não há carrinho nem pagamento) + um **painel** para a dona subir fotos,
organizar categorias e cadastrar as armações com as especificações. O cliente final navega, marca o coração nas peças de que gostar
e fala com a loja pelo WhatsApp para experimentar. Ótica vende com prova na loja; por isso o botão principal é
"Quero experimentar na loja", e não "Comprar".

**Identidade:** preto quente, ouro champanhe e creme (tirados do logo e do Instagram). Bodoni Moda (títulos) + Jost (interface).
Arcos e círculos remetem a lentes. A seção "Visite-nos" é uma **lente-mapa**: um círculo com anel de graduação (escala de eixo de lente),
texto girando com o endereço e o mapa dentro.

## 2. Onde fica cada coisa (preencher quando as contas existirem)

| O quê | Valor |
|---|---|
| Repositório GitHub (PRIVADO) | `github.com/<usuario>/<repo>` |
| Publicação (Cloudflare Workers) | nome do Worker = nome do repositório; endereço `https://<nome>.<conta>.workers.dev` |
| Supabase (id do projeto) | `<id>`; SQL: `https://supabase.com/dashboard/project/<id>/sql/new` |
| Bucket de fotos | `vertice` (público) |
| WhatsApp da loja | 5534998563693 |
| Crédito do programador | Miguel Borges, (34) 9 9188-1557 (rodapé da vitrine e do painel) |

Chaves: só a **anon (pública)** entra em `src/config.js`. A `service_role` **nunca** entra no código nem em print.

## 3. Tecnologia e arquivos

React 18 + Vite 5, sem TypeScript e sem biblioteca de componentes. Supabase (banco, login, fotos). Cloudflare Workers (publicação).

```
index.html                 viewport-fit=cover, fontes, SEO, ícones
package.json · vite.config.js · wrangler.toml
public/                    logo-v.png (V dourado extraído da logo), logo-original.jpg, ícones, manifest, _headers
src/main.jsx               "/" abre a vitrine; "/admin" abre o painel (carregados separados: lazy)
src/config.js              URL e chave anon do Supabase (vazio = MODO DEMONSTRAÇÃO)
src/api.js                 TODAS as chamadas ao banco/Storage. Tem dois motores: Supabase e demonstração (localStorage)
src/data.js                configuração padrão da loja, categorias iniciais, guia de rosto, guia de lentes, produtos de exemplo
src/shared.jsx             ícones, ilustração SVG das armações, Modal (padrão do celular), avisos, utilidades
src/styles.css             tokens de cor, base do celular, botões, campos, janelas
src/Catalog.jsx            vitrine pública: estado, filtros, composição
src/vitrine-topo.jsx       abertura, aviso, cabeçalho, hero, faixa
src/vitrine-secoes.jsx     promessas, ofertas, categorias, destaques, guia de rosto, guia de lentes, sobre, lente-mapa, rodapé
src/vitrine-produto.jsx    cartão, galeria deslizante, detalhe (medidas, rostos), minha seleção
src/vitrine-arte.jsx       ilustrações (categorias, lentes, estojo, diagrama das lentes)
src/catalog.css            estilo da vitrine
src/App.jsx · admin.css    painel do dono
vertice_01_schema.sql      banco, regras, funções, bucket
vertice_02_categorias_iniciais.sql
```

**Regra:** nenhuma tela chama o Supabase direto; tudo passa por `api.js`.

## 4. Banco

Scripts, **nesta ordem, antes de subir o código** (o site novo procura colunas que precisam existir):
1. `vertice_01_schema.sql` (rodar com Ctrl+A antes do Run). Cria tudo, inclusive o bucket `vertice` e as permissões do Storage.
2. `vertice_02_categorias_iniciais.sql` (uma vez).

Tabelas: `profiles` (role `admin`/`func`; o **primeiro usuário criado vira admin**, os seguintes `func`), `categorias`
(com `campos` jsonb = as especificações), `produtos` (`specs` jsonb, `medidas` jsonb, `fotos` text[]), `banners` (Ofertas),
`configuracoes` (linha única, jsonb com só o que a dona alterou; o resto vem de `CONFIG_PADRAO` em `data.js`), `catalog_visits`.

Funções: `vt_is_admin()`, `vt_is_staff()`, `vt_log_visit(text)` (pública), `vt_stats()` e `vt_storage_list()` (só admin).
Permissões do Storage: enviar, apagar e ler (3 políticas "vertice ...").

Permissões: **admin** = tudo. **func** = cadastra/edita produtos e sobe fotos; não mexe em categorias, ofertas, ajustes, acessos,
armazenamento, nem apaga de vez. A trava está no banco (RLS), não só na tela. Público (anon) só lê o que está `ativo` e fora da lixeira.

Sem custo, margem ou dado sigiloso nas tabelas (RLS esconde linha, não coluna).

## 5. O que cada tela faz

**Vitrine (`/`)**: abertura animada (1x por visita; ?p= pula) · cabeçalho que fica sólido ao rolar · hero com arco e selo girando ·
faixa de serviços · promessas · ofertas (banners) · categorias (arcos) · destaques (trilho) · **coleção** (abas por categoria, busca,
gênero, filtros que nascem dos campos da categoria e dos valores que existem, ordenar, "ver mais") · guia de **formato de rosto**
(filtra a coleção) · guia de **lentes** · sobre · **Visite-nos (lente-mapa)** com horário e "aberto agora" · rodapé.
Detalhe do produto em janela (galeria que desliza, especificações, diagrama de medidas lente-ponte-haste, rostos que combinam,
parecidos). **Minha seleção** (favoritos em `localStorage`) → mensagem pronta no WhatsApp. Botão flutuante do WhatsApp.
Links diretos: `/?p=<id do produto>` e `/?cat=<slug>`.

**Painel (`/admin`)**: Início (pendências, acessos, armazenamento) · Produtos (formulário com fotos, especificações dinâmicas, medidas, preço)
· Categorias (editor de especificações) · Ofertas · Ajustes (loja, horários, textos, fotos do site, mensagens do WhatsApp, lixeira, conta).

## 6. Regras e decisões deste cliente

- **Sem carrinho e sem pagamento** (decisão do padrão: não há integração de pagamento). Preço é opcional por produto: vazio = "Sob consulta".
  Em Ajustes dá para esconder todos os preços ("Consulte valores"). Parcelamento: só aparece "em até Nx no cartão" (sem prometer "sem juros").
- **Formato de rosto** é calculado a partir da especificação `formato` da armação (tabela `ROSTOS` em `data.js`); a dona não preenche nada a mais.
  O campo `formato` das categorias de armação não deve ter a chave trocada.
- **Especificações por categoria**: cada categoria define seus campos (lista de opções, texto, sim/não) e quais viram filtro. Produto guarda os valores em `specs`.
- **Foto**: encolhe sozinha para 1.400 px / WebP 0,8 antes de subir; máx. 6 por produto; apagar de verdade ao remover/trocar/excluir de vez;
  fotos enviadas numa edição cancelada são apagadas na hora; medidor de espaço e "limpar arquivos sem uso" em Ajustes (admin).
  Fotos ficam em subpastas: `produtos/`, `categorias/`, `banners/`, `site/`. Órfão = não pertence a nenhum cadastro (inclusive lixeira) e tem mais de 1 h.
- **Lixeira** no lugar de excluir; "Apagar de vez" só admin e pede confirmação forte.
- **Horário de funcionamento** vem de Ajustes e é calculado no horário de Brasília (inclui "aberto agora"). Os valores iniciais (seg-sex 09:30-18:30,
  sáb 10:00-15:30, dom fechado) foram lidos de um destaque do Instagram: **conferir com a dona**.
- **Mapa**: iframe do Google Maps (sem chave) filtrado em tom escuro dentro da lente, com `pointer-events: none` (não prende a rolagem no celular;
  clicar na lente abre o Google Maps). O texto de busca do mapa está em Ajustes > Loja. Enquanto o mapa carrega (ou se falhar) aparece um mapa desenhado.
- **WhatsApp**: no computador usa `web.whatsapp.com` (o WhatsApp instalado embaralha emoji). Mensagens editáveis em Ajustes.
  Marcadores: `{nome}` `{ref}` `{link}` `{itens}`.
- **CSS**: este projeto usa arquivos `.css` com classes (`vt-` base, `vd-` vitrine, `ad-` painel) em vez de estilos inline, porque o desenho depende de
  hover, animações e media queries. A base do celular do padrão (seção 4.1) está em `styles.css`.
- **Estrutura**: a vitrine abre na raiz e o painel em `/admin` (no padrão, o app é a raiz e o catálogo é `/catalogo`).
- **Modo demonstração**: com `src/config.js` vazio, o site roda com produtos de exemplo e o painel aceita qualquer e-mail/senha, guardando tudo só no
  navegador. Serve para mostrar o design e testar. Ao preencher a URL e a chave anon, passa a usar o Supabase de verdade.

## 7. Cuidados de celular e armadilhas

- Seguem o padrão: `box-sizing`, trava de largura (`overflow-x: clip`), `viewport-fit=cover` sem `maximum-scale`, `dvh`, área segura,
  campos com 16px, Modal com `createPortal` + `visualViewport` + trava do fundo, botão voltar fechando janelas (pilha em `shared.jsx`),
  componentes de campo fora do formulário, galeria com todas as fotos lado a lado, número de preço sem quebrar.
- Animações de "aparecer ao rolar" usam `transform`, mas **só em elementos que nunca contêm janela fixa**. Janelas vão para o `body` por portal.
- **PowerShell grava BOM** com `Set-Content -Encoding utf8`: quebra `package.json`. Use editor/ferramenta que grave UTF-8 sem BOM.
- No Windows, caminho longo (>260) quebra o Node. Se a pasta do projeto estiver numa pasta profunda, rode `npm install` numa pasta curta (ex. `C:\vt`).
- Supabase gratuito **pausa o projeto após 1 semana sem acesso**; a contagem de acessos da vitrine ajuda a manter vivo, mas se o site parar, olhe o painel do Supabase antes de mexer em código.
- Desligar o cadastro público: Supabase > Authentication > Sign In / Providers > "Allow new users to sign up" desligado. Criar usuário em
  Authentication > Users > **Create new user** (com senha e "Auto Confirm User"), nunca "Send invitation".

## 8. O que ainda falta

- Contas no nome da cliente (GitHub privado, Supabase, Cloudflare) e preencher `src/config.js`.
- Fotos reais das armações (hoje o site mostra ilustração enquanto não há foto), fotos de abertura e foto da dona (Ajustes > Fotos do site).
- Conferir com a dona: horário, texto "sobre", nome do mapa, parcelamento, se mostra preço.
- Opcional: notificação por Web Push (não implementada: vitrine não tem pedido para avisar), domínio próprio, Google Meu Negócio apontando para o site.

## 9. Histórico

- **06/10/2026**: projeto criado. Vitrine pública (abertura, hero, categorias, coleção com filtros dinâmicos, guia de rosto, guia de lentes,
  lente-mapa, detalhe com medidas), painel (produtos, categorias com editor de especificações, ofertas, ajustes, lixeira, acessos, armazenamento),
  scripts SQL 01 e 02, modo demonstração. Logo: o "V" foi extraído da imagem 3D enviada (fundo de pedra removido por máscara de cor, com
  preenchimento e suavização do contorno) e salvo como `public/logo-v.png`; o nome "Vértice / Design Óptico" é texto (Jost), não imagem.
  *Por quê:* tentativa de recriar o V em vetor ficou pesada e infiel; a imagem extraída mantém o volume do original.
