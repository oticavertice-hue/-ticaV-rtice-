/* =====================================================================
   VÉRTICE DESIGN ÓPTICO — o que o app e o catálogo usam juntos
   Textos padrão, formulário padrão, horários, dinheiro e WhatsApp.
   O que a dona muda em Ajustes fica no banco e passa por cima destes.
   ===================================================================== */

export const CREDITO_NOME = "Miguel Borges";
export const CREDITO_FONE = "(34) 9 9188-1557";

/* ---------------- O formulário do catálogo ----------------
   tipo: "texto" | "numero" | "textolongo" | "opcoes" | "pagamento"
   mostrar_se: só aparece quando outra pergunta tem aquela resposta
   rotulo: o nome curto que vai na mensagem do WhatsApp              */
export const FORMULARIO_PADRAO = [
  { id: "nome", titulo: "Seu nome", rotulo: "Nome", tipo: "texto", exemplo: "Ex.: Maria Fernanda", obrigatoria: true, fixa: true },
  {
    id: "receita", titulo: "Você já fez o exame de vista e tem a receita?", rotulo: "Receita", tipo: "opcoes", obrigatoria: true,
    opcoes: ["Sim, já tenho a receita", "Não, gostaria de indicação de um oftalmologista", "Não, quero agendar o exame de vista"],
    nota: "Se já tiver a receita, você manda a foto dela na conversa do WhatsApp, logo depois de enviar.",
  },
  {
    id: "usa_oculos", titulo: "Você já usa óculos ou será o primeiro?", rotulo: "Já usa óculos", tipo: "opcoes", obrigatoria: true,
    opcoes: ["Já uso óculos", "Será o meu primeiro óculos"],
    mostrar_se: { pergunta: "receita", resposta: "Sim, já tenho a receita" },
  },
  {
    id: "quantos", titulo: "Quantos óculos de grau você pretende fazer?", rotulo: "Óculos de grau", tipo: "opcoes", obrigatoria: true,
    opcoes: ["1", "2", "3 ou mais", "Nenhum, quero só óculos de sol"],
  },
  {
    id: "para_quem", titulo: "Os óculos são para quem?", rotulo: "Para quem", tipo: "opcoes", obrigatoria: false,
    opcoes: ["Para mim", "Para meu filho ou filha", "Para outra pessoa"],
  },
  {
    id: "idade", titulo: "Idade de quem vai usar", rotulo: "Idade", tipo: "numero", exemplo: "Ex.: 42", obrigatoria: true,
    nota: "Ajuda a indicar a lente certa: a partir dos 40 anos é comum precisar de multifocal (perto, intermediário e longe).",
  },
  {
    id: "atendimento", titulo: "Como você prefere seguir?", rotulo: "Atendimento", tipo: "opcoes", obrigatoria: true,
    opcoes: ["Quero ir à loja experimentar", "Quero receber o orçamento pelo WhatsApp primeiro"],
  },
  {
    id: "pagamento", titulo: "Forma de pagamento que prefere", rotulo: "Pagamento", tipo: "pagamento", obrigatoria: false, fixa: true,
    opcoes: ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"],
  },
  {
    id: "obs", titulo: "Quer contar mais alguma coisa?", rotulo: "Observação", tipo: "textolongo", obrigatoria: false,
    exemplo: "Ex.: uso lente de contato, tenho astigmatismo, quero lente antirreflexo, prefiro ir no sábado…",
  },
];

export const TIPOS_PERGUNTA = [
  { v: "opcoes", l: "Escolher uma opção" },
  { v: "texto", l: "Resposta curta" },
  { v: "numero", l: "Número" },
  { v: "textolongo", l: "Resposta longa" },
];

/* ---------------- Mensagens do WhatsApp ---------------- */
export const MENSAGENS = {
  msg_pedido: {
    titulo: "Pedido do catálogo",
    quando: "É a mensagem que o cliente manda pelo WhatsApp quando termina o formulário.",
    campos: ["{nome}", "{itens}", "{respostas}", "{pix}"],
    texto:
      "Olá! Vim pelo catálogo da Vértice ✨\n\n{itens}\n\n*Sobre mim*\n{respostas}{pix}",
  },
  msg_duvida: {
    titulo: "Dúvida sobre um produto",
    quando: "É a mensagem do botão \"Tirar dúvida\", na ficha de cada produto.",
    campos: ["{produto}", "{codigo}", "{link}"],
    texto: "Olá! Vi no catálogo da Vértice e quero saber mais sobre: *{produto}* {codigo}\n{link}",
  },
  msg_geral: {
    titulo: "Botão do WhatsApp",
    quando: "É a mensagem dos botões de WhatsApp soltos no catálogo (localização e rodapé).",
    campos: [],
    texto: "Olá! Vim pelo catálogo da Vértice e gostaria de atendimento.",
  },
};

