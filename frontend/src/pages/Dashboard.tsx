import React, { useState } from 'react';

const FAQ_SECTIONS = [
  {
    module: 'Tratamento de Planilhas',
    icon: '📄',
    color: '#3b82f6',
    steps: [
      {
        q: 'Como processar uma planilha de boletos?',
        a: 'Na aba Tratamento, clique na área de upload e selecione o arquivo de vendas (.xlsx ou .xlsb). Após selecionar, defina o Período (ex: 04.2026) e o Número Inicial. Clique em Processar Planilha e aguarde.',
      },
      {
        q: 'O que é o arquivo de Desmembramentos?',
        a: 'Arquivo opcional que contém os registros de desmembramento de contratos. Quando enviado junto com a planilha de vendas, os boletos de desmembramento são incluídos no resultado automaticamente.',
      },
      {
        q: 'Como faço o download do arquivo gerado?',
        a: 'Após o processamento, um botão "Baixar Planilha" aparecerá. Clique nele e escolha onde salvar o arquivo Excel com todos os boletos organizados por filial/DDD.',
      },
      {
        q: 'Posso enviar mais de um arquivo de vendas?',
        a: 'Sim! O sistema aceita múltiplos arquivos de vendas simultaneamente. Clique em "adicionar arquivos" e selecione todos de uma vez — eles serão consolidados no processamento.',
      },
    ],
  },
  {
    module: 'Emissão de Boletos',
    icon: '⚡',
    color: '#0ea5e9',
    steps: [
      {
        q: 'Como iniciar a emissão automática?',
        a: 'Na aba Emissão, selecione a planilha de boletos gerada pelo Tratamento. Clique em "Iniciar Emissão" e aguarde a abertura do Chrome com o Banco do Brasil.',
      },
      {
        q: 'Por que preciso clicar em "Já fiz o login"?',
        a: 'O robô abre o Chrome com um perfil isolado para manter a sessão do BB ativa. Você precisa fazer login manualmente na primeira vez (ou quando a sessão expirar). Após logar, clique no botão amarelo para o robô começar.',
      },
      {
        q: 'Como gerar apenas boletos específicos?',
        a: 'Ative o toggle "Gerar apenas boletos específicos" abaixo do seletor de planilha. Digite os Nosso Números separados por ponto-e-vírgula (ex: 123456; 556899) e clique em Iniciar.',
      },
      {
        q: 'O que acontece se der erro durante a emissão?',
        a: 'O sistema tentará o boleto até 3 vezes automaticamente. Se ainda assim falhar, registrará no log em vermelho e continuará para o próximo. Você pode rever os erros no log e reprocessar apenas os que falharam usando o filtro seletivo.',
      },
      {
        q: 'Onde ficam salvos os PDFs gerados?',
        a: 'Os boletos são salvos automaticamente nas pastas configuradas por DDD (filial) no script do robô. Verifique as pastas configuradas em NOVO\\gerador_boletos.py na variável PASTAS_DDD.',
      },
    ],
  },
  {
    module: 'Boletos Vencidos Estrutural',
    icon: '🏗️',
    color: '#f59e0b',
    steps: [
      {
        q: 'Como gerar o relatório de boletos vencidos?',
        a: 'Na aba Boletos Vencidos, clique na zona de upload e selecione TODAS as planilhas de uma vez. O sistema identifica cada arquivo automaticamente pelo nome. Clique em Gerar Relatório Excel e o download inicia automático.',
      },
      {
        q: 'Como devo nomear os arquivos?',
        a: 'Os nomes precisam conter apenas a palavra-chave:\n\n• estrutural → Estrutural Listagem\n• base → Base PDV M4U\n• 42 → DDD 42\n• 47 → DDD 47\n• 61 → DDD 61\n• 63 → DDD 63\n\nExemplos válidos: estrutural_abril.xlsx, base.xlsx, 42.xlsx',
      },
      {
        q: 'Quais planilhas são obrigatórias?',
        a: 'A Estrutural Listagem é obrigatória. Além dela, envie ao menos UMA planilha do Paranaue (42, 47, 61 ou 63). A Base PDV M4U é opcional — se enviada, enriquece a coluna DESCRIÇÃO com o nome correto do estabelecimento.',
      },
      {
        q: 'Como funciona o cruzamento dos dados?',
        a: 'Todos os Nosso Números presentes nas planilhas do Paranaue (42/47/61/63) são considerados VENCIDOS. O sistema cruza esses números com a Estrutural Listagem para buscar VALOR, CÓDIGO PDV e NOME PDV de cada boleto.',
      },
      {
        q: 'No Excel gerado, como estão organizados os dados?',
        a: 'Uma aba por DDD (42, 47, 61, 63), ordenada por data de vencimento. Colunas: DATA CADASTRO • VENCIMENTO • NOME COLABORADOR • NOSSO NUMERO • VALOR R$ • CÓDIGO • DESCRIÇÃO. Com auto-filtro e valores formatados em R$.',
      },
    ],
  },
  {
    module: 'Perfil e Acesso',
    icon: '🔒',
    color: '#10b981',
    steps: [
      {
        q: 'Como altero minha senha?',
        a: 'Clique no seu nome/avatar no canto inferior esquerdo da sidebar. O painel "Meu Perfil" abrirá. Digite a nova senha e clique em Salvar alterações.',
      },
      {
        q: 'Como altero meu nome de usuário?',
        a: 'No mesmo painel "Meu Perfil" (clique no avatar na sidebar), altere o campo de identificação e salve. O nome será atualizado imediatamente na interface.',
      },
    ],
  },
];

