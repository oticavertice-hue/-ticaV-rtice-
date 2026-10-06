// Peças do produto na vitrine: cartão, galeria deslizante, detalhe e "Minha seleção".
import { useEffect, useRef, useState } from "react";
import { fotoSrc } from "./api.js";
import { SITE_URL } from "./config.js";
import { Ico, Glasses, Modal, RostoIcone, dinheiro, linkWhats, montarMensagem, metadeLargura, rostosParaFormato, toast } from "./shared.jsx";
import { ArteProduto } from "./vitrine-arte.jsx";

export const baseDoSite = () => SITE_URL || window.location.origin;
export const linkDoProduto = (p) => `${baseDoSite()}/?p=${encodeURIComponent(p.id)}`;
export const fotosDe = (p) => (p.fotos || []).filter(Boolean);
export const refDe = (p) => (p.codigo ? ` (ref. ${p.codigo})` : "");

/** Especificações preenchidas, na ordem dos campos da categoria */
export function specsDe(p, cat) {
  const s = p.specs || {};
  const out = [];
  ((cat && cat.campos) || []).forEach((c) => {
    const v = s[c.chave];
    if (c.tipo === "simnao") {
      if (v === true) out.push({ rotulo: c.rotulo, valor: "Sim", chave: c.chave });
      else if (v === false) out.push({ rotulo: c.rotulo, valor: "Não", chave: c.chave });
    } else if (v !== undefined && v !== null && String(v).trim() !== "") {
      out.push({ rotulo: c.rotulo, valor: String(v), chave: c.chave });
    }
  });
  return out;
}

const resumo = (p, cat) =>
  specsDe(p, cat)
    .filter((x) => x.valor !== "Sim" && x.valor !== "Não")
    .slice(0, 3)
    .map((x) => x.valor)
    .join(" · ");

