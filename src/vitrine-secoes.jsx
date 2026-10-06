// Seções da vitrine, de cima para baixo: promessas, ofertas, categorias, destaques, guia de rosto,
// guia de lentes, sobre, localização (a lente-mapa) e rodapé.
import { useEffect, useRef, useState } from "react";
import { fotoSrc } from "./api.js";
import { Ico, RostoIcone, horariosAgrupados, linkMapa, linkRota, linkWaze, linkWhats, montarMensagem, statusAgora } from "./shared.jsx";
import { LENTES_GUIA, ROSTOS } from "./data.js";
import { ArteCategoria, DiagramaLente } from "./vitrine-arte.jsx";
import { CartaoProduto } from "./vitrine-produto.jsx";
import { comEnfase } from "./vitrine-topo.jsx";

const num = (i) => String(i + 1).padStart(2, "0");

export function CabSecao({ indice, rotulo, titulo, lead, claro, children }) {
  return (
    <header className={`vd-sec__cab${claro ? "" : " vd-sec__cab--escuro"}`} data-reveal>
      <p className="vd-indice">
        <span>{indice}</span>
        <i />
        {rotulo}
      </p>
      <h2 className="vt-display vd-sec__titulo">{titulo}</h2>
      {lead ? <p className="vd-sec__lead">{lead}</p> : null}
      {children}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Promessas                                                           */
/* ------------------------------------------------------------------ */

const PROMESSAS = [
  { t: "Consultoria técnica de verdade", d: "Cada receita é lida por quem entende. Indicamos a lente e a armação pela sua rotina, e não só pelo preço." },
  { t: "Lentes ZEISS e Transitions", d: "Embaixadora ZEISS, trabalhamos com tecnologia de ponta em visão simples, multifocal e fotossensível." },
  { t: "Armações com assinatura", d: "Design selecionado para todos os rostos e estilos: feminino, masculino e infantil, de grau e de sol." },
  { t: "Adaptação acompanhada", d: "Primeiro multifocal? Acompanhamos de perto a sua adaptação, até enxergar bem e com conforto." },
];

export function Promessas() {
  return (
    <section className="vd-sec vd-claro vd-prom" id="promessas">
      <div className="vd-wrap vd-prom__grade">
        <div className="vd-prom__lado" data-reveal>
          <p className="vt-eyebrow">A promessa</p>
          <h2 className="vt-display vd-sec__titulo">
            Mais que óculos,
            <br />
            uma <em>consultoria</em>.
          </h2>
          <p className="vd-sec__lead">Aqui a escolha do seu óculos começa pela escuta e termina com você enxergando bem, e se vendo bem.</p>
        </div>
        <ol className="vd-prom__lista">
          {PROMESSAS.map((p, i) => (
            <li key={p.t} data-reveal style={{ "--d": `${i * 0.08}s` }}>
              <span className="vd-prom__n">{num(i)}</span>
              <div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ofertas (banners)                                                   */
/* ------------------------------------------------------------------ */

function Oferta({ b, config, onCategoria, onProduto, i }) {
  const tipo = b.destino_tipo || "nenhum";
  let acao = null;
  if (b.botao && tipo !== "nenhum") {
    if (tipo === "whatsapp") {
      const href = linkWhats(config.whatsapp, `${montarMensagem(config.msg_geral, {})} (${b.titulo})`);
      acao = (
        <a className="vt-btn vt-btn--ouro vt-btn--sm" href={href} target="_blank" rel="noopener noreferrer">
          {b.botao}
        </a>
      );
    } else if (tipo === "link") {
      acao = (
        <a className="vt-btn vt-btn--ouro vt-btn--sm" href={b.destino_valor} target="_blank" rel="noopener noreferrer">
          {b.botao}
        </a>
      );
    } else if (tipo === "categoria") {
      acao = (
        <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm" onClick={() => onCategoria(b.destino_valor)}>
          {b.botao}
        </button>
      );
    } else if (tipo === "produto") {
      acao = (
        <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm" onClick={() => onProduto(b.destino_valor)}>
          {b.botao}
        </button>
      );
    }
  }
  return (
    <article className={`vd-oferta${b.foto ? " tem-foto" : ""}`} data-reveal style={{ "--d": `${i * 0.1}s` }}>
      {b.foto ? <img src={fotoSrc(b.foto)} alt="" loading="lazy" decoding="async" /> : <div className="vd-oferta__arte" aria-hidden="true"><img src="/logo-v.png" alt="" /></div>}
      <div className="vd-oferta__texto">
        <p className="vt-eyebrow">Em destaque</p>
        <h3 className="vt-display">{b.titulo}</h3>
        {b.subtitulo ? <p>{b.subtitulo}</p> : null}
        {acao}
      </div>
    </article>
  );
}

export function Ofertas({ banners, config, onCategoria, onProduto }) {
  if (!banners.length) return null;
  return (
    <section className="vd-ofertas" aria-label="Ofertas e novidades">
      <div className="vd-wrap vd-ofertas__grade" data-n={Math.min(banners.length, 3)}>
        {banners.map((b, i) => (
          <Oferta key={b.id} b={b} i={i} config={config} onCategoria={onCategoria} onProduto={onProduto} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Categorias                                                          */
/* ------------------------------------------------------------------ */

export function Categorias({ categorias, contagem, onEscolher }) {
  if (!categorias.length) return null;
  return (
    <section className="vd-sec vd-claro vd-cats-sec" id="categorias">
      <div className="vd-wrap">
        <CabSecao claro indice="01" rotulo="Categorias" titulo={<>Encontre o seu <em>estilo</em>.</>} lead="Do clássico ao arrojado, para o dia a dia ou para a ocasião. Escolha um caminho e veja as peças." />
        <div className="vd-cats" data-n={categorias.length}>
          {categorias.map((c, i) => (
            <button type="button" key={c.id} className="vd-cat" onClick={() => onEscolher(c.slug)} data-reveal style={{ "--d": `${(i % 3) * 0.09}s` }}>
              <span className="vd-cat__arco">
                {c.foto ? <img src={fotoSrc(c.foto)} alt="" loading="lazy" decoding="async" /> : <span className="vd-cat__arte"><ArteCategoria slug={c.slug} /></span>}
                <span className="vd-cat__aro" aria-hidden="true" />
              </span>
              <span className="vd-cat__rod">
                <small>{num(i)}</small>
                <strong>{c.nome}</strong>
                <em>{contagem[c.id] ? `${contagem[c.id]} ${contagem[c.id] === 1 ? "peça" : "peças"}` : "Em breve"}</em>
                <Ico n="arrowUpRight" size={20} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Destaques (trilho horizontal)                                       */
/* ------------------------------------------------------------------ */

export function Destaques({ produtos, getCat, config, favoritos, onFav, onAbrir }) {
  const ref = useRef(null);
  if (!produtos.length) return null;
  const rolar = (d) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: d * Math.max(260, el.clientWidth * 0.8), behavior: "smooth" });
  };
  return (
    <section className="vd-sec vd-claro vd-dest" id="destaques">
      <div className="vd-wrap">
        <div className="vd-dest__cab">
          <CabSecao claro indice="02" rotulo="Destaques" titulo={<>Escolhas da <em>casa</em>.</>} lead="Modelos que a equipe da Vértice separou para você começar." />
          <div className="vd-dest__setas">
            <button type="button" className="vd-seta" onClick={() => rolar(-1)} aria-label="Anteriores"><Ico n="arrowLeft" size={18} /></button>
            <button type="button" className="vd-seta" onClick={() => rolar(1)} aria-label="Próximos"><Ico n="arrowRight" size={18} /></button>
          </div>
        </div>
      </div>
      <div className="vd-trilho" ref={ref}>
        <div className="vd-trilho__in">
          {produtos.map((p, i) => (
            <CartaoProduto key={p.id} p={p} cat={getCat(p.categoria_id)} config={config} fav={favoritos.includes(p.id)} onFav={onFav} onAbrir={onAbrir} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Guia de formato de rosto                                            */
/* ------------------------------------------------------------------ */

export function GuiaRosto({ contar, onVer }) {
  const [sel, setSel] = useState("oval");
  const r = ROSTOS.find((x) => x.id === sel) || ROSTOS[0];
  const n = contar(r.id);
  return (
    <section className="vd-sec vd-escuro vd-rosto" id="rosto">
      <div className="vd-wrap">
        <CabSecao indice="04" rotulo="Seu rosto" titulo={<>Qual armação combina com <em>o seu rosto</em>?</>} lead="Escolha o formato que mais se parece com o seu e veja as armações que costumam valorizá-lo." />
        <div className="vd-rostos" role="tablist" aria-label="Formato do rosto" data-reveal>
          {ROSTOS.map((x) => (
            <button type="button" role="tab" aria-selected={x.id === sel} key={x.id} className={x.id === sel ? "is-on" : ""} onClick={() => setSel(x.id)}>
              <RostoIcone id={x.id} />
              <span>{x.nome}</span>
            </button>
          ))}
        </div>
        <div className="vd-rosto__painel" data-reveal>
          <div>
            <p className="vd-rosto__tit">Rosto {r.nome.toLowerCase()}</p>
            <p className="vd-rosto__dica">{r.dica}</p>
            <p className="vd-rosto__nota">É um guia, não uma regra. O melhor teste é experimentar, e a gente ajuda você nessa escolha.</p>
          </div>
          <div className="vd-rosto__acao">
            <p>
              <strong>{n}</strong>
              <span>{n === 1 ? "armação na coleção" : "armações na coleção"}</span>
            </p>
            <button type="button" className="vt-btn vt-btn--ouro" onClick={() => onVer(r.id)}>
              Ver armações <Ico n="arrowRight" size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Guia de lentes                                                      */
/* ------------------------------------------------------------------ */

export function GuiaLentes({ config }) {
  const [aberta, setAberta] = useState("multifocal");
  const atual = LENTES_GUIA.find((l) => l.id === aberta) || LENTES_GUIA[0];
  const zap = linkWhats(config.whatsapp, `Olá, Vértice! Gostaria de entender melhor sobre lentes ${atual.nome.toLowerCase()}.`);
  return (
    <section className="vd-sec vd-claro vd-lentes" id="lentes">
      <div className="vd-wrap vd-lentes__grade">
        <div className="vd-lentes__lado">
          <CabSecao claro indice="05" rotulo="Lentes" titulo={<>Entenda as suas <em>lentes</em>.</>} lead="A armação é o que se vê. A lente é o que faz você enxergar. Conheça os principais tipos e tratamentos." />
          <ul className="vd-acord" data-reveal>
            {LENTES_GUIA.map((l) => {
              const on = l.id === aberta;
              return (
                <li key={l.id} className={on ? "is-on" : ""}>
                  <button type="button" onClick={() => setAberta(on ? "" : l.id)} aria-expanded={on}>
                    <span>
                      <strong>{l.nome}</strong>
                      <small>{l.resumo}</small>
                    </span>
                    <Ico n={on ? "minus" : "plus"} size={20} />
                  </button>
                  <div className="vd-acord__corpo" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                    <div>
                      <p>{l.texto}</p>
                      <div className="vd-acord__diag">
                        <DiagramaLente tipo={l.id} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <a className="vt-btn vt-btn--escuro" href={zap} target="_blank" rel="noopener noreferrer" data-reveal>
            <Ico n="whatsapp" size={18} /> Tirar dúvidas com a especialista
          </a>
        </div>
        <div className="vd-lentes__arte" data-reveal>
          <div className="vd-lentes__sticky">
            <DiagramaLente tipo={atual.id} />
            <p className="vd-lentes__legenda">{atual.nome}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sobre                                                               */
/* ------------------------------------------------------------------ */

export function Sobre({ config }) {
  const paragrafos = String(config.sobre_texto || "")
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  return (
    <section className="vd-sec vd-escuro vd-sobre" id="sobre">
      <div className="vd-wrap vd-sobre__grade">
        <div className="vd-sobre__arco" data-reveal>
          <div className="vd-sobre__aro" aria-hidden="true" />
          <div className="vd-sobre__vidro">
            {config.foto_sobre ? (
              <img src={fotoSrc(config.foto_sobre)} alt={config.loja_nome} loading="lazy" decoding="async" />
            ) : (
              <div className="vd-sobre__arte">
                <img src="/logo-v.png" alt="" />
                <p>{config.slogan}</p>
              </div>
            )}
          </div>
        </div>
        <div className="vd-sobre__texto">
          <p className="vd-indice" data-reveal>
            <span>06</span>
            <i />A Vértice
          </p>
          <h2 className="vt-display vd-sec__titulo" data-reveal>
            {comEnfase(config.sobre_titulo)}
          </h2>
          <div className="vd-sobre__corpo" data-reveal>
            {paragrafos.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="vd-sobre__assina" data-reveal>
            <span />
            <p>{config.responsavel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Localização: a lente-mapa                                           */
/* ------------------------------------------------------------------ */

const TEXTO_ANEL = "VÉRTICE DESIGN ÓPTICO  ·  AV. JOSÉ ABDULMASSIH, 1095  ·  SHOPPING PARK  ·  UBERLÂNDIA — MG  ·  ";
const R_TEXTO = 247;

function useVisivel(ref) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      setV(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setV(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return v;
}

/** Mapa desenhado: aparece enquanto o mapa real carrega (ou se ele não carregar) */
function MapaDesenhado() {
  const linhas = [];
  for (let i = -2; i < 9; i++) {
    linhas.push(<path key={`v${i}`} d={`M${i * 58} -60 V460`} />);
    linhas.push(<path key={`h${i}`} d={`M-60 ${i * 58} H460`} />);
  }
  return (
    <svg viewBox="0 0 400 400" className="vd-vidro__mapa" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="400" fill="#13110e" />
      <g transform="rotate(-16 200 200)">
        <g stroke="#26211a" strokeWidth="2.200" fill="none">{linhas}</g>
        <path d="M-80 250 H480" stroke="#4a3c22" strokeWidth="10" fill="none" />
        <path d="M150 -80 V480" stroke="#352d1d" strokeWidth="7" fill="none" />
        <path d="M-80 118 H480" stroke="#2d261a" strokeWidth="5" fill="none" />
        <path d="M-20 330 C60 300 110 350 170 330 S300 300 420 340 V460 H-20Z" fill="#161b14" />
        <rect x="150" y="190" width="150" height="112" rx="10" fill="#1d1810" stroke="#c9a45c" strokeOpacity=".5" strokeWidth="1.200" />
        <text x="225" y="250" textAnchor="middle" fill="#c9a45c" fillOpacity=".7" fontFamily="Jost, sans-serif" fontSize="9" letterSpacing="3">SHOPPING PARK</text>
      </g>
    </svg>
  );
}

function LenteMapa({ config, status }) {
  const caixa = useRef(null);
  const visivel = useVisivel(caixa);
  const [carregou, setCarregou] = useState(false);
  const busca = config.mapa_busca || `${config.endereco_linha1}, ${config.endereco_linha2}`;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(busca)}&z=16&output=embed`;

  const ticks = [];
  for (let i = 0; i < 120; i++) {
    const a = (i * 3 * Math.PI) / 180;
    const forte = i % 10 === 0;
    const media = i % 5 === 0;
    const r1 = 297;
    const r2 = r1 - (forte ? 17 : media ? 12 : 6);
    ticks.push(<line key={i} x1={300 + r1 * Math.cos(a)} y1={300 - r1 * Math.sin(a)} x2={300 + r2 * Math.cos(a)} y2={300 - r2 * Math.sin(a)} className={forte ? "f" : media ? "m" : ""} />);
  }
  const graus = [];
  [0, 30, 60, 90, 120, 150, 180].forEach((v) => {
    const a = (v * Math.PI) / 180;
    graus.push(<text key={`t${v}`} x={300 + 264 * Math.cos(a)} y={300 - 264 * Math.sin(a)}>{v}</text>);
    if (v !== 0 && v !== 180) graus.push(<text key={`b${v}`} x={300 + 264 * Math.cos(a)} y={300 + 264 * Math.sin(a)}>{v}</text>);
  });

  return (
    <div className="vd-lente" ref={caixa}>
      <div className="vd-lente__halo" aria-hidden="true" />
      <svg className="vd-lente__aneis" viewBox="0 0 600 600" aria-hidden="true">
        <defs>
          <path id="vdAnelTexto" d={`M300,300 m-${R_TEXTO},0 a${R_TEXTO},${R_TEXTO} 0 1,1 ${R_TEXTO * 2},0 a${R_TEXTO},${R_TEXTO} 0 1,1 -${R_TEXTO * 2},0`} />
          <linearGradient id="vdAro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3dfa6" /><stop offset=".4" stopColor="#a67f35" /><stop offset=".7" stopColor="#e9cb88" /><stop offset="1" stopColor="#8a6a2c" />
          </linearGradient>
        </defs>
        <circle cx="300" cy="300" r="298" className="a-fino" />
        <g className="a-ticks">{ticks}</g>
        <g className="a-graus">{graus}</g>
        <g className="a-texto">
          <text>
            <textPath href="#vdAnelTexto" textLength={Math.round(2 * Math.PI * R_TEXTO)} lengthAdjust="spacing">{TEXTO_ANEL}</textPath>
          </text>
        </g>
        <circle cx="300" cy="300" r="229" className="a-fino" />
        <circle cx="300" cy="300" r="216" fill="none" stroke="url(#vdAro)" strokeWidth="9" />
        <circle cx="300" cy="300" r="210.500" className="a-fino" />
      </svg>

      <div className="vd-vidro">
        <MapaDesenhado />
        {visivel && (
          <iframe
            title={`Mapa: ${config.loja_nome}`}
            src={src}
            className={`vd-vidro__frame${carregou ? " is-on" : ""}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            tabIndex={-1}
            onLoad={() => setCarregou(true)}
          />
        )}
        <div className="vd-vidro__sombra" aria-hidden="true" />
        <div className="vd-vidro__mira" aria-hidden="true" />
        <div className="vd-vidro__brilho" aria-hidden="true" />
      </div>

      <div className="vd-pin" aria-hidden="true">
        <span className="vd-pin__onda" />
        <span className="vd-pin__onda vd-pin__onda--2" />
        <svg viewBox="0 0 56 76" width="56" height="76">
          <defs>
            <linearGradient id="vdPinG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f6e2ac" /><stop offset=".5" stopColor="#c9a45c" /><stop offset="1" stopColor="#8a6a2c" />
            </linearGradient>
          </defs>
          <path d="M28 74 C28 74 4 46 4 27 A24 24 0 0 1 52 27 C52 46 28 74 28 74Z" fill="url(#vdPinG)" stroke="#0c0b0a" strokeWidth="2" />
          <circle cx="28" cy="27" r="10" fill="#0c0b0a" />
          <path d="M22 21 L28 33 L34 21" fill="none" stroke="#e9cb88" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <a className="vd-lente__link" href={linkMapa(busca)} target="_blank" rel="noopener noreferrer" aria-label="Abrir a localização da Vértice no Google Maps" />

      <div className="vd-lente__cartao">
        <strong>{config.loja_nome}</strong>
        <span>{config.endereco_linha2}</span>
      </div>
      <div className={`vd-lente__status${status.aberto ? " is-aberto" : ""}`}>
        <i />
        {status.aberto ? "Aberto agora" : "Fechado agora"}
      </div>
    </div>
  );
}

export function Visite({ config }) {
  const [status, setStatus] = useState(() => statusAgora(config.horarios));
  useEffect(() => {
    setStatus(statusAgora(config.horarios));
    const t = setInterval(() => setStatus(statusAgora(config.horarios)), 60000);
    return () => clearInterval(t);
  }, [config.horarios]);
  const grupos = horariosAgrupados(config.horarios);
  const busca = config.mapa_busca || `${config.endereco_linha1}, ${config.endereco_linha2}`;
  const zap = linkWhats(config.whatsapp, config.msg_geral);
  return (
    <section className="vd-sec vd-escuro vd-visite" id="visite">
      <div className="vd-visite__fundo" aria-hidden="true" />
      <div className="vd-wrap vd-visite__grade">
        <div className="vd-visite__texto">
          <p className="vd-indice" data-reveal>
            <span>07</span>
            <i />
            Visite-nos
          </p>
          <h2 className="vt-display vd-sec__titulo" data-reveal>
            Venha viver a <em>experiência</em> Vértice.
          </h2>
          <address className="vd-visite__end" data-reveal>
            <Ico n="pin" size={22} sw={1.3} />
            <span>
              {config.endereco_linha1}
              <br />
              {config.endereco_linha2}
            </span>
          </address>

          <div className="vd-horas" data-reveal>
            <p className={`vd-horas__status${status.aberto ? " is-aberto" : ""}`}>
              <i />
              {status.texto}
            </p>
            <ul>
              {grupos.map((g) => (
                <li key={g.rotulo} className={g.dias.includes(status.dia) ? "is-hoje" : ""}>
                  <span>{g.rotulo}</span>
                  <b>{g.texto}</b>
                </li>
              ))}
            </ul>
            {config.horario_obs ? <p className="vd-horas__obs">{config.horario_obs}</p> : null}
          </div>

          <div className="vd-visite__botoes" data-reveal>
            <a className="vt-btn vt-btn--ouro" href={linkRota(busca)} target="_blank" rel="noopener noreferrer">
              Como chegar <Ico n="arrowUpRight" size={16} />
            </a>
            <a className="vt-btn vt-btn--linha" href={linkWaze(busca)} target="_blank" rel="noopener noreferrer">
              Abrir no Waze
            </a>
            <a className="vt-btn vt-btn--linha" href={zap} target="_blank" rel="noopener noreferrer">
              <Ico n="whatsapp" size={18} /> WhatsApp
            </a>
          </div>
        </div>
        <div className="vd-visite__lente" data-reveal>
          <LenteMapa config={config} status={status} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Rodapé                                                              */
/* ------------------------------------------------------------------ */

export function Rodape({ config }) {
  const ano = new Date().getFullYear();
  const grupos = horariosAgrupados(config.horarios);
  return (
    <footer className="vd-rodape">
      <div className="vd-wrap">
        <div className="vd-rodape__topo">
          <div className="vd-rodape__marca">
            <img src="/logo-v.png" alt="" />
            <div>
              <p className="vd-rodape__nome">Vértice</p>
              <p className="vd-rodape__sub">Design Óptico</p>
              <p className="vd-rodape__slogan">{config.slogan}</p>
            </div>
          </div>
          <div className="vd-rodape__col">
            <h4>Visite</h4>
            <p>
              {config.endereco_linha1}
              <br />
              {config.endereco_linha2}
            </p>
            {grupos.map((g) => (
              <p key={g.rotulo} className="vd-rodape__h">
                {g.rotulo}: <b>{g.texto}</b>
              </p>
            ))}
          </div>
          <div className="vd-rodape__col">
            <h4>Fale com a gente</h4>
            <p>
              <a href={linkWhats(config.whatsapp, config.msg_geral)} target="_blank" rel="noopener noreferrer">
                WhatsApp {config.whatsapp_exibir}
              </a>
            </p>
            <p>
              <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noopener noreferrer">
                Instagram @{config.instagram}
              </a>
            </p>
          </div>
          <div className="vd-rodape__col">
            <h4>Navegue</h4>
            <p><a href="#colecao">Coleção</a></p>
            <p><a href="#rosto">Seu rosto</a></p>
            <p><a href="#lentes">Lentes</a></p>
            <p><a href="#visite">Visite-nos</a></p>
          </div>
        </div>
        <div className="vd-rodape__base">
          <p>
            © {ano} {config.loja_nome}. {config.rodape_aviso}
          </p>
          <p className="vd-rodape__cred">
            Programa feito por{" "}
            <a href="https://wa.me/5534991881557" target="_blank" rel="noopener noreferrer">
              <b>Miguel Borges</b>
            </a>{" "}
            — (34) 9 9188-1557
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Botão flutuante do WhatsApp                                         */
/* ------------------------------------------------------------------ */

export function FabZap({ config, recolhido }) {
  return (
    <a className={`vd-fab${recolhido ? " is-recolhido" : ""}`} href={linkWhats(config.whatsapp, config.msg_geral)} target="_blank" rel="noopener noreferrer" aria-label="Chamar no WhatsApp">
      <Ico n="whatsapp" size={26} sw={1.4} />
    </a>
  );
}
