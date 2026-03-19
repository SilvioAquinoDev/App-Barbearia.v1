{/*import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          💈 Barbershop
        </Link>
        
        <div className="navbar-menu">
          {!user ? (
            <>
              <Link to="/agendar-publico" className="navbar-link">Agendar</Link>
              <Link to="/login" className="navbar-link">Entrar</Link>
              <Link to="/registrar" className="navbar-button">Cadastrar</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="navbar-link">Início</Link>
              <Link to="/historico" className="navbar-link">Histórico</Link>
              <Link to="/promocoes" className="navbar-link">Promoções</Link>
              <Link to="/fidelidade" className="navbar-link">Fidelidade</Link>
              <button onClick={handleLogout} className="navbar-button-logout">
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}*/}




import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Se o menu estiver aberto e o clique não foi no menu nem no botão hamburger
      if (
        isMenuOpen && 
        menuRef.current && 
        !menuRef.current.contains(event.target) &&
        !hamburgerRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={handleLinkClick}>
          💈 Barbershop
        </Link>
        
        {/* Menu Hamburger Button */}
        <button 
          ref={hamburgerRef}
          className={`hamburger-btn ${isMenuOpen ? 'active' : ''}`} 
          onClick={toggleMenu}
          aria-label="Menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Navigation Menu */}
        <div 
          ref={menuRef}
          className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}
          onClick={(e) => e.stopPropagation()} // Impede que cliques dentro do menu fechem ele
        >
          {!user ? (
            <>
              <Link to="/agendar-publico" className="navbar-link" onClick={handleLinkClick}>
                Agendar
              </Link>
              <Link to="/login" className="navbar-link" onClick={handleLinkClick}>
                Entrar
              </Link>
              <Link to="/registrar" className="navbar-button" onClick={handleLinkClick}>
                Cadastrar
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="navbar-link" onClick={handleLinkClick}>
                Início
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
              <button onClick={handleLogout} className="navbar-button-logout">
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}