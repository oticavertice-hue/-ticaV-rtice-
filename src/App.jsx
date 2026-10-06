// Painel do dono · Vértice Design Óptico
//
// Tudo que fala com o banco ou com o Storage passa por api.js.
// Componentes auxiliares (Campo, Interruptor, Chip...) ficam SEMPRE aqui no topo, fora dos outros componentes:
// declarar um componente dentro de outro faz o React recriar o campo a cada letra e o teclado do celular fecha.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./admin.css";
import {
  DEMO,
  LIMITE_ARMAZENAMENTO,
  apagarDeVez,
  carregarPainel,
  demoReiniciar,
  entrar,
  enviarImagem,
  estatisticasAcessos,
  fotoSrc,
  limparArquivosSemUso,
  mandarParaLixeira,
  msgErro,
  perfilDe,
  removerArquivos,
  reordenar,
  restaurar,
  sair,
  salvar,
  salvarConfig,
  trocarSenha,
  usoArmazenamento,
  usuarioAtual,
} from "./api.js";
import { CATEGORIAS_PADRAO, GENEROS, MAX_FOTOS, MSG_GERAL, MSG_PRODUTO, MSG_SELECAO } from "./data.js";
import { DIAS, Glasses, Ico, Modal, confirmar, dinheiro, montarMensagem, normalizar, slugify, soNumeros, statusAgora, toast, useMedia } from "./shared.jsx";

/* ================================================================== */
/* Utilidades                                                          */
/* ================================================================== */

const FUSO = "America/Sao_Paulo";
const CREDITO_FONE = "(34) 9 9188-1557";

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pegar = (obj, chaves) => Object.fromEntries(chaves.map((k) => [k, obj[k]]));
const temFoto = (p) => (p.fotos || []).some(Boolean);
const porCriadoDesc = (a, b) => String(b.criado || "").localeCompare(String(a.criado || ""));

/** Dia (AAAA-MM-DD) e hora em Brasília: o servidor roda em UTC e "hoje" viraria o dia errado depois das 21h. */
const diaHoje = () => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(new Date());
const horaAgora = () => {
  const h = parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }).format(new Date()), 10);
  return h === 24 ? 0 : h;
};
const saudacao = () => {
  const h = horaAgora();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};
const dataExtensa = () => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO }).format(new Date());
const brDia = (s) => String(s || "").slice(0, 10).split("-").reverse().join("/");
const brData = (iso) => (iso ? brDia(new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(new Date(iso))) : "");

function fmtBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0).replace(".", ",")} MB`;
  return `${(n / 1073741824).toFixed(2).replace(".", ",")} GB`;
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* preço: aceita "349,90", "1.299,90" e "349.90" */
const precoTxt = (n) => (n === null || n === undefined || n === "" || Number.isNaN(Number(n)) ? "" : Number(n).toFixed(2).replace(".", ","));
function lerPreco(txt) {
  const t = String(txt ?? "").replace(/\s|R\$/g, "");
  if (!t) return null;
  if (!/^\d+([.,]\d+)*$/.test(t)) return NaN;
  let n;
  if (t.includes(",")) n = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) n = t.replace(/\./g, "");
  else n = t;
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : NaN;
}

/** Situação de uma oferta pelas datas (e pelo interruptor "visível"). */
function situacaoOferta(b) {
  const hoje = diaHoje();
  if (b.fim && String(b.fim).slice(0, 10) < hoje) return "encerrada";
  if (b.inicio && String(b.inicio).slice(0, 10) > hoje) return "agendada";
  return "ativa";
}

/** Telefone: mostra "(34) 9 9856-3693" enquanto digita (sem separador sobrando, para o backspace funcionar). */
function fmtFone(digitos) {
  let d = soNumeros(digitos);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, d[2] === "9" ? 11 : 10);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const r = d.slice(2);
  const resto = r[0] === "9" ? r[0] + (r.length > 1 ? " " + r.slice(1, 5) : "") + (r.length > 5 ? "-" + r.slice(5) : "") : r.slice(0, 4) + (r.length > 4 ? "-" + r.slice(4) : "");
  return `(${d.slice(0, 2)}) ${resto}`;
}
const foneValido = (txt) => {
  const n = soNumeros(txt).length;
  return n === 10 || n === 11;
};

/** Todas as fotos que estão em uso (inclusive as da lixeira): é o que a limpeza de arquivos NÃO pode apagar. */
function urlsEmUso(d) {
  const u = [];
  [...d.produtos, ...d.lixeira.produtos].forEach((p) => (p.fotos || []).forEach((f) => f && u.push(f)));
  [...d.categorias, ...d.lixeira.categorias].forEach((c) => c.foto && u.push(c.foto));
  [...d.banners, ...d.lixeira.banners].forEach((b) => b.foto && u.push(b.foto));
  ((d.config && d.config.fotos_abertura) || []).forEach((f) => f && u.push(f));
  if (d.config && d.config.foto_sobre) u.push(d.config.foto_sobre);
  return u;
}

/** Fotos enviadas durante uma edição: se a edição é cancelada (ou a foto é tirada), saem do Storage na hora. */
function useEnviadas() {
  const ref = useRef({ set: new Set(), fim: false });
  return useMemo(() => {
    const r = ref.current;
    const apagar = (l) => {
      if (l.length) removerArquivos(l).catch(() => {});
    };
    return {
      add(u) {
        if (r.fim) apagar([u]); // a janela já foi fechada enquanto a foto subia
        else r.set.add(u);
      },
      soltar(u) {
        if (r.set.delete(u)) apagar([u]);
      },
      cancelar() {
        r.fim = true;
        const l = [...r.set];
        r.set.clear();
        apagar(l);
      },
      concluir(finais, continuar = false) {
        r.fim = !continuar;
        const l = [...r.set].filter((u) => !finais.includes(u));
        r.set.clear();
        apagar(l);
      },
    };
  }, []);
}

/* ================================================================== */
/* Peças pequenas                                                      */
/* ================================================================== */

function IcoMais() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18.5" cy="12" r="1.7" />
    </svg>
  );
}

function Spinner() {
  return <span className="ad-spin" aria-hidden="true" />;
}

function Cabeca({ olho, titulo, children }) {
  return (
    <div className="ad-head">
      <div className="ad-head__txt">
        {olho ? <div className="ad-eyebrow">{olho}</div> : null}
        <h1 className="ad-title vt-display">{titulo}</h1>
      </div>
      {children ? <div className="ad-head__acoes">{children}</div> : null}
    </div>
  );
}

function Bloco({ titulo, nota, acao, children, className = "" }) {
  return (
    <section className={`ad-bloco ${className}`}>
      <div className="ad-bloco__topo">
        <div className="ad-bloco__tit">
          <h2 className="ad-rotulo">{titulo}</h2>
          {nota ? <p className="ad-nota">{nota}</p> : null}
        </div>
        {acao ? <div className="ad-bloco__acao">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Campo({ rotulo, obrig, dica, erro, id, children, className = "" }) {
  return (
    <div className={`ad-campo ${className}`} data-erro={erro ? "true" : undefined}>
      {rotulo ? (
        id ? (
          <label className="ad-campo__rot" htmlFor={id}>
            {rotulo}
            {obrig ? <i aria-hidden="true"> *</i> : null}
          </label>
        ) : (
          <span className="ad-campo__rot">
            {rotulo}
            {obrig ? <i aria-hidden="true"> *</i> : null}
          </span>
        )
      ) : null}
      {children}
      {dica ? <span className="ad-campo__dica">{dica}</span> : null}
      {erro ? (
        <span className="ad-campo__erro" role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}

function Entrada({ id, rotulo, obrig, dica, erro, valor, aoMudar, className, ...resto }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Campo id={fid} rotulo={rotulo} obrig={obrig} dica={dica} erro={erro} className={className}>
      <input id={fid} className="vt-input" value={valor ?? ""} onChange={(e) => aoMudar(e.target.value)} aria-invalid={erro ? true : undefined} {...resto} />
    </Campo>
  );
}

function AreaTexto({ id, rotulo, obrig, dica, erro, valor, aoMudar, linhas = 4, className, ...resto }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Campo id={fid} rotulo={rotulo} obrig={obrig} dica={dica} erro={erro} className={className}>
      <textarea id={fid} className="vt-textarea" rows={linhas} value={valor ?? ""} onChange={(e) => aoMudar(e.target.value)} aria-invalid={erro ? true : undefined} {...resto} />
    </Campo>
  );
}

function Seletor({ id, rotulo, obrig, dica, erro, valor, aoMudar, children, className }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Campo id={fid} rotulo={rotulo} obrig={obrig} dica={dica} erro={erro} className={className}>
      <select id={fid} className="vt-select" value={valor ?? ""} onChange={(e) => aoMudar(e.target.value)} aria-invalid={erro ? true : undefined}>
        {children}
      </select>
    </Campo>
  );
}

function Interruptor({ ligado, aoMudar, rotulo, desabilitado }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      className="ad-switch"
      onClick={(e) => {
        e.stopPropagation();
        aoMudar(!ligado);
      }}
    />
  );
}

/** Linha com texto e interruptor: a linha inteira é clicável. */
function LinhaInterruptor({ titulo, ajuda, ligado, aoMudar }) {
  return (
    <div className="ad-lsw" onClick={() => aoMudar(!ligado)}>
      <div className="ad-lsw__txt">
        <strong>{titulo}</strong>
        {ajuda ? <span>{ajuda}</span> : null}
      </div>
      <Interruptor ligado={ligado} aoMudar={aoMudar} rotulo={titulo} />
    </div>
  );
}

function Chip({ ativo, aoClicar, children, tracejado, pequeno, titulo }) {
  return (
    <button type="button" className={`ad-chip${ativo ? " is-on" : ""}${tracejado ? " ad-chip--traco" : ""}${pequeno ? " ad-chip--p" : ""}`} aria-pressed={!!ativo} onClick={aoClicar} title={titulo}>
      {children}
    </button>
  );
}

function Segmentado({ opcoes, valor, aoMudar, rotulo }) {
  return (
    <div className="ad-seg" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={valor === o.v} className={`ad-seg__b${valor === o.v ? " is-on" : ""}`} onClick={() => aoMudar(o.v)}>
          {o.rot}
        </button>
      ))}
    </div>
  );
}

function Marcador({ marcado, aoMudar, children }) {
  return (
    <label className="ad-check">
      <input type="checkbox" checked={!!marcado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="ad-check__caixa">
        <Ico n="check" size={14} sw={2.4} />
      </span>
      <span>{children}</span>
    </label>
  );
}

function Selo({ tipo, children }) {
  return <span className={`ad-selo ad-selo--${tipo}`}>{children}</span>;
}

function Secao({ n, titulo, ajuda, children }) {
  return (
    <section className="ad-sec">
      <div className="ad-sec__cab">
        <div className="ad-sec__nt">
          <span className="ad-sec__num">{n}</span>
          <h3 className="ad-sec__tit">{titulo}</h3>
        </div>
        {ajuda ? <p className="ad-sec__ajuda">{ajuda}</p> : null}
      </div>
      <div className="ad-sec__corpo">{children}</div>
    </section>
  );
}

function EstadoVazio({ titulo, texto, acao, aoAcao, secundario }) {
  return (
    <div className="ad-vazio">
      <Glasses linha className="ad-vazio__arte" />
      <h3 className="ad-vazio__tit vt-display">{titulo}</h3>
      {texto ? <p className="ad-vazio__txt">{texto}</p> : null}
      {acao ? (
        <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm" onClick={aoAcao}>
          {acao}
        </button>
      ) : null}
      {secundario ? secundario : null}
    </div>
  );
}

/** Miniatura do produto: a foto da capa ou, sem foto, a armação desenhada. */
function Miniatura({ p, className = "" }) {
  const f = (p.fotos || []).filter(Boolean)[0];
  const s = p.specs || {};
  return (
    <div className={`ad-thumb ${className}`}>
      {f ? <img src={fotoSrc(f)} alt="" loading="lazy" draggable={false} /> : <Glasses forma={s.formato} cor={s.cor} lente={s.cor_lente} material={s.material} />}
    </div>
  );
}

/** Miniatura de categoria / oferta / foto avulsa. */
function Capa({ foto, icone = "image", className = "" }) {
  return <div className={`ad-thumb ${className}`}>{foto ? <img src={fotoSrc(foto)} alt="" loading="lazy" draggable={false} /> : <Ico n={icone} size={22} className="ad-thumb__ico" />}</div>;
}

/** Menu "..." com as ações de uma linha. Abre por cima de tudo, sem ser cortado pela lista. */
function MenuAcoes({ itens, rotulo = "Mais ações" }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const painel = useRef(null);
  const fechar = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return undefined;
    const fora = (e) => {
      if ((painel.current && painel.current.contains(e.target)) || (btn.current && btn.current.contains(e.target))) return;
      fechar();
    };
    const tecla = (e) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("pointerdown", fora);
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", fechar);
    window.addEventListener("scroll", fechar, true);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [pos, fechar]);

  function alternar() {
    if (pos) {
      fechar();
      return;
    }
    const r = btn.current.getBoundingClientRect();
    const altura = itens.length * 50 + 12;
    const cabe = r.bottom + altura < window.innerHeight - 76;
    setPos({ top: cabe ? r.bottom + 4 : Math.max(8, r.top - altura - 4), right: Math.max(8, window.innerWidth - r.right) });
  }

  return (
    <>
      <button ref={btn} type="button" className="ad-iconbtn" aria-label={rotulo} aria-haspopup="menu" aria-expanded={!!pos} onClick={alternar}>
        <IcoMais />
      </button>
      {pos
        ? createPortal(
            <div ref={painel} className="ad-menu" role="menu" style={{ top: pos.top, right: pos.right }}>
              {itens.map((it) => (
                <button
                  key={it.rot}
                  type="button"
                  role="menuitem"
                  className={`ad-menu__item${it.perigo ? " is-perigo" : ""}`}
                  onClick={() => {
                    fechar();
                    it.aoClicar();
                  }}
                >
                  <Ico n={it.icone} size={18} />
                  <span>{it.rot}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/* ================================================================== */
/* Fotos: várias (produto, abertura do site) e uma só (capa, oferta)   */
/* ================================================================== */

function GradeFotos({ fotos, max, pasta, aoMudar, env, capa = true, aoOcupado }) {
  const entrada = useRef(null);
  const [subindo, setSubindo] = useState(null);

  useEffect(() => {
    if (aoOcupado) aoOcupado(!!subindo);
  }, [subindo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function escolher(e) {
    const arqs = Array.from(e.target.files || []);
    e.target.value = "";
    const livres = max - fotos.length;
    if (!arqs.length || livres <= 0) return;
    const usar = arqs.slice(0, livres);
    if (arqs.length > usar.length) toast(`Cabem só mais ${plural(livres, "foto", "fotos")}. As outras ficaram de fora.`, "erro");
    for (let i = 0; i < usar.length; i++) {
      setSubindo({ n: i + 1, total: usar.length });
      try {
        const url = await enviarImagem(usar[i], pasta);
        env.add(url);
        aoMudar((antes) => [...antes, url]);
      } catch (err) {
        toast(msgErro(err), "erro");
      }
    }
    setSubindo(null);
  }

  function mover(i, d) {
    aoMudar((antes) => {
      const l = [...antes];
      const j = i + d;
      if (j < 0 || j >= l.length) return antes;
      [l[i], l[j]] = [l[j], l[i]];
      return l;
    });
  }
  function remover(url) {
    aoMudar((antes) => antes.filter((u) => u !== url));
    env.soltar(url);
  }

  return (
    <div className="ad-fotos">
      {fotos.map((u, i) => (
        <div className="ad-foto" key={u}>
          <img src={fotoSrc(u)} alt={`Foto ${i + 1}`} draggable={false} />
          {capa && i === 0 ? <span className="ad-foto__capa">Capa</span> : !capa ? <span className="ad-foto__capa ad-foto__capa--n">{i + 1}</span> : null}
          <button type="button" className="ad-foto__x" aria-label={`Remover a foto ${i + 1}`} onClick={() => remover(u)}>
            <Ico n="close" size={16} />
          </button>
          {fotos.length > 1 ? (
            <div className="ad-foto__mover">
              <button type="button" disabled={i === 0} aria-label="Mover para antes" onClick={() => mover(i, -1)}>
                <Ico n="chevronLeft" size={18} />
              </button>
              <button type="button" disabled={i === fotos.length - 1} aria-label="Mover para depois" onClick={() => mover(i, 1)}>
                <Ico n="chevronRight" size={18} />
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {subindo ? (
        <div className="ad-foto ad-foto--subindo" role="status">
          <Spinner />
          <span>
            Enviando {subindo.n} de {subindo.total}
          </span>
        </div>
      ) : null}
      {!subindo && fotos.length < max ? (
        <button type="button" className="ad-foto ad-foto--novo" onClick={() => entrada.current && entrada.current.click()}>
          <Ico n="camera" size={26} />
          <span>Adicionar foto</span>
        </button>
      ) : null}
      <input ref={entrada} type="file" accept="image/*" multiple className="ad-oculto" tabIndex={-1} onChange={escolher} />
    </div>
  );
}

function FotoUnica({ foto, pasta, aoMudar, env, proporcao = "4 / 3", largura, aoOcupado }) {
  const entrada = useRef(null);
  const atual = useRef(foto);
  atual.current = foto;
  const [subindo, setSubindo] = useState(false);

  useEffect(() => {
    if (aoOcupado) aoOcupado(subindo);
  }, [subindo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function escolher(e) {
    const arq = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!arq) return;
    setSubindo(true);
    try {
      const url = await enviarImagem(arq, pasta);
      env.add(url);
      const antiga = atual.current;
      aoMudar(url);
      if (antiga) env.soltar(antiga); // se a antiga era uma foto nova desta edição, sai agora; senão sai ao salvar
    } catch (err) {
      toast(msgErro(err), "erro");
    }
    setSubindo(false);
  }
  function remover() {
    const antiga = atual.current;
    aoMudar("");
    if (antiga) env.soltar(antiga);
  }

  return (
    <div className="ad-unica" style={largura ? { maxWidth: largura } : undefined}>
      <div className="ad-unica__moldura" style={{ aspectRatio: proporcao }}>
        {foto ? <img src={fotoSrc(foto)} alt="" draggable={false} /> : null}
        {subindo ? (
          <div className="ad-unica__sobre" role="status">
            <Spinner />
            <span>Enviando…</span>
          </div>
        ) : null}
        {!foto && !subindo ? (
          <button type="button" className="ad-unica__vazio" onClick={() => entrada.current && entrada.current.click()}>
            <Ico n="camera" size={26} />
            <span>Escolher foto</span>
          </button>
        ) : null}
      </div>
      {foto && !subindo ? (
        <div className="ad-unica__acoes">
          <button type="button" className="vt-btn vt-btn--linha vt-btn--sm" onClick={() => entrada.current && entrada.current.click()}>
            Trocar
          </button>
          <button type="button" className="ad-textobtn is-perigo" onClick={remover}>
            Remover
          </button>
        </div>
      ) : null}
      <input ref={entrada} type="file" accept="image/*" className="ad-oculto" tabIndex={-1} onChange={escolher} />
    </div>
  );
}

/* Entrada de opções em chips: digita e Enter (ou vírgula) adiciona; X remove. */
function EntradaOpcoes({ opcoes, aoMudar, erro }) {
  const [texto, setTexto] = useState("");

  function adicionar(bruto) {
    const novos = String(bruto)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!novos.length) return;
    const lista = [...opcoes];
    novos.forEach((n) => {
      if (!lista.some((o) => normalizar(o) === normalizar(n))) lista.push(n);
    });
    aoMudar(lista);
  }

  return (
    <Campo rotulo="Opções" dica="Digite e aperte Enter (ou vírgula) para adicionar." erro={erro}>
      <div className="ad-opcoes">
        {opcoes.map((o) => (
          <span key={o} className="ad-opcao">
            {o}
            <button type="button" aria-label={`Remover ${o}`} onClick={() => aoMudar(opcoes.filter((x) => x !== o))}>
              <Ico n="close" size={13} sw={2} />
            </button>
          </span>
        ))}
        <input
          className="ad-opcoes__in"
          value={texto}
          placeholder={opcoes.length ? "Nova opção…" : "Ex.: Redondo"}
          enterKeyHint="done"
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) {
              adicionar(v);
              setTexto("");
            } else setTexto(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar(texto);
              setTexto("");
            } else if (e.key === "Backspace" && !texto && opcoes.length) {
              aoMudar(opcoes.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (texto.trim()) {
              adicionar(texto);
              setTexto("");
            }
          }}
        />
      </div>
    </Campo>
  );
}

/* ================================================================== */
/* Crédito, faixa de demonstração, telas de espera                     */
/* ================================================================== */

function Credito({ className = "" }) {
  return (
    <p className={`ad-credito ${className}`}>
      Programa feito por <strong>Miguel Borges</strong> — {CREDITO_FONE}
    </p>
  );
}

function FaixaDemo() {
  async function reiniciar() {
    const ok = await confirmar({
      titulo: "Reiniciar a demonstração?",
      texto: "Os dados de exemplo voltam ao começo e tudo o que você cadastrou aqui some.",
      ok: "Reiniciar",
      perigo: true,
    });
    if (!ok) return;
    demoReiniciar();
    window.location.reload();
  }
  return (
    <div className="ad-demo">
      <span>Modo demonstração: os dados ficam só neste navegador</span>
      <button type="button" className="ad-textobtn" onClick={reiniciar}>
        Reiniciar demonstração
      </button>
    </div>
  );
}

function Splash({ erro, aoTentar, aoSair }) {
  return (
    <div className="ad-splash">
      <img src="/logo-v.png" alt="" width="64" className={erro ? "" : "ad-splash__logo"} />
      {erro ? (
        <div className="ad-splash__erro" role="alert">
          <p>{erro}</p>
          <div className="ad-splash__acoes">
            <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm" onClick={aoTentar}>
              Tentar de novo
            </button>
            <button type="button" className="vt-btn vt-btn--linha vt-btn--sm" onClick={aoSair}>
              Sair
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================== */
/* Login                                                               */
/* ================================================================== */

function Login({ aoEntrar }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (ocupado) return;
    setErro("");
    if (!email.trim() || !senha) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }
    setOcupado(true);
    try {
      const u = await entrar(email, senha);
      const p = await perfilDe(u);
      aoEntrar(u, p);
    } catch (err) {
      setErro(msgErro(err));
      setOcupado(false);
    }
  }

  return (
    <div className="ad-login">
      <div className="ad-login__caixa">
        <img src="/logo-v.png" alt="Vértice Design Óptico" className="ad-login__logo" width="84" />
        <div className="ad-login__marca">VÉRTICE</div>
        <div className="ad-login__fio" aria-hidden="true" />
        <h1 className="ad-login__tit vt-display">Painel da loja</h1>
        <p className="ad-login__txt">Entre para cuidar da vitrine.</p>

        <form className="ad-login__form" onSubmit={enviar} noValidate>
          <Entrada
            rotulo="E-mail"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            valor={email}
            aoMudar={setEmail}
          />
          <Campo rotulo="Senha" id="ad-login-senha">
            <div className="ad-senha">
              <input
                id="ad-login-senha"
                className="vt-input"
                type={ver ? "text" : "password"}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button type="button" className="ad-senha__olho" aria-label={ver ? "Esconder a senha" : "Mostrar a senha"} onClick={() => setVer(!ver)}>
                <Ico n={ver ? "eyeOff" : "eye"} size={20} />
              </button>
            </div>
          </Campo>
          {erro ? (
            <p className="ad-login__erro" role="alert">
              <Ico n="warning" size={18} />
              <span>{erro}</span>
            </p>
          ) : null}
          <button type="submit" className="vt-btn vt-btn--ouro vt-btn--bloco" disabled={ocupado}>
            {ocupado ? "Entrando…" : "Entrar"}
          </button>
        </form>
        {DEMO ? <p className="ad-login__demo">Modo demonstração: use qualquer e-mail e senha.</p> : null}
      </div>
      <Credito className="ad-credito--escuro" />
    </div>
  );
}

/* ================================================================== */
/* Início                                                              */
/* ================================================================== */

const diaSemana = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(".", "");

function GraficoAcessos({ dias }) {
  const max = Math.max(1, ...dias.map((d) => d.n));
  const hoje = diaHoje();
  return (
    <div className={`ad-graf${dias.every((d) => !d.n) ? " ad-graf--vazio" : ""}`} role="img" aria-label={`Acessos nos últimos ${dias.length} dias`}>
      <div className="ad-graf__barras">
        {dias.map((d) => (
          <div className="ad-graf__col" key={d.dia} title={`${brDia(d.dia)}: ${plural(d.n, "acesso", "acessos")}`}>
            <span className="ad-graf__v">{d.n || ""}</span>
            <span className={`ad-graf__b${d.n ? "" : " is-zero"}`} style={{ "--f": d.n / max }} />
          </div>
        ))}
      </div>
      <div className="ad-graf__eixo">
        {dias.map((d) => (
          <div key={d.dia} className={`ad-graf__dia${d.dia === hoje ? " is-hoje" : ""}`}>
            <span>{diaSemana(d.dia)}</span>
            <b>{d.dia.slice(8)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlocoAcessos() {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState(false);
  const largo = useMedia("(min-width: 860px)");

  const carregar = useCallback(() => {
    setErro(false);
    estatisticasAcessos()
      .then(setD)
      .catch(() => setErro(true));
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const dias = d ? (d.porDia || []).slice(largo ? -14 : -7) : [];
  const nums = d
    ? [
        ["Hoje", d.hoje],
        ["7 dias", d.d7],
        ["30 dias", d.d30],
        ["Total", d.total],
      ]
    : [];

  return (
    <Bloco titulo="Acessos à vitrine" nota="Cada pessoa conta uma vez por visita.">
      {erro ? (
        <p className="ad-nota">
          Não consegui carregar os acessos.{" "}
          <button type="button" className="ad-textobtn" onClick={carregar}>
            Tentar de novo
          </button>
        </p>
      ) : !d ? (
        <p className="ad-nota">Carregando…</p>
      ) : (
        <>
          <div className="ad-acessos">
            {nums.map(([r, n]) => (
              <div key={r} className="ad-acessos__i">
                <span className="ad-rotulo">{r}</span>
                <strong className="ad-num ad-num--m">{Number(n || 0).toLocaleString("pt-BR")}</strong>
              </div>
            ))}
          </div>
          <GraficoAcessos dias={dias} />
        </>
      )}
    </Bloco>
  );
}

const NOMES_PASTA = { produtos: "Produtos", categorias: "Categorias", banners: "Ofertas", site: "Fotos do site", raiz: "Outros" };

function BlocoArmazenamento() {
  const [u, setU] = useState(null);
  const [erro, setErro] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [res, setRes] = useState(null);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      setU(await usoArmazenamento());
    } catch {
      setErro(true);
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function limpar() {
    const ok = await confirmar({
      titulo: "Limpar arquivos sem uso?",
      texto: "Apaga as fotos que não pertencem a nenhum produto, categoria, oferta ou ajuste. O que está na lixeira conta como em uso e fica. Só arquivos enviados há mais de 1 hora.",
      ok: "Limpar agora",
    });
    if (!ok) return;
    setLimpando(true);
    try {
      const fresco = await carregarPainel(); // lê de novo: nada que esteja em uso pode ser apagado
      const r = await limparArquivosSemUso(urlsEmUso(fresco));
      setRes(r);
      toast(r.removidos ? `${plural(r.removidos, "arquivo removido", "arquivos removidos")}. ${fmtBytes(r.liberado)} liberados.` : "Não havia nada para limpar.");
      await carregar();
    } catch (e) {
      toast(msgErro(e), "erro");
    }
    setLimpando(false);
  }

  const pct = u ? (u.total / LIMITE_ARMAZENAMENTO) * 100 : 0;
  const nivel = pct >= 85 ? "bad" : pct >= 70 ? "warn" : "ok";
  const pastas = u ? Object.entries(u.pastas).sort((a, b) => b[1] - a[1]) : [];

  return (
    <Bloco titulo="Armazenamento" nota="Espaço ocupado pelas fotos.">
      {erro ? (
        <p className="ad-nota">
          Não consegui ler o armazenamento.{" "}
          <button type="button" className="ad-textobtn" onClick={carregar}>
            Tentar de novo
          </button>
        </p>
      ) : !u ? (
        <p className="ad-nota">Carregando…</p>
      ) : (
        <>
          <div className="ad-uso">
            <strong className="ad-num ad-num--m">{pct < 10 ? pct.toFixed(1).replace(".", ",") : Math.round(pct)}%</strong>
            <span className="ad-nota">
              {fmtBytes(u.total)} de {fmtBytes(LIMITE_ARMAZENAMENTO)} · {plural(u.arquivos, "arquivo", "arquivos")}
            </span>
          </div>
          <div className="ad-medidor" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Espaço usado">
            <span className={`ad-medidor__v is-${nivel}`} style={{ width: `${Math.min(100, Math.max(u.total > 0 ? 1.5 : 0, pct))}%` }} />
          </div>
          {nivel !== "ok" ? (
            <p className={`ad-aviso ad-aviso--${nivel}`} role="status">
              <Ico n="warning" size={18} />
              <span>
                {nivel === "bad"
                  ? "O espaço está quase no fim. Limpe os arquivos sem uso agora ou peça ao programador para ampliar o plano."
                  : "O espaço já passou de 70%. Vale limpar os arquivos sem uso."}
              </span>
            </p>
          ) : null}
          {pastas.length ? (
            <ul className="ad-pastas">
              {pastas.map(([nome, tam]) => (
                <li key={nome}>
                  <span>{NOMES_PASTA[nome] || nome}</span>
                  <span className="ad-pastas__barra" aria-hidden="true">
                    <i style={{ width: `${u.total ? Math.max(3, (tam / u.total) * 100) : 0}%` }} />
                  </span>
                  <span className="ad-pastas__tam">{fmtBytes(tam)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ad-nota">Nenhuma foto enviada ainda.</p>
          )}
          <div className="ad-uso__acoes">
            <button type="button" className="vt-btn vt-btn--linha vt-btn--sm" onClick={limpar} disabled={limpando}>
              {limpando ? "Limpando…" : "Limpar arquivos sem uso"}
            </button>
          </div>
          {res ? (
            <p className="ad-nota ad-nota--ok" role="status">
              <Ico n="check" size={15} /> {res.removidos ? `${plural(res.removidos, "arquivo removido", "arquivos removidos")} · ${fmtBytes(res.liberado)} liberados.` : "Tudo em ordem: não havia arquivos sem uso."}
            </p>
          ) : null}
        </>
      )}
    </Bloco>
  );
}

function Inicio({ dados, admin, aoNovoProduto, aoPendencia, aoIrPara }) {
  const { produtos, categorias, banners, config } = dados;
  const status = statusAgora(config.horarios);
  const visiveis = produtos.filter((p) => p.ativo).length;
  const catVisiveis = categorias.filter((c) => c.ativo).length;
  const ofertasAtivas = banners.filter((b) => b.ativo && situacaoOferta(b) === "ativa").length;

  const pend = [
    { id: "semfoto", rot: "Sem foto", dica: "Aparecem só com a ilustração", n: produtos.filter((p) => !temFoto(p)).length },
    { id: "semPreco", rot: "Sem preço", dica: "Aparecem como “sob consulta”", n: produtos.filter((p) => p.preco === null || p.preco === undefined || p.preco === "").length },
    { id: "indisp", rot: "Indisponíveis", dica: "Marcados como indisponíveis", n: produtos.filter((p) => p.indisponivel).length },
    { id: "ocultos", rot: "Ocultos", dica: "Não aparecem no site", n: produtos.filter((p) => !p.ativo).length },
  ];
  const resumo = [
    { rot: "Produtos", n: visiveis, sub: "visíveis no site", aba: "produtos" },
    { rot: "Categorias", n: catVisiveis, sub: catVisiveis === categorias.length ? "no site" : `visíveis de ${categorias.length}`, aba: "categorias" },
    { rot: "Ofertas", n: ofertasAtivas, sub: ofertasAtivas === 1 ? "ativa agora" : "ativas agora", aba: "ofertas" },
  ];

  return (
    <>
      <Cabeca
        olho={dataExtensa()}
        titulo={
          <>
            {saudacao()}
            <em>.</em>
          </>
        }
      >
        <span className={`ad-status${status.aberto ? " is-aberto" : ""}`}>
          <i aria-hidden="true" />
          {status.texto}
        </span>
      </Cabeca>

      <div className="ad-resumo">
        {resumo.map((r) => {
          const corpo = (
            <>
              <span className="ad-rotulo">{r.rot}</span>
              <strong className="ad-num">{r.n}</strong>
              <span className="ad-nota">{r.sub}</span>
            </>
          );
          return admin ? (
            <button key={r.rot} type="button" className="ad-resumo__i is-link" onClick={() => aoIrPara(r.aba)}>
              {corpo}
            </button>
          ) : (
            <div key={r.rot} className="ad-resumo__i">
              {corpo}
            </div>
          );
        })}
      </div>

      <div className="ad-duas">
        <Bloco titulo="Atalhos" className="ad-ordem-1">
          <div className="ad-atalhos">
            <button type="button" className="vt-btn vt-btn--ouro" onClick={aoNovoProduto}>
              <Ico n="plus" size={18} /> Novo produto
            </button>
            <a className="vt-btn vt-btn--linha" href="/" target="_blank" rel="noopener noreferrer">
              Ver vitrine <Ico n="arrowUpRight" size={17} />
            </a>
          </div>
        </Bloco>

        <Bloco titulo="Pendências" nota="Toque para ver a lista de produtos." className="ad-ordem-2">
          <ul className="ad-pend">
            {pend.map((x) => (
              <li key={x.id}>
                <button type="button" className="ad-pend__i" disabled={!x.n} onClick={() => aoPendencia(x.id)}>
                  <span className="ad-pend__txt">
                    <strong>{x.rot}</strong>
                    <span>{x.n ? x.dica : "Tudo em dia"}</span>
                  </span>
                  <span className="ad-pend__n vt-display">{x.n || <Ico n="check" size={18} />}</span>
                  {x.n ? <Ico n="chevronRight" size={18} className="ad-pend__seta" /> : <span className="ad-pend__seta" />}
                </button>
              </li>
            ))}
          </ul>
        </Bloco>
      </div>

      {admin ? (
        <div className="ad-duas ad-duas--admin">
          <BlocoAcessos />
          <BlocoArmazenamento />
        </div>
      ) : null}
    </>
  );
}

/* ================================================================== */
/* Produtos: lista                                                     */
/* ================================================================== */

const SITUACOES = [
  { id: "todos", rot: "Todos", f: () => true },
  { id: "visiveis", rot: "Visíveis", f: (p) => !!p.ativo },
  { id: "ocultos", rot: "Ocultos", f: (p) => !p.ativo },
  { id: "semfoto", rot: "Sem foto", f: (p) => !temFoto(p) },
  { id: "semPreco", rot: "Sem preço", f: (p) => p.preco === null || p.preco === undefined || p.preco === "" },
  { id: "destaques", rot: "Destaques", f: (p) => !!p.destaque },
  { id: "indisp", rot: "Indisponíveis", f: (p) => !!p.indisponivel },
];

function LinhaProduto({ p, cat, aoEditar, aoDuplicar, aoExcluir, aoAlternar }) {
  const semPreco = p.preco === null || p.preco === undefined || p.preco === "";
  const promo = !semPreco && Number(p.preco_antigo) > Number(p.preco);
  const catNome = cat ? (cat.excluida ? `${cat.nome} (na lixeira)` : cat.nome) : "Sem categoria";
  return (
    <li className={`ad-prod${p.ativo ? "" : " is-off"}`}>
      <button type="button" className="ad-prod__foto" onClick={aoEditar} aria-label={`Editar ${p.nome}`}>
        <Miniatura p={p} />
      </button>
      <div className="ad-prod__nome">
        <button type="button" className="ad-prod__tit" onClick={aoEditar}>
          {p.nome || "Sem nome"}
        </button>
        {p.codigo ? <span className="ad-prod__cod ad-so-desk">{p.codigo}</span> : null}
      </div>
      <div className="ad-prod__cat">
        {p.codigo ? <span className="ad-so-mob">{p.codigo} · </span> : null}
        {catNome}
      </div>
      <div className="ad-prod__l3">
        <span className={`ad-prod__preco ad-dinheiro${semPreco ? " is-consulta" : ""}`}>
          {semPreco ? (
            "Sob consulta"
          ) : (
            <>
              {p.preco_a_partir ? <small>a partir de </small> : null}
              {dinheiro(p.preco)}
              {promo ? <s>{dinheiro(p.preco_antigo)}</s> : null}
            </>
          )}
        </span>
        <span className="ad-prod__selos">
          {!p.ativo ? <Selo tipo="oculto">Oculto</Selo> : null}
          {p.novo ? <Selo tipo="novo">Novo</Selo> : null}
          {p.destaque ? <Selo tipo="destaque">Destaque</Selo> : null}
          {p.indisponivel ? <Selo tipo="indisp">Indisponível</Selo> : null}
        </span>
      </div>
      <div className="ad-prod__acoes">
        <Interruptor ligado={p.ativo} aoMudar={aoAlternar} rotulo={`Visível no site: ${p.nome}`} />
        <MenuAcoes
          rotulo={`Ações de ${p.nome}`}
          itens={[
            { rot: "Editar", icone: "edit", aoClicar: aoEditar },
            { rot: "Duplicar", icone: "copy", aoClicar: aoDuplicar },
            { rot: "Excluir", icone: "trash", aoClicar: aoExcluir, perigo: true },
          ]}
        />
      </div>
    </li>
  );
}

function Produtos({ dados, setDados, recarregar, fp, setFp, admin, abrirForm }) {
  const { produtos, categorias, lixeira } = dados;
  const catPorId = useMemo(() => {
    const m = {};
    [...lixeira.categorias, ...categorias].forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [categorias, lixeira.categorias]);

  const contagem = useMemo(() => Object.fromEntries(SITUACOES.map((s) => [s.id, produtos.filter(s.f).length])), [produtos]);

  const lista = useMemo(() => {
    const q = normalizar(fp.busca);
    const sit = SITUACOES.find((s) => s.id === fp.situacao) || SITUACOES[0];
    return [...produtos].sort(porCriadoDesc).filter((p) => {
      if (fp.categoria !== "todas" && p.categoria_id !== fp.categoria) return false;
      if (!sit.f(p)) return false;
      if (q && !normalizar(`${p.nome} ${p.codigo} ${p.marca}`).includes(q)) return false;
      return true;
    });
  }, [produtos, fp]);

  const filtrando = fp.busca.trim() || fp.categoria !== "todas" || fp.situacao !== "todos";

  async function alternar(p) {
    const novo = { ...p, ativo: !p.ativo };
    setDados((d) => ({ ...d, produtos: d.produtos.map((x) => (x.id === p.id ? novo : x)) }));
    try {
      await salvar("produtos", novo, p);
      toast(novo.ativo ? `“${p.nome}” está visível no site.` : `“${p.nome}” foi ocultado do site.`);
    } catch (e) {
      toast(msgErro(e), "erro");
      recarregar();
    }
  }

  async function excluir(p) {
    const ok = await confirmar({
      titulo: `Mandar “${p.nome}” para a lixeira?`,
      texto: admin ? "Ele sai do site, mas você pode restaurar depois em Ajustes › Lixeira." : "Ele sai do site. Só a administração consegue restaurar.",
      ok: "Mandar para a lixeira",
      perigo: true,
    });
    if (!ok) return;
    try {
      await mandarParaLixeira("produtos", p.id);
      toast(`“${p.nome}” foi para a lixeira.`);
      await recarregar();
    } catch (e) {
      toast(msgErro(e), "erro");
    }
  }

  function duplicar(p) {
    abrirForm("produto", { ...p, id: undefined, nome: `${p.nome} (cópia)`, codigo: "", fotos: [], criado: undefined }, { aviso: `Cópia de “${p.nome}”. O código e as fotos não foram copiados.` });
  }

  const limpar = () => setFp({ busca: "", categoria: "todas", situacao: "todos" });

  return (
    <>
      <Cabeca olho="Catálogo" titulo="Produtos">
        <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm ad-so-desk" onClick={() => abrirForm("produto")}>
          <Ico n="plus" size={17} /> Novo produto
        </button>
      </Cabeca>

      {produtos.length === 0 ? (
        <EstadoVazio titulo="Nenhum produto por aqui ainda" texto="Cadastre o primeiro modelo: foto, nome e preço já bastam. O resto você completa depois." acao="Cadastrar o primeiro produto" aoAcao={() => abrirForm("produto")} />
      ) : (
        <>
          <div className="ad-busca">
            <Ico n="search" size={19} className="ad-busca__ico" />
            <input
              className="vt-input"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Buscar por nome, código ou marca"
              aria-label="Buscar produtos"
              value={fp.busca}
              onChange={(e) => setFp({ ...fp, busca: e.target.value })}
            />
            {fp.busca ? (
              <button type="button" className="ad-busca__x" aria-label="Limpar a busca" onClick={() => setFp({ ...fp, busca: "" })}>
                <Ico n="close" size={18} />
              </button>
            ) : null}
          </div>

          <div className="ad-chips ad-chips--rolar" role="group" aria-label="Filtrar por categoria">
            <Chip ativo={fp.categoria === "todas"} aoClicar={() => setFp({ ...fp, categoria: "todas" })}>
              Todas
            </Chip>
            {categorias.map((c) => (
              <Chip key={c.id} ativo={fp.categoria === c.id} aoClicar={() => setFp({ ...fp, categoria: fp.categoria === c.id ? "todas" : c.id })}>
                {c.nome}
                <span className="ad-chip__n">{produtos.filter((p) => p.categoria_id === c.id).length}</span>
              </Chip>
            ))}
          </div>

          <div className="ad-abas ad-chips--rolar" role="group" aria-label="Filtrar por situação">
            {SITUACOES.map((s) => (
              <button key={s.id} type="button" className={`ad-aba${fp.situacao === s.id ? " is-on" : ""}`} aria-pressed={fp.situacao === s.id} onClick={() => setFp({ ...fp, situacao: s.id })}>
                {s.rot}
                <span>{contagem[s.id]}</span>
              </button>
            ))}
          </div>

          {lista.length === 0 ? (
            <EstadoVazio
              titulo="Nada encontrado"
              texto="Nenhum produto combina com a busca e os filtros escolhidos."
              acao={filtrando ? "Limpar filtros" : undefined}
              aoAcao={limpar}
            />
          ) : (
            <>
              <p className="ad-contagem" aria-live="polite">
                {plural(lista.length, "produto", "produtos")}
                {filtrando ? ` de ${produtos.length}` : ""}
              </p>
              <div className="ad-lista__cab" aria-hidden="true">
                <span />
                <span>Produto</span>
                <span>Categoria</span>
                <span>Preço</span>
                <span>Situação</span>
                <span className="ad-lista__cab-d">No site</span>
              </div>
              <ul className="ad-lista">
                {lista.map((p) => (
                  <LinhaProduto
                    key={p.id}
                    p={p}
                    cat={catPorId[p.categoria_id]}
                    aoEditar={() => abrirForm("produto", p)}
                    aoDuplicar={() => duplicar(p)}
                    aoExcluir={() => excluir(p)}
                    aoAlternar={() => alternar(p)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ================================================================== */
/* Produtos: formulário                                                */
/* ================================================================== */

function formDeProduto(p, catInicial) {
  const m = (p && p.medidas) || {};
  return {
    categoria_id: (p && p.categoria_id) || catInicial || "",
    nome: (p && p.nome) || "",
    codigo: (p && p.codigo) || "",
    marca: (p && p.marca) || "",
    genero: (p && p.genero) || "",
    descricao: (p && p.descricao) || "",
    preco: precoTxt(p && p.preco),
    preco_antigo: precoTxt(p && p.preco_antigo),
    preco_a_partir: !!(p && p.preco_a_partir),
    fotos: ((p && p.fotos) || []).filter(Boolean),
    specs: { ...((p && p.specs) || {}) },
    medidas: { lente: String(m.lente ?? ""), ponte: String(m.ponte ?? ""), haste: String(m.haste ?? "") },
    destaque: !!(p && p.destaque),
    novo: !!(p && p.novo),
    indisponivel: !!(p && p.indisponivel),
    ativo: p ? p.ativo !== false : true,
  };
}

function EntradaPreco({ rotulo, valor, aoMudar, erro, dica }) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} dica={dica}>
      <div className="ad-prefixo">
        <span aria-hidden="true">R$</span>
        <input id={id} className="vt-input" inputMode="decimal" placeholder="0,00" autoComplete="off" value={valor} onChange={(e) => aoMudar(e.target.value.replace(/[^\d.,]/g, ""))} aria-invalid={erro ? true : undefined} />
      </div>
    </Campo>
  );
}

function EntradaMm({ rotulo, valor, aoMudar }) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo}>
      <div className="ad-mm">
        <input id={id} className="vt-input" inputMode="numeric" placeholder="00" autoComplete="off" value={valor} onChange={(e) => aoMudar(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        <span aria-hidden="true">mm</span>
      </div>
    </Campo>
  );
}

function CampoOpcoes({ campo, valor, aoMudar }) {
  const ops = campo.opcoes || [];
  const v = typeof valor === "string" ? valor : "";
  const [outro, setOutro] = useState(() => !!v && !ops.includes(v));
  return (
    <Campo rotulo={campo.rotulo}>
      <div className="ad-chips ad-chips--quebra">
        {ops.map((o) => (
          <Chip
            key={o}
            ativo={!outro && v === o}
            aoClicar={() => {
              setOutro(false);
              aoMudar(v === o ? undefined : o);
            }}
          >
            {o}
          </Chip>
        ))}
        <Chip
          ativo={outro}
          tracejado
          aoClicar={() => {
            if (outro) {
              setOutro(false);
              aoMudar(undefined);
            } else {
              setOutro(true);
              if (ops.includes(v)) aoMudar(undefined);
            }
          }}
        >
          Outro…
        </Chip>
      </div>
      {outro ? <input className="vt-input" autoFocus placeholder="Digite o valor" aria-label={`${campo.rotulo}: outro valor`} value={ops.includes(v) ? "" : v} onChange={(e) => aoMudar(e.target.value)} /> : null}
    </Campo>
  );
}

function CampoEspecificacao({ campo, valor, aoMudar }) {
  if (campo.tipo === "simnao") {
    return (
      <Campo rotulo={campo.rotulo}>
        <Segmentado
          rotulo={campo.rotulo}
          valor={valor === true ? "s" : valor === false ? "n" : ""}
          aoMudar={(x) => aoMudar(x === "s" ? true : x === "n" ? false : undefined)}
          opcoes={[
            { v: "s", rot: "Sim" },
            { v: "n", rot: "Não" },
            { v: "", rot: "—" },
          ]}
        />
      </Campo>
    );
  }
  if (campo.tipo === "texto") return <Entrada rotulo={campo.rotulo} valor={typeof valor === "string" ? valor : ""} aoMudar={aoMudar} />;
  return <CampoOpcoes campo={campo} valor={valor} aoMudar={aoMudar} />;
}

function FormProduto({ inicial, aviso, filtroCategoria, dados, aoFechar, aoSalvo }) {
  const editando = !!(inicial && inicial.id);
  const env = useEnviadas();
  const [f, setF] = useState(() => formDeProduto(inicial, filtroCategoria && filtroCategoria !== "todas" ? filtroCategoria : ""));
  const original = useRef(null);
  if (original.current === null) original.current = JSON.stringify(f);
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const fechando = useRef(false);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setFotos = (fn) => setF((x) => ({ ...x, fotos: fn(x.fotos) }));
  const setSpec = (chave, v) =>
    setF((x) => {
      const s = { ...x.specs };
      if (v === undefined || v === "") delete s[chave];
      else s[chave] = v;
      return { ...x, specs: s };
    });

  const cat = dados.categorias.find((c) => c.id === f.categoria_id) || dados.lixeira.categorias.find((c) => c.id === f.categoria_id) || null;
  const campos = cat ? cat.campos || [] : [];
  const marcas = useMemo(() => [...new Set(dados.produtos.map((p) => (p.marca || "").trim()).filter(Boolean))].sort(), [dados.produtos]);
  const sujo = JSON.stringify(f) !== original.current;

  const preco = lerPreco(f.preco);
  const antigo = lerPreco(f.preco_antigo);
  const erros = {};
  if (tentou) {
    if (!f.nome.trim()) erros.nome = "Dê um nome ao produto.";
    if (!f.categoria_id) erros.categoria = "Escolha a categoria.";
    if (Number.isNaN(preco)) erros.preco = "Use só números, por exemplo 349,90.";
    if (Number.isNaN(antigo)) erros.antigo = "Use só números, por exemplo 449,90.";
    if (!erros.preco && !erros.antigo && antigo !== null && (preco === null || antigo <= preco)) {
      erros.antigo = preco === null ? "Informe também o preço atual." : "O preço antigo precisa ser maior que o preço atual.";
    }
  }

  async function tentarFechar() {
    if (salvando || fechando.current) return;
    if (sujo) {
      fechando.current = true;
      const ok = await confirmar({ titulo: "Descartar o que você mudou?", texto: "As alterações deste cadastro ainda não foram salvas.", ok: "Descartar", cancelar: "Continuar editando", perigo: true });
      fechando.current = false;
      if (!ok) return;
    }
    env.cancelar(); // fotos enviadas nesta edição e não salvas saem do Storage
    aoFechar();
  }

  async function gravar() {
    setTentou(true);
    const e = {};
    if (!f.nome.trim()) e.nome = 1;
    if (!f.categoria_id) e.categoria = 1;
    if (Number.isNaN(preco)) e.preco = 1;
    if (Number.isNaN(antigo) || (antigo !== null && (preco === null || antigo <= preco))) e.antigo = 1;
    if (Object.keys(e).length) {
      requestAnimationFrame(() => {
        const el = document.querySelector(".ad-modal [data-erro='true']");
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const campo = el.querySelector("input,select,textarea");
        if (campo) campo.focus({ preventScroll: true });
      });
      return;
    }
    setSalvando(true);
    setErroGeral("");
    try {
      const specs = {};
      campos.forEach((c) => {
        const v = f.specs[c.chave];
        if (c.tipo === "simnao") {
          if (v === true || v === false) specs[c.chave] = v;
        } else if (typeof v === "string" && v.trim() !== "") specs[c.chave] = v.trim();
      });
      const linha = {
        ...(editando ? { id: inicial.id } : {}),
        categoria_id: f.categoria_id,
        nome: f.nome.trim(),
        codigo: f.codigo.trim(),
        marca: f.marca.trim(),
        genero: cat && cat.usa_genero ? f.genero : "",
        descricao: f.descricao.trim(),
        preco,
        preco_antigo: antigo,
        preco_a_partir: !!f.preco_a_partir && preco !== null,
        fotos: f.fotos,
        specs,
        medidas: cat && cat.usa_medidas ? { ...f.medidas } : { lente: "", ponte: "", haste: "" },
        destaque: f.destaque,
        novo: f.novo,
        indisponivel: f.indisponivel,
        ativo: f.ativo,
      };
      const gravada = await salvar("produtos", linha, editando ? inicial : undefined);
      env.concluir(f.fotos); // enviou e tirou antes de salvar: apaga do Storage
      toast(editando ? "Produto salvo." : "Produto cadastrado.");
      aoSalvo(gravada);
    } catch (err) {
      setErroGeral(msgErro(err));
      toast(msgErro(err), "erro");
      setSalvando(false);
    }
  }

  let n = 0;
  const num = () => String(++n).padStart(2, "0");

  return (
    <Modal
      aberto
      aoFechar={tentarFechar}
      titulo={editando ? "Editar produto" : "Novo produto"}
      sub={editando ? inicial.nome : cat ? cat.nome : "Preencha o essencial e salve"}
      largo
      classe="ad-modal"
      rodape={
        <div className="ad-rodape-form">
          {erroGeral ? (
            <p className="ad-rodape-form__erro" role="alert">
              {erroGeral}
            </p>
          ) : null}
          <button type="button" className="vt-btn vt-btn--suave" onClick={tentarFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="button" className="vt-btn vt-btn--ouro" onClick={gravar} disabled={salvando || subindo}>
            {salvando ? "Salvando…" : subindo ? "Enviando foto…" : "Salvar"}
          </button>
        </div>
      }
    >
      <form className="ad-form" onSubmit={(e) => e.preventDefault()} noValidate>
        {aviso ? (
          <p className="ad-aviso ad-aviso--info" role="status">
            <Ico n="info" size={18} />
            <span>{aviso}</span>
          </p>
        ) : null}

        <Secao n={num()} titulo="Fotos" ajuda="A primeira foto é a capa. Use as setas para mudar a ordem.">
          <GradeFotos fotos={f.fotos} max={MAX_FOTOS} pasta="produtos" aoMudar={setFotos} env={env} aoOcupado={setSubindo} />
          <p className="ad-nota ad-nota--topo">
            {f.fotos.length} de {MAX_FOTOS} fotos · tire na hora ou escolha da galeria; elas são reduzidas sozinhas.
          </p>
        </Secao>

        <Secao n={num()} titulo="Informações">
          <div className="ad-grade ad-grade--2">
            <Entrada rotulo="Nome" obrig valor={f.nome} aoMudar={(v) => set("nome", v)} erro={erros.nome} placeholder="Ex.: Lumière" autoComplete="off" className="ad-span2" />
            <Seletor rotulo="Categoria" obrig valor={f.categoria_id} aoMudar={(v) => set("categoria_id", v)} erro={erros.categoria} className="ad-span2">
              <option value="">Escolha…</option>
              {dados.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.ativo ? "" : " (oculta)"}
                </option>
              ))}
              {cat && cat.excluida ? <option value={cat.id}>{cat.nome} (na lixeira)</option> : null}
            </Seletor>
            <Entrada rotulo="Código ou referência" valor={f.codigo} aoMudar={(v) => set("codigo", v)} placeholder="Ex.: VD-0101" autoComplete="off" autoCapitalize="characters" />
            <Entrada rotulo="Marca" valor={f.marca} aoMudar={(v) => set("marca", v)} list="ad-marcas" autoComplete="off" />
            <datalist id="ad-marcas">
              {marcas.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {cat && cat.usa_genero ? (
              <Campo rotulo="Gênero" className="ad-span2">
                <div className="ad-chips ad-chips--quebra">
                  {GENEROS.map((g) => (
                    <Chip key={g} ativo={f.genero === g} aoClicar={() => set("genero", f.genero === g ? "" : g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
              </Campo>
            ) : null}
          </div>
          {dados.categorias.length === 0 ? <p className="ad-aviso ad-aviso--warn">Ainda não existe nenhuma categoria. Peça à administração para criar uma em Categorias.</p> : null}
        </Secao>

        <Secao n={num()} titulo="Especificações" ajuda="Os campos mudam conforme a categoria.">
          {!cat ? (
            <p className="ad-nota">Escolha a categoria em “Informações” para ver os campos.</p>
          ) : campos.length === 0 ? (
            <p className="ad-nota">Esta categoria ainda não tem campos de especificação.</p>
          ) : (
            <div className="ad-grade">
              {campos.map((c) => (
                <CampoEspecificacao key={c.chave} campo={c} valor={f.specs[c.chave]} aoMudar={(v) => setSpec(c.chave, v)} />
              ))}
            </div>
          )}
        </Secao>

        {cat && cat.usa_medidas ? (
          <Secao n={num()} titulo="Medidas" ajuda="O trio estampado na haste, por exemplo 52-18-140.">
            <div className="ad-grade ad-grade--3">
              <EntradaMm rotulo="Largura da lente" valor={f.medidas.lente} aoMudar={(v) => set("medidas", { ...f.medidas, lente: v })} />
              <EntradaMm rotulo="Ponte" valor={f.medidas.ponte} aoMudar={(v) => set("medidas", { ...f.medidas, ponte: v })} />
              <EntradaMm rotulo="Haste" valor={f.medidas.haste} aoMudar={(v) => set("medidas", { ...f.medidas, haste: v })} />
            </div>
            {f.medidas.lente && f.medidas.ponte && f.medidas.haste ? (
              <p className="ad-nota ad-nota--topo">
                Fica assim na haste: <strong>{f.medidas.lente}-{f.medidas.ponte}-{f.medidas.haste}</strong>
              </p>
            ) : null}
          </Secao>
        ) : null}

        <Secao n={num()} titulo="Preço" ajuda="Deixe vazio para aparecer “sob consulta”. Em promoção, preencha também o preço antigo.">
          <div className="ad-grade ad-grade--par">
            <EntradaPreco rotulo="Preço" valor={f.preco} aoMudar={(v) => set("preco", v)} erro={erros.preco} />
            <EntradaPreco rotulo="Preço antigo" valor={f.preco_antigo} aoMudar={(v) => set("preco_antigo", v)} erro={erros.antigo} />
          </div>
          <div className="ad-nota--topo">
            <Marcador marcado={f.preco_a_partir} aoMudar={(v) => set("preco_a_partir", v)}>
              Mostrar “a partir de” antes do preço
            </Marcador>
          </div>
          <p className="ad-previa-preco">
            No site aparece:{" "}
            <strong>{Number.isNaN(preco) ? "—" : preco === null ? "Sob consulta" : `${f.preco_a_partir ? "a partir de " : ""}${dinheiro(preco)}`}</strong>
          </p>
        </Secao>

        <Secao n={num()} titulo="Descrição" ajuda="Duas ou três frases. Fale do estilo e de para quem combina.">
          <AreaTexto aria-label="Descrição" valor={f.descricao} aoMudar={(v) => set("descricao", v)} linhas={5} />
        </Secao>

        <Secao n={num()} titulo="Exibição">
          <div className="ad-lsws">
            <LinhaInterruptor titulo="Visível no site" ajuda="Desligue para esconder sem apagar." ligado={f.ativo} aoMudar={(v) => set("ativo", v)} />
            <LinhaInterruptor titulo="Destaque" ajuda="Aparece no carrossel da página inicial." ligado={f.destaque} aoMudar={(v) => set("destaque", v)} />
            <LinhaInterruptor titulo="Novidade" ajuda="Ganha a etiqueta “Novo”." ligado={f.novo} aoMudar={(v) => set("novo", v)} />
            <LinhaInterruptor titulo="Indisponível" ajuda="Continua no site, marcado como indisponível." ligado={f.indisponivel} aoMudar={(v) => set("indisponivel", v)} />
          </div>
        </Secao>
      </form>
    </Modal>
  );
}

/* ================================================================== */
/* Linha de lista ordenável (categorias e ofertas)                     */
/* ================================================================== */

const moverEm = (lista, i, d) => {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const l = [...lista];
  [l[i], l[j]] = [l[j], l[i]];
  return l;
};

function ItemOrdenavel({ i, total, aoMover, thumb, titulo, linhas, ligado, aoLigar, rotuloLigar, menu, aoAbrir }) {
  return (
    <li className={`ad-item${ligado ? "" : " is-off"}`}>
      <div className="ad-ordem">
        <button type="button" disabled={i === 0} aria-label="Subir na ordem" onClick={() => aoMover(-1)}>
          <Ico n="chevronUp" size={18} />
        </button>
        <button type="button" disabled={i === total - 1} aria-label="Descer na ordem" onClick={() => aoMover(1)}>
          <Ico n="chevronDown" size={18} />
        </button>
      </div>
      <button type="button" className="ad-item__foto" onClick={aoAbrir} aria-label={`Editar ${titulo}`}>
        {thumb}
      </button>
      <div className="ad-item__txt">
        <button type="button" className="ad-item__tit" onClick={aoAbrir}>
          {titulo}
        </button>
        {linhas}
      </div>
      <div className="ad-item__acoes">
        <Interruptor ligado={ligado} aoMudar={aoLigar} rotulo={rotuloLigar} />
        {menu}
      </div>
    </li>
  );
}

/* ================================================================== */
/* Categorias                                                          */
/* ================================================================== */

function Categorias({ dados, setDados, recarregar, abrirForm }) {
  const { categorias, produtos } = dados;
  const nProd = (c) => produtos.filter((p) => p.categoria_id === c.id).length;

  async function mover(i, d) {
    const nova = moverEm(categorias, i, d);
    if (nova === categorias) return;
    setDados((x) => ({ ...x, categorias: nova.map((c, k) => ({ ...c, ordem: k })) }));
    try {
      await reordenar("categorias", nova.map((c) => c.id));
    } catch (e) {
      toast(msgErro(e), "erro");
      recarregar();
    }
  }

  async function alternar(c) {
    const nova = { ...c, ativo: !c.ativo };
    setDados((x) => ({ ...x, categorias: x.categorias.map((y) => (y.id === c.id ? nova : y)) }));
    try {
      await salvar("categorias", nova, c);
      toast(nova.ativo ? `“${c.nome}” está visível no site.` : `“${c.nome}” foi ocultada do site.`);
    } catch (e) {
      toast(msgErro(e), "erro");
      recarregar();
    }
  }

  async function excluir(c) {
    const n = nProd(c);
    const ok = await confirmar({
      titulo: `Mandar “${c.nome}” para a lixeira?`,
      texto: n
        ? `${plural(n, "produto desta categoria fica", "produtos desta categoria ficam")} oculto${n === 1 ? "" : "s"} no site até você restaurar a categoria. Nada é apagado.`
        : "Ela sai do site. Você pode restaurar depois em Ajustes › Lixeira.",
      ok: "Mandar para a lixeira",
      perigo: true,
    });
    if (!ok) return;
    try {
      await mandarParaLixeira("categorias", c.id);
      toast(`“${c.nome}” foi para a lixeira.`);
      await recarregar();
    } catch (e) {
      toast(msgErro(e), "erro");
    }
  }

  return (
    <>
      <Cabeca olho="Catálogo" titulo="Categorias">
        <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm ad-so-desk" onClick={() => abrirForm("categoria")}>
          <Ico n="plus" size={17} /> Nova categoria
        </button>
      </Cabeca>
      <p className="ad-intro">A ordem daqui é a ordem da vitrine. Cada categoria define os campos de especificação dos seus produtos.</p>

      {categorias.length === 0 ? (
        <EstadoVazio titulo="Nenhuma categoria ainda" texto="Crie a primeira categoria (por exemplo, Óculos de Grau) para começar a cadastrar produtos." acao="Criar categoria" aoAcao={() => abrirForm("categoria")} />
      ) : (
        <ul className="ad-lista">
          {categorias.map((c, i) => (
            <ItemOrdenavel
              key={c.id}
              i={i}
              total={categorias.length}
              aoMover={(d) => mover(i, d)}
              thumb={<Capa foto={c.foto} icone="grid" />}
              titulo={c.nome}
              linhas={
                <div className="ad-item__sub">
                  <span>
                    {plural(nProd(c), "produto", "produtos")} · {plural((c.campos || []).length, "campo", "campos")}
                  </span>
                  {!c.ativo ? <Selo tipo="oculto">Oculta</Selo> : null}
                </div>
              }
              ligado={c.ativo}
              aoLigar={() => alternar(c)}
              rotuloLigar={`Visível no site: ${c.nome}`}
              aoAbrir={() => abrirForm("categoria", c)}
              menu={
                <MenuAcoes
                  rotulo={`Ações de ${c.nome}`}
                  itens={[
                    { rot: "Editar", icone: "edit", aoClicar: () => abrirForm("categoria", c) },
                    { rot: "Excluir", icone: "trash", aoClicar: () => excluir(c), perigo: true },
                  ]}
                />
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------- formulário de categoria ---------- */

const TIPOS_CAMPO = [
  { v: "opcoes", rot: "Lista de opções" },
  { v: "texto", rot: "Texto livre" },
  { v: "simnao", rot: "Sim ou não" },
];

function formDeCategoria(c) {
  return {
    nome: (c && c.nome) || "",
    descricao: (c && c.descricao) || "",
    foto: (c && c.foto) || "",
    ativo: c ? c.ativo !== false : true,
    usa_medidas: c ? !!c.usa_medidas : false,
    usa_genero: c ? !!c.usa_genero : false,
    campos: ((c && c.campos) || []).map((x) => ({ _id: uid(), chave: x.chave, rotulo: x.rotulo || "", tipo: x.tipo || "texto", opcoes: [...(x.opcoes || [])], filtro: !!x.filtro })),
  };
}

function CartaCampo({ c, i, total, erros, aoAlterar, aoMover, aoRemover }) {
  return (
    <div className="ad-cc">
      <div className="ad-cc__topo">
        <span className="ad-cc__n">{String(i + 1).padStart(2, "0")}</span>
        <strong className="ad-cc__nome">{c.rotulo.trim() || "Novo campo"}</strong>
        <div className="ad-cc__btns">
          <button type="button" disabled={i === 0} aria-label="Subir o campo" onClick={() => aoMover(-1)}>
            <Ico n="chevronUp" size={18} />
          </button>
          <button type="button" disabled={i === total - 1} aria-label="Descer o campo" onClick={() => aoMover(1)}>
            <Ico n="chevronDown" size={18} />
          </button>
          <button type="button" className="is-perigo" aria-label="Remover o campo" onClick={aoRemover}>
            <Ico n="trash" size={18} />
          </button>
        </div>
      </div>
      <div className="ad-grade ad-grade--2">
        <Entrada rotulo="Nome do campo" valor={c.rotulo} aoMudar={(v) => aoAlterar({ rotulo: v })} erro={erros.rotulo} placeholder="Ex.: Formato" autoComplete="off" />
        <Seletor rotulo="Tipo" valor={c.tipo} aoMudar={(v) => aoAlterar({ tipo: v })}>
          {TIPOS_CAMPO.map((t) => (
            <option key={t.v} value={t.v}>
              {t.rot}
            </option>
          ))}
        </Seletor>
      </div>
      {c.tipo === "opcoes" ? <EntradaOpcoes opcoes={c.opcoes} aoMudar={(ops) => aoAlterar({ opcoes: ops })} erro={erros.opcoes} /> : null}
      {c.tipo !== "texto" ? <LinhaInterruptor titulo="Aparece como filtro na vitrine" ajuda="Quem visita pode filtrar os produtos por este campo." ligado={c.filtro} aoMudar={(v) => aoAlterar({ filtro: v })} /> : null}
    </div>
  );
}

function FormCategoria({ inicial, dados, aoFechar, aoSalvo }) {
  const editando = !!(inicial && inicial.id);
  const env = useEnviadas();
  const [f, setF] = useState(() => formDeCategoria(inicial));
  const original = useRef(null);
  if (original.current === null) original.current = JSON.stringify(f);
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const fechando = useRef(false);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setCampo = (i, mudanca) => setF((x) => ({ ...x, campos: x.campos.map((c, k) => (k === i ? { ...c, ...mudanca } : c)) }));
  const padrao = editando ? CATEGORIAS_PADRAO.find((c) => c.slug === inicial.slug) : null;
  const sujo = JSON.stringify(f) !== original.current;

  const errosCampos = f.campos.map((c) => {
    const e = {};
    if (!c.rotulo.trim()) e.rotulo = "Dê um nome ao campo.";
    if (c.tipo === "opcoes" && c.opcoes.length === 0) e.opcoes = "Adicione ao menos uma opção ou troque para texto livre.";
    return e;
  });
  const erros = {};
  if (tentou && !f.nome.trim()) erros.nome = "Dê um nome à categoria.";

  async function tentarFechar() {
    if (salvando || fechando.current) return;
    if (sujo) {
      fechando.current = true;
      const ok = await confirmar({ titulo: "Descartar o que você mudou?", texto: "As alterações desta categoria ainda não foram salvas.", ok: "Descartar", cancelar: "Continuar editando", perigo: true });
      fechando.current = false;
      if (!ok) return;
    }
    env.cancelar();
    aoFechar();
  }

  async function removerCampo(i) {
    const c = f.campos[i];
    if (c.chave) {
      const ok = await confirmar({
        titulo: `Remover o campo “${c.rotulo || "sem nome"}”?`,
        texto: "Os valores já preenchidos nos produtos deixam de aparecer. Só vale depois que você salvar a categoria.",
        ok: "Remover campo",
        perigo: true,
      });
      if (!ok) return;
    }
    setF((x) => ({ ...x, campos: x.campos.filter((_, k) => k !== i) }));
  }

  async function restaurarPadrao() {
    const ok = await confirmar({
      titulo: "Restaurar os campos padrão?",
      texto: "A lista de campos volta ao modelo original desta categoria. Só vale depois que você salvar.",
      ok: "Restaurar",
    });
    if (!ok) return;
    set(
      "campos",
      padrao.campos.map((c) => ({ _id: uid(), chave: c.chave, rotulo: c.rotulo, tipo: c.tipo, opcoes: [...c.opcoes], filtro: !!c.filtro })),
    );
    toast("Campos padrão restaurados. Confira e salve.");
  }

  function adicionarCampo() {
    setF((x) => ({ ...x, campos: [...x.campos, { _id: uid(), chave: "", rotulo: "", tipo: "opcoes", opcoes: [], filtro: true }] }));
    requestAnimationFrame(() => {
      const cards = document.querySelectorAll(".ad-modal .ad-cc");
      const ultimo = cards[cards.length - 1];
      if (ultimo) {
        ultimo.scrollIntoView({ behavior: "smooth", block: "center" });
        const inp = ultimo.querySelector("input");
        if (inp) inp.focus({ preventScroll: true });
      }
    });
  }

  async function gravar() {
    setTentou(true);
    if (!f.nome.trim() || errosCampos.some((e) => Object.keys(e).length)) {
      requestAnimationFrame(() => {
        const el = document.querySelector(".ad-modal [data-erro='true']");
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const campo = el.querySelector("input,select,textarea");
        if (campo) campo.focus({ preventScroll: true });
      });
      return;
    }
    setSalvando(true);
    setErroGeral("");
    try {
      // A chave de um campo novo nasce do rótulo (sem acento, com "_"); a dos campos já salvos NUNCA muda.
      const usadas = new Set(f.campos.filter((c) => c.chave).map((c) => c.chave));
      const campos = f.campos.map((c) => {
        let chave = c.chave;
        if (!chave) {
          const base = slugify(c.rotulo).replace(/-/g, "_") || "campo";
          chave = base;
          let k = 2;
          while (usadas.has(chave)) chave = `${base}_${k++}`;
          usadas.add(chave);
        }
        return { chave, rotulo: c.rotulo.trim(), tipo: c.tipo, opcoes: c.tipo === "opcoes" ? c.opcoes : [], filtro: c.tipo === "texto" ? false : !!c.filtro };
      });
      const todas = [...dados.categorias, ...dados.lixeira.categorias].filter((c) => !editando || c.id !== inicial.id);
      let slug = editando && inicial.slug ? inicial.slug : slugify(f.nome) || "categoria";
      if (!editando) {
        const base = slug;
        let k = 2;
        while (todas.some((c) => c.slug === slug)) slug = `${base}-${k++}`;
      }
      const ordem = editando ? inicial.ordem : dados.categorias.reduce((m, c) => Math.max(m, c.ordem ?? 0), -1) + 1;
      const linha = {
        ...(editando ? { id: inicial.id } : {}),
        nome: f.nome.trim(),
        slug,
        descricao: f.descricao.trim(),
        foto: f.foto,
        campos,
        usa_medidas: f.usa_medidas,
        usa_genero: f.usa_genero,
        ordem,
        ativo: f.ativo,
      };
      const gravada = await salvar("categorias", linha, editando ? inicial : undefined);
      env.concluir(f.foto ? [f.foto] : []);
      toast(editando ? "Categoria salva." : "Categoria criada.");
      aoSalvo(gravada);
    } catch (err) {
      setErroGeral(msgErro(err));
      toast(msgErro(err), "erro");
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto
      aoFechar={tentarFechar}
      titulo={editando ? "Editar categoria" : "Nova categoria"}
      sub={editando ? inicial.nome : "Nome, capa e campos de especificação"}
      largo
      classe="ad-modal"
      rodape={
        <div className="ad-rodape-form">
          {erroGeral ? (
            <p className="ad-rodape-form__erro" role="alert">
              {erroGeral}
            </p>
          ) : null}
          <button type="button" className="vt-btn vt-btn--suave" onClick={tentarFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="button" className="vt-btn vt-btn--ouro" onClick={gravar} disabled={salvando || subindo}>
            {salvando ? "Salvando…" : subindo ? "Enviando foto…" : "Salvar"}
          </button>
        </div>
      }
    >
      <form className="ad-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <Secao n="01" titulo="Identificação">
          <div className="ad-grade">
            <Entrada rotulo="Nome" obrig valor={f.nome} aoMudar={(v) => set("nome", v)} erro={erros.nome} placeholder="Ex.: Óculos de Grau" autoComplete="off" />
            <AreaTexto rotulo="Descrição curta" valor={f.descricao} aoMudar={(v) => set("descricao", v)} linhas={2} dica="Aparece embaixo do nome da categoria na vitrine." />
            <Campo rotulo="Foto de capa" dica="Opcional. Sem foto, a vitrine usa uma ilustração.">
              <FotoUnica foto={f.foto} pasta="categorias" aoMudar={(v) => set("foto", v)} env={env} proporcao="16 / 9" aoOcupado={setSubindo} />
            </Campo>
          </div>
        </Secao>

        <Secao n="02" titulo="Exibição">
          <div className="ad-lsws">
            <LinhaInterruptor titulo="Visível no site" ajuda="Desligue para esconder a categoria sem apagar." ligado={f.ativo} aoMudar={(v) => set("ativo", v)} />
            <LinhaInterruptor titulo="Usa medidas" ajuda="Pede largura da lente, ponte e haste no cadastro do produto." ligado={f.usa_medidas} aoMudar={(v) => set("usa_medidas", v)} />
            <LinhaInterruptor titulo="Usa gênero" ajuda="Pede Feminino, Masculino, Unissex ou Infantil no cadastro." ligado={f.usa_genero} aoMudar={(v) => set("usa_genero", v)} />
          </div>
        </Secao>

        <Secao n="03" titulo="Especificações" ajuda="Os campos que aparecem ao cadastrar um produto desta categoria.">
          {f.campos.length === 0 ? <p className="ad-nota">Nenhum campo ainda. Adicione, por exemplo, “Formato” ou “Cor”.</p> : null}
          <div className="ad-ccs">
            {f.campos.map((c, i) => (
              <CartaCampo
                key={c._id}
                c={c}
                i={i}
                total={f.campos.length}
                erros={tentou ? errosCampos[i] : {}}
                aoAlterar={(m) => setCampo(i, m)}
                aoMover={(d) => setF((x) => ({ ...x, campos: moverEm(x.campos, i, d) }))}
                aoRemover={() => removerCampo(i)}
              />
            ))}
          </div>
          <div className="ad-ccs__acoes">
            <button type="button" className="vt-btn vt-btn--linha vt-btn--sm" onClick={adicionarCampo}>
              <Ico n="plus" size={16} /> Adicionar campo
            </button>
            {padrao ? (
              <button type="button" className="ad-textobtn" onClick={restaurarPadrao}>
                Restaurar campos padrão
              </button>
            ) : null}
          </div>
        </Secao>
      </form>
    </Modal>
  );
}

/* ================================================================== */
/* Ofertas (banners)                                                   */
/* ================================================================== */

const DESTINOS = [
  { v: "whatsapp", rot: "WhatsApp" },
  { v: "categoria", rot: "Categoria" },
  { v: "produto", rot: "Produto" },
  { v: "link", rot: "Link externo" },
  { v: "nenhum", rot: "Nenhum" },
];
const SITUACAO_ROT = { ativa: "Ativa", agendada: "Agendada", encerrada: "Encerrada" };

function destinoTexto(b, dados) {
  const t = b.destino_tipo || "nenhum";
  if (t === "whatsapp") return "Abre o WhatsApp";
  if (t === "categoria") {
    const c = [...dados.categorias, ...dados.lixeira.categorias].find((x) => x.id === b.destino_valor);
    return c ? `Categoria: ${c.nome}` : "Categoria não encontrada";
  }
  if (t === "produto") {
    const p = [...dados.produtos, ...dados.lixeira.produtos].find((x) => x.id === b.destino_valor);
    return p ? `Produto: ${p.nome}` : "Produto não encontrado";
  }
  if (t === "link") return b.destino_valor || "Link não informado";
  return "Sem destino";
}

function periodoTexto(b) {
  if (b.inicio && b.fim) return `${brDia(b.inicio)} a ${brDia(b.fim)}`;
  if (b.inicio) return `A partir de ${brDia(b.inicio)}`;
  if (b.fim) return `Até ${brDia(b.fim)}`;
  return "Sem prazo";
}

function Ofertas({ dados, setDados, recarregar, abrirForm }) {
  const { banners } = dados;

  async function mover(i, d) {
    const nova = moverEm(banners, i, d);
    if (nova === banners) return;
    setDados((x) => ({ ...x, banners: nova.map((b, k) => ({ ...b, ordem: k })) }));
    try {
      await reordenar("banners", nova.map((b) => b.id));
    } catch (e) {
      toast(msgErro(e), "erro");
      recarregar();
    }
  }

  async function alternar(b) {
    const nova = { ...b, ativo: !b.ativo };
    setDados((x) => ({ ...x, banners: x.banners.map((y) => (y.id === b.id ? nova : y)) }));
    try {
      await salvar("banners", nova, b);
      toast(nova.ativo ? "Oferta visível no site." : "Oferta ocultada do site.");
    } catch (e) {
      toast(msgErro(e), "erro");
      recarregar();
    }
  }

  async function excluir(b) {
    const ok = await confirmar({ titulo: `Mandar “${b.titulo}” para a lixeira?`, texto: "Ela sai do site. Você pode restaurar depois em Ajustes › Lixeira.", ok: "Mandar para a lixeira", perigo: true });
    if (!ok) return;
    try {
      await mandarParaLixeira("banners", b.id);
      toast("A oferta foi para a lixeira.");
      await recarregar();
    } catch (e) {
      toast(msgErro(e), "erro");
    }
  }

  return (
    <>
      <Cabeca olho="Vitrine" titulo="Ofertas">
        <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm ad-so-desk" onClick={() => abrirForm("oferta")}>
          <Ico n="plus" size={17} /> Nova oferta
        </button>
      </Cabeca>
      <p className="ad-intro">Os destaques da página inicial. Eles aparecem na ordem daqui, dentro das datas que você escolher.</p>

      {banners.length === 0 ? (
        <EstadoVazio titulo="Nenhuma oferta por aqui" texto="Crie uma oferta com título, foto e um botão que leva ao WhatsApp, a uma categoria ou a um produto." acao="Criar oferta" aoAcao={() => abrirForm("oferta")} />
      ) : (
        <ul className="ad-lista">
          {banners.map((b, i) => {
            const sit = situacaoOferta(b);
            return (
              <ItemOrdenavel
                key={b.id}
                i={i}
                total={banners.length}
                aoMover={(d) => mover(i, d)}
                thumb={<Capa foto={b.foto} icone="tag" />}
                titulo={b.titulo || "Sem título"}
                linhas={
                  <>
                    <div className="ad-item__sub">
                      <span>{destinoTexto(b, dados)}</span>
                    </div>
                    <div className="ad-item__sub">
                      {!b.ativo ? <Selo tipo="oculto">Oculta</Selo> : <Selo tipo={`sit-${sit}`}>{SITUACAO_ROT[sit]}</Selo>}
                      <span>{periodoTexto(b)}</span>
                    </div>
                  </>
                }
                ligado={b.ativo}
                aoLigar={() => alternar(b)}
                rotuloLigar={`Visível no site: ${b.titulo}`}
                aoAbrir={() => abrirForm("oferta", b)}
                menu={
                  <MenuAcoes
                    rotulo={`Ações de ${b.titulo}`}
                    itens={[
                      { rot: "Editar", icone: "edit", aoClicar: () => abrirForm("oferta", b) },
                      { rot: "Excluir", icone: "trash", aoClicar: () => excluir(b), perigo: true },
                    ]}
                  />
                }
              />
            );
          })}
        </ul>
      )}
    </>
  );
}

function formDeOferta(b) {
  return {
    titulo: (b && b.titulo) || "",
    subtitulo: (b && b.subtitulo) || "",
    botao: (b && b.botao) || "",
    destino_tipo: (b && b.destino_tipo) || "whatsapp",
    destino_valor: (b && b.destino_valor) || "",
    foto: (b && b.foto) || "",
    inicio: b && b.inicio ? String(b.inicio).slice(0, 10) : "",
    fim: b && b.fim ? String(b.fim).slice(0, 10) : "",
    ativo: b ? b.ativo !== false : true,
  };
}

function FormOferta({ inicial, dados, aoFechar, aoSalvo }) {
  const editando = !!(inicial && inicial.id);
  const env = useEnviadas();
  const [f, setF] = useState(() => formDeOferta(inicial));
  const original = useRef(null);
  if (original.current === null) original.current = JSON.stringify(f);
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const fechando = useRef(false);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const sujo = JSON.stringify(f) !== original.current;
  const produtosOrdenados = useMemo(() => [...dados.produtos].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR")), [dados.produtos]);

  const erros = {};
  if (tentou) {
    if (!f.titulo.trim()) erros.titulo = "Dê um título à oferta.";
    if (f.destino_tipo === "categoria" && !f.destino_valor) erros.destino = "Escolha a categoria.";
    if (f.destino_tipo === "produto" && !f.destino_valor) erros.destino = "Escolha o produto.";
    if (f.destino_tipo === "link" && !f.destino_valor.trim()) erros.destino = "Cole o endereço do link.";
    if (f.inicio && f.fim && f.fim < f.inicio) erros.fim = "O fim não pode ser antes do início.";
  }

  async function tentarFechar() {
    if (salvando || fechando.current) return;
    if (sujo) {
      fechando.current = true;
      const ok = await confirmar({ titulo: "Descartar o que você mudou?", texto: "As alterações desta oferta ainda não foram salvas.", ok: "Descartar", cancelar: "Continuar editando", perigo: true });
      fechando.current = false;
      if (!ok) return;
    }
    env.cancelar();
    aoFechar();
  }

  async function gravar() {
    setTentou(true);
    const ruim =
      !f.titulo.trim() ||
      ((f.destino_tipo === "categoria" || f.destino_tipo === "produto") && !f.destino_valor) ||
      (f.destino_tipo === "link" && !f.destino_valor.trim()) ||
      (f.inicio && f.fim && f.fim < f.inicio);
    if (ruim) {
      requestAnimationFrame(() => {
        const el = document.querySelector(".ad-modal [data-erro='true']");
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const campo = el.querySelector("input,select,textarea");
        if (campo) campo.focus({ preventScroll: true });
      });
      return;
    }
    setSalvando(true);
    setErroGeral("");
    try {
      let valor = f.destino_tipo === "categoria" || f.destino_tipo === "produto" ? f.destino_valor : f.destino_tipo === "link" ? f.destino_valor.trim() : "";
      if (f.destino_tipo === "link" && !/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(valor)) valor = `https://${valor}`;
      const ordem = editando ? inicial.ordem : dados.banners.reduce((m, b) => Math.max(m, b.ordem ?? 0), -1) + 1;
      const linha = {
        ...(editando ? { id: inicial.id } : {}),
        titulo: f.titulo.trim(),
        subtitulo: f.subtitulo.trim(),
        botao: f.botao.trim(),
        destino_tipo: f.destino_tipo,
        destino_valor: valor,
        foto: f.foto,
        inicio: f.inicio || null,
        fim: f.fim || null,
        ordem,
        ativo: f.ativo,
      };
      const gravada = await salvar("banners", linha, editando ? inicial : undefined);
      env.concluir(f.foto ? [f.foto] : []);
      toast(editando ? "Oferta salva." : "Oferta criada.");
      aoSalvo(gravada);
    } catch (err) {
      setErroGeral(msgErro(err));
      toast(msgErro(err), "erro");
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto
      aoFechar={tentarFechar}
      titulo={editando ? "Editar oferta" : "Nova oferta"}
      sub={editando ? inicial.titulo : "Aparece nos destaques da página inicial"}
      largo
      classe="ad-modal"
      rodape={
        <div className="ad-rodape-form">
          {erroGeral ? (
            <p className="ad-rodape-form__erro" role="alert">
              {erroGeral}
            </p>
          ) : null}
          <button type="button" className="vt-btn vt-btn--suave" onClick={tentarFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="button" className="vt-btn vt-btn--ouro" onClick={gravar} disabled={salvando || subindo}>
            {salvando ? "Salvando…" : subindo ? "Enviando foto…" : "Salvar"}
          </button>
        </div>
      }
    >
      <form className="ad-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <Secao n="01" titulo="Texto">
          <div className="ad-grade">
            <Entrada rotulo="Título" obrig valor={f.titulo} aoMudar={(v) => set("titulo", v)} erro={erros.titulo} placeholder="Ex.: Meu primeiro multifocal" autoComplete="off" />
            <AreaTexto rotulo="Subtítulo" valor={f.subtitulo} aoMudar={(v) => set("subtitulo", v)} linhas={2} placeholder="Ex.: 50% off nas lentes ZEISS. Consulte regulamento na loja." />
            <Entrada rotulo="Texto do botão" valor={f.botao} aoMudar={(v) => set("botao", v)} placeholder="Ex.: Quero saber mais" autoComplete="off" />
          </div>
        </Secao>

        <Secao n="02" titulo="Para onde leva" ajuda="O que acontece quando a pessoa toca no botão.">
          <div className="ad-grade">
            <Campo rotulo="Destino">
              <div className="ad-chips ad-chips--quebra">
                {DESTINOS.map((d) => (
                  <Chip key={d.v} ativo={f.destino_tipo === d.v} aoClicar={() => setF((x) => ({ ...x, destino_tipo: d.v, destino_valor: "" }))}>
                    {d.rot}
                  </Chip>
                ))}
              </div>
            </Campo>
            {f.destino_tipo === "categoria" ? (
              <Seletor rotulo="Categoria" valor={f.destino_valor} aoMudar={(v) => set("destino_valor", v)} erro={erros.destino}>
                <option value="">Escolha…</option>
                {dados.categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Seletor>
            ) : null}
            {f.destino_tipo === "produto" ? (
              <Seletor rotulo="Produto" valor={f.destino_valor} aoMudar={(v) => set("destino_valor", v)} erro={erros.destino}>
                <option value="">Escolha…</option>
                {produtosOrdenados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                    {p.codigo ? ` · ${p.codigo}` : ""}
                  </option>
                ))}
              </Seletor>
            ) : null}
            {f.destino_tipo === "link" ? (
              <Entrada rotulo="Endereço do link" valor={f.destino_valor} aoMudar={(v) => set("destino_valor", v)} erro={erros.destino} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://" />
            ) : null}
            {f.destino_tipo === "whatsapp" ? <p className="ad-nota">O botão abre uma conversa no WhatsApp da loja.</p> : null}
            {f.destino_tipo === "nenhum" ? <p className="ad-nota">A oferta aparece só como aviso, sem botão de ação.</p> : null}
          </div>
        </Secao>

        <Secao n="03" titulo="Foto" ajuda="Foto horizontal funciona melhor.">
          <FotoUnica foto={f.foto} pasta="banners" aoMudar={(v) => set("foto", v)} env={env} proporcao="16 / 9" aoOcupado={setSubindo} />
        </Secao>

        <Secao n="04" titulo="Período" ajuda="Deixe vazio para valer sempre.">
          <div className="ad-grade ad-grade--2">
            <Entrada rotulo="Começa em" type="date" valor={f.inicio} aoMudar={(v) => set("inicio", v)} />
            <Entrada rotulo="Termina em" type="date" valor={f.fim} aoMudar={(v) => set("fim", v)} erro={erros.fim} min={f.inicio || undefined} />
          </div>
        </Secao>

        <Secao n="05" titulo="Exibição">
          <div className="ad-lsws">
            <LinhaInterruptor titulo="Visível no site" ajuda="Dentro das datas acima." ligado={f.ativo} aoMudar={(v) => set("ativo", v)} />
          </div>
        </Secao>
      </form>
    </Modal>
  );
}