export const QUADROS_PADRAO = [
  { t: "Consultoria técnica", d: "Atendimento feito por técnica em óptica, com mais de 10 anos de experiência." },
  { t: "Embaixadora ZEISS", d: "Lentes de alta precisão, indicadas para a sua receita e a sua rotina." },
  { t: "Exame de vista", d: "Ainda não tem receita? Indicamos o oftalmologista ou agendamos para você." },
  { t: "Ajuste e acompanhamento", d: "Medidas, ajuste da armação e adaptação acompanhada depois da entrega." },
];

/* ---------------- Dados da loja ---------------- */
export const CONFIG_PADRAO = {
  nome: "Vértice Design Óptico",
  whatsapp: "34998563693",
  instagram: "verticedesign_optico",
  endereco: "Av. José Abdulmassih, 1095 · Loja 1",
  bairro: "Shopping Park · Uberlândia – MG",
  mapa_busca: "Av. José Abdulmassih, 1095, Shopping Park, Uberlândia - MG",
  horarios: {
    0: { aberto: false, abre: "", fecha: "" },
    1: { aberto: true, abre: "09:30", fecha: "18:30" },
    2: { aberto: true, abre: "09:30", fecha: "18:30" },
    3: { aberto: true, abre: "09:30", fecha: "18:30" },
    4: { aberto: true, abre: "09:30", fecha: "18:30" },
    5: { aberto: true, abre: "09:30", fecha: "18:30" },
    6: { aberto: true, abre: "10:00", fecha: "15:30" },
  },
  horario_obs: "",
  pix_tipo: "",
  pix_chave: "",
  pix_nome: "",
  pix_banco: "",
  frase: "Design e elegância para o seu olhar",
  boas_vindas:
    "Escolha as armações que mais combinam com você, conte um pouco sobre a sua receita e finalize pelo WhatsApp. A gente cuida do resto: lentes, medidas e ajuste.",
  quadros: QUADROS_PADRAO,
  fotos_abertura: [],
  mostrar_precos: true,
  parcelas: 10,
  esconder_esgotados: true,
  estoque_baixo: 2,
  formulario: FORMULARIO_PADRAO,
  msg_pedido: MENSAGENS.msg_pedido.texto,
  msg_duvida: MENSAGENS.msg_duvida.texto,
  msg_geral: MENSAGENS.msg_geral.texto,
};

/* junta o que está no banco com os padrões (campo vazio no banco = usa o padrão) */
export function mesclarConfig(dados) {
  const d = dados && typeof dados === "object" ? dados : {};
  const c = { ...CONFIG_PADRAO };
  Object.keys(d).forEach((k) => {
    if (d[k] !== undefined && d[k] !== null) c[k] = d[k];
  });
  const h = {};
  for (let i = 0; i < 7; i++) {
    const v = (d.horarios && (d.horarios[i] || d.horarios[String(i)])) || CONFIG_PADRAO.horarios[i];
    h[i] = { aberto: !!v.aberto, abre: v.abre || "", fecha: v.fecha || "" };
  }
  c.horarios = h;
  if (!Array.isArray(c.formulario) || !c.formulario.length) c.formulario = FORMULARIO_PADRAO;
  if (!Array.isArray(c.quadros) || !c.quadros.length) c.quadros = QUADROS_PADRAO;
  if (!Array.isArray(c.fotos_abertura)) c.fotos_abertura = [];
  return c;
}

/* ---------------- Texto, dinheiro, telefone ---------------- */
export const normalizar = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export const slugify = (s) => normalizar(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "categoria";

export const dinheiro = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const soDigitos = (s) => String(s || "").replace(/\D/g, "");
export const foneCompleto = (s) => {
  const d = soDigitos(s);
  return d.length === 10 || d.length === 11 ? "55" + d : d;
};
export const foneFmt = (s) => {
  let d = soDigitos(s);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s || "";
};

/* No computador o WhatsApp instalado embaralha emoji: lá vai pelo WhatsApp Web. */
export const ehComputador = () =>
  !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.innerWidth >= 860;

export const linkWhats = (fone, msg) => {
  const n = foneCompleto(fone);
  if (!msg) return `https://wa.me/${n}`;
  const t = encodeURIComponent(msg);
  return ehComputador() ? `https://web.whatsapp.com/send?phone=${n}&text=${t}` : `https://wa.me/${n}?text=${t}`;
};

export const linkMapa = (busca) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
export const linkRota = (busca) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(busca)}`;
export const linkWaze = (busca) => `https://waze.com/ul?q=${encodeURIComponent(busca)}&navigate=yes`;
export const linkInstagram = (u) => `https://instagram.com/${String(u || "").replace(/^@/, "")}`;

