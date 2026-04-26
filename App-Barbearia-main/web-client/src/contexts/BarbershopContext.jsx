import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const BarbershopContext = createContext();

export function useBarbershop() {
  return useContext(BarbershopContext);
}

export function BarbershopProvider({ children }) {
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopInfo();
  }, []);

  const loadShopInfo = async () => {
    try {
      const res = await api.get('/barbershop/public-info');
      if (res.data) {
        setShopInfo(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar informações da barbearia:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BarbershopContext.Provider value={{ shopInfo, loading, loadShopInfo }}>
      {children}
    </BarbershopContext.Provider>
  );
}