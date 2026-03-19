import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <Navbar />
      
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">💈 Barbershop Premium</h1>
          <p className="hero-subtitle">
            Agende seu horário com os melhores profissionais
          </p>
          <div className="hero-buttons">
            <Link to="/agendar-publico" className="btn-primary">
              Agendar Agora
            </Link>
            <Link to="/registrar" className="btn-secondary">
              Criar Conta
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-container">
          <h2 className="section-title">Por que escolher nossa barbearia?</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Agendamento Fácil</h3>
              <p>Agende seu horário online em poucos cliques</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">✂️</div>
              <h3>Profissionais Qualificados</h3>
              <p>Equipe experiente e atualizada com as tendências</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <h3>Programa de Fidelidade</h3>
              <p>Ganhe pontos e troque por serviços</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3>Promoções Exclusivas</h3>
              <p>Ofertas especiais para clientes cadastrados</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-content">
          <h2>Pronto para começar?</h2>
          <p>Crie sua conta e aproveite todos os benefícios</p>
          <Link to="/registrar" className="btn-primary-large">
            Cadastrar Agora
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 Barbershop. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
