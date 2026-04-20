import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  // Função para determinar o destino do link da marca
  const getBrandLink = () => {
    return user ? '/dashboard' : '/';
  };

  // Fecha o menu ao clicar em um link
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  // Fecha o menu ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Previne scroll quando menu está aberto no mobile
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link 
          to={getBrandLink()} 
          className="navbar-brand" 
          onClick={handleLinkClick}
        >
          Barbershop
        </Link>
        
        {/* Botão do Menu Hambúrguer */}
        <button 
          className={`hamburger-btn ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        
        {/* Menu Overlay para mobile */}
        <div className={`navbar-menu-overlay ${isMenuOpen ? 'active' : ''}`}>
          <div className="navbar-menu-mobile">
            {/*<Link to="/agendar" className="navbar-link" onClick={handleLinkClick}>
              Agendamento Rápido
            </Link>*/}
            
            {!user ? (
              <>
                <Link to="/login" className="navbar-link" onClick={handleLinkClick}>
                  Área do Cliente
                </Link>
                <Link to="/login" className="navbar-button" onClick={handleLinkClick}>
                  Criar Conta
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="navbar-link" onClick={handleLinkClick}>
                  Painel
                </Link>
                <Link to="/historico" className="navbar-link" onClick={handleLinkClick}>
                  Histórico
                </Link>
                <Link to="/promocoes" className="navbar-link" onClick={handleLinkClick}>
                  Promoções
                </Link>
                <Link to="/fidelidade" className="navbar-link" onClick={handleLinkClick}>
                  Fidelidade
                </Link>
                <span className="navbar-user">{user.name}</span>
                <button onClick={handleLogout} className="navbar-button-logout">
                  Sair
                </button>
              </>
            )}
            
            <button
              className="theme-toggle"
              onClick={() => {
                toggleTheme();
                setIsMenuOpen(false);
              }}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              data-testid="theme-toggle"
            >
              {isDark ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu Desktop (original) */}
        <div className="navbar-menu-desktop">
          {/*<Link to="/agendar" className="navbar-link">Agendamento Rápido</Link>*/}
          {!user ? (
            <>
              <Link to="/login" className="navbar-link">Área do Cliente</Link>
              <Link to="/login" className="navbar-button">Criar Conta</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="navbar-link">Painel</Link>
              <Link to="/historico" className="navbar-link">Histórico</Link>
              <Link to="/promocoes" className="navbar-link">Promoções</Link>
              <Link to="/fidelidade" className="navbar-link">Fidelidade</Link>
              <span className="navbar-user">{user.name}</span>
              <button onClick={handleLogout} className="navbar-button-logout">
                Sair
              </button>
            </>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            data-testid="theme-toggle"
          >
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}



/*import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          Barbershop
        </Link>
        
        <div className="navbar-menu">
          <Link to="/agendar" className="navbar-link">Agendar</Link>
          {!user ? (
            <>
              <Link to="/login" className="navbar-link">Entrar</Link>
              <Link to="/login" className="navbar-button">Criar Conta</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="navbar-link">Painel</Link>
              <Link to="/historico" className="navbar-link">Historico</Link>
              <Link to="/promocoes" className="navbar-link">Promocoes</Link>
              <Link to="/fidelidade" className="navbar-link">Fidelidade</Link>
              <span className="navbar-user">{user.name}</span>
              <button onClick={handleLogout} className="navbar-button-logout">
                Sair
              </button>
            </>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            data-testid="theme-toggle"
          >
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}*/
