/*import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <Navbar />
      
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Barbershop Premium</h1>
          <p className="hero-subtitle">
            Agende seu horário com os melhores profissionais
          </p>
          <div className="hero-buttons">
            <Link to="/agendar" className="btn-primary">
              Agendar Agora
            </Link>
            <Link to="/login" className="btn-secondary">
              Área do Cliente
            </Link>
          </div>
        </div>
      </section>

      <section className="two-options">
        <div className="options-container">
          <h2 className="section-title">Como deseja agendar?</h2>
          
          <div className="options-grid">
            <div className="option-card public-card">
              <div className="option-icon">📅</div>
              <h3>Agendamento Rápido</h3>
              <p>Agende sem criar conta. Basta informar seu nome e telefone.</p>
              <ul className="option-features">
                <li>Sem necessidade de cadastro</li>
                <li>Escolha o serviço, data e horário</li>
                <li>Confirmação imediata</li>
              </ul>
              <Link to="/agendar" className="option-btn">
                Agendar sem Login
              </Link>
            </div>
            
            <div className="option-card member-card">
              <div className="option-badge">RECOMENDADO</div>
              <div className="option-icon">⭐</div>
              <h3>Área do Cliente</h3>
              <p>Faça login e aproveite benefícios exclusivos.</p>
              <ul className="option-features">
                <li>Programa de Fidelidade com pontos</li>
                <li>Promoções e descontos exclusivos</li>
                <li>Histórico completo de serviços</li>
                <li>Agendamento com perfil salvo</li>
              </ul>
              <Link to="/login" className="option-btn premium">
                Entrar / Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-container">
          <h2 className="section-title">Por que escolher nossa barbearia?</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">✂️</div>
              <h3>Profissionais Qualificados</h3>
              <p>Equipe experiente e atualizada com as tendências</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <h3>Programa de Fidelidade</h3>
              <p>Ganhe pontos e troque por serviços gratuitos</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3>Promoções Exclusivas</h3>
              <p>Ofertas especiais para clientes cadastrados</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Agende Online</h3>
              <p>Escolha o melhor horário direto pelo site</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 Barbershop Premium. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}*/




import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getAllServicesPhotos, getActiveProducts } from '../services/api';
import api from '../services/api';
import './Home.css';

