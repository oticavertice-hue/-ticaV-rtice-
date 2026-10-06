import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CREDITO_NOME, CREDITO_FONE } from "./padroes.js";

/* =====================================================================
   Peças de tela do app de gestão (cores, janelas, botões, campos)
   ===================================================================== */

export const C = {
  carvao: "#151618", ardosia: "#1F2124", ardosia2: "#2A2C30", pedra: "#3A3C41",
  ouro: "#C9A35B", ouroClaro: "#E9D29F", ouroEsc: "#9A7638", ouroSuave: "#F4EBD9",
  fundo: "#F5F2EC", card: "#FFFFFF", borda: "#E6DECF",
  texto: "#1E1F22", suave: "#7C766C",
  verde: "#2E8B57", verdeFundo: "#E6F4EC", vermelho: "#C0453B", vermelhoFundo: "#FBEAE8",
  ambar: "#B9800E", ambarFundo: "#FBF1DB", whats: "#25D366",
};
export const SERIF = `"Cinzel", "Times New Roman", Georgia, serif`;
export const FONT = `"Montserrat", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

export const CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}

/* TRAVA DE LARGURA — não remover.
   Se qualquer elemento ficar mais largo que a tela, o navegador do celular
   encolhe a página inteira para caber e sobra uma faixa branca na lateral.
   Estas linhas cortam o excesso na raiz. O "clip" corta sem criar rolagem
   lateral, e por isso não atrapalha cabeçalho grudado nem janela flutuante. */
html,body,#root{max-width:100%;overflow-x:clip}
@supports not (overflow-x:clip){ html,body{overflow-x:hidden} }

html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;overscroll-behavior-y:none;background:${C.fundo};color:${C.texto};font-family:${FONT}}
img,video,table{max-width:100%}
button,input,select,textarea{font-family:inherit;color:inherit}
button{cursor:pointer}
a{color:inherit}

/* Altura real da tela: o 100vh do iPhone conta a barra do Safari e corta. */
.tela{position:fixed;left:0;right:0;top:0;bottom:0;height:100vh;height:100dvh}
.cheia{height:100%;max-height:100%}

/* 16px no campo evita o zoom automático do iPhone ao tocar para digitar. */
@media (max-width:859px){ input,select,textarea{font-size:16px !important} }

/* troca de aba: SÓ opacidade (transform num pai quebra as janelas no Android) */
@keyframes vtFade{from{opacity:0}to{opacity:1}}
.vt-aba{animation:vtFade .22s ease}
@keyframes vtGira{to{transform:rotate(360deg)}}
.vt-roda{animation:vtGira .8s linear infinite}

.vt-campo{width:100%;padding:12px 14px;border:1.5px solid ${C.borda};border-radius:12px;background:#fff;font-size:15px;outline:none;transition:border-color .15s}
.vt-campo:focus{border-color:${C.ouro}}
.vt-campo::placeholder{color:#B5AEA2}
.vt-toque:active{opacity:.75}
.vt-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.vt-chips::-webkit-scrollbar{display:none}
`;

/* ---------------------------------------------------------------------
   Ícones (SVG à mão)
   --------------------------------------------------------------------- */
