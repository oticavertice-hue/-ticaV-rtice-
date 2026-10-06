// Dados padrão do projeto: configuração da loja, categorias com suas especificações e o guia de formato de rosto.
// O modo demonstração (sem Supabase) também parte daqui.

export const MAX_FOTOS = 6; // por produto: a principal + até 5 extras

/* ------------------------------------------------------------------ */
/* Configuração da loja (tabela configuracoes, linha única)            */
/* ------------------------------------------------------------------ */

export const MSG_PRODUTO =
  "Olá, Vértice! Vi no site o modelo *{nome}*{ref} e gostaria de experimentar na loja. {link}";
export const MSG_SELECAO =
  "Olá, Vértice! Montei minha seleção no site e gostaria de experimentar na loja:\n\n{itens}\n\nPodemos agendar um horário?";
export const MSG_GERAL = "Olá, Vértice! Vim pelo site e gostaria de um atendimento.";

export const CONFIG_PADRAO = {
  loja_nome: "Vértice Design Óptico",
  slogan: "Design e Elegância",
  responsavel: "Técnica em Óptica · Embaixadora ZEISS",

  whatsapp: "5534998563693", // só números, com 55 e DDD
  whatsapp_exibir: "(34) 9 9856-3693",
  instagram: "verticedesign_optico",

  endereco_linha1: "Av. José Abdulmassih, 1095 · Loja 1",
  endereco_linha2: "Shopping Park · Uberlândia, MG",
  mapa_busca: "Av. José Abdulmassih, 1095, Shopping Park, Uberlândia, MG",

  // 0 = domingo ... 6 = sábado
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

  hero_titulo: "Armações que *revelam* o seu rosto.",
  hero_subtitulo:
    "Óculos de grau e de sol selecionados com olhar de design, lentes ZEISS e Transitions e uma consultoria técnica que começa na sua rotina.",

  aviso_topo: "",
  aviso_link: "",

  sobre_titulo: "Óptica é técnica.\nEstilo é *assinatura*.",
  sobre_texto:
    "A Vértice nasceu de mais de dez anos dentro do mercado óptico, com uma convicção simples: óculos não são só receita, são parte de quem você é.\n\nPor isso cada atendimento começa pela escuta. Entendemos sua rotina, lemos a sua receita com cuidado técnico e só então indicamos a lente e a armação que resolvem o seu caso e valorizam o seu rosto.\n\nSe é a sua primeira vez com multifocal, acompanhamos a adaptação de perto. Aqui você não compra apenas óculos de grau: recebe consultoria.",

  mostrar_precos: true,
  parcelas_max: 10,
  rodape_aviso: "Imagens ilustrativas. Valores e disponibilidade sujeitos a confirmação na loja.",

  fotos_abertura: [],
  foto_sobre: "",

  msg_produto: MSG_PRODUTO,
  msg_selecao: MSG_SELECAO,
  msg_geral: MSG_GERAL,
};

/* ------------------------------------------------------------------ */
/* Opções de especificação                                             */
/* ------------------------------------------------------------------ */

export const FORMATOS = ["Redondo", "Oval", "Panto", "Quadrado", "Retangular", "Gatinho", "Aviador", "Hexagonal", "Geométrico"];
export const MATERIAIS = ["Acetato", "Metal", "Titânio", "Aço inox", "TR90", "Nylon", "Madeira", "Misto (metal e acetato)"];
export const CORES_ARMACAO = [
  "Preto", "Marrom", "Tartaruga", "Dourado", "Prata", "Rosé", "Transparente", "Azul", "Verde",
  "Vermelho", "Vinho", "Bege", "Cinza", "Rosa", "Bicolor",
];
export const TIPOS_ARO = ["Fechado", "Meio aro (fio de nylon)", "Sem aro (parafusado)"];
export const CORES_LENTE = ["Fumê", "Marrom", "Verde", "Cinza", "Azul", "Degradê", "Espelhada", "Rosa", "Amarela"];
export const GENEROS = ["Feminino", "Masculino", "Unissex", "Infantil"];

const F = (chave, rotulo, tipo, opcoes, filtro = false) => ({ chave, rotulo, tipo, opcoes: opcoes || [], filtro });

