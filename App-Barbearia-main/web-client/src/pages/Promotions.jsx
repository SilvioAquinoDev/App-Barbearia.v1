import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import './Promotions.css';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

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
                <h2>{promo.title}</h2>
                {promo.description && (
                  <p className="promo-description">{promo.description}</p>
                )}
                
                {promo.code && (
                  <div className="promo-code">
                    <span className="code-label">Código:</span>
                    <span className="code-value">{promo.code}</span>
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