const svg = (d, extra) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...extra}>{d}</svg>
);
export const ICONES = {
  inicio: svg(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>),
  estoque: svg(<><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>),
  categorias: svg(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>),
  ajustes: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  voltar: svg(<path d="M15 18l-6-6 6-6" />),
  x: svg(<path d="M18 6L6 18M6 6l12 12" />),
  mais: svg(<path d="M12 5v14M5 12h14" />, { strokeWidth: 2.4 }),
  menos: svg(<path d="M5 12h14" />, { strokeWidth: 2.4 }),
  busca: svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, { strokeWidth: 2.6 }),
  editar: svg(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>),
  lixo: svg(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>),
  sair: svg(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>),
  alerta: svg(<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>),
  dir: svg(<path d="M9 6l6 6-6 6" />),
  cima: svg(<path d="M6 15l6-6 6 6" />),
  baixo: svg(<path d="M6 9l6 6 6-6" />),
  foto: svg(<><rect x="3" y="5" width="18" height="15" rx="2.5" /><circle cx="12" cy="12.5" r="3.5" /><path d="M8 5l1.5-2h5L16 5" /></>),
  olho: svg(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>),
  olhoFechado: svg(<><path d="M3 3l18 18" /><path d="M10.6 6A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 6.7A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.4-1.2" /></>),
  link: svg(<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>),
  loja: svg(<><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9h16v2.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 11.5z" /><path d="M5 13v7h14v-7" /></>),
  relogio: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  pix: svg(<><path d="M12 2.5l4 4-4 4-4-4z" /><path d="M12 13.5l4 4-4 4-4-4z" /><path d="M2.5 12l4-4 4 4-4 4zM13.5 12l4-4 4 4-4 4z" /></>),
  formulario: svg(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v2h6V3M8.5 10h7M8.5 14h7M8.5 18h4" /></>),
  mensagem: svg(<><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></>),
  texto: svg(<><path d="M4 6h16M4 12h10M4 18h13" /></>),
  preferencias: svg(<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>),
  usuarios: svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>),
  disco: svg(<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>),
  conta: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  grafico: svg(<><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 20v-6M12.5 20V8M17 20v-9" /></>),
  desfazer: svg(<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
  catalogo: svg(<><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v18H5.5A2.5 2.5 0 0 1 3 18.5z" /><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v18h5.5a2.5 2.5 0 0 0 2.5-2.5z" /></>),
  whats: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3z" />
    </svg>
  ),
};

/* ---------------------------------------------------------------------
   Datas e valores
   --------------------------------------------------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
export const fmtData = (iso) => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
export const fmtDataHora = (iso) => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const parseValor = (s) => {
  const t = String(s ?? "").replace(/[^\d,.-]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
export const valorParaCampo = (v) => (v === null || v === undefined || v === "" ? "" : Number(v).toFixed(2).replace(".", ","));
export const foneDigitando = (s) => {
  const d = String(s || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
};
export const tamanho = (b) => {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
};

/* ---------------------------------------------------------------------
   Botão voltar do celular: fecha o que está aberto antes de sair do app
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
/* junta vários "voltar" do mesmo instante num só (fechar duas janelas de uma vez) */
function voltarHistorico() {
  VOLTAS++;
  if (VOLTAS === 1) setTimeout(() => { const n = VOLTAS; VOLTAS = 0; IGNORAR++; window.history.go(-n); }, 0);
}
export function useVoltar(aberto, fechar) {
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

/* trava o fundo (só esconder a rolagem não segura o Safari). Com contador:
   janela abre por cima de janela, e só a última a fechar devolve o fundo. */
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

export function useTelaLarga() {
  const [larga, setLarga] = useState(() => window.innerWidth >= 860);
  useEffect(() => {
    const r = () => setLarga(window.innerWidth >= 860);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  return larga;
}

/* ---------------------------------------------------------------------
   Janela que abre por cima (padrão: portal, dvh, teclado, trava do fundo)
   --------------------------------------------------------------------- */
export function Modal({ aberto, aoFechar, titulo, sub, children, rodape, largo }) {
  const telaLarga = useTelaLarga();
  const [altura, setAltura] = useState(null);
  useVoltar(aberto, aoFechar);
  useTravaFundo(aberto);

  /* teclado do iPhone: a janela encolhe junto e o botão de salvar fica à vista */
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

  if (!telaLarga) {
    return createPortal(
      <div className="tela" style={{ zIndex: 100, background: C.fundo, display: "flex", flexDirection: "column",
        height: altura ? `${altura}px` : undefined, animation: "vtFade .18s ease", fontFamily: FONT, color: C.texto }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6, color: C.fundo,
          background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, borderBottom: "1px solid rgba(201,163,91,.35)",
          padding: "calc(8px + env(safe-area-inset-top,0px)) 10px 10px" }}>
          <button onClick={aoFechar} aria-label="Voltar" style={S.btnIcone}>{ICONES.voltar}</button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</div>
            {sub && <div style={{ fontSize: 12.5, color: C.ouroClaro, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
          </div>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch",
          padding: rodape ? 16 : "16px 16px calc(24px + env(safe-area-inset-bottom,0px))" }}>{children}</div>
        {rodape && (
          <div style={{ flex: "0 0 auto", background: "#fff", borderTop: `1px solid ${C.borda}`,
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom,0px))" }}>{rodape}</div>
        )}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="tela" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
      style={{ zIndex: 100, background: "rgba(15,16,18,.58)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24, animation: "vtFade .18s ease", fontFamily: FONT, color: C.texto }}>
      <div style={{ background: C.fundo, borderRadius: 18, width: "100%", maxWidth: largo ? 780 : 560,
        maxHeight: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 70px rgba(0,0,0,.35)" }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 12, padding: "15px 16px 15px 20px",
          background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, color: C.fundo }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{titulo}</div>
            {sub && <div style={{ fontSize: 13, color: C.ouroClaro }}>{sub}</div>}
          </div>
          <button onClick={aoFechar} aria-label="Fechar" style={S.btnIcone}>{ICONES.x}</button>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: 20 }}>{children}</div>
        {rodape && <div style={{ flex: "0 0 auto", background: "#fff", borderTop: `1px solid ${C.borda}`, padding: "14px 20px" }}>{rodape}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ---------------------------------------------------------------------
   Estilos e peças reaproveitadas
   --------------------------------------------------------------------- */
export const S = {
  btnIcone: { width: 42, height: 42, flex: "0 0 42px", display: "grid", placeItems: "center", border: "none",
    background: "transparent", color: "inherit", borderRadius: 12 },
  card: { background: C.card, border: `1px solid ${C.borda}`, borderRadius: 16, minWidth: 0 },
  rotulo: { display: "block", fontSize: 13, fontWeight: 600, color: C.suave, marginBottom: 6 },
  titSecao: { fontSize: 12.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.suave, margin: "24px 2px 10px" },
  dica: { fontSize: 12.5, color: C.suave, marginTop: 6, lineHeight: 1.5 },
};

export function Botao({ children, onClick, cor = C.ardosia, texto = C.ouroClaro, contorno, cheio, pequeno, disabled, icone, style, ...resto }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="vt-toque" {...resto}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: pequeno ? "9px 12px" : "13px 18px", minHeight: pequeno ? 40 : 48, borderRadius: 12,
        fontWeight: 700, fontSize: pequeno ? 13.5 : 15, width: cheio ? "100%" : undefined,
        border: contorno ? `1.5px solid ${cor}` : "none", background: contorno ? "transparent" : cor,
        color: contorno ? cor : texto, opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap", ...style }}>
      {icone}{children}
    </button>
  );
}
export const OURO = { cor: C.ouro, texto: C.carvao };

/* Campo declarado FORA dos formulários: se fosse dentro, o teclado do celular
   fecharia a cada letra digitada. */
export function Campo({ n, rotulo, children, dica, style }) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0, ...style }}>
      <label style={S.rotulo}>
        {n ? <span style={{ display: "inline-grid", placeItems: "center", width: 20, height: 20, borderRadius: "50%", background: C.ardosia,
          color: C.ouroClaro, fontSize: 11, fontWeight: 700, marginRight: 7 }}>{n}</span> : null}
        {rotulo}
      </label>
      {children}
      {dica && <div style={S.dica}>{dica}</div>}
    </div>
  );
}

export function Interruptor({ ligado, mudar, rotulo, dica }) {
  return (
    <button type="button" onClick={() => mudar(!ligado)} className="vt-toque"
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 10,
        borderRadius: 14, border: `1.5px solid ${ligado ? C.ouro : C.borda}`, background: ligado ? C.ouroSuave : "#fff", minWidth: 0 }}>
      <span style={{ flex: "0 0 44px", height: 26, borderRadius: 999, background: ligado ? C.verde : "#D4CDC1", position: "relative", transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 3, left: ligado ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff",
          transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
      </span>
      <span style={{ minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 14.5 }}>{rotulo}</b>
        {dica && <span style={{ display: "block", fontSize: 12.5, color: C.suave, marginTop: 2, lineHeight: 1.45 }}>{dica}</span>}
      </span>
    </button>
  );
}

export function Chips({ opcoes, valor, mudar, permitirVazio }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {opcoes.map((o) => {
        const on = valor === o;
        return (
          <button key={o} type="button" onClick={() => mudar(on && permitirVazio ? "" : o)} className="vt-toque"
            style={{ padding: "9px 14px", borderRadius: 999, fontSize: 13.5, fontWeight: 600,
              border: `1.5px solid ${on ? C.ouro : C.borda}`, background: on ? C.ouroSuave : "#fff", color: C.texto }}>{o}</button>
        );
      })}
    </div>
  );
}

export function Selo({ tipo, children }) {
  const cores = {
    ok: [C.verdeFundo, C.verde], erro: [C.vermelhoFundo, C.vermelho], aviso: [C.ambarFundo, C.ambar],
    ouro: [C.ouroSuave, C.ouroEsc], neutro: ["#EFEBE4", C.suave],
  }[tipo] || ["#EFEBE4", C.suave];
  return (
    <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: cores[0], color: cores[1], whiteSpace: "nowrap" }}>{children}</span>
  );
}

export function Carregando({ texto = "Carregando…" }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: 60, color: C.suave, gap: 14 }}>
      <div className="vt-roda" style={{ width: 34, height: 34, borderRadius: "50%", border: `3px solid ${C.borda}`, borderTopColor: C.ouro }} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>{texto}</div>
    </div>
  );
}

