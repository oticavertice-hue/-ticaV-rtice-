// A vitrine pública. Sem login. O cliente navega, escolhe, monta a "seleção" e fala com a loja pelo WhatsApp.
import { useCallback, useEffect, useMemo, useState } from "react";
import "./catalog.css";
import { carregarVitrine, mesclarConfig, registrarVisita } from "./api.js";
import { Glasses, Ico, Modal, RostoIcone, formatoKey, linkWhats, normalizar, toast, useBackClose, useReveal } from "./shared.jsx";
import { ROSTOS } from "./data.js";
import { Abertura, Aviso, Cabecalho, Faixa, Hero } from "./vitrine-topo.jsx";
import { CabSecao, Categorias, Destaques, FabZap, GuiaLentes, GuiaRosto, Ofertas, Promessas, Rodape, Sobre, Visite } from "./vitrine-secoes.jsx";
import { CartaoProduto, Detalhe, Selecao, baseDoSite } from "./vitrine-produto.jsx";

const K_SEL = "vt_selecao";
const lerSel = () => {
  try {
    const v = JSON.parse(localStorage.getItem(K_SEL) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const gravarSel = (l) => {
  try {
    localStorage.setItem(K_SEL, JSON.stringify(l));
  } catch {
    /* sem storage: a seleção vale só nesta visita */
  }
};
const parametro = (nome) => new URLSearchParams(window.location.search).get(nome);
const jaViuAbertura = () => {
  try {
    return sessionStorage.getItem("vt_abertura") === "1" || !!parametro("p") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

const ORDENS = [
  ["destaques", "Destaques"],
  ["novos", "Novidades"],
  ["menor", "Menor preço"],
  ["maior", "Maior preço"],
  ["az", "Nome (A–Z)"],
];

const FILTRO_VAZIO = { cat: "", busca: "", genero: "", rosto: "", specs: {}, ordem: "destaques" };
const PASSO = 16;

function ordenar(lista, ordem) {
  const l = [...lista];
  const preco = (p) => (p.preco === null || p.preco === undefined ? null : Number(p.preco));
  const data = (p) => new Date(p.criado || 0).getTime();
  if (ordem === "novos") return l.sort((a, b) => data(b) - data(a));
  if (ordem === "az") return l.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (ordem === "menor" || ordem === "maior") {
    const s = ordem === "menor" ? 1 : -1;
    return l.sort((a, b) => {
      const pa = preco(a);
      const pb = preco(b);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return (pa - pb) * s;
    });
  }
  return l.sort((a, b) => Number(b.destaque) - Number(a.destaque) || Number(b.novo) - Number(a.novo) || data(b) - data(a));
}

const textoBusca = (p) => normalizar([p.nome, p.codigo, p.marca, p.descricao, ...Object.values(p.specs || {}).filter((v) => typeof v === "string")].join(" "));

/* ------------------------------------------------------------------ */

export default function Catalog() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [abertura, setAbertura] = useState(() => !jaViuAbertura());
  const [menuAberto, setMenuAberto] = useState(false);
  const [solido, setSolido] = useState(false);
  const [avisoFechado, setAvisoFechado] = useState(() => {
    try {
      return sessionStorage.getItem("vt_aviso") === "1";
    } catch {
      return false;
    }
  });
  const [abertoId, setAbertoId] = useState(null);
  const [selAberta, setSelAberta] = useState(false);
  const [sel, setSel] = useState(lerSel);
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [mostrar, setMostrar] = useState(PASSO);
  const [painel, setPainel] = useState(false);

  useBackClose(menuAberto, () => setMenuAberto(false));

  /* carrega tudo e conta o acesso */
  const carregar = useCallback(() => {
    setErro("");
    carregarVitrine()
      .then(setDados)
      .catch((e) => setErro(e && e.message ? e.message : "Não foi possível carregar a vitrine."));
  }, []);
  useEffect(() => {
    carregar();
    registrarVisita();
  }, [carregar]);

  /* cabeçalho sólido depois de rolar */
  useEffect(() => {
    const f = () => setSolido(window.scrollY > 40);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  const config = dados ? dados.config : mesclarConfig({});
  const categorias = useMemo(() => (dados ? dados.categorias : []), [dados]);
  const catPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const getCat = useCallback((id) => catPorId.get(id), [catPorId]);
  // produto de categoria oculta/excluída não aparece
  const produtos = useMemo(() => (dados ? dados.produtos.filter((p) => catPorId.has(p.categoria_id)) : []), [dados, catPorId]);
  const contagem = useMemo(() => {
    const m = {};
    produtos.forEach((p) => {
      m[p.categoria_id] = (m[p.categoria_id] || 0) + 1;
    });
    return m;
  }, [produtos]);
  const destaques = useMemo(() => ordenar(produtos.filter((p) => p.destaque), "novos").slice(0, 12), [produtos]);
  const catAtiva = filtro.cat ? categorias.find((c) => c.slug === filtro.cat) : null;

  /* links diretos: ?p=<produto> e ?cat=<categoria> */
  useEffect(() => {
    if (!dados) return;
    const p = parametro("p");
    const c = parametro("cat");
    if (p && dados.produtos.some((x) => x.id === p)) setAbertoId(p);
    if (c && dados.categorias.some((x) => x.slug === c)) setFiltro((f) => ({ ...f, cat: c }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  /* SEO local: título e dados estruturados da loja */
  useEffect(() => {
    if (!dados) return;
    const c = dados.config;
    document.title = `${c.loja_nome} · Óculos de grau e de sol em Uberlândia`;
    const nomes = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const horas = Object.keys(c.horarios)
      .filter((d) => c.horarios[d].aberto)
      .map((d) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: nomes[Number(d)], opens: c.horarios[d].abre, closes: c.horarios[d].fecha }));
    const ld = {
      "@context": "https://schema.org",
      "@type": "Optician",
      name: c.loja_nome,
      image: `${baseDoSite()}/logo-original.jpg`,
      url: baseDoSite(),
      telephone: `+${c.whatsapp}`,
      address: { "@type": "PostalAddress", streetAddress: c.endereco_linha1, addressLocality: "Uberlândia", addressRegion: "MG", addressCountry: "BR" },
      sameAs: [`https://instagram.com/${c.instagram}`],
      openingHoursSpecification: horas,
    };
    let el = document.getElementById("vd-ld");
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = "vd-ld";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(ld);
  }, [dados]);

  /* ---------------- filtros ---------------- */

  const escopo = useMemo(() => {
    let l = produtos;
    if (catAtiva) l = l.filter((p) => p.categoria_id === catAtiva.id);
    if (filtro.genero) {
      l = l.filter((p) => {
        const c = catPorId.get(p.categoria_id);
        if (filtro.genero === "Infantil") return p.genero === "Infantil" || (c && c.slug === "infantil");
        return p.genero === filtro.genero || p.genero === "Unissex";
      });
    }
    if (filtro.rosto) {
      const r = ROSTOS.find((x) => x.id === filtro.rosto);
      if (r) l = l.filter((p) => r.formatos.includes(formatoKey(p.specs && p.specs.formato)));
    }
    if (filtro.busca.trim()) {
      const q = normalizar(filtro.busca);
      l = l.filter((p) => textoBusca(p).includes(q));
    }
    return l;
  }, [produtos, catAtiva, filtro.genero, filtro.rosto, filtro.busca, catPorId]);

  // filtros de especificação disponíveis: nascem dos campos da categoria e dos valores que existem de fato
  const camposFiltro = useMemo(() => {
    const cats = catAtiva ? [catAtiva] : categorias;
    const mapa = new Map();
    cats.forEach((c) =>
      (c.campos || []).forEach((f) => {
        if (!f.filtro) return;
        const ex = mapa.get(f.chave) || { chave: f.chave, rotulo: f.rotulo, tipo: f.tipo, ordem: [] };
        ex.ordem = [...ex.ordem, ...(f.opcoes || [])];
        mapa.set(f.chave, ex);
      }),
    );
    const saida = [];
    mapa.forEach((f) => {
      if (f.tipo === "simnao") {
        const n = escopo.filter((p) => p.specs && p.specs[f.chave] === true).length;
        if (n > 0) saida.push({ ...f, opcoes: [], n });
        return;
      }
      const cont = new Map();
      escopo.forEach((p) => {
        const v = p.specs && p.specs[f.chave];
        if (v === undefined || v === null || String(v).trim() === "") return;
        const k = normalizar(String(v));
        cont.set(k, { valor: String(v), n: (cont.get(k) ? cont.get(k).n : 0) + 1 });
      });
      const ordemNorm = f.ordem.map((o) => normalizar(o));
      const opcoes = [...cont.entries()]
        .sort((a, b) => {
          const ia = ordemNorm.indexOf(a[0]);
          const ib = ordemNorm.indexOf(b[0]);
          if (ia >= 0 && ib >= 0) return ia - ib;
          if (ia >= 0) return -1;
          if (ib >= 0) return 1;
          return a[1].valor.localeCompare(b[1].valor, "pt-BR");
        })
        .map(([k, v]) => ({ k, ...v }));
      // um filtro com uma opção só não ajuda ninguém, a menos que já esteja marcado
      if (opcoes.length >= 2 || (filtro.specs[f.chave] && opcoes.length >= 1)) saida.push({ ...f, opcoes });
    });
    return saida;
  }, [categorias, catAtiva, escopo, filtro.specs]);

  const resultado = useMemo(() => {
    let l = escopo;
    Object.entries(filtro.specs).forEach(([chave, valor]) => {
      if (valor === "1") l = l.filter((p) => p.specs && p.specs[chave] === true);
      else l = l.filter((p) => p.specs && normalizar(String(p.specs[chave] ?? "")) === normalizar(valor));
    });
    return ordenar(l, filtro.ordem);
  }, [escopo, filtro.specs, filtro.ordem]);

  useEffect(() => setMostrar(PASSO), [filtro]);

  const nFiltros = Object.keys(filtro.specs).length + (filtro.rosto ? 1 : 0);
  const ativos = [
    ...(filtro.rosto ? [{ k: "rosto", t: `Rosto ${ROSTOS.find((r) => r.id === filtro.rosto).nome.toLowerCase()}`, off: () => setFiltro((f) => ({ ...f, rosto: "" })) }] : []),
    ...Object.entries(filtro.specs).map(([chave, valor]) => {
      const cf = camposFiltro.find((c) => c.chave === chave);
      const t = valor === "1" ? (cf ? cf.rotulo : chave) : valor;
      return {
        k: chave,
        t,
        off: () =>
          setFiltro((f) => {
            const s = { ...f.specs };
            delete s[chave];
            return { ...f, specs: s };
          }),
      };
    }),
  ];

  const irParaColecao = () => {
    const el = document.getElementById("colecao");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const escolherCategoria = (slug) => {
    setFiltro({ ...FILTRO_VAZIO, cat: slug });
    setTimeout(irParaColecao, 30);
  };
  const escolherCategoriaPorId = (id) => {
    const c = categorias.find((x) => x.id === id);
    if (c) escolherCategoria(c.slug);
  };
  const verRosto = (id) => {
    setFiltro({ ...FILTRO_VAZIO, rosto: id });
    setAbertoId(null);
    setTimeout(irParaColecao, 30);
  };
  const contarRosto = (id) => {
    const r = ROSTOS.find((x) => x.id === id);
    return r ? produtos.filter((p) => r.formatos.includes(formatoKey(p.specs && p.specs.formato))).length : 0;
  };

  /* ---------------- seleção (favoritos) ---------------- */

  const alternar = (id) =>
    setSel((s) => {
      const tem = s.includes(id);
      const novo = tem ? s.filter((x) => x !== id) : [...s, id];
      gravarSel(novo);
      if (!tem) toast("Adicionado à sua seleção");
      return novo;
    });
  const remover = (id) =>
    setSel((s) => {
      const novo = s.filter((x) => x !== id);
      gravarSel(novo);
      return novo;
    });
  const limpar = () => {
    gravarSel([]);
    setSel([]);
  };
  const itensSel = useMemo(() => sel.map((id) => produtos.find((p) => p.id === id)).filter(Boolean), [sel, produtos]);

  const produtoAberto = abertoId ? produtos.find((p) => p.id === abertoId) : null;
  const abrir = (p) => setAbertoId(p.id);
  const abrirPorId = (id) => {
    if (produtos.some((p) => p.id === id)) setAbertoId(id);
  };
  const fecharDetalhe = useCallback(() => {
    setAbertoId(null);
    // link direto (?p=): depois que a janela fechar e o histórico assentar, tira o ?p= do endereço
    if (parametro("p")) setTimeout(() => window.history.replaceState(window.history.state, "", window.location.pathname), 120);
  }, []);
  const relacionados = useMemo(
    () => (produtoAberto ? produtos.filter((p) => p.categoria_id === produtoAberto.categoria_id && p.id !== produtoAberto.id).slice(0, 4) : []),
    [produtos, produtoAberto],
  );

  useReveal(`${!!dados}|${resultado.length}|${mostrar}|${filtro.cat}`);

  const terminouAbertura = () => {
    try {
      sessionStorage.setItem("vt_abertura", "1");
    } catch {
      /* ignora */
    }
    setAbertura(false);
  };

  const temAviso = !!(config.aviso_topo && !avisoFechado);
  const fotosAbertura = config.fotos_abertura || [];
  const nenhumaPeca = dados && produtos.length === 0;
  const zapGeral = linkWhats(config.whatsapp, config.msg_geral);

  return (
    <div className={`vd${temAviso ? " tem-aviso" : ""}`}>
      {abertura && <Abertura fotos={fotosAbertura} pronto={!!dados || !!erro} config={config} aoFim={terminouAbertura} />}

      {temAviso && (
        <Aviso
          texto={config.aviso_topo}
          link={config.aviso_link}
          aoFechar={() => {
            setAvisoFechado(true);
            try {
              sessionStorage.setItem("vt_aviso", "1");
            } catch {
              /* ignora */
            }
          }}
        />
      )}

      <Cabecalho config={config} solido={solido} deslocado={temAviso && !solido} qtdSel={sel.length} onSelecao={() => setSelAberta(true)} menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

      <main>
        <Hero config={config} fotos={fotosAbertura} qtdPecas={produtos.length} />
        <Faixa />
        <Promessas />

        {erro && (
          <section className="vd-sec vd-claro">
            <div className="vd-wrap vd-erro">
              <h2 className="vt-display">Não conseguimos carregar a coleção agora.</h2>
              <p>{erro}</p>
              <button type="button" className="vt-btn vt-btn--escuro" onClick={carregar}>
                Tentar de novo
              </button>
            </div>
          </section>
        )}

        {dados && (
          <>
            <Ofertas banners={dados.banners} config={config} onCategoria={escolherCategoriaPorId} onProduto={abrirPorId} />
            <Categorias categorias={categorias} contagem={contagem} onEscolher={escolherCategoria} />
            <Destaques produtos={destaques} getCat={getCat} config={config} favoritos={sel} onFav={alternar} onAbrir={abrir} />

            {/* ------------ coleção ------------ */}
            <section className="vd-sec vd-claro vd-colecao" id="colecao">
              <div className="vd-wrap">
                <CabSecao claro indice="03" rotulo="Coleção" titulo={<>A coleção <em>completa</em>.</>} lead={nenhumaPeca ? "Estamos montando a coleção online. Enquanto isso, fale com a gente: temos muito mais na loja." : "Filtre por categoria, formato, material ou cor. Marque o coração das que gostar e experimente na loja."} />

                {!nenhumaPeca && (
                  <>
                    <div className="vd-barra">
                      <nav className="vd-abas" aria-label="Categorias">
                        <button type="button" className={!filtro.cat ? "is-on" : ""} onClick={() => setFiltro({ ...FILTRO_VAZIO, ordem: filtro.ordem })}>
                          Todas <small>{produtos.length}</small>
                        </button>
                        {categorias.map((c) => (
                          <button type="button" key={c.id} className={filtro.cat === c.slug ? "is-on" : ""} onClick={() => setFiltro({ ...FILTRO_VAZIO, cat: c.slug, ordem: filtro.ordem })}>
                            {c.nome} <small>{contagem[c.id] || 0}</small>
                          </button>
                        ))}
                      </nav>
                      <div className="vd-ferr">
                        <label className="vd-busca">
                          <Ico n="search" size={18} />
                          <input type="search" value={filtro.busca} onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))} placeholder="Buscar por nome ou referência" aria-label="Buscar" />
                        </label>
                        <div className="vd-generos" role="group" aria-label="Para quem">
                          {["Feminino", "Masculino", "Infantil"].map((g) => (
                            <button type="button" key={g} className={filtro.genero === g ? "is-on" : ""} aria-pressed={filtro.genero === g} onClick={() => setFiltro((f) => ({ ...f, genero: f.genero === g ? "" : g }))}>
                              {g}
                            </button>
                          ))}
                        </div>
                        <button type="button" className="vd-filtros-btn" onClick={() => setPainel(true)}>
                          <Ico n="filter" size={18} /> Filtros{nFiltros > 0 && <b>{nFiltros}</b>}
                        </button>
                        <label className="vd-ordem">
                          <span className="vt-vh">Ordenar</span>
                          <select value={filtro.ordem} onChange={(e) => setFiltro((f) => ({ ...f, ordem: e.target.value }))} aria-label="Ordenar por">
                            {ORDENS.map(([v, t]) => (
                              <option key={v} value={v}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <Ico n="chevronDown" size={16} />
                        </label>
                      </div>
                      {ativos.length > 0 && (
                        <div className="vd-ativos">
                          {ativos.map((a) => (
                            <button type="button" key={a.k} onClick={a.off} aria-label={`Remover filtro ${a.t}`}>
                              {a.t} <Ico n="close" size={13} />
                            </button>
                          ))}
                          <button type="button" className="vd-ativos__limpar" onClick={() => setFiltro((f) => ({ ...FILTRO_VAZIO, cat: f.cat, ordem: f.ordem }))}>
                            Limpar filtros
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="vd-contagem" aria-live="polite">
                      {resultado.length} {resultado.length === 1 ? "peça" : "peças"}
                      {catAtiva ? ` em ${catAtiva.nome}` : ""}
                    </p>

                    {resultado.length > 0 ? (
                      <>
                        <div className="vd-grade">
                          {resultado.slice(0, mostrar).map((p, i) => (
                            <CartaoProduto key={p.id} p={p} cat={getCat(p.categoria_id)} config={config} fav={sel.includes(p.id)} onFav={alternar} onAbrir={abrir} i={i} />
                          ))}
                        </div>
                        {resultado.length > mostrar && (
                          <div className="vd-mais">
                            <button type="button" className="vt-btn vt-btn--linha" onClick={() => setMostrar((m) => m + PASSO)}>
                              Ver mais peças <Ico n="chevronDown" size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="vd-vazio">
                        <Glasses linha forma="Redondo" className="vd-vazio__arte" />
                        <h3 className="vt-display">Nenhuma peça com esses filtros</h3>
                        <p>Tente tirar algum filtro, ou conte para a gente o que você procura. A coleção na loja é maior que a do site.</p>
                        <div>
                          <button type="button" className="vt-btn vt-btn--escuro" onClick={() => setFiltro(FILTRO_VAZIO)}>
                            Limpar filtros
                          </button>
                          <a className="vt-btn vt-btn--linha" href={zapGeral} target="_blank" rel="noopener noreferrer">
                            <Ico n="whatsapp" size={18} /> Falar no WhatsApp
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {nenhumaPeca && (
                  <div className="vd-vazio">
                    <Glasses linha forma="Panto" className="vd-vazio__arte" />
                    <h3 className="vt-display">Coleção em preparação</h3>
                    <p>Em breve você verá aqui todas as armações. Para ver os modelos agora, chame a Vértice no WhatsApp.</p>
                    <div>
                      <a className="vt-btn vt-btn--ouro" href={zapGeral} target="_blank" rel="noopener noreferrer">
                        <Ico n="whatsapp" size={18} /> Chamar no WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <GuiaRosto contar={contarRosto} onVer={verRosto} />
        <GuiaLentes config={config} />
        <Sobre config={config} />
        <Visite config={config} />
      </main>

      <Rodape config={config} />

      {sel.length > 0 && !selAberta && (
        <button type="button" className="vd-pilula" onClick={() => setSelAberta(true)}>
          <Ico n="heart" size={18} cheio />
          <span>Minha seleção</span>
          <b>{sel.length}</b>
        </button>
      )}
      <FabZap config={config} />

      {/* janelas */}
      <Selecao aberto={selAberta} aoFechar={() => setSelAberta(false)} itens={itensSel} config={config} onRemover={remover} onLimpar={limpar} onAbrir={(p) => { setSelAberta(false); abrir(p); }} getCat={getCat} />

      {produtoAberto && (
        <Detalhe
          p={produtoAberto}
          cat={getCat(produtoAberto.categoria_id)}
          config={config}
          aoFechar={fecharDetalhe}
          fav={sel.includes(produtoAberto.id)}
          onFav={alternar}
          relacionados={relacionados}
          favoritos={sel}
          onAbrir={abrir}
          onRosto={verRosto}
          getCat={getCat}
        />
      )}

      <Modal
        aberto={painel}
        aoFechar={() => setPainel(false)}
        titulo="Filtros"
        sub={`${resultado.length} ${resultado.length === 1 ? "peça" : "peças"}`}
        rodape={
          <>
            <button type="button" className="vt-btn vt-btn--suave" onClick={() => setFiltro((f) => ({ ...FILTRO_VAZIO, cat: f.cat, ordem: f.ordem, busca: f.busca, genero: f.genero }))}>
              Limpar
            </button>
            <button type="button" className="vt-btn vt-btn--escuro" style={{ flex: 1 }} onClick={() => setPainel(false)}>
              Ver {resultado.length} {resultado.length === 1 ? "peça" : "peças"}
            </button>
          </>
        }
      >
        <div className="vd-painel">
          <section>
            <h4>Formato do rosto</h4>
            <div className="vd-painel__rostos">
              {ROSTOS.map((r) => (
                <button type="button" key={r.id} className={filtro.rosto === r.id ? "is-on" : ""} aria-pressed={filtro.rosto === r.id} onClick={() => setFiltro((f) => ({ ...f, rosto: f.rosto === r.id ? "" : r.id }))}>
                  <RostoIcone id={r.id} />
                  <span>{r.nome}</span>
                </button>
              ))}
            </div>
          </section>
          {camposFiltro.map((f) => (
            <section key={f.chave}>
              <h4>{f.rotulo}</h4>
              {f.tipo === "simnao" ? (
                <div className="vd-painel__chips">
                  <button type="button" className={filtro.specs[f.chave] === "1" ? "is-on" : ""} aria-pressed={filtro.specs[f.chave] === "1"} onClick={() => setFiltro((x) => { const s = { ...x.specs }; if (s[f.chave] === "1") delete s[f.chave]; else s[f.chave] = "1"; return { ...x, specs: s }; })}>
                    Sim <small>{f.n}</small>
                  </button>
                </div>
              ) : (
                <div className="vd-painel__chips">
                  {f.opcoes.map((o) => (
                    <button type="button" key={o.k} className={normalizar(filtro.specs[f.chave] || "") === o.k ? "is-on" : ""} aria-pressed={normalizar(filtro.specs[f.chave] || "") === o.k} onClick={() => setFiltro((x) => { const s = { ...x.specs }; if (normalizar(s[f.chave] || "") === o.k) delete s[f.chave]; else s[f.chave] = o.valor; return { ...x, specs: s }; })}>
                      {o.valor} <small>{o.n}</small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
          {camposFiltro.length === 0 && !filtro.rosto && <p className="vd-painel__vazio">Escolha uma categoria para ver mais filtros, como formato, material e cor.</p>}
        </div>
      </Modal>
    </div>
  );
}
