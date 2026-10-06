import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import * as api from "./api.js";
import { SUPABASE_URL, BUCKET } from "./config.js";
import {
  CREDITO_NOME, CREDITO_FONE, mesclarConfig, dinheiro, normalizar, foneFmt, linkWhats, linkMapa, linkRota, linkWaze,
  linkInstagram, aplicar, statusAgora, horariosAgrupados, perguntaVisivel, ehPix, mensagemPedido,
} from "./padroes.js";

/* =====================================================================
   VÉRTICE DESIGN ÓPTICO — Catálogo público (endereço com /catalogo)
   O cliente vê as armações por categoria, monta a sacola, responde o
   formulário da ótica e envia tudo pelo WhatsApp.
   ===================================================================== */

const C = {
  carvao: "#151618", ardosia: "#1F2124", ardosia2: "#2A2C30", pedra: "#3A3C41",
  ouro: "#C9A35B", ouroClaro: "#E9D29F", ouroEsc: "#9A7638", ouroSuave: "#F4EBD9",
  creme: "#F7F3EC", papel: "#EFE7DA", card: "#FFFFFF", linha: "#E7DECF",
  tinta: "#1E1F22", texto: "#4E4A44", suave: "#8C857A",
  verde: "#2E8B57", vermelho: "#B4483E", zap: "#25D366",
};
const SERIF = `"Cinzel", "Times New Roman", Georgia, serif`;
const FONT = `"Montserrat", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const LOGO = "/logo.jpg";
const EMBLEMA = "/emblema.jpg";
/* fotos da abertura subidas direto no Storage, na raiz do bucket: ABERTURA01.jpg até ABERTURA06.jpg.
   Se a dona escolher fotos em Ajustes → Fotos da abertura, essas passam na frente. */
const ARQUIVOS = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const ABERTURA_STORAGE = [1, 2, 3, 4, 5, 6].map((n) => `${ARQUIVOS}ABERTURA0${n}.jpg`);

const CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}

/* TRAVA DE LARGURA — não remover.
   Se qualquer elemento ficar mais largo que a tela, o navegador do celular
   encolhe a página inteira para caber e sobra uma faixa branca na lateral.
   Estas linhas cortam o excesso na raiz. O "clip" corta sem criar rolagem
   lateral, e por isso não atrapalha cabeçalho grudado nem janela flutuante. */
html,body,#root{max-width:100%;overflow-x:clip}
@supports not (overflow-x:clip){ html,body{overflow-x:hidden} }

html{-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;overscroll-behavior-y:none;background:${C.creme};color:${C.tinta};font-family:${FONT}}
img,video,table{max-width:100%}
button,input,select,textarea{font-family:inherit;color:inherit}
button{cursor:pointer}
a{color:inherit}

/* Altura real da tela: o 100vh do iPhone conta a barra do Safari e corta. */
.tela{position:fixed;left:0;right:0;top:0;bottom:0;height:100vh;height:100dvh}
.alto{min-height:100vh;min-height:100dvh}

/* 16px no campo evita o zoom automático do iPhone ao tocar para digitar. */
@media (max-width:859px){ input,select,textarea{font-size:16px !important} }

@keyframes vtFade{from{opacity:0}to{opacity:1}}
@keyframes vtSurge{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes vtZoomA{from{transform:scale(1.04)}to{transform:scale(1.16)}}
@keyframes vtZoomB{from{transform:scale(1.16)}to{transform:scale(1.04)}}
@keyframes vtGira{to{transform:rotate(360deg)}}
@keyframes vtOnda{0%{transform:translate(-50%,-50%) scale(.3);opacity:.9}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0}}
@keyframes vtFlutua{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes vtBrilho{0%{background-position:-160% 0}100%{background-position:260% 0}}
@keyframes vtFio{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes vtPulsa{0%,100%{box-shadow:0 0 0 0 rgba(46,139,87,.55)}70%{box-shadow:0 0 0 9px rgba(46,139,87,0)}}

.vt-rev{opacity:0}
.vt-rev.vis{animation:vtSurge .8s cubic-bezier(.19,1,.22,1) both}
.vt-fio{height:1px;background:linear-gradient(90deg,transparent,${C.ouro},transparent);transform-origin:center;animation:vtFio 1s cubic-bezier(.19,1,.22,1) both}
.vt-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.vt-chips::-webkit-scrollbar{display:none}
.vt-toque{transition:transform .2s ease,opacity .2s ease,box-shadow .3s ease,background .25s ease}
.vt-toque:active{opacity:.8}
.vt-card{transition:transform .35s cubic-bezier(.19,1,.22,1),box-shadow .35s ease}
@media (hover:hover){
  .vt-card:hover{transform:translateY(-6px);box-shadow:0 22px 46px rgba(30,31,34,.14)}
  .vt-card:hover .vt-foto img{transform:scale(1.05)}
  .vt-btn-ouro:hover{box-shadow:0 12px 34px rgba(201,163,91,.45)}
}
.vt-foto img{transition:transform .9s cubic-bezier(.19,1,.22,1)}
.vt-dourado{background:linear-gradient(100deg,${C.ouroEsc} 0%,${C.ouroClaro} 45%,${C.ouro} 60%,${C.ouroEsc} 100%);background-size:220% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;animation:vtBrilho 6s linear infinite}
.vt-campo{width:100%;padding:13px 14px;border:1.5px solid ${C.linha};border-radius:12px;background:#fff;font-size:15px;outline:none;transition:border-color .15s}
.vt-campo:focus{border-color:${C.ouro}}
.vt-campo::placeholder{color:#B4AC9F}
@media (prefers-reduced-motion:reduce){
  *{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}
  .vt-rev{opacity:1}
}
`;

/* ---------------------------------------------------------------------
   Ícones (SVG à mão)
   --------------------------------------------------------------------- */
const svg = (d, t = 22, extra) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...extra}>{d}</svg>
);
const ICONES = {
  voltar: svg(<path d="M15 18l-6-6 6-6" />),
  x: svg(<path d="M18 6L6 18M6 6l12 12" />),
  esq: svg(<path d="M15 18l-6-6 6-6" />, 20),
  dir: svg(<path d="M9 6l6 6-6 6" />, 20),
  baixo: svg(<path d="M6 9l6 6 6-6" />, 24),
  busca: svg(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>, 20),
  sacola: svg(<><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>, 21),
  check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, 18, { strokeWidth: 2.4 }),
  lixo: svg(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>, 19),
  lupa: svg(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2M11 8v6M8 11h6" /></>, 18),
  copiar: svg(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>, 18),
  compartilhar: svg(<path d="M12 3.5v11M7.5 8L12 3.5 16.5 8M5 13.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4.5" />, 19),
  pin: svg(<><path d="M12 21.5s7-6 7-11.7a7 7 0 1 0-14 0c0 5.7 7 11.7 7 11.7z" /><circle cx="12" cy="9.8" r="2.5" /></>, 20),
  relogio: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, 20),
  instagram: svg(<><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.8" /><circle cx="17.2" cy="6.8" r=".6" /></>, 20),
  rota: svg(<><path d="M5 19c4-1 5-5 7-7s5-3 7-7" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /></>, 19),
  olho: svg(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>, 24),
  lente: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M7.5 9.5a5 5 0 0 1 4-3" /><circle cx="12" cy="12" r="4.5" strokeOpacity=".5" /></>, 24),
  calendario: svg(<><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4M8.5 14h2M13.5 14h2" /></>, 24),
  ajuste: svg(<><path d="M3 12.5c1.5-3 3.5-3 5-3s3 1.2 4 1.2 2.5-1.2 4-1.2 3.5 0 5 3" /><circle cx="7" cy="14" r="3.2" /><circle cx="17" cy="14" r="3.2" /></>, 24),
  whats: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3z" />
    </svg>
  ),
};
const ICONES_QUADROS = [ICONES.olho, ICONES.lente, ICONES.calendario, ICONES.ajuste];

/* óculos desenhados, para produto ainda sem foto */
function OculosDesenho({ cor = C.ouro, largura = "62%" }) {
  return (
    <svg viewBox="0 0 120 50" style={{ width: largura, height: "auto", display: "block" }} aria-hidden="true">
      <g fill="none" stroke={cor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 16c0-4 2-6 7-6h26c5 0 7 2 7 6v6c0 9-6 15-15 15h-5C14 37 8 31 8 22z" />
        <path d="M72 16c0-4 2-6 7-6h26c5 0 7 2 7 6v6c0 9-6 15-15 15h-5c-9 0-15-6-15-15z" />
        <path d="M48 17c3-3 9-3 12 0c3-3 9-3 12 0" />
        <path d="M8 14L2 12M112 14l6-2" />
      </g>
      <path d="M15 15c3-2 7-2 9-1" stroke="#fff" strokeOpacity=".7" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------------
   Botão voltar do celular: fecha o que está aberto, um passo de cada vez
   --------------------------------------------------------------------- */
const PILHA = [];
let IGNORAR = 0;
let VOLTAS = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (IGNORAR > 0) { IGNORAR--; return; }
    const item = PILHA.pop();
    if (item) { item.porVoltar = true; item.fechar(); }
  });
}
function voltarHistorico() {
  VOLTAS++;
  if (VOLTAS === 1) setTimeout(() => { const n = VOLTAS; VOLTAS = 0; IGNORAR++; window.history.go(-n); }, 0);
}
function useVoltar(aberto, fechar) {
  const ref = useRef(fechar);
  ref.current = fechar;
  useEffect(() => {
    if (!aberto) return;
    const item = { fechar: () => ref.current(), porVoltar: false };
    PILHA.push(item);
    window.history.pushState({ vt: PILHA.length }, "");
    return () => {
      const i = PILHA.indexOf(item);
      if (i >= 0) { PILHA.splice(i, 1); if (!item.porVoltar) voltarHistorico(); }
    };
  }, [aberto]);
}

/* trava o fundo: só esconder a rolagem não segura o Safari. Com contador,
   porque a foto ampliada abre por cima da ficha, que já travou o fundo. */
