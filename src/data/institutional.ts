/**
 * CONTEÚDO INSTITUCIONAL (Home, Quem Somos, seções compartilhadas).
 *
 * ETAPA 1: fixture local. ETAPA 2: tabelas `pages` / `page_sections` no D1,
 * administradas em /admin/paginas (Home por seções estruturadas).
 *
 * FONTE: "Resumo da Essencial Saúde Auditoria.pdf" (material institucional
 * oficial fornecido pelo proprietário). Missão, visão, valores, segmentação
 * de clientes e a descrição da atuação técnica vêm diretamente desse
 * documento — os textos abaixo são uma adaptação editorial para o formato do
 * site, sem alterar o sentido do conteúdo original. Nenhum número, cliente,
 * case, certificação, depoimento ou tempo de mercado foi inventado.
 */

export const hero = {
  eyebrow: 'Gestão e auditoria em saúde',
  title: 'Gestão e auditoria em saúde com foco na segurança do paciente',
  titleHighlight: 'e na sustentabilidade do sistema',
  lead: 'Atuamos de forma colaborativa e preventiva, com visitas técnicas presenciais aos prestadores, estabelecendo um canal de comunicação fluido e seguro entre o beneficiário internado, a operadora de saúde e o prestador de serviço.',
  primaryCta: { label: 'Conheça nossas soluções', href: '/servicos' },
  secondaryCta: { label: 'Fale com um especialista', href: '/contato' },
  image: '/images/hero-essencial.svg',
  imageAlt:
    'Composição gráfica institucional representando o acompanhamento técnico do cuidado em saúde',
  pillars: [
    'Segurança do paciente',
    'Rigor técnico',
    'Eficiência assistencial',
    'Transparência',
  ],
};

export const valueProposition = {
  eyebrow: 'Proposta de valor',
  title: 'Validação técnica no momento em que ela ainda muda o desfecho',
  text: 'Atuamos estrategicamente in loco no prestador de serviço, com visitas técnicas presenciais que validam diretamente os tratamentos disponibilizados e monitoram a eficácia real dos cuidados no quadro clínico do paciente — no momento de maior vulnerabilidade clínica, e não depois dele.',
  image: '/images/proposta-de-valor.svg',
  imageAlt: 'Composição gráfica representando a análise técnica do processo assistencial',
  points: [
    {
      icon: 'clock',
      title: 'Atuação tempestiva e in loco',
      text: 'Visitas técnicas presenciais ao prestador, com validação do tratamento em tempo real.',
    },
    {
      icon: 'shield-check',
      title: 'Cuidado centrado no paciente',
      text: 'Proteger a vida e a dignidade do paciente acima de qualquer processo ou burocracia.',
    },
    {
      icon: 'file-check',
      title: 'Dupla checagem e evidência',
      text: 'Análise minuciosa de dados por auditores, médicos e enfermeiros, com apoio de metodologia DRG.',
    },
    {
      icon: 'handshake',
      title: 'Parceria colaborativa',
      text: 'Canal de comunicação fluido e seguro entre beneficiário, operadora e prestador.',
    },
  ],
};

export const elo = {
  eyebrow: 'O modelo Essencial',
  title: 'Um elo estratégico entre quem paga, quem assiste e quem é cuidado',
  text: 'A Essencial Saúde atua como elo estratégico entre operadoras de saúde, prestadores e beneficiários, assegurando o monitoramento concorrente da jornada assistencial. Essa integração mitiga riscos operacionais e garante que, no momento de maior vulnerabilidade clínica, o paciente receba um cuidado técnico digno, seguro e assertivo.',
  nodes: [
    {
      key: 'pagador',
      label: 'Operadora / Fonte pagadora',
      text: 'Mitigação de riscos operacionais e eficiência operacional e financeira.',
      icon: 'building-bank',
    },
    {
      key: 'essencial',
      label: 'Essencial Saúde',
      text: 'Auditores, médicos e enfermeiros in loco: dupla checagem e comunicação estruturada.',
      icon: 'logo',
    },
    {
      key: 'prestador',
      label: 'Prestador de serviços',
      text: 'Validação técnica dos tratamentos e parceria na implantação de diretrizes.',
      icon: 'hospital',
    },
    {
      key: 'paciente',
      label: 'Paciente / Beneficiário',
      text: 'Cuidado técnico digno, seguro e assertivo no momento de maior vulnerabilidade clínica.',
      icon: 'heart',
    },
  ],
};

