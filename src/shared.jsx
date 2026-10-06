// Peças compartilhadas pela vitrine e pelo painel: ícones, ilustração das armações, janelas, avisos e utilidades.
// Componentes declarados SEMPRE aqui no topo do arquivo, nunca dentro de outro componente
// (senão o React recria o campo a cada letra e o teclado do celular fecha).

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ROSTOS } from "./data.js";

/* ------------------------------------------------------------------ */
/* Texto, dinheiro, WhatsApp                                           */
/* ------------------------------------------------------------------ */

export const normalizar = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const slugify = (s) =>
  normalizar(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const _brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const dinheiro = (n) => (n === null || n === undefined || n === "" || Number.isNaN(Number(n)) ? "" : _brl.format(Number(n)));

export const soNumeros = (s) => String(s || "").replace(/\D/g, "");

/** Link wa.me no WhatsApp instalado no computador embaralha emoji: lá usa o WhatsApp Web. */
export const ehComputador = () => !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.innerWidth >= 860;

export function linkWhats(fone, msg) {
  const n = soNumeros(fone);
  const t = encodeURIComponent(msg || "");
  return ehComputador() ? `https://web.whatsapp.com/send?phone=${n}&text=${t}` : `https://wa.me/${n}?text=${t}`;
}

export const montarMensagem = (modelo, vars) => String(modelo || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : vars[k]));

export const linkMapa = (busca) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
export const linkRota = (busca) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(busca)}`;
export const linkWaze = (busca) => `https://waze.com/ul?q=${encodeURIComponent(busca)}&navigate=yes`;

/* ------------------------------------------------------------------ */
/* Formato da armação → rosto                                          */
/* ------------------------------------------------------------------ */

export function formatoKey(s) {
  const n = normalizar(s);
  if (!n) return "";
  if (/redond/.test(n)) return "redondo";
  if (/oval/.test(n)) return "oval";
  if (/pant/.test(n)) return "panto";
  if (/quadr/.test(n)) return "quadrado";
  if (/retang/.test(n)) return "retangular";
  if (/gatinh|cat.?eye|borbolet/.test(n)) return "gatinho";
  if (/aviad/.test(n)) return "aviador";
  if (/hexag/.test(n)) return "hexagonal";
  if (/geom/.test(n)) return "geometrico";
  return "";
}

export const rostosParaFormato = (formato) => {
  const k = formatoKey(formato);
  return k ? ROSTOS.filter((r) => r.formatos.includes(k)) : [];
};

/* ------------------------------------------------------------------ */
/* Horário de funcionamento                                            */
/* ------------------------------------------------------------------ */

export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function agoraBrasilia() {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => p.find((x) => x.type === t).value;
  const mapa = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let h = parseInt(get("hour"), 10);
  if (h === 24) h = 0;
  return { dia: mapa[get("weekday")], min: h * 60 + parseInt(get("minute"), 10) };
}

const paraMin = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** { aberto, dia, texto } no horário de Brasília */
export function statusAgora(horarios) {
  const { dia, min } = agoraBrasilia();
  const hoje = horarios[dia];
  if (hoje && hoje.aberto && min >= paraMin(hoje.abre) && min < paraMin(hoje.fecha)) {
    return { aberto: true, dia, texto: `Aberto agora · fecha às ${hoje.fecha}` };
  }
  if (hoje && hoje.aberto && min < paraMin(hoje.abre)) {
    return { aberto: false, dia, texto: `Fechado · abre hoje às ${hoje.abre}` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    const h = horarios[d];
    if (h && h.aberto) {
      return { aberto: false, dia, texto: i === 1 ? `Fechado · abre amanhã às ${h.abre}` : `Fechado · abre ${DIAS[d].toLowerCase()} às ${h.abre}` };
    }
  }
  return { aberto: false, dia, texto: "Fechado" };
}

/** Junta dias seguidos com o mesmo horário: "Segunda a sexta · 09:30 – 18:30" */
export function horariosAgrupados(horarios) {
  const chave = (d) => {
    const h = horarios[d];
    return h && h.aberto ? `${h.abre}-${h.fecha}` : "fechado";
  };
  const grupos = [];
  ORDEM_SEMANA.forEach((d) => {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.chave === chave(d)) ult.dias.push(d);
    else grupos.push({ chave: chave(d), dias: [d] });
  });
  return grupos.map((g) => {
    const primeiro = DIAS[g.dias[0]];
    const ultimo = DIAS[g.dias[g.dias.length - 1]];
    const rotulo = g.dias.length === 1 ? primeiro : g.dias.length === 2 ? `${primeiro} e ${ultimo.toLowerCase()}` : `${primeiro} a ${ultimo.toLowerCase()}`;
    const h = horarios[g.dias[0]];
    return { rotulo, dias: g.dias, aberto: !!(h && h.aberto), texto: h && h.aberto ? `${h.abre} – ${h.fecha}` : "Fechado" };
  });
}