let TRAVAS = 0;
let ANTES = null;
function useTravaFundo(ativo) {
  useEffect(() => {
    if (!ativo) return;
    if (TRAVAS === 0) {
      const y = window.scrollY || 0;
      const b = document.body;
      ANTES = { y, position: b.style.position, top: b.style.top, width: b.style.width, overflow: b.style.overflow };
      b.style.position = "fixed"; b.style.top = `-${y}px`; b.style.width = "100%"; b.style.overflow = "hidden";
    }
    TRAVAS++;
    return () => {
      TRAVAS--;
      if (TRAVAS === 0 && ANTES) {
        const b = document.body;
        b.style.position = ANTES.position; b.style.top = ANTES.top; b.style.width = ANTES.width; b.style.overflow = ANTES.overflow;
        window.scrollTo(0, ANTES.y);
        ANTES = null;
      }
    };
  }, [ativo]);
}

function useTelaLarga() {
  const [larga, setLarga] = useState(() => window.innerWidth >= 860);
  useEffect(() => {
    const r = () => setLarga(window.innerWidth >= 860);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  return larga;
}

/* ---------------------------------------------------------------------
   Janela que abre por cima (padrão: portal, dvh, teclado, trava do fundo).
   No celular ocupa a tela inteira; no computador vira caixa centralizada.
   --------------------------------------------------------------------- */
function Modal({ aberto, aoFechar, titulo, sub, children, rodape, largo }) {
  const telaLarga = useTelaLarga();
  const [altura, setAltura] = useState(null);
  useVoltar(aberto, aoFechar);
  useTravaFundo(aberto);

  /* teclado do iPhone: a janela encolhe junto e o botão de enviar fica à vista */
  useEffect(() => {
    if (!aberto || !window.visualViewport) return;
    const vv = window.visualViewport;
    const aj = () => setAltura(Math.round(vv.height));
    aj();
    vv.addEventListener("resize", aj);
    vv.addEventListener("scroll", aj);
    return () => { vv.removeEventListener("resize", aj); vv.removeEventListener("scroll", aj); };
  }, [aberto]);

  if (!aberto) return null;

  const topo = (
    <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, color: C.creme,
      background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, borderBottom: `1px solid rgba(201,163,91,.35)`,
      padding: telaLarga ? "15px 14px 15px 22px" : "calc(8px + env(safe-area-inset-top,0px)) 12px 10px 6px" }}>
      {!telaLarga && <button onClick={aoFechar} aria-label="Voltar" style={S.btnIcone}>{ICONES.voltar}</button>}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: telaLarga ? 19 : 17, letterSpacing: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</div>
        {sub && <div style={{ fontSize: 12.5, color: C.ouroClaro, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
      {telaLarga && <button onClick={aoFechar} aria-label="Fechar" style={S.btnIcone}>{ICONES.x}</button>}
    </div>
  );
  const pe = rodape && (
    <div style={{ flex: "0 0 auto", background: "#fff", borderTop: `1px solid ${C.linha}`,
      padding: telaLarga ? "14px 22px" : "12px 16px calc(12px + env(safe-area-inset-bottom,0px))" }}>{rodape}</div>
  );

  if (!telaLarga) {
    return createPortal(
      <div className="tela" style={{ zIndex: 100, background: C.creme, display: "flex", flexDirection: "column",
        height: altura ? `${altura}px` : undefined, animation: "vtFade .2s ease", fontFamily: FONT, color: C.tinta }}>
        {topo}
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch",
          padding: rodape ? 16 : "16px 16px calc(28px + env(safe-area-inset-bottom,0px))" }}>{children}</div>
        {pe}
      </div>,
      document.body
    );
  }
  return createPortal(
    <div className="tela" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
      style={{ zIndex: 100, background: "rgba(12,12,14,.62)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "vtFade .2s ease", fontFamily: FONT, color: C.tinta }}>
      <div style={{ background: C.creme, borderRadius: 20, width: "100%", maxWidth: largo ? 980 : 560,
        maxHeight: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 30px 90px rgba(0,0,0,.45)" }}>
        {topo}
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: 22 }}>{children}</div>
        {pe}
      </div>
    </div>,
    document.body
  );
}

const S = {
  btnIcone: { width: 42, height: 42, flex: "0 0 42px", display: "grid", placeItems: "center", border: "none",
    background: "transparent", color: "inherit", borderRadius: 12 },
  sobretitulo: { fontSize: 11, letterSpacing: 4.5, textTransform: "uppercase", fontWeight: 600, color: C.ouroEsc },
  rotulo: { display: "block", fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: C.texto, marginBottom: 7 },
};

function Botao({ children, onClick, tipo = "escuro", cheio, pequeno, disabled, icone, href, style, ...resto }) {
  const cores = {
    escuro: { background: C.ardosia, color: C.ouroClaro, border: `1px solid ${C.ardosia}` },
    ouro: { background: `linear-gradient(135deg, ${C.ouroClaro}, ${C.ouro} 55%, ${C.ouroEsc})`, color: C.carvao, border: "1px solid transparent" },
    linha: { background: "transparent", color: C.tinta, border: `1px solid ${C.linha}` },
    linhaClara: { background: "rgba(255,255,255,.04)", color: C.creme, border: "1px solid rgba(233,210,159,.45)" },
    zap: { background: C.zap, color: "#fff", border: `1px solid ${C.zap}` },
  }[tipo];
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, textDecoration: "none",
    padding: pequeno ? "9px 14px" : "14px 22px", minHeight: pequeno ? 40 : 50, borderRadius: 999,
    fontWeight: 700, fontSize: pequeno ? 13 : 14.5, letterSpacing: 0.3, width: cheio ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap", ...cores, ...style,
  };
  const cls = `vt-toque${tipo === "ouro" ? " vt-btn-ouro" : ""}`;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={base} onClick={onClick} {...resto}>{icone}{children}</a>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cls} style={base} {...resto}>{icone}{children}</button>;
}

/* aparece quando entra na tela */
function Revela({ children, atraso = 0, style }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || vis) return;
    if (!("IntersectionObserver" in window)) { setVis(true); return; }
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [vis]);
  return <div ref={ref} className={`vt-rev${vis ? " vis" : ""}`} style={{ animationDelay: `${atraso}ms`, ...style }}>{children}</div>;
}

function useVisivel(ref) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || v) return;
    if (!("IntersectionObserver" in window)) { setV(true); return; }
    const o = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setV(true); o.disconnect(); } }, { rootMargin: "300px" });
    o.observe(el);
    return () => o.disconnect();
  }, [v, ref]);
  return v;
}

