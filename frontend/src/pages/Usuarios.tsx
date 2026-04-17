import { useState, useEffect } from 'react';

const MENU_CATEGORIES = [
  {
    id: 'geral',
    label: 'Geral',
    items: [
      { id: 'home', label: 'Início (Página Inicial)' },
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    items: [
      { id: 'manual', label: 'Manual' },
      { id: 'tratamento', label: 'Planilha Boletos' },
      { id: 'emissao', label: 'Emissão Boletos' },
      { id: 'vencidos', label: 'Boletos Vencidos' },
      { id: 'contas', label: 'Contas a Pagar/Receber' },
      { id: 'operadoras', label: 'Operadoras' },
      { id: 'contratos', label: 'Contratos' },
      { id: 'notadebito', label: 'Nota de Débito' },
      { id: 'comissionamento', label: 'Comissionamento' },
    ]
  },
  {
    id: 'rh',
    label: 'Recursos Humanos (RH)',
    items: [
      { id: 'rh', label: 'Gestão de RH' },
    ]
  },
  {
    id: 'atendimento',
    label: 'Atendimento',
    items: [
      { id: 'atendimento', label: 'Portal Atendimento' },
    ]
  },
  {
    id: 'comercial',
    label: 'Comercial',
    items: [
      { id: 'comercial', label: 'Vendas & CRM' },
    ]
  },
  {
    id: 'admin',
    label: 'Administração',
    items: [
      { id: 'usuarios', label: 'Gestão de Usuários' },
    ]
  }
];

// Flatten for easy lookup
const ALL_MENU_IDS = MENU_CATEGORIES.flatMap(cat => cat.items.map(i => i.id));

const Usuarios = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const token = JSON.parse(localStorage.getItem('usepontox_user') || '{}').token;

  const fetchUsers = async () => {
    try {
      const res = await fetch('/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((u: any) => ({
          ...u,
          permissions: (u.permissions || []).filter((p: any) => p.has_access).map((p: any) => p.menu_item)
        }));
        setUsers(normalized);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2500);
  };

  const addUser = async () => {
    if (!newName.trim() || !newPass.trim()) return;
    setError('');
    try {
      const res = await fetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: newName.trim(), password: newPass.trim(), is_admin: false }),
      });
      if (res.ok) {
        setNewName('');
        setNewPass('');
        showSuccess('Usuário criado com sucesso!');
        fetchUsers();
      } else {
        const e = await res.json();
        setError(e.detail || 'Erro ao criar usuário.');
      }
    } catch { setError('Erro de conexão.'); }
  };

  const updatePermissions = async (userId: number, newPerms: string[]) => {
    const payload = ALL_MENU_IDS.map(id => ({
      menu_item: id,
      has_access: newPerms.includes(id)
    }));

    try {
      const res = await fetch(`/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const togglePerm = (userId: number, menuId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const current = user.permissions;
    const next = current.includes(menuId)
      ? current.filter((p: string) => p !== menuId)
      : [...current, menuId];
    updatePermissions(userId, next);
  };

  const toggleCategory = (userId: number, catId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const category = MENU_CATEGORIES.find(c => c.id === catId);
    if (!category) return;
    
    const catItemIds = category.items.map(i => i.id);
    const allSelected = catItemIds.every(id => user.permissions.includes(id));
    
    let next: string[];
    if (allSelected) {
      // Remove all from category
      next = user.permissions.filter((p: string) => !catItemIds.includes(p));
    } else {
      // Add missing from category
      const missing = catItemIds.filter(id => !user.permissions.includes(id));
      next = [...user.permissions, ...missing];
    }
    
    // Safety check for Admin + Usuarios
    if (user.is_admin && !next.includes('usuarios')) {
      next.push('usuarios');
    }
    
    updatePermissions(userId, next);
  };

  const toggleRole = async (userId: number, currentIsAdmin: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (user.username === "jrafael.m4u98@gmail.com") {
      setError("Não é possível alterar o cargo do administrador mestre");
      setTimeout(() => setError(""), 3000);
      return;
    }
    const formData = new FormData();
    formData.append("is_admin", (!currentIsAdmin).toString());
    try {
      const res = await fetch(`/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        showSuccess(`Cargo atualizado para ${!currentIsAdmin ? 'Administrador' : 'Colaborador'}`);
        fetchUsers();
      }
    } catch (err) { setError("Erro de conexão"); }
  };

  const removeUser = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este colaborador?')) return;
    try {
      const res = await fetch(`/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess('Usuário removido.');
        fetchUsers();
      }
    } catch { setError('Erro de conexão ao remover.'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Gestão de Acessos</h1>
        <p>Cadastre colaboradores e defina quais menus cada um pode acessar de forma organizada.</p>
      </div>

      {success && <div style={s.toast}><span>✓</span> {success}</div>}
      {error && <div style={{ ...s.toast, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><span>⚠</span> {error}</div>}

      {loading ? (
        <div style={{ color: 'var(--primary)', padding: '40px', textAlign: 'center' }}>Carregando colaboradores...</div>
      ) : (
        <div style={s.layout}>
          {/* Novo Usuário */}
          <div className="glass-card" style={s.createCard}>
            <h3 style={s.sectionTitle}>Novo Colaborador</h3>
            <div style={s.field}>
              <label style={s.label}>Identificação</label>
              <input type="text" placeholder="Ex: joao.silva" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Senha Provisional</label>
              <input type="password" placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ width: '100%' }} />
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={addUser}>Criar Usuário</button>
          </div>

          {/* Lista de Usuários */}
          <div style={s.usersGrid}>
            {users.map(user => (
              <div key={user.id} className="glass-card" style={s.userCard}>
                <div style={s.userHeader}>
                  <div style={s.userInfo}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Av" style={s.avatar} />
                    ) : (
                      <div style={{ ...s.avatar, background: user.is_admin ? 'var(--accent-gradient)' : 'rgba(59,130,246,0.2)' }}>
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p style={s.userName}>{user.username}</p>
                      <span style={user.is_admin ? s.adminTag : s.staffTag} onClick={() => toggleRole(user.id, user.is_admin)}>
                        {user.is_admin ? 'ADMIN' : 'COLABORADOR'}
                      </span>
                    </div>
                  </div>
                  <button style={s.deleteBtn} onClick={() => removeUser(user.id)} disabled={user.username === "jrafael.m4u98@gmail.com"}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>

                <div style={s.permsContainer}>
                  {MENU_CATEGORIES.map(cat => {
                    const catItemIds = cat.items.map(i => i.id);
                    const allInCatActive = catItemIds.every(id => user.permissions.includes(id));
                    
                    return (
                      <div key={cat.id} style={s.catSection}>
                        <div style={s.catHeader}>
                          <span style={s.catLabel}>{cat.label}</span>
                          <button 
                            style={{ ...s.selectAllBtn, color: allInCatActive ? '#10b981' : '#64748b' }}
                            onClick={() => toggleCategory(user.id, cat.id)}
                          >
                            {allInCatActive ? 'Remover Tudo' : 'Selecionar Tudo'}
                          </button>
                        </div>
                        <div style={s.permsGrid}>
                          {cat.items.map(menu => {
                            const active = user.permissions.includes(menu.id);
                            const disabled = user.is_admin && menu.id === 'usuarios';
                            return (
                              <div
                                key={menu.id}
                                style={{ 
                                  ...s.permPill, 
                                  ...(active ? s.permPillActive : {}),
                                  ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                                }}
                                onClick={() => !disabled && togglePerm(user.id, menu.id)}
                              >
                                {active ? '✓ ' : '○ '}{menu.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  layout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' },
  createCard: { padding: '24px', position: 'sticky', top: '24px' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '20px' },
  field: { marginBottom: '16px' },
  label: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '6px', display: 'block' },
  usersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' },
  userCard: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  userHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatar: { width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, objectFit: 'cover' },
  userName: { fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' },
  adminTag: { fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(14,165,233,0.15)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' },
  staffTag: { fontSize: '0.6rem', fontWeight: 800, color: '#64748b', background: 'rgba(100,116,139,0.1)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '8px', borderRadius: '8px' },
  permsContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
  catSection: { background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '12px' },
  catHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  catLabel: { fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' },
  selectAllBtn: { background: 'transparent', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  permsGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  permPill: {
    padding: '4px 10px', borderRadius: '14px', fontSize: '0.72rem', fontWeight: 600,
    background: 'rgba(255,255,255,0.03)', color: '#475569', border: '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s'
  },
  permPillActive: { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' },
  toast: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.12)', color: '#10b981',
    border: '1px solid rgba(16,185,129,0.25)', padding: '10px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
    marginBottom: '20px'
  },
};


export default Usuarios;
