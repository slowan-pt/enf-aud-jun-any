/**
 * CONTEÚDOS / MATÉRIAS — fixtures da ETAPA 1.
 *
 * ETAPA 2: tabelas `posts`, `categories` e `authors` no D1, administradas em
 * /admin/conteudos, /admin/categorias e /admin/autores.
 *
 * Os blocos de conteúdo abaixo reproduzem exatamente o formato de saída
 * previsto para o editor do CMS (blocos tipados, sem HTML arbitrário),
 * de modo que a troca da fonte de dados não altere a renderização.
 *
 * Conteúdo educativo de demonstração. Não contém dados, números, cases,
 * clientes ou resultados da Essencial Saúde.
 */

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

export interface Author {
  id: number;
  name: string;
  role: string;
  bio: string;
  photo: string | null;
  initials: string;
  status: 'active' | 'inactive';
}

export type BlockNode =
  | { type: 'paragraph'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'divider' };

export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  authorId: number;
  status: 'published' | 'draft' | 'archived';
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  cover: string;
  coverAlt: string;
  featured: boolean;
  demo: boolean;
  body: BlockNode[];
  seo: { title: string; description: string };
}

export const categories: Category[] = [
  {
    id: 1,
    name: 'Auditoria Concorrente',
    slug: 'auditoria-concorrente',
    description: 'Acompanhamento técnico durante a internação hospitalar.',
    postCount: 2,
  },
  {
    id: 2,
    name: 'Gestão Hospitalar',
    slug: 'gestao-hospitalar',
    description: 'Processos, qualidade e eficiência na operação hospitalar.',
    postCount: 1,
  },
  {
    id: 3,
    name: 'Auditoria em Saúde',
    slug: 'auditoria-em-saude',
    description: 'Fundamentos e práticas de auditoria no setor de saúde.',
    postCount: 1,
  },
  {
    id: 4,
    name: 'Segurança do Paciente',
    slug: 'seguranca-do-paciente',
    description: 'Práticas, barreiras e cultura de segurança assistencial.',
    postCount: 1,
  },
  {
    id: 5,
    name: 'Saúde Suplementar',
    slug: 'saude-suplementar',
    description: 'Relação entre operadoras, prestadores e beneficiários.',
    postCount: 1,
  },
  {
    id: 6,
    name: 'Gestão Assistencial',
    slug: 'gestao-assistencial',
    description: 'Coordenação do cuidado e jornada assistencial.',
    postCount: 0,
  },
  {
    id: 7,
    name: 'Contas Hospitalares',
    slug: 'contas-hospitalares',
    description: 'Análise técnica de contas e faturamento hospitalar.',
    postCount: 0,
  },
];

export const authors: Author[] = [
  {
    id: 1,
    name: 'Equipe Essencial Saúde',
    role: 'Corpo técnico',
    bio: 'Conteúdos produzidos pela equipe técnica da Essencial Saúde Auditoria, com base em prática de auditoria em saúde e gestão hospitalar.',
    photo: null,
    initials: 'ES',
    status: 'active',
  },
];

