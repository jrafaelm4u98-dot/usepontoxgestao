import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  setUser: (user: any) => void;
}

const Login = ({ setUser }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // O token é retornado aqui. Precisamos também buscar os dados do usuário.
        const userRes = await fetch('http://127.0.0.1:8000/users/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        if (userRes.ok) {
          const userData = await userRes.json();
          const sessionData = { ...userData, token: data.access_token };
          localStorage.setItem('usepontox_user', JSON.stringify(sessionData));
          setUser(sessionData);
          navigate('/');
        } else {
          setError('Erro ao carregar dados do usuário');
        }
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Usuário ou senha incorretos');
      }
    } catch (err: any) {
      setError(`Erro de conexão: ${err.message || 'Servidor offline'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bg1} />
      <div style={styles.bg2} />

      <div className="glass-card" style={styles.card}>
        <div style={styles.logoArea}>
          <h1 style={styles.logoTitle}>
            <span style={styles.titleMain}>UsePonto</span><span style={styles.titleX}>X</span>
          </h1>
          <p style={styles.logoSub}>SISTEMA DE GESTÃO</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Usuário</label>
            <div style={styles.inputWrap}>
              <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                placeholder="Seu usuário"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <div style={styles.inputWrap}>
              <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" className="btn-primary" style={styles.loginBtn} disabled={isLoading}>
            {isLoading ? 'Verificando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <p style={styles.footer}>USEPONTOX © 2026</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bg1: {
    position: 'fixed',
    top: 0, left: 0,
    width: '40%', height: '40%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bg2: {
    position: 'fixed',
    bottom: 0, right: 0,
    width: '40%', height: '40%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '48px 40px',
    position: 'relative',
    zIndex: 1,
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px',
    background: 'rgba(59,130,246,0.1)',
    borderRadius: '20px',
    border: '1px solid rgba(59,130,246,0.2)',
    marginBottom: '16px',
  },
  logoTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '0.5px',
    margin: 0,
    lineHeight: 1.1,
  },
  titleMain: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 800,
  },
  titleX: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 900,
    fontSize: '2.2rem',
    marginLeft: '2px',
  },
  logoSub: {
    fontSize: '0.7rem',
    letterSpacing: '4px',
    color: '#94a3b8',
    marginTop: '6px',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    paddingLeft: '44px',
  } as any,
  error: {
    color: '#ef4444',
    fontSize: '0.85rem',
    textAlign: 'center',
    margin: '-8px 0',
  },
  loginBtn: {
    width: '100%',
    marginTop: '8px',
    fontSize: '1rem',
    padding: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '28px',
    fontSize: '0.72rem',
    color: '#475569',
    letterSpacing: '0.5px',
  },
};

export default Login;
