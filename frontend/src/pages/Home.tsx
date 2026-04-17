const Home = () => {
  const storedUser = JSON.parse(localStorage.getItem('usepontox_user') || '{}');
  const firstName = storedUser.username?.split('@')[0].split('.')[0] || 'Usuário';

  const news = [
    { title: 'Novo Módulo Comercial', date: 'Hoje', tag: 'Destaque', content: 'A nova estrutura do módulo comercial já está disponível para integração de processos.' },
    { title: 'Manutenção Supabase', date: 'Amanhã, 02:00', tag: 'Aviso', content: 'Realizaremos uma breve manutenção para otimização do banco de dados.' },
    { title: 'Upload de Avatares', date: 'Ontem', tag: 'Novo', color: '#10b981', content: 'Agora cada colaborador pode personalizar seu perfil com uma foto!' },
  ];

  const holidays = [
    { name: 'Tiradentes', date: '21 de Abril', type: 'Feriado Nacional' },
    { name: 'Dia do Trabalho', date: '01 de Maio', type: 'Feriado Nacional' },
    { name: 'Corpus Christi', date: '19 de Junho', type: 'Ponto Facultativo' },
  ];

  return (
    <div style={s.page}>
      {/* Hero Welcome */}
      <div style={s.hero}>
        <div style={s.heroContent}>
          <div style={s.badge}>SISTEMA DE GESTÃO</div>
          <h1 style={s.heroTitle}>Olá, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}!</h1>
          <p style={s.heroSubtitle}>
            Bem-vindo ao centro de comando do <strong>UsePontoX</strong>. 
            Aqui você encontra os principais avisos e atalhos para seu dia a dia.
          </p>
        </div>
        <div style={s.statusCard}>
          <div style={s.statusDot} />
          <span>Servidores Online</span>
        </div>
      </div>

      <div style={s.grid}>
        {/* News Column */}
        <div style={s.mainCol}>
          <h2 style={s.sectionTitle}>Mural de Avisos</h2>
          <div style={s.newsList}>
            {news.map((item, i) => (
              <div key={i} className="glass-card" style={s.newsCard}>
                <div style={s.newsHeader}>
                  <span style={{ ...s.newsTag, background: item.color || 'var(--primary-light)' }}>{item.tag}</span>
                  <span style={s.newsDate}>{item.date}</span>
                </div>
                <h3 style={s.newsTitle}>{item.title}</h3>
                <p style={s.newsText}>{item.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Widgets Column */}
        <div style={s.sideCol}>
          {/* Calendar Widget */}
          <div className="glass-card" style={s.widgetCard}>
            <h3 style={s.widgetTitle}>📅 Próximos Feriados</h3>
            <div style={s.holidayList}>
              {holidays.map((h, i) => (
                <div key={i} style={s.holidayItem}>
                  <div style={s.holidayDate}>
                    <p style={{ fontWeight: 800 }}>{h.date.split(' ')[0]}</p>
                    <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>{h.date.split(' ')[2]}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={s.holidayName}>{h.name}</p>
                    <p style={s.holidayType}>{h.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats (Mock) */}
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { animation: 'fadeIn 0.5s ease' },
  hero: { 
    padding: '40px', 
    background: 'var(--accent-gradient)', 
    borderRadius: '24px', 
    marginBottom: '32px',
    display: 'flex', 
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 20px 40px rgba(59,130,246,0.15)',
    color: 'white',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: { position: 'relative', zIndex: 1 },
  badge: { 
    fontSize: '0.65rem', fontWeight: 800, letterSpacing: '2px', 
    background: 'rgba(255,255,255,0.2)', padding: '4px 12px', 
    borderRadius: '20px', width: 'fit-content', marginBottom: '16px' 
  },
  heroTitle: { fontSize: '2.5rem', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-1px' },
  heroSubtitle: { fontSize: '1rem', opacity: 0.9, maxWidth: '500px', lineHeight: '1.6' },
  statusCard: { 
    background: 'rgba(0,0,0,0.2)', padding: '10px 20px', borderRadius: '16px', 
    fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' 
  },
  statusDot: { width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' },
  
  grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' },
  mainCol: { display: 'flex', flexDirection: 'column', gap: '20px' },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '20px' },
  
  sectionTitle: { fontSize: '0.8rem', fontWeight: 800, color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' },
  
  newsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  newsCard: { padding: '24px', transition: 'transform 0.2s', cursor: 'default' },
  newsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  newsTag: { fontSize: '0.65rem', fontWeight: 800, color: 'white', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  newsDate: { fontSize: '0.75rem', color: '#64748b', fontWeight: 500 },
  newsTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' },
  newsText: { fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6' },

  widgetCard: { padding: '20px' },
  widgetTitle: { fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '20px' },
  
  holidayList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  holidayItem: { display: 'flex', alignItems: 'center', gap: '16px' },
  holidayDate: { 
    background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', 
    width: '46px', height: '46px', borderRadius: '12px', 
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
  },
  holidayName: { fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' },
  holidayType: { fontSize: '0.7rem', color: '#64748b' },
  
  statRow: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem', fontWeight: 500 
  },
  
  quoteCard: { 
    padding: '24px', background: 'rgba(255,255,255,0.02)', 
    borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' 
  },
  quote: { fontStyle: 'italic', fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' },
  quoteAuthor: { fontSize: '0.75rem', fontWeight: 700, color: '#64748b' },
};

export default Home;
