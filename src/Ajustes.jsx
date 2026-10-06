import { useState, useEffect } from "react";
import * as api from "./api.js";
import {
  FORMULARIO_PADRAO, TIPOS_PERGUNTA, MENSAGENS, QUADROS_PADRAO, CONFIG_PADRAO, DIAS, ORDEM_SEMANA, soDigitos, foneFmt, dinheiro,
} from "./padroes.js";
import {
  C, S, ICONES, Modal, Botao, OURO, Campo, Interruptor, Chips, Selo, Carregando, Vazio, Credito, Linha, Miniatura,
  fmtData, foneDigitando, tamanho,
} from "./ui.jsx";

/* =====================================================================
   AJUSTES — tudo o que a dona muda sem mexer em código
   ===================================================================== */

/* rascunho que volta ao valor salvo toda vez que a janela abre */
function useRascunho(aberto, valor) {
  const [r, setR] = useState(valor);
  useEffect(() => { if (aberto) setR(valor); }, [aberto]); // eslint-disable-line
  return [r, setR];
}

function useSalvar(acoes, fechar) {
  const [salvando, setSalvando] = useState(false);
  const salvar = async (parcial, msg = "Salvo") => {
    setSalvando(true);
    try { await acoes.salvarConfig(parcial); acoes.avisar(msg); fechar(); }
    catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setSalvando(false);
  };
  return [salvar, salvando];
}

export default function Ajustes({ cfg, bruto, admin, perfil, sessao, acoes }) {
  const [aberto, setAberto] = useState("");
  const abrir = (id) => setAberto(id);
  const fechar = () => setAberto("");
  const p = { cfg, bruto, acoes, fechar };

  return (
    <div>
      <h1 style={{ fontFamily: '"Cinzel", serif', fontSize: 24, fontWeight: 600, margin: "4px 2px 4px" }}>Ajustes</h1>
      <div style={{ fontSize: 13, color: C.suave, margin: "0 2px 6px" }}>{perfil.email} · {admin ? "administradora" : "equipe"}</div>

      {admin && (
        <>
          <div style={S.titSecao}>A loja</div>
          <div style={{ ...S.card, overflow: "hidden" }}>
            <Linha primeira icone={ICONES.loja} titulo="Dados da loja" sub={`${cfg.nome} · ${foneFmt(cfg.whatsapp)}`} aoTocar={() => abrir("loja")} />
            <Linha icone={ICONES.relogio} titulo="Horário de funcionamento" sub="Aparece no catálogo, com o aberto/fechado" aoTocar={() => abrir("horarios")} />
            <Linha icone={ICONES.pix} titulo="Chave Pix" sub={cfg.pix_chave ? `${cfg.pix_tipo || "Chave"} · ${cfg.pix_chave}` : "Ainda não cadastrada"} aoTocar={() => abrir("pix")}
              direita={!cfg.pix_chave ? <Selo tipo="aviso">falta</Selo> : null} />
          </div>

          <div style={S.titSecao}>Catálogo</div>
          <div style={{ ...S.card, overflow: "hidden" }}>
            <Linha primeira icone={ICONES.formulario} titulo="Formulário do catálogo" sub={`${cfg.formulario.length} perguntas antes de enviar pelo WhatsApp`} aoTocar={() => abrir("formulario")} />
            <Linha icone={ICONES.mensagem} titulo="Mensagens do WhatsApp" sub="O texto que o cliente envia" aoTocar={() => abrir("mensagens")} />
            <Linha icone={ICONES.foto} titulo="Fotos da abertura" sub={cfg.fotos_abertura.length ? `${cfg.fotos_abertura.length} foto(s) passando ao fundo` : "Sem fotos: aparece só a logo"} aoTocar={() => abrir("fotos")} />
            <Linha icone={ICONES.texto} titulo="Textos do catálogo" sub="Frase da abertura, boas-vindas e os quatro quadros" aoTocar={() => abrir("textos")} />
            <Linha icone={ICONES.preferencias} titulo="Preferências" sub="Preços, parcelas, esgotados e aviso de estoque baixo" aoTocar={() => abrir("prefs")} />
          </div>

          <div style={S.titSecao}>Sistema</div>
          <div style={{ ...S.card, overflow: "hidden" }}>
            <Linha primeira icone={ICONES.usuarios} titulo="Usuários" sub="Quem entra no app e o que pode fazer" aoTocar={() => abrir("usuarios")} />
            <Linha icone={ICONES.disco} titulo="Espaço das fotos" sub="Quanto do 1 GB grátis já foi usado" aoTocar={() => abrir("espaco")} />
            <Linha icone={ICONES.lixo} titulo="Lixeira" sub="Produtos e categorias excluídos" aoTocar={() => abrir("lixeira")} />
          </div>
        </>
      )}

      <div style={S.titSecao}>Minha conta</div>
      <div style={{ ...S.card, overflow: "hidden" }}>
        <Linha primeira icone={ICONES.conta} titulo="Trocar minha senha" aoTocar={() => abrir("senha")} />
        <Linha icone={ICONES.catalogo} titulo="Abrir o catálogo" sub={`${window.location.origin}/catalogo`} aoTocar={() => window.open("/catalogo", "_blank")} />
        <Linha icone={ICONES.sair} titulo="Sair do app" aoTocar={() => { if (window.confirm("Sair do app?")) api.logout(); }} />
      </div>

      <Credito />

      <DadosLoja aberto={aberto === "loja"} {...p} />
      <Horarios aberto={aberto === "horarios"} {...p} />
      <Pix aberto={aberto === "pix"} {...p} />
      <EditorFormulario aberto={aberto === "formulario"} {...p} />
      <Mensagens aberto={aberto === "mensagens"} {...p} />
      <FotosAbertura aberto={aberto === "fotos"} {...p} />
      <Textos aberto={aberto === "textos"} {...p} />
      <Preferencias aberto={aberto === "prefs"} {...p} />
      <Usuarios aberto={aberto === "usuarios"} fechar={fechar} acoes={acoes} eu={sessao.user.id} />
      <Espaco aberto={aberto === "espaco"} fechar={fechar} acoes={acoes} />
      <Lixeira aberto={aberto === "lixeira"} fechar={fechar} acoes={acoes} />
      <Senha aberto={aberto === "senha"} fechar={fechar} acoes={acoes} />
    </div>
  );
}

