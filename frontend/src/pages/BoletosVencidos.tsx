import React, { useState, useRef } from 'react';

// ── Detecção automática de arquivos pelo nome ──────────────────────────────
const SLOT_KEYS = ['estrutural', 'base_pdv', 'paranaue_42', 'paranaue_47', 'paranaue_61', 'paranaue_63'] as const;
type SlotKey = typeof SLOT_KEYS[number];

const SLOT_META: Record<SlotKey, { label: string; required: boolean; color: string }> = {
  estrutural:  { label: 'Estrutural Listagem', required: true,  color: '#3b82f6' },
  base_pdv:    { label: 'Base',                required: false, color: '#06b6d4' },
  paranaue_42: { label: '42',                  required: false, color: '#f59e0b' },
  paranaue_47: { label: '47',                  required: false, color: '#f59e0b' },
  paranaue_61: { label: '61',                  required: false, color: '#f59e0b' },
  paranaue_63: { label: '63',                  required: false, color: '#f59e0b' },
};

function detectSlot(filename: string): SlotKey | null {
  const n = filename.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (n.includes('estrutural')) return 'estrutural';
  if (n.includes('base'))       return 'base_pdv';
  if (n.includes('42'))         return 'paranaue_42';
  if (n.includes('47'))         return 'paranaue_47';
  if (n.includes('61'))         return 'paranaue_61';
  if (n.includes('63'))         return 'paranaue_63';
  return null;
}