export default function Home() {
  const [servicesPhotos, setServicesPhotos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedService, setSelectedService] = useState('all');
  const [imageErrors, setImageErrors] = useState({});

  // Número do WhatsApp da barbearia (substitua pelo número real)
  const WHATSAPP_NUMBER = "5511999999999"; // Formato: 55 + DDD + número
  
  const [shopInfo, setShopInfo] = useState(null);

  useEffect(() => {
    loadData();
    api.get('/barbershop/public-info').then(res => setShopInfo(res.data)).catch(() => {});
  }, []);

  const loadData = async () => {
    // Carregar fotos dos serviços
    try {
      const photosData = await getAllServicesPhotos();
      const servicesWithPhotos = photosData.filter(service => service.photos.length > 0);
      setServicesPhotos(servicesWithPhotos);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
    } finally {
      setLoadingServices(false);
    }

    // Carregar produtos
    try {
      const productsData = await getActiveProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const getServiceImageUrl = (photoData) => {
    if (!photoData) return '';
    if (photoData.startsWith('data:image')) {
      return photoData;
    }
    if (photoData.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/jpeg;base64,${photoData}`;
    }
    return photoData;
  };

  const getProductImageUrl = (product) => {
    if (!product) return '';
    
    if (product.image_url) {
      return product.image_url;
    }
    
    if (product.photo_data) {
      if (product.photo_data.startsWith('data:image')) {
        return product.photo_data;
      }
      if (product.photo_data.match(/^[A-Za-z0-9+/=]+$/)) {
        return `data:image/jpeg;base64,${product.photo_data}`;
      }
      return product.photo_data;
    }
    
    return '';
  };

  const handleImageError = (productId) => {
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }));
  };

  const filteredServices = selectedService === 'all' 
    ? servicesPhotos 
    : servicesPhotos.filter(s => s.serviceId === parseInt(selectedService));

  const allServices = servicesPhotos.map(service => ({
    id: service.serviceId,
    name: service.serviceName
  }));

  const handleWhatsAppClick = (product) => {
    const message = encodeURIComponent(
      `Olá! Gostaria de saber mais sobre o produto: *${product.name}*\n` +
      `Preço: R$ ${product.price?.toFixed(2)}\n` +
      (product.description ? `Descrição: ${product.description}\n` : '') +
      `\nPoderia me passar mais informações sobre disponibilidade?`
    );
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  // Componente de Loading azul para seções
  const BlueLoading = ({ text }) => (
    <div className="blue-loading-container">
      <div className="blue-loading-spinner"></div>
      <p className="blue-loading-text">{text}</p>
    </div>
  );

  const shopName = shopInfo?.name || 'Barbershop Premium';
  const logoUrl = shopInfo?.logo_url ? (shopInfo.logo_url.startsWith('http') ? shopInfo.logo_url : `/api${shopInfo.logo_url}`) : null;

  return (
    <div className="home">
      <Navbar />
      
      <section className="hero">
        <div className="hero-content">
          {logoUrl && <img src={logoUrl} alt="Logo" className="hero-logo" data-testid="home-logo" />}
          <h1 className="hero-title">{shopName}</h1>
          {/*<h1 className="hero-title">Barbershop Premium</h1>*/}
          <p className="hero-subtitle">
            Agende seu horário com os melhores profissionais
          </p>
          {shopInfo?.phone && (
            <p className="hero-contact">
              <span className="hero-contact-icon">tel</span> {shopInfo.phone}
            </p>
          )}
          {shopInfo?.address && (
            <p className="hero-address">{shopInfo.address}</p>
          )}
          <div className="hero-buttons">
            <Link to="/agendar" className="btn-primary">
              Agendamento Rápido
            </Link>
            <Link to="/login" className="btn-secondary">
              Área do Cliente
            </Link>
          </div>
        </div>
      </section>

      {/* SEÇÃO: Nossos Trabalhos */}
      <section className="features">
        <div className="features-container">
          <h2 className="section-title">Nossos Trabalhos</h2>
          <p className="section-subtitle">Confira os resultados dos nossos serviços</p>

          {/* Filtros de serviço */}
          {!loadingServices && servicesPhotos.length > 0 && (
            <div className="services-filter">
              <button 
                className={`filter-btn ${selectedService === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedService('all')}
              >
                Todos
              </button>
              {allServices.map(service => (
                <button
                  key={service.id}
                  className={`filter-btn ${selectedService === service.id ? 'active' : ''}`}
                  onClick={() => setSelectedService(service.id)}
                >
                  {service.name}
                </button>
              ))}
            </div>
          )}

          {loadingServices ? (
            <BlueLoading text="Carregando galeria de fotos..." />
          ) : (
            <div className="features-grid-images">
              {filteredServices.length > 0 ? (
                filteredServices.map(service => (
                  service.photos.map(photo => (
                    <div key={photo.id} className="feature-card">
                      <div className="gallery-image-container">
                        <img 
                          src={getServiceImageUrl(photo.photo_data)} 
                          alt={photo.caption || service.serviceName}
                          className="gallery-image"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x200?text=Imagem+não+disponível';
                          }}
                        />
                        {photo.caption && (
                          <div className="gallery-caption">
                            <span className="service-badge">{service.serviceName}</span>
                            <p>{photo.caption}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📸</span>
                  <h3>Nenhuma foto disponível no momento</h3>
                  <p>Em breve estaremos adicionando fotos dos nossos trabalhos!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO: Opções de Agendamento */}
      <section className="two-options">
        <div className="options-container">
          <h2 className="section-title">Como deseja agendar?</h2>
          
          <div className="options-grid">
            <div className="option-card public-card">
              <div className="option-icon">📅</div>
              <h3>Agendamento Rápido</h3>
              <p>Agende sem criar conta. Basta informar seu nome e telefone.</p>
              <ul className="option-features">
                <li>Sem necessidade de cadastro</li>
                <li>Escolha o serviço, data e horário</li>
                <li>Confirmação imediata</li>
              </ul>
              <Link to="/agendar" className="option-btn">
                Agendar sem Login
              </Link>
            </div>
            
            <div className="option-card member-card">
              <div className="option-badge">RECOMENDADO</div>
              <div className="option-icon">⭐</div>
              <h3>Área do Cliente</h3>
              <p>Faça login e aproveite benefícios exclusivos.</p>
              <ul className="option-features">
                <li>Programa de Fidelidade com pontos</li>
                <li>Promoções e descontos exclusivos</li>
                <li>Histórico completo de serviços</li>
                <li>Agendamento com perfil salvo</li>
              </ul>
              <Link to="/login" className="option-btn premium">
                Entrar / Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: Produtos - com imagens e WhatsApp */}
      <section className="features">
        <div className="features-container">
          <h2 className="section-title">Produtos à Venda</h2>
          <p className="section-subtitle">Produtos de qualidade para seu cuidado pessoal</p>

          {loadingProducts ? (
            <BlueLoading text="Carregando produtos..." />
          ) : (
            <div className="features-grid-products">
              {products.length > 0 ? (
                products.map(product => (
                  <div key={product.id} className="feature-card product-card">
                    {product.discount_percent > 0 && (
                      <div className="product-badge">-{product.discount_percent}%</div>
                    )}
                    
                    {!imageErrors[product.id] && (product.image_url || product.photo_data) ? (
                      <div className="product-image-container">
                        <img 
                          src={getProductImageUrl(product)} 
                          alt={product.name}
                          className="product-image"
                          loading="lazy"
                          onError={() => handleImageError(product.id)}
                        />
                      </div>
                    ) : (
                      <div className="product-image-container product-image-placeholder">
                        <span className="placeholder-icon">🛍️</span>
                      </div>
                    )}
                    
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      {product.description && (
                        <p className="product-description">{product.description}</p>
                      )}
                      
                      <div className="product-price-section">
                        {product.discount_price ? (
                          <>
                            <span className="product-old-price">
                              R$ {product.price?.toFixed(2)}
                            </span>
                            <span className="product-price product-price-discount">
                              R$ {product.discount_price?.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="product-price">
                            R$ {product.price?.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        className="product-btn whatsapp-btn"
                        onClick={() => handleWhatsAppClick(product)}
                      >
                        <i className="fab fa-whatsapp"></i>
                        Consultar disponibilidade
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🛍️</span>
                  <h3>Nenhum produto disponível no momento</h3>
                  <p>Em breve teremos novidades!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO: Diferenciais */}
      <section className="features">
        <div className="features-container">
          <h2 className="section-title">Por que escolher nossa barbearia?</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">✂️</div>
              <h3>Profissionais Qualificados</h3>
              <p>Equipe experiente e atualizada com as tendências</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <h3>Programa de Fidelidade</h3>
              <p>Ganhe pontos e troque por serviços gratuitos</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3>Promoções Exclusivas</h3>
              <p>Ofertas especiais para clientes cadastrados</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Agende Online</h3>
              <p>Escolha o melhor horário direto pelo site</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 Barbershop Premium. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
