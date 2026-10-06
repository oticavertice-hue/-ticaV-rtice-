// Topo da vitrine: abertura, aviso, cabeçalho, hero e faixa de serviços.
import { Fragment, useEffect, useRef, useState } from "react";
import { fotoSrc } from "./api.js";
import { Ico, Glasses, linkWhats } from "./shared.jsx";

/** "Armações que *revelam* o seu rosto." → destaque em itálico dourado; \n vira quebra de linha */
export const comEnfase = (txt) =>
  String(txt || "")
    .split("\n")
    .map((linha, li, arr) => (
      <Fragment key={li}>
        {linha.split(/(\*[^*]+\*)/g).map((parte, k) => (parte.length > 2 && parte.startsWith("*") && parte.endsWith("*") ? <em key={k}>{parte.slice(1, -1)}</em> : parte))}
        {li < arr.length - 1 && <br />}
      </Fragment>
    ));

/* ------------------------------------------------------------------ */
/* Abertura em tela cheia                                              */
/* ------------------------------------------------------------------ */

const ABERTURA_MIN = 2800; // tempo mínimo na tela
const ABERTURA_MAX = 5200; // espera máxima pelos dados
const FOTO_TROCA = 2200; // troca de foto a cada 2,2 s, com transição de 0,75 s (mais lento parece travado)

