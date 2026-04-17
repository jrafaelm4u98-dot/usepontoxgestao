import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Home from './pages/Home';
import Tratamento from './pages/Tratamento';
import Emissao from './pages/Emissao';
import Usuarios from './pages/Usuarios';
import BoletosVencidos from './pages/BoletosVencidos';
import Contas from './pages/Contas';
import Operadoras from './pages/Operadoras';
import Contratos from './pages/Contratos';
import NotaDebito from './pages/NotaDebito';
import Comissionamento from './pages/Comissionamento';
import RH from './pages/RH';
import Atendimento from './pages/Atendimento';
import Comercial from './pages/Comercial';
import './index.css';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('usepontox_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6366f1', fontSize: '1.2rem' }}>Carregando...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
        <Route element={user ? <Layout user={user} setUser={setUser} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Home />} />
          <Route path="/tratamento" element={<Tratamento />} />
          <Route path="/emissao" element={<Emissao />} />
          <Route path="/boletos-vencidos" element={<BoletosVencidos />} />
          <Route path="/contas" element={<Contas />} />
          <Route path="/operadoras" element={<Operadoras />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/nota-debito" element={<NotaDebito />} />
          <Route path="/comissionamento" element={<Comissionamento />} />
          <Route path="/rh" element={<RH />} />
          <Route path="/atendimento" element={<Atendimento />} />
          <Route path="/comercial" element={<Comercial />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