/* ------------------------------------------------------------------ */
/* Ícones desenhados à mão                                             */
/* ------------------------------------------------------------------ */

const I = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H5M11 6l-6 6 6 6" />,
  arrowUpRight: <path d="M7 17L17 7M8.5 7H17v8.5" />,
  menu: <path d="M4 8.5h16M4 15.5h10" />,
  heart: <path d="M12 20.2s-7.6-4.5-9.4-9.6C1.4 7.2 3.6 4 7 4c2 0 3.7 1 5 2.8C13.300 5 15 4 17 4c3.400 0 5.600 3.200 4.400 6.600-1.800 5.100-9.400 9.600-9.400 9.600z" />,
  whatsapp: <><path d="M20.200 11.700a8.200 8.200 0 0 1-12.100 7.200L3.700 20.200l1.300-4.200a8.200 8.200 0 1 1 15.200-4.300z" /><path d="M9.200 8.300c.2 2.700 3 5.500 5.700 5.700l1.200-1.300-2-1-.9.700c-.8-.4-1.600-1.200-2-2l.7-.9-1-2-1.700.8z" /></>,
  instagram: <><rect x="3.500" y="3.500" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.800" /><circle cx="17.200" cy="6.800" r=".6" /></>,
  pin: <><path d="M12 21.500s7-6 7-11.700a7 7 0 1 0-14 0c0 5.700 7 11.700 7 11.700z" /><circle cx="12" cy="9.800" r="2.500" /></>,
  clock: <><circle cx="12" cy="12" r="8.500" /><path d="M12 7.500V12l3 2" /></>,
  share: <path d="M12 3.500v11M7.500 8L12 3.500 16.500 8M5 13.500V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4.500" />,
  check: <path d="M5 12.500l4.500 4.500L19 7.500" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  filter: <><path d="M4 7.500h9M17 7.500h3M4 16.500h3M11 16.500h9" /><circle cx="15" cy="7.500" r="2" /><circle cx="9" cy="16.500" r="2" /></>,
  chevronDown: <path d="M6 9.500l6 6 6-6" />,
  chevronUp: <path d="M6 14.500l6-6 6 6" />,
  chevronLeft: <path d="M14.500 6l-6 6 6 6" />,
  chevronRight: <path d="M9.500 6l6 6-6 6" />,
  image: <><rect x="3.500" y="4.500" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.600" /><path d="M20.500 16l-5-5-8.500 8.500" /></>,
  trash: <path d="M4.500 7h15M9.500 11v6M14.500 11v6M6.500 7l.8 11.500A2 2 0 0 0 9.300 20.500h5.400a2 2 0 0 0 2-2L17.500 7M9 7V4.500h6V7" />,
  edit: <path d="M4 20l4.200-1L19.300 7.900a2.100 2.100 0 0 0-3-3L5.200 15.800 4 20z" />,
  copy: <><rect x="8.500" y="8.500" width="11" height="11" rx="2" /><path d="M15.500 8.500V6.500a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" /></>,
  eye: <><path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z" /><circle cx="12" cy="12" r="2.800" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10 5.800A9.700 9.700 0 0 1 12 5.500c6 0 9.500 6.500 9.500 6.500a15 15 0 0 1-2.800 3.600M6.600 7.300C4 9 2.500 12 2.500 12s3.500 6.500 9.500 6.500c1.500 0 2.800-.4 4-1" /><path d="M9.900 10A2.800 2.800 0 0 0 14 14" /></>,
  up: <path d="M12 19V5.500M6 11.500l6-6 6 6" />,
  down: <path d="M12 5v13.500M6 12.500l6 6 6-6" />,
  home: <path d="M3.500 11L12 3.500l8.500 7.500M5.500 9.700V20h4.500v-5.500h4V20h4.500V9.700" />,
  tag: <><path d="M3.500 12.500V4.500h8l9 9-8 8-9-9z" /><circle cx="8" cy="9" r="1.200" /></>,
  grid: <><rect x="4" y="4" width="6.500" height="6.500" rx="1" /><rect x="13.500" y="4" width="6.500" height="6.500" rx="1" /><rect x="4" y="13.500" width="6.500" height="6.500" rx="1" /><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M5.600 18.400l2.100-2.100M16.300 7.700l2.100-2.100" /></>,
  star: <path d="M12 3.500l2.700 5.600 6.100.8-4.500 4.200 1.100 6.100L12 17.300 6.600 20.200l1.100-6.100L3.200 9.900l6.100-.8L12 3.500z" />,
  lock: <><rect x="5" y="10.500" width="14" height="9.500" rx="2" /><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" /></>,
  logout: <path d="M9.500 4.500h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4M15.500 8l4 4-4 4M19.500 12H9" />,
  upload: <path d="M12 16V4.500M7 9.500l5-5 5 5M4.500 16v2.500a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V16" />,
  camera: <><path d="M3.500 8.500h3.200l1.800-3h7l1.800 3h3.200v10.500h-17V8.500z" /><circle cx="12" cy="13.500" r="3.500" /></>,
  warning: <path d="M12 3.500l9.500 16.500h-19L12 3.500zM12 10v4.500M12 17.300v.2" />,
  undo: <path d="M9 14.500L4 9.500l5-5M4 9.500h9.500a6 6 0 0 1 0 12H11" />,
  spark: <path d="M12 3l2.200 6.300L20.500 12l-6.300 2.700L12 21l-2.200-6.300L3.500 12l6.300-2.700L12 3z" />,
  ruler: <path d="M3.500 15.500l12-12 5 5-12 12-5-5zM8 11l2.500 2.500M11 8l2.500 2.500M14 5l1.500 1.500M5 14l1.500 1.500" />,
  glasses: <><circle cx="6.800" cy="14" r="3.800" /><circle cx="17.200" cy="14" r="3.800" /><path d="M10.600 13.500c.9-.8 1.900-.8 2.800 0M3 14L4.500 7M21 14l-1.500-7" /></>,
  user: <><circle cx="12" cy="8.500" r="3.800" /><path d="M4.500 20c.8-3.800 3.700-5.800 7.500-5.800s6.700 2 7.500 5.800" /></>,
  list: <path d="M8.500 6.500h11M8.500 12h11M8.500 17.500h11M4.500 6.500h.01M4.500 12h.01M4.500 17.500h.01" />,
  bars: <path d="M5 20V12M12 20V5M19 20v-9" />,
  drag: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />,
  info: <><circle cx="12" cy="12" r="8.500" /><path d="M12 11v5M12 8v.2" /></>,
  external: <path d="M14 4.500h5.500V10M19.500 4.500L11 13M17 14v4a2 2 0 0 1-2 2H6.500a2 2 0 0 1-2-2V9.500a2 2 0 0 1 2-2H10" />,
  shield: <path d="M12 3.500l7 2.700v5.300c0 4.400-2.900 7.800-7 9-4.100-1.200-7-4.600-7-9V6.200l7-2.700z" />,
};