/* ---------------------------------------------------------------------
   Dados da loja
   --------------------------------------------------------------------- */
function DadosLoja({ aberto, cfg, acoes, fechar }) {
  const [r, setR] = useRascunho(aberto, {
    nome: cfg.nome, whatsapp: foneDigitando(soDigitos(cfg.whatsapp).replace(/^55(?=\d{10,11}$)/, "")), instagram: cfg.instagram,
    endereco: cfg.endereco, bairro: cfg.bairro, mapa_busca: cfg.mapa_busca,
  });
  const [salvar, salvando] = useSalvar(acoes, fechar);
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const ok = () => {
    const d = soDigitos(r.whatsapp);
    if (d.length !== 10 && d.length !== 11) return acoes.avisar("Confira o WhatsApp: DDD + número. Ex.: (34) 9 9856-3693.", "erro");
    if (!r.nome.trim()) return acoes.avisar("Preencha o nome da loja.", "erro");
    salvar({ nome: r.nome.trim(), whatsapp: d, instagram: r.instagram.replace(/^@/, "").trim(), endereco: r.endereco.trim(), bairro: r.bairro.trim(),
      mapa_busca: r.mapa_busca.trim() || `${r.endereco}, ${r.bairro}` });
  };
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Dados da loja" rodape={<Botao cheio {...OURO} onClick={ok} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Botao>}>
      <Campo n={1} rotulo="Nome da loja"><input className="vt-campo" value={r.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Vértice Design Óptico" /></Campo>
      <Campo n={2} rotulo="WhatsApp que recebe os pedidos" dica="DDD + número. É para cá que o catálogo manda as mensagens.">
        <input className="vt-campo" inputMode="tel" value={r.whatsapp} onChange={(e) => set("whatsapp", foneDigitando(e.target.value))} placeholder="Ex.: (34) 9 9856-3693" />
      </Campo>
      <Campo n={3} rotulo="Instagram"><input className="vt-campo" value={r.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="Ex.: verticedesign_optico" /></Campo>
      <Campo n={4} rotulo="Endereço"><input className="vt-campo" value={r.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Ex.: Av. José Abdulmassih, 1095 · Loja 1" /></Campo>
      <Campo n={5} rotulo="Bairro e cidade"><input className="vt-campo" value={r.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="Ex.: Shopping Park · Uberlândia – MG" /></Campo>
      <Campo n={6} rotulo="Endereço para o mapa" dica="É o que o Google Maps procura para pôr o pino no círculo da localização. Escreva como você digitaria no Maps.">
        <input className="vt-campo" value={r.mapa_busca} onChange={(e) => set("mapa_busca", e.target.value)} placeholder="Ex.: Av. José Abdulmassih, 1095, Uberlândia - MG" />
      </Campo>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Horário de funcionamento
   --------------------------------------------------------------------- */
function Horarios({ aberto, cfg, acoes, fechar }) {
  const [r, setR] = useRascunho(aberto, { horarios: JSON.parse(JSON.stringify(cfg.horarios)), obs: cfg.horario_obs || "" });
  const [salvar, salvando] = useSalvar(acoes, fechar);
  const mudar = (d, k, v) => setR((x) => ({ ...x, horarios: { ...x.horarios, [d]: { ...x.horarios[d], [k]: v } } }));
  const copiarSegunda = () => setR((x) => { const h = { ...x.horarios }; [2, 3, 4, 5].forEach((d) => { h[d] = { ...h[1] }; }); return { ...x, horarios: h }; });
  const ok = () => {
    for (const d of ORDEM_SEMANA) {
      const h = r.horarios[d];
      if (h.aberto && (!h.abre || !h.fecha || h.abre >= h.fecha)) return acoes.avisar(`Confira o horário de ${DIAS[d].toLowerCase()}.`, "erro");
    }
    salvar({ horarios: r.horarios, horario_obs: r.obs.trim() });
  };
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Horário de funcionamento" sub="Horário de Brasília"
      rodape={<Botao cheio {...OURO} onClick={ok} disabled={salvando}>{salvando ? "Salvando…" : "Salvar horários"}</Botao>}>
      <div style={{ ...S.card, overflow: "hidden", marginBottom: 12 }}>
        {ORDEM_SEMANA.map((d, k) => {
          const h = r.horarios[d];
          return (
            <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: k ? `1px solid ${C.borda}` : "none", flexWrap: "wrap" }}>
              <button onClick={() => mudar(d, "aberto", !h.aberto)} className="vt-toque" style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent",
                padding: 0, minWidth: 128, textAlign: "left" }}>
                <span style={{ flex: "0 0 40px", height: 24, borderRadius: 999, background: h.aberto ? C.verde : "#D4CDC1", position: "relative" }}>
                  <span style={{ position: "absolute", top: 3, left: h.aberto ? 19 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                </span>
                <b style={{ fontSize: 14 }}>{DIAS[d]}</b>
              </button>
              {h.aberto ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 180px", minWidth: 0 }}>
                  <input className="vt-campo" type="time" value={h.abre} onChange={(e) => mudar(d, "abre", e.target.value)} style={{ padding: "9px 8px", minWidth: 0 }} />
                  <span style={{ color: C.suave }}>às</span>
                  <input className="vt-campo" type="time" value={h.fecha} onChange={(e) => mudar(d, "fecha", e.target.value)} style={{ padding: "9px 8px", minWidth: 0 }} />
                </div>
              ) : <span style={{ color: C.suave, fontSize: 14 }}>Fechado</span>}
            </div>
          );
        })}
      </div>
      <Botao pequeno contorno cor={C.texto} onClick={copiarSegunda}>Copiar o horário de segunda para terça a sexta</Botao>
      <Campo rotulo="Observação (opcional)" dica="Aparece embaixo dos horários. Ex.: feriados, horário especial de dezembro." style={{ marginTop: 16 }}>
        <input className="vt-campo" value={r.obs} onChange={(e) => setR((x) => ({ ...x, obs: e.target.value }))} placeholder="Ex.: Em feriados, consulte pelo WhatsApp." />
      </Campo>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Chave Pix
   --------------------------------------------------------------------- */
const TIPOS_PIX = ["CPF", "CNPJ", "Celular", "E-mail", "Chave aleatória"];
function Pix({ aberto, cfg, acoes, fechar }) {
  const [r, setR] = useRascunho(aberto, { pix_tipo: cfg.pix_tipo || "", pix_chave: cfg.pix_chave || "", pix_nome: cfg.pix_nome || "", pix_banco: cfg.pix_banco || "" });
  const [salvar, salvando] = useSalvar(acoes, fechar);
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const ok = () => {
    if (r.pix_chave.trim() && !r.pix_tipo) return acoes.avisar("Escolha o tipo da chave.", "erro");
    salvar({ pix_tipo: r.pix_tipo, pix_chave: r.pix_chave.trim(), pix_nome: r.pix_nome.trim(), pix_banco: r.pix_banco.trim() }, "Chave Pix salva");
  };
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Chave Pix" sub="Aparece no catálogo quando o cliente escolhe Pix"
      rodape={<Botao cheio {...OURO} onClick={ok} disabled={salvando}>{salvando ? "Salvando…" : "Salvar chave Pix"}</Botao>}>
      <Campo n={1} rotulo="Tipo da chave"><Chips opcoes={TIPOS_PIX} valor={r.pix_tipo} mudar={(v) => set("pix_tipo", v)} /></Campo>
      <Campo n={2} rotulo="Chave" dica="Confira com cuidado: é para essa chave que o cliente vai pagar.">
        <input className="vt-campo" value={r.pix_chave} onChange={(e) => set("pix_chave", e.target.value)} placeholder={
          { CPF: "Ex.: 123.456.789-00", CNPJ: "Ex.: 12.345.678/0001-90", Celular: "Ex.: (34) 9 9856-3693", "E-mail": "Ex.: loja@email.com" }[r.pix_tipo] || "Ex.: a chave copiada do banco"} />
      </Campo>
      <Campo n={3} rotulo="Nome de quem recebe" dica="Ajuda o cliente a conferir antes de pagar.">
        <input className="vt-campo" value={r.pix_nome} onChange={(e) => set("pix_nome", e.target.value)} placeholder="Ex.: Vértice Design Óptico LTDA" />
      </Campo>
      <Campo n={4} rotulo="Banco (opcional)"><input className="vt-campo" value={r.pix_banco} onChange={(e) => set("pix_banco", e.target.value)} placeholder="Ex.: Nubank" /></Campo>
      {r.pix_chave.trim() && (
        <div style={{ borderRadius: 16, padding: 16, background: `linear-gradient(135deg, ${C.carvao}, ${C.ardosia2})`, color: "#fff" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: C.ouro, fontWeight: 700, textTransform: "uppercase" }}>Como o cliente vê · {r.pix_tipo || "chave"}</div>
          <div style={{ fontSize: 18, fontWeight: 700, margin: "8px 0 4px", wordBreak: "break-all", color: C.ouroClaro }}>{r.pix_chave}</div>
          {r.pix_nome && <div style={{ fontSize: 13, opacity: 0.8 }}>{r.pix_nome}{r.pix_banco ? ` · ${r.pix_banco}` : ""}</div>}
        </div>
      )}
      {cfg.pix_chave && (
        <Botao pequeno contorno cor={C.vermelho} style={{ marginTop: 14 }} onClick={() => { if (window.confirm("Tirar a chave Pix do catálogo?")) setR({ pix_tipo: "", pix_chave: "", pix_nome: "", pix_banco: "" }); }}>
          Tirar a chave do catálogo
        </Botao>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Formulário do catálogo (as perguntas antes de enviar pelo WhatsApp)
   --------------------------------------------------------------------- */
const nomeTipo = (t) => (t === "pagamento" ? "Forma de pagamento" : (TIPOS_PERGUNTA.find((x) => x.v === t) || {}).l || t);

function EditorFormulario({ aberto, cfg, acoes, fechar }) {
  const [lista, setLista] = useRascunho(aberto, cfg.formulario.map((p) => ({ ...p, opcoes: [...(p.opcoes || [])] })));
  const [editando, setEditando] = useState(null);
  const [salvar, salvando] = useSalvar(acoes, fechar);
  const mover = (i, d) => { const l = [...lista]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setLista(l); };
  const tirar = (p) => {
    if (!window.confirm(`Tirar a pergunta "${p.titulo}"?`)) return;
    setLista(lista.filter((x) => x.id !== p.id).map((x) => (x.mostrar_se && x.mostrar_se.pergunta === p.id ? { ...x, mostrar_se: null } : x)));
  };
  const gravarPergunta = (p) => {
    setLista((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l.slice(0, -2), p, ...l.slice(-2)]));
    setEditando(null);
  };
  const original = () => { if (window.confirm("Voltar ao formulário original? As suas mudanças somem.")) setLista(FORMULARIO_PADRAO.map((p) => ({ ...p }))); };
  const titulo = (id) => (lista.find((x) => x.id === id) || {}).titulo || "?";

  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Formulário do catálogo" sub="O cliente responde antes de enviar pelo WhatsApp" largo
      rodape={<Botao cheio {...OURO} onClick={() => salvar({ formulario: lista }, "Formulário salvo")} disabled={salvando}>{salvando ? "Salvando…" : "Salvar formulário"}</Botao>}>
      <div style={{ ...S.card, padding: 14, fontSize: 13.5, color: C.suave, lineHeight: 1.55, marginBottom: 12 }}>
        Toque em <b style={{ color: C.texto }}>editar</b> para mudar o texto ou as opções. A ordem daqui é a ordem do catálogo.
        As respostas vão escritas na mensagem do WhatsApp.
      </div>
      {lista.map((p, i) => (
        <div key={p.id} style={{ ...S.card, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ flex: "0 0 26px", height: 26, borderRadius: "50%", background: C.ardosia, color: C.ouroClaro, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.35 }}>{p.titulo}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <Selo tipo="neutro">{nomeTipo(p.tipo)}</Selo>
                {p.obrigatoria ? <Selo tipo="ouro">obrigatória</Selo> : <Selo tipo="neutro">opcional</Selo>}
                {p.mostrar_se && p.mostrar_se.pergunta && (
                  <span style={{ padding: "4px 9px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: C.ambarFundo, color: C.ambar, lineHeight: 1.4 }}>
                    só aparece se “{titulo(p.mostrar_se.pergunta)}” for “{p.mostrar_se.resposta}”
                  </span>
                )}
              </div>
              {(p.opcoes || []).length > 0 && <div style={{ fontSize: 12.5, color: C.suave, marginTop: 6, lineHeight: 1.5 }}>{p.opcoes.join(" · ")}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <Botao pequeno contorno cor={C.texto} icone={ICONES.editar} onClick={() => setEditando(p)}>Editar</Botao>
            <Botao pequeno contorno cor={C.texto} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">{ICONES.cima}</Botao>
            <Botao pequeno contorno cor={C.texto} onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label="Descer">{ICONES.baixo}</Botao>
            {!p.fixa && <Botao pequeno contorno cor={C.vermelho} icone={ICONES.lixo} onClick={() => tirar(p)}>Tirar</Botao>}
          </div>
        </div>
      ))}
      <Botao cheio contorno cor={C.ouroEsc} icone={ICONES.mais} onClick={() => setEditando({ id: `p${Date.now()}`, titulo: "", rotulo: "", tipo: "opcoes", opcoes: [], obrigatoria: false, novo: true })}>
        Nova pergunta
      </Botao>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Botao pequeno contorno cor={C.suave} onClick={original}>Voltar ao formulário original</Botao>
        <Botao pequeno contorno cor={C.suave} icone={ICONES.catalogo} onClick={() => window.open("/catalogo", "_blank")}>Ver o catálogo</Botao>
      </div>

      <EditarPergunta p={editando} lista={lista} aoFechar={() => setEditando(null)} gravar={gravarPergunta} avisar={acoes.avisar} />
    </Modal>
  );
}

function EditarPergunta({ p, lista, aoFechar, gravar, avisar }) {
  const [r, setR] = useState(null);
  useEffect(() => { setR(p ? { ...p, _opcoes: (p.opcoes || []).join("\n"), mostrar_se: p.mostrar_se || null } : null); }, [p]);
  if (!p || !r) return null;
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const temOpcoes = r.tipo === "opcoes" || r.tipo === "pagamento";
  const candidatas = lista.filter((x) => x.id !== r.id && x.tipo === "opcoes" && (x.opcoes || []).length);
  const condicao = r.mostrar_se && r.mostrar_se.pergunta ? lista.find((x) => x.id === r.mostrar_se.pergunta) : null;

  const ok = () => {
    if (!r.titulo.trim()) return avisar("Escreva a pergunta.", "erro");
    const opcoes = r._opcoes.split("\n").map((x) => x.trim()).filter(Boolean);
    if (temOpcoes && opcoes.length < 2) return avisar("Coloque pelo menos duas opções, uma por linha.", "erro");
    const { _opcoes, novo, ...resto } = r;
    gravar({ ...resto, titulo: r.titulo.trim(), rotulo: (r.rotulo || "").trim() || r.titulo.trim(), opcoes: temOpcoes ? opcoes : [],
      mostrar_se: r.mostrar_se && r.mostrar_se.pergunta && r.mostrar_se.resposta ? r.mostrar_se : null });
  };

  return (
    <Modal aberto={!!p} aoFechar={aoFechar} titulo={p.novo ? "Nova pergunta" : "Editar pergunta"}
      rodape={<Botao cheio {...OURO} onClick={ok}>Pronto</Botao>}>
      <Campo n={1} rotulo="A pergunta">
        <input className="vt-campo" value={r.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: Você usa lente de contato?" />
      </Campo>
      <Campo n={2} rotulo="Nome curto na mensagem do WhatsApp" dica="Ex.: a pergunta “Você já fez o exame de vista?” vai na mensagem como “Receita: Sim”.">
        <input className="vt-campo" value={r.rotulo || ""} onChange={(e) => set("rotulo", e.target.value)} placeholder="Ex.: Lente de contato" />
      </Campo>
      {!p.fixa && r.tipo !== "pagamento" && (
        <Campo n={3} rotulo="Tipo de resposta">
          <Chips opcoes={TIPOS_PERGUNTA.map((t) => t.l)} valor={nomeTipo(r.tipo)} mudar={(l) => set("tipo", (TIPOS_PERGUNTA.find((t) => t.l === l) || TIPOS_PERGUNTA[0]).v)} />
        </Campo>
      )}
      {temOpcoes ? (
        <Campo n={4} rotulo="Opções (uma por linha)" dica={r.tipo === "pagamento" ? "Se uma opção tiver a palavra “Pix”, o catálogo mostra a sua chave Pix quando o cliente escolher." : undefined}>
          <textarea className="vt-campo" rows={5} value={r._opcoes} onChange={(e) => set("_opcoes", e.target.value)} style={{ resize: "vertical", lineHeight: 1.5 }}
            placeholder={"Ex.:\nSim\nNão"} />
        </Campo>
      ) : (
        <Campo n={4} rotulo="Exemplo dentro do campo" dica="Aparece clarinho no campo, antes de a pessoa digitar.">
          <input className="vt-campo" value={r.exemplo || ""} onChange={(e) => set("exemplo", e.target.value)} placeholder="Ex.: Ex.: 42" />
        </Campo>
      )}
      <Campo n={5} rotulo="Explicação embaixo da pergunta (opcional)">
        <textarea className="vt-campo" rows={2} value={r.nota || ""} onChange={(e) => set("nota", e.target.value)} style={{ resize: "vertical" }}
          placeholder="Ex.: A partir dos 40 anos é comum precisar de multifocal." />
      </Campo>
      <Interruptor ligado={!!r.obrigatoria} mudar={(v) => set("obrigatoria", v)} rotulo="Resposta obrigatória" dica="Ligado, o cliente só envia depois de responder." />

      {candidatas.length > 0 && (
        <Campo rotulo="Quando mostrar esta pergunta">
          <Chips opcoes={["Sempre", ...candidatas.map((x) => x.titulo)]} valor={condicao ? condicao.titulo : "Sempre"}
            mudar={(t) => { const q = candidatas.find((x) => x.titulo === t); set("mostrar_se", q ? { pergunta: q.id, resposta: "" } : null); }} />
          {condicao && (
            <div style={{ marginTop: 12 }}>
              <div style={S.rotulo}>Só quando a resposta for:</div>
              <Chips opcoes={condicao.opcoes} valor={r.mostrar_se.resposta} mudar={(v) => set("mostrar_se", { pergunta: condicao.id, resposta: v })} />
            </div>
          )}
        </Campo>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Mensagens do WhatsApp, editáveis
   --------------------------------------------------------------------- */
function Mensagens({ aberto, cfg, acoes, fechar }) {
  const [id, setId] = useState(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const m = id ? MENSAGENS[id] : null;
  const abrirMsg = (k) => { setTexto(cfg[k] || MENSAGENS[k].texto); setId(k); };
  const gravar = async () => {
    setSalvando(true);
    try { await acoes.salvarConfig({ [id]: texto }); acoes.avisar("Mensagem salva"); setId(null); }
    catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setSalvando(false);
  };
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Mensagens do WhatsApp">
      <div style={{ ...S.card, padding: 14, fontSize: 13.5, color: C.suave, lineHeight: 1.55, marginBottom: 12 }}>
        Toque numa mensagem para mudar o texto. As palavras entre chaves, como <b style={{ color: C.texto }}>{"{itens}"}</b>, são trocadas na hora de enviar.
      </div>
      <div style={{ ...S.card, overflow: "hidden" }}>
        {Object.entries(MENSAGENS).map(([k, v], i) => (
          <Linha key={k} primeira={!i} titulo={v.titulo} sub={v.quando} aoTocar={() => abrirMsg(k)}
            direita={cfg[k] && cfg[k] !== v.texto ? <Selo tipo="ouro">editada</Selo> : null} />
        ))}
      </div>

      <Modal aberto={!!m} aoFechar={() => setId(null)} titulo={m ? m.titulo : ""} sub="Mensagem do WhatsApp"
        rodape={
          <div style={{ display: "grid", gap: 8 }}>
            <Botao cheio {...OURO} onClick={gravar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar mensagem"}</Botao>
            <Botao cheio contorno cor={C.suave} onClick={() => { if (window.confirm("Voltar ao texto original?")) setTexto(m.texto); }}>Voltar ao texto original</Botao>
          </div>
        }>
        {m && (
          <>
            <div style={{ ...S.card, padding: 14, marginBottom: 14, fontSize: 13.5, color: C.suave, lineHeight: 1.5 }}>{m.quando}</div>
            <label style={S.rotulo}>Texto da mensagem</label>
            <textarea className="vt-campo" rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} style={{ resize: "vertical", lineHeight: 1.5 }} />
            {m.campos.length > 0 && (
              <>
                <div style={{ ...S.rotulo, marginTop: 16 }}>Toque para inserir no fim do texto</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {m.campos.map((c) => (
                    <button key={c} type="button" onClick={() => setTexto((t) => t + c)} style={{ padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                      border: `1.5px solid ${C.borda}`, background: "#fff", color: C.ouroEsc }}>{c}</button>
                  ))}
                </div>
              </>
            )}
            <div style={{ ...S.card, padding: 14, marginTop: 16, fontSize: 12.5, color: C.suave, lineHeight: 1.6 }}>
              {id === "msg_pedido" && <><b style={{ color: C.texto }}>O que cada um vale:</b> {"{nome}"} o nome do cliente · {"{itens}"} os modelos da sacola, com preço ·
                {" {respostas}"} as respostas do formulário · {"{pix}"} a chave Pix, quando o cliente escolhe Pix.<br /></>}
              {id === "msg_duvida" && <><b style={{ color: C.texto }}>O que cada um vale:</b> {"{produto}"} o nome · {"{codigo}"} o código · {"{link}"} o link do produto.<br /></>}
              Se os emojis chegarem errados no WhatsApp do computador, apague-os aqui. Pelo celular eles funcionam normalmente.
            </div>
          </>
        )}
      </Modal>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Fotos da abertura do catálogo
   --------------------------------------------------------------------- */
function FotosAbertura({ aberto, cfg, acoes, fechar }) {
  const [fotos, setFotos] = useRascunho(aberto, [...cfg.fotos_abertura]);
  const [enviando, setEnviando] = useState("");
  const [novas, setNovas] = useState([]);
  const [salvar, salvando] = useSalvar(acoes, () => { setNovas([]); fechar(); });
  const add = async (e) => {
    const arq = Array.from(e.target.files || []).slice(0, 6 - fotos.length);
    e.target.value = "";
    for (let i = 0; i < arq.length; i++) {
      setEnviando(`Enviando ${i + 1} de ${arq.length}…`);
      try { const u = await api.enviarFoto(arq[i], "site"); setFotos((f) => [...f, u]); setNovas((n) => [...n, u]); }
      catch (err) { acoes.avisar(api.msgErro(err), "erro"); }
    }
    setEnviando("");
  };
  const cancelar = () => { if (novas.length) api.removerArquivos(novas).catch(() => {}); setNovas([]); fechar(); };
  return (
    <Modal aberto={aberto} aoFechar={cancelar} titulo="Fotos da abertura" sub="Passam ao fundo, atrás da logo"
      rodape={<Botao cheio {...OURO} onClick={() => salvar({ fotos_abertura: fotos }, "Fotos salvas")} disabled={salvando || !!enviando}>{salvando ? "Salvando…" : "Salvar fotos"}</Botao>}>
      <div style={{ ...S.card, padding: 14, fontSize: 13.5, color: C.suave, lineHeight: 1.55, marginBottom: 12 }}>
        Até 6 fotos da loja, das vitrines ou de clientes usando os óculos. Elas trocam a cada 2 segundos, bem suaves, atrás da logo.
        Sem fotos, a abertura mostra só a logo.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
        {fotos.map((u) => (
          <div key={u} style={{ position: "relative", paddingTop: "70%", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.borda}` }}>
            <img src={u} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <button onClick={() => setFotos(fotos.filter((x) => x !== u))} aria-label="Tirar foto" style={{ position: "absolute", top: 4, right: 4, width: 28, height: 28,
              borderRadius: "50%", border: "none", background: "rgba(192,69,59,.92)", color: "#fff", display: "grid", placeItems: "center", padding: 0 }}>{ICONES.x}</button>
          </div>
        ))}
        {fotos.length < 6 && (
          <label className="vt-toque" style={{ position: "relative", paddingTop: "70%", borderRadius: 12, border: `1.5px dashed ${C.ouro}`, background: "#fff", cursor: "pointer" }}>
            <span style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4, color: C.ouroEsc, fontSize: 12, fontWeight: 700 }}>{ICONES.foto}{enviando || "Adicionar"}</span>
            <input type="file" accept="image/*" multiple onChange={add} disabled={!!enviando} style={{ display: "none" }} />
          </label>
        )}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Textos do catálogo
   --------------------------------------------------------------------- */
function Textos({ aberto, cfg, acoes, fechar }) {
  const [r, setR] = useRascunho(aberto, { frase: cfg.frase, boas_vindas: cfg.boas_vindas, quadros: cfg.quadros.map((q) => ({ ...q })) });
  const [salvar, salvando] = useSalvar(acoes, fechar);
  const mudarQuadro = (i, k, v) => setR((x) => ({ ...x, quadros: x.quadros.map((q, j) => (j === i ? { ...q, [k]: v } : q)) }));
  const original = () => {
    if (window.confirm("Voltar todos os textos ao original?")) setR({ frase: CONFIG_PADRAO.frase, boas_vindas: CONFIG_PADRAO.boas_vindas, quadros: QUADROS_PADRAO.map((q) => ({ ...q })) });
  };
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Textos do catálogo" largo
      rodape={<Botao cheio {...OURO} onClick={() => salvar({ frase: r.frase.trim(), boas_vindas: r.boas_vindas.trim(), quadros: r.quadros })} disabled={salvando}>{salvando ? "Salvando…" : "Salvar textos"}</Botao>}>
      <Campo n={1} rotulo="Frase da abertura" dica="Aparece embaixo da logo, na primeira tela.">
        <input className="vt-campo" value={r.frase} onChange={(e) => setR((x) => ({ ...x, frase: e.target.value }))} placeholder="Ex.: Design e elegância para o seu olhar" />
      </Campo>
      <Campo n={2} rotulo="Texto de boas-vindas">
        <textarea className="vt-campo" rows={4} value={r.boas_vindas} onChange={(e) => setR((x) => ({ ...x, boas_vindas: e.target.value }))} style={{ resize: "vertical", lineHeight: 1.5 }} />
      </Campo>
      <div style={S.titSecao}>Os quatro quadros</div>
      {r.quadros.map((q, i) => (
        <div key={i} style={{ ...S.card, padding: 14, marginBottom: 10 }}>
          <input className="vt-campo" value={q.t} onChange={(e) => mudarQuadro(i, "t", e.target.value)} placeholder="Título" style={{ fontWeight: 700, marginBottom: 8 }} />
          <textarea className="vt-campo" rows={2} value={q.d} onChange={(e) => mudarQuadro(i, "d", e.target.value)} placeholder="Texto" style={{ resize: "vertical" }} />
        </div>
      ))}
      <Botao pequeno contorno cor={C.suave} onClick={original}>Voltar aos textos originais</Botao>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Preferências
   --------------------------------------------------------------------- */
function Preferencias({ aberto, cfg, acoes, fechar }) {
  const [r, setR] = useRascunho(aberto, { mostrar_precos: cfg.mostrar_precos, parcelas: String(cfg.parcelas || 0), esconder_esgotados: cfg.esconder_esgotados, estoque_baixo: String(cfg.estoque_baixo || 0) });
  const [salvar, salvando] = useSalvar(acoes, fechar);
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Preferências"
      rodape={<Botao cheio {...OURO} disabled={salvando} onClick={() => salvar({ mostrar_precos: r.mostrar_precos, parcelas: parseInt(r.parcelas, 10) || 0,
        esconder_esgotados: r.esconder_esgotados, estoque_baixo: parseInt(r.estoque_baixo, 10) || 0 })}>{salvando ? "Salvando…" : "Salvar"}</Botao>}>
      <Interruptor ligado={r.mostrar_precos} mudar={(v) => set("mostrar_precos", v)} rotulo="Mostrar os preços no catálogo" dica="Desligado, aparece “Consulte o valor”." />
      <Interruptor ligado={r.esconder_esgotados} mudar={(v) => set("esconder_esgotados", v)} rotulo="Esconder produtos esgotados" dica="Ligado, o produto com estoque zero some do catálogo até ter entrada." />
      <Campo rotulo="Parcelamento no cartão" dica={`Mostra “ou em até ${r.parcelas || "N"}x de …” embaixo do preço. Zero para não mostrar. Exemplo: ${dinheiro(249.9)} em ${parseInt(r.parcelas, 10) || 1}x = ${dinheiro(249.9 / (parseInt(r.parcelas, 10) || 1))}.`}>
        <input className="vt-campo" inputMode="numeric" value={r.parcelas} onChange={(e) => set("parcelas", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="Ex.: 10" />
      </Campo>
      <Campo rotulo="Avisar quando o estoque chegar a" dica="O Início avisa quando um produto tiver essa quantidade ou menos.">
        <input className="vt-campo" inputMode="numeric" value={r.estoque_baixo} onChange={(e) => set("estoque_baixo", e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Ex.: 2" />
      </Campo>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Usuários
   --------------------------------------------------------------------- */
function Usuarios({ aberto, fechar, acoes, eu }) {
  const [lista, setLista] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  useEffect(() => { if (aberto) { setLista(null); api.listarUsuarios().then(setLista).catch((e) => { acoes.avisar(api.msgErro(e), "erro"); setLista([]); }); } }, [aberto]); // eslint-disable-line
  const mudar = async (u, dados) => {
    setOcupado(u.id);
    try { await api.salvarUsuario(u.id, dados); setLista((l) => l.map((x) => (x.id === u.id ? { ...x, ...dados } : x))); acoes.avisar("Salvo"); }
    catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setOcupado(null);
  };
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Usuários">
      <div style={{ ...S.card, padding: 14, fontSize: 13.5, color: C.suave, lineHeight: 1.6, marginBottom: 12 }}>
        <b style={{ color: C.texto }}>Administradora</b> faz tudo. <b style={{ color: C.texto }}>Equipe</b> cadastra produtos e dá entrada e saída no estoque,
        mas não mexe em categorias, ajustes, Pix nem na lixeira.
      </div>
      {lista === null ? <Carregando /> : lista.map((u) => (
        <div key={u.id} style={{ ...S.card, padding: 14, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, wordBreak: "break-all" }}>{u.email}{u.id === eu ? " (você)" : ""}</div>
          <input className="vt-campo" defaultValue={u.nome || ""} placeholder="Nome (aparece no histórico do estoque)" style={{ marginTop: 10 }}
            onBlur={(e) => { if (e.target.value.trim() !== (u.nome || "")) mudar(u, { nome: e.target.value.trim() }); }} />
          <div style={{ marginTop: 10, opacity: u.id === eu ? 0.5 : 1, pointerEvents: u.id === eu || ocupado === u.id ? "none" : "auto" }}>
            <Chips opcoes={["Administradora", "Equipe"]} valor={u.role === "admin" ? "Administradora" : "Equipe"}
              mudar={(v) => mudar(u, { role: v === "Administradora" ? "admin" : "func" })} />
          </div>
          {u.id === eu && <div style={S.dica}>Você não pode tirar a sua própria permissão.</div>}
        </div>
      ))}
      <div style={{ ...S.card, padding: 14, fontSize: 13, color: C.suave, lineHeight: 1.6 }}>
        <b style={{ color: C.texto }}>Para criar um usuário novo:</b> no Supabase, Authentication → Users → Add user → <b>Create new user</b>,
        com e-mail, senha e “Auto Confirm User” marcado. Ele entra como Equipe; depois, se quiser, mude aqui.
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Espaço das fotos (o 1 GB grátis do Supabase)
   --------------------------------------------------------------------- */
const LIMITE_BYTES = 1024 * 1024 * 1024;
const PASTAS = { produtos: "Produtos", site: "Abertura do catálogo", categorias: "Categorias" };
function Espaco({ aberto, fechar, acoes }) {
  const [arquivos, setArquivos] = useState(null);
  const [usados, setUsados] = useState(null);
  const [limpando, setLimpando] = useState(false);
  const carregar = async () => {
    setArquivos(null);
    try { const [a, u] = await Promise.all([api.listarArquivos(), api.arquivosEmUso()]); setArquivos(a); setUsados(u); }
    catch (e) { acoes.avisar(api.msgErro(e), "erro"); setArquivos([]); setUsados(new Set()); }
  };
  useEffect(() => { if (aberto) carregar(); }, [aberto]); // eslint-disable-line

  const total = (arquivos || []).reduce((s, a) => s + Number(a.tamanho || 0), 0);
  const pct = Math.min(100, (total / LIMITE_BYTES) * 100);
  const cor = pct >= 85 ? C.vermelho : pct >= 70 ? C.ambar : C.verde;
  const umaHora = Date.now() - 3600 * 1000;
  /* sem uso = está numa das pastas do app, nenhum cadastro aponta para ele e subiu há mais de uma hora
     (a hora protege a foto de um cadastro que ainda está aberto na tela) */
  const orfaos = (arquivos || []).filter((a) => Object.keys(PASTAS).includes(String(a.nome).split("/")[0])
    && !(usados && usados.has(a.nome)) && new Date(a.criado).getTime() < umaHora);
  const peso = orfaos.reduce((s, a) => s + Number(a.tamanho || 0), 0);
  const porPasta = Object.keys(PASTAS).map((k) => {
    const l = (arquivos || []).filter((a) => String(a.nome).startsWith(k + "/"));
    return { k, n: l.length, b: l.reduce((s, a) => s + Number(a.tamanho || 0), 0) };
  });

  const limpar = async () => {
    if (!window.confirm(`Apagar ${orfaos.length} arquivo(s) sem uso e liberar ${tamanho(peso)}?\n\nNenhum produto, categoria ou foto da abertura usa esses arquivos. Isto não tem volta.`)) return;
    setLimpando(true);
    const n = await api.apagarCaminhos(orfaos.map((a) => a.nome));
    acoes.avisar(n ? `${n} arquivo(s) apagado(s)` : "Nada foi apagado. Confira a permissão de apagar no bucket.", n ? "ok" : "erro");
    await carregar();
    setLimpando(false);
  };

  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Espaço das fotos" sub="Plano grátis do Supabase: 1 GB">
      {arquivos === null ? <Carregando texto="Medindo…" /> : (
        <>
          <div style={{ ...S.card, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{tamanho(total)} de 1 GB</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: cor }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "#EEEAE2", overflow: "hidden", margin: "8px 0 12px" }}>
              <div style={{ height: "100%", borderRadius: 999, width: `${Math.max(1, pct)}%`, background: cor }} />
            </div>
            {porPasta.map((p) => (
              <div key={p.k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.suave, padding: "3px 0" }}>
                <span>{PASTAS[p.k]} · {p.n} arquivo{p.n === 1 ? "" : "s"}</span><b style={{ color: C.texto }}>{tamanho(p.b)}</b>
              </div>
            ))}
            {pct >= 70 && (
              <div style={{ background: pct >= 85 ? C.vermelhoFundo : C.ambarFundo, color: cor, borderRadius: 12, padding: "12px 14px", marginTop: 12, fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>
                {pct >= 85 ? "O espaço está acabando. Apague fotos que não usa mais, ou o envio de novas vai começar a falhar." : "O espaço já passou de 70%. Vale olhar o que dá para apagar (a lixeira, por exemplo)."}
              </div>
            )}
          </div>
          <div style={{ ...S.card, padding: 16, marginTop: 10 }}>
            {orfaos.length ? (
              <>
                <div style={{ fontSize: 13.5, color: C.suave, lineHeight: 1.55, marginBottom: 12 }}>
                  Encontrei <b style={{ color: C.texto }}>{orfaos.length} arquivo(s) sem uso</b>, somando {tamanho(peso)}: fotos que subiram e ficaram sem cadastro.
                </div>
                <Botao cheio contorno cor={C.vermelho} icone={ICONES.lixo} onClick={limpar} disabled={limpando}>{limpando ? "Apagando…" : `Limpar arquivos sem uso (${tamanho(peso)})`}</Botao>
              </>
            ) : <div style={{ fontSize: 13.5, color: C.suave }}>Nenhum arquivo sem uso. Está tudo limpo.</div>}
          </div>
          <div style={S.dica}>As fotos já encolhem sozinhas antes de subir. Foto de produto apagado de vez (na lixeira) sai do servidor junto.</div>
        </>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Lixeira — o excluir deixou de ser sem volta
   --------------------------------------------------------------------- */
function Lixeira({ aberto, fechar, acoes }) {
  const [l, setL] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const carregar = async () => { setL(null); try { setL(await api.listarLixeira()); } catch (e) { acoes.avisar(api.msgErro(e), "erro"); setL({ produtos: [], categorias: [] }); } };
  useEffect(() => { if (aberto) carregar(); }, [aberto]); // eslint-disable-line

  const restaurar = async (tabela, x) => {
    setOcupado(x.id);
    try { await api.restaurar(tabela, x.id); await acoes.restaurado(); await carregar(); acoes.avisar("Restaurado"); }
    catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setOcupado(null);
  };
  const apagar = async (tabela, x) => {
    const txt = tabela === "produtos" ? `Apagar "${x.nome}" DE VEZ?\n\nSomem o produto, o histórico de estoque e as fotos. Isto não tem volta.`
      : `Apagar a categoria "${x.nome}" DE VEZ? Isto não tem volta.`;
    if (!window.confirm(txt)) return;
    setOcupado(x.id);
    try {
      if (tabela === "produtos") await api.apagarProdutoDeVez(x); else await api.apagarCategoriaDeVez(x);
      setL((v) => ({ ...v, [tabela]: v[tabela].filter((y) => y.id !== x.id) }));
      acoes.avisar("Apagado de vez");
    } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setOcupado(null);
  };
  const item = (tabela, x) => (
    <div key={x.id} style={{ ...S.card, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {tabela === "produtos" && <Miniatura src={(x.fotos || [])[0]} tam={46} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{x.nome}</div>
          <div style={{ fontSize: 12.5, color: C.suave }}>excluído em {fmtData(x.excluida)}{x.codigo ? ` · ${x.codigo}` : ""}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Botao pequeno onClick={() => restaurar(tabela, x)} disabled={ocupado === x.id} style={{ flex: "1 1 auto" }}>{ocupado === x.id ? "Aguarde…" : "Restaurar"}</Botao>
        <Botao pequeno contorno cor={C.vermelho} onClick={() => apagar(tabela, x)} disabled={ocupado === x.id}>Apagar de vez</Botao>
      </div>
    </div>
  );
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Lixeira" sub="Produtos e categorias excluídos">
      {l === null ? <Carregando /> : !l.produtos.length && !l.categorias.length ? <Vazio texto="A lixeira está vazia." /> : (
        <>
          {l.produtos.length > 0 && <><div style={{ ...S.titSecao, marginTop: 4 }}>Produtos</div>{l.produtos.map((x) => item("produtos", x))}</>}
          {l.categorias.length > 0 && <><div style={S.titSecao}>Categorias</div>{l.categorias.map((x) => item("categorias", x))}</>}
        </>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------------
   Trocar a senha
   --------------------------------------------------------------------- */
function Senha({ aberto, fechar, acoes }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [indo, setIndo] = useState(false);
  useEffect(() => { if (aberto) { setA(""); setB(""); } }, [aberto]);
  const ok = async () => {
    if (a.length < 6) return acoes.avisar("A senha precisa de pelo menos 6 caracteres.", "erro");
    if (a !== b) return acoes.avisar("As duas senhas não são iguais.", "erro");
    setIndo(true);
    try { await api.trocarSenha(a); acoes.avisar("Senha trocada"); fechar(); } catch (e) { acoes.avisar(api.msgErro(e), "erro"); }
    setIndo(false);
  };
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo="Trocar minha senha" rodape={<Botao cheio {...OURO} onClick={ok} disabled={indo}>{indo ? "Salvando…" : "Trocar senha"}</Botao>}>
      <Campo n={1} rotulo="Senha nova"><input className="vt-campo" type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} placeholder="Pelo menos 6 caracteres" /></Campo>
      <Campo n={2} rotulo="Repita a senha nova"><input className="vt-campo" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} /></Campo>
    </Modal>
  );
}
