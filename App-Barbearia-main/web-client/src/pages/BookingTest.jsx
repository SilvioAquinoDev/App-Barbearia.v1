import React, { useState } from 'react';
import Navbar from '../components/Navbar';

export default function BookingTest() {
  const [selectedService, setSelectedService] = useState(null);
  
  // Dados mockados para teste
  const mockServices = [
    { id: 1, name: 'Corte de Cabelo', price: 50, duration: 30 },
    { id: 2, name: 'Barba', price: 30, duration: 20 },
    { id: 3, name: 'Corte + Barba', price: 70, duration: 50 },
  ];

  const handleClick = (service) => {
    console.log('🔵 CLIQUE DETECTADO!', service);
    console.log('ID do serviço:', service.id);
    console.log('Nome:', service.name);
    
    // Forçar atualização
    setSelectedService(service);
    
    // Verificar se atualizou
    setTimeout(() => {
      console.log('Estado após atualização:', selectedService);
    }, 100);
  };

  return (
    <div className="booking-page">
      <Navbar />
      
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Teste de Seleção</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>Debug Info:</h3>
          <p>Serviço selecionado: {selectedService ? selectedService.name : 'Nenhum'}</p>
          <p>ID selecionado: {selectedService?.id || 'null'}</p>
        </div>
        
        <div style={{ display: 'grid', gap: '10px' }}>
          {mockServices.map((service) => (
            <div
              key={service.id}
              onClick={() => handleClick(service)}
              style={{
                padding: '20px',
                border: selectedService?.id === service.id 
                  ? '3px solid red' 
                  : '1px solid #ccc',
                backgroundColor: selectedService?.id === service.id 
                  ? '#ffebee' 
                  : 'white',
                cursor: 'pointer',
                borderRadius: '8px',
                marginBottom: '10px'
              }}
            >
              <h3>{service.name}</h3>
              <p>Preço: R$ {service.price}</p>
              <p>Duração: {service.duration}min</p>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => console.log('Botão próximo clicado')}
          disabled={!selectedService}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: !selectedService ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !selectedService ? 'not-allowed' : 'pointer'
          }}
        >
          Próximo
        </button>
      </div>
    </div>
  );
}