export const benefits = {
  eyebrow: 'Benefícios',
  title: 'O que a atuação técnica busca gerar',
  text: 'Resultados que orientam cada contrato, descritos no posicionamento institucional da Essencial Saúde. Indicadores específicos são definidos em conjunto com o cliente, a partir do escopo contratado.',
  items: [
    {
      icon: 'shield-check',
      title: 'Cuidado técnico, digno e seguro',
      text: 'No momento de maior vulnerabilidade clínica, com o paciente no centro da decisão.',
    },
    {
      icon: 'target',
      title: 'Resolutividade e agilidade',
      text: 'Otimização de processos in loco no prestador, com validação conforme o perfil clínico.',
    },
    {
      icon: 'trending-down',
      title: 'Redução de NIPs e mitigação de desperdícios',
      text: 'Com impacto positivo direto no IGR da ANS e inteligência preditiva contra desperdícios.',
    },
    {
      icon: 'refresh',
      title: 'Eficiência operacional e financeira',
      text: 'Para operadoras e fontes pagadoras, sem abrir mão da qualidade assistencial.',
    },
    {
      icon: 'handshake',
      title: 'Parceria colaborativa e preventiva',
      text: 'Compartilhamento de riscos e responsabilidades entre operadora e prestador.',
    },
    {
      icon: 'eye',
      title: 'Transparência e mitigação de riscos',
      text: 'Canal de comunicação fluido e seguro entre beneficiário, operadora e prestador.',
    },
  ],
};

export const howWeWork = {
  eyebrow: 'Como atuamos',
  title: 'Um ciclo técnico que não termina no relatório',
  text: 'Visitas técnicas presenciais, dupla checagem por auditores, médicos e enfermeiros, e comunicação estruturada entre as três frentes — beneficiário, operadora e prestador — até o desfecho do caso.',
  steps: [
    {
      number: '01',
      title: 'Avaliação',
      text: 'Compreensão do contrato, do perfil assistencial e dos critérios técnicos aplicáveis ao escopo.',
      icon: 'search',
    },
    {
      number: '02',
      title: 'Visita técnica in loco',
      text: 'Acompanhamento presencial e à beira-leito, com contato direto com a equipe assistencial.',
      icon: 'activity',
    },
    {
      number: '03',
      title: 'Dupla checagem',
      text: 'Análise minuciosa de dados, apoiada em metodologia DRG e software de gestão da jornada.',
      icon: 'clipboard-check',
    },
    {
      number: '04',
      title: 'Comunicação',
      text: 'Canal fluido e seguro entre beneficiário, operadora e prestador, com registro formal.',
      icon: 'message',
    },
    {
      number: '05',
      title: 'Atuação técnica',
      text: 'Apontamentos fundamentados, Análise de Causa Raiz (ACR) e planos de ação em prazos definidos.',
      icon: 'route',
    },
    {
      number: '06',
      title: 'Melhoria e resultado',
      text: 'Desenvolvimento conjunto da rede, prevenindo reincidências e fortalecendo o sistema.',
      icon: 'trending',
    },
  ],
};

export const about = {
  eyebrow: 'Quem somos',
  title: 'Uma camada protetora entre operadoras e prestadores de saúde',
  lead: 'A Essencial Saúde Auditoria é uma empresa de gestão e auditoria em saúde sediada em Brasília - DF, que pretende atuar de forma colaborativa e preventiva para somar forças às instituições de saúde.',
  paragraphs: [
    'Por meio de visitas técnicas presenciais aos prestadores, validamos diretamente os tratamentos disponibilizados e monitoramos a eficácia real dos cuidados no quadro clínico do paciente. O objetivo é estabelecer um canal de comunicação fluido e seguro que conecte três frentes: o beneficiário internado, a operadora de saúde/fonte pagadora e o prestador de serviço.',
    'Essa integração viabiliza a mitigação de riscos operacionais e garante que, no momento de maior vulnerabilidade clínica, o paciente receba um cuidado técnico digno, seguro e assertivo. A premissa do negócio baseia-se no cuidado centrado no paciente, na qualidade e segurança dos cuidados e na máxima satisfação do beneficiário.',
    'Atuamos estrategicamente in loco no prestador de serviço para promover a otimização de processos, garantindo resolutividade e agilidade, e validando o tratamento conforme o perfil clínico. Nossos auditores — médicos e enfermeiros — realizam visitas à beira-leito e mantêm contato direto com a equipe assistencial e o médico assistente, exercendo dupla checagem e análise minuciosa de dados na rede de Brasília: hospitais de alta complexidade, unidades de transição e home care.',
    'Essa atuação é potencializada pelo uso integrado de um software de gestão da jornada do paciente, associado à metodologia DRG (Diagnosis Related Groups), que estrutura a análise das internações, mensura complexidade e prediz prorrogações de permanência — convertendo dados operacionais em previsibilidade, mitigação de riscos e conformidade regulatória.',
  ],
  image: '/images/quem-somos.svg',
  imageAlt:
    'Composição gráfica institucional representando a atuação técnica da Essencial Saúde',
  principles: [
    {
      icon: 'heart',
      title: 'Assistência centrada no paciente',
      text: 'Proteger a vida e a dignidade do paciente acima de qualquer processo ou burocracia.',
    },
    {
      icon: 'scale',
      title: 'Rigor e assertividade técnica',
      text: 'Cada validação baseada em evidências clínicas rígidas e visitas técnicas minuciosas em tempo real.',
    },
    {
      icon: 'eye',
      title: 'Integridade e transparência',
      text: 'Canais de comunicação limpos, fluidos e éticos com todas as partes envolvidas.',
    },
    {
      icon: 'handshake',
      title: 'Parceria colaborativa',
      text: 'Somar forças com operadoras/fonte pagadora e prestadores para construir soluções preventivas.',
    },
  ],
};