/* Categorias de partida. Em produção entram pelo script SQL 01; a dona pode editar tudo no painel. */
export const CATEGORIAS_PADRAO = [
  {
    slug: "oculos-de-grau",
    nome: "Óculos de Grau",
    descricao: "Armações para o dia a dia, para trabalho e para ocasiões especiais, prontas para receber a sua lente.",
    usa_medidas: true,
    usa_genero: true,
    campos: [
      F("formato", "Formato", "opcoes", FORMATOS, true),
      F("material", "Material", "opcoes", MATERIAIS, true),
      F("cor", "Cor da armação", "opcoes", CORES_ARMACAO, true),
      F("tipo_aro", "Tipo de aro", "opcoes", TIPOS_ARO, true),
      F("multifocal", "Aceita lentes multifocais", "simnao", [], false),
    ],
  },
  {
    slug: "oculos-de-sol",
    nome: "Óculos de Sol",
    descricao: "Proteção UV com presença: armações de design e lentes que combinam com a sua luz.",
    usa_medidas: true,
    usa_genero: true,
    campos: [
      F("formato", "Formato", "opcoes", FORMATOS, true),
      F("material", "Material", "opcoes", MATERIAIS, true),
      F("cor", "Cor da armação", "opcoes", CORES_ARMACAO, true),
      F("cor_lente", "Cor da lente", "opcoes", CORES_LENTE, true),
      F("polarizado", "Lente polarizada", "simnao", [], true),
      F("uv400", "Proteção UV400", "simnao", [], false),
    ],
  },
  {
    slug: "clip-on",
    nome: "Clip-on",
    descricao: "Óculos de grau com clipe solar: duas armações em uma, sem abrir mão da sua receita.",
    usa_medidas: true,
    usa_genero: true,
    campos: [
      F("formato", "Formato", "opcoes", FORMATOS, true),
      F("material", "Material", "opcoes", MATERIAIS, true),
      F("cor", "Cor da armação", "opcoes", CORES_ARMACAO, true),
      F("cor_lente", "Cor do clipe", "opcoes", CORES_LENTE, true),
      F("polarizado", "Clipe polarizado", "simnao", [], true),
    ],
  },
  {
    slug: "infantil",
    nome: "Infantil",
    descricao: "Armações leves, flexíveis e resistentes, pensadas para quem não para quieto.",
    usa_medidas: true,
    usa_genero: false,
    campos: [
      F("formato", "Formato", "opcoes", FORMATOS, true),
      F("material", "Material", "opcoes", ["Silicone", "TR90", "Acetato", "Metal flexível"], true),
      F("cor", "Cor da armação", "opcoes", CORES_ARMACAO, true),
      F("faixa_etaria", "Faixa etária", "opcoes", ["0 a 3 anos", "4 a 7 anos", "8 a 12 anos"], true),
      F("finalidade", "Finalidade", "opcoes", ["Grau", "Sol"], true),
    ],
  },
  {
    slug: "lentes",
    nome: "Lentes",
    descricao: "Visão simples, multifocais, fotossensíveis e com filtro de luz azul, indicadas após a análise da sua receita.",
    usa_medidas: false,
    usa_genero: false,
    campos: [
      F("tipo_lente", "Tipo de lente", "opcoes", ["Visão simples", "Multifocal", "Fotossensível", "Filtro de luz azul", "Solar graduada"], true),
      F("indice", "Índice de refração", "opcoes", ["1.50", "1.56", "1.61", "1.67", "1.74"], true),
      F("tratamento", "Tratamentos", "texto", [], false),
    ],
  },
  {
    slug: "acessorios",
    nome: "Acessórios",
    descricao: "Estojos, flanelas, correntes e tudo para cuidar bem dos seus óculos.",
    usa_medidas: false,
    usa_genero: false,
    campos: [
      F("tipo", "Tipo", "opcoes", ["Estojo", "Flanela", "Corrente", "Cordão", "Spray limpa-lentes", "Kit de limpeza"], true),
      F("material", "Material", "texto", [], false),
      F("cor", "Cor", "texto", [], false),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Formato de rosto → formatos de armação                              */
/* ------------------------------------------------------------------ */

export const ROSTOS = [
  {
    id: "oval",
    nome: "Oval",
    dica: "Proporções equilibradas: quase tudo combina. É o rosto que mais permite arriscar.",
    formatos: ["quadrado", "retangular", "aviador", "gatinho", "geometrico", "hexagonal", "oval", "panto", "redondo"],
  },
  {
    id: "redondo",
    nome: "Redondo",
    dica: "Linhas retas dão estrutura e alongam o rosto.",
    formatos: ["retangular", "quadrado", "geometrico", "hexagonal", "gatinho"],
  },
  {
    id: "quadrado",
    nome: "Quadrado",
    dica: "Curvas suavizam o maxilar marcado e equilibram os ângulos.",
    formatos: ["redondo", "oval", "panto", "aviador"],
  },
  {
    id: "coracao",
    nome: "Coração",
    dica: "Testa mais larga que o queixo: armações leves, mais largas na base, equilibram o conjunto.",
    formatos: ["aviador", "oval", "redondo", "panto"],
  },
  {
    id: "diamante",
    nome: "Diamante",
    dica: "Maçãs do rosto em destaque pedem curvas e linha superior marcada.",
    formatos: ["gatinho", "oval", "panto", "redondo"],
  },
  {
    id: "alongado",
    nome: "Alongado",
    dica: "Armações mais altas e largas encurtam visualmente o rosto.",
    formatos: ["quadrado", "aviador", "redondo", "geometrico"],
  },
];

/* ------------------------------------------------------------------ */
/* Lentes: conteúdo educativo da seção "Entenda suas lentes"           */
/* ------------------------------------------------------------------ */

export const LENTES_GUIA = [
  {
    id: "simples",
    nome: "Visão simples",
    resumo: "Um único campo de visão, para longe ou para perto.",
    texto:
      "Corrige miopia, hipermetropia e astigmatismo com um único grau em toda a lente. É a lente de quem enxerga bem com um par de óculos para cada distância, ou precisa de correção em apenas uma delas.",
  },
  {
    id: "multifocal",
    nome: "Multifocal",
    resumo: "Longe, intermediário e perto na mesma lente, sem linha de divisão.",
    texto:
      "Indicada a partir dos 40 anos, quando surge a vista cansada (presbiopia). A transição entre os campos de visão é suave e invisível. A adaptação costuma levar alguns dias, e por isso acompanhamos o seu primeiro uso de perto.",
  },
  {
    id: "fotossensivel",
    nome: "Fotossensível",
    resumo: "Clareia em ambientes internos e escurece ao ar livre.",
    texto:
      "As lentes fotossensíveis, como as Transitions, reagem à luz ultravioleta: ficam transparentes em ambientes fechados e escurecem sob o sol, protegendo seus olhos sem precisar trocar de óculos. Existem em diversas cores.",
  },
  {
    id: "luzazul",
    nome: "Filtro de luz azul",
    resumo: "Conforto para quem passa horas em telas.",
    texto:
      "Tratamento que reduz parte da luz azul-violeta emitida por celulares, computadores e TVs, ajudando a diminuir o desconforto visual em longas jornadas diante de telas.",
  },
  {
    id: "antirreflexo",
    nome: "Antirreflexo e proteção UV",
    resumo: "Menos reflexos, mais nitidez e proteção.",
    texto:
      "O tratamento antirreflexo elimina reflexos incômodos, melhora a nitidez, principalmente à noite e em frente a telas, e deixa a lente mais discreta. A proteção UV protege os olhos da radiação solar no dia a dia.",
  },
];

/* ------------------------------------------------------------------ */
/* Modo demonstração: produtos de exemplo (nenhuma foto, só ilustração) */
/* ------------------------------------------------------------------ */

const P = (id, cat, nome, extra) => ({
  id: `demo-${id}`,
  categoria_id: `demo-cat-${cat}`,
  nome,
  codigo: "",
  marca: "Vértice",
  genero: "Unissex",
  descricao: "",
  preco: null,
  preco_antigo: null,
  preco_a_partir: false,
  fotos: [],
  specs: {},
  medidas: { lente: "", ponte: "", haste: "" },
  destaque: false,
  novo: false,
  indisponivel: false,
  ativo: true,
  criado: new Date(Date.now() - id * 86400000).toISOString(),
  excluida: null,
  ...extra,
});

const M = (lente, ponte, haste) => ({ lente: String(lente), ponte: String(ponte), haste: String(haste) });

export const DEMO_PRODUTOS = [
  P(1, "oculos-de-grau", "Lumière", {
    codigo: "VD-0101", genero: "Feminino", preco: 349.9, destaque: true, novo: true,
    descricao: "Gatinho em acetato tartaruga, com ponteiras levemente curvas. Uma armação que emoldura o olhar sem pedir desculpas.",
    specs: { formato: "Gatinho", material: "Acetato", cor: "Tartaruga", tipo_aro: "Fechado", multifocal: true },
    medidas: M(52, 17, 140),
  }),
  P(2, "oculos-de-grau", "Atelier", {
    codigo: "VD-0102", genero: "Unissex", preco: 429.9, destaque: true,
    descricao: "Redondo clássico em metal dourado, leve e fino. Combina com tudo e com todos.",
    specs: { formato: "Redondo", material: "Metal", cor: "Dourado", tipo_aro: "Fechado", multifocal: true },
    medidas: M(49, 21, 145),
  }),
  P(3, "oculos-de-grau", "Boulevard", {
    codigo: "VD-0103", genero: "Masculino", preco: 389.9,
    descricao: "Quadrado marcante em acetato preto, com presença e conforto para o uso diário.",
    specs: { formato: "Quadrado", material: "Acetato", cor: "Preto", tipo_aro: "Fechado", multifocal: true },
    medidas: M(54, 18, 145),
  }),
  P(4, "oculos-de-grau", "Opale", {
    codigo: "VD-0104", genero: "Feminino", preco: 319.9, novo: true,
    descricao: "Oval translúcida em acetato, delicada e luminosa.",
    specs: { formato: "Oval", material: "Acetato", cor: "Transparente", tipo_aro: "Fechado", multifocal: true },
    medidas: M(51, 18, 140),
  }),
  P(5, "oculos-de-grau", "Marais", {
    codigo: "VD-0105", genero: "Unissex", preco: 459.9,
    descricao: "Geométrico em metal azul-petróleo, para quem quer uma assinatura visual.",
    specs: { formato: "Geométrico", material: "Metal", cor: "Azul", tipo_aro: "Meio aro (fio de nylon)", multifocal: true },
    medidas: M(53, 19, 145),
  }),
  P(6, "oculos-de-sol", "Riviera", {
    codigo: "VD-0201", genero: "Unissex", preco: 499.9, destaque: true, novo: true,
    descricao: "Aviador dourado com lentes verdes, proteção UV400. O clássico que nunca sai de moda.",
    specs: { formato: "Aviador", material: "Metal", cor: "Dourado", cor_lente: "Verde", polarizado: true, uv400: true },
    medidas: M(58, 14, 140),
  }),
  P(7, "oculos-de-sol", "Nocturne", {
    codigo: "VD-0202", genero: "Masculino", preco: 479.9,
    descricao: "Retangular preto de acetato com lentes fumê. Sobriedade e presença.",
    specs: { formato: "Retangular", material: "Acetato", cor: "Preto", cor_lente: "Fumê", polarizado: true, uv400: true },
    medidas: M(55, 18, 145),
  }),
  P(8, "oculos-de-sol", "Étoile", {
    codigo: "VD-0203", genero: "Feminino", preco: 459.9, destaque: true,
    descricao: "Gatinho preto com lentes degradê, glamour em cada detalhe.",
    specs: { formato: "Gatinho", material: "Acetato", cor: "Preto", cor_lente: "Degradê", polarizado: false, uv400: true },
    medidas: M(54, 17, 140),
  }),
  P(9, "oculos-de-sol", "Mirage", {
    codigo: "VD-0204", genero: "Unissex", preco: 529.9,
    descricao: "Hexagonal prata com lentes espelhadas, para um olhar de passarela.",
    specs: { formato: "Hexagonal", material: "Aço inox", cor: "Prata", cor_lente: "Espelhada", polarizado: true, uv400: true },
    medidas: M(52, 20, 145),
  }),
  P(10, "oculos-de-sol", "Fleur", {
    codigo: "VD-0205", genero: "Feminino", preco: 419.9, novo: true,
    descricao: "Panto em rosé com lentes marrons, suave e sofisticado.",
    specs: { formato: "Panto", material: "Metal", cor: "Rosé", cor_lente: "Marrom", polarizado: false, uv400: true },
    medidas: M(50, 20, 140),
  }),
  P(11, "clip-on", "Duo Atelier", {
    codigo: "VD-0301", genero: "Unissex", preco: 549.9, preco_a_partir: true,
    descricao: "Armação de grau com clipe solar magnético. Duas armações em uma.",
    specs: { formato: "Retangular", material: "Acetato", cor: "Tartaruga", cor_lente: "Fumê", polarizado: true },
    medidas: M(53, 18, 140),
  }),
  P(12, "infantil", "Brincar", {
    codigo: "VD-0401", genero: "Infantil", preco: 249.9, preco_a_partir: true,
    descricao: "Redondo em silicone flexível, leve e resistente, para as aventuras de quem está crescendo.",
    specs: { formato: "Redondo", material: "Silicone", cor: "Azul", faixa_etaria: "4 a 7 anos", finalidade: "Grau" },
    medidas: M(44, 16, 125),
  }),
  P(13, "lentes", "Lente Multifocal", {
    codigo: "", marca: "ZEISS", genero: "", preco: null, destaque: true,
    descricao: "Longe, intermediário e perto na mesma lente. Indicada após análise da receita, com acompanhamento na adaptação.",
    specs: { tipo_lente: "Multifocal", indice: "1.61", tratamento: "Antirreflexo, filtro de luz azul e proteção UV" },
  }),
  P(14, "acessorios", "Estojo Vértice", {
    codigo: "VD-0501", marca: "Vértice", genero: "", preco: 49.9,
    descricao: "Estojo de microfibra com a assinatura da casa. Protege a lente e acompanha bem a bolsa.",
    specs: { tipo: "Estojo", material: "Microfibra", cor: "Cinza" },
  }),
];

export const DEMO_BANNERS = [
  {
    id: "demo-ban-1",
    titulo: "Meu primeiro multifocal",
    subtitulo: "50% off nas lentes ZEISS. Consulte regulamento na loja.",
    botao: "Quero saber mais",
    destino_tipo: "whatsapp",
    destino_valor: "",
    foto: "",
    inicio: null,
    fim: null,
    ordem: 0,
    ativo: true,
    excluida: null,
  },
];
