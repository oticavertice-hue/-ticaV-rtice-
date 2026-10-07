// TODAS as chamadas ao banco passam por aqui. As telas nunca falam direto com o Supabase.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, BUCKET } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

function ok({ data, error }) {
  if (error) throw error;
  return data;
}

// O Supabase devolve no máximo 1.000 linhas por vez: busca em páginas até acabar.
async function todas(montar) {
  const saida = [];
  for (let de = 0; ; de += 1000) {
    const parte = ok(await montar().range(de, de + 999));
    saida.push(...parte);
    if (parte.length < 1000) break;
  }
  return saida;
}

/* traduz os erros do banco para algo que a dona entende */
export function msgErro(e) {
  const m = String((e && (e.message || e.error_description)) || e || "");
  if (/estoque insuficiente/i.test(m)) return "Não há peças suficientes em estoque para essa saída.";
  if (/sem permissao|permission|row-level/i.test(m)) return "Esta conta não tem permissão para isso.";
  if (/invalid login/i.test(m)) return "E-mail ou senha incorretos.";
  if (/categorias_slug_uq|slug/i.test(m) && /duplicate|unique/i.test(m)) return "Já existe uma categoria com esse nome.";
  if (/foreign key/i.test(m) && /categoria_id/i.test(m) && /delete/i.test(m)) return "Ainda existem produtos ligados a esta categoria.";
  if (/fetch|network|Failed/i.test(m)) return "Sem conexão. Confira a internet e tente de novo.";
  if (/already been reversed|ja foi desfeito/i.test(m)) return "Este movimento já foi desfeito.";
  return m || "Algo deu errado. Tente de novo.";
}

