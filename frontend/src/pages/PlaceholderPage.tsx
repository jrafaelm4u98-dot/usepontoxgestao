
const PlaceholderPage = ({ title, description }: { title: string, description: string }) => {
  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block'
        }}>
          🚧
        </div>
        <h2 style={{ marginBottom: '10px' }}>Módulo em Desenvolvimento</h2>
        <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
          Este espaço está reservado para a funcionalidade de <strong>{title}</strong>. 
          Em breve, novos recursos serão implementados aqui.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
