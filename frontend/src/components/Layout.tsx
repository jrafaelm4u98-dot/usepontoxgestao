import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';

interface LayoutProps {
  user: any;
  setUser: (user: any) => void;
}

const NAV_ITEMS = [
  {
    category: 'Geral',
    id: 'geral',
    items: [
      { id: 'home', label: 'Início', path: '/', permission: 'home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    ]
  },
  {
    category: 'Financeiro',
    id: 'financeiro',
    items: [
      { id: 'tratamento', label: 'Planilha Boletos', path: '/tratamento', permission: 'tratamento', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> },
      { id: 'emissao', label: 'Emissão Boletos', path: '/emissao', permission: 'emissao', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
      { id: 'boletos-vencidos', label: 'Boletos Vencidos', path: '/boletos-vencidos', permission: 'vencidos', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
      { id: 'contas', label: 'Contas a Pagar/Receber', path: '/contas', permission: 'contas', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
      { id: 'operadoras', label: 'Operadoras', path: '/operadoras', permission: 'operadoras', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
      { id: 'contratos', label: 'Contratos', path: '/contratos', permission: 'contratos', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> },
      { id: 'nota-debito', label: 'Nota de Débito', path: '/nota-debito', permission: 'notadebito', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> },
      { id: 'comissionamento', label: 'Comissionamento', path: '/comissionamento', permission: 'comissionamento', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    ]
  },
  {
    category: 'Recursos Humanos',
    id: 'rh',
    items: [
      { id: 'rh-main', label: 'Gestão de RH', path: '/rh', permission: 'rh', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    ]
  },
  {
    category: 'Atendimento',
    id: 'atendimento',
    items: [
      { id: 'atend-main', label: 'Portal Atendimento', path: '/atendimento', permission: 'atendimento', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    ]
  },
  {
    category: 'Comercial',
    id: 'comercial',
    items: [
      { id: 'comercial-main', label: 'Vendas & CRM', path: '/comercial', permission: 'comercial', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg> },
    ]
  }
];

const Layout = ({ user, setUser }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = React.useState(false);
  const [profUser, setProfUser]       = React.useState(user.username);
  const [profPass, setProfPass]       = React.useState('');
  const [profMsg,  setProfMsg]        = React.useState('');
  const [profErr,  setProfErr]        = React.useState('');
  const [saving,   setSaving]         = React.useState(false);
  const [theme, setTheme]             = React.useState(() => localStorage.getItem('usepontox_theme') || 'dark');
  const [expandedCats, setExpandedCats] = React.useState<Set<string>>(new Set());
  const [avatarUrl, setAvatarUrl]     = React.useState(user.avatar_url);
  const fileInputRef                  = React.useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  React.useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('usepontox_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const toggleCategory = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const hasPermission = (permId: string | null) => {
    if (!permId) return true;
    
    // Administradores sempre vêem a gestão de usuários para evitar "auto-lockout"
    if (user.is_admin && permId === 'usuarios') return true;
    
    // Agora todos os outros menus (mesmo para Admin) respeitam as "bolinhas"
    return user.permissions?.some((p: any) => {
      if (typeof p === 'string') return p === permId;
      return p.menu_item === permId && p.has_access === true;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('usepontox_user');
    setUser(null);
    navigate('/login');
  };

  const saveProfile = async () => {
    setSaving(true); setProfMsg(''); setProfErr('');
    try {
      const token = JSON.parse(localStorage.getItem('usepontox_user') || '{}').token;
      const res = await fetch('/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: profUser || undefined, password: profPass || undefined }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setProfErr(e.detail || 'Erro ao salvar.');
      } else {
        const updated = await res.json();
        const stored = JSON.parse(localStorage.getItem('usepontox_user') || '{}');
        stored.username = updated.username;
        localStorage.setItem('usepontox_user', JSON.stringify(stored));
        setUser({ ...user, username: updated.username });
        setProfPass('');
        setProfMsg('Perfil salvo com sucesso!');
        setTimeout(() => setProfMsg(''), 3000);
      }
    } catch { setProfErr('Erro de conexão.'); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setProfErr('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = JSON.parse(localStorage.getItem('usepontox_user') || '{}').token;
      const res = await fetch('/me/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setProfErr(err.detail || 'Erro ao subir imagem.');
      } else {
        const data = await res.json();
        setAvatarUrl(data.avatar_url);
        
        // Atualiza localstorage
        const stored = JSON.parse(localStorage.getItem('usepontox_user') || '{}');
        stored.avatar_url = data.avatar_url;
        localStorage.setItem('usepontox_user', JSON.stringify(stored));
        
        // Atualiza estado global se necessário
        setUser({ ...user, avatar_url: data.avatar_url });
      }
    } catch {
      setProfErr('Erro de conexão ao subir avatar.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderNavItems = () => {
    return NAV_ITEMS.map((cat: any) => {
      const categoryItems = cat.items.filter((item: any) => hasPermission(item.permission));
      if (categoryItems.length === 0) return null;

      const isExpanded = expandedCats.has(cat.id);

      return (
        <div key={cat.id} style={{ marginTop: '16px' }}>
          <button 
            onClick={() => toggleCategory(cat.id)}
            style={{
              ...styles.categoryHeader,
              color: isExpanded ? 'var(--primary)' : 'var(--text-muted)'
            }}
          >
            <span>{cat.category}</span>
            <svg 
              style={{ 
                marginLeft: 'auto', 
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          
          <div style={{ 
            overflow: 'hidden', 
            maxHeight: isExpanded ? '500px' : '0',
            transition: 'max-height 0.3s ease-in-out',
            opacity: isExpanded ? 1 : 0,
            paddingLeft: '4px'
          }}>
            {categoryItems.map(renderLink)}
          </div>
        </div>
      );
    });
  };

  const renderLink = (item: any) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.id}
        to={item.path}
        style={{
          ...styles.navItem,
          ...(isActive ? styles.navItemActive : {})
        }}
      >
        {item.icon}
        <span style={{ marginLeft: '12px', fontWeight: 500 }}>{item.label}</span>
        {isActive && (
          <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        )}
      </Link>
    );
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside className="glass-card" style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoTextBlock}>
            <p style={styles.sidebarTitle}>
              <span style={styles.titleMain}>UsePonto</span><span style={styles.titleX}>X</span>
            </p>
            <p style={styles.sidebarSub}>SISTEMA DE GESTÃO</p>
          </div>
        </div>

        <nav style={styles.nav}>
          {renderNavItems()}
        </nav>

        {hasPermission('usuarios') && (
          <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
            <p style={styles.categoryTitle}>Administração</p>
            <Link
              to="/usuarios"
              style={{
                ...styles.navItem,
                ...(location.pathname === '/usuarios' ? styles.navItemActive : {})
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span style={{ marginLeft: '12px', fontWeight: 500 }}>Usuários</span>
            </Link>
          </div>
        )}

        <div style={styles.sidebarBottom}>
          <div
            style={{ ...styles.userBadge, cursor: 'pointer' }}
            onClick={() => setShowProfile(true)}
            title="Editar perfil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={styles.userAvatar} />
            ) : (
              <div style={styles.userAvatar}>{user.username[0].toUpperCase()}</div>
            )}
            <div>
              <p style={styles.userName}>{user.username}</p>
              <p style={styles.userRole}>{user.is_admin ? 'Administrador' : 'Colaborador'}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn} title="Sair">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Modal Perfil */}
      {showProfile && (
        <div style={styles.overlay} onClick={() => setShowProfile(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Meu Perfil</h2>
              <button style={styles.closeBtn} onClick={() => setShowProfile(false)}>✕</button>
            </div>

            <div style={styles.modalAvatar}>
              <div 
                style={{ ...styles.bigAvatar, cursor: 'pointer', position: 'relative' }} 
                onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Big Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  user.username[0].toUpperCase()
                )}
                <div style={{
                  position: 'absolute', bottom: 0, right: 0, 
                  background: 'var(--primary)', borderRadius: '50%', 
                  width: '24px', height: '24px', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #1e293b'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                {uploadingAvatar && (
                  <div style={{
                    position: 'absolute', inset: 0, 
                    background: 'rgba(0,0,0,0.4)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={styles.loaderSmall} />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleAvatarUpload} 
              />
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.username}</p>
                <p style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>{user.is_admin ? 'ADMINISTRADOR' : 'COLABORADOR'}</p>
              </div>
            </div>

            <div style={styles.modalField}>
              <label style={styles.fieldLabel}>Nome de usuário</label>
              <input
                value={profUser}
                onChange={e => setProfUser(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' } as React.CSSProperties}
                placeholder="Novo nome de usuário"
              />
            </div>

            <div style={styles.modalField}>
              <label style={styles.fieldLabel}>Nova senha <span style={{ color: '#475569' }}>(deixe vazio para manter a atual)</span></label>
              <input
                type="password"
                value={profPass}
                onChange={e => setProfPass(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' } as React.CSSProperties}
                placeholder="••••••••"
              />
            </div>

            {profMsg && <p style={styles.msgOk}>{profMsg}</p>}
            {profErr && <p style={styles.msgErr}>{profErr}</p>}

            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.header}>
          <button onClick={toggleTheme} style={styles.themeToggle} title="Alternar tema">
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </header>

        <div style={styles.pageWrapper}>
          <Outlet />
        </div>
        <footer style={styles.footer}>
          Desenvolvido por <strong style={{ color: 'var(--primary)' }}>José Rafael</strong>
          <span style={{ color: '#334155', margin: '0 8px' }}>|</span>
          CEO <strong style={{ background: 'linear-gradient(90deg,#0ea5e9,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>UseP<span>onto</span> X</strong>
          <span style={{ color: '#334155', margin: '0 8px' }}>|</span>
          <span style={{ color: '#64748b', fontSize: '11px' }}>CNPJ: 64.785.311/0001-96</span>
        </footer>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    gap: '0',
  },
  sidebar: {
    width: '260px',
    minWidth: '260px',
    margin: '16px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    height: 'calc(100vh - 32px)',
    position: 'sticky',
    top: '16px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 8px 28px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    marginBottom: '20px',
  },
  logoTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  sidebarTitle: {
    fontWeight: 800,
    fontSize: '1rem',
    letterSpacing: '0.5px',
    margin: 0,
    lineHeight: 1.1,
  },
  titleMain: {
    background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 800,
  },
  titleX: {
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 900,
    fontSize: '1.15rem',
    marginLeft: '1px',
  },
  sidebarSub: {
    fontSize: '0.65rem',
    color: '#475569',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '12px',
    color: '#64748b',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  navItemActive: {
    background: 'var(--accent-gradient)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
  },
  sidebarBottom: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
    paddingTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    overflow: 'hidden',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    background: 'var(--accent-gradient)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: 'white',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '0.65rem',
    color: 'var(--primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  logoutBtn: {
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '10px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  pageWrapper: {
    flex: 1,
    padding: '32px 28px',
    overflowY: 'auto',
  },
  footer: {
    padding: '12px 28px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    fontSize: '0.75rem',
    color: '#334155',
    textAlign: 'center',
    flexShrink: 0,
    letterSpacing: '0.3px',
  },
  // ── Modal Perfil ──────────────────────────────────────────
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#0f172a',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '20px',
    padding: '32px',
    width: '380px',
    maxWidth: '90vw',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '1.1rem', fontWeight: 700, margin: 0,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  modalAvatar: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '16px',
    background: 'rgba(59,130,246,0.06)',
    borderRadius: '14px',
    border: '1px solid rgba(59,130,246,0.12)',
  },
  bigAvatar: {
    width: '52px', height: '52px',
    background: 'var(--accent-gradient)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '1.3rem', color: 'white', flexShrink: 0,
  },
  modalField: {
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  fieldLabel: {
    fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500,
  },
  msgOk: {
    color: '#10b981', fontSize: '0.82rem', margin: 0,
    background: 'rgba(16,185,129,0.1)', padding: '8px 12px', borderRadius: '8px',
  },
  msgErr: {
    color: '#ef4444', fontSize: '0.82rem', margin: 0,
    background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px',
  },
  categoryTitle: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 700,
    padding: '0 16px 8px',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    fontSize: '0.65rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '16px 28px',
  },
  themeToggle: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
};

export default Layout;