// ---------- login ----------
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export function onAuth(cb) {
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s));
  return () => data.subscription.unsubscribe();
}
export async function login(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) throw error;
}
export async function logout() {
  await supabase.auth.signOut();
}
export async function trocarSenha(nova) {
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) throw error;
}
export async function meuPerfil(userId) {
  const { data, error } = await supabase.from("profiles").select("id,email,nome,role").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- usuários (só admin) ----------
export async function listarUsuarios() {
  return ok(await supabase.from("profiles").select("id,email,nome,role,criado").order("criado"));
}
export async function salvarUsuario(id, dados) {
  ok(await supabase.from("profiles").update(dados).eq("id", id));
}

// ---------- tudo o que o app de gestão precisa para abrir ----------
export async function carregarPainel() {
  const [categorias, produtos, cfg, movimentos] = await Promise.all([
    todas(() => supabase.from("categorias").select("*").is("excluida", null).order("ordem").order("nome")),
    todas(() => supabase.from("produtos").select("*").is("excluida", null).order("criado", { ascending: false })),
    supabase.from("configuracoes").select("dados").eq("id", 1).maybeSingle(),
    supabase.from("movimentos").select("*").order("criado", { ascending: false }).limit(40),
  ]);
  if (cfg.error) throw cfg.error;
  if (movimentos.error) throw movimentos.error;
  return { categorias, produtos, config: (cfg.data && cfg.data.dados) || {}, movimentos: movimentos.data || [] };
}

// ---------- produtos ----------
const CAMPOS_PRODUTO = ["categoria_id", "nome", "codigo", "marca", "descricao", "preco", "preco_antigo", "fotos", "specs", "novo", "destaque", "ativo"];

/* Grava o produto e apaga do servidor as fotos que saíram (comparando com a versão antiga). */
export async function salvarProduto(p, antigo, estoqueInicial) {
  const dados = Object.fromEntries(CAMPOS_PRODUTO.filter((k) => k in p).map((k) => [k, p[k]]));
  dados.atualizado = new Date().toISOString();
  let salvo;
  if (p.id) {
    salvo = ok(await supabase.from("produtos").update(dados).eq("id", p.id).select().single());
  } else {
    salvo = ok(await supabase.from("produtos").insert(dados).select().single());
    if (estoqueInicial > 0) {
      salvo.estoque = await moverEstoque(salvo.id, "entrada", estoqueInicial, "Estoque inicial");
    }
  }
  if (antigo) {
    const sairam = (antigo.fotos || []).filter((f) => !(p.fotos || []).includes(f));
    if (sairam.length) await removerArquivos(sairam);
  }
  return salvo;
}

export async function proximoCodigo() {
  const linhas = await todas(() => supabase.from("produtos").select("codigo").ilike("codigo", "VT-%"));
  const maior = linhas.reduce((m, l) => Math.max(m, parseInt(String(l.codigo).replace(/\D/g, ""), 10) || 0), 0);
  return `VT-${String(maior + 1).padStart(3, "0")}`;
}

export async function codigoEmUso(codigo, id) {
  if (!codigo) return false;
  // ilike trata "_" e "%" como curinga: escapa para comparar o texto exatamente como digitado
  const exato = String(codigo).replace(/[\\%_]/g, (c) => "\\" + c);
  let q = supabase.from("produtos").select("id").ilike("codigo", exato).is("excluida", null);
  if (id) q = q.neq("id", id);
  const linhas = ok(await q.limit(1));
  return linhas.length > 0;
}

export async function moverEstoque(produtoId, tipo, quantidade, motivo) {
  return ok(await supabase.rpc("vt_mover_estoque", { p_produto: produtoId, p_tipo: tipo, p_qtd: quantidade, p_motivo: motivo || "" }));
}
export async function desfazerMovimento(id) {
  return ok(await supabase.rpc("vt_desfazer_movimento", { p_mov: id }));
}
export async function movimentosDoProduto(produtoId) {
  return ok(await supabase.from("movimentos").select("*").eq("produto_id", produtoId).order("criado", { ascending: false }).limit(60));
}
export async function ultimosMovimentos() {
  return ok(await supabase.from("movimentos").select("*").order("criado", { ascending: false }).limit(40));
}

// ---------- lixeira (produtos e categorias) ----------
export async function mandarParaLixeira(tabela, id) {
  ok(await supabase.from(tabela).update({ excluida: new Date().toISOString() }).eq("id", id));
}
export async function restaurar(tabela, id) {
  return ok(await supabase.from(tabela).update({ excluida: null }).eq("id", id).select().single());
}
export async function listarLixeira() {
  const [produtos, categorias] = await Promise.all([
    todas(() => supabase.from("produtos").select("*").not("excluida", "is", null).order("excluida", { ascending: false })),
    todas(() => supabase.from("categorias").select("*").not("excluida", "is", null).order("excluida", { ascending: false })),
  ]);
  return { produtos, categorias };
}
/* este apaga de verdade, e não tem volta: some o produto, o histórico e as fotos */
export async function apagarProdutoDeVez(p) {
  ok(await supabase.from("produtos").delete().eq("id", p.id));
  if (p.fotos && p.fotos.length) await removerArquivos(p.fotos);
}
export async function apagarCategoriaDeVez(c) {
  ok(await supabase.from("categorias").delete().eq("id", c.id));
  if (c.foto) await removerArquivos([c.foto]);
}

// ---------- categorias ----------
const CAMPOS_CATEGORIA = ["nome", "slug", "descricao", "foto", "campos", "ordem", "ativo"];
export async function salvarCategoria(c, antiga) {
  const dados = Object.fromEntries(CAMPOS_CATEGORIA.filter((k) => k in c).map((k) => [k, c[k]]));
  dados.atualizado = new Date().toISOString();
  const salvo = c.id
    ? ok(await supabase.from("categorias").update(dados).eq("id", c.id).select().single())
    : ok(await supabase.from("categorias").insert(dados).select().single());
  if (antiga && antiga.foto && antiga.foto !== c.foto) await removerArquivos([antiga.foto]);
  return salvo;
}
export async function reordenarCategorias(lista) {
  for (let i = 0; i < lista.length; i++) {
    ok(await supabase.from("categorias").update({ ordem: (i + 1) * 10 }).eq("id", lista[i].id));
  }
}

// ---------- ajustes (uma linha só, id = 1, com tudo num campo jsonb) ----------
export async function salvarConfig(dados, antigos) {
  ok(await supabase.from("configuracoes").upsert({ id: 1, dados, atualizado: new Date().toISOString() }));
  const antes = (antigos && antigos.fotos_abertura) || [];
  const depois = dados.fotos_abertura || [];
  const sairam = antes.filter((f) => !depois.includes(f));
  if (sairam.length) await removerArquivos(sairam);
}

// ---------- fotos ----------
const LADO_MAXIMO = 1600; // o cartão do catálogo mostra de 270 a 540 px
const QUALIDADE = 0.82;

async function lerImagem(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* tenta do outro jeito */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}
function melhorBlob(canvas, q) {
  return new Promise((res) => {
    canvas.toBlob((b) => {
      if (b && b.type === "image/webp") return res(b);
      canvas.toBlob((j) => res(j), "image/jpeg", q); // navegador sem WebP devolve PNG, que é enorme
    }, "image/webp", q);
  });
}

/* A foto encolhe sozinha antes de subir. Se qualquer coisa falhar, sobe o original. */
export async function encolherImagem(file, lado = LADO_MAXIMO, q = QUALIDADE) {
  try {
    if (!file || !file.type.startsWith("image/")) return file;
    if (file.type === "image/gif") return file;
    const img = await lerImagem(file);
    const escala = Math.min(1, lado / Math.max(img.width, img.height));
    if (escala === 1 && file.size <= 400 * 1024) return file;
    const nl = Math.round(img.width * escala), na = Math.round(img.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = nl; canvas.height = na;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, nl, na);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, nl, na);
    const blob = await melhorBlob(canvas, q);
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `foto.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

/* sobe a foto já encolhida, com nome automático (Date.now()-código.ext), dentro da pasta */
export async function enviarFoto(file, pasta = "produtos") {
  const f = await encolherImagem(file);
  const ext = (f.type === "image/webp" && "webp") || (f.type === "image/png" && "png") || "jpg";
  const cod = Math.random().toString(36).slice(2, 8);
  const caminho = `${pasta}/${Date.now()}-${cod}.${ext}`;
  ok(await supabase.storage.from(BUCKET).upload(caminho, f, { contentType: f.type || "image/jpeg", cacheControl: "31536000", upsert: false }));
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

export function caminhoDoArquivo(url) {
  const RAIZ = `/storage/v1/object/public/${BUCKET}/`;
  const i = String(url || "").indexOf(RAIZ);
  return i < 0 ? null : decodeURIComponent(url.slice(i + RAIZ.length).split("?")[0]);
}

/* apagar tem que apagar de verdade: tira o arquivo do servidor, não só o endereço do banco */
export async function removerArquivos(urls) {
  const caminhos = [].concat(urls).map(caminhoDoArquivo).filter(Boolean);
  if (!caminhos.length) return 0;
  const { error } = await supabase.storage.from(BUCKET).remove(caminhos);
  return error ? 0 : caminhos.length;
}

// ---------- espaço usado (só admin) ----------
export async function listarArquivos() {
  return ok(await supabase.rpc("vt_storage_list"));
}
/* tudo o que está em uso: fotos de produtos (inclusive os da lixeira, que podem voltar),
   fotos de categorias e fotos da abertura do catálogo */
export async function arquivosEmUso() {
  const [prod, cats, cfg] = await Promise.all([
    todas(() => supabase.from("produtos").select("fotos")),
    todas(() => supabase.from("categorias").select("foto")),
    supabase.from("configuracoes").select("dados").eq("id", 1).maybeSingle(),
  ]);
  const usados = new Set();
  prod.forEach((p) => (p.fotos || []).forEach((f) => usados.add(caminhoDoArquivo(f))));
  cats.forEach((c) => c.foto && usados.add(caminhoDoArquivo(c.foto)));
  ((cfg.data && cfg.data.dados && cfg.data.dados.fotos_abertura) || []).forEach((f) => usados.add(caminhoDoArquivo(f)));
  return usados;
}
export async function apagarCaminhos(caminhos) {
  if (!caminhos.length) return 0;
  const { error } = await supabase.storage.from(BUCKET).remove(caminhos);
  return error ? 0 : caminhos.length;
}

// ---------- acessos ao catálogo ----------
export async function getCatalogStats() {
  return ok(await supabase.rpc("vt_stats"));
}
export async function logCatalogVisit() {
  try {
    let id = localStorage.getItem("vt_visitante");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem("vt_visitante", id);
    }
    await supabase.rpc("vt_log_visit", { p_visitor: id });
  } catch { /* nunca atrapalha quem está vendo o catálogo */ }
}

// ---------- catálogo público ----------
export async function carregarCatalogo() {
  return ok(await supabase.rpc("vt_catalogo"));
}
