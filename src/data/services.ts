/**
 * SERVIÇOS — conteúdo estruturado.
 *
 * ETAPA 1: fixture local. ETAPA 2: tabela `services` no D1, administrada em
 * /admin/servicos (mesmos campos, mesma ordem, mesmo contrato de slug).
 *
 * Conteúdo redigido a partir do escopo técnico descrito no briefing do projeto.
 * NÃO contém números, cases, clientes ou resultados — nada foi inventado.
 */

export interface ServiceHighlight {
  icon: string;
  title: string;
  text: string;
}

export interface ServiceBlock {
  title: string;
  text?: string;
  items?: string[];
}

export interface Service {
  slug: string;
  name: string;
  shortName: string;
  order: number;
  featured: boolean;
  status: 'published' | 'draft' | 'archived';
  icon: string;
  summary: string;
  heroTitle: string;
  heroLead: string;
  image: string;
  imageAlt: string;
  intro: string[];
  highlights: ServiceHighlight[];
  blocks: ServiceBlock[];
  deliverables: string[];
  audience: string[];
  whatsappMessage: string;
  seo: { title: string; description: string };
  updatedAt: string;
}

export const services: Service[] = [
  {
    slug: 'auditoria-concorrente',
    name: 'Auditoria Concorrente',
    shortName: 'Auditoria Concorrente',
    order: 1,
    featured: true,
    status: 'published',
    icon: 'stethoscope',
    summary:
      'Acompanhamento técnico do paciente durante a internação, com visita à beira do leito, interação com a equipe assistencial e avaliação contínua da pertinência e da adequação do cuidado.',
    heroTitle: 'Auditoria Concorrente: acompanhamento técnico durante a internação',
    heroLead:
      'Presença técnica junto ao paciente internado para avaliar pertinência, adequação terapêutica e tempo de permanência, identificando desvios enquanto ainda é possível corrigi-los.',
    image: '/images/servico-auditoria-concorrente.svg',
    imageAlt:
      'Composição gráfica representando acompanhamento assistencial durante a internação hospitalar',
    intro: [
      'A auditoria concorrente acontece enquanto o cuidado está sendo prestado — e não depois que ele terminou. É essa simultaneidade que permite atuar sobre o que ainda pode ser corrigido: um plano terapêutico que precisa de revisão, uma permanência que se prolonga sem justificativa técnica, uma transição de cuidado que precisa ser preparada com antecedência.',
      'Auditores, médicos e enfermeiros da Essencial Saúde atuam in loco nos prestadores parceiros da rede de Brasília — hospitais de alta complexidade, unidades de transição e home care —, com visitas à beira-leito e contato direto com a equipe assistencial e o médico assistente. Essa presença exerce a dupla checagem e a análise minuciosa de dados, posicionando o paciente no centro absoluto de uma prática assistencial segura e resolutiva.',
      'O acompanhamento é potencializado por um software de gestão da jornada do paciente associado à metodologia DRG (Diagnosis Related Groups), que estrutura a análise das internações, mensura complexidade e prediz prorrogações de permanência — identificando precoce e preventivamente desvios clínicos beira-leito.',
    ],
    highlights: [
      {
        icon: 'bed',
        title: 'Visita técnica beira-leito',
        text: 'Auditores, médicos e enfermeiros in loco, com leitura do prontuário e observação direta da evolução clínica.',
      },
      {
        icon: 'users',
        title: 'Interação com a equipe assistencial',
        text: 'Contato técnico com o médico assistente e com a equipe multiprofissional, preservando a autonomia clínica.',
      },
      {
        icon: 'clipboard-check',
        title: 'Dupla checagem e DRG',
        text: 'Análise minuciosa de dados, apoiada em metodologia DRG e software de gestão da jornada do paciente.',
      },
      {
        icon: 'route',
        title: 'Transição de cuidado',
        text: 'Preparo antecipado da alta, da desospitalização e da continuidade do cuidado no nível de atenção adequado.',
      },
    ],
    blocks: [
      {
        title: 'O que é avaliado durante a internação',
        text: 'A avaliação concorrente é técnica, documentada e orientada por critérios clínicos. Ela observa, de forma contínua:',
        items: [
          'Pertinência da internação e do nível de atenção em que o paciente se encontra',
          'Adequação terapêutica frente ao quadro clínico e à evolução registrada em prontuário',
          'Tempo de permanência e fatores que o prolongam além do necessário',
          'Coerência entre a prescrição, a execução assistencial e o registro em prontuário',
          'Riscos assistenciais evitáveis e sinais de agravamento não endereçados',
          'Condições clínicas e logísticas para a alta segura ou para a transferência',
        ],
      },
      {
        title: 'Atuação junto ao médico assistente',
        text: 'O contato com o médico assistente é conduzido como interlocução técnica entre pares. A Essencial Saúde não substitui a conduta clínica: apresenta evidências, questiona tecnicamente quando necessário e registra o alinhamento alcançado, dando previsibilidade tanto ao prestador quanto à fonte pagadora.',
      },
      {
        title: 'Segurança do paciente como critério de decisão',
        text: 'Permanência hospitalar prolongada sem indicação técnica expõe o paciente a riscos evitáveis — infecção relacionada à assistência, imobilidade, eventos adversos e perda de funcionalidade. A auditoria concorrente trata a desospitalização segura e no tempo certo como um desfecho de qualidade assistencial, e não apenas como um resultado financeiro.',
      },
      {
        title: 'Tecnologia a serviço da decisão clínica',
        text: 'O uso integrado de software de gestão da jornada do paciente e da metodologia DRG converte dados operacionais em previsibilidade orçamentária, mitigação de riscos e conformidade regulatória — sustentando, com evidência, cada validação realizada em tempo real pelos auditores em campo.',
      },
      {
        title: 'Resolutividade e prevenção de riscos',
        text: 'Cada apontamento gera um encaminhamento: alinhamento com a equipe assistencial, comunicação estruturada com a fonte pagadora, registro técnico e acompanhamento até o desfecho. O ciclo se fecha com evidência documental, o que sustenta decisões futuras, contribui para a redução de NIPs e para a melhoria contínua da rede.',
      },
    ],
    deliverables: [
      'Relatório técnico de acompanhamento por internação',
      'Registro estruturado de desvios identificados e encaminhamentos realizados',
      'Comunicação tempestiva à fonte pagadora sobre situações críticas',
      'Subsídio técnico documentado para a auditoria de contas subsequente',
      'Indicadores assistenciais e de permanência acordados em contrato, com apoio de metodologia DRG',
    ],
    audience: [
      'Operadoras de saúde e autogestões',
      'Seguradoras e seguradoras internacionais',
      'Embaixadas e consulados com beneficiários internados no Brasil',
      'Empresas com planos de saúde e órgãos públicos',
    ],
    whatsappMessage:
      'Olá! Vim pela página de Auditoria Concorrente da Essencial Saúde e gostaria de receber mais informações.',
    seo: {
      title: 'Auditoria Concorrente Hospitalar | Essencial Saúde Auditoria',
      description:
        'Auditoria concorrente com visita beira-leito, avaliação de pertinência, adequação terapêutica e permanência, com foco na segurança do paciente. Brasília - DF.',
    },
    updatedAt: '2026-08-12',
  },
  {
    slug: 'auditoria-de-contas-hospitalares',
    name: 'Auditoria de Contas Hospitalares',
    shortName: 'Contas Hospitalares',
    order: 2,
    featured: true,
    status: 'published',
    icon: 'file-check',
    summary:
      'Revisão técnica das contas hospitalares com foco na coerência entre os procedimentos faturados e a assistência efetivamente prestada, protegendo o equilíbrio financeiro da operadora e do prestador.',
    heroTitle: 'Auditoria de Contas Hospitalares com base técnica e prontuário',
    heroLead:
      'Análise que parte do cuidado prestado — e não apenas da planilha — para verificar coerência entre assistência, registro clínico e faturamento.',
    image: '/images/servico-contas-hospitalares.svg',
    imageAlt:
      'Composição gráfica representando análise técnica de contas hospitalares e documentos clínicos',
    intro: [
      'Auditar contas hospitalares não é conferir valores linha a linha. É verificar se aquilo que foi cobrado corresponde ao que foi assistencialmente necessário, executado e registrado. Sem essa leitura clínica, a análise vira disputa comercial — e o resultado costuma ser glosa contestada, retrabalho e desgaste na relação com o prestador.',
      'A Essencial Saúde conduz a revisão com fundamento técnico e rastreabilidade documental. Profissionais especializados validam a correlação entre os consumos de materiais, medicamentos e taxas com a evolução clínica do prontuário, assegurando a cobrança por itens justificados — o que reduz a subjetividade e torna a discussão entre fonte pagadora e prestador objetiva.',
      'Ao aplicar rigor técnico na revisão de contas, protegemos o equilíbrio financeiro tanto da operadora/fonte pagadora quanto do prestador, eliminando inconsistências e garantindo que o faturamento reflita a realidade técnica do atendimento — fundamental para a sustentabilidade contratual entre as partes.',
    ],
    highlights: [
      {
        icon: 'clipboard',
        title: 'Prontuário como fonte primária',
        text: 'A conta é confrontada com o registro clínico, e não apenas com a tabela de cobrança.',
      },
      {
        icon: 'scale',
        title: 'Coerência assistência × faturamento',
        text: 'Verificação da correspondência entre indicação, execução, registro e cobrança.',
      },
      {
        icon: 'search',
        title: 'Identificação de inconsistências',
        text: 'Duplicidades, itens sem respaldo técnico, incompatibilidades de período e de quantidade.',
      },
      {
        icon: 'handshake',
        title: 'Sustentação técnica na negociação',
        text: 'Apontamentos documentados que sustentam a discussão com o prestador de forma objetiva.',
      },
    ],
    blocks: [
      {
        title: 'Escopo da revisão técnica',
        text: 'A análise percorre os elementos que compõem a conta hospitalar, sempre confrontados com o registro assistencial:',
        items: [
          'Materiais e órteses, próteses e materiais especiais, quanto a indicação, quantidade e registro',
          'Medicamentos: prescrição, aprazamento, checagem, devolução e compatibilidade com a evolução',
          'Taxas, diárias e serviços, quanto a período, acomodação e respaldo contratual',
          'Procedimentos realizados, sua justificativa técnica e a documentação correspondente',
          'Exames e terapias, quanto a pertinência, frequência e resultado registrado',
          'Aderência às regras contratuais e às tabelas pactuadas entre as partes',
        ],
      },
      {
        title: 'Justificativa técnica antes da glosa',
        text: 'Glosa sem fundamento gera recurso, retrabalho e ruído. A Essencial Saúde estrutura cada apontamento com a evidência que o sustenta — trecho de prontuário, ausência de registro, divergência de período — para que a decisão seja defensável e para que o prestador compreenda com clareza o que precisa ser corrigido.',
      },
      {
        title: 'Da conta para o processo',
        text: 'Inconsistências recorrentes revelam falhas de processo, e não apenas erros isolados de digitação. O resultado da auditoria de contas retorna como informação qualificada para a gestão: onde o registro assistencial falha, onde o fluxo de autorização se rompe, onde o contrato precisa de ajuste.',
      },
      {
        title: 'Sustentabilidade contratual',
        text: 'O objetivo não é reduzir custo a qualquer preço, e sim eliminar o desperdício que não gera valor assistencial. Uma relação contratual sustentável depende de previsibilidade para a fonte pagadora e de remuneração correta para o prestador que executa bem o cuidado.',
      },
    ],
    deliverables: [
      'Parecer técnico por conta analisada, com fundamentação documental',
      'Relatório consolidado de inconsistências por período e por prestador',
      'Subsídio técnico para recurso de glosa e para negociação',
      'Mapeamento de causas recorrentes e recomendações de processo',
      'Interface com a auditoria concorrente, quando contratada em conjunto',
    ],
    audience: [
      'Operadoras de saúde, autogestões e seguradoras',
      'Empresas e órgãos públicos com contratos assistenciais',
      'Hospitais que desejam qualificar o próprio faturamento',
    ],
    whatsappMessage:
      'Olá! Vim pela página de Auditoria de Contas Hospitalares da Essencial Saúde e gostaria de receber mais informações.',
    seo: {
      title: 'Auditoria de Contas Hospitalares | Essencial Saúde Auditoria',
      description:
        'Revisão técnica de contas hospitalares com análise de prontuário, materiais, medicamentos, taxas e procedimentos, com foco na sustentabilidade contratual.',
    },
    updatedAt: '2026-08-12',
  },
  {
    slug: 'gestao-da-jornada-do-paciente',
    name: 'Gestão da Jornada do Paciente',
    shortName: 'Jornada do Paciente',
    order: 3,
    featured: true,
    status: 'published',
    icon: 'route',
    summary:
      'Acompanhamento da trajetória assistencial do beneficiário, garantindo tratamento adequado, no nível de atenção correto e com continuidade do cuidado.',
    heroTitle: 'Gestão da Jornada do Paciente ao longo de toda a trajetória assistencial',
    heroLead:
      'Coordenação técnica entre níveis de atenção para que o paciente receba o cuidado certo, no lugar certo e pelo tempo necessário.',
    image: '/images/servico-jornada-paciente.svg',
    imageAlt:
      'Composição gráfica representando a trajetória do paciente entre níveis de atenção',
    intro: [
      'A jornada assistencial raramente se resume a uma internação. Ela envolve pronto atendimento, exames, internação, terapias, alta, retorno e, com frequência, novos episódios. Quando cada etapa é gerida isoladamente, o paciente é quem sente a descontinuidade — e o sistema absorve o retrabalho.',
      'A Essencial Saúde acompanha essa trajetória de forma integrada, monitorando a adequação do nível de atenção, a continuidade entre etapas e as condições necessárias para a desospitalização segura.',
    ],
    highlights: [
      {
        icon: 'compass',
        title: 'Nível de atenção adequado',
        text: 'Avaliação de onde o cuidado deve ser prestado: hospitalar, domiciliar, ambulatorial ou em unidade de cuidados prolongados.',
      },
      {
        icon: 'refresh',
        title: 'Continuidade do cuidado',
        text: 'Articulação entre etapas assistenciais para evitar interrupções, repetições e reinternações evitáveis.',
      },
      {
        icon: 'home',
        title: 'Desospitalização segura',
        text: 'Preparo antecipado da alta com verificação das condições clínicas, familiares e de suporte.',
      },
      {
        icon: 'shield',
        title: 'Redução de riscos',
        text: 'Menor exposição a riscos hospitalares evitáveis quando a permanência não é mais necessária.',
      },
    ],
    blocks: [
      {
        title: 'Monitoramento da trajetória',
        text: 'O acompanhamento é contínuo e cobre os pontos em que a jornada costuma se romper:',
        items: [
          'Entrada no sistema: pronto atendimento, encaminhamento e indicação de internação',
          'Adequação do tratamento ao quadro clínico e à evolução do paciente',
          'Permanência e critérios objetivos para manutenção ou mudança de nível de atenção',
          'Transferências entre unidades e entre prestadores, com transmissão adequada de informação',
          'Alta hospitalar, orientação e retorno assistencial',
          'Continuidade pós-alta e prevenção de reinternações evitáveis',
        ],
      },
      {
        title: 'Coordenação entre as partes',
        text: 'A gestão da jornada só funciona com comunicação estruturada. A Essencial Saúde atua como ponto de articulação entre fonte pagadora, prestador, equipe assistencial, paciente e família, mantendo todos informados sobre o que está previsto para a etapa seguinte.',
      },
      {
        title: 'Resolutividade como indicador',
        text: 'Uma jornada bem conduzida é aquela que resolve o problema de saúde com o menor número de etapas desnecessárias. Resolutividade, aqui, é um indicador assistencial: menos idas e vindas, menos duplicidade de exames, menos internações que poderiam ter sido evitadas com o cuidado adequado no momento certo.',
      },
      {
        title: 'Redução do desperdício ao longo da jornada',
        text: 'A otimização da utilização de recursos de alto custo é consequência direta de uma jornada bem gerida. Trabalhamos na identificação de "gaps" de eficiência ao longo da trajetória — solicitações excessivas de exames, uso indevido de OPME (órteses, próteses e materiais especiais) ou terapias sem custo-efetividade comprovada para o quadro clínico —, investindo os recursos onde de fato geram impacto positivo na recuperação do beneficiário.',
      },
    ],
    deliverables: [
      'Acompanhamento longitudinal dos casos definidos em contrato, com apoio de software de gestão da jornada',
      'Relatório de trajetória por beneficiário, com marcos assistenciais',
      'Plano de transição de cuidado e verificação das condições de alta',
      'Sinalização de casos com risco de reinternação ou de descontinuidade',
      'Indicadores de permanência, transição e continuidade',
    ],
    audience: [
      'Operadoras de saúde e autogestões',
      'Seguradoras nacionais e internacionais',
      'Embaixadas, consulados e empresas com beneficiários em tratamento',
    ],
    whatsappMessage:
      'Olá! Vim pela página de Gestão da Jornada do Paciente da Essencial Saúde e gostaria de receber mais informações.',
    seo: {
      title: 'Gestão da Jornada do Paciente | Essencial Saúde Auditoria',
      description:
        'Acompanhamento da jornada assistencial com foco em nível de atenção adequado, continuidade do cuidado, desospitalização segura e resolutividade.',
    },
    updatedAt: '2026-08-12',
  },
  {
    slug: 'gestao-hospitalar',
    name: 'Gestão Hospitalar',
    shortName: 'Gestão Hospitalar',
    order: 4,
    featured: true,
    status: 'published',
    icon: 'building',
    summary:
      'Apoio técnico à gestão assistencial e operacional do hospital, com foco em processos, qualidade, segurança, eficiência e melhoria contínua.',
    heroTitle: 'Gestão Hospitalar: muito além da conferência de contas',
    heroLead:
      'Atuação técnica sobre processos assistenciais e operacionais, integrando qualidade, segurança e eficiência à sustentabilidade da operação.',
    image: '/images/servico-gestao-hospitalar.svg',
    imageAlt: 'Composição gráfica representando gestão de processos hospitalares integrados',
    intro: [
      'A Essencial Saúde não se limita à conferência de contas. A atuação em gestão hospitalar parte do processo assistencial — de como o cuidado é organizado, registrado e verificado — para produzir efeito simultâneo sobre qualidade, segurança e eficiência.',
      'A premissa é simples: processo assistencial bem desenhado gera melhor desfecho clínico, menos desperdício e menos conflito na relação com a fonte pagadora. Quando esses três resultados são tratados separadamente, um deles sempre é sacrificado.',
    ],
    highlights: [
      {
        icon: 'workflow',
        title: 'Processos assistenciais',
        text: 'Mapeamento e revisão dos fluxos que sustentam a assistência, do acesso à alta.',
      },
      {
        icon: 'shield-check',
        title: 'Qualidade e segurança',
        text: 'Práticas de segurança do paciente incorporadas à rotina, e não tratadas como exigência externa.',
      },
      {
        icon: 'trending',
        title: 'Eficiência operacional',
        text: 'Redução de desperdício, retrabalho e etapas que não agregam valor ao cuidado.',
      },
      {
        icon: 'layers',
        title: 'Integração entre áreas',
        text: 'Alinhamento entre corpo clínico, enfermagem, faturamento, suprimentos e gestão.',
      },
    ],
    blocks: [
      {
        title: 'Frentes de atuação',
        items: [
          'Diagnóstico dos processos assistenciais e dos pontos de ruptura entre áreas',
          'Estruturação e revisão de protocolos, rotinas e fluxos de trabalho',
          'Qualificação do registro em prontuário como base da assistência e do faturamento',
          'Gestão assistencial da internação: permanência, indicação e transição de cuidado',
          'Articulação entre assistência, suprimentos e faturamento',
          'Definição e acompanhamento de indicadores de qualidade e de eficiência',
        ],
      },
      {
        title: 'Melhoria contínua com evidência',
        text: 'Toda recomendação nasce de evidência coletada no próprio serviço: análise documental, observação de processo e dados assistenciais. O acompanhamento posterior verifica se a mudança foi de fato incorporada à rotina — o ciclo não termina no relatório.',
      },
      {
        title: 'Sustentabilidade da operação',
        text: 'Sustentabilidade, no contexto hospitalar, significa manter a capacidade de prestar cuidado com qualidade ao longo do tempo. Isso exige previsibilidade financeira, relação contratual equilibrada com as fontes pagadoras e eliminação consistente do desperdício que não beneficia o paciente.',
      },
    ],
    deliverables: [
      'Diagnóstico técnico dos processos avaliados',
      'Plano de ação priorizado, com responsáveis e prazos',
      'Protocolos e rotinas revisados ou estruturados',
      'Painel de indicadores assistenciais e operacionais acordados',
      'Acompanhamento periódico da implantação e dos resultados',
    ],
    audience: [
      'Hospitais e clínicas',
      'Redes assistenciais e prestadores de médio e grande porte',
      'Operadoras com serviços próprios',
    ],
    whatsappMessage:
      'Olá! Vim pela página de Gestão Hospitalar da Essencial Saúde e gostaria de receber mais informações.',
    seo: {
      title: 'Gestão Hospitalar | Essencial Saúde Auditoria',
      description:
        'Consultoria e gestão hospitalar com foco em processos, qualidade, segurança assistencial, eficiência operacional e melhoria contínua. Brasília - DF.',
    },
    updatedAt: '2026-08-12',
  },
  {
    slug: 'qualificacao-da-rede-prestadora',
    name: 'Qualificação da Rede Prestadora',
    shortName: 'Qualificação da Rede',
    order: 5,
    featured: false,
    status: 'published',
    icon: 'network',
    summary:
      'Avaliação e desenvolvimento da rede prestadora com base em evidências, tratamento de não conformidades, análise de causa raiz e planos de ação.',
    heroTitle: 'Qualificação da Rede Prestadora com base em evidências',
    heroLead:
      'Avaliação técnica e desenvolvimento contínuo dos prestadores, transformando não conformidades em planos de ação acompanhados.',
    image: '/images/servico-qualificacao-rede.svg',
    imageAlt:
      'Composição gráfica representando a avaliação e o desenvolvimento da rede prestadora',
    intro: [
      'Integrado à auditoria concorrente, o programa de qualificação da rede prestadora estabelece-se como o elo estratégico entre a operadora e o prestador de serviços, com objetivo primordial de garantir a efetividade e a segurança do cuidado ao paciente. Essa relação fundamenta-se no compartilhamento de riscos e responsabilidades — a sustentabilidade do sistema de saúde suplementar depende da união de esforços entre as partes.',
      'A operadora posiciona-se como parceira técnica que auxilia os hospitais na implantação de diretrizes fundamentadas em evidências e em padrões de instituições acreditadoras. Qualificar a rede não é apenas classificar prestadores: é construir, com cada um deles, um caminho verificável de melhoria — a partir de critérios conhecidos, evidências coletadas em campo e acompanhamento posterior do que foi acordado.',
    ],
    highlights: [
      {
        icon: 'clipboard-check',
        title: 'Avaliação com critérios objetivos',
        text: 'Instrumento de avaliação estruturado, aplicado de forma consistente em toda a rede.',
      },
      {
        icon: 'alert',
        title: 'Não conformidades tratadas',
        text: 'Registro, classificação e encaminhamento formal das não conformidades identificadas.',
      },
      {
        icon: 'git-branch',
        title: 'Análise de causa raiz',
        text: 'Investigação da origem do problema, para além do sintoma imediato observado.',
      },
      {
        icon: 'target',
        title: 'Planos de ação acompanhados',
        text: 'Ações com responsável e prazo, verificadas em ciclos posteriores de avaliação.',
      },
    ],
    blocks: [
      {
        title: 'Como a qualificação é conduzida',
        items: [
          'Definição dos critérios de avaliação alinhados ao contrato e ao perfil da rede',
          'Coleta de evidências documentais e verificação em campo',
          'Registro estruturado de não conformidades, com classificação de criticidade',
          'Comunicação de incidentes e eventos adversos por fluxo formal',
          'Análise de causa raiz dos casos relevantes',
          'Plano de ação pactuado com o prestador, com prazos e responsáveis',
          'Reavaliação periódica e acompanhamento da evolução',
        ],
      },
      {
        title: 'Ferramentas tecnológicas e fluxo educativo',
        text: 'Ferramentas tecnológicas centralizam a informação e garantem transparência em tempo real: qualquer incidente observado durante o atendimento é imediatamente comunicado ao prestador, que assume o compromisso de realizar a Análise de Causa Raiz (ACR) e implementar planos de ação corretivos em prazos estritamente definidos. Esse fluxo educativo transforma falhas pontuais em oportunidades de melhoria contínua.',
      },
      {
        title: 'Prevenção de eventos iatrogênicos',
        text: 'O tratamento de não conformidades assistenciais previne eventos iatrogênicos como infecções, quedas e lesões por pressão, assegurando a adesão estrita a protocolos de segurança. A qualificação da rede evita desperdícios, reduz o tempo de permanência inadequado e otimiza a utilização dos recursos assistenciais.',
      },
      {
        title: 'Desenvolvimento da rede, não apenas fiscalização',
        text: 'O tratamento de reincidências é conduzido com criteriosidade, analisando-se o histórico e o papel estratégico do prestador na rede. Descredenciar um prestador com problema resolve um caso e cria outro — especialmente onde a oferta assistencial é limitada. O foco permanece no desenvolvimento conjunto e no fortalecimento do sistema de saúde suplementar, com a excelência na jornada e no desfecho clínico do beneficiário como resultado esperado.',
      },
    ],
    deliverables: [
      'Instrumento de avaliação e critérios documentados',
      'Relatório de avaliação por prestador, com evidências',
      'Registro de não conformidades e análise de causa raiz',
      'Planos de ação pactuados e cronograma de reavaliação',
      'Panorama consolidado da rede para a fonte pagadora',
    ],
    audience: [
      'Operadoras de saúde, autogestões e seguradoras',
      'Órgãos públicos e empresas com rede credenciada',
      'Redes assistenciais que gerenciam prestadores parceiros',
    ],
    whatsappMessage:
      'Olá! Vim pela página de Qualificação da Rede Prestadora da Essencial Saúde e gostaria de receber mais informações.',
    seo: {
      title: 'Qualificação da Rede Prestadora | Essencial Saúde Auditoria',
      description:
        'Qualificação de rede prestadora com avaliação por evidências, tratamento de não conformidades, análise de causa raiz e planos de ação acompanhados.',
    },
    updatedAt: '2026-08-12',
  },
  {
    slug: 'seguranca-e-qualidade-assistencial',
    name: 'Segurança e Qualidade Assistencial',
    shortName: 'Segurança e Qualidade',
    order: 6,
    featured: false,
    status: 'published',
    icon: 'shield-check',
    summary:
      'Estruturação de práticas de segurança do paciente e de qualidade assistencial, com indicadores, protocolos e cultura de melhoria contínua.',
    heroTitle: 'Segurança do paciente e qualidade assistencial na rotina',
    heroLead:
      'Práticas de segurança incorporadas ao processo de cuidado, sustentadas por protocolo, indicador e acompanhamento — não por campanha pontual.',
    image: '/images/servico-seguranca-qualidade.svg',
    imageAlt:
      'Composição gráfica representando barreiras de segurança assistencial e qualidade do cuidado',
    intro: [
      'Segurança do paciente não se resolve com cartaz na parede. Ela depende de barreiras desenhadas dentro do processo assistencial, de registro confiável, de notificação sem medo e de análise séria do que deu errado.',
      'A Essencial Saúde apoia a estruturação dessas práticas e a sua sustentação ao longo do tempo, conectando qualidade assistencial aos demais serviços — porque um evento adverso evitado é, simultaneamente, melhor desfecho clínico e menor custo assistencial.',
    ],
    highlights: [
      {
        icon: 'shield',
        title: 'Barreiras de segurança',
        text: 'Protocolos aplicados aos pontos de maior risco do processo assistencial.',
      },
      {
        icon: 'bell',
        title: 'Cultura de notificação',
        text: 'Fluxo de notificação de incidentes com retorno estruturado a quem notificou.',
      },
      {
        icon: 'chart',
        title: 'Indicadores de qualidade',
        text: 'Métricas assistenciais acompanhadas periodicamente, com análise crítica.',
      },
      {
        icon: 'refresh',
        title: 'Melhoria contínua',
        text: 'Ciclos de revisão que verificam se a correção implantada permaneceu efetiva.',
      },
    ],
    blocks: [
      {
        title: 'Frentes de trabalho',
        items: [
          'Avaliação das práticas de segurança já existentes e das lacunas do processo',
          'Estruturação ou revisão de protocolos assistenciais críticos',
          'Fluxo de notificação, classificação e tratamento de incidentes',
          'Análise de eventos adversos e de causa raiz',
          'Definição de indicadores assistenciais e rotina de análise crítica',
          'Capacitação técnica das equipes envolvidas nos processos revisados',
        ],
      },
      {
        title: 'Qualidade que aparece no desfecho',
        text: 'Qualidade assistencial se mede pelo que acontece com o paciente: menos eventos evitáveis — como infecções, quedas e lesões por pressão —, menos reinternações, transição de cuidado bem conduzida, tratamento adequado no tempo certo. Os indicadores existem para tornar isso visível e comparável ao longo do tempo.',
      },
      {
        title: 'Reflexo em indicadores regulatórios',
        text: 'Uma cultura de segurança bem estruturada, com notificação, Análise de Causa Raiz (ACR) e planos de ação em prazos definidos, tende a reduzir Notificações de Intermediação Preliminar (NIPs) — com impacto positivo direto no Índice Geral de Reclamações (IGR) da ANS acompanhado pela operadora.',
      },
      {
        title: 'Integração com a auditoria',
        text: 'A informação levantada na auditoria concorrente e na auditoria de contas alimenta o trabalho de qualidade — e vice-versa. É essa integração que evita o cenário comum em que a área de qualidade e a área de auditoria enxergam o mesmo problema e não conversam entre si.',
      },
    ],
    deliverables: [
      'Diagnóstico das práticas de segurança e qualidade',
      'Protocolos assistenciais estruturados ou revisados',
      'Fluxo de notificação e tratamento de incidentes',
      'Painel de indicadores assistenciais com rotina de análise',
      'Relatórios periódicos de acompanhamento e recomendações',
    ],
    audience: [
      'Hospitais, clínicas e redes assistenciais',
      'Operadoras que acompanham qualidade da rede credenciada',
      'Serviços em processo de estruturação da área de qualidade',
    ],
    whatsappMessage:
      'Olá! Vim pela página de Segurança e Qualidade Assistencial da Essencial Saúde e gostaria de receber mais informações.',
    seo: {
      title: 'Segurança e Qualidade Assistencial | Essencial Saúde Auditoria',
      description:
        'Segurança do paciente e qualidade assistencial com protocolos, indicadores, notificação de incidentes e melhoria contínua. Brasília - DF.',
    },
    updatedAt: '2026-08-12',
  },
];

export const publishedServices = services
  .filter((s) => s.status === 'published')
  .sort((a, b) => a.order - b.order);

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export const serviceOptions = publishedServices.map((s) => s.name);
