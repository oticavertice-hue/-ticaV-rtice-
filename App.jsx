import { useState, useEffect, useMemo, useRef } from "react";
import * as api from "./api.js";
import { mesclarConfig, dinheiro, normalizar, slugify } from "./padroes.js";
import {
  C, SERIF, CSS, ICONES, S, Modal, Botao, OURO, Campo, Interruptor, Chips, Selo, Carregando, Vazio, Credito, Miniatura,
  useTelaLarga, useAviso, fmtDataHora, parseValor, valorParaCampo,
} from "./ui.jsx";
import Ajustes from "./Ajustes.jsx";

/* =====================================================================
   APP DE GESTÃO — VÉRTICE DESIGN ÓPTICO
   Início · Estoque · Categorias · Ajustes
   ===================================================================== */

const MAX_FOTOS = 6;
const LOGO = "/logo.jpg";
const EMBLEMA = "/emblema.jpg";
const linkCatalogo = () => `${window.location.origin}/catalogo`;

const MOTIVOS = {
  entrada: ["Compra / reposição", "Devolução de cliente", "Ajuste de contagem"],
  saida: ["Venda", "Ajuste de contagem", "Defeito ou perda", "Emprestado / consignado"],
};

export default function App() {
  const [sessao, setSessao] = useState(undefined);
  useEffect(() => {
    api.getSession().then(setSessao).catch(() => setSessao(null));
    return api.onAuth(setSessao);
  }, []);
  return (
    <>
      <style>{CSS}</style>
      {sessao === undefined ? (
        <div className="tela" style={{ background: C.carvao, display: "grid", placeItems: "center" }}>
          <div className="vt-roda" style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(255,255,255,.15)", borderTopColor: C.ouro }} />
        </div>
      ) : sessao ? <Painel sessao={sessao} /> : <Login />}
    </>
  );
}

/* ---------------------------------------------------------------------
   Login
   --------------------------------------------------------------------- */