export function Vazio({ texto }) {
  return <div style={{ ...S.card, padding: "30px 16px", textAlign: "center", color: C.suave, fontSize: 14 }}>{texto}</div>;
}

export function Credito({ claro }) {
  return (
    <div style={{ textAlign: "center", fontSize: 12, color: claro ? "rgba(255,255,255,.55)" : C.suave, padding: "18px 12px" }}>
      Programa feito por <b style={{ color: claro ? "rgba(255,255,255,.85)" : C.texto }}>{CREDITO_NOME}</b> — {CREDITO_FONE}
    </div>
  );
}

export function Miniatura({ src, tam = 54 }) {
  return (
    <div style={{ width: tam, height: tam, flex: `0 0 ${tam}px`, borderRadius: 12, overflow: "hidden", background: C.ouroSuave,
      display: "grid", placeItems: "center", border: `1px solid ${C.borda}` }}>
      {src ? <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <svg viewBox="0 0 120 50" width={tam * 0.7} aria-hidden="true"><g fill="none" stroke={C.ouro} strokeWidth="4" strokeLinecap="round"><path d="M8 16c0-4 2-6 7-6h26c5 0 7 2 7 6v6c0 9-6 15-15 15h-5C14 37 8 31 8 22z" /><path d="M72 16c0-4 2-6 7-6h26c5 0 7 2 7 6v6c0 9-6 15-15 15h-5c-9 0-15-6-15-15z" /><path d="M48 17c3-3 9-3 12 0c3-3 9-3 12 0" /></g></svg>}
    </div>
  );
}