export const posts: Post[] = [
  {
    id: 1,
    slug: 'auditoria-concorrente-o-que-e-e-por-que-ela-muda-o-desfecho',
    title: 'Auditoria concorrente: o que é e por que ela muda o desfecho',
    excerpt:
      'A diferença entre avaliar o cuidado durante a internação e conferi-lo depois não é apenas de prazo — é de capacidade de agir sobre o que ainda pode ser corrigido.',
    categorySlug: 'auditoria-concorrente',
    authorId: 1,
    status: 'published',
    publishedAt: '2026-08-11',
    updatedAt: '2026-08-11',
    readingMinutes: 6,
    cover: '/images/post-auditoria-concorrente.svg',
    coverAlt: 'Ilustração abstrata sobre acompanhamento assistencial contínuo',
    featured: true,
    demo: true,
    body: [
      {
        type: 'paragraph',
        text: 'A auditoria retrospectiva analisa o que já aconteceu. Ela é necessária, mas chega quando o cuidado terminou, a conta foi fechada e o desfecho clínico já está consolidado. O que resta, nesse ponto, é discutir valores. A auditoria concorrente inverte essa lógica: ela acontece enquanto o paciente está internado.',
      },
      { type: 'h2', text: 'A janela de oportunidade técnica' },
      {
        type: 'paragraph',
        text: 'Durante a internação existe uma janela em que a informação técnica ainda produz efeito. Um plano terapêutico pode ser revisto, uma permanência sem justificativa pode ser reavaliada, uma transição de cuidado pode ser preparada com antecedência, um risco assistencial pode ser sinalizado antes de virar evento adverso.',
      },
      {
        type: 'paragraph',
        text: 'Fora dessa janela, a mesma informação vira apenas argumento de glosa — e glosa não devolve segurança ao paciente.',
      },
      { type: 'h2', text: 'O que a avaliação concorrente observa' },
      {
        type: 'list',
        items: [
          'Pertinência da internação e adequação do nível de atenção',
          'Coerência entre quadro clínico, conduta prescrita e evolução registrada',
          'Tempo de permanência e os fatores que o prolongam',
          'Condições clínicas e logísticas para a alta segura',
          'Riscos evitáveis associados à permanência hospitalar',
        ],
      },
      { type: 'h2', text: 'Interlocução, não fiscalização' },
      {
        type: 'paragraph',
        text: 'O contato com o médico assistente e com a equipe multiprofissional é conduzido como diálogo técnico entre pares. A autonomia clínica permanece com quem assiste o paciente. O papel da auditoria concorrente é apresentar evidência, questionar tecnicamente quando cabível e registrar o alinhamento alcançado.',
      },
      {
        type: 'quote',
        text: 'Permanência hospitalar prolongada sem indicação técnica não é apenas custo: é exposição do paciente a riscos evitáveis.',
      },
      { type: 'h2', text: 'Segurança e sustentabilidade na mesma direção' },
      {
        type: 'paragraph',
        text: 'A desospitalização segura e no tempo certo costuma ser tratada como pauta financeira. Ela é, antes disso, um desfecho de qualidade assistencial: menos exposição a infecção relacionada à assistência, menos imobilidade, menos perda de funcionalidade. Quando o critério de decisão é o paciente, o resultado financeiro tende a acompanhar.',
      },
    ],
    seo: {
      title: 'Auditoria concorrente: o que é e por que ela muda o desfecho',
      description:
        'Entenda o que é auditoria concorrente hospitalar, o que é avaliado durante a internação e por que a atuação tempestiva impacta segurança do paciente e sustentabilidade.',
    },
  },
  {
    id: 2,
    slug: 'glosa-tecnica-e-glosa-administrativa-qual-a-diferenca',
    title: 'Glosa técnica e glosa administrativa: qual é a diferença',
    excerpt:
      'Confundir os dois tipos de glosa é uma das principais causas de retrabalho e desgaste entre fontes pagadoras e prestadores.',
    categorySlug: 'auditoria-em-saude',
    authorId: 1,
    status: 'published',
    publishedAt: '2026-08-06',
    updatedAt: '2026-08-06',
    readingMinutes: 5,
    cover: '/images/post-contas-hospitalares.svg',
    coverAlt: 'Ilustração abstrata sobre análise documental de contas hospitalares',
    featured: false,
    demo: true,
    body: [
      {
        type: 'paragraph',
        text: 'Toda conta hospitalar glosada gera custo para as duas partes: para quem glosa, porque precisa fundamentar; para quem recebe a glosa, porque precisa recorrer. Reduzir esse custo começa por distinguir com clareza a natureza do apontamento.',
      },
      { type: 'h2', text: 'Glosa administrativa' },
      {
        type: 'paragraph',
        text: 'Decorre de falhas formais e contratuais: item fora de cobertura, ausência de autorização prévia, divergência de tabela, erro de digitação, documentação incompleta. É objetiva e, na maior parte dos casos, verificável sem discussão clínica.',
      },
      { type: 'h2', text: 'Glosa técnica' },
      {
        type: 'paragraph',
        text: 'Decorre da avaliação clínica: item sem respaldo na evolução do paciente, quantidade incompatível com o quadro, procedimento sem justificativa técnica documentada, período de permanência sem sustentação em prontuário. Exige leitura do registro assistencial.',
      },
      { type: 'h2', text: 'Por que a distinção importa' },
      {
        type: 'list',
        items: [
          'Cada tipo exige um fluxo diferente de análise e de recurso',
          'Glosa técnica sem fundamentação em prontuário tende a ser revertida',
          'Glosa administrativa recorrente aponta falha de processo, não de conduta clínica',
          'Misturar as duas transforma discussão técnica em negociação comercial',
        ],
      },
      {
        type: 'quote',
        text: 'Apontamento bem fundamentado reduz recurso. Apontamento genérico apenas transfere o conflito para a etapa seguinte.',
      },
      { type: 'h2', text: 'O caminho preventivo' },
      {
        type: 'paragraph',
        text: 'A maior parte das glosas técnicas poderia ser evitada com registro assistencial adequado e com alinhamento durante a internação. É por isso que auditoria concorrente e auditoria de contas funcionam melhor quando conversam entre si: a primeira previne o que a segunda teria de apontar depois.',
      },
    ],
    seo: {
      title: 'Glosa técnica e glosa administrativa: qual é a diferença',
      description:
        'Diferenças entre glosa técnica e administrativa em contas hospitalares, impactos no relacionamento com prestadores e como reduzir recursos e retrabalho.',
    },
  },
  {
    id: 3,
    slug: 'desospitalizacao-segura-como-preparar-a-alta-desde-a-admissao',
    title: 'Desospitalização segura: como preparar a alta desde a admissão',
    excerpt:
      'Alta hospitalar não é um evento do último dia. Quando é planejada desde a admissão, reduz reinternação e aumenta a segurança da transição.',
    categorySlug: 'gestao-assistencial',
    authorId: 1,
    status: 'published',
    publishedAt: '2026-07-30',
    updatedAt: '2026-07-30',
    readingMinutes: 5,
    cover: '/images/post-jornada-paciente.svg',
    coverAlt: 'Ilustração abstrata sobre transição de cuidado e continuidade assistencial',
    featured: false,
    demo: true,
    body: [
      {
        type: 'paragraph',
        text: 'Quando a alta é discutida apenas quando o paciente já tem condições clínicas de sair, o processo trava: falta suporte domiciliar, falta transporte, falta medicação, falta a orientação que deveria ter sido dada dias antes. O resultado é permanência adicional sem indicação clínica.',
      },
      { type: 'h2', text: 'Planejar desde o primeiro dia' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Identificar, na admissão, os fatores que podem dificultar a alta',
          'Definir o destino provável: domicílio, atenção domiciliar, unidade de cuidados prolongados',
          'Envolver família e cuidadores desde o início do processo',
          'Antecipar necessidades de material, medicação e suporte',
          'Verificar as condições de continuidade do cuidado após a saída',
        ],
      },
      { type: 'h2', text: 'Transição de cuidado é transferência de informação' },
      {
        type: 'paragraph',
        text: 'Boa parte das reinternações evitáveis nasce de informação perdida na transição: orientação que não chegou ao paciente, ajuste de prescrição que não foi comunicado, retorno que não foi agendado. Transição segura exige documento, responsável e confirmação — não apenas boa vontade.',
      },
      { type: 'h2', text: 'O papel do acompanhamento técnico' },
      {
        type: 'paragraph',
        text: 'O acompanhamento durante a internação permite antecipar esses pontos e acionar as partes envolvidas com tempo hábil. A alta deixa de ser um evento negociado às pressas e passa a ser o encerramento previsto de um plano.',
      },
    ],
    seo: {
      title: 'Desospitalização segura: como preparar a alta desde a admissão',
      description:
        'Boas práticas de desospitalização e transição de cuidado para reduzir permanência sem indicação clínica e reinternações evitáveis.',
    },
  },
  {
    id: 4,
    slug: 'registro-em-prontuario-a-base-da-assistencia-e-do-faturamento',
    title: 'Registro em prontuário: a base da assistência e do faturamento',
    excerpt:
      'O que não está registrado não pode ser avaliado, defendido nem faturado. Qualificar o registro é uma decisão de gestão, não uma exigência burocrática.',
    categorySlug: 'gestao-hospitalar',
    authorId: 1,
    status: 'published',
    publishedAt: '2026-07-22',
    updatedAt: '2026-07-22',
    readingMinutes: 4,
    cover: '/images/post-gestao-hospitalar.svg',
    coverAlt: 'Ilustração abstrata sobre processos e registros hospitalares',
    featured: false,
    demo: true,
    body: [
      {
        type: 'paragraph',
        text: 'O prontuário é, simultaneamente, instrumento de cuidado, documento legal e base do faturamento. Quando o registro é incompleto, os três se fragilizam ao mesmo tempo — e a equipe assistencial costuma ser a última a saber.',
      },
      { type: 'h2', text: 'Onde o registro costuma falhar' },
      {
        type: 'list',
        items: [
          'Evolução que não justifica a manutenção do nível de atenção',
          'Prescrição sem checagem ou sem registro de administração',
          'Procedimento executado sem descrição técnica correspondente',
          'Intercorrência tratada e não documentada',
          'Indicação de material sem justificativa clínica registrada',
        ],
      },
      { type: 'h2', text: 'O efeito em cadeia' },
      {
        type: 'paragraph',
        text: 'Uma lacuna de registro vira glosa técnica, que vira recurso, que vira desgaste contratual. No caminho, a instituição gasta horas de equipe para reconstruir informação que deveria ter sido registrada uma única vez, no momento do cuidado.',
      },
      {
        type: 'quote',
        text: 'Qualificar o registro é mais barato do que defender, depois, aquilo que não foi documentado.',
      },
      { type: 'h2', text: 'Por onde começar' },
      {
        type: 'paragraph',
        text: 'Mapear os pontos de maior perda, padronizar o que precisa ser registrado em cada etapa e devolver à equipe o resultado dessa mudança. Registro melhora quando quem registra entende para que serve — e vê o efeito prático da correção.',
      },
    ],
    seo: {
      title: 'Registro em prontuário: base da assistência e do faturamento',
      description:
        'Por que a qualidade do registro em prontuário impacta segurança assistencial, defesa técnica e faturamento hospitalar, e como estruturar a melhoria.',
    },
  },
  {
    id: 5,
    slug: 'indicadores-de-seguranca-do-paciente-por-onde-comecar',
    title: 'Indicadores de segurança do paciente: por onde começar',
    excerpt:
      'Painéis com dezenas de métricas raramente mudam a prática. Poucos indicadores bem escolhidos, analisados com regularidade, mudam.',
    categorySlug: 'seguranca-do-paciente',
    authorId: 1,
    status: 'published',
    publishedAt: '2026-07-15',
    updatedAt: '2026-07-15',
    readingMinutes: 4,
    cover: '/images/post-seguranca-paciente.svg',
    coverAlt: 'Ilustração abstrata sobre indicadores e barreiras de segurança',
    featured: false,
    demo: true,
    body: [
      {
        type: 'paragraph',
        text: 'Serviços que iniciam a estruturação da área de qualidade costumam adotar um painel extenso logo no primeiro ciclo. Meses depois, o painel existe, é atualizado — e nenhuma decisão foi tomada a partir dele.',
      },
      { type: 'h2', text: 'Critérios para escolher um indicador' },
      {
        type: 'list',
        items: [
          'Está ligado a um risco real e frequente no seu serviço',
          'A fonte de dados é confiável e obtida sem esforço desproporcional',
          'Existe alguém responsável por analisá-lo periodicamente',
          'Uma variação no indicador leva a uma ação concreta e definida',
        ],
      },
      {
        type: 'paragraph',
        text: 'Se o quarto critério não é atendido, o indicador é apenas registro histórico.',
      },
      { type: 'h2', text: 'Notificação: o insumo que sustenta o resto' },
      {
        type: 'paragraph',
        text: 'Sem cultura de notificação, o painel mostra apenas o que não pôde ser escondido. Notificação cresce quando existe retorno a quem notificou e quando a análise se concentra no processo, e não na busca por um responsável individual.',
      },
      { type: 'h2', text: 'Análise crítica com periodicidade' },
      {
        type: 'paragraph',
        text: 'Indicador sem rotina de análise crítica não produz mudança. A periodicidade importa mais do que a quantidade: poucos indicadores discutidos todo mês superam um painel completo revisado uma vez por ano.',
      },
    ],
    seo: {
      title: 'Indicadores de segurança do paciente: por onde começar',
      description:
        'Como escolher indicadores de segurança do paciente úteis, sustentar a cultura de notificação e manter rotina de análise crítica.',
    },
  },
  {
    id: 6,
    slug: 'qualificacao-da-rede-prestadora-avaliar-para-desenvolver',
    title: 'Qualificação da rede prestadora: avaliar para desenvolver',
    excerpt:
      'Avaliar prestadores sem devolver caminho de melhoria produz ranking. Qualificação de rede produz evolução verificável.',
    categorySlug: 'saude-suplementar',
    authorId: 1,
    status: 'published',
    publishedAt: '2026-07-08',
    updatedAt: '2026-07-08',
    readingMinutes: 5,
    cover: '/images/post-qualificacao-rede.svg',
    coverAlt: 'Ilustração abstrata sobre avaliação e desenvolvimento de rede prestadora',
    featured: false,
    demo: true,
    body: [
      {
        type: 'paragraph',
        text: 'Muitos programas de qualificação de rede param na avaliação: aplica-se o instrumento, gera-se uma nota, arquiva-se o relatório. No ciclo seguinte, os mesmos achados reaparecem — porque ninguém foi encarregado de tratá-los.',
      },
      { type: 'h2', text: 'Da não conformidade ao plano de ação' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Registrar a não conformidade com evidência e criticidade definida',
          'Analisar a causa raiz, e não apenas o sintoma observado',
          'Pactuar plano de ação com responsável e prazo junto ao prestador',
          'Reavaliar no ciclo seguinte e verificar a efetividade da correção',
        ],
      },
      { type: 'h2', text: 'Comunicação de incidentes entre as partes' },
      {
        type: 'paragraph',
        text: 'Eventos adversos precisam de fluxo formal de comunicação entre prestador e fonte pagadora. Sem esse fluxo, o mesmo incidente se repete em unidades diferentes da mesma rede, sem que nenhuma delas tenha acesso ao aprendizado da outra.',
      },
      { type: 'h2', text: 'Descredenciar nem sempre resolve' },
      {
        type: 'paragraph',
        text: 'Em regiões com oferta assistencial limitada, substituir o prestador transfere o problema. Desenvolver a rede — com critérios claros, apoio técnico e verificação posterior — costuma produzir efeito mais duradouro para o beneficiário.',
      },
    ],
    seo: {
      title: 'Qualificação da rede prestadora: avaliar para desenvolver',
      description:
        'Como estruturar a qualificação da rede prestadora com evidências, análise de causa raiz, planos de ação e reavaliação periódica.',
    },
  },
];

export const publishedPosts = posts
  .filter((p) => p.status === 'published')
  .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getAuthor(id: number): Author | undefined {
  return authors.find((a) => a.id === id);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  return `${d} de ${months[(m ?? 1) - 1]} de ${y}`;
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