function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);
  const entrar = async (e) => {
    e.preventDefault();
    setErro(""); setIndo(true);
    try { await api.login(email, senha); }
    catch (err) { setErro(/invalid/i.test(err?.message || "") ? "E-mail ou senha incorretos." : "Não foi possível entrar. Confira a internet e tente de novo."); }
    finally { setIndo(false); }
  };
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center",
      background: `radial-gradient(120% 70% at 50% 0%, ${C.ardosia2} 0%, ${C.carvao} 65%)`,
      padding: "calc(28px + env(safe-area-inset-top,0px)) 16px calc(8px + env(safe-area-inset-bottom,0px))" }}>
      <div style={{ flex: 1, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <img src={LOGO} alt="Vértice Design Óptico" width="1000" height="768"
          style={{ display: "block", width: "100%", height: "auto", borderRadius: 18, marginBottom: 22,
            boxShadow: "0 30px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(201,163,91,.3)" }} />
        <form onSubmit={entrar} style={{ background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,.35)" }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, marginBottom: 16, letterSpacing: 0.5 }}>Entrar no app</div>
          <label style={S.rotulo}>E-mail</label>
          <input className="vt-campo" type="email" autoComplete="username" inputMode="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
          <label style={{ ...S.rotulo, marginTop: 14 }}>Senha</label>
          <input className="vt-campo" type="password" autoComplete="current-password" value={senha}
            onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" required />
          {erro && <div style={{ color: C.vermelho, fontSize: 14, fontWeight: 600, marginTop: 12 }}>{erro}</div>}
          <Botao type="submit" cheio disabled={indo} {...OURO} style={{ marginTop: 18 }}>{indo ? "Entrando…" : "Entrar"}</Botao>
          <div style={{ fontSize: 12.5, color: C.suave, textAlign: "center", marginTop: 14 }}>Esqueceu a senha? Fale com o administrador.</div>
        </form>
        <a href="/catalogo" style={{ color: C.ouroClaro, textAlign: "center", marginTop: 18, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Ver o catálogo da loja →
        </a>
      </div>
      <Credito claro />
    </div>
  );
}

/* ---------------------------------------------------------------------
   Painel (depois do login)
   --------------------------------------------------------------------- */
const ABAS = [
  { id: "inicio", l: "Início", i: ICONES.inicio },
  { id: "estoque", l: "Estoque", i: ICONES.estoque },
  { id: "categorias", l: "Categorias", i: ICONES.categorias, admin: true },
  { id: "ajustes", l: "Ajustes", i: ICONES.ajustes },
];

function Painel({ sessao }) {
  const telaLarga = useTelaLarga();
  const [avisar, avisoEl] = useAviso();
  const [perfil, setPerfil] = useState(undefined);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("inicio");
  const [fichaId, setFichaId] = useState(null);
  const [form, setForm] = useState(null); // { produto } ou { novo: true, categoria_id }

  const carregar = async () => {
    setErro("");
    try {
      const [p, d] = await Promise.all([api.meuPerfil(sessao.user.id), api.carregarPainel()]);
      setPerfil(p); setDados(d);
    } catch (e) { setErro(api.msgErro(e)); if (perfil === undefined) setPerfil(null); }
  };
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  const admin = perfil && perfil.role === "admin";
  const abas = ABAS.filter((a) => !a.admin || admin);
  const cfg = useMemo(() => mesclarConfig(dados && dados.config), [dados]);
  const irPara = (id) => { setAba(id); window.scrollTo(0, 0); };

  const patch = (fn) => setDados((d) => (d ? fn(d) : d));
  const acoes = {
    avisar,
    abrirProduto: (id) => setFichaId(id),
    novoProduto: (categoria_id) => setForm({ novo: true, categoria_id: categoria_id || "" }),
    editarProduto: (p) => setForm({ produto: p }),
    async produtoSalvo(p) {
      patch((d) => ({ ...d, produtos: d.produtos.some((x) => x.id === p.id) ? d.produtos.map((x) => (x.id === p.id ? p : x)) : [p, ...d.produtos] }));
      try { const m = await api.ultimosMovimentos(); patch((d) => ({ ...d, movimentos: m })); } catch { /* nada */ }
    },
    async mover(p, tipo, qtd, motivo) {
      const novo = await api.moverEstoque(p.id, tipo, qtd, motivo);
      patch((d) => ({ ...d, produtos: d.produtos.map((x) => (x.id === p.id ? { ...x, estoque: novo } : x)) }));
      try { const m = await api.ultimosMovimentos(); patch((d) => ({ ...d, movimentos: m })); } catch { /* nada */ }
      return novo;
    },
    async desfazer(mov) {
      const novo = await api.desfazerMovimento(mov.id);
      patch((d) => ({ ...d, produtos: d.produtos.map((x) => (x.id === mov.produto_id ? { ...x, estoque: novo } : x)) }));
      try { const m = await api.ultimosMovimentos(); patch((d) => ({ ...d, movimentos: m })); } catch { /* nada */ }
      return novo;
    },
    async alternarAtivo(p) {
      const salvo = await api.salvarProduto({ id: p.id, ativo: !p.ativo }, null);
      patch((d) => ({ ...d, produtos: d.produtos.map((x) => (x.id === p.id ? salvo : x)) }));
      avisar(salvo.ativo ? "Voltou a aparecer no catálogo" : "Escondido do catálogo");
    },
    async excluirProduto(p) {
      await api.mandarParaLixeira("produtos", p.id);
      patch((d) => ({ ...d, produtos: d.produtos.filter((x) => x.id !== p.id) }));
      avisar("Produto foi para a lixeira (Ajustes → Lixeira)");
    },
    async salvarCategoria(c, antiga) {
      const salvo = await api.salvarCategoria(c, antiga);
      patch((d) => ({ ...d, categorias: d.categorias.some((x) => x.id === salvo.id) ? d.categorias.map((x) => (x.id === salvo.id ? salvo : x)) : [...d.categorias, salvo] }));
      return salvo;
    },
    async excluirCategoria(c) {
      await api.mandarParaLixeira("categorias", c.id);
      patch((d) => ({ ...d, categorias: d.categorias.filter((x) => x.id !== c.id) }));
      avisar("Categoria foi para a lixeira");
    },
    async reordenar(lista) {
      patch((d) => ({ ...d, categorias: lista.map((x, i) => ({ ...x, ordem: (i + 1) * 10 })) }));
      await api.reordenarCategorias(lista);
    },
    async salvarConfig(parcial) {
      const antigos = (dados && dados.config) || {};
      const novos = { ...antigos, ...parcial };
      await api.salvarConfig(novos, antigos);
      patch((d) => ({ ...d, config: novos }));
    },
    restaurado: carregar,
  };

  if (perfil === null && !erro) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: C.carvao, color: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Acesso ainda não liberado</div>
          <div style={{ opacity: 0.8, fontSize: 15, marginBottom: 22 }}>Esta conta ({sessao.user?.email}) entrou, mas ainda não tem permissão.</div>
          <Botao {...OURO} onClick={() => api.logout()}>Sair</Botao>
        </div>
      </div>
    );
  }

  const conteudo = erro ? (
    <div style={{ ...S.card, padding: 22, textAlign: "center" }}>
      <div style={{ fontWeight: 700, marginBottom: 14 }}>{erro}</div>
      <Botao onClick={carregar}>Tentar de novo</Botao>
    </div>
  ) : !dados || perfil === undefined ? (
    <Carregando />
  ) : aba === "inicio" ? (
    <Inicio dados={dados} cfg={cfg} perfil={perfil} admin={admin} acoes={acoes} irPara={irPara} />
  ) : aba === "estoque" ? (
    <Estoque dados={dados} cfg={cfg} acoes={acoes} />
  ) : aba === "categorias" ? (
    <Categorias dados={dados} acoes={acoes} />
  ) : (
    <Ajustes cfg={cfg} bruto={dados.config} admin={admin} perfil={perfil} sessao={sessao} acoes={acoes} />
  );

  const ficha = fichaId && dados ? dados.produtos.find((p) => p.id === fichaId) : null;
  const janelas = dados && (
    <>
      <FichaProduto p={ficha} dados={dados} cfg={cfg} admin={admin} acoes={acoes} aoFechar={() => setFichaId(null)} />
      <FormProduto aberto={!!form} inicial={form} dados={dados} acoes={acoes} aoFechar={() => setForm(null)} />
    </>
  );
  const primeiroNome = String((perfil && (perfil.nome || perfil.email)) || "").split(/[\s@]/)[0];

  if (telaLarga) {
    return (
      <div style={{ display: "flex", minHeight: "100dvh" }}>
        <aside style={{ position: "sticky", top: 0, height: "100dvh", width: 260, flex: "0 0 260px", display: "flex",
          flexDirection: "column", background: `linear-gradient(180deg, ${C.carvao}, ${C.ardosia2})`, color: "#fff" }}>
          <div style={{ padding: "22px 18px 16px" }}>
            <img src={LOGO} alt="Vértice Design Óptico" style={{ display: "block", width: "100%", borderRadius: 14, boxShadow: "0 0 0 1px rgba(201,163,91,.3)" }} />
            <div style={{ fontSize: 12.5, opacity: 0.65, marginTop: 14 }}>Olá,</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{primeiroNome}</div>
            <div style={{ fontSize: 12, color: C.ouroClaro, fontWeight: 600 }}>{admin ? "Administradora" : "Equipe"}</div>
          </div>
          <nav style={{ padding: "6px 12px", display: "grid", gap: 4 }}>
            {abas.map((a) => (
              <button key={a.id} onClick={() => irPara(a.id)} className="vt-toque"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "none",
                  fontSize: 15, fontWeight: 700, textAlign: "left",
                  background: aba === a.id ? "rgba(201,163,91,.18)" : "transparent", color: aba === a.id ? C.ouroClaro : "rgba(255,255,255,.8)" }}>
                {a.i}{a.l}
              </button>
            ))}
            <a href="/catalogo" target="_blank" rel="noopener noreferrer" className="vt-toque"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                color: "rgba(255,255,255,.8)", textDecoration: "none" }}>{ICONES.catalogo}Ver o catálogo</a>
          </nav>
          <div style={{ marginTop: "auto" }}><Credito claro /></div>
        </aside>
        <main style={{ flex: 1, minWidth: 0, padding: "28px 32px 40px" }}>
          <div key={aba} className="vt-aba" style={{ maxWidth: 1000, margin: "0 auto" }}>{conteudo}</div>
        </main>
        {janelas}
        {avisoEl}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 12, color: "#fff",
        background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, borderBottom: "1px solid rgba(201,163,91,.35)",
        padding: "calc(10px + env(safe-area-inset-top,0px)) 16px 12px" }}>
        <img src={EMBLEMA} alt="" width="44" height="44" style={{ borderRadius: "50%", flex: "0 0 44px", border: "1px solid rgba(201,163,91,.5)" }} />
        <div style={{ minWidth: 0, lineHeight: 1.2, flex: 1 }}>
          <div style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: 2, color: C.ouroClaro }}>VÉRTICE</div>
          <div style={{ fontSize: 12.5, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Olá, {primeiroNome}</div>
        </div>
        <a href="/catalogo" target="_blank" rel="noopener noreferrer" aria-label="Ver o catálogo"
          style={{ ...S.btnIcone, color: C.ouroClaro, border: "1px solid rgba(201,163,91,.4)" }}>{ICONES.catalogo}</a>
      </header>

      <main style={{ padding: "16px 16px calc(96px + env(safe-area-inset-bottom,0px))" }}>
        <div key={aba} className="vt-aba">{conteudo}</div>
      </main>

      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, display: "flex", background: "#fff",
        borderTop: `1px solid ${C.borda}`, padding: "6px 6px calc(6px + env(safe-area-inset-bottom,0px))", boxShadow: "0 -4px 16px rgba(0,0,0,.05)" }}>
        {abas.map((a) => (
          <button key={a.id} onClick={() => irPara(a.id)}
            style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "7px 1px", border: "none", background: "transparent", borderRadius: 12, fontWeight: 700,
              fontSize: "clamp(9px, 2.6vw, 11px)", color: aba === a.id ? C.texto : "#A39C90" }}>
            <span style={{ display: "grid", placeItems: "center", width: 40, height: 26, borderRadius: 999,
              background: aba === a.id ? "rgba(201,163,91,.25)" : "transparent", color: aba === a.id ? C.ouroEsc : "inherit" }}>{a.i}</span>
            <span style={{ maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.l}</span>
          </button>
        ))}
      </nav>
      {janelas}
      {avisoEl}
    </div>
  );
}

