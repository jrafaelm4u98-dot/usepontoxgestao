import { useState, useEffect, useRef } from 'react';

type LogEntry = { time: string; msg: string; type: 'info' | 'ok' | 'warn' | 'error' };

const Emissao = () => {
  const [planilhaFile, setPlanilhaFile]   = useState<File | null>(null);
  const [filtroAtivo, setFiltroAtivo]     = useState(false);
  const [filtroTexto, setFiltroTexto]     = useState('');
  const [isRunning, setIsRunning]         = useState(false);
  const [isPaused, setIsPaused]           = useState(false);
  const [done, setDone]                   = useState(false);
  const [logs, setLogs]                   = useState<LogEntry[]>([]);
  const [progress, setProgress]           = useState({ done: 0, total: 0 });
  const [selectedDdds, setSelectedDdds]   = useState<string[]>(['42', '47', '61', '63']);
  const fileRef                           = useRef<HTMLInputElement>(null);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, { time, msg, type }]);
  };

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Inicia o bot ──────────────────────────────────────────────────────────
  const startBot = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setDone(false);
    setLogs([]);
    setProgress({ done: 0, total: 0 });

    const formData = new FormData();
    if (planilhaFile) {
      formData.append('planilha', planilhaFile);
    }
    if (filtroAtivo && filtroTexto.trim()) {
      formData.append('filtro', filtroTexto.trim());
    }
    formData.append('ddds', selectedDdds.join(','));
    try {
      const response = await fetch('/run-bot', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        addLog(`❌ Erro ao iniciar robô: ${err.detail || response.statusText}`, 'error');
        setIsRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        addLog('❌ Resposta inválida do servidor.', 'error');
        setIsRunning(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const payload = JSON.parse(jsonStr) as { msg: string; type: string };

            if (payload.msg === '__DONE__') {
              setDone(true);
              setIsRunning(false);
              break;
            }

            // Ignora sinais internos
            if (payload.msg.startsWith('__')) continue;

            if (payload.msg.includes('boleto(s) encontrado(s)')) {
              const m = payload.msg.match(/(\d+)/);
              if (m) setProgress(p => ({ ...p, total: parseInt(m[1]) }));
            }

            if (payload.type === 'ok' && /\(\d+\/\d+\)/.test(payload.msg)) {
              setProgress(p => ({ ...p, done: p.done + 1 }));
            }

            const t = (['info','ok','warn','error'].includes(payload.type)
              ? payload.type : 'info') as LogEntry['type'];
            addLog(payload.msg, t);
          } catch { /* ignora */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        addLog(`❌ Conexão perdida: ${(err as Error).message}`, 'error');
      }
    }

    setIsRunning(false);
  };

  // ── Confirma o login ──────────────────────────────────────────────────────
  const confirmarLogin = async () => {
    await fetch('/bot-login-ok', { method: 'POST' });
    addLog('🔑 Login confirmado! O bot vai continuar...', 'ok');
  };

  // ── Pausa/Retoma o bot ───────────────────────────────────────────────────
  const togglePause = async () => {
    try {
      const res = await fetch('/bot-stop', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setIsPaused(data.status === 'paused');
        addLog(data.status === 'paused' ? '⏸️ Bot em PAUSA.' : '▶️ Bot RETOMADO.', data.status === 'paused' ? 'warn' : 'ok');
      }
    } catch (err) {
      addLog('❌ Erve ao alternar pausa.', 'error');
    }
  };

  const logColors: Record<string, string> = {
    info:  '#94a3b8',
    ok:    '#10b981',
    warn:  '#f59e0b',
    error: '#ef4444',
  };

  return (
    <div>
      <div className="page-header">
        <h1>Emissão de Boletos</h1>
        <p>UsePontoX — Emissão Automática no portal Banco do Brasil.</p>
      </div>

      <div style={s.grid}>
        {/* ── Controles ── */}
        <div className="glass-card" style={s.card}>
          <h3 style={s.sectionTitle}>Controle do Robô</h3>

          {/* Seletor de planilha */}
          <p style={s.label}>Planilha de Boletos</p>
          <div
            style={{ ...s.fileZone, ...(planilhaFile ? s.fileZoneFilled : {}) }}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsb"
              style={{ display: 'none' }}
              onChange={e => setPlanilhaFile(e.target.files?.[0] || null)}
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={planilhaFile ? '#10b981' : '#64748b'} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontSize: '0.83rem', flex: 1, color: planilhaFile ? '#10b981' : '#64748b',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {planilhaFile ? planilhaFile.name : 'Selecionar planilha de boletos (.xlsx / .xlsb)...'}
            </span>
            {planilhaFile && (
              <span style={s.removeBtn}
                onClick={e => { e.stopPropagation(); setPlanilhaFile(null); }}>✕</span>
            )}
          </div>
          
          {/* ── Seleção de Filiais (DDD) ── */}
          <div style={s.dddContainer}>
            <p style={s.label}>Filiais a Processar</p>
            <div style={s.dddGrid}>
              {['42', '47', '61', '63'].map(ddd => (
                <label key={ddd} style={s.dddLabel}>
                  <input
                    type="checkbox"
                    checked={selectedDdds.includes(ddd)}
                    disabled={isRunning}
                    onChange={e => {
                      if (e.target.checked) setSelectedDdds(prev => [...prev, ddd]);
                      else setSelectedDdds(prev => prev.filter(x => x !== ddd));
                    }}
                    style={s.checkbox}
                  />
                  <span>DDD {ddd}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Filtro Seletivo ── */}
          <div style={s.filtroBox}>
            <div
              style={s.filtroToggle}
              onClick={() => !isRunning && setFiltroAtivo(v => !v)}
            >
              <div style={{ ...s.togglePill, ...(filtroAtivo ? s.toggleOn : {}) }}>
                <div style={{ ...s.toggleThumb, ...(filtroAtivo ? s.thumbOn : {}) }} />
              </div>
              <span style={{ fontSize: '0.83rem', color: filtroAtivo ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
                {filtroAtivo ? '🎯 Gerar apenas boletos específicos' : 'Gerar todos os boletos da planilha'}
              </span>
            </div>

            {filtroAtivo && (
              <>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '8px 0 4px' }}>
                  Digite os <strong>Nosso Números</strong> separados por <code>;</code>, vírgula ou use intervalos (ex: <code>123-130</code>):
                </p>
                <textarea
                  style={s.filtroTextarea}
                  placeholder={'Ex: 123456; 556899; 789012'}
                  value={filtroTexto}
                  onChange={e => setFiltroTexto(e.target.value)}
                  rows={3}
                  disabled={isRunning}
                />
                {filtroTexto.trim() && (
                  <p style={{ fontSize: '0.72rem', color: '#f59e0b', margin: '4px 0 0' }}>
                    {filtroTexto.split(/[;,\n]+/).filter(x => x.trim()).length} boleto(s) selecionado(s)
                  </p>
                )}
              </>
            )}
          </div>

          {/* Botões Iniciar / Parar */}
          <div style={s.btnRow}>
            <button
              className="btn-primary"
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={startBot}
              disabled={isRunning || !planilhaFile}
            >
              {isRunning ? (
                <><span style={s.spinner} /> Rodando...</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Iniciar Emissão
                </>
              )}
            </button>
            <button
              style={{ 
                ...s.stopBtn, 
                opacity: isRunning ? 1 : 0.4,
                cursor: isRunning ? 'pointer' : 'not-allowed',
                background: isPaused ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                color: isPaused ? '#10b981' : '#ef4444',
                borderColor: isPaused ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)',
              }}
              onClick={togglePause}
              disabled={!isRunning}
            >
              {isPaused ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Continuar
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                  Pausar
                </>
              )}
            </button>
          </div>

          {/* Botão de confirmar login — sempre visível quando rodando */}
          {isRunning && (
            <button style={s.loginBtn} onClick={confirmarLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              ✅ Já fiz o Login — Pode continuar!
            </button>
          )}

          {/* Status */}
          <div style={s.statusBox}>
            <div style={s.statusRow}>
              <span style={s.statusLabel}>Status</span>
              <span style={{ fontWeight: 700,
                color: done ? 'var(--primary)' : isRunning ? 'var(--success)' : 'var(--text-muted)' }}>
                {done ? '✓ Concluído' : isRunning ? '● Em Execução' : '○ Aguardando'}
              </span>
            </div>
            <div style={s.statusRow}>
              <span style={s.statusLabel}>Progresso</span>
              <span style={{ fontWeight: 700 }}>{progress.done} / {progress.total || '—'}</span>
            </div>
            {progress.total > 0 && (
              <div style={s.progressTrack}>
                <div style={{ ...s.progressFill,
                  width: `${Math.min((progress.done / progress.total) * 100, 100)}%` }} />
              </div>
            )}
          </div>

          <div style={s.safetyNote}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Execução local e segura. Os dados não saem deste computador.
          </div>
        </div>

        {/* ── Terminal ── */}
        <div style={s.terminal}>
          <div style={s.termHeader}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ ...s.termDot, background: '#ef4444' }} />
              <div style={{ ...s.termDot, background: '#f59e0b' }} />
              <div style={{ ...s.termDot, background: '#10b981' }} />
            </div>
            <span style={s.termTitle}>Log do Robô — UsePontoX</span>
            <span style={s.clearBtn} onClick={() => setLogs([])}>Limpar</span>
          </div>
          <div style={s.termBody} ref={terminalRef}>
            {logs.length === 0 ? (
              <div style={s.emptyLog}>_ Aguardando início do robô...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={s.logLine}>
                  <span style={s.logTime}>[{log.time}]</span>{' '}
                  <span style={{ color: logColors[log.type] }}>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  grid:     { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' },
  card:     { padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionTitle: { fontSize: '0.78rem', fontWeight: 700, color: '#64748b',
    letterSpacing: '2px', textTransform: 'uppercase', margin: 0 },
  label:    { fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500, margin: 0 },
  fileZone: {
    display: 'flex', alignItems: 'center', gap: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '14px 16px',
    cursor: 'pointer', background: 'rgba(0,0,0,0.2)',
  },
  fileZoneFilled: { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' },
  removeBtn: { color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' },
  btnRow:   { display: 'flex', gap: '10px' },
  stopBtn:  {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '10px',
    fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', fontWeight: 600,
  },
  loginBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    background: 'var(--accent-gradient)',
    color: '#000', border: 'none', borderRadius: '12px', padding: '14px',
    fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', fontWeight: 700,
    cursor: 'pointer',
  },
  statusBox: { background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px' },
  statusRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' },
  statusLabel: { color: '#64748b' },
  progressTrack: { height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginTop: '8px' },
  progressFill:  { height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--success))',
    borderRadius: '4px', transition: 'width 0.5s' },
  safetyNote: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#475569' },
  spinner:   {
    display: 'inline-block', width: '16px', height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  terminal:  {
    background: '#020617', border: '1px solid #1e293b', borderRadius: '20px',
    overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '500px',
  },
  termHeader: {
    background: '#0f172a', padding: '12px 20px',
    display: 'flex', alignItems: 'center', gap: '12px',
    borderBottom: '1px solid #1e293b',
  },
  termDot:  { width: '12px', height: '12px', borderRadius: '50%' },
  termTitle: { flex: 1, fontSize: '0.82rem', color: '#64748b', textAlign: 'center' },
  clearBtn: { fontSize: '0.72rem', color: '#475569', cursor: 'pointer' },
  termBody:  {
    flex: 1, padding: '20px',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '0.85rem', lineHeight: '1.6', overflowY: 'auto',
  },
  filtroBox: {
    background: 'rgba(0,0,0,0.15)',
    borderRadius: '12px',
    padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  filtroToggle: {
    display: 'flex', alignItems: 'center', gap: '12px',
    cursor: 'pointer', userSelect: 'none',
  } as React.CSSProperties,
  togglePill: {
    width: '40px', height: '22px', borderRadius: '11px',
    background: 'rgba(255,255,255,0.1)', position: 'relative',
    transition: 'background 0.2s', flexShrink: 0,
  } as React.CSSProperties,
  toggleOn: { background: 'rgba(245,158,11,0.4)' },
  toggleThumb: {
    position: 'absolute', top: '3px', left: '3px',
    width: '16px', height: '16px', borderRadius: '50%',
    background: '#64748b', transition: 'left 0.2s, background 0.2s',
  } as React.CSSProperties,
  thumbOn: { left: '21px', background: '#f59e0b' },
  filtroTextarea: {
    width: '100%', background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px',
    color: '#f1f5f9', padding: '10px 12px', fontSize: '0.82rem',
    fontFamily: "'Courier New', Courier, monospace",
    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
  } as React.CSSProperties,
  dddContainer: {
    padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)'
  },
  dddGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px'
  },
  dddLabel: {
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
    fontSize: '0.82rem', color: '#cbd5e1'
  },
  checkbox: {
    accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer'
  }
};

export default Emissao;