/* ================================================================== */
/* Ajustes                                                             */
/* ================================================================== */

const SUBS = [
  { id: "loja", rot: "Loja" },
  { id: "horarios", rot: "Horários" },
  { id: "textos", rot: "Textos" },
  { id: "fotos", rot: "Fotos do site" },
  { id: "whats", rot: "WhatsApp" },
  { id: "lixeira", rot: "Lixeira" },
  { id: "conta", rot: "Conta" },
];

const CHAVES = {
  loja: ["loja_nome", "slogan", "responsavel", "whatsapp", "whatsapp_exibir", "instagram", "endereco_linha1", "endereco_linha2", "mapa_busca", "parcelas_max", "mostrar_precos", "rodape_aviso"],
  horarios: ["horarios", "horario_obs"],
  textos: ["hero_titulo", "hero_subtitulo", "aviso_topo", "aviso_link", "sobre_titulo", "sobre_texto"],
  fotos: ["fotos_abertura", "foto_sobre"],
  whats: ["msg_produto", "msg_selecao", "msg_geral"],
};

const TITULOS_SUB = {
  loja: ["Loja", "Nome, contato, endereço e preços."],
  horarios: ["Horários", "Quando a loja está aberta."],
  textos: ["Textos do site", "As frases da página inicial, o aviso do topo e a história da loja."],
  fotos: ["Fotos do site", "As imagens grandes da página inicial."],
  whats: ["Mensagens do WhatsApp", "O texto que já vem escrito quando o cliente toca em “chamar no WhatsApp”."],
};