/** Missão, visão e valores — fonte: material institucional oficial (PDF). */
export const missionVisionValues = {
  eyebrow: 'Missão, visão e valores',
  title: 'O que orienta a nossa atuação',
  mission: {
    icon: 'target',
    title: 'Missão',
    text: 'Garantir ao paciente uma camada protetora na gestão de saúde, integrando operadoras e prestadores.',
  },
  vision: {
    icon: 'eye',
    title: 'Visão',
    text: 'Ser o modelo sustentável de proteção ao paciente, consolidando-se como a parceira estratégica indispensável para operadoras e prestadores de saúde a nível nacional em 2 anos de operação.',
  },
  values: [
    {
      icon: 'heart',
      title: 'Assistência Centrada no Paciente',
      text: 'Proteger a vida e a dignidade do paciente acima de qualquer processo ou burocracia.',
    },
    {
      icon: 'scale',
      title: 'Rigor e Assertividade Técnica',
      text: 'Basear cada validação em evidências clínicas rígidas e visitas técnicas minuciosas em tempo real.',
    },
    {
      icon: 'handshake',
      title: 'Parceria Colaborativa',
      text: 'Somar forças com operadoras/fonte pagadora e prestadores para construir soluções preventivas.',
    },
    {
      icon: 'eye',
      title: 'Integridade e Transparência',
      text: 'Manter canais de comunicação limpos, fluidos e éticos com todas as partes envolvidas.',
    },
  ],
};

/**
 * Segmentação de clientes — fonte: material institucional oficial (PDF),
 * seção "Segmentação dos clientes" e "Comportamento dos clientes".
 * Os textos de comportamento foram condensados para o formato de site,
 * preservando o sentido original.
 */
export const clientSegments = {
  eyebrow: 'Para quem atuamos',
  title: 'Organizações que precisam de leitura técnica do cuidado',
  text: 'Atendemos pessoa jurídica do ecossistema de saúde suplementar e pacientes particulares, cada perfil com necessidades e critérios de decisão próprios.',
  items: [
    {
      icon: 'building-bank',
      label: 'Operadoras de Saúde',
      detail:
        'Autogestões, cooperativas médicas, seguradoras especializadas, medicinas de grupo e entidades filantrópicas.',
      behavior:
        'Decisões racionais orientadas por três pilares: redução de custos assistenciais, melhoria de indicadores da ANS e mitigação de riscos operacionais.',
    },
    {
      icon: 'user',
      label: 'Pacientes Particulares',
      detail: 'Contratação direta do serviço de auditoria e acompanhamento.',
      behavior:
        'Buscam máxima transparência no faturamento, previsibilidade financeira e garantia de qualidade e segurança assistencial durante o tratamento.',
    },
    {
      icon: 'globe',
      label: 'Embaixadas e Consulados',
      detail: 'Atendimento ao corpo diplomático e a concidadãos no Brasil.',
      behavior:
        'Exigem governança clínica impecável, respeito a protocolos internacionais e faturamento detalhado que justifique cada intervenção com clareza.',
    },
    {
      icon: 'shield',
      label: 'Seguradoras Internacionais',
      detail: 'Seguradoras internacionais e seguros-viagem internacionais.',
      behavior:
        'Postura defensiva e foco em contenção de riscos: evitar cobranças abusivas, auditoria rigorosa, rápida resolução de sinistros e aderência a guidelines médicas globais.',
    },
    {
      icon: 'tag',
      label: 'Cartões de Desconto',
      detail: 'Empresas que operam pacotes cirúrgicos de valores fixos.',
      behavior:
        'Buscam validação técnica dos insumos do pacote e, em caso de complicações, acompanhamento clínico contínuo para a validação justa das cobranças subsequentes.',
    },
    {
      icon: 'briefcase',
      label: 'Corporações e Órgãos Públicos',
      detail: 'Contratos diretos e convênios de associação, incluindo administração pública.',
      behavior:
        'Buscam blindar o orçamento de saúde ocupacional: previsibilidade orçamentária, adequação contratual/licitatória e mitigação de desperdícios em coparticipação.',
    },
  ],
};

export const finalCta = {
  eyebrow: 'Fale com a Essencial',
  title: 'Vamos avaliar juntos o seu cenário assistencial',
  text: 'Converse com nossa equipe técnica sobre auditoria concorrente, contas hospitalares, jornada do paciente ou gestão hospitalar. Respondemos em horário comercial.',
  primary: { label: 'Solicitar uma apresentação', href: '/contato' },
};