export function Ico({ n, size = 20, cheio = false, sw = 1.5, className, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={cheio ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flex: "0 0 auto", ...style }}
    >
      {I[n]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Ilustração das armações (usada quando o produto ainda não tem foto) */
/* ------------------------------------------------------------------ */

const FORMAS = {
  redondo: { d: "M-34,0 a34,34 0 1,0 68,0 a34,34 0 1,0 -68,0Z", hw: 34 },
  oval: { d: "M-42,0 C-42,-24 -24,-32 0,-32 C24,-32 42,-24 42,0 C42,24 24,32 0,32 C-24,32 -42,24 -42,0Z", hw: 42 },
  panto: { d: "M-39,-4 C-39,-26 -22,-33 0,-33 C22,-33 39,-27 39,-5 C39,19 24,32 0,32 C-24,32 -39,18 -39,-4Z", hw: 39 },
  quadrado: { d: "M-29,-34 H29 Q40,-34 40,-23 V23 Q40,34 29,34 H-29 Q-40,34 -40,23 V-23 Q-40,-34 -29,-34Z", hw: 40 },
  retangular: { d: "M-30,-27 H30 Q42,-27 42,-16 V16 Q42,27 30,27 H-30 Q-42,27 -42,16 V-16 Q-42,-27 -30,-27Z", hw: 42 },
  gatinho: { d: "M-45,-33 C-30,-31 -8,-27 12,-24 C34,-21 43,-10 41,6 C38,26 22,33 2,33 C-20,33 -37,22 -41,0 C-43,-10 -45,-22 -45,-33Z", hw: 43 },
  aviador: { d: "M-42,-27 C-42,-33 -35,-34 -26,-34 H26 C38,-34 44,-27 42,-9 C38,22 22,36 0,36 C-26,36 -44,16 -42,-27Z", hw: 42 },
  hexagonal: { d: "M-20,-33 H20 L42,0 L20,33 H-20 L-42,0Z", hw: 42 },
  geometrico: { d: "M-42,-14 L-16,-33 H30 L43,-4 L24,32 H-26 L-42,12Z", hw: 43 },
};

/** Metade da largura de uma lente no desenho (usada pelo diagrama de medidas) */
export const metadeLargura = (forma) => (FORMAS[formatoKey(forma)] || FORMAS.redondo).hw;

const COR_ARMACAO = {
  preto: "#16130f", marrom: "#4b2f1c", tartaruga: "tort", dourado: "gold", prata: "silver", rose: "#d7a695",
  transparente: "clear", azul: "#1f3f66", verde: "#2a4a3a", vermelho: "#8a1f26", vinho: "#59162a", bege: "#cdb592",
  cinza: "#8a8c90", rosa: "#d98fa6", bicolor: "two",
};
const COR_LENTE = {
  fume: "#17171b", preta: "#17171b", marrom: "#6b4423", verde: "#2c4a39", cinza: "#5c6066", azul: "#2b5a8c",
  degrade: "grad", espelhada: "mirror", rosa: "#c98a9a", amarela: "#d6b546",
};
const achaCor = (tabela, s) => {
  const n = normalizar(s);
  if (!n) return "";
  const k = Object.keys(tabela).find((x) => n.includes(x));
  return k ? tabela[k] : "";
};

/** Armação desenhada em SVG. `linha` = só o traço dourado (usado na abertura/hero). */
export function Glasses({ forma, cor, lente, material, linha = false, className, style, titulo }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const f = FORMAS[formatoKey(forma)] || FORMAS.redondo;
  const corKey = achaCor(COR_ARMACAO, cor) || "gold";
  const lenteKey = achaCor(COR_LENTE, lente);
  const nMat = normalizar(material);
  const fino = linha || /metal|aco|inox|titan|alum|fio|nylon/.test(nMat) || (!nMat && (corKey === "gold" || corKey === "silver"));
  const sw = linha ? 1.5 : fino ? 2.6 : 7;
  const cxL = 60;
  const cxR = 180;
  const cy = 52;
  const stroke = linha ? "url(#" + uid + "gold)" : corKey === "gold" ? `url(#${uid}gold)` : corKey === "silver" ? `url(#${uid}silver)` : corKey === "tort" ? `url(#${uid}tort)` : corKey === "two" ? `url(#${uid}two)` : corKey === "clear" ? "rgba(112,138,156,.62)" : corKey;
  const a = cxL + f.hw - 1;
  const b = cxR - f.hw + 1;
  const ehAviador = f === FORMAS.aviador;
  const lenteFill = linha ? "none" : lenteKey ? `url(#${uid}lt)` : `url(#${uid}lc)`;
  const tinta = lenteKey && lenteKey !== "grad" && lenteKey !== "mirror" ? lenteKey : "#1a1a1e";

  const lenteEl = (cx, espelha) => (
    <g key={cx} transform={`translate(${cx} ${cy})${espelha ? " scale(-1 1)" : ""}`}>
      <path d={f.d} fill={lenteFill} />
      {!linha && (
        <g clipPath={`url(#${uid}c${espelha ? "r" : "l"})`}>
          <rect x="-60" y="-50" width="26" height="130" transform="rotate(24)" fill="#fff" opacity={lenteKey ? 0.2 : 0.34} />
          <rect x="-26" y="-50" width="7" height="130" transform="rotate(24)" fill="#fff" opacity={lenteKey ? 0.12 : 0.22} />
        </g>
      )}
      <path d={f.d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      {!linha && !fino && corKey !== "clear" && <path d={f.d} fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="1.2" transform="scale(.93)" />}
    </g>
  );

  return (
    <svg viewBox="0 0 240 108" className={className} style={{ overflow: "visible", ...style }} role={titulo ? "img" : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : "true"}>
      <defs>
        <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2ac" /><stop offset=".45" stopColor="#b98a3e" /><stop offset=".75" stopColor="#e8c982" /><stop offset="1" stopColor="#9c7430" />
        </linearGradient>
        <linearGradient id={`${uid}silver`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f5f7" /><stop offset=".5" stopColor="#979ba3" /><stop offset="1" stopColor="#dfe1e5" />
        </linearGradient>
        <linearGradient id={`${uid}two`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".5" stopColor="#17140f" /><stop offset=".5" stopColor="#d9bd90" />
        </linearGradient>
        <pattern id={`${uid}tort`} width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <rect width="30" height="30" fill="#6a4020" />
          <ellipse cx="7" cy="8" rx="8" ry="5" fill="#2b170a" opacity=".85" />
          <ellipse cx="22" cy="20" rx="9" ry="5.500" fill="#2b170a" opacity=".8" />
          <ellipse cx="18" cy="6" rx="5" ry="3" fill="#b27a35" opacity=".8" />
          <ellipse cx="4" cy="24" rx="5" ry="3.500" fill="#b27a35" opacity=".7" />
        </pattern>
        <linearGradient id={`${uid}lc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#aebfcb" stopOpacity=".16" />
        </linearGradient>
        <linearGradient id={`${uid}lt`} x1="0" y1="0" x2="0" y2="1">
          {lenteKey === "grad" ? (
            <><stop offset="0" stopColor="#1a1a1e" stopOpacity=".95" /><stop offset="1" stopColor="#8a6a48" stopOpacity=".55" /></>
          ) : lenteKey === "mirror" ? (
            <><stop offset="0" stopColor="#cfe0ee" stopOpacity=".95" /><stop offset=".5" stopColor="#6e88a3" stopOpacity=".95" /><stop offset="1" stopColor="#c7a98a" stopOpacity=".9" /></>
          ) : (
            <><stop offset="0" stopColor={tinta} stopOpacity=".88" /><stop offset="1" stopColor={tinta} stopOpacity=".98" /></>
          )}
        </linearGradient>
        <clipPath id={`${uid}cl`}><path d={f.d} /></clipPath>
        <clipPath id={`${uid}cr`}><path d={f.d} /></clipPath>
        <filter id={`${uid}bl`} x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="3.200" /></filter>
      </defs>
      {!linha && <ellipse cx="120" cy="101" rx="76" ry="4.500" fill="#000" opacity=".28" filter={`url(#${uid}bl)`} />}
      {lenteEl(cxL, false)}
      {lenteEl(cxR, true)}
      <path d={`M${a},${cy - 8} C${a + 8},${cy - 20} ${b - 8},${cy - 20} ${b},${cy - 8}`} fill="none" stroke={stroke} strokeWidth={fino ? sw : sw * 0.9} strokeLinecap="round" />
      {ehAviador && <path d={`M${a - 4},${cy - 24} L${b + 4},${cy - 24}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />}
      {!linha && (
        <>
          <path d={`M${cxL - f.hw},${cy - 18} l-9,-3`} stroke={stroke} strokeWidth={fino ? 2.4 : 5} strokeLinecap="round" fill="none" />
          <path d={`M${cxR + f.hw},${cy - 18} l9,-3`} stroke={stroke} strokeWidth={fino ? 2.4 : 5} strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}

/** Contorno de rosto (guia de formato de rosto). */
const ROSTO_D = {
  oval: "M40,14 C58,14 66,30 66,50 C66,72 54,86 40,86 C26,86 14,72 14,50 C14,30 22,14 40,14Z",
  redondo: "M40,16 C60,16 70,32 70,50 C70,70 58,84 40,84 C22,84 10,70 10,50 C10,32 20,16 40,16Z",
  quadrado: "M16,24 Q16,14 26,14 H54 Q64,14 64,24 V60 Q64,86 40,86 Q16,86 16,60Z",
  coracao: "M14,24 C14,14 26,12 40,13 C54,12 66,14 66,24 C66,52 54,86 40,88 C26,86 14,52 14,24Z",
  diamante: "M40,10 C52,10 60,22 68,46 C60,70 52,88 40,88 C28,88 20,70 12,46 C20,22 28,10 40,10Z",
  alongado: "M40,6 C56,6 62,24 62,48 C62,76 54,94 40,94 C26,94 18,76 18,48 C18,24 24,6 40,6Z",
};

export function RostoIcone({ id, className, style }) {
  return (
    <svg viewBox="0 0 80 100" className={className} style={style} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ROSTO_D[id] || ROSTO_D.oval} />
      <path d="M24,47 h12 M44,47 h12" strokeOpacity=".55" />
      <path d="M40,50 v10 q-2.500,3 -5,2" strokeOpacity=".4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Janelas (padrão do celular: portal, tela cheia, teclado, trava)      */
/* ------------------------------------------------------------------ */

// O botão voltar do aparelho fecha o que está aberto antes de sair do site.
const pilha = [];
let ignorarPop = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (ignorarPop > 0) {
      ignorarPop--;
      return;
    }
    const topo = pilha.pop();
    if (topo) {
      topo.porVoltar = true;
      topo.fechar();
    }
  });
}

export function useBackClose(aberto, aoFechar) {
  const ref = useRef(aoFechar);
  ref.current = aoFechar;
  useEffect(() => {
    if (!aberto) return undefined;
    const item = { fechar: () => ref.current(), porVoltar: false };
    pilha.push(item);
    history.pushState({ vt: 1 }, "");
    return () => {
      const i = pilha.indexOf(item);
      if (i >= 0) {
        pilha.splice(i, 1);
        if (!item.porVoltar) {
          ignorarPop++;
          history.back(); // fechou pelo botão da tela: desfaz a entrada que criamos
        }
      }
    };
  }, [aberto]);
}

// Trava do fundo prendendo o corpo da página (só esconder a rolagem não segura o Safari).
let travas = 0;
let travaY = 0;
let travaAntes = null;
function travarFundo() {
  if (travas++ > 0) return;
  const b = document.body;
  travaY = window.scrollY || 0;
  travaAntes = { position: b.style.position, top: b.style.top, width: b.style.width, overflow: b.style.overflow };
  b.style.position = "fixed";
  b.style.top = `-${travaY}px`;
  b.style.width = "100%";
  b.style.overflow = "hidden";
}
function soltarFundo() {
  if (--travas > 0) return;
  const b = document.body;
  Object.assign(b.style, travaAntes);
  window.scrollTo({ top: travaY, behavior: "instant" });
}

export function Modal({ aberto, aoFechar, titulo, sub, children, largo, rodape, tema = "claro", classe = "", acoes }) {
  const [telaLarga, setTelaLarga] = useState(() => window.innerWidth >= 860);
  const [altura, setAltura] = useState(null);

  useBackClose(aberto, aoFechar);

  useEffect(() => {
    const r = () => setTelaLarga(window.innerWidth >= 860);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  /* teclado do iPhone: a janela encolhe junto e o botão de salvar fica à vista */
  useEffect(() => {
    if (!aberto || !window.visualViewport) return undefined;
    const vv = window.visualViewport;
    const aj = () => setAltura(Math.round(vv.height));
    aj();
    vv.addEventListener("resize", aj);
    vv.addEventListener("scroll", aj);
    return () => {
      vv.removeEventListener("resize", aj);
      vv.removeEventListener("scroll", aj);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return undefined;
    travarFundo();
    return soltarFundo;
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return undefined;
    const k = (e) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  const estiloTela = !telaLarga && altura ? { height: altura } : undefined;
  return createPortal(
    <div className={`vt-modal ${telaLarga ? "vt-modal--caixa" : "vt-modal--tela"}${largo ? " vt-modal--largo" : ""} ${classe}`} data-tema={tema} style={estiloTela} role="dialog" aria-modal="true" aria-label={titulo}>
      {telaLarga && <div className="vt-modal__fundo" onMouseDown={aoFechar} />}
      <div className="vt-modal__caixa">
        <header className="vt-modal__topo">
          {!telaLarga && (
            <button type="button" className="vt-iconbtn" onClick={aoFechar} aria-label="Voltar">
              <Ico n="arrowLeft" />
            </button>
          )}
          <div className="vt-modal__titulos">
            <h2>{titulo}</h2>
            {sub ? <p>{sub}</p> : null}
          </div>
          {acoes}
          {telaLarga && (
            <button type="button" className="vt-iconbtn" onClick={aoFechar} aria-label="Fechar">
              <Ico n="close" />
            </button>
          )}
        </header>
        <div className="vt-modal__corpo">{children}</div>
        {rodape ? <footer className="vt-modal__rodape">{rodape}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Avisos e confirmação                                                */
/* ------------------------------------------------------------------ */

const ouvintesToast = new Set();
export function toast(msg, tipo = "ok") {
  ouvintesToast.forEach((f) => f({ id: Date.now() + Math.random(), msg, tipo }));
}

export function Toasts() {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    const f = (t) => {
      setLista((x) => [...x, t]);
      setTimeout(() => setLista((x) => x.filter((y) => y.id !== t.id)), t.tipo === "erro" ? 5200 : 3000);
    };
    ouvintesToast.add(f);
    return () => ouvintesToast.delete(f);
  }, []);
  return createPortal(
    <div className="vt-toasts" aria-live="polite">
      {lista.map((t) => (
        <div key={t.id} className={`vt-toast vt-toast--${t.tipo}`}>
          <Ico n={t.tipo === "erro" ? "warning" : "check"} size={18} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}

let _confirmar = null;
/** confirmar({ titulo, texto, ok, perigo }) → Promise<boolean> */
export const confirmar = (opts) => (_confirmar ? _confirmar(opts) : Promise.resolve(window.confirm(opts.titulo)));

export function Confirmador() {
  const [c, setC] = useState(null);
  useEffect(() => {
    _confirmar = (opts) => new Promise((resolve) => setC({ ...opts, resolve }));
    return () => {
      _confirmar = null;
    };
  }, []);
  const fechar = (v) => {
    if (c) c.resolve(v);
    setC(null);
  };
  useBackClose(!!c, () => fechar(false));
  if (!c) return null;
  return createPortal(
    <div className="vt-confirm" role="alertdialog" aria-modal="true" data-tema="claro">
      <div className="vt-confirm__fundo" onMouseDown={() => fechar(false)} />
      <div className="vt-confirm__caixa">
        <h3>{c.titulo}</h3>
        {c.texto ? <p>{c.texto}</p> : null}
        <div className="vt-confirm__acoes">
          <button type="button" className="vt-btn vt-btn--suave" onClick={() => fechar(false)}>
            {c.cancelar || "Cancelar"}
          </button>
          <button type="button" className={`vt-btn ${c.perigo ? "vt-btn--perigo" : "vt-btn--ouro"}`} onClick={() => fechar(true)} autoFocus>
            {c.ok || "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Pequenos ganchos                                                    */
/* ------------------------------------------------------------------ */

/** Marca como visível, com suavidade, tudo que tem data-reveal quando entra na tela. */
export function useReveal(dep) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]:not(.is-in)"));
    if (!els.length) return undefined;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("is-in"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [dep]);
}

export function useMedia(query) {
  const [ok, setOk] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const m = window.matchMedia(query);
    const f = () => setOk(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [query]);
  return ok;
}