function validarSecao(id, r) {
  const e = {};
  if (id === "loja") {
    if (!String(r.loja_nome || "").trim()) e.loja_nome = "Informe o nome da loja.";
    if (!foneValido(r.whatsapp_exibir)) e.whatsapp = "Número incompleto. Use o DDD e o número, por exemplo (34) 9 9856-3693.";
    const p = Number(r.parcelas_max);
    if (!(p >= 1 && p <= 24)) e.parcelas_max = "Escolha de 1 a 12 parcelas.";
  }
  if (id === "horarios") {
    const h = r.horarios || {};
    for (let d = 0; d < 7; d++) {
      const x = h[d];
      if (x && x.aberto) {
        if (!x.abre || !x.fecha) e[`h${d}`] = `Preencha o horário de ${DIAS[d].toLowerCase()}.`;
        else if (x.fecha <= x.abre) e[`h${d}`] = "O fechamento precisa ser depois da abertura.";
      }
    }
  }
  if (id === "whats") {
    ["msg_produto", "msg_selecao", "msg_geral"].forEach((k) => {
      if (!String(r[k] || "").trim()) e[k] = "A mensagem não pode ficar vazia. Use “Voltar ao texto original” se precisar.";
    });
  }
  return e;
}

const comEsquema = (v) => (!v || /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(v) ? v : `https://${v}`);