function Titulo({ sobre, children, claro, centro = true, sub }) {
  return (
    <div style={{ textAlign: centro ? "center" : "left", marginBottom: 28 }}>
      {sobre && <div style={{ ...S.sobretitulo, color: claro ? C.ouro : C.ouroEsc }}>{sobre}</div>}
      <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(26px, 6.4vw, 40px)", lineHeight: 1.18, margin: "10px 0 0",
        color: claro ? C.creme : C.tinta, letterSpacing: 0.5, textWrap: "balance" }}>{children}</h2>
      <div className="vt-fio" style={{ width: 90, margin: centro ? "18px auto 0" : "18px 0 0" }} />
      {sub && <p style={{ fontSize: 15, lineHeight: 1.7, color: claro ? "rgba(247,243,236,.72)" : C.texto, margin: "16px auto 0", maxWidth: 620 }}>{sub}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------------
   Rede de proteção: nunca deixa a tela ficar em branco
   --------------------------------------------------------------------- */
class Guarda extends React.Component {
  constructor(p) { super(p); this.state = { caiu: false }; }
  static getDerivedStateFromError() { return { caiu: true }; }
  componentDidCatch(e) { try { console.error(e); } catch { /* nada */ } }
  render() {
    if (!this.state.caiu) return this.props.children;
    return (
      <div style={{ fontFamily: FONT, background: C.carvao, color: C.creme, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, marginBottom: 10 }}>Algo não abriu direito</div>
          <p style={{ opacity: 0.75, fontSize: 15, margin: "0 0 20px" }}>Toque abaixo para voltar ao catálogo.</p>
          <button onClick={() => { try { document.body.style.cssText = ""; } catch { /* nada */ } window.location.href = window.location.pathname; }}
            style={{ padding: "14px 28px", borderRadius: 999, border: "none", background: C.ouro, color: C.carvao, fontSize: 15, fontWeight: 700 }}>
            Voltar ao catálogo
          </button>
        </div>
      </div>
    );
  }
}

export default function Catalog() {
  return (
    <Guarda>
      <style>{CSS}</style>
      <Vitrine />
    </Guarda>
  );
}

/* ---------------------------------------------------------------------
   Contas do produto
   --------------------------------------------------------------------- */
const temPreco = (p, c) => c.mostrar_precos && Number(p.preco) > 0;
const desconto = (p) => (Number(p.preco_antigo) > Number(p.preco) && Number(p.preco) > 0
  ? Math.round((1 - Number(p.preco) / Number(p.preco_antigo)) * 100) : 0);
/* as especificações que a categoria pede, na ordem dela, só as preenchidas */
function especificacoes(p, cat) {
  const campos = (cat && Array.isArray(cat.campos) ? cat.campos : []);
  const s = p.specs || {};
  return campos.map((f) => {
    let v = s[f.chave];
    if (f.tipo === "simnao") v = v === true ? "Sim" : v === false ? "Não" : "";
    return { rotulo: f.rotulo, valor: Array.isArray(v) ? v.join(", ") : String(v || "").trim() };
  }).filter((x) => x.valor);
}
const linkDoProduto = (id) => `${window.location.origin}/catalogo?p=${id}`;

/* =====================================================================
   A VITRINE
   ===================================================================== */
function Vitrine() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [sacola, setSacola] = useState(() => { try { return JSON.parse(localStorage.getItem("vt_sacola") || "[]"); } catch { return []; } });
  const [fichaId, setFichaId] = useState(null);
  const [verSacola, setVerSacola] = useState(false);
  const [verForm, setVerForm] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativa, setAtiva] = useState("");

  const carregar = () => {
    setErro(false);
    api.carregarCatalogo().then(setDados).catch(() => setErro(true));
  };
  useEffect(() => { carregar(); api.logCatalogVisit(); }, []);
  useEffect(() => { try { localStorage.setItem("vt_sacola", JSON.stringify(sacola)); } catch { /* nada */ } }, [sacola]);

  const c = useMemo(() => mesclarConfig(dados && dados.config), [dados]);
  const categorias = (dados && dados.categorias) || [];
  const catDe = (id) => categorias.find((x) => x.id === id);

  /* produto esgotado só aparece se a dona quiser (Ajustes) */
  const produtos = useMemo(() => {
    const l = (dados && dados.produtos) || [];
    return c.esconder_esgotados ? l.filter((p) => p.disponivel) : l;
  }, [dados, c.esconder_esgotados]);

  /* categorias na ordem do app, só as que têm produto para mostrar */
  const comProduto = useMemo(() => categorias.filter((k) => produtos.some((p) => p.categoria_id === k.id)), [categorias, produtos]);

  const achados = useMemo(() => {
    const b = normalizar(busca);
    if (!b) return null;
    return produtos.filter((p) => normalizar([p.nome, p.marca, p.codigo, p.descricao, Object.values(p.specs || {}).join(" ")].join(" ")).includes(b));
  }, [busca, produtos]);

  /* link direto para um produto: /catalogo?p=<id> */
  useEffect(() => {
    if (!dados) return;
    const id = new URLSearchParams(window.location.search).get("p");
    if (id && dados.produtos.some((p) => p.id === id)) setFichaId(id);
  }, [dados]);
  const fecharFicha = () => {
    setFichaId(null);
    if (new URLSearchParams(window.location.search).get("p")) {
      setTimeout(() => { try { window.history.replaceState(window.history.state, "", window.location.pathname); } catch { /* nada */ } }, 150);
    }
  };

  /* marca na barra a categoria que está na tela */
  useEffect(() => {
    if (!comProduto.length) return;
    const aoRolar = () => {
      let atual = "";
      comProduto.forEach((k) => {
        const el = document.getElementById("cat-" + k.slug);
        if (el && el.getBoundingClientRect().top <= 150) atual = k.id;
      });
      setAtiva(atual);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    return () => window.removeEventListener("scroll", aoRolar);
  }, [comProduto]);

  const irPara = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
  };

  const naSacola = (id) => sacola.some((i) => i.id === id);
  const adicionar = (p) => {
    if (naSacola(p.id)) return;
    setSacola((s) => [...s, { id: p.id, nome: p.nome, marca: p.marca || "", codigo: p.codigo || "", preco: Number(p.preco) || 0, foto: (p.fotos || [])[0] || "" }]);
  };
  const remover = (id) => setSacola((s) => s.filter((i) => i.id !== id));

  /* abre a sacola e, ao tocar em continuar, o formulário */
  const irParaFormulario = () => { setVerSacola(false); setTimeout(() => setVerForm(true), 260); };

  const ficha = fichaId && dados ? dados.produtos.find((p) => p.id === fichaId) : null;
  const zapGeral = linkWhats(c.whatsapp, c.msg_geral);

  return (
    <div style={{ fontFamily: FONT, background: C.creme, color: C.tinta, minHeight: "100vh" }}>
      <Abertura c={c} irColecao={() => irPara("colecao")} />
      <Apresentacao c={c} />
      <ComoFunciona />

      <section id="colecao" style={{ padding: "64px 0 30px", scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px" }}>
          <Revela>
            <Titulo sobre="Coleção Vértice" sub="Toque no produto para ver as fotos e os detalhes. Gostou? Coloque na sacola.">
              Escolha o seu <span className="vt-dourado">estilo</span>
            </Titulo>
          </Revela>
        </div>

        {/* barra fixa das categorias, com busca */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(247,243,236,.92)", backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)", borderTop: `1px solid ${C.linha}`, borderBottom: `1px solid ${C.linha}` }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ position: "relative", flex: "0 1 230px", minWidth: 0 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.suave, display: "flex" }}>{ICONES.busca}</span>
              <input className="vt-campo" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar"
                style={{ padding: "9px 12px 9px 38px", borderRadius: 999, fontSize: 14 }} aria-label="Buscar no catálogo" />
            </label>
            {!busca && comProduto.length > 1 && (
              <div className="vt-chips" style={{ flex: "1 1 auto", minWidth: 0 }}>
                {comProduto.map((k) => {
                  const on = ativa === k.id;
                  return (
                    <button key={k.id} onClick={() => irPara("cat-" + k.slug)} className="vt-toque" style={{
                      flex: "0 0 auto", padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${on ? C.ardosia : C.linha}`, background: on ? C.ardosia : "#fff", color: on ? C.ouroClaro : C.texto,
                    }}>{k.nome}</button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px" }}>
          {!dados && !erro && <Carregando />}
          {erro && (
            <div style={{ textAlign: "center", padding: "50px 10px" }}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>Não conseguimos abrir o catálogo agora.</div>
              <Botao onClick={carregar}>Tentar de novo</Botao>
            </div>
          )}

          {dados && achados && (
            <div style={{ paddingTop: 30 }}>
              <div style={{ fontSize: 14, color: C.suave, marginBottom: 16 }}>
                {achados.length ? `${achados.length} resultado${achados.length > 1 ? "s" : ""} para “${busca}”` : `Nada encontrado para “${busca}”.`}
              </div>
              <Grade lista={achados} c={c} catDe={catDe} naSacola={naSacola} adicionar={adicionar} abrir={setFichaId} />
            </div>
          )}

          {dados && !achados && comProduto.length === 0 && <ColecaoVazia zap={zapGeral} />}

          {dados && !achados && comProduto.map((k) => (
            <section key={k.id} id={"cat-" + k.slug} style={{ paddingTop: 46, scrollMarginTop: 70 }}>
              <Revela>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.sobretitulo}>{String(produtos.filter((p) => p.categoria_id === k.id).length).padStart(2, "0")} modelos</div>
                    <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(24px, 5.4vw, 32px)", margin: "6px 0 0", letterSpacing: 0.6 }}>{k.nome}</h3>
                    {k.descricao && <p style={{ margin: "8px 0 0", color: C.texto, fontSize: 14.5, lineHeight: 1.6, maxWidth: 640 }}>{k.descricao}</p>}
                  </div>
                </div>
              </Revela>
              <Grade lista={produtos.filter((p) => p.categoria_id === k.id)} c={c} catDe={catDe} naSacola={naSacola} adicionar={adicionar} abrir={setFichaId} />
            </section>
          ))}

          {dados && comProduto.length > 0 && (
            <Revela>
              <div style={{ textAlign: "center", margin: "64px auto 10px", maxWidth: 520 }}>
                <div className="vt-fio" style={{ width: 60, margin: "0 auto 20px" }} />
                <div style={{ fontFamily: SERIF, fontSize: 20, marginBottom: 8 }}>Não achou o que procurava?</div>
                <div style={{ color: C.texto, fontSize: 14.5, lineHeight: 1.65, marginBottom: 18 }}>
                  Temos mais modelos na loja e chegam novidades toda semana. Fale com a gente.
                </div>
                <Botao tipo="zap" href={zapGeral} icone={ICONES.whats}>Falar no WhatsApp</Botao>
              </div>
            </Revela>
          )}
        </div>
      </section>

      <Orcamento abrir={() => setVerForm(true)} />
      <Visite c={c} />
      <Rodape c={c} />

      {/* sacola flutuante */}
      <button onClick={() => setVerSacola(true)} className="vt-toque" aria-label={`Sacola com ${sacola.length} item(ns)`} style={{
        position: "fixed", right: 16, bottom: "calc(18px + env(safe-area-inset-bottom,0px))", zIndex: 50,
        display: "flex", alignItems: "center", gap: 10, padding: "13px 18px 13px 16px", borderRadius: 999,
        border: "1px solid rgba(233,210,159,.4)", background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, color: C.ouroClaro,
        fontSize: 14.5, fontWeight: 700, boxShadow: "0 14px 34px rgba(0,0,0,.35)",
        animation: sacola.length ? "vtFlutua 2.6s ease-in-out infinite" : "none",
      }}>
        {ICONES.sacola}
        Sacola
        <span style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 999, background: C.ouro, color: C.carvao, fontSize: 13, display: "grid", placeItems: "center" }}>{sacola.length}</span>
      </button>

      <Ficha p={ficha} c={c} cat={ficha ? catDe(ficha.categoria_id) : null} aoFechar={fecharFicha}
        naSacola={ficha ? naSacola(ficha.id) : false} adicionar={adicionar} verSacola={() => { fecharFicha(); setTimeout(() => setVerSacola(true), 260); }} />

      <Sacola aberto={verSacola} aoFechar={() => setVerSacola(false)} itens={sacola} c={c} remover={remover}
        continuar={irParaFormulario} />

      <Formulario aberto={verForm} aoFechar={() => setVerForm(false)} c={c} itens={sacola}
        esvaziar={() => setSacola([])} />
    </div>
  );
}

function Carregando() {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "60px 0", gap: 14, color: C.suave }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${C.linha}`, borderTopColor: C.ouro, animation: "vtGira .8s linear infinite" }} />
      <div style={{ fontSize: 14 }}>Preparando a coleção…</div>
    </div>
  );
}

function ColecaoVazia({ zap }) {
  return (
    <Revela>
      <div style={{ textAlign: "center", padding: "54px 18px", margin: "34px auto 0", maxWidth: 560, background: "#fff",
        border: `1px solid ${C.linha}`, borderRadius: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><OculosDesenho largura="120px" /></div>
        <div style={{ fontFamily: SERIF, fontSize: 21, marginBottom: 10 }}>A coleção está chegando</div>
        <div style={{ color: C.texto, fontSize: 14.5, lineHeight: 1.65, marginBottom: 20 }}>
          Estamos fotografando as novas armações. Enquanto isso, fale com a gente pelo WhatsApp ou peça seu orçamento logo abaixo.
        </div>
        <Botao tipo="zap" href={zap} icone={ICONES.whats}>Falar no WhatsApp</Botao>
      </div>
    </Revela>
  );
}

/* ---------------------------------------------------------------------
   Abertura: a logo como ela é e, ao lado (embaixo no celular), as fotos da loja num arco
   --------------------------------------------------------------------- */
function Abertura({ c, irColecao }) {
  const deAjustes = c.fotos_abertura || [];
  const [doStorage, setDoStorage] = useState([]);
  /* sem fotos em Ajustes: confere quais ABERTURA0x.jpg existem no Storage (a que não existe é ignorada) */
  useEffect(() => {
    if (deAjustes.length) return;
    let vivo = true;
    Promise.all(ABERTURA_STORAGE.map((src) => new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(src);
      img.onerror = () => ok(null);
      img.src = src;
    }))).then((l) => { if (vivo) setDoStorage(l.filter(Boolean)); });
    return () => { vivo = false; };
  }, [deAjustes.length]);
  const fotos = deAjustes.length ? deAjustes : doStorage;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (fotos.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % fotos.length), 2200);
    return () => clearInterval(t);
  }, [fotos.length]);

  const larga = useTelaLarga();
  const temFotos = fotos.length > 0;

  return (
    <section className="alto" style={{ position: "relative", overflow: "hidden", background: C.carvao, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* fundo: a própria pedra da logo, desfocada */}
      <div style={{ position: "absolute", top: "-10%", right: "-10%", bottom: "-10%", left: "-10%", backgroundImage: `url("${LOGO}")`,
        backgroundSize: "cover", backgroundPosition: "center", filter: "blur(38px) brightness(.5) saturate(1.1)", transform: "scale(1.15)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
        background: "radial-gradient(90% 70% at 50% 42%, rgba(21,22,24,.1), rgba(21,22,24,.8) 80%)" }} />
      <div style={{ position: "absolute", top: 14, right: 14, bottom: 14, left: 14, border: "1px solid rgba(201,163,91,.28)", borderRadius: 26, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: temFotos ? 1180 : 760, display: "grid",
        gridTemplateColumns: temFotos && larga ? "1.15fr .85fr" : "1fr", gap: larga ? 64 : 38, alignItems: "center",
        padding: `calc(${larga ? 64 : 52}px + env(safe-area-inset-top,0px)) 22px ${temFotos && !larga ? 64 : 96}px`, animation: "vtFade 1.2s ease both" }}>
        {/* a logo exatamente como veio */}
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22 }}>
            <span style={{ width: 22, height: 1, background: C.ouro, flex: "0 0 22px" }} />
            <span style={{ fontSize: "clamp(9.5px, 2.6vw, 11px)", letterSpacing: "clamp(2.5px, 1vw, 5px)", color: C.ouroClaro, textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>Uberlândia · Shopping Park</span>
            <span style={{ width: 22, height: 1, background: C.ouro, flex: "0 0 22px" }} />
          </div>
          <div style={{ position: "relative", width: "min(100%, 560px)", margin: "0 auto" }}>
            <div style={{ position: "absolute", left: "8%", right: "8%", top: "10%", bottom: "10%", borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(233,210,159,.28), transparent)", filter: "blur(30px)" }} />
            <img src={LOGO} alt={c.nome} width="1000" height="768" style={{ position: "relative", display: "block", width: "100%", height: "auto",
              borderRadius: 20, boxShadow: "0 40px 90px rgba(0,0,0,.65), 0 0 0 1px rgba(201,163,91,.35)" }} />
          </div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 500, color: C.creme, fontSize: "clamp(22px, 5.2vw, 34px)", lineHeight: 1.3,
            letterSpacing: 0.8, margin: "32px auto 0", maxWidth: 620, textWrap: "balance" }}>{c.frase}</h1>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
            <Botao tipo="ouro" onClick={irColecao}>Ver a coleção</Botao>
            <Botao tipo="linhaClara" href={linkWhats(c.whatsapp, c.msg_geral)} icone={ICONES.whats}>WhatsApp</Botao>
          </div>
        </div>

        {/* as fotos da loja, numa moldura em arco, claras e sem nada por cima */}
        {temFotos && (
          <div style={{ position: "relative", width: larga ? "100%" : "min(84%, 380px)", maxWidth: 440, margin: "0 auto" }}>
            <div style={{ position: "absolute", top: -11, right: -11, bottom: -11, left: -11, borderRadius: "999px 999px 32px 32px",
              border: "1px solid rgba(201,163,91,.5)", pointerEvents: "none" }} />
            <div style={{ position: "relative", paddingTop: "125%", borderRadius: "999px 999px 24px 24px", overflow: "hidden", background: C.ardosia,
              boxShadow: "0 40px 90px rgba(0,0,0,.6)", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}>
              {fotos.map((src, k) => (
                <div key={src} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundImage: `url("${src}")`,
                  backgroundSize: "cover", backgroundPosition: "center 30%", opacity: k === i ? 1 : 0, transition: "opacity .75s ease",
                  animation: k === i ? `${k % 2 ? "vtZoomB" : "vtZoomA"} 7s ease-out both` : "none" }} />
              ))}
              <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, boxShadow: "inset 0 0 0 1px rgba(233,210,159,.25)",
                borderRadius: "999px 999px 24px 24px", pointerEvents: "none" }} />
            </div>
            {fotos.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 22 }}>
                {fotos.map((_, k) => (
                  <span key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 999, background: k === i ? C.ouro : "rgba(233,210,159,.3)", transition: "all .5s" }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!temFotos && (
        <button onClick={irColecao} aria-label="Descer para a coleção" style={{ position: "absolute", bottom: "calc(26px + env(safe-area-inset-bottom,0px))",
          left: "50%", marginLeft: -22, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(201,163,91,.45)", background: "transparent",
          color: C.ouroClaro, display: "grid", placeItems: "center", animation: "vtFlutua 2.4s ease-in-out infinite", zIndex: 2 }}>{ICONES.baixo}</button>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------
   Apresentação: quem é a Vértice, em quatro quadros
   --------------------------------------------------------------------- */
function Apresentacao({ c }) {
  return (
    <section style={{ padding: "74px 16px 30px", background: C.creme }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <Revela>
          <Titulo sobre="Seja bem-vindo" sub={c.boas_vindas}>
            Seu olhar merece <span className="vt-dourado">precisão</span> e estilo
          </Titulo>
        </Revela>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 158px), 1fr))", gap: 12 }}>
          {c.quadros.slice(0, 4).map((q, k) => (
            <Revela key={k} atraso={k * 110}>
              <div style={{ height: "100%", background: "#fff", border: `1px solid ${C.linha}`, borderRadius: 20, padding: "clamp(16px, 4vw, 24px)",
                boxShadow: "0 14px 34px rgba(30,31,34,.05)", borderTop: `2px solid ${C.ouro}` }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", display: "grid", placeItems: "center",
                  color: C.ouroEsc, background: `linear-gradient(150deg, ${C.ouroSuave}, #fff)`, border: `1px solid rgba(201,163,91,.4)`, marginBottom: 14 }}>
                  {ICONES_QUADROS[k % ICONES_QUADROS.length]}
                </div>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(14px, 3.8vw, 16.5px)", letterSpacing: 0.3, lineHeight: 1.3, marginBottom: 7 }}>{q.t}</div>
                <div style={{ fontSize: "clamp(12.5px, 3.4vw, 14px)", lineHeight: 1.55, color: C.texto }}>{q.d}</div>
              </div>
            </Revela>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const passos = [
    ["Escolha", "Navegue pela coleção e coloque na sacola as armações que mais gostar."],
    ["Conte", "Diga se já tem a receita, se já usa óculos e a sua idade. Leva um minuto."],
    ["Finalize", "Envie pelo WhatsApp. A gente responde com o orçamento e marca o seu horário."],
  ];
  return (
    <section style={{ padding: "44px 16px 10px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, borderRadius: 28,
        padding: "40px 22px", color: C.creme, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -80, top: -80, width: 260, height: 260, borderRadius: "50%", border: "1px solid rgba(201,163,91,.18)" }} />
        <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(201,163,91,.12)" }} />
        <Revela>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ ...S.sobretitulo, color: C.ouro }}>Como funciona</div>
            <div style={{ fontFamily: SERIF, fontSize: "clamp(22px, 5vw, 30px)", marginTop: 10, letterSpacing: 0.5 }}>Simples assim, em três passos</div>
          </div>
        </Revela>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22, position: "relative" }}>
          {passos.map(([t, d], k) => (
            <Revela key={t} atraso={k * 130}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 52px", height: 52, borderRadius: "50%", border: `1px solid ${C.ouro}`, display: "grid", placeItems: "center",
                  fontFamily: SERIF, fontSize: 20, color: C.ouroClaro }}>{["I", "II", "III"][k]}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 17, letterSpacing: 0.6, color: C.ouroClaro, marginBottom: 5 }}>{t}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(247,243,236,.78)" }}>{d}</div>
                </div>
              </div>
            </Revela>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------
   Cartões de produto
   --------------------------------------------------------------------- */
function Grade({ lista, c, catDe, naSacola, adicionar, abrir }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 43vw), 1fr))", gap: 14 }}>
      {lista.map((p, k) => (
        <Revela key={p.id} atraso={(k % 4) * 80}>
          <Cartao p={p} c={c} cat={catDe(p.categoria_id)} tem={naSacola(p.id)} adicionar={adicionar} abrir={() => abrir(p.id)} />
        </Revela>
      ))}
    </div>
  );
}

