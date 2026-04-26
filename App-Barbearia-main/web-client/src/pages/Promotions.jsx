import {React, useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import './Promotions.css';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const res = await api.get('/promotions/');
      setPromotions(res.data);
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (code, promoId) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(promoId);
      
      // Reset após 3 segundos
      setTimeout(() => {
        setCopiedCode(null);
      }, 3000);
      
      // Opcional: mostrar toast ou mensagem de sucesso
      console.log('Código copiado:', code);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
    }
  };

  if (loading) {
    return (
      <div className="promotions-page">
        <Navbar />
        <div className="promotions-container"><p>Carregando...</p></div>
      </div>
    );
  }

  return (
    <div className="promotions-page">
      <Navbar />
      
      <div className="promotions-container">
        <div className="promotions-header">
          <h1 data-testid="promotions-title">Promoções Exclusivas</h1>
          <p>Aproveite nossas ofertas especiais</p>
        </div>

        {promotions.length === 0 ? (
          <Card>
            <div className="empty-state">
              <span className="empty-icon">&#127873;</span>
              <h3>Nenhuma promoção ativa no momento</h3>
              <p>Volte em breve para conferir novidades!</p>
            </div>
          </Card>
        ) : (
          <div className="promotions-grid">
            {promotions.map((promo) => (
              <Card key={promo.id} className="promo-card" data-testid={`promo-card-${promo.id}`}>
                {promo.discount_percent && (
                  <div className="promo-badge">{promo.discount_percent}% OFF</div>
                )}
                <h2 className="promo-title">{promo.title}</h2>
                {promo.description && (
                  <p className="promo-description">{promo.description}</p>
                )}
                
                {promo.code && (
                  <div 
                    className="promo-code clickable" 
                    onClick={() => copyToClipboard(promo.code, promo.id)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        copyToClipboard(promo.code, promo.id);
                      }
                    }}
                  >
                    <span className="code-label">Código:</span>
                    <div className="code-container">
                      <span className="code-value">{promo.code}</span>
                      
                    </div>
                    {copiedCode === promo.id && (
                      <span className="copy-success">✓ Copiado!</span>
                    )}
                  </div>
                )}

                {promo.valid_until && (
                  <div className="promo-footer">
                    <p className="promo-valid">
                      Válido até: {new Date(promo.valid_until).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}