export const aplicar = (texto, dados) =>
  String(texto || "").replace(/\{(\w+)\}/g, (m, k) => (dados[k] !== undefined ? dados[k] : m));

/* ---------------- Horário de funcionamento (Brasília) ---------------- */
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function agoraBrasilia() {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
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

export function statusAgora(horarios) {
  const { dia, min } = agoraBrasilia();
  const hoje = horarios[dia];
  if (hoje && hoje.aberto && min >= paraMin(hoje.abre) && min < paraMin(hoje.fecha)) {
    return { aberto: true, dia, texto: `Aberto agora · fecha às ${hoje.fecha}` };
  }
  if (hoje && hoje.aberto && min < paraMin(hoje.abre)) return { aberto: false, dia, texto: `Fechado · abre hoje às ${hoje.abre}` };
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    const h = horarios[d];
    if (h && h.aberto) {
      return { aberto: false, dia, texto: i === 1 ? `Fechado · abre amanhã às ${h.abre}` : `Fechado · abre ${DIAS[d].toLowerCase()} às ${h.abre}` };
    }
  }
  return { aberto: false, dia, texto: "Fechado" };
}

/* junta os dias seguidos com o mesmo horário: "Segunda a sexta · 09:30 – 18:30" */
export function horariosAgrupados(horarios) {
  const chave = (d) => (horarios[d] && horarios[d].aberto ? `${horarios[d].abre}-${horarios[d].fecha}` : "fechado");
  const grupos = [];
  ORDEM_SEMANA.forEach((d) => {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.chave === chave(d)) ult.dias.push(d);
    else grupos.push({ chave: chave(d), dias: [d] });
  });
  return grupos.map((g) => {
    const a = DIAS[g.dias[0]];
    const b = DIAS[g.dias[g.dias.length - 1]];
    const rotulo = g.dias.length === 1 ? a : g.dias.length === 2 ? `${a} e ${b.toLowerCase()}` : `${a} a ${b.toLowerCase()}`;
    const h = horarios[g.dias[0]];
    return { rotulo, dias: g.dias, texto: h && h.aberto ? `${h.abre} – ${h.fecha}` : "Fechado" };
  });
}

/* ---------------- Formulário: quais perguntas aparecem ---------------- */
export function perguntaVisivel(p, respostas) {
  if (!p.mostrar_se || !p.mostrar_se.pergunta) return true;
  return respostas[p.mostrar_se.pergunta] === p.mostrar_se.resposta;
}

export const ehPix = (opcao) => normalizar(opcao).includes("pix");

export function textoPix(c) {
  if (!c.pix_chave) return "";
  const l = [`*Chave Pix (${c.pix_tipo || "chave"}):* ${c.pix_chave}`];
  if (c.pix_nome) l.push(`Em nome de: ${c.pix_nome}${c.pix_banco ? ` · ${c.pix_banco}` : ""}`);
  return l.join("\n");
}

/* monta a mensagem do pedido que vai para o WhatsApp */
export function mensagemPedido(c, itens, respostas, mostrarPrecos) {
  const perguntas = c.formulario.filter((p) => perguntaVisivel(p, respostas));
  let txtItens;
  if (!itens.length) {
    txtItens = "*Ainda não escolhi armação.* Quero atendimento e orçamento.";
  } else {
    const linhas = itens.map((i, k) => {
      const extra = [i.marca, i.codigo ? `cód. ${i.codigo}` : ""].filter(Boolean).join(" · ");
      const preco = mostrarPrecos && Number(i.preco) > 0 ? ` — ${dinheiro(i.preco)}` : "";
      return `${k + 1}. ${i.nome}${extra ? ` (${extra})` : ""}${preco}`;
    });
    const total = itens.reduce((s, i) => s + (Number(i.preco) || 0), 0);
    txtItens = `*Gostei destes modelos:*\n${linhas.join("\n")}`;
    if (mostrarPrecos && total > 0) txtItens += `\n*Total dos modelos:* ${dinheiro(total)} (lentes à parte, conforme a receita)`;
  }
  const txtResp = perguntas
    .filter((p) => String(respostas[p.id] || "").trim())
    .map((p) => `• ${p.rotulo || p.titulo}: ${String(respostas[p.id]).trim()}`)
    .join("\n");
  const pagou = perguntas.find((p) => p.tipo === "pagamento");
  const pix = pagou && ehPix(respostas[pagou.id]) && c.pix_chave ? `\n\n${textoPix(c)}\nAssim que pagar, envio o comprovante por aqui.` : "";
  return aplicar(c.msg_pedido || MENSAGENS.msg_pedido.texto, {
    nome: String(respostas.nome || "").trim(),
    itens: txtItens,
    respostas: txtResp,
    pix,
  }).replace(/\n{3,}/g, "\n\n").trim();
}