function Preco({ p, c, grande }) {
  if (!temPreco(p, c)) {
    return <div style={{ fontSize: grande ? 16 : 13.5, fontWeight: 600, color: C.ouroEsc }}>Consulte o valor</div>;
  }
  const d = desconto(p);
  return (
    <div>
      {d > 0 && (
        <div style={{ fontSize: grande ? 14 : 12, color: C.suave, display: "flex", gap: 8, alignItems: "center" }}>
          <s>{dinheiro(p.preco_antigo)}</s>
          <span style={{ color: C.verde, fontWeight: 700 }}>-{d}%</span>
        </div>
      )}
      <div style={{ fontSize: grande ? "clamp(26px, 6vw, 32px)" : "clamp(16px, 4.4vw, 19px)", fontWeight: 700, color: C.tinta,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: -0.2 }}>{dinheiro(p.preco)}</div>
      {Number(c.parcelas) > 1 && (
        <div style={{ fontSize: grande ? 13.5 : 11.5, color: C.suave, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {grande ? "ou em até " : ""}{c.parcelas}x de {dinheiro(Number(p.preco) / Number(c.parcelas))}{grande ? " no cartão" : ""}
        </div>
      )}
    </div>
  );
}

function Cartao({ p, c, cat, tem, adicionar, abrir }) {
  const foto = (p.fotos || [])[0];
  const specs = especificacoes(p, cat).slice(0, 3).map((s) => s.valor).join(" · ");
  const d = desconto(p);
  return (
    <div className="vt-card" style={{ height: "100%", background: "#fff", borderRadius: 18, overflow: "hidden", border: `1px solid ${C.linha}`,
      display: "flex", flexDirection: "column", boxShadow: "0 8px 22px rgba(30,31,34,.05)" }}>
      <button onClick={abrir} aria-label={`Ver ${p.nome}`} className="vt-foto"
        style={{ position: "relative", display: "block", width: "100%", padding: "100% 0 0", border: "none", overflow: "hidden",
          background: `radial-gradient(120% 90% at 50% 30%, #fff, ${C.papel})` }}>
        <span style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {foto
            ? <img src={foto} alt={p.nome} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <OculosDesenho />}
        </span>
        <span style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {p.novo && <Etiqueta>Novo</Etiqueta>}
          {d > 0 && <Etiqueta cor={C.verde}>-{d}%</Etiqueta>}
          {!p.disponivel && <Etiqueta cor={C.pedra}>Esgotado</Etiqueta>}
        </span>
        {(p.fotos || []).length > 1 && (
          <span style={{ position: "absolute", bottom: 9, right: 9, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(21,22,24,.55)",
            padding: "3px 8px", borderRadius: 999 }}>{p.fotos.length} fotos</span>
        )}
      </button>

      <div style={{ padding: "13px 13px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
        <div onClick={abrir} style={{ cursor: "pointer", minWidth: 0 }}>
          {p.marca && <div style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: "uppercase", color: C.ouroEsc, fontWeight: 700, marginBottom: 3,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.marca}</div>}
          <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3, color: C.tinta }}>{p.nome}</div>
          {specs && <div style={{ fontSize: 12, color: C.suave, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{specs}</div>}
        </div>
        <div style={{ marginTop: "auto" }}><Preco p={p} c={c} /></div>
        <button onClick={() => (p.disponivel ? (tem ? abrir() : adicionar(p)) : abrir())} className="vt-toque" style={{
          width: "100%", marginTop: 2, padding: "11px 8px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3,
          border: `1px solid ${tem ? C.verde : C.ardosia}`, background: tem ? "#EAF5EE" : C.ardosia, color: tem ? C.verde : C.ouroClaro,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: p.disponivel ? 1 : 0.55,
        }}>
          {tem ? <>{ICONES.check} Na sacola</> : p.disponivel ? "Adicionar à sacola" : "Esgotado"}
        </button>
      </div>
    </div>
  );
}

function Etiqueta({ children, cor = C.ardosia }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: cor === C.ardosia ? C.ouroClaro : "#fff",
      background: cor, padding: "4px 9px", borderRadius: 999 }}>{children}</span>
  );
}

