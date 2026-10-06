// TODAS as chamadas ao banco e ao Storage passam por aqui. As telas nunca falam direto com o Supabase.
//
// Dois "motores" com a mesma interface:
//   · Supabase (produção)           → quando SUPABASE_URL e SUPABASE_ANON_KEY estão preenchidos em config.js
//   · Demonstração (localStorage)   → quando estão vazios; serve para ver o design e testar o painel sem banco

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, DEMO } from "./config.js";
import { CONFIG_PADRAO, CATEGORIAS_PADRAO, DEMO_PRODUTOS, DEMO_BANNERS } from "./data.js";

export { DEMO };

const supabase = DEMO ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const agora = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export function mesclarConfig(dados) {
  const d = dados || {};
  return { ...CONFIG_PADRAO, ...d, horarios: { ...CONFIG_PADRAO.horarios, ...(d.horarios || {}) } };
}

/** Traduz erro do Supabase para uma frase que a dona da loja entende. */
export function msgErro(e) {
  const m = String((e && (e.message || e.error_description)) || e || "");
  if (/invalid login|invalid credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(m)) return "Este usuário ainda não foi confirmado no Supabase.";
  if (/row-level security|permission denied|not allowed/i.test(m)) return "Você não tem permissão para fazer isso.";
  if (/foreign key|violates foreign/i.test(m)) return "Ainda existem itens ligados a este cadastro. Mova ou apague eles primeiro.";
  if (/duplicate key|unique/i.test(m)) return "Já existe um cadastro com este nome ou código.";
  if (/failed to fetch|networkerror|load failed/i.test(m)) return "Sem conexão com a internet. Tente de novo.";
  if (/jwt|token/i.test(m)) return "Sua sessão expirou. Entre de novo.";
  return m || "Algo deu errado. Tente de novo.";
}

async function paginar(montar) {
  // Limite de 1.000 linhas por consulta no Supabase: busca em páginas.
  const tudo = [];
  const TAM = 1000;
  for (let de = 0; ; de += TAM) {
    const { data, error } = await montar().range(de, de + TAM - 1);
    if (error) throw error;
    tudo.push(...data);
    if (data.length < TAM) break;
  }
  return tudo;
}

const dentroDaVigencia = (b, hoje = new Date().toISOString().slice(0, 10)) =>
  (!b.inicio || b.inicio <= hoje) && (!b.fim || b.fim >= hoje);

/** Dia (AAAA-MM-DD) no horário de Brasília. O banco roda em UTC, e sem isso "hoje" vira o dia errado depois das 21h. */
const diaBrasilia = (d) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(typeof d === "string" ? new Date(d) : d);

/* ------------------------------------------------------------------ */
/* Imagens: encolher antes de subir, e apagar de verdade ao remover    */
/* ------------------------------------------------------------------ */

const LADO_MAXIMO = 1400; // o cartão da vitrine mostra 270 a 560 px; o detalhe, até ~760 px (2x = 1.400)
const QUALIDADE = 0.8;

async function lerImagem(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" }); // a foto não sai deitada
    } catch {
      /* cai no <img> */
    }
  }
  return await new Promise((ok, erro) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      ok(im);
    };
    im.onerror = erro;
    im.src = url;
  });
}

async function melhorBlob(canvas, q) {
  const webp = await new Promise((r) => canvas.toBlob(r, "image/webp", q));
  if (webp && webp.type === "image/webp") return webp; // navegador sem WebP devolve PNG (enorme): descarta
  return await new Promise((r) => canvas.toBlob(r, "image/jpeg", q));
}

export async function encolherImagem(file, lado = LADO_MAXIMO, q = QUALIDADE) {
  try {
    if (!file || !file.type || !file.type.startsWith("image/")) return file;
    if (file.type === "image/gif") return file; // pode ser animado
    const img = await lerImagem(file);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const escala = Math.min(1, lado / Math.max(iw, ih));
    if (escala === 1 && file.size <= 400 * 1024) return file;
    const nl = Math.round(iw * escala);
    const na = Math.round(ih * escala);
    const canvas = document.createElement("canvas");
    canvas.width = nl;
    canvas.height = na;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF"; // fundo para PNG transparente
    ctx.fillRect(0, 0, nl, na);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, nl, na);
    const blob = await melhorBlob(canvas, q);
    if (!blob || blob.size >= file.size) return file; // nunca piorar
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `foto.${ext}`, { type: blob.type });
  } catch {
    return file; // na dúvida, sobe o original em vez de quebrar o cadastro
  }
}

