// Ilustrações usadas quando ainda não há foto: categorias, lentes, estojo e a explicação das lentes.
import { useId } from "react";
import { Glasses } from "./shared.jsx";

export function ArteLente({ className }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}a`} cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".6" stopColor="#e9eef1" stopOpacity=".12" /><stop offset="1" stopColor="#c9d6de" stopOpacity=".2" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2ac" /><stop offset=".5" stopColor="#b98a3e" /><stop offset="1" stopColor="#e8c982" />
        </linearGradient>
        <filter id={`${id}s`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <ellipse cx="104" cy="186" rx="62" ry="6" fill="#000" opacity=".25" filter={`url(#${id}s)`} />
      <circle cx="100" cy="96" r="76" fill={`url(#${id}a)`} stroke={`url(#${id}b)`} strokeWidth="2" />
      <circle cx="100" cy="96" r="62" fill="none" stroke="#b98a3e" strokeOpacity=".4" strokeWidth=".8" />
      <circle cx="100" cy="96" r="46" fill="none" stroke="#b98a3e" strokeOpacity=".3" strokeWidth=".8" />
      <path d="M52 62 A58 58 0 0 1 96 34" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 80 A58 58 0 0 1 50 68" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ArteEstojo({ className }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 240 130" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a917f" /><stop offset="1" stopColor="#6c6454" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2ac" /><stop offset=".5" stopColor="#b98a3e" /><stop offset="1" stopColor="#e8c982" />
        </linearGradient>
        <filter id={`${id}s`} x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <ellipse cx="120" cy="116" rx="92" ry="6" fill="#000" opacity=".28" filter={`url(#${id}s)`} />
      <path d="M26 36 Q26 18 46 18 H194 Q214 18 214 36 V92 Q214 110 194 110 H46 Q26 110 26 92 Z" fill={`url(#${id}c)`} />
      <path d="M26 56 H214" stroke="#000" strokeOpacity=".18" strokeWidth="1.2" />
      <path d="M30 24 Q120 14 210 24" stroke="#fff" strokeOpacity=".2" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="108" y="48" width="24" height="16" rx="3" fill={`url(#${id}g)`} />
      <text x="120" y="92" textAnchor="middle" fontFamily="Bodoni Moda, serif" fontSize="22" fill={`url(#${id}g)`}>V</text>
    </svg>
  );
}

/** Ilustração representando uma categoria (usada na tela de categorias e em produtos sem foto de acessórios/lentes). */
export function ArteCategoria({ slug, className }) {
  switch (slug) {
    case "oculos-de-sol":
      return <Glasses className={className} forma="Aviador" cor="Dourado" lente="Verde" material="Metal" />;
    case "clip-on":
      return <Glasses className={className} forma="Retangular" cor="Tartaruga" lente="Fumê" material="Acetato" />;
    case "infantil":
      return <Glasses className={className} forma="Redondo" cor="Azul" material="Acetato" />;
    case "lentes":
      return <ArteLente className={className} />;
    case "acessorios":
      return <ArteEstojo className={className} />;
    default:
      return <Glasses className={className} forma="Panto" cor="Dourado" material="Metal" />;
  }
}

/** Arte de um produto sem foto: usa o formato, a cor e a lente do próprio produto. */
export function ArteProduto({ p, cat, className }) {
  const s = p.specs || {};
  const slug = cat && cat.slug;
  if (slug === "lentes") return <ArteLente className={className} />;
  if (slug === "acessorios") return <ArteEstojo className={className} />;
  return <Glasses className={className} forma={s.formato} cor={s.cor} lente={s.cor_lente} material={s.material} />;
}

/** Diagrama das zonas de cada tipo de lente (seção "Entenda suas lentes"). */
export function DiagramaLente({ tipo }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cor = "#c9a45c";
  return (
    <svg viewBox="0 0 320 320" className="vd-lente-diag" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}v`} cx=".34" cy=".28" r=".95">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset="1" stopColor="#c9a45c" stopOpacity=".05" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f5efe0" stopOpacity=".1" /><stop offset=".45" stopColor="#6b5b3f" stopOpacity=".4" /><stop offset="1" stopColor="#1b1612" stopOpacity=".9" />
        </linearGradient>
        <clipPath id={`${id}c`}><circle cx="160" cy="160" r="128" /></clipPath>
      </defs>
      <circle cx="160" cy="160" r="150" fill="none" stroke={cor} strokeOpacity=".22" strokeWidth=".8" />
      <circle cx="160" cy="160" r="138" fill="none" stroke={cor} strokeOpacity=".4" strokeWidth=".8" strokeDasharray="1 5" />
      <circle cx="160" cy="160" r="128" fill={`url(#${id}v)`} stroke={cor} strokeWidth="1.4" />
      <g clipPath={`url(#${id}c)`}>
        {tipo === "simples" && (
          <>
            <circle cx="160" cy="160" r="86" fill="none" stroke={cor} strokeOpacity=".45" strokeWidth=".8" />
            <text x="160" y="164" textAnchor="middle" fill={cor} fontSize="11" letterSpacing="3.500" fontFamily="Jost, sans-serif">CAMPO ÚNICO</text>
          </>
        )}
        {tipo === "multifocal" && (
          <>
            <path d="M0 118 H320" stroke={cor} strokeOpacity=".35" strokeWidth=".8" strokeDasharray="2 4" />
            <path d="M92 250 L128 162 L192 162 L228 250" fill={cor} fillOpacity=".12" stroke={cor} strokeOpacity=".55" strokeWidth=".9" />
            <path d="M118 190 L132 162 H188 L202 190 Z" fill={cor} fillOpacity=".18" />
            <text x="160" y="104" textAnchor="middle" fill={cor} fontSize="10" letterSpacing="3" fontFamily="Jost, sans-serif">LONGE</text>
            <text x="160" y="154" textAnchor="middle" fill={cor} fontSize="10" letterSpacing="3" fontFamily="Jost, sans-serif">INTERMEDIÁRIO</text>
            <text x="160" y="226" textAnchor="middle" fill={cor} fontSize="10" letterSpacing="3" fontFamily="Jost, sans-serif">PERTO</text>
          </>
        )}
        {tipo === "fotossensivel" && (
          <>
            <rect x="32" y="32" width="256" height="256" fill={`url(#${id}f)`} />
            <text x="86" y="164" textAnchor="middle" fill="#6b5b3f" fontSize="10" letterSpacing="3" fontFamily="Jost, sans-serif">INTERIOR</text>
            <text x="236" y="164" textAnchor="middle" fill="#e8d6a8" fontSize="10" letterSpacing="3" fontFamily="Jost, sans-serif">SOL</text>
          </>
        )}
        {tipo === "luzazul" && (
          <>
            <circle cx="160" cy="160" r="96" fill="#5c8dd6" fillOpacity=".12" />
            <circle cx="160" cy="160" r="64" fill="#5c8dd6" fillOpacity=".12" />
            <circle cx="160" cy="160" r="32" fill="#5c8dd6" fillOpacity=".18" />
          </>
        )}
        {tipo === "antirreflexo" && (
          <>
            <path d="M70 100 A110 110 0 0 1 150 56" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
            <path d="M58 128 A110 110 0 0 1 66 110" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
            <path d="M230 232 L250 212 M240 232 L250 222" stroke={cor} strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
      </g>
    </svg>
  );
}