/* ---------------------------------------------------------------------
   Início
   --------------------------------------------------------------------- */
function Numero({ rotulo, valor, sub, destaque, aoTocar }) {
  return (
    <button type="button" onClick={aoTocar} disabled={!aoTocar} className="vt-toque"
      style={{ ...S.card, textAlign: "left", padding: "14px 15px", border: `1px solid ${destaque ? C.carvao : C.borda}`,
        background: destaque ? `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})` : "#fff", color: destaque ? "#fff" : C.texto, cursor: aoTocar ? "pointer" : "default" }}>
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, color: destaque ? C.ouro : C.suave }}>{rotulo}</div>
      <div style={{ fontSize: "clamp(22px, 6.4vw, 30px)", fontWeight: 800, margin: "4px 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{valor}</div>
      {sub && <div style={{ fontSize: 12, color: destaque ? "rgba(255,255,255,.65)" : C.suave }}>{sub}</div>}
    </button>
  );
}

function Inicio({ dados, cfg, perfil, admin, acoes, irPara }) {
  const { produtos, movimentos } = dados;
  const nome = (id) => (produtos.find((p) => p.id === id) || {}).nome || "Produto excluído";
  const pecas = produtos.reduce((s, p) => s + (p.estoque || 0), 0);
  const zerados = produtos.filter((p) => (p.estoque || 0) === 0);
  const baixos = produtos.filter((p) => p.ativo && p.estoque > 0 && p.estoque <= Number(cfg.estoque_baixo || 0)).sort((a, b) => a.estoque - b.estoque);
  const [copiado, setCopiado] = useState(false);
  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(linkCatalogo()); setCopiado(true); setTimeout(() => setCopiado(false), 2200); }
    catch { acoes.avisar(linkCatalogo()); }
  };
  const msgDivulgar = `Conheça a coleção da ${cfg.nome}! Escolha suas armações e fale com a gente: ${linkCatalogo()}`;

  return (
    <div>
      <div style={{ padding: "6px 2px 4px" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: C.ouroEsc, textTransform: "uppercase", fontWeight: 700 }}>Bem-vinda</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, margin: "6px 0 0", letterSpacing: 0.5 }}>{perfil.nome || "Vértice Design Óptico"}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 16 }}>
        <Numero rotulo="Modelos" valor={produtos.length} sub={`${produtos.filter((p) => p.ativo).length} no catálogo`} destaque aoTocar={() => irPara("estoque")} />
        <Numero rotulo="Peças em estoque" valor={pecas} sub="somando tudo" aoTocar={() => irPara("estoque")} />
        <Numero rotulo="Esgotados" valor={zerados.length} sub={zerados.length ? "não aparecem no catálogo" : "tudo com estoque"} aoTocar={() => irPara("estoque")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginTop: 12 }}>
        <Botao {...OURO} icone={ICONES.mais} onClick={() => acoes.novoProduto()}>Novo produto</Botao>
        <a href={`https://wa.me/?text=${encodeURIComponent(msgDivulgar)}`} target="_blank" rel="noopener noreferrer" className="vt-toque"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderRadius: 12, background: C.whats,
            color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>{ICONES.whats}Divulgar o catálogo</a>
        <Botao contorno cor={C.texto} icone={copiado ? ICONES.check : ICONES.link} onClick={copiarLink}>{copiado ? "Link copiado" : "Copiar link do catálogo"}</Botao>
      </div>

      {(baixos.length > 0 || zerados.length > 0) && (
        <>
          <div style={S.titSecao}>Atenção no estoque</div>
          <div style={{ ...S.card, overflow: "hidden" }}>
            {[...zerados.slice(0, 6), ...baixos.slice(0, 6)].map((p, k) => (
              <button key={p.id} onClick={() => acoes.abrirProduto(p.id)} className="vt-toque"
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: 12, border: "none", background: "#fff",
                  borderTop: k ? `1px solid ${C.borda}` : "none", minWidth: 0 }}>
                <Miniatura src={(p.fotos || [])[0]} tam={42} />
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</span>
                {p.estoque === 0 ? <Selo tipo="erro">esgotado</Selo> : <Selo tipo="aviso">resta{p.estoque > 1 ? "m" : ""} {p.estoque}</Selo>}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={S.titSecao}>Últimas entradas e saídas</div>
      {movimentos.length === 0 ? <Vazio texto="Nada por aqui ainda. Cadastre o primeiro produto." /> : (
        <div style={{ ...S.card, overflow: "hidden" }}>
          {movimentos.slice(0, 10).map((m, k) => <LinhaMovimento key={m.id} m={m} nome={nome(m.produto_id)} primeira={!k} />)}
        </div>
      )}

      {admin && <AcessosCatalogo />}
    </div>
  );
}

function LinhaMovimento({ m, nome, primeira, desfazer }) {
  const entrada = m.tipo === "entrada";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderTop: primeira ? "none" : `1px solid ${C.borda}`, minWidth: 0,
      opacity: m.estornado ? 0.55 : 1 }}>
      <span style={{ flex: "0 0 30px", height: 30, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800,
        background: entrada ? C.verdeFundo : C.ouroSuave, color: entrada ? C.verde : C.ouroEsc }}>{entrada ? "↓" : "↑"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {nome && <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>}
        <div style={{ fontSize: 12, color: C.suave, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {m.motivo || (entrada ? "Entrada" : "Saída")}{m.estornado ? " · desfeito" : ""}{m.usuario_nome ? ` · ${m.usuario_nome.split(/[\s@]/)[0]}` : ""} · {fmtDataHora(m.criado)}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: entrada ? C.verde : C.ouroEsc, whiteSpace: "nowrap" }}>{entrada ? "+" : "−"}{m.quantidade}</div>
      {desfazer && !m.estornado && !m.estorno_de && (
        <button onClick={() => desfazer(m)} aria-label="Desfazer" title="Desfazer" style={{ ...S.btnIcone, width: 36, height: 36, flex: "0 0 36px", color: C.suave }}>{ICONES.desfazer}</button>
      )}
    </div>
  );
}