export function Preco({ p, config, grande = false }) {
  if (!config.mostrar_precos) return <span className="vd-preco vd-preco--consulta">Consulte valores</span>;
  if (p.preco === null || p.preco === undefined) return <span className="vd-preco vd-preco--consulta">Sob consulta</span>;
  const promo = Number(p.preco_antigo) > Number(p.preco);
  return (
    <span className={`vd-preco${grande ? " vd-preco--grande" : ""}`}>
      {p.preco_a_partir && <small>a partir de</small>}
      {promo && <s>{dinheiro(p.preco_antigo)}</s>}
      <strong>{dinheiro(p.preco)}</strong>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão ("plaqueta") do produto                                      */
/* ------------------------------------------------------------------ */

export function CartaoProduto({ p, cat, config, fav, onFav, onAbrir, i = 0, compacto = false }) {
  const fotos = fotosDe(p);
  const abrir = () => onAbrir(p);
  const promo = Number(p.preco_antigo) > Number(p.preco) && config.mostrar_precos;
  return (
    <article className={`vd-card${p.indisponivel ? " is-off" : ""}${compacto ? " vd-card--compacto" : ""}`} data-reveal={compacto ? undefined : ""} style={{ "--d": `${(i % 4) * 0.07}s` }}>
      <div
        className="vd-card__frame"
        role="button"
        tabIndex={0}
        onClick={abrir}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrir();
          }
        }}
        aria-label={`Ver detalhes de ${p.nome}`}
      >
        {fotos[0] ? (
          <>
            <img className="vd-card__img" src={fotoSrc(fotos[0])} alt={p.nome} loading="lazy" decoding="async" draggable={false} />
            {fotos[1] && <img className="vd-card__img vd-card__img--2" src={fotoSrc(fotos[1])} alt="" loading="lazy" decoding="async" draggable={false} />}
          </>
        ) : (
          <div className="vd-card__arte">
            <ArteProduto p={p} cat={cat} />
          </div>
        )}
        <div className="vd-card__selos">
          {p.indisponivel && <span className="vd-selo vd-selo--off">Indisponível</span>}
          {!p.indisponivel && p.novo && <span className="vd-selo">Novo</span>}
          {!p.indisponivel && promo && <span className="vd-selo vd-selo--promo">Oferta</span>}
        </div>
        <span className="vd-card__ver">
          Ver detalhes <Ico n="arrowRight" size={14} />
        </span>
      </div>
      <button type="button" className="vd-card__fav" aria-pressed={fav} aria-label={fav ? "Remover da minha seleção" : "Adicionar à minha seleção"} onClick={() => onFav(p.id)}>
        <Ico n="heart" size={19} cheio={fav} />
      </button>
      <div className="vd-card__cap">
        <div className="vd-card__linha">
          <h3>{p.nome}</h3>
          <Preco p={p} config={config} />
        </div>
        <p className="vd-card__specs">{resumo(p, cat) || (cat && cat.nome) || ""}</p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Galeria: todas as fotos lado a lado, deslizando (nunca trocar o src) */
/* ------------------------------------------------------------------ */

export function Galeria({ fotos, alt, arte }) {
  const [slide, setSlide] = useState(0);
  const toque = useRef(null);
  const total = fotos.length;
  useEffect(() => setSlide(0), [fotos.join("|")]);

  if (!total) {
    return (
      <div className="vd-gal">
        <div className="vd-gal__vitrine vd-gal__vitrine--arte">{arte}</div>
      </div>
    );
  }
  const ir = (n) => setSlide((n + total) % total);
  return (
    <div className="vd-gal">
      <div
        className="vd-gal__vitrine"
        onTouchStart={(e) => {
          const t = e.touches[0];
          toque.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (!toque.current || total < 2) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - toque.current.x;
          const dy = t.clientY - toque.current.y;
          // só conta quando o gesto é mais horizontal que vertical, senão dispara enquanto a pessoa rola a página
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) ir(slide + (dx < 0 ? 1 : -1));
          toque.current = null;
        }}
      >
        <div className="vd-gal__faixa" style={{ transform: `translateX(-${slide * 100}%)` }}>
          {fotos.map((src, k) => (
            <div className="vd-gal__item" key={src + k}>
              <img src={fotoSrc(src)} alt={`${alt}${total > 1 ? ` · foto ${k + 1}` : ""}`} loading={k === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
            </div>
          ))}
        </div>
        {total > 1 && (
          <>
            <button type="button" className="vd-gal__seta vd-gal__seta--e" onClick={() => ir(slide - 1)} aria-label="Foto anterior">
              <Ico n="chevronLeft" size={20} />
            </button>
            <button type="button" className="vd-gal__seta vd-gal__seta--d" onClick={() => ir(slide + 1)} aria-label="Próxima foto">
              <Ico n="chevronRight" size={20} />
            </button>
            <div className="vd-gal__bolas">
              {fotos.map((_, k) => (
                <button type="button" key={k} className={k === slide ? "is-on" : ""} onClick={() => ir(k)} aria-label={`Foto ${k + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="vd-gal__mini">
          {fotos.map((src, k) => (
            <button type="button" key={src + k} className={k === slide ? "is-on" : ""} onClick={() => ir(k)} aria-label={`Ver foto ${k + 1}`}>
              <img src={fotoSrc(src)} alt="" loading="lazy" decoding="async" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diagrama de medidas (largura da lente · ponte · haste)              */
/* ------------------------------------------------------------------ */

function Medidas({ p }) {
  const m = p.medidas || {};
  const s = p.specs || {};
  const hw = metadeLargura(s.formato);
  const a = 60 + hw - 1;
  const b = 180 - hw + 1;
  const tem = m.lente || m.ponte || m.haste;
  if (!tem) return null;
  return (
    <div className="vd-med">
      <div className="vd-med__fig">
        <Glasses forma={s.formato} linha className="vd-med__art" />
        <svg viewBox="0 0 240 108" className="vd-med__cotas" aria-hidden="true">
          {m.lente ? (
            <g>
              <path d={`M${60 - hw} 92 H${60 + hw} M${60 - hw} 88 V96 M${60 + hw} 88 V96`} />
              <text x="60" y="106" textAnchor="middle">{m.lente}</text>
            </g>
          ) : null}
          {m.ponte ? (
            <g>
              <path d={`M${a} 14 H${b} M${a} 10 V18 M${b} 10 V18`} />
              <text x="120" y="8" textAnchor="middle">{m.ponte}</text>
            </g>
          ) : null}
        </svg>
      </div>
      <ul className="vd-med__lista">
        {m.lente ? <li><strong>{m.lente}</strong><span>Lente (mm)</span></li> : null}
        {m.ponte ? <li><strong>{m.ponte}</strong><span>Ponte (mm)</span></li> : null}
        {m.haste ? <li><strong>{m.haste}</strong><span>Haste (mm)</span></li> : null}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detalhe do produto                                                  */
/* ------------------------------------------------------------------ */

export function Detalhe({ p, cat, config, aoFechar, fav, onFav, relacionados, favoritos, onAbrir, onRosto, getCat }) {
  const raiz = useRef(null);
  useEffect(() => {
    const corpo = raiz.current && raiz.current.closest(".vt-modal__corpo");
    if (corpo) corpo.scrollTo({ top: 0 });
  }, [p && p.id]);

  if (!p) return null;
  const fotos = fotosDe(p);
  const specs = specsDe(p, cat);
  const rostos = rostosParaFormato(p.specs && p.specs.formato);
  const link = linkDoProduto(p);
  const zap = linkWhats(config.whatsapp, montarMensagem(config.msg_produto, { nome: p.nome, ref: refDe(p), link }));
  const mostraParcela = config.mostrar_precos && config.parcelas_max > 1 && p.preco !== null && p.preco !== undefined;

  const compartilhar = async () => {
    const dados = { title: `${p.nome} · ${config.loja_nome}`, text: `${p.nome} na ${config.loja_nome}`, url: link };
    try {
      if (navigator.share) {
        await navigator.share(dados);
        return;
      }
      await navigator.clipboard.writeText(link);
      toast("Link copiado");
    } catch {
      /* a pessoa fechou o menu de compartilhar */
    }
  };

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={cat ? cat.nome : "Detalhes"}
      largo
      classe="vd-modal-det"
      rodape={
        <>
          <a className="vt-btn vt-btn--ouro vd-det__cta" href={zap} target="_blank" rel="noopener noreferrer">
            <Ico n="whatsapp" size={19} /> {p.indisponivel ? "Perguntar sobre ele" : "Experimentar na loja"}
          </a>
          <button type="button" className={`vd-det__ib${fav ? " is-on" : ""}`} onClick={() => onFav(p.id)} aria-pressed={fav} aria-label={fav ? "Remover da minha seleção" : "Adicionar à minha seleção"}>
            <Ico n="heart" cheio={fav} />
          </button>
          <button type="button" className="vd-det__ib" onClick={compartilhar} aria-label="Compartilhar">
            <Ico n="share" />
          </button>
        </>
      }
    >
      <div className="vd-det" ref={raiz}>
        <div className="vd-det__galeria">
          <Galeria fotos={fotos} alt={p.nome} arte={<ArteProduto p={p} cat={cat} />} />
        </div>
        <div className="vd-det__info">
          <p className="vd-det__trilha">
            {cat ? cat.nome : ""}
            {p.genero ? ` · ${p.genero}` : ""}
          </p>
          <h2 className="vd-det__nome">{p.nome}</h2>
          {(p.codigo || p.marca) && (
            <p className="vd-det__ref">
              {p.codigo ? `Ref. ${p.codigo}` : ""}
              {p.codigo && p.marca ? " · " : ""}
              {p.marca}
            </p>
          )}
          <div className="vd-det__preco">
            <Preco p={p} config={config} grande />
            {mostraParcela && <span className="vd-det__parcela">em até {config.parcelas_max}x no cartão</span>}
          </div>
          {p.indisponivel && <p className="vd-det__aviso">Este modelo está indisponível no momento. Fale com a gente: podemos verificar reposição ou indicar um parecido.</p>}
          {p.descricao && <p className="vd-det__desc">{p.descricao}</p>}

          {specs.length > 0 && (
            <dl className="vd-specs">
              {specs.map((x) => (
                <div key={x.chave}>
                  <dt>{x.rotulo}</dt>
                  <dd>{x.valor}</dd>
                </div>
              ))}
            </dl>
          )}

          {cat && cat.usa_medidas && <Medidas p={p} />}

          {rostos.length > 0 && (
            <div className="vd-det__rostos">
              <p className="vd-label">Combina com rosto</p>
              <div>
                {rostos.map((r) => (
                  <button type="button" key={r.id} onClick={() => onRosto(r.id)} title={`Ver armações para rosto ${r.nome.toLowerCase()}`}>
                    <RostoIcone id={r.id} />
                    <span>{r.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {relacionados.length > 0 && (
          <div className="vd-det__mais">
            <p className="vd-label">Você também pode gostar</p>
            <div className="vd-det__mais-grade">
              {relacionados.map((r) => (
                <CartaoProduto key={r.id} p={r} cat={getCat(r.categoria_id)} config={config} fav={favoritos.includes(r.id)} onFav={onFav} onAbrir={onAbrir} compacto />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Minha seleção                                                       */
/* ------------------------------------------------------------------ */

export function Selecao({ aberto, aoFechar, itens, config, onRemover, onLimpar, onAbrir, getCat }) {
  const linhas = itens.map((p) => {
    const cat = getCat(p.categoria_id);
    const preco = config.mostrar_precos && p.preco !== null && p.preco !== undefined ? ` · ${dinheiro(p.preco)}` : "";
    return `• *${p.nome}*${refDe(p)}${cat ? ` · ${cat.nome}` : ""}${preco}`;
  });
  const zap = linkWhats(config.whatsapp, montarMensagem(config.msg_selecao, { itens: linhas.join("\n") }));
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Minha seleção"
      sub={itens.length ? `${itens.length} ${itens.length === 1 ? "peça escolhida" : "peças escolhidas"}` : "Nada por aqui ainda"}
      rodape={
        itens.length ? (
          <>
            <button type="button" className="vt-btn vt-btn--suave" onClick={onLimpar}>
              Limpar
            </button>
            <a className="vt-btn vt-btn--ouro vd-sel__cta" href={zap} target="_blank" rel="noopener noreferrer">
              <Ico n="whatsapp" size={19} /> Enviar para a loja
            </a>
          </>
        ) : null
      }
    >
      {itens.length === 0 ? (
        <div className="vd-sel__vazio">
          <Glasses linha forma="Panto" className="vd-sel__arte" />
          <h3 className="vt-display">Sua seleção está vazia</h3>
          <p>Toque no coração das armações de que mais gostar. Depois é só enviar a lista para a loja e marcar um horário para experimentar.</p>
          <button type="button" className="vt-btn vt-btn--escuro" onClick={aoFechar}>
            Explorar a coleção
          </button>
        </div>
      ) : (
        <>
          <ul className="vd-sel">
            {itens.map((p) => {
              const cat = getCat(p.categoria_id);
              const f = fotosDe(p)[0];
              return (
                <li key={p.id}>
                  <button type="button" className="vd-sel__thumb" onClick={() => onAbrir(p)} aria-label={`Ver ${p.nome}`}>
                    {f ? <img src={fotoSrc(f)} alt="" /> : <ArteProduto p={p} cat={cat} />}
                  </button>
                  <div className="vd-sel__txt">
                    <strong>{p.nome}</strong>
                    <span>{[p.codigo ? `Ref. ${p.codigo}` : "", cat ? cat.nome : ""].filter(Boolean).join(" · ")}</span>
                    <Preco p={p} config={config} />
                  </div>
                  <button type="button" className="vt-iconbtn" onClick={() => onRemover(p.id)} aria-label={`Remover ${p.nome}`}>
                    <Ico n="close" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="vd-sel__nota">Ao enviar, abrimos o WhatsApp da loja com a sua lista pronta. Nada é cobrado: é só para a equipe separar as peças para você experimentar.</p>
        </>
      )}
    </Modal>
  );
}