export function Abertura({ fotos, pronto, config, aoFim }) {
  const [saindo, setSaindo] = useState(false);
  const [k, setK] = useState(0);
  const t0 = useRef(Date.now());
  const saiu = useRef(false);

  const sair = () => {
    if (saiu.current) return;
    saiu.current = true;
    setSaindo(true);
    setTimeout(aoFim, 950);
  };

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(sair, ABERTURA_MAX); // nunca prende o visitante, mesmo se os dados demorarem
    return () => {
      document.documentElement.style.overflow = "";
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sai quando os dados chegaram E a animação teve o tempo mínimo de aparecer
  useEffect(() => {
    if (!pronto) return undefined;
    const t = setTimeout(sair, Math.max(0, ABERTURA_MIN - (Date.now() - t0.current)));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);

  useEffect(() => {
    if (fotos.length < 2) return undefined;
    const t = setInterval(() => setK((x) => (x + 1) % fotos.length), FOTO_TROCA);
    return () => clearInterval(t);
  }, [fotos.length]);

  return (
    <div className={`vd-abertura${saindo ? " is-saindo" : ""}`} onClick={sair} role="presentation">
      {fotos.length > 0 && (
        <div className="vd-abertura__fotos" aria-hidden="true">
          {fotos.map((f, i) => (
            <img key={f + i} src={fotoSrc(f)} alt="" className={i === k ? "is-on" : ""} />
          ))}
        </div>
      )}
      <div className="vd-abertura__veu" />
      <div className="vd-abertura__centro">
        <div className="vd-abertura__marca">
          <img src="/logo-v.png" alt="" className="vd-abertura__v" />
          <span className="vd-abertura__brilho" aria-hidden="true" />
        </div>
        <p className="vd-abertura__nome">Vértice</p>
        <p className="vd-abertura__sub">
          <i />
          Design Óptico
          <i />
        </p>
        <p className="vd-abertura__slogan">{config.slogan}</p>
      </div>
      <div className="vd-abertura__pe">
        <span className="vd-abertura__barra" />
        <span>Toque para entrar</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aviso do topo                                                       */
/* ------------------------------------------------------------------ */

export function Aviso({ texto, link, aoFechar }) {
  const conteudo = <span>{texto}</span>;
  return (
    <div className="vd-aviso" role="region" aria-label="Aviso">
      {link ? (
        <a href={link} target={/^https?:/i.test(link) ? "_blank" : undefined} rel="noopener noreferrer">
          {conteudo} <Ico n="arrowRight" size={14} />
        </a>
      ) : (
        conteudo
      )}
      <button type="button" onClick={aoFechar} aria-label="Fechar aviso">
        <Ico n="close" size={15} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho                                                           */
/* ------------------------------------------------------------------ */

export const NAV = [
  ["colecao", "Coleção"],
  ["rosto", "Seu rosto"],
  ["lentes", "Lentes"],
  ["sobre", "A Vértice"],
  ["visite", "Visite-nos"],
];

export function Cabecalho({ config, solido, deslocado, qtdSel, onSelecao, menuAberto, setMenuAberto }) {
  const zap = linkWhats(config.whatsapp, config.msg_geral);

  useEffect(() => {
    if (!menuAberto) return undefined;
    document.documentElement.style.overflow = "hidden";
    const k = (e) => e.key === "Escape" && setMenuAberto(false);
    window.addEventListener("keydown", k);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", k);
    };
  }, [menuAberto, setMenuAberto]);

  return (
    <>
      <header className={`vd-topo${solido ? " is-solido" : ""}${menuAberto ? " is-menu" : ""}`} style={{ "--aviso": deslocado ? "38px" : "0px" }}>
        <div className="vd-topo__in">
          <a href="#inicio" className="vd-marca" aria-label={config.loja_nome} onClick={() => setMenuAberto(false)}>
            <img src="/logo-v.png" alt="" />
            <span>
              <b>Vértice</b>
              <i>Design Óptico</i>
            </span>
          </a>
          <nav className="vd-nav" aria-label="Principal">
            {NAV.map(([id, t]) => (
              <a key={id} href={`#${id}`}>
                {t}
              </a>
            ))}
          </nav>
          <div className="vd-topo__acoes">
            <button type="button" className="vd-sel-btn" onClick={onSelecao} aria-label={`Minha seleção${qtdSel ? `, ${qtdSel} peças` : ""}`}>
              <Ico n="heart" size={20} cheio={qtdSel > 0} />
              {qtdSel > 0 && <span>{qtdSel}</span>}
            </button>
            <a className="vt-btn vt-btn--linha vt-btn--sm vd-topo__zap" href={zap} target="_blank" rel="noopener noreferrer">
              Agendar visita
            </a>
            <button type="button" className="vd-menu-btn" onClick={() => setMenuAberto(!menuAberto)} aria-expanded={menuAberto} aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}>
              <Ico n={menuAberto ? "close" : "menu"} size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className={`vd-menu${menuAberto ? " is-aberto" : ""}`} aria-hidden={!menuAberto}>
        <nav>
          {NAV.map(([id, t], i) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuAberto(false)} style={{ "--i": i }}>
              <small>{String(i + 1).padStart(2, "0")}</small>
              <span>{t}</span>
            </a>
          ))}
        </nav>
        <div className="vd-menu__pe">
          <a className="vt-btn vt-btn--ouro vt-btn--bloco" href={zap} target="_blank" rel="noopener noreferrer" onClick={() => setMenuAberto(false)}>
            <Ico n="whatsapp" size={19} /> Agendar pelo WhatsApp
          </a>
          <p>
            {config.endereco_linha1}
            <br />
            {config.endereco_linha2}
          </p>
          <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noopener noreferrer">
            <Ico n="instagram" size={18} /> @{config.instagram}
          </a>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const SELO_TEXTO = "DESIGN ÓPTICO · VÉRTICE · DESIGN E ELEGÂNCIA · UBERLÂNDIA · ";

export function Hero({ config, fotos, qtdPecas }) {
  const [k, setK] = useState(0);
  const raiz = useRef(null);
  const zap = linkWhats(config.whatsapp, config.msg_geral);

  useEffect(() => {
    if (fotos.length < 2) return undefined;
    const t = setInterval(() => setK((x) => (x + 1) % fotos.length), 4600);
    return () => clearInterval(t);
  }, [fotos.length]);

  /* leve paralaxe do arco: só quando o hero está à vista */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let raf = 0;
    const f = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = raiz.current;
        if (!el) return;
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) el.style.setProperty("--py", `${Math.round(y * 0.06)}px`);
      });
    };
    window.addEventListener("scroll", f, { passive: true });
    return () => {
      window.removeEventListener("scroll", f);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="vd-hero" id="inicio" ref={raiz}>
      <div className="vd-hero__fundo" aria-hidden="true" />
      <div className="vd-hero__in">
        <div className="vd-hero__texto">
          <p className="vt-eyebrow vd-hero__eyebrow">Uberlândia · Shopping Park</p>
          <h1 className="vt-display vd-hero__titulo">{comEnfase(config.hero_titulo)}</h1>
          <p className="vd-hero__sub">{config.hero_subtitulo}</p>
          <div className="vd-hero__botoes">
            <a className="vt-btn vt-btn--ouro" href="#colecao">
              Explorar a coleção <Ico n="arrowRight" size={16} />
            </a>
            <a className="vt-btn vt-btn--linha" href={zap} target="_blank" rel="noopener noreferrer">
              <Ico n="whatsapp" size={18} /> Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="vd-hero__visual">
          <div className="vd-arco">
            <div className="vd-arco__aro" aria-hidden="true" />
            <div className="vd-arco__vidro">
              {fotos.length > 0 ? (
                fotos.map((f, i) => (
                  <div key={f + i} className={`vd-arco__slide${i === k ? " is-on" : ""}`}>
                    <img src={fotoSrc(f)} alt="" loading={i === 0 ? "eager" : "lazy"} />
                  </div>
                ))
              ) : (
                <div className="vd-arco__arte">
                  <svg className="vd-arco__aneis" viewBox="0 0 400 520" aria-hidden="true">
                    <circle cx="200" cy="270" r="96" />
                    <circle cx="200" cy="270" r="150" />
                    <circle cx="200" cy="270" r="206" />
                    <circle cx="200" cy="270" r="266" />
                  </svg>
                  <img src="/logo-v.png" alt="Vértice" className="vd-arco__v" />
                  <Glasses linha forma="Panto" className="vd-arco__oculos" />
                  <p>{config.slogan}</p>
                </div>
              )}
              <div className="vd-arco__sombra" aria-hidden="true" />
            </div>
            <div className="vd-selo-giro" aria-hidden="true">
              <svg viewBox="0 0 140 140">
                <defs>
                  <path id="vdSeloCirc" d="M70,70 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0" />
                </defs>
                <g className="vd-selo-giro__txt">
                  <text>
                    <textPath href="#vdSeloCirc" textLength="326" lengthAdjust="spacing">
                      {SELO_TEXTO}
                    </textPath>
                  </text>
                </g>
              </svg>
              <Ico n="glasses" size={30} sw={1.2} />
            </div>
          </div>
        </div>
      </div>

      <dl className="vd-hero__fatos">
        <div>
          <dt>+10 anos</dt>
          <dd>de experiência no mercado óptico</dd>
        </div>
        <div>
          <dt>ZEISS</dt>
          <dd>Embaixadora da marca de lentes</dd>
        </div>
        <div>
          <dt>{qtdPecas > 0 ? `${qtdPecas} peças` : "Consultoria"}</dt>
          <dd>{qtdPecas > 0 ? "na coleção, de grau e de sol" : "técnica especializada"}</dd>
        </div>
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Faixa de serviços                                                   */
/* ------------------------------------------------------------------ */

const SERVICOS = ["Consultoria técnica especializada", "Lentes ZEISS", "Transitions", "Multifocais", "Óculos de sol", "Clip-on", "Adaptação acompanhada", "Armações infantis"];

export function Faixa() {
  const linha = SERVICOS.map((s) => (
    <span key={s}>
      {s}
      <i aria-hidden="true" />
    </span>
  ));
  return (
    <div className="vd-faixa" aria-label="Nossos serviços">
      <div className="vd-faixa__trilho">
        <div>{linha}</div>
        <div aria-hidden="true">{linha}</div>
      </div>
    </div>
  );
}