const BoletosVencidos = () => {
  const [files, setFiles]       = useState<Partial<Record<SlotKey, File>>>({});
  const [unmatched, setUnmatched] = useState<File[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    const newFiles: Partial<Record<SlotKey, File>> = { ...files };
    const notMatched: File[] = [];

    Array.from(selected).forEach(file => {
      const slot = detectSlot(file.name);
      if (slot) newFiles[slot] = file;
      else notMatched.push(file);
    });

    setFiles(newFiles);
    setUnmatched(notMatched);
    setError('');
    setSuccess('');
  };

  const removeFile = (key: SlotKey) => {
    setFiles(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const hasParanaue = ['paranaue_42','paranaue_47','paranaue_61','paranaue_63']
    .some(k => !!files[k as SlotKey]);
  const canProcess = !!files.estrutural && hasParanaue;

  const handleProcess = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      SLOT_KEYS.forEach(key => { if (files[key]) fd.append(key, files[key]!); });

      const res = await fetch('/process-vencidos', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
        setError(err.detail || 'Erro ao processar.');
        return;
      }

      const data = await res.json();
      
      // Tenta salvar usando a API nativa do pywebview se estiver no desktop
      // @ts-ignore
      if (window.pywebview && window.pywebview.api) {
        // @ts-ignore
        await window.pywebview.api.save_excel(data.filename, data.base64);
      } else {
        // Fallback pra navegador comum
        const blob = new Blob(
          [Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = data.filename; a.click();
        URL.revokeObjectURL(url);
      }

      const ddds = (['42','47','61','63'] as const)
        .filter(d => !!files[`paranaue_${d}` as SlotKey])
        .map(d => `DDD ${d}`).join(', ');
      setSuccess(`Relatório gerado com sucesso — ${ddds}!`);
    } catch (e: any) {
      setError(e.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const totalSelected = Object.keys(files).length;

  return (
    <div>
      <div className="page-header">
        <h1>Boletos Vencidos Estrutural</h1>
        <p>Selecione todas as planilhas de uma vez — o sistema identifica cada arquivo automaticamente pelo nome.</p>
      </div>

      <div style={s.layout}>
        {/* ── Zona de upload única ── */}
        <div className="glass-card" style={s.card}>

          {/* Drop zone principal */}
          <div
            style={s.bigDrop}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); handleFilesSelected(e.dataTransfer.files); }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.xlsb,.xlsm"
              style={{ display: 'none' }}
              onChange={e => handleFilesSelected(e.target.files)}
            />
            <div style={s.bigDropIcon}>📂</div>
            <p style={s.bigDropTitle}>
              {totalSelected === 0 ? 'Clique ou arraste os arquivos aqui' : `${totalSelected} arquivo${totalSelected > 1 ? 's' : ''} selecionado${totalSelected > 1 ? 's' : ''}`}
            </p>
            <p style={s.bigDropSub}>
              Selecione todos de uma vez · .xlsx · .xlsb · .xls
            </p>
          </div>

          {/* Lista de arquivos detectados */}
          {totalSelected > 0 && (
            <div style={s.detectedList}>
              <p style={s.detectedTitle}>Arquivos Identificados</p>
              {SLOT_KEYS.map(key => {
                const meta = SLOT_META[key];
                const file = files[key];
                return (
                  <div key={key} style={{ ...s.detectedRow, opacity: file ? 1 : 0.35 }}>
                    <div style={{ ...s.detectedDot, background: file ? meta.color : '#1e293b' }} />
                    <div style={s.detectedInfo}>
                      <span style={{ ...s.detectedLabel, color: file ? '#f1f5f9' : '#475569' }}>
                        {meta.label}
                        {meta.required && !file && <span style={s.reqWarn}> ← obrigatório</span>}
                      </span>
                      {file && <span style={s.detectedFile}>{file.name}</span>}
                    </div>
                    {file && (
                      <button style={s.removeBtn} onClick={() => removeFile(key)}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Não identificados */}
          {unmatched.length > 0 && (
            <div style={s.unmatchedBox}>
              <p style={s.unmatchedTitle}>⚠️ Não identificados automaticamente</p>
              <p style={s.unmatchedSub}>
                Renomeie os arquivos incluindo palavras-chave: <strong>estrutural</strong>, <strong>base pdv</strong>, <strong>42</strong>, <strong>47</strong>, <strong>61</strong>, <strong>63</strong>
              </p>
              {unmatched.map((f, i) => (
                <div key={i} style={s.unmatchedFile}>📄 {f.name}</div>
              ))}
            </div>
          )}

          {/* Alertas */}
          {error   && <div style={s.errBox}>{error}</div>}
          {success && <div style={s.okBox}>{success}</div>}

          {/* Botão gerar */}
          <button
            className="btn-primary"
            style={{ ...s.btn, opacity: (!canProcess || loading) ? 0.5 : 1, transition: 'opacity 0.2s' }}
            disabled={!canProcess || loading}
            onClick={handleProcess}
          >
            {loading
              ? <><span style={s.spinner} /> Gerando relatório...</>
              : <><span>⬇</span> Gerar Relatório Excel</>
            }
          </button>

          {!files.estrutural && totalSelected > 0 && (
            <p style={s.tip}>⚠️ Nenhum arquivo identificado como "Estrutural Listagem". Renomeie o arquivo para incluir a palavra <strong>estrutural</strong>.</p>
          )}
          {files.estrutural && !hasParanaue && (
            <p style={s.tip}>⚠️ Nenhuma planilha do Paranaue identificada. Renomeie os arquivos com o número do DDD (42, 47, 61 ou 63).</p>
          )}
        </div>

        {/* ── Painel informativo ── */}
        <div style={s.infoCol}>
          <div className="glass-card" style={s.infoCard}>
            <p style={s.infoTitle}>Como nomear os arquivos</p>
            {[
              { ex: 'estrutural_listagem.xls(x)', label: 'Estrutural Listagem' },
              { ex: 'base.xls(x)',                label: 'Base' },
              { ex: '42.xls(x)',                  label: '42' },
              { ex: '47.xls(x)',                  label: '47' },
              { ex: '61.xls(x)',                  label: '61' },
              { ex: '63.xls(x)',                  label: '63' },
            ].map((r, i) => (
              <div key={i} style={s.exRow}>
                <code style={s.exCode}>{r.ex}</code>
                <span style={s.exArrow}>→</span>
                <span style={s.exLabel}>{r.label}</span>
              </div>
            ))}
            <p style={s.infoNote}>Aceita .xls · .xlsx · .xlsb · .xlsm — o nome não precisa ser exato, basta conter a palavra-chave.</p>
          </div>

          <div className="glass-card" style={s.infoCard}>
            <p style={s.infoTitle}>Formato de saída</p>
            {['DATA CADASTRO','VENCIMENTO','NOME COLABORADOR','NOSSO NUMERO','VALOR R$','CÓDIGO','DESCRIÇÃO'].map(c => (
              <div key={c} style={s.outRow}>
                <span style={s.outDot} />
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{c}</span>
              </div>
            ))}
            <p style={s.infoNote}>Uma aba por DDD · Ordenado por Vencimento · Auto-filtro</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  layout:        { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' },
  card:          { padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' },
  bigDrop: {
    border: '2px dashed rgba(59,130,246,0.25)',
    borderRadius: '16px', padding: '40px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
    cursor: 'pointer', background: 'rgba(59,130,246,0.04)',
    transition: 'border-color 0.2s, background 0.2s',
    textAlign: 'center',
  },
  bigDropIcon:  { fontSize: '2.5rem', lineHeight: 1 },
  bigDropTitle: { fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 },
  bigDropSub:   { fontSize: '0.8rem', color: '#475569', margin: 0 },
  detectedList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  detectedTitle:{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 },
  detectedRow:  { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', transition: 'opacity 0.2s' },
  detectedDot:  { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' },
  detectedInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  detectedLabel:{ fontSize: '0.82rem', fontWeight: 600 },
  detectedFile: { fontSize: '0.73rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  reqWarn:      { color: '#ef4444', fontWeight: 400 },
  removeBtn:    { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0 },
  unmatchedBox: { background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' },
  unmatchedTitle:{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', margin: 0 },
  unmatchedSub: { fontSize: '0.75rem', color: '#78716c', margin: 0, lineHeight: '1.5' },
  unmatchedFile:{ fontSize: '0.75rem', color: '#44403c', background: 'rgba(0,0,0,0.15)', padding: '4px 10px', borderRadius: '6px' },
  errBox:       { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', lineHeight: '1.5' },
  okBox:        { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600 },
  btn:          { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' },
  tip:          { fontSize: '0.75rem', color: '#f59e0b', margin: 0, lineHeight: '1.5' },
  spinner:      { display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  infoCol:      { display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '20px' },
  infoCard:     { padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  infoTitle:    { fontSize: '0.72rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px' },
  exRow:        { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' },
  exCode:       { color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  exArrow:      { color: '#334155', flexShrink: 0 },
  exLabel:      { color: '#64748b', flexShrink: 0, fontSize: '0.72rem' },
  infoNote:     { fontSize: '0.7rem', color: '#334155', margin: '6px 0 0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' },
  outRow:       { display: 'flex', alignItems: 'center', gap: '8px' },
  outDot:       { width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 },
};

export default BoletosVencidos;