const Dashboard = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerBadge}>📖 DOCUMENTAÇÃO</div>
        <h1 style={s.title}>Manual de Introdução</h1>
        <p style={s.subtitle}>
          Guia completo de uso do <strong style={{ color: '#3b82f6' }}>UsePonto</strong>
          <strong style={{ color: '#06b6d4' }}> X</strong>.
          Consulte as seções abaixo para entender como utilizar cada funcionalidade do sistema.
        </p>
      </div>

      {/* Quick Cards */}
      <div style={s.quickGrid}>
        {[
          { icon: '📄', label: 'Tratamento', desc: 'Processa planilhas de vendas e gera arquivo de boletos organizado por filial.', color: '#3b82f6' },
          { icon: '⚡', label: 'Emissão', desc: 'Robô automático que acessa o Banco do Brasil e emite os boletos em PDF.', color: '#0ea5e9' },
          { icon: '🏗️', label: 'Boletos Vencidos', desc: 'Gestão e reemissão de boletos vencidos da carteira Estrutural.', color: '#f59e0b' },
        ].map((c, i) => (
          <div key={i} className="glass-card" style={s.quickCard}>
            <div style={{ ...s.quickIcon, background: `rgba(${c.color === '#3b82f6' ? '59,130,246' : c.color === '#0ea5e9' ? '14,165,233' : '245,158,11'},0.12)` }}>
              <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
            </div>
            <p style={{ ...s.quickLabel, color: c.color }}>{c.label}</p>
            <p style={s.quickDesc}>{c.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ Sections */}
      <div style={s.faqContainer}>
        <h2 style={s.faqTitle}>Perguntas Frequentes</h2>

        {FAQ_SECTIONS.map((section, si) => (
          <div key={si} className="glass-card" style={s.section}>
            {/* Section header */}
            <div style={s.sectionHeader}>
              <span style={{ fontSize: '1.3rem' }}>{section.icon}</span>
              <h3 style={{ ...s.sectionTitle, color: section.color }}>{section.module}</h3>
            </div>

            {/* FAQ Items */}
            <div style={s.faqList}>
              {section.steps.map((item, qi) => {
                const key = `${si}-${qi}`;
                const open = openItems[key];
                return (
                  <div key={qi} style={s.faqItem}>
                    <button
                      style={s.faqQ}
                      onClick={() => toggle(key)}
                    >
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.q}</span>
                      <span style={{
                        ...s.faqArrow,
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: section.color,
                      }}>▾</span>
                    </button>
                    {open && (
                      <div style={{ ...s.faqA, borderLeft: `3px solid ${section.color}` }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '32px',
  },
  headerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#3b82f6',
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
    padding: '4px 12px',
    borderRadius: '20px',
    marginBottom: '14px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    margin: '0 0 10px',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    lineHeight: '1.7',
    maxWidth: '680px',
    margin: 0,
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  quickCard: {
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  quickIcon: {
    width: '44px', height: '44px',
    borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: {
    fontSize: '0.95rem',
    fontWeight: 700,
    margin: 0,
  },
  quickDesc: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.6',
  },
  faqContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
  faqTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  section: { padding: '24px' },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: '12px',
    marginBottom: '16px',
    paddingBottom: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, margin: 0 },
  faqList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  faqItem: { borderRadius: '10px', overflow: 'hidden' },
  faqQ: {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '14px 16px',
    color: 'var(--text-main)',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.2s',
  },
  faqArrow: {
    fontSize: '1.1rem',
    transition: 'transform 0.3s',
    flexShrink: 0,
  },
  faqA: {
    background: 'var(--bg-dark)',
    padding: '14px 16px 14px 20px',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: '1.7',
    marginTop: '4px',
    borderRadius: '0 0 10px 10px',
  },
};

export default Dashboard;