/* ---------------------------------------------------------------------
   Galeria: as fotos lado a lado, deslizando (nunca trocar o src de uma só)
   --------------------------------------------------------------------- */
function Galeria({ fotos, nome, aoTocar }) {
  const [slide, setSlide] = useState(0);
  const toque = useRef(null);
  const n = fotos.length;
  const vai = (d) => setSlide((s) => (s + d + n) % n);

  if (!n) {
    return (
      <div style={{ position: "relative", paddingTop: "78%", borderRadius: 18, background: `radial-gradient(120% 90% at 50% 30%, #fff, ${C.papel})` }}>
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><OculosDesenho largura="58%" /></div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ position: "relative", paddingTop: "100%", overflow: "hidden", borderRadius: 18, background: C.papel }}
        onTouchStart={(e) => { const t = e.touches[0]; toque.current = { x: t.clientX, y: t.clientY, moveu: false }; }}
        onTouchMove={(e) => {
          const t0 = toque.current; if (!t0) return;
          const t = e.touches[0];
          if (Math.abs(t.clientX - t0.x) > Math.abs(t.clientY - t0.y) && Math.abs(t.clientX - t0.x) > 10) t0.moveu = true;
        }}
        onTouchEnd={(e) => {
          const t0 = toque.current; toque.current = null;
          if (!t0) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - t0.x, dy = t.clientY - t0.y;
          /* só conta o arrastar mais horizontal que vertical: senão dispara enquanto a pessoa rola a página */
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { vai(dx < 0 ? 1 : -1); e.preventDefault(); }
        }}>
        <div style={{ position: "absolute", top: 0, left: 0, display: "flex", width: "100%", height: "100%",
          transform: `translateX(-${slide * 100}%)`, transition: "transform .34s cubic-bezier(.2,.8,.2,1)" }}>
          {fotos.map((src, k) => (
            <div key={k} style={{ flex: "0 0 100%", height: "100%" }} onClick={() => aoTocar(k)}>
              <img src={src} alt={`${nome} — foto ${k + 1}`} loading={k === 0 ? "eager" : "lazy"} decoding="async" draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "zoom-in" }} />
            </div>
          ))}
        </div>
        <span style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#fff",
          background: "rgba(21,22,24,.55)", padding: "6px 10px", borderRadius: 999, pointerEvents: "none" }}>{ICONES.lupa} ampliar</span>
        {n > 1 && (
          <>
            <button onClick={() => vai(-1)} aria-label="Foto anterior" style={{ ...S.seta, left: 10 }}>{ICONES.esq}</button>
            <button onClick={() => vai(1)} aria-label="Próxima foto" style={{ ...S.seta, right: 10 }}>{ICONES.dir}</button>
          </>
        )}
      </div>
      {n > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
          {fotos.map((_, k) => (
            <button key={k} onClick={() => setSlide(k)} aria-label={`Foto ${k + 1}`} style={{ border: "none", background: "transparent", padding: 6 }}>
              <span style={{ display: "block", width: k === slide ? 22 : 8, height: 8, borderRadius: 999, background: k === slide ? C.ouro : C.linha, transition: "all .3s" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
S.seta = { position: "absolute", top: "50%", marginTop: -19, width: 38, height: 38, borderRadius: "50%", border: "none",
  background: "rgba(255,255,255,.88)", color: C.tinta, display: "grid", placeItems: "center", boxShadow: "0 6px 16px rgba(0,0,0,.18)" };

/* ---------------------------------------------------------------------
   Ficha do produto
   --------------------------------------------------------------------- */
function Ficha({ p, c, cat, aoFechar, naSacola, adicionar, verSacola }) {
  const [foto, setFoto] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const larga = useTelaLarga();
  useEffect(() => { setFoto(null); }, [p && p.id]);
  if (!p) return <Modal aberto={false} aoFechar={aoFechar} />;

  const specs = especificacoes(p, cat);
  const msg = aplicar(c.msg_duvida, { produto: p.nome, codigo: p.codigo ? `(cód. ${p.codigo})` : "", link: linkDoProduto(p.id) });
  const compartilhar = async () => {
    const url = linkDoProduto(p.id);
    try {
      if (navigator.share) { await navigator.share({ title: p.nome, text: `${p.nome} — ${c.nome}`, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopiado(true); setTimeout(() => setCopiado(false), 2200);
    } catch { /* a pessoa cancelou */ }
  };

  return (
    <Modal aberto={!!p} aoFechar={aoFechar} titulo={p.nome} sub={cat ? cat.nome : ""} largo
      rodape={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {p.disponivel ? (
            naSacola
              ? <Botao tipo="escuro" onClick={verSacola} icone={ICONES.check} style={{ flex: "1 1 180px" }}>Na sacola · ver sacola</Botao>
              : <Botao tipo="ouro" onClick={() => adicionar(p)} icone={ICONES.sacola} style={{ flex: "1 1 180px" }}>Adicionar à sacola</Botao>
          ) : (
            <Botao tipo="escuro" disabled style={{ flex: "1 1 180px" }}>Esgotado no momento</Botao>
          )}
          <Botao tipo="zap" href={linkWhats(c.whatsapp, msg)} icone={ICONES.whats} style={{ flex: "1 1 150px" }}>Tirar dúvida</Botao>
        </div>
      }>
      <div style={{ display: "grid", gridTemplateColumns: larga ? "1.05fr 1fr" : "1fr", gap: larga ? 28 : 18, alignItems: "start" }}>
        <Galeria fotos={p.fotos || []} nome={p.nome} aoTocar={setFoto} />

        <div style={{ minWidth: 0 }}>
          {p.marca && <div style={{ ...S.sobretitulo, letterSpacing: 3 }}>{p.marca}</div>}
          <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(24px, 5.6vw, 32px)", lineHeight: 1.2, margin: "8px 0 14px", letterSpacing: 0.4 }}>{p.nome}</h2>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
            {p.novo && <Etiqueta>Novo</Etiqueta>}
            {!p.disponivel && <Etiqueta cor={C.pedra}>Esgotado</Etiqueta>}
            {p.codigo && <span style={{ fontSize: 12, color: C.suave, alignSelf: "center" }}>Código {p.codigo}</span>}
          </div>
          <Preco p={p} c={c} grande />

          {specs.length > 0 && (
            <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${C.linha}`, borderRadius: 16, overflow: "hidden" }}>
              {specs.map((s, k) => (
                <div key={s.rotulo} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "12px 15px", fontSize: 14,
                  borderTop: k ? `1px solid ${C.linha}` : "none" }}>
                  <span style={{ color: C.suave }}>{s.rotulo}</span>
                  <b style={{ fontWeight: 600, textAlign: "right", minWidth: 0 }}>{s.valor}</b>
                </div>
              ))}
            </div>
          )}

          {p.descricao && <p style={{ fontSize: 15, lineHeight: 1.7, color: C.texto, margin: "18px 0 0", whiteSpace: "pre-line" }}>{p.descricao}</p>}

          <div style={{ marginTop: 18, padding: "14px 15px", borderRadius: 16, background: C.ouroSuave, border: "1px solid rgba(201,163,91,.35)",
            fontSize: 13.5, lineHeight: 1.6, color: C.texto }}>
            <b style={{ color: C.tinta }}>Lentes à parte, conforme a sua receita.</b> No final você conta se já tem a receita e a gente indica a lente certa.
          </div>

          <button onClick={compartilhar} className="vt-toque" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, border: "none",
            background: "transparent", color: C.ouroEsc, fontWeight: 700, fontSize: 13.5, padding: "8px 0" }}>
            {ICONES.compartilhar}{copiado ? "Link copiado" : "Compartilhar este modelo"}
          </button>
        </div>
      </div>

      {foto !== null && <Lupa fotos={p.fotos} inicial={foto} nome={p.nome} aoFechar={() => setFoto(null)} />}
    </Modal>
  );
}

/* Foto em tela cheia. Simples de propósito: um nível de ampliação, usando a
   rolagem do próprio navegador. Sem pinça e sem transform calculado, que
   travava a tela em alguns celulares. */
function Lupa({ fotos, inicial = 0, nome, aoFechar }) {
  const [i, setI] = useState(inicial || 0);
  const [ampliado, setAmpliado] = useState(false);
  const area = useRef(null);
  useVoltar(true, aoFechar);
  useTravaFundo(true);

  useEffect(() => {
    const barra = (e) => e.preventDefault();
    document.addEventListener("gesturestart", barra, { passive: false });
    return () => document.removeEventListener("gesturestart", barra);
  }, []);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    if (ampliado) { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; }
    else { el.scrollLeft = 0; el.scrollTop = 0; }
  }, [ampliado, i]);

  const trocar = (d) => { setAmpliado(false); setI((k) => (k + d + fotos.length) % fotos.length); };
  const bt = { minWidth: 46, height: 46, padding: "0 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.3)", background: "rgba(0,0,0,.5)",
    color: "#fff", fontSize: 14.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 };
  const red = { ...bt, width: 46, padding: 0 };

  return createPortal(
    <div className="tela" style={{ zIndex: 200, background: "#0E0E10", animation: "vtFade .2s ease", fontFamily: FONT }}>
      <div ref={area} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: ampliado ? "auto" : "hidden",
        WebkitOverflowScrolling: "touch", display: ampliado ? "block" : "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={fotos[i]} alt={nome} draggable={false}
          style={ampliado ? { width: "220%", maxWidth: "none", display: "block" } : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 10,
        padding: "calc(10px + env(safe-area-inset-top,0px)) 12px 14px", background: "linear-gradient(180deg,rgba(0,0,0,.6),transparent)" }}>
        <button onClick={aoFechar} aria-label="Fechar foto" style={red}>{ICONES.voltar}</button>
        <div style={{ color: "#fff", fontSize: 14.5, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>
        {fotos.length > 1 && <div style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>{i + 1}/{fotos.length}</div>}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "calc(20px + env(safe-area-inset-bottom,0px))", display: "flex", justifyContent: "center", gap: 10 }}>
        {fotos.length > 1 && <button onClick={() => trocar(-1)} aria-label="Foto anterior" style={red}>{ICONES.esq}</button>}
        <button onClick={() => setAmpliado((v) => !v)} style={bt}>{ampliado ? "Reduzir" : <>{ICONES.lupa} Ampliar</>}</button>
        {fotos.length > 1 && <button onClick={() => trocar(1)} aria-label="Próxima foto" style={red}>{ICONES.dir}</button>}
      </div>
    </div>,
    document.body
  );
}

/* ---------------------------------------------------------------------
   Sacola
   --------------------------------------------------------------------- */
function Sacola({ aberto, aoFechar, itens, c, remover, continuar }) {
  const total = itens.reduce((s, i) => s + (Number(i.preco) || 0), 0);
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Sua sacola" sub={itens.length ? `${itens.length} modelo${itens.length > 1 ? "s" : ""}` : "Vazia"}
      rodape={
        <div style={{ display: "grid", gap: 8 }}>
          <Botao tipo="ouro" cheio onClick={continuar}>{itens.length ? "Continuar" : "Pedir orçamento sem escolher armação"}</Botao>
          <Botao tipo="linha" cheio onClick={aoFechar}>Ver mais modelos</Botao>
        </div>
      }>
      {itens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 10px", color: C.texto }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><OculosDesenho largura="110px" /></div>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.tinta, marginBottom: 8 }}>Sua sacola está vazia</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>Toque em “Adicionar à sacola” nos modelos de que gostar. Se preferir, peça o orçamento direto.</div>
        </div>
      ) : (
        <>
          <div style={{ background: "#fff", border: `1px solid ${C.linha}`, borderRadius: 18, overflow: "hidden" }}>
            {itens.map((i, k) => (
              <div key={i.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderTop: k ? `1px solid ${C.linha}` : "none", minWidth: 0 }}>
                <div style={{ width: 62, height: 62, flex: "0 0 62px", borderRadius: 12, overflow: "hidden", background: C.papel, display: "grid", placeItems: "center" }}>
                  {i.foto ? <img src={i.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <OculosDesenho largura="80%" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {i.marca && <div style={{ fontSize: 10.5, letterSpacing: 2, color: C.ouroEsc, fontWeight: 700, textTransform: "uppercase" }}>{i.marca}</div>}
                  <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>{i.nome}</div>
                  <div style={{ fontSize: 13, color: C.suave, marginTop: 2 }}>
                    {c.mostrar_precos && i.preco > 0 ? dinheiro(i.preco) : "Consulte o valor"}{i.codigo ? ` · ${i.codigo}` : ""}
                  </div>
                </div>
                <button onClick={() => remover(i.id)} aria-label={`Tirar ${i.nome} da sacola`} style={{ ...S.btnIcone, color: C.vermelho }}>{ICONES.lixo}</button>
              </div>
            ))}
          </div>
          {c.mostrar_precos && total > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, margin: "18px 4px 6px" }}>
              <span style={{ color: C.texto, fontSize: 15 }}>Total dos modelos</span>
              <span style={{ fontSize: "clamp(20px, 6vw, 26px)", fontWeight: 700, whiteSpace: "nowrap" }}>{dinheiro(total)}</span>
            </div>
          )}
          <div style={{ fontSize: 13, color: C.suave, lineHeight: 1.6, margin: "8px 4px 0" }}>
            As lentes são orçadas à parte, conforme a sua receita. No próximo passo você conta um pouco sobre ela.
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Formulário da ótica (as perguntas vêm de Ajustes → Formulário)
   --------------------------------------------------------------------- */
function Pergunta({ n, p, valor, mudar, falta, c }) {
  const opcao = (op) => {
    const on = valor === op;
    return (
      <button key={op} type="button" onClick={() => mudar(on && !p.obrigatoria ? "" : op)} className="vt-toque" style={{
        width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 14, minWidth: 0,
        border: `1.5px solid ${on ? C.ouro : C.linha}`, background: on ? C.ouroSuave : "#fff", color: C.tinta, fontSize: 14.5, fontWeight: on ? 700 : 500,
      }}>
        <span style={{ flex: "0 0 20px", height: 20, borderRadius: "50%", border: `1.5px solid ${on ? C.ouroEsc : "#CFC6B6"}`, display: "grid", placeItems: "center" }}>
          {on && <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.ouroEsc }} />}
        </span>
        <span style={{ minWidth: 0 }}>{op}</span>
      </button>
    );
  };
  return (
    <div id={`perg-${p.id}`} style={{ background: "#fff", border: `1.5px solid ${falta ? C.vermelho : C.linha}`, borderRadius: 18, padding: "16px 15px", scrollMarginTop: 20 }}>
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ flex: "0 0 28px", height: 28, borderRadius: "50%", background: C.ardosia, color: C.ouroClaro, display: "grid", placeItems: "center",
          fontFamily: SERIF, fontSize: 13, fontWeight: 600 }}>{n}</span>
        <div style={{ minWidth: 0, paddingTop: 3 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>
            {p.titulo}{!p.obrigatoria && <span style={{ fontWeight: 500, color: C.suave, fontSize: 13 }}> (opcional)</span>}
          </div>
          {p.nota && <div style={{ fontSize: 12.5, color: C.suave, lineHeight: 1.5, marginTop: 4 }}>{p.nota}</div>}
        </div>
      </div>
      {(p.tipo === "opcoes" || p.tipo === "pagamento") && <div style={{ display: "grid", gap: 8 }}>{(p.opcoes || []).map(opcao)}</div>}
      {p.tipo === "texto" && <input className="vt-campo" value={valor || ""} onChange={(e) => mudar(e.target.value)} placeholder={p.exemplo || ""} autoComplete={p.id === "nome" ? "name" : "off"} />}
      {p.tipo === "numero" && <input className="vt-campo" inputMode="numeric" value={valor || ""} onChange={(e) => mudar(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder={p.exemplo || ""} />}
      {p.tipo === "textolongo" && <textarea className="vt-campo" rows={3} value={valor || ""} onChange={(e) => mudar(e.target.value)} placeholder={p.exemplo || ""} style={{ resize: "vertical", lineHeight: 1.5 }} />}
      {p.tipo === "pagamento" && ehPix(valor) && c.pix_chave && <CaixaPix c={c} />}
      {p.tipo === "pagamento" && Number(c.parcelas) > 1 && normalizar(valor).includes("credito") && (
        <div style={{ fontSize: 13, color: C.suave, marginTop: 10 }}>Parcelamos em até {c.parcelas}x no cartão de crédito.</div>
      )}
      {falta && <div style={{ color: C.vermelho, fontSize: 13, fontWeight: 600, marginTop: 10 }}>Responda esta pergunta para continuar.</div>}
    </div>
  );
}

function CaixaPix({ c }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(c.pix_chave); }
    catch {
      const t = document.createElement("textarea");
      t.value = c.pix_chave; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch { /* nada */ }
      document.body.removeChild(t);
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2400);
  };
  return (
    <div style={{ marginTop: 12, borderRadius: 16, padding: 16, background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, color: C.creme }}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: C.ouro, fontWeight: 700, textTransform: "uppercase" }}>Chave Pix{c.pix_tipo ? ` · ${c.pix_tipo}` : ""}</div>
      <div style={{ fontSize: "clamp(15px, 4.4vw, 18px)", fontWeight: 700, margin: "8px 0 4px", wordBreak: "break-all", color: C.ouroClaro }}>{c.pix_chave}</div>
      {c.pix_nome && <div style={{ fontSize: 13, opacity: 0.8 }}>{c.pix_nome}{c.pix_banco ? ` · ${c.pix_banco}` : ""}</div>}
      <Botao tipo="ouro" pequeno onClick={copiar} icone={copiado ? ICONES.check : ICONES.copiar} style={{ marginTop: 12 }}>{copiado ? "Chave copiada" : "Copiar chave"}</Botao>
      <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 10, lineHeight: 1.5 }}>
        O valor final é combinado no atendimento. Depois de pagar, mande o comprovante na conversa do WhatsApp.
      </div>
    </div>
  );
}

function Formulario({ aberto, aoFechar, c, itens, esvaziar }) {
  const [resp, setResp] = useState(() => { try { return JSON.parse(localStorage.getItem("vt_respostas") || "{}"); } catch { return {}; } });
  const [faltando, setFaltando] = useState([]);
  const [enviado, setEnviado] = useState(null);
  useEffect(() => { try { localStorage.setItem("vt_respostas", JSON.stringify(resp)); } catch { /* nada */ } }, [resp]);
  useEffect(() => { if (aberto) { setEnviado(null); setFaltando([]); } }, [aberto]);

  const visiveis = c.formulario.filter((p) => perguntaVisivel(p, resp));
  const mudar = (id, v) => { setResp((r) => ({ ...r, [id]: v })); setFaltando((f) => f.filter((x) => x !== id)); };

  const enviar = () => {
    const falta = visiveis.filter((p) => p.obrigatoria && !String(resp[p.id] || "").trim()).map((p) => p.id);
    setFaltando(falta);
    if (falta.length) {
      const el = document.getElementById(`perg-${falta[0]}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const msg = mensagemPedido(c, itens, resp, c.mostrar_precos);
    const url = linkWhats(c.whatsapp, msg);
    window.open(url, "_blank");
    setEnviado(url);
  };

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={enviado ? "Pedido enviado" : "Conte um pouco sobre você"}
      sub={enviado ? "" : itens.length ? `${itens.length} modelo${itens.length > 1 ? "s" : ""} na sacola` : "Orçamento e atendimento"}
      rodape={enviado ? (
        <div style={{ display: "grid", gap: 8 }}>
          {itens.length > 0 && <Botao tipo="escuro" cheio onClick={() => { esvaziar(); aoFechar(); }}>Esvaziar a sacola e voltar</Botao>}
          <Botao tipo="linha" cheio onClick={aoFechar}>Voltar ao catálogo</Botao>
        </div>
      ) : (
        <Botao tipo="zap" cheio onClick={enviar} icone={ICONES.whats}>Enviar pelo WhatsApp</Botao>
      )}>
      {enviado ? (
        <div style={{ textAlign: "center", padding: "26px 6px" }}>
          <div style={{ width: 74, height: 74, borderRadius: "50%", margin: "0 auto 18px", display: "grid", placeItems: "center",
            background: "#EAF5EE", color: C.verde }}>{svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, 38, { strokeWidth: 2.2 })}</div>
          <div style={{ fontFamily: SERIF, fontSize: 22, marginBottom: 10 }}>Obrigado!</div>
          <div style={{ fontSize: 15, lineHeight: 1.65, color: C.texto, maxWidth: 420, margin: "0 auto" }}>
            O WhatsApp abriu com a sua mensagem pronta. É só tocar em <b>enviar</b> por lá.
            {resp.receita && normalizar(resp.receita).startsWith("sim") && <> Aproveite e mande a <b>foto da receita</b> na mesma conversa.</>}
          </div>
          <a href={enviado} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 18, color: C.ouroEsc, fontWeight: 700, fontSize: 14 }}>
            O WhatsApp não abriu? Toque aqui
          </a>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14, color: C.texto, lineHeight: 1.6, padding: "0 2px 4px" }}>
            Assim a gente já responde com o orçamento certo para você. Leva menos de um minuto.
          </div>
          {visiveis.map((p, k) => (
            <Pergunta key={p.id} n={k + 1} p={p} valor={resp[p.id]} mudar={(v) => mudar(p.id, v)} falta={faltando.includes(p.id)} c={c} />
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Faixa de orçamento (para quem ainda não escolheu armação)
   --------------------------------------------------------------------- */
function Orcamento({ abrir }) {
  return (
    <section style={{ padding: "40px 16px 70px" }}>
      <Revela>
        <div style={{ maxWidth: 980, margin: "0 auto", borderRadius: 28, padding: "38px 24px", textAlign: "center", position: "relative", overflow: "hidden",
          background: `linear-gradient(135deg, ${C.ouroSuave}, #fff 60%)`, border: "1px solid rgba(201,163,91,.4)" }}>
          <div style={S.sobretitulo}>Receita na mão ou exame por fazer?</div>
          <div style={{ fontFamily: SERIF, fontSize: "clamp(22px, 5.4vw, 32px)", margin: "12px auto 12px", maxWidth: 640, lineHeight: 1.25, letterSpacing: 0.4 }}>
            Peça seu orçamento ou agende o exame de vista
          </div>
          <div style={{ fontSize: 15, color: C.texto, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 22px" }}>
            Não precisa escolher a armação agora. Responda algumas perguntas e a gente te orienta pelo WhatsApp.
          </div>
          <Botao tipo="escuro" onClick={abrir}>Pedir orçamento</Botao>
        </div>
      </Revela>
    </section>
  );
}

/* ---------------------------------------------------------------------
   Visite: a localização dentro de uma lente
   --------------------------------------------------------------------- */
function MapaDesenhado() {
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <rect width="400" height="400" fill="#23211d" />
      <g stroke="#3a352b" strokeWidth="14" fill="none" strokeLinecap="round">
        <path d="M-20 250 C80 230 160 210 420 160" />
        <path d="M120 -20 C140 120 170 260 150 420" />
        <path d="M-20 90 C120 110 260 70 420 100" strokeWidth="9" />
        <path d="M260 -20 C250 120 290 260 330 420" strokeWidth="9" />
      </g>
      <g stroke="#4a4436" strokeWidth="2" fill="none">
        <path d="M-20 250 C80 230 160 210 420 160" />
        <path d="M120 -20 C140 120 170 260 150 420" />
      </g>
      <rect x="168" y="168" width="118" height="78" rx="10" fill="#2c2820" stroke="#c9a35b" strokeOpacity=".45" />
      <text x="227" y="212" textAnchor="middle" fill="#c9a35b" fillOpacity=".75" fontFamily="Montserrat, sans-serif" fontSize="9" letterSpacing="2.5">SHOPPING PARK</text>
    </svg>
  );
}

function LenteMapa({ c, status }) {
  const caixa = useRef(null);
  const visivel = useVisivel(caixa);
  const [carregou, setCarregou] = useState(false);
  const src = `https://www.google.com/maps?q=${encodeURIComponent(c.mapa_busca)}&z=16&output=embed`;
  const R = 238;
  const anel = `${c.nome} · ${c.endereco} · ${c.bairro} · `.toUpperCase();

  const marcas = [];
  for (let k = 0; k < 120; k++) {
    const a = (k * 3 * Math.PI) / 180;
    const forte = k % 10 === 0, media = k % 5 === 0;
    const r1 = 297, r2 = r1 - (forte ? 16 : media ? 11 : 6);
    marcas.push(<line key={k} x1={300 + r1 * Math.cos(a)} y1={300 - r1 * Math.sin(a)} x2={300 + r2 * Math.cos(a)} y2={300 - r2 * Math.sin(a)}
      stroke={C.ouro} strokeOpacity={forte ? 0.9 : media ? 0.6 : 0.32} strokeWidth={forte ? 1.6 : 1} />);
  }
  const graus = [];
  [0, 30, 60, 90, 120, 150, 180].forEach((v) => {
    const a = (v * Math.PI) / 180;
    const props = { fill: C.ouroClaro, fillOpacity: 0.5, fontSize: 10, fontFamily: "Montserrat, sans-serif", textAnchor: "middle", dominantBaseline: "middle" };
    graus.push(<text key={`a${v}`} x={300 + 268 * Math.cos(a)} y={300 - 268 * Math.sin(a)} {...props}>{v}</text>);
    if (v !== 0 && v !== 180) graus.push(<text key={`b${v}`} x={300 + 268 * Math.cos(a)} y={300 + 268 * Math.sin(a)} {...props}>{v}</text>);
  });

  return (
    <div ref={caixa} style={{ position: "relative", width: "100%", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ position: "relative", width: "100%", paddingTop: "100%" }}>
        <div style={{ position: "absolute", top: "6%", right: "6%", bottom: "6%", left: "6%", borderRadius: "50%",
          boxShadow: "0 0 120px rgba(201,163,91,.22), 0 40px 80px rgba(0,0,0,.55)" }} />

        {/* o vidro com o mapa */}
        <div style={{ position: "absolute", top: "15%", left: "15%", width: "70%", height: "70%", borderRadius: "50%", overflow: "hidden",
          background: "#23211d", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}>
          <MapaDesenhado />
          {visivel && (
            <iframe title={`Mapa: ${c.nome}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1}
              onLoad={() => setCarregou(true)}
              style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", border: 0, pointerEvents: "none",
                opacity: carregou ? 1 : 0, transition: "opacity 1.2s ease",
                filter: "grayscale(1) sepia(.5) hue-rotate(-10deg) saturate(1.4) brightness(.62) contrast(1.15)" }} />
          )}
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderRadius: "50%",
            background: "radial-gradient(circle at 50% 50%, transparent 52%, rgba(14,14,16,.75) 100%)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,.06) 100%)" }} />
          {/* mira */}
          <div style={{ position: "absolute", top: "50%", left: "8%", right: "8%", height: 1, background: "rgba(233,210,159,.18)" }} />
          <div style={{ position: "absolute", left: "50%", top: "8%", bottom: "8%", width: 1, background: "rgba(233,210,159,.18)" }} />
        </div>

        {/* anel com a escala de graus e o endereço girando */}
        <svg viewBox="0 0 600 600" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }} aria-hidden="true">
          <defs>
            <path id="vtAnel" d={`M300,300 m-${R},0 a${R},${R} 0 1,1 ${R * 2},0 a${R},${R} 0 1,1 -${R * 2},0`} />
            <linearGradient id="vtAro" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F3DFA6" /><stop offset=".38" stopColor="#A67F35" /><stop offset=".68" stopColor="#E9CB88" /><stop offset="1" stopColor="#7E6128" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="298" fill="none" stroke={C.ouro} strokeOpacity=".35" />
          {marcas}
          {graus}
          <g style={{ transformOrigin: "300px 300px", animation: "vtGira 90s linear infinite" }}>
            <text fill={C.ouroClaro} fillOpacity=".85" fontSize="15" fontFamily="Montserrat, sans-serif" fontWeight="600" letterSpacing="3">
              <textPath href="#vtAnel" textLength={Math.round(2 * Math.PI * R) - 4} lengthAdjust="spacing">{anel}</textPath>
            </text>
          </g>
          <circle cx="300" cy="300" r="229" fill="none" stroke={C.ouro} strokeOpacity=".4" />
          <circle cx="300" cy="300" r="216" fill="none" stroke="url(#vtAro)" strokeWidth="10" />
          <circle cx="300" cy="300" r="210" fill="none" stroke="#0E0E10" strokeOpacity=".7" strokeWidth="2" />
        </svg>

        {/* o pino no centro, com as ondas */}
        <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none" }}>
          {[0, 1].map((k) => (
            <span key={k} style={{ position: "absolute", top: 0, left: 0, width: 70, height: 70, borderRadius: "50%", border: `1.5px solid ${C.ouroClaro}`,
              animation: `vtOnda 2.6s ease-out ${k * 1.3}s infinite` }} />
          ))}
          <svg viewBox="0 0 56 76" width="44" height="60" style={{ position: "absolute", left: -22, top: -58, filter: "drop-shadow(0 8px 10px rgba(0,0,0,.5))" }}>
            <defs>
              <linearGradient id="vtPino" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F6E2AC" /><stop offset=".5" stopColor="#C9A35B" /><stop offset="1" stopColor="#87672A" />
              </linearGradient>
            </defs>
            <path d="M28 74C28 74 4 46 4 27a24 24 0 0 1 48 0c0 19-24 47-24 47z" fill="url(#vtPino)" stroke="#0E0E10" strokeWidth="2" />
            <circle cx="28" cy="27" r="10.5" fill="#151618" />
            <path d="M22.5 21.5L28 33l5.5-11.5" fill="none" stroke="#E9D29F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <a href={linkMapa(c.mapa_busca)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir a localização da ${c.nome} no Google Maps`}
          style={{ position: "absolute", top: "15%", left: "15%", width: "70%", height: "70%", borderRadius: "50%" }} />

        <div style={{ position: "absolute", top: "3%", right: "-1%", display: "flex", alignItems: "center", gap: 8, padding: "8px 13px", borderRadius: 999,
          background: "rgba(21,22,24,.9)", border: `1px solid ${status.aberto ? "rgba(46,139,87,.6)" : "rgba(201,163,91,.4)"}`, color: C.creme, fontSize: 12.5, fontWeight: 700,
          boxShadow: "0 10px 24px rgba(0,0,0,.35)" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: status.aberto ? "#3CCB7F" : "#C9A35B", animation: status.aberto ? "vtPulsa 2s infinite" : "none" }} />
          {status.aberto ? "Aberto agora" : "Fechado agora"}
        </div>
      </div>

      <div style={{ position: "relative", margin: "-6% auto 0", width: "fit-content", maxWidth: "92%", textAlign: "center", padding: "12px 20px", borderRadius: 16,
        background: "rgba(21,22,24,.92)", border: "1px solid rgba(201,163,91,.35)", boxShadow: "0 14px 30px rgba(0,0,0,.4)" }}>
        <div style={{ fontFamily: SERIF, color: C.ouroClaro, fontSize: 15, letterSpacing: 1 }}>{c.nome}</div>
        <div style={{ fontSize: 12.5, color: "rgba(247,243,236,.7)", marginTop: 2 }}>{c.bairro}</div>
      </div>
    </div>
  );
}

function Visite({ c }) {
  const [status, setStatus] = useState(() => statusAgora(c.horarios));
  useEffect(() => {
    setStatus(statusAgora(c.horarios));
    const t = setInterval(() => setStatus(statusAgora(c.horarios)), 60000);
    return () => clearInterval(t);
  }, [c.horarios]);
  const larga = useTelaLarga();
  const grupos = horariosAgrupados(c.horarios);

  return (
    <section id="visite" style={{ position: "relative", overflow: "hidden", background: C.carvao, color: C.creme, padding: "84px 16px 90px" }}>
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
        background: "radial-gradient(60% 50% at 75% 40%, rgba(201,163,91,.12), transparent), radial-gradient(50% 50% at 10% 90%, rgba(201,163,91,.07), transparent)" }} />
      <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: larga ? "1fr 1fr" : "1fr", gap: larga ? 60 : 44, alignItems: "center" }}>
        <div style={{ order: larga ? 2 : 1 }}>
          <Revela><LenteMapa c={c} status={status} /></Revela>
        </div>
        <div style={{ order: larga ? 1 : 2, minWidth: 0 }}>
          <Revela>
            <Titulo sobre="Visite a loja" claro centro={false}>Venha viver a experiência <span className="vt-dourado">Vértice</span></Titulo>
          </Revela>
          <Revela atraso={100}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 22 }}>
              <span style={{ color: C.ouro, marginTop: 2 }}>{ICONES.pin}</span>
              <div style={{ fontSize: "clamp(17px, 4.4vw, 20px)", lineHeight: 1.5 }}>{c.endereco}<br /><span style={{ color: "rgba(247,243,236,.7)" }}>{c.bairro}</span></div>
            </div>
          </Revela>
          <Revela atraso={160}>
            <div style={{ border: "1px solid rgba(201,163,91,.28)", borderRadius: 20, padding: "18px 18px 10px", background: "rgba(255,255,255,.03)", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontWeight: 700, fontSize: 14.5, color: status.aberto ? "#6FDCA2" : C.ouroClaro }}>
                {ICONES.relogio}{status.texto}
              </div>
              {grupos.map((g) => {
                const hoje = g.dias.includes(status.dia);
                return (
                  <div key={g.rotulo} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid rgba(255,255,255,.07)",
                    fontSize: 14.5, color: hoje ? C.ouroClaro : "rgba(247,243,236,.8)", fontWeight: hoje ? 700 : 500 }}>
                    <span>{g.rotulo}{hoje ? " · hoje" : ""}</span><span style={{ whiteSpace: "nowrap" }}>{g.texto}</span>
                  </div>
                );
              })}
              {c.horario_obs && <div style={{ fontSize: 13, color: "rgba(247,243,236,.6)", padding: "8px 0 6px" }}>{c.horario_obs}</div>}
            </div>
          </Revela>
          <Revela atraso={220}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Botao tipo="ouro" href={linkRota(c.mapa_busca)} icone={ICONES.rota}>Como chegar</Botao>
              <Botao tipo="linhaClara" href={linkWaze(c.mapa_busca)}>Waze</Botao>
              <Botao tipo="linhaClara" href={linkWhats(c.whatsapp, c.msg_geral)} icone={ICONES.whats}>WhatsApp</Botao>
              {c.instagram && <Botao tipo="linhaClara" href={linkInstagram(c.instagram)} icone={ICONES.instagram}>Instagram</Botao>}
            </div>
          </Revela>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------
   Rodapé
   --------------------------------------------------------------------- */
function Rodape({ c }) {
  return (
    <footer style={{ background: "#0F1012", color: "rgba(247,243,236,.7)", padding: "54px 18px calc(110px + env(safe-area-inset-bottom,0px))", textAlign: "center",
      borderTop: "1px solid rgba(201,163,91,.2)" }}>
      <img src={EMBLEMA} alt="" width="76" height="76" style={{ borderRadius: "50%", border: `1px solid rgba(201,163,91,.5)`, boxShadow: "0 0 40px rgba(201,163,91,.2)" }} />
      <div style={{ fontFamily: SERIF, fontSize: 22, color: C.ouroClaro, letterSpacing: 4, marginTop: 14 }}>VÉRTICE</div>
      <div style={{ fontSize: 10.5, letterSpacing: 5, color: C.ouro, marginTop: 4 }}>DESIGN ÓPTICO</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.8, marginTop: 18 }}>
        {c.endereco} · {c.bairro}<br />
        <a href={linkWhats(c.whatsapp, c.msg_geral)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: C.creme }}>{foneFmt(c.whatsapp)}</a>
        {c.instagram && <> · <a href={linkInstagram(c.instagram)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: C.creme }}>@{String(c.instagram).replace(/^@/, "")}</a></>}
      </div>
      <div style={{ width: 40, height: 1, background: "rgba(201,163,91,.35)", margin: "24px auto" }} />
      <div style={{ fontSize: 12, color: "rgba(247,243,236,.5)" }}>
        Programa feito por <b style={{ color: "rgba(247,243,236,.8)" }}>{CREDITO_NOME}</b> — {CREDITO_FONE}
      </div>
    </footer>
  );
}
