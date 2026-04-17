import { useState, useRef } from 'react';
import axios from 'axios';

const Tratamento = () => {
  const [vendasFiles, setVendasFiles] = useState<File[]>([]);
  const [desmembFile, setDesmembFile] = useState<File | null>(null);
  const [pdvFile, setPdvFile] = useState<File | null>(null);
  const [startingNumber, setStartingNumber] = useState(1);
  const [period, setPeriod] = useState(() => new Date().toLocaleDateString('pt-BR').replace(/\//g, '.'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ name: string; base64?: string } | null>(null);
  const vendasRef = useRef<HTMLInputElement>(null);
  const desmembRef = useRef<HTMLInputElement>(null);
  const pdvRef = useRef<HTMLInputElement>(null);

  const handleVendas = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setVendasFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      vendasFiles.forEach((file) => {
        formData.append("vendas_files", file);
      });
      if (desmembFile) {
        formData.append("desmembramentos_file", desmembFile);
      }
      formData.append("period", period);
      formData.append("starting_number", startingNumber.toString());

      const token = localStorage.getItem('token');
      const response = await axios.post("http://127.0.0.1:8000/process-spreadsheet", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.data.status === "success" && response.data.base64) {
        setResult({ 
          name: response.data.filename,
          base64: response.data.base64
        });
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar as planilhas. Verifique o terminal.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    // @ts-ignore
    if (!result || !result.base64) return;
    
    // @ts-ignore
    if (window.pywebview && window.pywebview.api) {
      // @ts-ignore
      window.pywebview.api.save_excel(result.name, result.base64)
        .then((response: any) => {
          if (response && response.sucesso) {
            console.log("Salvo com sucesso em:", response.caminho);
          }
        });
    } else {
      // Decode Base64 from backend to regular ArrayBuffer
      // @ts-ignore
      const binaryString = window.atob(result.base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // @ts-ignore
      link.download = result.name; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const canProcess = vendasFiles.length > 0 && desmembFile && !isProcessing;

  return (
    <div>
      <div className="page-header">
        <h1>Tratamento de Planilhas</h1>
        <p>Prepare os dados de vendas para a emissão de boletos.</p>
      </div>

      <div style={s.grid}>
        {/* UPLOAD COLUMN */}
        <div className="glass-card" style={s.card}>
          <h3 style={s.cardTitle}>1 — Upload de Arquivos</h3>

          {/* Vendas */}
          <div style={s.uploadSection}>
            <p style={s.uploadLabel}>Planilhas de Vendas (múltiplos DDDs)</p>
            <div style={s.dropZone} onClick={() => vendasRef.current?.click()}>
              <input ref={vendasRef} type="file" multiple accept=".xls,.xlsx,.xlsb" style={{ display: 'none' }} onChange={handleVendas} />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <p style={s.dropText}>Clique para selecionar ou arraste aqui</p>
              <p style={s.dropSub}>Arquivos .xls / .xlsx / .xlsb — Nomear como 42.xls, 47.xls...</p>
            </div>

            {vendasFiles.length > 0 && (
              <div style={s.fileList}>
                {vendasFiles.map((f, i) => (
                  <div key={i} style={s.filePill}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    </svg>
                    <span style={s.fileName}>{f.name}</span>
                    <span style={s.removeBtn} onClick={() => setVendasFiles(prev => prev.filter((_, j) => j !== i))}>✕</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desmembramentos + PDV row */}
          <div style={s.twoCol}>
            <div>
              <p style={s.uploadLabel}>Desmembramentos</p>
              <div style={{ ...s.miniZone, ...(desmembFile ? s.miniZoneFilled : {}) }} onClick={() => desmembRef.current?.click()}>
                <input ref={desmembRef} type="file" accept=".xls,.xlsx,.xlsb" style={{ display: 'none' }} onChange={e => setDesmembFile(e.target.files?.[0] || null)} />
                {desmembFile ? (
                  <>
                    <span style={{ color: '#10b981', fontSize: '0.82rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desmembFile.name}</span>
                    <span style={s.removeBtn} onClick={e => { e.stopPropagation(); setDesmembFile(null); }}>✕</span>
                  </>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Selecionar arquivo</span>
                )}
              </div>
            </div>
            <div>
              <p style={s.uploadLabel}>Tabela PDVs (opcional)</p>
              <div style={{ ...s.miniZone, ...(pdvFile ? s.miniZoneFilled : {}) }} onClick={() => pdvRef.current?.click()}>
                <input ref={pdvRef} type="file" accept=".xls,.xlsx,.xlsb" style={{ display: 'none' }} onChange={e => setPdvFile(e.target.files?.[0] || null)} />
                {pdvFile ? (
                  <>
                    <span style={{ color: '#10b981', fontSize: '0.82rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdvFile.name}</span>
                    <span style={s.removeBtn} onClick={e => { e.stopPropagation(); setPdvFile(null); }}>✕</span>
                  </>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Selecionar arquivo</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONFIG COLUMN */}
        <div className="glass-card" style={s.card}>
          <h3 style={s.cardTitle}>2 — Configuração</h3>

          <div style={s.fieldGroup}>
            <label style={s.label}>Número Inicial da Sequência</label>
            <input
              type="number"
              min={1}
              value={startingNumber}
              onChange={e => setStartingNumber(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Período de Referência</label>
            <input
              type="text"
              placeholder="Ex: 01.04.26"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={s.summary}>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>Planilhas Vendas</span>
              <span style={s.summaryValue}>{vendasFiles.length} arquivo(s)</span>
            </div>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>Desmembramentos</span>
              <span style={{ ...s.summaryValue, color: desmembFile ? '#10b981' : '#ef4444' }}>
                {desmembFile ? 'OK' : 'Pendente'}
              </span>
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            onClick={handleProcess}
            disabled={!canProcess}
          >
            {isProcessing ? (
              <>
                <span style={s.spinner} /> Processando...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Processar Planilhas
              </>
            )}
          </button>

          {result && (
            <div style={s.resultBox}>
              <div style={s.resultLeft}>
                <div style={{ color: '#10b981' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <path d="m9 15 2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{result.name}</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Pronto para download</p>
                </div>
              </div>
              <button style={s.downloadBtn} onClick={handleDownload}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Baixar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' },
  card: { padding: '28px' },
  cardTitle: { fontSize: '0.78rem', fontWeight: 700, color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px' },
  uploadSection: { marginBottom: '24px' },
  uploadLabel: { fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px', fontWeight: 500 },
  dropZone: {
    border: '2px dashed rgba(59,130,246,0.3)',
    borderRadius: '16px',
    padding: '36px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    background: 'rgba(59,130,246,0.03)',
  },
  dropText: { marginTop: '12px', fontWeight: 500, color: '#e2e8f0' },
  dropSub: { marginTop: '4px', fontSize: '0.75rem', color: '#475569' },
  fileList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' },
  filePill: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem',
  },
  fileName: { maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  removeBtn: { cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', flexShrink: 0 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' },
  miniZone: {
    display: 'flex', alignItems: 'center', gap: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '12px 14px',
    cursor: 'pointer', background: 'rgba(0,0,0,0.2)',
    marginTop: '8px', minHeight: '46px',
  },
  miniZoneFilled: {
    borderColor: 'rgba(16,185,129,0.3)',
    background: 'rgba(16,185,129,0.05)',
  },
  fieldGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 },
  summary: {
    background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
    padding: '16px', marginBottom: '20px',
  },
  summaryItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' },
  summaryLabel: { color: '#64748b' },
  summaryValue: { fontWeight: 600 },
  spinner: {
    display: 'inline-block', width: '16px', height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  resultBox: {
    marginTop: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '12px', padding: '14px 16px',
  },
  resultLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  downloadBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'transparent', color: '#10b981',
    border: '1px solid rgba(16,185,129,0.4)',
    borderRadius: '10px', padding: '8px 14px', fontWeight: 600, fontSize: '0.85rem',
    cursor: 'pointer',
  },
};

export default Tratamento;