export function caminhoDoArquivo(url) {
  if (!url) return null;
  if (String(url).startsWith("demo://")) return String(url).slice(7);
  const RAIZ = `/storage/v1/object/public/${BUCKET}/`;
  const i = String(url).indexOf(RAIZ);
  return i < 0 ? null : decodeURIComponent(String(url).slice(i + RAIZ.length).split("?")[0]);
}

/** Endereço que o <img> deve usar. No modo demonstração, as fotos ficam guardadas no navegador. */
export function fotoSrc(url) {
  if (!url) return "";
  if (String(url).startsWith("demo://")) {
    const f = demoArquivos()[String(url).slice(7)];
    return f ? f.url : "";
  }
  return url;
}

/** Sobe uma foto (já encolhida) e devolve o endereço público. `pasta`: produtos | categorias | banners | site */
export async function enviarImagem(file, pasta = "produtos") {
  const f = await encolherImagem(file);
  const ext = f.type === "image/webp" ? "webp" : (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  // O nome é sempre gerado aqui: a limpeza de arquivos sem uso conta com isso.
  const nome = `${pasta}/${Date.now()}-${uid().slice(0, 8)}.${ext}`;
  if (DEMO) {
    const url = await new Promise((ok, erro) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = erro;
      r.readAsDataURL(f);
    });
    demoArquivos()[nome] = { url, size: f.size, criado: agora() };
    demoSalvarArquivos();
    return `demo://${nome}`;
  }
  const { error } = await supabase.storage.from(BUCKET).upload(nome, f, { contentType: f.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(msgErro(error));
  return supabase.storage.from(BUCKET).getPublicUrl(nome).data.publicUrl;
}

/** Apaga de verdade do Storage. Devolve quantos arquivos foram removidos. */
export async function removerArquivos(urls) {
  const caminhos = [...new Set([].concat(urls || []).map(caminhoDoArquivo).filter(Boolean))];
  if (!caminhos.length) return 0;
  if (DEMO) {
    const arq = demoArquivos();
    caminhos.forEach((c) => delete arq[c]);
    demoSalvarArquivos();
    return caminhos.length;
  }
  const { error } = await supabase.storage.from(BUCKET).remove(caminhos);
  return error ? 0 : caminhos.length;
}

/* ------------------------------------------------------------------ */
/* Motor de demonstração (localStorage)                                */
/* ------------------------------------------------------------------ */

const K_DB = "vt_demo_db_v1";
const K_ARQ = "vt_demo_arquivos_v1";
const K_USER = "vt_demo_user";
let _db = null;
let _arq = null;

function demoDb() {
  if (_db) return _db;
  try {
    const raw = localStorage.getItem(K_DB);
    if (raw) {
      _db = JSON.parse(raw);
      return _db;
    }
  } catch {
    /* sem storage */
  }
  _db = {
    config: {},
    categorias: CATEGORIAS_PADRAO.map((c, i) => ({ id: `demo-cat-${c.slug}`, ...c, foto: "", ordem: i, ativo: true, excluida: null })),
    produtos: DEMO_PRODUTOS.map((p) => ({ ...p })),
    banners: DEMO_BANNERS.map((b) => ({ ...b })),
    visitas: [],
  };
  return _db;
}
function demoSalvar() {
  try {
    localStorage.setItem(K_DB, JSON.stringify(_db));
  } catch {
    /* cheio ou bloqueado: segue só na memória */
  }
}
function demoArquivos() {
  if (_arq) return _arq;
  try {
    _arq = JSON.parse(localStorage.getItem(K_ARQ) || "{}");
  } catch {
    _arq = {};
  }
  return _arq;
}
function demoSalvarArquivos() {
  try {
    localStorage.setItem(K_ARQ, JSON.stringify(_arq));
  } catch {
    /* limite do navegador no modo demonstração */
  }
}
export function demoReiniciar() {
  try {
    localStorage.removeItem(K_DB);
    localStorage.removeItem(K_ARQ);
  } catch {
    /* ignora */
  }
  _db = null;
  _arq = null;
}

/* ------------------------------------------------------------------ */
/* Vitrine pública                                                     */
/* ------------------------------------------------------------------ */

const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);

export async function carregarVitrine() {
  if (DEMO) {
    const db = demoDb();
    return {
      config: mesclarConfig(db.config),
      categorias: db.categorias.filter((c) => c.ativo && !c.excluida).sort(porOrdem),
      produtos: db.produtos.filter((p) => p.ativo && !p.excluida),
      banners: db.banners.filter((b) => b.ativo && !b.excluida && dentroDaVigencia(b)).sort(porOrdem),
    };
  }
  const [cfg, categorias, produtos, banners] = await Promise.all([
    supabase.from("configuracoes").select("dados").eq("id", 1).maybeSingle(),
    paginar(() => supabase.from("categorias").select("*").eq("ativo", true).is("excluida", null).order("ordem").order("id")),
    paginar(() => supabase.from("produtos").select("*").eq("ativo", true).is("excluida", null).order("criado", { ascending: false }).order("id")),
    paginar(() => supabase.from("banners").select("*").eq("ativo", true).is("excluida", null).order("ordem").order("id")),
  ]);
  if (cfg.error) throw cfg.error;
  return {
    config: mesclarConfig(cfg.data && cfg.data.dados),
    categorias,
    produtos,
    banners: banners.filter((b) => dentroDaVigencia(b)),
  };
}

/** Conta um acesso. Nunca pode atrapalhar quem está olhando a vitrine: erro some em silêncio. */
export async function registrarVisita() {
  try {
    let v = localStorage.getItem("vt_visitante");
    if (!v) {
      v = uid();
      localStorage.setItem("vt_visitante", v);
    }
    if (DEMO) {
      const db = demoDb();
      const ult = db.visitas.length ? db.visitas[db.visitas.length - 1] : null;
      if (!ult || Date.now() - new Date(ult).getTime() > 30 * 60 * 1000) {
        db.visitas.push(agora());
        demoSalvar();
      }
      return;
    }
    await supabase.rpc("vt_log_visit", { p_visitor: v });
  } catch {
    /* silencioso */
  }
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export async function usuarioAtual() {
  if (DEMO) {
    try {
      const u = JSON.parse(localStorage.getItem(K_USER) || "null");
      return u;
    } catch {
      return null;
    }
  }
  const { data } = await supabase.auth.getSession();
  return data.session ? data.session.user : null;
}

export async function entrar(email, senha) {
  if (DEMO) {
    if (!email || !senha) throw new Error("Preencha o e-mail e a senha.");
    const u = { id: "demo-user", email };
    localStorage.setItem(K_USER, JSON.stringify(u));
    return u;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) throw new Error(msgErro(error));
  return data.user;
}

export async function sair() {
  if (DEMO) {
    localStorage.removeItem(K_USER);
    return;
  }
  await supabase.auth.signOut();
}

/** { role: "admin" | "func", nome } */
export async function perfilDe(user) {
  if (DEMO) return { role: "admin", nome: "Demonstração" };
  const { data } = await supabase.from("profiles").select("role,nome").eq("id", user.id).maybeSingle();
  return { role: data && data.role === "admin" ? "admin" : "func", nome: (data && data.nome) || "" };
}

export async function trocarSenha(nova) {
  if (DEMO) return;
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) throw new Error(msgErro(error));
}

/* ------------------------------------------------------------------ */
/* Painel: leitura                                                     */
/* ------------------------------------------------------------------ */

/** Tudo que o painel precisa, incluindo itens ocultos e a lixeira. */
export async function carregarPainel() {
  let config;
  let categorias;
  let produtos;
  let banners;
  if (DEMO) {
    const db = demoDb();
    config = mesclarConfig(db.config);
    categorias = db.categorias.map((c) => ({ ...c }));
    produtos = db.produtos.map((p) => ({ ...p }));
    banners = db.banners.map((b) => ({ ...b }));
  } else {
    const [cfg, c, p, b] = await Promise.all([
      supabase.from("configuracoes").select("dados").eq("id", 1).maybeSingle(),
      paginar(() => supabase.from("categorias").select("*").order("ordem").order("id")),
      paginar(() => supabase.from("produtos").select("*").order("criado", { ascending: false }).order("id")),
      paginar(() => supabase.from("banners").select("*").order("ordem").order("id")),
    ]);
    if (cfg.error) throw cfg.error;
    config = mesclarConfig(cfg.data && cfg.data.dados);
    categorias = c;
    produtos = p;
    banners = b;
  }
  const vivos = (l) => l.filter((x) => !x.excluida);
  const mortos = (l) => l.filter((x) => x.excluida);
  return {
    config,
    categorias: vivos(categorias).sort(porOrdem),
    produtos: vivos(produtos),
    banners: vivos(banners).sort(porOrdem),
    lixeira: { produtos: mortos(produtos), categorias: mortos(categorias), banners: mortos(banners) },
  };
}

/* ------------------------------------------------------------------ */
/* Painel: gravação                                                    */
/* ------------------------------------------------------------------ */

const COLUNAS = {
  produtos: ["categoria_id", "nome", "codigo", "marca", "genero", "descricao", "preco", "preco_antigo", "preco_a_partir", "fotos", "specs", "medidas", "destaque", "novo", "indisponivel", "ativo"],
  categorias: ["nome", "slug", "descricao", "foto", "campos", "usa_medidas", "usa_genero", "ordem", "ativo"],
  banners: ["titulo", "subtitulo", "botao", "destino_tipo", "destino_valor", "foto", "inicio", "fim", "ordem", "ativo"],
};

const urlsDe = (tabela, linha) => {
  if (!linha) return [];
  if (tabela === "produtos") return (linha.fotos || []).filter(Boolean);
  return linha.foto ? [linha.foto] : [];
};

const numeroOuNulo = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/**
 * Cria ou atualiza uma linha. `antiga` é a versão anterior: o que saiu das fotos é apagado do Storage.
 * Devolve a linha gravada.
 */
export async function salvar(tabela, linha, antiga) {
  const payload = {};
  COLUNAS[tabela].forEach((c) => {
    if (c in linha) payload[c] = linha[c];
  });
  if (tabela === "produtos") {
    payload.preco = numeroOuNulo(payload.preco);
    payload.preco_antigo = numeroOuNulo(payload.preco_antigo);
    payload.fotos = (payload.fotos || []).filter(Boolean);
  }
  if (tabela === "banners") {
    payload.inicio = payload.inicio || null;
    payload.fim = payload.fim || null;
  }
  let gravada;
  if (DEMO) {
    const db = demoDb();
    const lista = db[tabela];
    if (linha.id) {
      const i = lista.findIndex((x) => x.id === linha.id);
      if (i < 0) throw new Error("Cadastro não encontrado.");
      lista[i] = { ...lista[i], ...payload, atualizado: agora() };
      gravada = lista[i];
    } else {
      gravada = { id: uid(), criado: agora(), excluida: null, ...payload };
      lista.push(gravada);
    }
    demoSalvar();
    gravada = { ...gravada };
  } else if (linha.id) {
    const { data, error } = await supabase.from(tabela).update({ ...payload, atualizado: agora() }).eq("id", linha.id).select().single();
    if (error) throw new Error(msgErro(error));
    gravada = data;
  } else {
    const { data, error } = await supabase.from(tabela).insert(payload).select().single();
    if (error) throw new Error(msgErro(error));
    gravada = data;
  }
  const depois = urlsDe(tabela, gravada);
  const sobras = urlsDe(tabela, antiga).filter((u) => !depois.includes(u));
  if (sobras.length) await removerArquivos(sobras);
  return gravada;
}

/** "Excluir" manda para a lixeira. Nada some de verdade sem o botão Apagar de vez. */
export async function mandarParaLixeira(tabela, id) {
  if (DEMO) {
    const l = demoDb()[tabela];
    const x = l.find((r) => r.id === id);
    if (x) x.excluida = agora();
    demoSalvar();
    return;
  }
  const { error } = await supabase.from(tabela).update({ excluida: agora() }).eq("id", id);
  if (error) throw new Error(msgErro(error));
}

export async function restaurar(tabela, id) {
  if (DEMO) {
    const x = demoDb()[tabela].find((r) => r.id === id);
    if (x) x.excluida = null;
    demoSalvar();
    return;
  }
  const { error } = await supabase.from(tabela).update({ excluida: null }).eq("id", id);
  if (error) throw new Error(msgErro(error));
}

/** Apaga o cadastro e os arquivos dele. Só admin (a regra também está no banco). */
export async function apagarDeVez(tabela, linha) {
  if (DEMO) {
    const db = demoDb();
    if (tabela === "categorias" && db.produtos.some((p) => p.categoria_id === linha.id)) {
      throw new Error("Ainda existem produtos nesta categoria. Apague ou mova os produtos primeiro.");
    }
    db[tabela] = db[tabela].filter((r) => r.id !== linha.id);
    demoSalvar();
  } else {
    const { error } = await supabase.from(tabela).delete().eq("id", linha.id);
    if (error) throw new Error(msgErro(error));
  }
  await removerArquivos(urlsDe(tabela, linha));
}

export async function reordenar(tabela, ids) {
  if (DEMO) {
    const l = demoDb()[tabela];
    ids.forEach((id, i) => {
      const x = l.find((r) => r.id === id);
      if (x) x.ordem = i;
    });
    demoSalvar();
    return;
  }
  const rs = await Promise.all(ids.map((id, i) => supabase.from(tabela).update({ ordem: i }).eq("id", id)));
  const err = rs.find((r) => r.error);
  if (err) throw new Error(msgErro(err.error));
}

/** Grava a configuração da loja (só admin). Fotos que saíram são apagadas do Storage. */
export async function salvarConfig(nova, antiga) {
  const dados = { ...nova };
  if (DEMO) {
    demoDb().config = dados;
    demoSalvar();
  } else {
    const { error } = await supabase.from("configuracoes").upsert({ id: 1, dados, atualizado: agora() });
    if (error) throw new Error(msgErro(error));
  }
  const fotos = (c) => [...(c.fotos_abertura || []), c.foto_sobre].filter(Boolean);
  const dep = fotos(dados);
  const sobras = fotos(antiga || {}).filter((u) => !dep.includes(u));
  if (sobras.length) await removerArquivos(sobras);
  return mesclarConfig(dados);
}

/* ------------------------------------------------------------------ */
/* Acessos, armazenamento e limpeza (só admin)                         */
/* ------------------------------------------------------------------ */

/** { hoje, d7, d30, total, porDia: [{dia:"AAAA-MM-DD", n}] } — últimos 14 dias */
export async function estatisticasAcessos() {
  if (DEMO) {
    const v = demoDb().visitas;
    const dias = {};
    v.forEach((iso) => {
      const d = diaBrasilia(iso);
      dias[d] = (dias[d] || 0) + 1;
    });
    const hoje = diaBrasilia(new Date());
    const porDia = [];
    for (let i = 13; i >= 0; i--) {
      const d = diaBrasilia(new Date(Date.now() - i * 86400000));
      porDia.push({ dia: d, n: dias[d] || 0 });
    }
    const soma = (n) => porDia.slice(-n).reduce((s, x) => s + x.n, 0);
    return { hoje: dias[hoje] || 0, d7: soma(7), d30: v.filter((iso) => Date.now() - new Date(iso).getTime() < 30 * 86400000).length, total: v.length, porDia };
  }
  const { data, error } = await supabase.rpc("vt_stats");
  if (error) throw new Error(msgErro(error));
  return data;
}

/** [{ nome, tamanho, criado }] de todos os arquivos do bucket */
export async function listarArquivos() {
  if (DEMO) {
    const a = demoArquivos();
    return Object.keys(a).map((nome) => ({ nome, tamanho: a[nome].size, criado: a[nome].criado }));
  }
  const { data, error } = await supabase.rpc("vt_storage_list");
  if (error) throw new Error(msgErro(error));
  return (data || []).map((r) => ({ nome: r.nome, tamanho: Number(r.tamanho), criado: r.criado }));
}

export const LIMITE_ARMAZENAMENTO = 1024 * 1024 * 1024; // plano gratuito: 1 GB

export async function usoArmazenamento() {
  const arq = await listarArquivos();
  const pastas = {};
  let total = 0;
  arq.forEach((f) => {
    const p = f.nome.includes("/") ? f.nome.split("/")[0] : "raiz";
    pastas[p] = (pastas[p] || 0) + f.tamanho;
    total += f.tamanho;
  });
  return { total, pastas, arquivos: arq.length };
}

/**
 * Apaga do Storage tudo que não pertence a nenhum cadastro (inclusive os da lixeira) e foi enviado há mais de 1 hora.
 * A hora de folga impede apagar a foto de um cadastro que ainda está aberto na tela.
 */
export async function limparArquivosSemUso(urlsEmUso) {
  const usados = new Set([].concat(urlsEmUso || []).map(caminhoDoArquivo).filter(Boolean));
  const arq = await listarArquivos();
  const orfaos = arq.filter((f) => !usados.has(f.nome) && Date.now() - new Date(f.criado).getTime() > 3600 * 1000);
  const liberado = orfaos.reduce((s, f) => s + f.tamanho, 0);
  if (!orfaos.length) return { removidos: 0, liberado: 0 };
  if (DEMO) {
    const a = demoArquivos();
    orfaos.forEach((f) => delete a[f.nome]);
    demoSalvarArquivos();
    return { removidos: orfaos.length, liberado };
  }
  let removidos = 0;
  for (let i = 0; i < orfaos.length; i += 100) {
    const lote = orfaos.slice(i, i + 100).map((f) => f.nome);
    const { error } = await supabase.storage.from(BUCKET).remove(lote);
    if (!error) removidos += lote.length;
  }
  return { removidos, liberado };
}