function AcessosCatalogo() {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState(false);
  const larga = useTelaLarga();
  useEffect(() => { api.getCatalogStats().then(setD).catch(() => setErro(true)); }, []);
  if (erro) return null;
  const dias = (d && d.porDia) || [];
  /* 7 colunas no celular, 14 no computador: 14 datas não cabem em 360 px */
  const serie = dias.slice(larga || window.innerWidth >= 640 ? -14 : -7);
  const maior = Math.max(1, ...serie.map((x) => x.n));
  return (
    <>
      <div style={S.titSecao}>Acessos ao catálogo</div>
      {!d ? <Carregando texto="Contando…" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
            <Numero rotulo="Hoje" valor={d.hoje} />
            <Numero rotulo="7 dias" valor={d.d7} />
            <Numero rotulo="30 dias" valor={d.d30} />
            <Numero rotulo="Desde o começo" valor={d.total} destaque />
          </div>
          {serie.length > 1 && (
            <div style={{ ...S.card, padding: 16, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 120 }}>
                {serie.map((x) => (
                  <div key={x.dia} style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                    <div style={{ fontSize: 10, color: C.suave, fontWeight: 700, marginBottom: 4 }}>{x.n || ""}</div>
                    <div style={{ width: "100%", borderRadius: "6px 6px 0 0", minHeight: x.n ? 4 : 2, height: `${(x.n / maior) * 100}%`,
                      background: x.n ? `linear-gradient(180deg, ${C.ouro}, ${C.ardosia})` : C.borda }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {serie.map((x) => (
                  <div key={x.dia} style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden", textAlign: "center", fontSize: 10, color: C.suave, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {x.dia.slice(8, 10)}/{x.dia.slice(5, 7)}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ ...S.card, padding: 14, marginTop: 10, fontSize: 12.5, color: C.suave, lineHeight: 1.55 }}>
            Guarda só um código sorteado que fica no navegador de quem visita, para saber se é a mesma pessoa voltando.
            Sem nome, telefone, endereço de internet nem localização. A mesma pessoa só conta de novo depois de 30 minutos.
          </div>
        </>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------
   Estoque (a lista de produtos)
   --------------------------------------------------------------------- */
function Estoque({ dados, cfg, acoes }) {
  const { produtos, categorias } = dados;
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const catNome = (id) => (categorias.find((c) => c.id === id) || {}).nome || "sem categoria";
  const baixo = Number(cfg.estoque_baixo || 0);

  const lista = useMemo(() => {
    const b = normalizar(busca);
    return produtos.filter((p) => {
      if (filtro === "esgotados" && p.estoque > 0) return false;
      if (filtro === "baixo" && !(p.estoque > 0 && p.estoque <= baixo)) return false;
      if (filtro === "ocultos" && p.ativo) return false;
      if (!["todos", "esgotados", "baixo", "ocultos"].includes(filtro) && p.categoria_id !== filtro) return false;
      if (!b) return true;
      return normalizar(`${p.nome} ${p.codigo} ${p.marca}`).includes(b);
    });
  }, [produtos, busca, filtro, baixo]);

  const chips = [
    { id: "todos", l: "Todos" },
    ...categorias.map((c) => ({ id: c.id, l: c.nome })),
    { id: "esgotados", l: "Esgotados" },
    { id: "baixo", l: "Estoque baixo" },
    { id: "ocultos", l: "Escondidos" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "4px 2px 14px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, margin: 0 }}>Estoque</h1>
          <div style={{ fontSize: 13, color: C.suave, marginTop: 3 }}>{lista.length} de {produtos.length} modelos</div>
        </div>
        <Botao {...OURO} icone={ICONES.mais} onClick={() => acoes.novoProduto(categorias.some((c) => c.id === filtro) ? filtro : "")}>Novo</Botao>
      </div>

      <label style={{ position: "relative", display: "block", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.suave, display: "flex" }}>{ICONES.busca}</span>
        <input className="vt-campo" style={{ paddingLeft: 44 }} placeholder="Buscar por nome, marca ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </label>
      <div className="vt-chips" style={{ marginBottom: 12 }}>
        {chips.map((c) => {
          const on = filtro === c.id;
          return (
            <button key={c.id} onClick={() => setFiltro(c.id)} className="vt-toque" style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${on ? C.ardosia : C.borda}`, background: on ? C.ardosia : "#fff", color: on ? C.ouroClaro : C.texto }}>{c.l}</button>
          );
        })}
      </div>

      {produtos.length === 0 ? (
        <div style={{ ...S.card, padding: "34px 18px", textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhum produto ainda</div>
          <div style={{ color: C.suave, fontSize: 14, marginBottom: 16 }}>Cadastre a primeira armação: tire a foto, dê um nome, o preço e a quantidade.</div>
          <Botao {...OURO} icone={ICONES.mais} onClick={() => acoes.novoProduto()}>Cadastrar produto</Botao>
        </div>
      ) : lista.length === 0 ? <Vazio texto="Nenhum produto encontrado." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,420px),1fr))", gap: 10 }}>
          {lista.map((p) => (
            <button key={p.id} onClick={() => acoes.abrirProduto(p.id)} className="vt-toque"
              style={{ ...S.card, display: "flex", gap: 12, alignItems: "center", padding: 12, textAlign: "left", width: "100%" }}>
              <Miniatura src={(p.fotos || [])[0]} tam={58} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: C.suave, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {catNome(p.categoria_id)}{p.marca ? ` · ${p.marca}` : ""}{p.codigo ? ` · ${p.codigo}` : ""}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.ouroEsc }}>{Number(p.preco) > 0 ? dinheiro(p.preco) : "sem preço"}</span>
                  {!p.ativo && <Selo tipo="neutro">escondido</Selo>}
                </div>
              </div>
              <div style={{ textAlign: "center", flex: "0 0 auto" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: p.estoque === 0 ? C.vermelho : p.estoque <= baixo ? C.ambar : C.texto }}>{p.estoque}</div>
                <div style={{ fontSize: 10.5, color: C.suave, fontWeight: 700, textTransform: "uppercase" }}>{p.estoque === 1 ? "peça" : "peças"}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   Ficha do produto: estoque, entrada/saída, histórico
   --------------------------------------------------------------------- */
function FichaProduto({ p, dados, cfg, admin, acoes, aoFechar }) {
  const [mov, setMov] = useState(null);
  const [hist, setHist] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const id = p && p.id;
  const carregarHist = () => { if (id) api.movimentosDoProduto(id).then(setHist).catch(() => setHist([])); };
  useEffect(() => { setHist(null); setMov(null); carregarHist(); }, [id]); // eslint-disable-line
  if (!p) return null;

  const cat = dados.categorias.find((c) => c.id === p.categoria_id);
  const campos = (cat && cat.campos) || [];
  const specs = campos.map((f) => {
    const v = (p.specs || {})[f.chave];
    return { r: f.rotulo, v: f.tipo === "simnao" ? (v === true ? "Sim" : v === false ? "Não" : "") : String(v || "") };
  }).filter((x) => x.v);
  const baixo = Number(cfg.estoque_baixo || 0);

  const desfazer = async (m) => {
    if (!window.confirm(`Desfazer esta ${m.tipo === "entrada" ? "entrada" : "saída"} de ${m.quantidade}?`)) return;
    try { await acoes.desfazer(m); carregarHist(); acoes.avisar("Desfeito"); } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
  };
  const excluir = async () => {
    if (!window.confirm(`Mandar "${p.nome}" para a lixeira?\n\nEle sai do catálogo e da lista. Dá para restaurar em Ajustes → Lixeira.`)) return;
    try { await acoes.excluirProduto(p); aoFechar(); } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
  };
  const alternar = async () => {
    setOcupado(true);
    try { await acoes.alternarAtivo(p); } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setOcupado(false);
  };

  return (
    <Modal aberto={!!p} aoFechar={aoFechar} titulo={p.nome} sub={cat ? cat.nome : ""} largo
      rodape={
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Botao cor={C.verde} texto="#fff" icone={ICONES.mais} onClick={() => setMov("entrada")}>Entrada</Botao>
          <Botao {...OURO} icone={ICONES.menos} onClick={() => setMov("saida")} disabled={p.estoque <= 0}>Saída</Botao>
        </div>
      }>
      {(p.fotos || []).length > 0 && (
        <div className="vt-chips" style={{ marginBottom: 14 }}>
          {p.fotos.map((f, i) => (
            <img key={f} src={f} alt={`Foto ${i + 1}`} style={{ width: 150, height: 150, flex: "0 0 150px", objectFit: "cover", borderRadius: 14, border: `1px solid ${C.borda}` }} />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 14 }}>
        <div style={{ ...S.card, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: C.suave, fontWeight: 700 }}>Em estoque</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: p.estoque === 0 ? C.vermelho : p.estoque <= baixo ? C.ambar : C.texto }}>{p.estoque}</div>
        </div>
        <div style={{ ...S.card, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: C.suave, fontWeight: 700 }}>Preço</div>
          <div style={{ fontSize: "clamp(18px,5vw,24px)", fontWeight: 800, color: C.ouroEsc, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {Number(p.preco) > 0 ? dinheiro(p.preco) : "—"}
          </div>
          {Number(p.preco_antigo) > Number(p.preco) && <div style={{ fontSize: 12, color: C.suave }}>de <s>{dinheiro(p.preco_antigo)}</s></div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
        {p.codigo && <Selo tipo="neutro">{p.codigo}</Selo>}
        {p.marca && <Selo tipo="ouro">{p.marca}</Selo>}
        {p.novo && <Selo tipo="ouro">Novidade</Selo>}
        {p.destaque && <Selo tipo="ouro">Destaque</Selo>}
        {p.ativo ? <Selo tipo="ok">no catálogo</Selo> : <Selo tipo="neutro">escondido do catálogo</Selo>}
        {p.estoque === 0 && <Selo tipo="erro">esgotado</Selo>}
      </div>

      {specs.length > 0 && (
        <div style={{ ...S.card, overflow: "hidden", marginBottom: 12 }}>
          {specs.map((s, k) => (
            <div key={s.r} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", fontSize: 14, borderTop: k ? `1px solid ${C.borda}` : "none" }}>
              <span style={{ color: C.suave }}>{s.r}</span><b style={{ fontWeight: 600, textAlign: "right" }}>{s.v}</b>
            </div>
          ))}
        </div>
      )}
      {p.descricao && <div style={{ fontSize: 14, color: C.texto, lineHeight: 1.6, marginBottom: 12, whiteSpace: "pre-line" }}>{p.descricao}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Botao pequeno contorno cor={C.texto} icone={ICONES.editar} onClick={() => { aoFechar(); setTimeout(() => acoes.editarProduto(p), 220); }}>Editar</Botao>
        <Botao pequeno contorno cor={C.texto} icone={p.ativo ? ICONES.olhoFechado : ICONES.olho} onClick={alternar} disabled={ocupado}>
          {p.ativo ? "Esconder do catálogo" : "Mostrar no catálogo"}
        </Botao>
        <a href={`/catalogo?p=${p.id}`} target="_blank" rel="noopener noreferrer" className="vt-toque"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", minHeight: 40, borderRadius: 12, border: `1.5px solid ${C.texto}`,
            fontWeight: 700, fontSize: 13.5, textDecoration: "none", color: C.texto }}>{ICONES.catalogo}Ver no catálogo</a>
        {admin && <Botao pequeno contorno cor={C.vermelho} icone={ICONES.lixo} onClick={excluir}>Excluir</Botao>}
      </div>

      <div style={S.titSecao}>Histórico de entradas e saídas</div>
      {hist === null ? <Carregando /> : hist.length === 0 ? <Vazio texto="Nenhum movimento ainda." /> : (
        <div style={{ ...S.card, overflow: "hidden" }}>
          {hist.map((m, k) => <LinhaMovimento key={m.id} m={m} primeira={!k} desfazer={desfazer} />)}
        </div>
      )}
      <div style={S.dica}>Lançou errado? Toque na seta ao lado do movimento para desfazer.</div>

      <Movimento tipo={mov} p={p} aoFechar={() => setMov(null)} acoes={acoes} aoFeito={carregarHist} />
    </Modal>
  );
}

function Movimento({ tipo, p, aoFechar, acoes, aoFeito }) {
  const [t, setT] = useState(tipo || "entrada");
  const [qtd, setQtd] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [indo, setIndo] = useState(false);
  useEffect(() => { if (tipo) { setT(tipo); setQtd(1); setMotivo(MOTIVOS[tipo][0]); } }, [tipo]);
  const n = parseInt(qtd, 10) || 0;
  const passa = t === "saida" && n > p.estoque;

  const confirmar = async () => {
    if (n <= 0) return;
    setIndo(true);
    try {
      await acoes.mover(p, t, n, motivo);
      acoes.avisar(t === "entrada" ? `Entrada de ${n} registrada` : `Saída de ${n} registrada`);
      aoFeito && aoFeito();
      aoFechar();
    } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setIndo(false);
  };

  return (
    <Modal aberto={!!tipo} aoFechar={aoFechar} titulo={t === "entrada" ? "Entrada no estoque" : "Saída do estoque"} sub={p.nome}
      rodape={<Botao cheio {...(t === "entrada" ? { cor: C.verde, texto: "#fff" } : OURO)} onClick={confirmar} disabled={indo || n <= 0 || passa}>
        {indo ? "Salvando…" : `Confirmar ${t === "entrada" ? "entrada" : "saída"} de ${n || 0}`}</Botao>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {[["entrada", "↓ Entrada"], ["saida", "↑ Saída"]].map(([v, l]) => (
          <button key={v} onClick={() => { setT(v); setMotivo(MOTIVOS[v][0]); }} className="vt-toque" style={{ padding: "12px 8px", borderRadius: 12, fontWeight: 700, fontSize: 14.5,
            border: `1.5px solid ${t === v ? C.ouro : C.borda}`, background: t === v ? C.ouroSuave : "#fff" }}>{l}</button>
        ))}
      </div>
      <Campo rotulo="Quantidade" dica={`Agora tem ${p.estoque} ${p.estoque === 1 ? "peça" : "peças"}. Depois: ${t === "entrada" ? p.estoque + n : Math.max(0, p.estoque - n)}.`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setQtd(Math.max(1, n - 1))} aria-label="Menos" style={{ ...S.btnIcone, width: 50, height: 50, flex: "0 0 50px", border: `1.5px solid ${C.borda}`, background: "#fff" }}>{ICONES.menos}</button>
          <input className="vt-campo" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value.replace(/\D/g, "").slice(0, 4))}
            style={{ textAlign: "center", fontSize: 22, fontWeight: 800, maxWidth: 120 }} />
          <button onClick={() => setQtd(n + 1)} aria-label="Mais" style={{ ...S.btnIcone, width: 50, height: 50, flex: "0 0 50px", border: `1.5px solid ${C.borda}`, background: "#fff" }}>{ICONES.mais}</button>
        </div>
      </Campo>
      {passa && <div style={{ color: C.vermelho, fontWeight: 600, fontSize: 14, marginTop: -6, marginBottom: 14 }}>Só tem {p.estoque} em estoque.</div>}
      <Campo rotulo="Motivo">
        <Chips opcoes={MOTIVOS[t]} valor={motivo} mudar={setMotivo} />
      </Campo>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Cadastro do produto
   --------------------------------------------------------------------- */
function Especificacao({ f, valor, mudar }) {
  if (f.tipo === "simnao") {
    const v = valor === true ? "Sim" : valor === false ? "Não" : "";
    return <Chips opcoes={["Sim", "Não"]} valor={v} permitirVazio mudar={(x) => mudar(x === "Sim" ? true : x === "Não" ? false : null)} />;
  }
  if (f.tipo === "opcoes" && (f.opcoes || []).length) {
    return <Chips opcoes={f.opcoes} valor={valor || ""} permitirVazio mudar={mudar} />;
  }
  return <input className="vt-campo" value={valor || ""} onChange={(e) => mudar(e.target.value)} placeholder={f.exemplo || ""} />;
}

function vazioDoForm(inicial) {
  if (inicial && inicial.produto) {
    const p = inicial.produto;
    return {
      id: p.id, categoria_id: p.categoria_id, nome: p.nome || "", codigo: p.codigo || "", marca: p.marca || "", descricao: p.descricao || "",
      preco: valorParaCampo(p.preco), preco_antigo: valorParaCampo(p.preco_antigo), fotos: [...(p.fotos || [])], specs: { ...(p.specs || {}) },
      novo: !!p.novo, destaque: !!p.destaque, ativo: p.ativo !== false, estoque: "",
    };
  }
  return { categoria_id: (inicial && inicial.categoria_id) || "", nome: "", codigo: "", marca: "", descricao: "", preco: "", preco_antigo: "",
    fotos: [], specs: {}, novo: true, destaque: false, ativo: true, estoque: "1" };
}

function FormProduto({ aberto, inicial, dados, acoes, aoFechar }) {
  const [f, setF] = useState(() => vazioDoForm(inicial));
  const [enviando, setEnviando] = useState("");
  const [salvando, setSalvando] = useState(false);
  const enviadasAgora = useRef([]);
  const antigo = inicial && inicial.produto;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!aberto) return;
    setF(vazioDoForm(inicial));
    enviadasAgora.current = [];
    if (!inicial.produto) api.proximoCodigo().then((c) => setF((x) => (x.codigo ? x : { ...x, codigo: c }))).catch(() => {});
  }, [aberto]); // eslint-disable-line

  const cat = dados.categorias.find((c) => c.id === f.categoria_id);
  const marcas = useMemo(() => [...new Set(dados.produtos.map((p) => p.marca).filter(Boolean))].sort(), [dados.produtos]);

  const adicionarFotos = async (e) => {
    const arquivos = Array.from(e.target.files || []).slice(0, MAX_FOTOS - f.fotos.length);
    e.target.value = "";
    if (!arquivos.length) return;
    for (let i = 0; i < arquivos.length; i++) {
      setEnviando(arquivos.length > 1 ? `Enviando ${i + 1} de ${arquivos.length}…` : "Enviando…");
      try {
        const url = await api.enviarFoto(arquivos[i], "produtos");
        enviadasAgora.current.push(url);
        setF((x) => ({ ...x, fotos: [...x.fotos, url].slice(0, MAX_FOTOS) }));
      } catch (err) { acoes.avisar(api.msgErro(err), "erro"); }
    }
    setEnviando("");
  };
  const tirarFoto = (url) => set("fotos", f.fotos.filter((x) => x !== url));
  const moverFoto = (i, d) => {
    const l = [...f.fotos]; const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]]; set("fotos", l);
  };

  /* cancelar apaga do servidor as fotos que subiram agora e não foram salvas */
  const cancelar = () => {
    const sobra = enviadasAgora.current.filter((u) => !(antigo && (antigo.fotos || []).includes(u)));
    if (sobra.length) api.removerArquivos(sobra).catch(() => {});
    enviadasAgora.current = [];
    aoFechar();
  };

  const salvar = async () => {
    if (!f.nome.trim()) return acoes.avisar("Dê um nome para o produto.", "erro");
    if (!f.categoria_id) return acoes.avisar("Escolha a categoria.", "erro");
    const preco = parseValor(f.preco);
    const precoAntigo = parseValor(f.preco_antigo);
    setSalvando(true);
    try {
      // a mesma referência pode valer para várias cores/tamanhos: repetir o código só avisa, nunca trava
      let repetido = false;
      try { repetido = await api.codigoEmUso(f.codigo.trim(), f.id); } catch { /* a conferência nunca impede de salvar */ }
      const campos = (cat && cat.campos) || [];
      const specs = {};
      campos.forEach((c) => { const v = f.specs[c.chave]; if (v !== undefined && v !== null && v !== "") specs[c.chave] = v; });
      const salvo = await api.salvarProduto({
        ...(f.id ? { id: f.id } : {}), categoria_id: f.categoria_id, nome: f.nome.trim(), codigo: f.codigo.trim(), marca: f.marca.trim(),
        descricao: f.descricao.trim(), preco, preco_antigo: precoAntigo, fotos: f.fotos, specs, novo: f.novo, destaque: f.destaque, ativo: f.ativo,
      }, antigo || null, f.id ? 0 : parseInt(f.estoque, 10) || 0);
      enviadasAgora.current = [];
      await acoes.produtoSalvo(salvo);
      acoes.avisar((f.id ? "Produto atualizado" : "Produto cadastrado") + (repetido ? " (atenção: esse código já existe em outro produto)" : ""));
      aoFechar();
    } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setSalvando(false);
  };

  if (!aberto) return <Modal aberto={false} aoFechar={cancelar} />;

  return (
    <Modal aberto={aberto} aoFechar={cancelar} titulo={f.id ? "Editar produto" : "Novo produto"} sub={f.codigo} largo
      rodape={
        <div style={{ display: "flex", gap: 8 }}>
          <Botao contorno cor={C.texto} onClick={cancelar} style={{ flex: 1 }}>Cancelar</Botao>
          <Botao {...OURO} onClick={salvar} disabled={salvando || !!enviando} style={{ flex: 2 }}>{salvando ? "Salvando…" : "Salvar produto"}</Botao>
        </div>
      }>
      <Campo n={1} rotulo={`Fotos (até ${MAX_FOTOS}) — a primeira é a capa`} dica="A foto encolhe sozinha antes de subir, para não gastar espaço.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 8 }}>
          {f.fotos.map((u, i) => (
            <div key={u} style={{ position: "relative", paddingTop: "100%", borderRadius: 12, overflow: "hidden", border: `1.5px solid ${i === 0 ? C.ouro : C.borda}`, background: C.ouroSuave }}>
              <img src={u} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              {i === 0 && <span style={{ position: "absolute", top: 5, left: 5, fontSize: 10, fontWeight: 800, background: C.ouro, color: C.carvao, padding: "2px 6px", borderRadius: 6 }}>CAPA</span>}
              <button onClick={() => tirarFoto(u)} aria-label="Tirar foto" style={{ position: "absolute", top: 4, right: 4, width: 28, height: 28, borderRadius: "50%", border: "none",
                background: "rgba(192,69,59,.92)", color: "#fff", display: "grid", placeItems: "center", padding: 0 }}>{ICONES.x}</button>
              <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => moverFoto(i, -1)} disabled={i === 0} aria-label="Para a esquerda" style={estiloSetinha(i === 0)}>‹</button>
                <button onClick={() => moverFoto(i, 1)} disabled={i === f.fotos.length - 1} aria-label="Para a direita" style={estiloSetinha(i === f.fotos.length - 1)}>›</button>
              </div>
            </div>
          ))}
          {f.fotos.length < MAX_FOTOS && (
            <label className="vt-toque" style={{ position: "relative", paddingTop: "100%", borderRadius: 12, border: `1.5px dashed ${C.ouro}`, background: "#fff", cursor: "pointer" }}>
              <span style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, color: C.ouroEsc, fontSize: 12, fontWeight: 700, textAlign: "center", padding: 6 }}>
                {ICONES.foto}{enviando || "Adicionar"}
              </span>
              <input type="file" accept="image/*" multiple onChange={adicionarFotos} disabled={!!enviando} style={{ display: "none" }} />
            </label>
          )}
        </div>
      </Campo>

      <Campo n={2} rotulo="Nome do produto">
        <input className="vt-campo" value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Armação Gatinho Acetato Tartaruga" />
      </Campo>

      <Campo n={3} rotulo="Categoria">
        {dados.categorias.length ? <Chips opcoes={dados.categorias.map((c) => c.nome)} valor={cat ? cat.nome : ""}
          mudar={(nome) => set("categoria_id", (dados.categorias.find((c) => c.nome === nome) || {}).id || "")} />
          : <div style={S.dica}>Crie uma categoria antes, na aba Categorias.</div>}
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 12px" }}>
        <Campo n={4} rotulo="Marca" dica="Opcional.">
          <input className="vt-campo" list="vt-marcas" value={f.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ex.: Ray-Ban, Vogue, ZEISS" />
          <datalist id="vt-marcas">{marcas.map((m) => <option key={m} value={m} />)}</datalist>
        </Campo>
        <Campo n={5} rotulo="Código" dica={f.id ? undefined : "Já vem um código sugerido. Apague e digite a referência do óculos, se quiser."}>
          <input className="vt-campo" value={f.codigo} onChange={(e) => set("codigo", e.target.value.toUpperCase())} placeholder="Referência do óculos" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
        </Campo>
        <Campo n={6} rotulo="Preço de venda">
          <input className="vt-campo" inputMode="decimal" value={f.preco} onChange={(e) => set("preco", e.target.value)} placeholder="Ex.: 249,90" />
        </Campo>
        <Campo n={7} rotulo="Preço antigo (promoção)" dica="Opcional. Se preencher, o catálogo mostra o desconto.">
          <input className="vt-campo" inputMode="decimal" value={f.preco_antigo} onChange={(e) => set("preco_antigo", e.target.value)} placeholder="Ex.: 299,90" />
        </Campo>
        {!f.id && (
          <Campo n={8} rotulo="Quantidade que você tem agora" dica="Depois, a entrada e a saída são feitas pela ficha do produto.">
            <input className="vt-campo" inputMode="numeric" value={f.estoque} onChange={(e) => set("estoque", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Ex.: 1" />
          </Campo>
        )}
      </div>

      {cat && (cat.campos || []).length > 0 && (
        <div style={{ ...S.card, padding: "16px 14px 4px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Especificações de {cat.nome}</div>
          <div style={{ ...S.dica, marginTop: 0, marginBottom: 14 }}>Todas opcionais. Aparecem no catálogo, na ficha do produto.</div>
          {cat.campos.map((c) => (
            <Campo key={c.chave} rotulo={c.rotulo}>
              <Especificacao f={c} valor={f.specs[c.chave]} mudar={(v) => set("specs", { ...f.specs, [c.chave]: v })} />
            </Campo>
          ))}
        </div>
      )}

      <Campo rotulo="Descrição" dica="Opcional. Medidas, detalhes, para quem combina…">
        <textarea className="vt-campo" rows={3} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} style={{ resize: "vertical", lineHeight: 1.5 }}
          placeholder="Ex.: Acetato italiano, encaixe confortável, lente 52 · ponte 18 · haste 140." />
      </Campo>

      <Interruptor ligado={f.ativo} mudar={(v) => set("ativo", v)} rotulo="Mostrar no catálogo" dica="Desligado, o produto fica só no estoque." />
      <Interruptor ligado={f.novo} mudar={(v) => set("novo", v)} rotulo="Selo “Novo”" />
      <Interruptor ligado={f.destaque} mudar={(v) => set("destaque", v)} rotulo="Destaque" dica="Aparece primeiro na categoria." />
    </Modal>
  );
}
const estiloSetinha = (off) => ({ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(21,22,24,.65)", color: "#fff",
  fontSize: 18, lineHeight: 1, padding: 0, opacity: off ? 0.3 : 1 });

/* ---------------------------------------------------------------------
   Categorias e as especificações de cada uma
   --------------------------------------------------------------------- */
function Categorias({ dados, acoes }) {
  const { categorias, produtos } = dados;
  const [editando, setEditando] = useState(null);
  const conta = (id) => produtos.filter((p) => p.categoria_id === id).length;
  const mover = async (i, d) => {
    const l = [...categorias]; const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    try { await acoes.reordenar(l); } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "4px 2px 14px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, margin: 0 }}>Categorias</h1>
          <div style={{ fontSize: 13, color: C.suave, marginTop: 3 }}>A ordem daqui é a ordem do catálogo</div>
        </div>
        <Botao {...OURO} icone={ICONES.mais} onClick={() => setEditando({})}>Nova</Botao>
      </div>
      {categorias.length === 0 ? <Vazio texto="Nenhuma categoria. Crie a primeira." /> : (
        <div style={{ ...S.card, overflow: "hidden" }}>
          {categorias.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 8px 10px 14px", borderTop: i ? `1px solid ${C.borda}` : "none", minWidth: 0 }}>
              <button onClick={() => setEditando(c)} className="vt-toque" style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", padding: "4px 0" }}>
                <div style={{ fontWeight: 700, fontSize: 15, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{c.nome}{!c.ativo && <Selo tipo="neutro">escondida</Selo>}</div>
                <div style={{ fontSize: 12.5, color: C.suave, marginTop: 2 }}>
                  {conta(c.id)} produto{conta(c.id) === 1 ? "" : "s"} · {(c.campos || []).length} especificaç{(c.campos || []).length === 1 ? "ão" : "ões"}
                </div>
              </button>
              <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" style={{ ...S.btnIcone, opacity: i === 0 ? 0.25 : 1 }}>{ICONES.cima}</button>
              <button onClick={() => mover(i, 1)} disabled={i === categorias.length - 1} aria-label="Descer" style={{ ...S.btnIcone, opacity: i === categorias.length - 1 ? 0.25 : 1 }}>{ICONES.baixo}</button>
            </div>
          ))}
        </div>
      )}
      <div style={S.dica}>Toque numa categoria para mudar o nome, a descrição e as especificações que o cadastro pede.</div>
      <FormCategoria c={editando} dados={dados} acoes={acoes} aoFechar={() => setEditando(null)} total={editando && editando.id ? conta(editando.id) : 0} />
    </div>
  );
}

const TIPOS_CAMPO = [
  { v: "opcoes", l: "Lista de opções" },
  { v: "texto", l: "Texto livre" },
  { v: "simnao", l: "Sim ou não" },
];

function EditorCampo({ f, i, total, mudar, tirar, mover }) {
  return (
    <div style={{ ...S.card, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <b style={{ flex: 1, fontSize: 13, color: C.suave }}>Especificação {i + 1}</b>
        <button onClick={() => mover(-1)} disabled={i === 0} aria-label="Subir" style={{ ...S.btnIcone, width: 34, height: 34, flex: "0 0 34px", opacity: i === 0 ? 0.25 : 1 }}>{ICONES.cima}</button>
        <button onClick={() => mover(1)} disabled={i === total - 1} aria-label="Descer" style={{ ...S.btnIcone, width: 34, height: 34, flex: "0 0 34px", opacity: i === total - 1 ? 0.25 : 1 }}>{ICONES.baixo}</button>
        <button onClick={tirar} aria-label="Tirar" style={{ ...S.btnIcone, width: 34, height: 34, flex: "0 0 34px", color: C.vermelho }}>{ICONES.lixo}</button>
      </div>
      <input className="vt-campo" value={f.rotulo} onChange={(e) => mudar({ ...f, rotulo: e.target.value })} placeholder="Ex.: Formato, Material, Cor da lente" />
      <div style={{ marginTop: 10 }}>
        <Chips opcoes={TIPOS_CAMPO.map((t) => t.l)} valor={(TIPOS_CAMPO.find((t) => t.v === f.tipo) || TIPOS_CAMPO[0]).l}
          mudar={(l) => mudar({ ...f, tipo: (TIPOS_CAMPO.find((t) => t.l === l) || TIPOS_CAMPO[0]).v })} />
      </div>
      {f.tipo === "opcoes" && (
        <div style={{ marginTop: 10 }}>
          <textarea className="vt-campo" rows={4} value={f._texto ?? (f.opcoes || []).join("\n")}
            onChange={(e) => mudar({ ...f, _texto: e.target.value, opcoes: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
            placeholder={"Uma opção por linha\nEx.:\nRedondo\nQuadrado\nGatinho"} style={{ resize: "vertical", lineHeight: 1.5 }} />
          <div style={S.dica}>Uma opção por linha.</div>
        </div>
      )}
    </div>
  );
}

function FormCategoria({ c, dados, acoes, aoFechar, total }) {
  const [f, setF] = useState(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (!c) { setF(null); return; }
    setF({ id: c.id, nome: c.nome || "", descricao: c.descricao || "", ativo: c.ativo !== false,
      campos: (c.campos || []).map((x) => ({ ...x, opcoes: [...(x.opcoes || [])] })) });
  }, [c]);
  if (!c || !f) return null;

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const mudarCampo = (i, v) => set("campos", f.campos.map((x, k) => (k === i ? v : x)));
  const moverCampo = (i, d) => { const l = [...f.campos]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; set("campos", l); };

  const salvar = async () => {
    if (!f.nome.trim()) return acoes.avisar("Dê um nome para a categoria.", "erro");
    const usadas = new Set();
    const campos = f.campos.filter((x) => x.rotulo.trim()).map((x) => {
      /* a chave de quem já existia não muda: é ela que liga os valores já preenchidos nos produtos */
      let chave = x.chave || slugify(x.rotulo).replace(/-/g, "_");
      while (usadas.has(chave)) chave += "_2";
      usadas.add(chave);
      return { chave, rotulo: x.rotulo.trim(), tipo: x.tipo || "opcoes", opcoes: x.tipo === "opcoes" ? (x.opcoes || []) : [], filtro: x.filtro !== false };
    });
    let slug = c.slug;
    if (!c.id) {
      const base = slugify(f.nome); slug = base; let k = 2;
      while (dados.categorias.some((x) => x.slug === slug)) slug = `${base}-${k++}`;
    }
    setSalvando(true);
    try {
      await acoes.salvarCategoria({
        ...(c.id ? { id: c.id } : { ordem: (dados.categorias.length + 1) * 10 }), nome: f.nome.trim(), slug, descricao: f.descricao.trim(), ativo: f.ativo, campos,
      }, c.id ? c : null);
      acoes.avisar(c.id ? "Categoria salva" : "Categoria criada");
      aoFechar();
    } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setSalvando(false);
  };
  const excluir = async () => {
    if (total > 0) return window.alert(`Esta categoria tem ${total} produto(s). Mude eles de categoria (ou exclua) antes.`);
    if (!window.confirm(`Mandar "${c.nome}" para a lixeira?`)) return;
    try { await acoes.excluirCategoria(c); aoFechar(); } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
  };

  return (
    <Modal aberto={!!c} aoFechar={aoFechar} titulo={c.id ? c.nome : "Nova categoria"} sub="Categoria" largo
      rodape={
        <div style={{ display: "flex", gap: 8 }}>
          {c.id && <Botao contorno cor={C.vermelho} icone={ICONES.lixo} onClick={excluir}>Excluir</Botao>}
          <Botao {...OURO} onClick={salvar} disabled={salvando} style={{ flex: 1 }}>{salvando ? "Salvando…" : "Salvar categoria"}</Botao>
        </div>
      }>
      <Campo n={1} rotulo="Nome">
        <input className="vt-campo" value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Óculos de grau" />
      </Campo>
      <Campo n={2} rotulo="Frase do catálogo" dica="Opcional. Aparece embaixo do nome da categoria no catálogo.">
        <textarea className="vt-campo" rows={2} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} style={{ resize: "vertical" }}
          placeholder="Ex.: Armações em acetato e metal, para todos os formatos de rosto." />
      </Campo>
      <Interruptor ligado={f.ativo} mudar={(v) => set("ativo", v)} rotulo="Mostrar no catálogo" dica="Desligada, a categoria e os produtos dela somem do catálogo." />

      <div style={S.titSecao}>Especificações</div>
      <div style={{ ...S.dica, marginTop: -4, marginBottom: 12 }}>São as perguntas que o cadastro de produto faz para esta categoria (formato, material, cor…).</div>
      {f.campos.map((x, i) => (
        <EditorCampo key={i} f={x} i={i} total={f.campos.length} mudar={(v) => mudarCampo(i, v)}
          tirar={() => set("campos", f.campos.filter((_, k) => k !== i))} mover={(d) => moverCampo(i, d)} />
      ))}
      <Botao contorno cor={C.ouroEsc} cheio icone={ICONES.mais} onClick={() => set("campos", [...f.campos, { rotulo: "", tipo: "opcoes", opcoes: [] }])}>Adicionar especificação</Botao>
    </Modal>
  );
}