/** Limpa o que a pessoa digitou antes de gravar. */
function prepararSecao(id, v) {
  const x = { ...v };
  const trim = (k) => {
    if (typeof x[k] === "string") x[k] = x[k].trim();
  };
  if (id === "loja") {
    ["loja_nome", "slogan", "responsavel", "endereco_linha1", "endereco_linha2", "mapa_busca", "rodape_aviso"].forEach(trim);
    x.instagram = String(x.instagram || "")
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/[/?].*$/, "");
    const d = soNumeros(x.whatsapp_exibir);
    x.whatsapp_exibir = fmtFone(d);
    x.whatsapp = `55${soNumeros(x.whatsapp_exibir)}`;
    x.parcelas_max = Number(x.parcelas_max);
  }
  if (id === "horarios") trim("horario_obs");
  if (id === "textos") {
    ["hero_titulo", "hero_subtitulo", "aviso_topo", "sobre_titulo", "sobre_texto"].forEach(trim);
    x.aviso_link = comEsquema(String(x.aviso_link || "").trim());
  }
  if (id === "whats") ["msg_produto", "msg_selecao", "msg_geral"].forEach(trim);
  return x;
}

function EntradaPrefixo({ rotulo, prefixo, valor, aoMudar, erro, dica, ...resto }) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} dica={dica}>
      <div className="ad-prefixo">
        <span aria-hidden="true">{prefixo}</span>
        <input id={id} className="vt-input" value={valor ?? ""} onChange={(e) => aoMudar(e.target.value)} aria-invalid={erro ? true : undefined} {...resto} />
      </div>
    </Campo>
  );
}