/* linha de lista que abre algo (Ajustes) */
export function Linha({ icone, titulo, sub, aoTocar, direita, primeira }) {
  return (
    <button type="button" onClick={aoTocar} className="vt-toque"
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "14px",
        border: "none", background: "#fff", borderTop: primeira ? "none" : `1px solid ${C.borda}`, minWidth: 0 }}>
      {icone && <span style={{ flex: "0 0 40px", height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: C.ouroSuave, color: C.ouroEsc }}>{icone}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 14.5 }}>{titulo}</b>
        {sub && <span style={{ display: "block", fontSize: 12.5, color: C.suave, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>}
      </span>
      {direita}
      <span style={{ color: C.suave, display: "flex" }}>{ICONES.dir}</span>
    </button>
  );
}

/* aviso rápido no pé da tela */
export function useAviso() {
  const [aviso, setAviso] = useState(null);
  const t = useRef(null);
  const mostrar = (texto, tipo = "ok") => {
    clearTimeout(t.current);
    setAviso({ texto, tipo });
    t.current = setTimeout(() => setAviso(null), 2800);
  };
  const el = aviso && createPortal(
    <div style={{ position: "fixed", left: 16, right: 16, zIndex: 300, display: "flex", justifyContent: "center",
      bottom: "calc(90px + env(safe-area-inset-bottom,0px))", pointerEvents: "none", animation: "vtFade .2s ease", fontFamily: FONT }}>
      <div style={{ background: aviso.tipo === "erro" ? C.vermelho : C.carvao, color: "#fff", padding: "12px 18px",
        borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,.25)", maxWidth: 480,
        border: aviso.tipo === "erro" ? "none" : "1px solid rgba(201,163,91,.4)" }}>
        {aviso.texto}
      </div>
    </div>,
    document.body
  );
  return [mostrar, el];
}