function Contador({ n, max }) {
  return <span className={`ad-cont${n > max ? " is-passou" : ""}`}>{n} de {max} letras sugeridas</span>;
}

/** "*palavra*" vira destaque dourado, como no site. */
function TituloComDestaque({ texto }) {
  const partes = String(texto || "").split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {partes.map((p, i) => (p.length > 2 && p.startsWith("*") && p.endsWith("*") ? <em key={i}>{p.slice(1, -1)}</em> : <span key={i}>{p}</span>))}
    </>
  );
}

/** No WhatsApp, *texto* fica em negrito. */
function TextoZap({ texto }) {
  const partes = String(texto || "").split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {partes.map((p, i) => (p.length > 2 && p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

function BarraSalvar({ sujo, salvando, bloqueado, aoSalvar, aoDescartar }) {
  return (
    <div className={`ad-barra${sujo ? " is-sujo" : ""}`} role="status">
      <span className="ad-barra__txt">
        {sujo ? (
          <>
            <i aria-hidden="true" /> Alterações não salvas
          </>
        ) : (
          <>
            <Ico n="check" size={16} /> Tudo salvo
          </>
        )}
      </span>
      <div className="ad-barra__acoes">
        {sujo ? (
          <button type="button" className="ad-textobtn" onClick={aoDescartar} disabled={salvando}>
            Descartar
          </button>
        ) : null}
        <button type="button" className="vt-btn vt-btn--ouro vt-btn--sm" onClick={aoSalvar} disabled={!sujo || salvando || bloqueado}>
          {salvando ? "Salvando…" : bloqueado ? "Enviando foto…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function AjLoja({ r, set, setVarios, erros }) {
  return (
    <div className="ad-grade ad-grade--2">
      <Entrada rotulo="Nome da loja" obrig valor={r.loja_nome} aoMudar={(v) => set("loja_nome", v)} erro={erros.loja_nome} autoComplete="off" className="ad-span2" />
      <Entrada rotulo="Slogan" valor={r.slogan} aoMudar={(v) => set("slogan", v)} autoComplete="off" />
      <Entrada rotulo="Responsável / título" valor={r.responsavel} aoMudar={(v) => set("responsavel", v)} autoComplete="off" />
      <Entrada
        rotulo="WhatsApp"
        obrig
        type="tel"
        inputMode="tel"
        autoComplete="off"
        placeholder="(34) 9 9999-9999"
        valor={r.whatsapp_exibir}
        aoMudar={(v) => {
          const t = fmtFone(v);
          const d = soNumeros(t);
          setVarios({ whatsapp_exibir: t, whatsapp: d ? `55${d}` : "" });
        }}
        erro={erros.whatsapp}
        dica="É para este número que as mensagens dos clientes chegam."
      />
      <EntradaPrefixo rotulo="Instagram" prefixo="@" valor={r.instagram} aoMudar={(v) => set("instagram", v)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="usuario" />
      <Entrada rotulo="Endereço · linha 1" valor={r.endereco_linha1} aoMudar={(v) => set("endereco_linha1", v)} autoComplete="off" />
      <Entrada rotulo="Endereço · linha 2" valor={r.endereco_linha2} aoMudar={(v) => set("endereco_linha2", v)} autoComplete="off" />
      <Entrada rotulo="Busca do mapa" valor={r.mapa_busca} aoMudar={(v) => set("mapa_busca", v)} autoComplete="off" dica="O endereço completo, do jeito que você digitaria no Google Maps." className="ad-span2" />
      <Seletor rotulo="Parcelas máximas" valor={String(r.parcelas_max)} aoMudar={(v) => set("parcelas_max", Number(v))} erro={erros.parcelas_max}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n === 1 ? "À vista (sem parcelar)" : `Em até ${n}x`}
          </option>
        ))}
      </Seletor>
      <div className="ad-lsws">
        <LinhaInterruptor titulo="Mostrar preços na vitrine" ajuda="Desligado, todo produto aparece como “Consulte valores”." ligado={!!r.mostrar_precos} aoMudar={(v) => set("mostrar_precos", v)} />
      </div>
      <AreaTexto rotulo="Aviso no rodapé do site" valor={r.rodape_aviso} aoMudar={(v) => set("rodape_aviso", v)} linhas={2} className="ad-span2" />
    </div>
  );
}

function AjHorarios({ r, set, erros }) {
  const h = r.horarios || {};
  const vazio = { aberto: false, abre: "", fecha: "" };
  const muda = (d, m) => set("horarios", { ...h, [d]: { ...(h[d] || vazio), ...m } });
  function copiarSegunda() {
    const seg = h[1] || vazio;
    set("horarios", { ...h, 2: { ...seg }, 3: { ...seg }, 4: { ...seg }, 5: { ...seg } });
    toast("Segunda copiada para terça a sexta. Confira e salve.");
  }
  return (
    <>
      <ul className="ad-dias">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
          const x = h[d] || vazio;
          return (
            <li key={d} className={`ad-dia${x.aberto ? "" : " is-fechado"}`} data-erro={erros[`h${d}`] ? "true" : undefined}>
              <span className="ad-dia__nome">{DIAS[d]}</span>
              <Interruptor
                ligado={!!x.aberto}
                rotulo={`${DIAS[d]}: aberto`}
                aoMudar={(v) => muda(d, v ? { aberto: true, abre: x.abre || "09:00", fecha: x.fecha || "18:00" } : { aberto: false })}
              />
              {x.aberto ? (
                <div className="ad-dia__horas">
                  <input type="time" className="vt-input" aria-label={`${DIAS[d]}: abre às`} value={x.abre || ""} onChange={(e) => muda(d, { abre: e.target.value })} />
                  <span aria-hidden="true">às</span>
                  <input type="time" className="vt-input" aria-label={`${DIAS[d]}: fecha às`} value={x.fecha || ""} onChange={(e) => muda(d, { fecha: e.target.value })} />
                </div>
              ) : (
                <span className="ad-dia__fechado">Fechado</span>
              )}
              {erros[`h${d}`] ? (
                <span className="ad-campo__erro ad-dia__erro" role="alert">
                  {erros[`h${d}`]}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="ad-nota--topo">
        <button type="button" className="ad-textobtn" onClick={copiarSegunda}>
          Copiar o horário de segunda para terça a sexta
        </button>
      </div>
      <Entrada rotulo="Observação" valor={r.horario_obs} aoMudar={(v) => set("horario_obs", v)} placeholder="Ex.: Feriados: confira no Instagram" dica="Aparece junto dos horários no site." className="ad-mt" />
    </>
  );
}

function AjTextos({ r, set }) {
  return (
    <div className="ad-grade">
      <div className="ad-grade">
        <AreaTexto
          rotulo="Título da página inicial"
          valor={r.hero_titulo}
          aoMudar={(v) => set("hero_titulo", v)}
          linhas={2}
          dica={
            <>
              Use *asteriscos* para destacar em dourado. <Contador n={String(r.hero_titulo || "").length} max={70} />
            </>
          }
        />
        <div className="ad-previa ad-previa--escura" aria-label="Prévia do título">
          <span className="ad-previa__rot">Prévia</span>
          <p className="ad-previa__tit vt-display">
            <TituloComDestaque texto={r.hero_titulo} />
          </p>
        </div>
      </div>
      <AreaTexto
        rotulo="Subtítulo da página inicial"
        valor={r.hero_subtitulo}
        aoMudar={(v) => set("hero_subtitulo", v)}
        linhas={3}
        dica={<Contador n={String(r.hero_subtitulo || "").length} max={220} />}
      />
      <div className="ad-grade ad-grade--2">
        <Entrada rotulo="Aviso no topo do site" valor={r.aviso_topo} aoMudar={(v) => set("aviso_topo", v)} placeholder="Ex.: Frete grátis esta semana" dica="Deixe vazio para não mostrar nenhum aviso." autoComplete="off" />
        <Entrada rotulo="Link do aviso" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" valor={r.aviso_link} aoMudar={(v) => set("aviso_link", v)} placeholder="https://" dica="Opcional: o aviso vira um link." />
      </div>
      <div className="ad-grade">
        <AreaTexto rotulo="Título da seção “Sobre”" valor={r.sobre_titulo} aoMudar={(v) => set("sobre_titulo", v)} linhas={2} dica="Enter quebra a linha. *Asteriscos* destacam em dourado." />
        <div className="ad-previa" aria-label="Prévia do título">
          <span className="ad-previa__rot">Prévia</span>
          <p className="ad-previa__tit vt-display">
            <TituloComDestaque texto={r.sobre_titulo} />
          </p>
        </div>
      </div>
      <AreaTexto rotulo="Texto da seção “Sobre”" valor={r.sobre_texto} aoMudar={(v) => set("sobre_texto", v)} linhas={9} dica="Uma linha em branco separa os parágrafos." />
    </div>
  );
}

function AjFotos({ r, set, setAbertura, env, aoOcupado }) {
  return (
    <div className="ad-grade">
      <Campo rotulo="Fotos da abertura" dica="Até 5 fotos. Passam ao fundo na abertura e no destaque da página inicial.">
        <GradeFotos fotos={r.fotos_abertura || []} max={5} pasta="site" capa={false} aoMudar={setAbertura} env={env} aoOcupado={aoOcupado} />
      </Campo>
      <Campo rotulo="Foto da seção “Sobre”" dica="Uma foto da loja, da equipe ou do atendimento.">
        <FotoUnica foto={r.foto_sobre || ""} pasta="site" aoMudar={(v) => set("foto_sobre", v)} env={env} proporcao="4 / 5" largura={280} aoOcupado={aoOcupado} />
      </Campo>
    </div>
  );
}

function inserirNoCursor(id, texto, atual, aplicar) {
  const el = document.getElementById(id);
  const ini = el && typeof el.selectionStart === "number" ? el.selectionStart : atual.length;
  const fim = el && typeof el.selectionEnd === "number" ? el.selectionEnd : ini;
  aplicar(atual.slice(0, ini) + texto + atual.slice(fim));
  requestAnimationFrame(() => {
    const e = document.getElementById(id);
    if (e) {
      e.focus();
      const p = ini + texto.length;
      e.setSelectionRange(p, p);
    }
  });
}

function BlocoMensagem({ id, titulo, ajuda, marcadores, valor, padrao, exemplo, aoMudar, erro }) {
  return (
    <div className="ad-msg">
      <h3 className="ad-msg__tit">{titulo}</h3>
      <p className="ad-nota">{ajuda}</p>
      <AreaTexto id={id} aria-label={titulo} valor={valor} aoMudar={aoMudar} linhas={4} erro={erro} />
      <div className="ad-msg__ferr">
        {marcadores.length ? (
          <div className="ad-msg__marc">
            <span className="ad-rotulo">Inserir</span>
            {marcadores.map((m) => (
              <button key={m} type="button" className="ad-marcador" onClick={() => inserirNoCursor(id, m, valor || "", aoMudar)}>
                {m}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className="ad-textobtn" disabled={valor === padrao} onClick={() => aoMudar(padrao)}>
          Voltar ao texto original
        </button>
      </div>
      <div className="ad-zap" aria-label="Prévia da mensagem">
        <span className="ad-previa__rot">Como chega no WhatsApp</span>
        <p>
          <TextoZap texto={montarMensagem(valor, exemplo)} />
        </p>
      </div>
    </div>
  );
}

function AjMensagens({ r, set, erros }) {
  return (
    <div className="ad-msgs">
      <p className="ad-aviso ad-aviso--info">
        <Ico n="info" size={18} />
        <span>
          Os marcadores entre chaves são trocados sozinhos: <strong>{"{nome}"}</strong> pelo nome do modelo, <strong>{"{ref}"}</strong> pela referência (se houver), <strong>{"{link}"}</strong> pelo endereço do produto e <strong>{"{itens}"}</strong> pela lista da seleção. Para negrito, escreva *assim*.
        </span>
      </p>
      <BlocoMensagem
        id="ad-msg-produto"
        titulo="Quando o cliente pergunta de um produto"
        ajuda="Usa {nome}, {ref} e {link}."
        marcadores={["{nome}", "{ref}", "{link}"]}
        valor={r.msg_produto}
        padrao={MSG_PRODUTO}
        exemplo={{ nome: "Lumière", ref: " (ref. VD-0101)", link: "https://seusite.com.br/?p=123" }}
        aoMudar={(v) => set("msg_produto", v)}
        erro={erros.msg_produto}
      />
      <BlocoMensagem
        id="ad-msg-selecao"
        titulo="Quando o cliente envia a seleção"
        ajuda="Usa {itens}: a lista dos modelos que ele separou."
        marcadores={["{itens}"]}
        valor={r.msg_selecao}
        padrao={MSG_SELECAO}
        exemplo={{ itens: "• Lumière (ref. VD-0101)\n• Riviera (ref. VD-0201)" }}
        aoMudar={(v) => set("msg_selecao", v)}
        erro={erros.msg_selecao}
      />
      <BlocoMensagem
        id="ad-msg-geral"
        titulo="Atendimento geral"
        ajuda="Quando o cliente chama a loja sem escolher um produto."
        marcadores={[]}
        valor={r.msg_geral}
        padrao={MSG_GERAL}
        exemplo={{}}
        aoMudar={(v) => set("msg_geral", v)}
        erro={erros.msg_geral}
      />
    </div>
  );
}

/* ---------- Lixeira ---------- */

function LinhaLixeira({ thumb, nome, sub, aviso, aoRestaurar, aoApagar, bloqueado }) {
  return (
    <li className="ad-lix">
      <div className="ad-lix__foto">{thumb}</div>
      <div className="ad-lix__txt">
        <strong>{nome}</strong>
        <span>{sub}</span>
        {aviso ? <span className="ad-lix__aviso">{aviso}</span> : null}
      </div>
      <div className="ad-lix__acoes">
        <button type="button" className="vt-btn vt-btn--linha vt-btn--sm" onClick={aoRestaurar}>
          <Ico n="undo" size={16} /> Restaurar
        </button>
        <button type="button" className="ad-textobtn is-perigo" onClick={aoApagar} disabled={bloqueado}>
          Apagar de vez
        </button>
      </div>
    </li>
  );
}

function Lixeira({ dados, recarregar }) {
  const { produtos, categorias, banners } = dados.lixeira;
  const total = produtos.length + categorias.length + banners.length;

  async function voltar(tabela, id, nome) {
    try {
      await restaurar(tabela, id);
      toast(`“${nome}” voltou.`);
      await recarregar();
    } catch (e) {
      toast(msgErro(e), "erro");
    }
  }

  async function apagar(tabela, linha, nome) {
    const ok = await confirmar({
      titulo: `Apagar “${nome}” de vez?`,
      texto: "O cadastro e as fotos são apagados para sempre. Não existe como desfazer.",
      ok: "Continuar",
      perigo: true,
    });
    if (!ok) return;
    const certeza = await confirmar({
      titulo: "Última confirmação",
      texto: `Apagar “${nome}” definitivamente?`,
      ok: "Sim, apagar para sempre",
      cancelar: "Não, manter na lixeira",
      perigo: true,
    });
    if (!certeza) return;
    try {
      await apagarDeVez(tabela, linha);
      toast(`“${nome}” foi apagado.`);
      await recarregar();
    } catch (e) {
      toast(msgErro(e), "erro");
    }
  }

  if (!total) {
    return <EstadoVazio titulo="A lixeira está vazia" texto="Tudo o que você exclui vem para cá primeiro. Nada some de vez sem você querer." />;
  }

  const catPorId = {};
  [...dados.categorias, ...dados.lixeira.categorias].forEach((c) => {
    catPorId[c.id] = c;
  });
  const nProdutosDa = (c) => [...dados.produtos, ...dados.lixeira.produtos].filter((p) => p.categoria_id === c.id).length;

  return (
    <div className="ad-lixeira">
      <p className="ad-intro">Aqui ficam os itens excluídos. Restaurar devolve o item ao site; “Apagar de vez” remove o cadastro e as fotos para sempre.</p>
      {produtos.length ? (
        <Bloco titulo={`Produtos · ${produtos.length}`}>
          <ul className="ad-lista">
            {produtos.map((p) => {
              const c = catPorId[p.categoria_id];
              return (
                <LinhaLixeira
                  key={p.id}
                  thumb={<Miniatura p={p} />}
                  nome={p.nome}
                  sub={`Excluído em ${brData(p.excluida)}${p.codigo ? ` · ${p.codigo}` : ""}`}
                  aviso={c && c.excluida ? `A categoria “${c.nome}” também está na lixeira. Restaure-a para o produto aparecer.` : null}
                  aoRestaurar={() => voltar("produtos", p.id, p.nome)}
                  aoApagar={() => apagar("produtos", p, p.nome)}
                />
              );
            })}
          </ul>
        </Bloco>
      ) : null}
      {categorias.length ? (
        <Bloco titulo={`Categorias · ${categorias.length}`}>
          <ul className="ad-lista">
            {categorias.map((c) => {
              const n = nProdutosDa(c);
              return (
                <LinhaLixeira
                  key={c.id}
                  thumb={<Capa foto={c.foto} icone="grid" />}
                  nome={c.nome}
                  sub={`Excluída em ${brData(c.excluida)}`}
                  aviso={n ? `Tem ${plural(n, "produto ligado", "produtos ligados")}. Para apagar de vez, apague ou mova eles antes.` : null}
                  bloqueado={n > 0}
                  aoRestaurar={() => voltar("categorias", c.id, c.nome)}
                  aoApagar={() => apagar("categorias", c, c.nome)}
                />
              );
            })}
          </ul>
        </Bloco>
      ) : null}
      {banners.length ? (
        <Bloco titulo={`Ofertas · ${banners.length}`}>
          <ul className="ad-lista">
            {banners.map((b) => (
              <LinhaLixeira
                key={b.id}
                thumb={<Capa foto={b.foto} icone="tag" />}
                nome={b.titulo}
                sub={`Excluída em ${brData(b.excluida)}`}
                aoRestaurar={() => voltar("banners", b.id, b.titulo)}
                aoApagar={() => apagar("banners", b, b.titulo)}
              />
            ))}
          </ul>
        </Bloco>
      ) : null}
    </div>
  );
}

/* ---------- Conta ---------- */

function Conta({ user, perfil, aoSair }) {
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const admin = perfil.role === "admin";

  async function trocar(e) {
    e.preventDefault();
    setErro("");
    if (nova.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (nova !== conf) {
      setErro("As duas senhas não são iguais.");
      return;
    }
    setOcupado(true);
    try {
      await trocarSenha(nova);
      toast(DEMO ? "Pronto. (No modo demonstração a senha não muda de verdade.)" : "Senha alterada.");
      setNova("");
      setConf("");
    } catch (err) {
      setErro(msgErro(err));
    }
    setOcupado(false);
  }

  return (
    <div className="ad-conta">
      <dl className="ad-dl">
        <div>
          <dt className="ad-rotulo">E-mail</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="ad-rotulo">Perfil</dt>
          <dd>{admin ? "Administração · acesso a tudo" : "Equipe · cadastra e edita produtos"}</dd>
        </div>
        {perfil.nome && !DEMO ? (
          <div>
            <dt className="ad-rotulo">Nome</dt>
            <dd>{perfil.nome}</dd>
          </div>
        ) : null}
      </dl>

      <Bloco titulo="Trocar a senha" nota="Mínimo de 8 caracteres.">
        <form className="ad-grade ad-grade--2" onSubmit={trocar} noValidate>
          <Campo rotulo="Nova senha" id="ad-nova-senha">
            <div className="ad-senha">
              <input id="ad-nova-senha" className="vt-input" type={ver ? "text" : "password"} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
              <button type="button" className="ad-senha__olho" aria-label={ver ? "Esconder a senha" : "Mostrar a senha"} onClick={() => setVer(!ver)}>
                <Ico n={ver ? "eyeOff" : "eye"} size={20} />
              </button>
            </div>
          </Campo>
          <Entrada rotulo="Repita a nova senha" type={ver ? "text" : "password"} autoComplete="new-password" valor={conf} aoMudar={setConf} />
          {erro ? (
            <p className="ad-aviso ad-aviso--bad ad-span2" role="alert">
              <Ico n="warning" size={18} />
              <span>{erro}</span>
            </p>
          ) : null}
          <div className="ad-span2">
            <button type="submit" className="vt-btn vt-btn--escuro vt-btn--sm" disabled={ocupado || !nova}>
              {ocupado ? "Salvando…" : "Trocar senha"}
            </button>
          </div>
        </form>
      </Bloco>

      <Bloco titulo="Sessão">
        <button type="button" className="vt-btn vt-btn--linha" onClick={aoSair}>
          <Ico n="logout" size={18} /> Sair do painel
        </button>
      </Bloco>
    </div>
  );
}

/* ---------- tela de Ajustes ---------- */

function Ajustes({ dados, setDados, recarregar, aoSujo, user, perfil, aoSair }) {
  const [sub, setSub] = useState("loja");
  const [r, setR] = useState(() => dados.config);
  const [tentou, setTentou] = useState({});
  const [salvandoId, setSalvandoId] = useState("");
  const [subindo, setSubindo] = useState(false);
  const env = useEnviadas();
  const salvo = dados.config;
  const urlsSalvas = useRef([]);
  urlsSalvas.current = [...(salvo.fotos_abertura || []), salvo.foto_sobre].filter(Boolean);

  const sujas = {};
  Object.keys(CHAVES).forEach((k) => {
    sujas[k] = CHAVES[k].some((c) => !igual(r[c], salvo[c]));
  });
  const algumaSuja = Object.values(sujas).some(Boolean);

  useEffect(() => {
    aoSujo(algumaSuja);
  }, [algumaSuja]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      aoSujo(false);
      env.concluir(urlsSalvas.current); // fotos enviadas e nunca salvas saem do Storage
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const setVarios = (o) => setR((x) => ({ ...x, ...o }));
  const setAbertura = (fn) => setR((x) => ({ ...x, fotos_abertura: fn(x.fotos_abertura || []) }));
  const erros = tentou[sub] ? validarSecao(sub, r) : {};

  async function salvarSecao(id) {
    setTentou((t) => ({ ...t, [id]: true }));
    const er = validarSecao(id, r);
    if (Object.keys(er).length) {
      toast("Confira os campos em vermelho.", "erro");
      requestAnimationFrame(() => {
        const el = document.querySelector(".ad-ajuste [data-erro='true']");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setSalvandoId(id);
    try {
      const nova = { ...salvo, ...prepararSecao(id, pegar(r, CHAVES[id])) };
      const gravada = await salvarConfig(nova, salvo);
      setDados((d) => ({ ...d, config: gravada }));
      setR((x) => ({ ...x, ...pegar(gravada, CHAVES[id]) }));
      if (id === "fotos") env.concluir([...(gravada.fotos_abertura || []), gravada.foto_sobre].filter(Boolean), true);
      toast("Ajustes salvos.");
    } catch (e) {
      toast(msgErro(e), "erro");
    }
    setSalvandoId("");
  }

  function descartar(id) {
    setR((x) => ({ ...x, ...pegar(salvo, CHAVES[id]) }));
    setTentou((t) => ({ ...t, [id]: false }));
    if (id === "fotos") env.concluir(urlsSalvas.current, true);
  }

  const lixo = dados.lixeira.produtos.length + dados.lixeira.categorias.length + dados.lixeira.banners.length;
  const info = TITULOS_SUB[sub];

  return (
    <>
      <Cabeca olho="Loja" titulo="Ajustes" />
      <div className="ad-chips ad-chips--rolar ad-subnav" role="tablist" aria-label="Seções dos ajustes">
        {SUBS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={sub === s.id} className={`ad-chip${sub === s.id ? " is-on" : ""}`} onClick={() => setSub(s.id)}>
            {s.rot}
            {sujas[s.id] ? <i className="ad-chip__ponto" aria-label="com alterações não salvas" /> : null}
            {s.id === "lixeira" && lixo ? <span className="ad-chip__n">{lixo}</span> : null}
          </button>
        ))}
      </div>

      <div className="ad-ajuste" key={sub}>
        {info ? (
          <div className="ad-ajuste__cab">
            <h2 className="ad-ajuste__tit vt-display">{info[0]}</h2>
            <p className="ad-nota">{info[1]}</p>
          </div>
        ) : null}

        {sub === "loja" ? <AjLoja r={r} set={set} setVarios={setVarios} erros={erros} /> : null}
        {sub === "horarios" ? <AjHorarios r={r} set={set} erros={erros} /> : null}
        {sub === "textos" ? <AjTextos r={r} set={set} /> : null}
        {sub === "fotos" ? <AjFotos r={r} set={set} setAbertura={setAbertura} env={env} aoOcupado={setSubindo} /> : null}
        {sub === "whats" ? <AjMensagens r={r} set={set} erros={erros} /> : null}
        {sub === "lixeira" ? <Lixeira dados={dados} recarregar={recarregar} /> : null}
        {sub === "conta" ? <Conta user={user} perfil={perfil} aoSair={aoSair} /> : null}

        {CHAVES[sub] ? (
          <BarraSalvar
            sujo={sujas[sub]}
            salvando={salvandoId === sub}
            bloqueado={sub === "fotos" && subindo}
            aoSalvar={() => salvarSecao(sub)}
            aoDescartar={() => descartar(sub)}
          />
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== */
/* Painel (casca: menu lateral no computador, barra de baixo no celular) */
/* ================================================================== */

const ABAS_ADMIN = [
  { id: "inicio", rot: "Início", curto: "Início", ic: "home" },
  { id: "produtos", rot: "Produtos", curto: "Produtos", ic: "glasses" },
  { id: "categorias", rot: "Categorias", curto: "Categ.", ic: "grid" },
  { id: "ofertas", rot: "Ofertas", curto: "Ofertas", ic: "tag" },
  { id: "ajustes", rot: "Ajustes", curto: "Ajustes", ic: "gear" },
];
const ABAS_FUNC = [
  { id: "inicio", rot: "Início", curto: "Início", ic: "home" },
  { id: "produtos", rot: "Produtos", curto: "Produtos", ic: "glasses" },
  { id: "conta", rot: "Conta", curto: "Conta", ic: "user" },
];

function lerAbaSalva(ids) {
  try {
    const a = sessionStorage.getItem("vt_admin_aba");
    return ids.includes(a) ? a : "inicio";
  } catch {
    return "inicio";
  }
}

function Painel({ user, perfil, aoSair }) {
  const admin = perfil.role === "admin";
  const abas = admin ? ABAS_ADMIN : ABAS_FUNC;
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState(() => lerAbaSalva(abas.map((a) => a.id)));
  const [fp, setFp] = useState({ busca: "", categoria: "todas", situacao: "todos" });
  const [edicao, setEdicao] = useState(null);
  const sujoRef = useRef(false);
  const abaRef = useRef(aba);
  abaRef.current = aba;

  const recarregar = useCallback(async () => {
    try {
      const d = await carregarPainel();
      setDados(d);
      setErro("");
      return d;
    } catch (e) {
      setErro(msgErro(e));
      toast(msgErro(e), "erro");
      return null;
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    const f = (e) => {
      if (sujoRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, []);

  const confirmarSairSemSalvar = useCallback(async () => {
    if (!sujoRef.current) return true;
    const ok = await confirmar({
      titulo: "Sair sem salvar?",
      texto: "Você mexeu nos ajustes e ainda não salvou. Se sair agora, essas mudanças se perdem.",
      ok: "Sair sem salvar",
      cancelar: "Voltar e salvar",
      perigo: true,
    });
    if (ok) sujoRef.current = false;
    return ok;
  }, []);

  const mudarAba = useCallback(
    async (id) => {
      if (id === abaRef.current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (!(await confirmarSairSemSalvar())) return;
      setAba(id);
      try {
        sessionStorage.setItem("vt_admin_aba", id);
      } catch {
        /* sem armazenamento */
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [confirmarSairSemSalvar],
  );

  const sairDoPainel = useCallback(async () => {
    if (!(await confirmarSairSemSalvar())) return;
    aoSair();
  }, [aoSair, confirmarSairSemSalvar]);

  const abrirForm = useCallback((tipo, linha = null, extra = {}) => setEdicao({ tipo, linha, n: Date.now(), ...extra }), []);
  const fecharForm = useCallback(() => setEdicao(null), []);
  const salvouForm = useCallback(() => {
    setEdicao(null);
    recarregar();
  }, [recarregar]);

  function irParaProdutos(situacao) {
    setFp({ busca: "", categoria: "todas", situacao });
    mudarAba("produtos");
  }

  if (!dados) return <Splash erro={erro} aoTentar={recarregar} aoSair={aoSair} />;

  const FAB = { produtos: ["produto", "Novo produto"] };
  if (admin) {
    FAB.categorias = ["categoria", "Nova categoria"];
    FAB.ofertas = ["oferta", "Nova oferta"];
  }
  const fab = FAB[aba];

  return (
    <div className="ad-root" data-tema="claro">
      <aside className="ad-side" aria-label="Menu do painel">
        <div className="ad-brand">
          <img src="/logo-v.png" alt="" width="40" />
          <div className="ad-brand__txt">
            <span className="ad-brand__nome">VÉRTICE</span>
            <span className="ad-brand__sub">PAINEL</span>
          </div>
        </div>
        <nav className="ad-nav">
          {abas.map((a) => (
            <button key={a.id} type="button" className={`ad-nav__i${aba === a.id ? " is-on" : ""}`} aria-current={aba === a.id ? "page" : undefined} onClick={() => mudarAba(a.id)}>
              <Ico n={a.ic} size={19} />
              <span>{a.rot}</span>
            </button>
          ))}
        </nav>
        <div className="ad-side__rodape">
          <a className="ad-side__link" href="/" target="_blank" rel="noopener noreferrer">
            <Ico n="external" size={17} /> Ver vitrine
          </a>
          <div className="ad-side__user">
            <span className="ad-side__mail" title={user.email}>
              {user.email}
            </span>
            <span className="ad-side__perfil">{admin ? "Administração" : "Equipe"}</span>
          </div>
          <button type="button" className="ad-side__sair" onClick={sairDoPainel}>
            <Ico n="logout" size={17} /> Sair
          </button>
        </div>
      </aside>

      <div className="ad-col">
        <header className="ad-topo">
          <img src="/logo-v.png" alt="" width="30" />
          <div className="ad-topo__txt">
            <span className="ad-brand__nome">VÉRTICE</span>
            <span className="ad-brand__sub">PAINEL</span>
          </div>
          <a className="ad-iconbtn ad-topo__ver" href="/" target="_blank" rel="noopener noreferrer" aria-label="Ver a vitrine (abre em outra aba)">
            <Ico n="external" size={20} />
          </a>
        </header>

        <main className="ad-main">
          <div className="ad-wrap">
            {DEMO ? <FaixaDemo /> : null}
            <div className="ad-tela" key={aba}>
              {aba === "inicio" ? <Inicio dados={dados} admin={admin} aoNovoProduto={() => abrirForm("produto")} aoPendencia={irParaProdutos} aoIrPara={mudarAba} /> : null}
              {aba === "produtos" ? <Produtos dados={dados} setDados={setDados} recarregar={recarregar} fp={fp} setFp={setFp} admin={admin} abrirForm={abrirForm} /> : null}
              {aba === "categorias" && admin ? <Categorias dados={dados} setDados={setDados} recarregar={recarregar} abrirForm={abrirForm} /> : null}
              {aba === "ofertas" && admin ? <Ofertas dados={dados} setDados={setDados} recarregar={recarregar} abrirForm={abrirForm} /> : null}
              {aba === "ajustes" && admin ? (
                <Ajustes dados={dados} setDados={setDados} recarregar={recarregar} aoSujo={(v) => (sujoRef.current = v)} user={user} perfil={perfil} aoSair={sairDoPainel} />
              ) : null}
              {aba === "conta" && !admin ? (
                <>
                  <Cabeca olho="Seu acesso" titulo="Conta" />
                  <Conta user={user} perfil={perfil} aoSair={sairDoPainel} />
                </>
              ) : null}
            </div>
            <footer className="ad-rodape">
              <Credito />
            </footer>
          </div>
        </main>
      </div>

      <nav className="ad-tabs" aria-label="Menu do painel" style={{ gridTemplateColumns: `repeat(${abas.length}, minmax(0, 1fr))` }}>
        {abas.map((a) => (
          <button key={a.id} type="button" className={`ad-tabs__i${aba === a.id ? " is-on" : ""}`} aria-current={aba === a.id ? "page" : undefined} onClick={() => mudarAba(a.id)}>
            <Ico n={a.ic} size={21} />
            <span>{a.curto}</span>
          </button>
        ))}
      </nav>

      {fab ? (
        <button type="button" className="ad-fab" aria-label={fab[1]} onClick={() => abrirForm(fab[0])}>
          <Ico n="plus" size={26} sw={1.8} />
        </button>
      ) : null}

      {edicao && edicao.tipo === "produto" ? (
        <FormProduto key={edicao.n} inicial={edicao.linha} aviso={edicao.aviso} filtroCategoria={fp.categoria} dados={dados} aoFechar={fecharForm} aoSalvo={salvouForm} />
      ) : null}
      {edicao && edicao.tipo === "categoria" ? <FormCategoria key={edicao.n} inicial={edicao.linha} dados={dados} aoFechar={fecharForm} aoSalvo={salvouForm} /> : null}
      {edicao && edicao.tipo === "oferta" ? <FormOferta key={edicao.n} inicial={edicao.linha} dados={dados} aoFechar={fecharForm} aoSalvo={salvouForm} /> : null}
    </div>
  );
}

/* ================================================================== */
/* App                                                                 */
/* ================================================================== */

export default function App() {
  const [fase, setFase] = useState("carregando");
  const [sessao, setSessao] = useState(null);

  // O painel não é para o Google: título próprio e "noindex".
  useEffect(() => {
    const tituloAntes = document.title;
    document.title = "Painel · Vértice Design Óptico";
    let meta = document.querySelector('meta[name="robots"]');
    const criada = !meta;
    const antes = meta ? meta.getAttribute("content") : null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow, noarchive");
    return () => {
      document.title = tituloAntes;
      if (criada) meta.remove();
      else meta.setAttribute("content", antes || "");
    };
  }, []);

  // Fundo creme atrás de tudo quando o painel está aberto (o resto do site usa fundo escuro).
  useEffect(() => {
    if (fase !== "painel") return undefined;
    const h = document.documentElement;
    const b = document.body;
    const antes = [h.style.background, b.style.background];
    h.style.background = "var(--cream)";
    b.style.background = "var(--cream)";
    return () => {
      h.style.background = antes[0];
      b.style.background = antes[1];
    };
  }, [fase]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const u = await usuarioAtual();
        if (!u) {
          if (vivo) setFase("login");
          return;
        }
        const p = await perfilDe(u);
        if (vivo) {
          setSessao({ user: u, perfil: p });
          setFase("painel");
        }
      } catch {
        if (vivo) setFase("login");
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const aoEntrar = useCallback((user, perfil) => {
    setSessao({ user, perfil });
    setFase("painel");
  }, []);
  const aoSair = useCallback(async () => {
    try {
      await sair();
    } catch {
      /* sai mesmo assim */
    }
    setSessao(null);
    setFase("login");
  }, []);

  if (fase === "carregando") return <Splash />;
  if (fase === "login" || !sessao) return <Login aoEntrar={aoEntrar} />;
  return <Painel key={sessao.user.id || sessao.user.email} user={sessao.user} perfil={sessao.perfil} aoSair={aoSair} />;
}
