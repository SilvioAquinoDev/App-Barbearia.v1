import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ADICIONE ESTE LOG PARA DEBUG
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔧 Environment:', import.meta.env.MODE);
console.log('📧 VITE_API_URL:', import.meta.env.VITE_API_URL);

// Add auth token on startup if available
const savedToken = localStorage.getItem('client_token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect for non-public endpoints
      const url = error.config?.url || '';
      if (!url.includes('/public/')) {
        localStorage.removeItem('client_token');
        delete api.defaults.headers.common['Authorization'];
        // Don't redirect if already on login or public pages
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/agendar') && 
            !window.location.pathname.includes('/auth-callback') &&
            window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }  
);

// ==================== FUNÇÕES PARA FOTOS DOS SERVIÇOS ====================

export const getServicePhotos = async (serviceId) => {
  try {
    const response = await api.get(`/service-photos/${serviceId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar fotos do serviço:', error);
    return [];
  }
};

export const getAllServicesPhotos = async () => {
  try {
    // Primeiro, buscar todos os serviços
    const servicesResponse = await api.get('/services/');
    const services = servicesResponse.data;
    
    // Para cada serviço, buscar suas fotos
    const photosPromises = services.map(async (service) => {
      try {
        const photos = await getServicePhotos(service.id);
        return {
          serviceId: service.id,
          serviceName: service.name,
          photos: photos
        };
      } catch (error) {
        console.error(`Erro ao carregar fotos do serviço ${service.id}:`, error);
        return {
          serviceId: service.id,
          serviceName: service.name,
          photos: []
        };
      }
    });
    
    return await Promise.all(photosPromises);
  } catch (error) {
    console.error('Erro ao carregar todos os serviços:', error);
    return [];
  }
};

export const uploadServicePhoto = async (serviceId, photoData, caption = '') => {
  try {
    const response = await api.post('/service-photos/', {
      service_id: serviceId,
      photo_data: photoData,
      caption: caption
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    throw error;
  }
};

export const deleteServicePhoto = async (photoId) => {
  try {
    const response = await api.delete(`/service-photos/${photoId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    throw error;
  }
};

// ==================== FUNÇÕES PARA PRODUTOS ====================

export const getProducts = async () => {
  try {
    const response = await api.get('/products/');
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    return [];
  }
};

export const getActiveProducts = async () => {
  try {
    const response = await api.get('/products/');
    // Filtrar apenas produtos ativos
    const products = response.data.filter(product => product.is_active !== false);
    
    // Processar URLs das imagens para cada produto
    return products.map(product => {
      // Criar uma cópia do produto para não modificar o original
      const processedProduct = { ...product };
      
      // Se tiver photo_data, processar para URL completa
      if (processedProduct.photo_data) {
        // Se já for data URL (base64), mantém como está
        if (processedProduct.photo_data.startsWith('data:image')) {
          processedProduct.image_url = processedProduct.photo_data;
        }
        // Se for caminho relativo (começa com /), adiciona o baseURL
        else if (processedProduct.photo_data.startsWith('/')) {
          processedProduct.image_url = `${API_BASE_URL}${processedProduct.photo_data}`;
        }
        // Se for URL completa (começa com http)
        else if (processedProduct.photo_data.startsWith('http')) {
          processedProduct.image_url = processedProduct.photo_data;
        }
        // Caso contrário, assume que é um nome de arquivo e constrói a URL
        else {
          processedProduct.image_url = `${API_BASE_URL}/uploads/products/${processedProduct.photo_data}`;
        }
      }
      
      return processedProduct;
    });
  } catch (error) {
    console.error('Erro ao carregar produtos ativos:', error);
    return [];
  }
};

export const getProductById = async (productId) => {
  try {
    const response = await api.get(`/products/${productId}`);
    const product = response.data;
    
    // Processar URL da imagem
    if (product && product.photo_data) {
      if (product.photo_data.startsWith('data:image')) {
        product.image_url = product.photo_data;
      } else if (product.photo_data.startsWith('/')) {
        product.image_url = `${API_BASE_URL}${product.photo_data}`;
      } else if (product.photo_data.startsWith('http')) {
        product.image_url = product.photo_data;
      } else {
        product.image_url = `${API_BASE_URL}/uploads/products/${product.photo_data}`;
      }
    }
    
    return product;
  } catch (error) {
    console.error('Erro ao carregar produto:', error);
    return null;
  }
};

// ==================== FUNÇÕES PARA SERVIÇOS ====================

export const getServices = async () => {
  try {
    const response = await api.get('/services/');
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar serviços:', error);
    return [];
  }
};

export const getServiceById = async (serviceId) => {
  try {
    const response = await api.get(`/services/${serviceId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar serviço:', error);
    return null;
  }
};

// ==================== FUNÇÕES PARA PROMOÇÕES ====================

export const getPromotions = async () => {
  try {
    const response = await api.get('/promotions/');
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar promoções:', error);
    return [];
  }
};

/*export const getActivePromotions = async () => {
  try {
    const response = await api.get('/promotions/');
    // Filtrar promoções ativas (não expiradas)
    const now = new Date();
    return response.data.filter(promo => {
      if (!promo.valid_until) return true;
      return new Date(promo.valid_until) > now;
    });
  } catch (error) {
    console.error('Erro ao carregar promoções ativas:', error);
    return [];
  }
};*/


// No arquivo api.js, atualize a função getActivePromotions:

export const getActivePromotions = async () => {
  try {
    const response = await api.get('/promotions/');
    console.log('🎁 Todas as promoções (raw):', response.data);
    
    const now = new Date();
    console.log('📅 Data atual:', now.toISOString());
    
    // Filtrar promoções ativas
    const activePromotions = response.data.filter(promo => {
      console.log(`Analisando promoção ${promo.id}:`, promo);
      
      // Verificar se tem valid_until
      if (!promo.valid_until) {
        console.log(`Promoção ${promo.id}: sem data de validade, considerando ativa`);
        return true;
      }
      
      const validUntil = new Date(promo.valid_until);
      const isValid = validUntil > now;
      
      console.log(`Promoção ${promo.id}: valid_until=${promo.valid_until}, válida? ${isValid}`);
      
      return isValid;
    });
    
    console.log('✅ Promoções ativas encontradas:', activePromotions.length);
    return activePromotions;
  } catch (error) {
    console.error('❌ Erro ao carregar promoções ativas:', error);
    return [];
  }
};


// ==================== FUNÇÕES PARA AGENDAMENTOS ====================

/**
 * Cria um novo agendamento (público - sem login)
 */
export const createPublicAppointment = async (appointmentData) => {
  try {
    console.log('📅 Criando agendamento público:', appointmentData);
    
    const response = await api.post('/appointments/public/book', {
      service_id: appointmentData.service_id,
      scheduled_time: appointmentData.scheduled_time,
      client_name: appointmentData.client_name,
      client_phone: appointmentData.client_phone.replace(/\D/g, ''), // Remove formatação
      client_email: appointmentData.client_email || null, // Email pode ser opcional
      notes: appointmentData.notes || null
    });
    
    console.log('✅ Agendamento criado:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Cria um novo agendamento (usuário logado)
 */
export const createAuthenticatedAppointment = async (appointmentData) => {
  try {
    console.log('📅 Criando agendamento para usuário logado:', appointmentData);
    
    const response = await api.post('/appointments/', {
      service_id: appointmentData.service_id,
      scheduled_time: appointmentData.scheduled_time,
      notes: appointmentData.notes || null
      // O backend vai preencher client_name, client_phone e client_email automaticamente do usuário
    });
    
    console.log('✅ Agendamento criado:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Busca agendamentos por telefone do cliente
 */
export const getAppointmentsByPhone = async (phone) => {
  try {
    console.log('📞 Buscando agendamentos para o telefone:', phone);
    
    const cleanPhone = phone.replace(/\D/g, '');
    const response = await api.get(`/appointments/client/${cleanPhone}`);
    
    console.log(`✅ Encontrados ${response.data.length} agendamentos`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar agendamentos por telefone:', error);
    
    // Se a rota específica falhar, tenta buscar todos e filtrar
    try {
      console.log('🔄 Tentando método alternativo...');
      const allAppointments = await api.get('/appointments');
      
      const cleanPhone = phone.replace(/\D/g, '');
      const filtered = allAppointments.data.filter(apt => {
        const aptPhone = (apt.client_phone || apt.phone || '').replace(/\D/g, '');
        return aptPhone === cleanPhone;
      });
      
      console.log(`✅ Encontrados ${filtered.length} agendamentos (método alternativo)`);
      return filtered;
    } catch (secondError) {
      console.error('❌ Segundo método também falhou:', secondError);
      return [];
    }
  }
};

/**
 * Busca agendamentos por nome e telefone do cliente (busca combinada)
 */
export const getAppointmentsByNameAndPhone = async (name, phone) => {
  try {
    console.log('🔍 Buscando agendamentos por nome e telefone:', { name, phone });
    
    const cleanName = name.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Busca todos os agendamentos
    const allAppointments = await api.get('/appointments');
    
    // Filtra combinando nome e telefone
    const filtered = allAppointments.data.filter(apt => {
      const aptName = (apt.client_name || apt.name || '').toLowerCase();
      const aptPhone = (apt.client_phone || apt.phone || '').replace(/\D/g, '');
      
      return aptName.includes(cleanName) && aptPhone === cleanPhone;
    });
    
    console.log(`✅ Encontrados ${filtered.length} agendamentos`);
    return filtered;
  } catch (error) {
    console.error('❌ Erro na busca combinada:', error);
    return [];
  }
};

/**
 * Busca horários disponíveis para uma data
 */
export const getAvailableSlots = async (date, serviceId = null) => {
  try {
    console.log('🕐 Buscando horários disponíveis para:', date);
    
    const params = { date_str: date };
    if (serviceId) params.service_id = serviceId;
    
    const response = await api.get('/public/available-slots', { params });
    
    return response.data.slots || [];
  } catch (error) {
    console.error('❌ Erro ao buscar horários:', error);
    return [];
  }
};

/**
 * Cancela um agendamento
 */
export const cancelAppointment = async (appointmentId) => {
  try {
    console.log('❌ Cancelando agendamento:', appointmentId);
    
    const response = await api.post(`/appointments/${appointmentId}/cancel`);
    
    console.log('✅ Agendamento cancelado:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao cancelar agendamento:', error);
    throw error;
  }
};

// ==================== FUNÇÕES PARA CLIENTES/FIDELIDADE ====================

// ==================== FUNÇÕES PARA CLIENTES/FIDELIDADE ====================

/**
 * Busca pontos de fidelidade por email (CORRIGIDO)
 */
export const getLoyaltyPointsByEmail = async (email) => {
  try {
    console.log('⭐ Buscando pontos para o email:', email);
    
    const cleanEmail = encodeURIComponent(email.trim());
    const response = await api.get(`/loyalty/client/${cleanEmail}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar pontos:', error);
    // Retorna estrutura padrão mesmo em erro
    return { 
      points: 0, 
      total_earned: 0, 
      total_redeemed: 0,
      redemption_threshold: 100,
      reward_description: "1 Corte Grátis"
    };
  }
};

/**
 * Busca pontos de fidelidade por telefone (mantido para compatibilidade)
 */
export const getLoyaltyPointsByPhone = async (phone) => {
  try {
    console.log('⭐ Buscando pontos para o telefone:', phone);
    
    const cleanPhone = phone.replace(/\D/g, '');
    const response = await api.get(`/loyalty/client/${cleanPhone}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar pontos:', error);
    return { points: 0, total_earned: 0, total_redeemed: 0 };
  }
};



/**
 * Busca pontos de fidelidade por telefone
 
export const getLoyaltyPoints = async (email) => {
  try {
    console.log('⭐ Buscando pontos para o telefone:', email);
    
    const cleanPhone = phone.replace(/\D/g, '');
    const response = await api.get(`/loyalty/client/${cleanEmail}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar pontos:', error);
    return { points: 0, total_earned: 0, total_redeemed: 0 };
  }
};*/

/**
 * Registra um cliente no programa de fidelidade
 */
export const registerLoyaltyClient = async (clientData) => {
  try {
    console.log('📝 Registrando cliente no programa de fidelidade:', clientData);
    
    const response = await api.post('/loyalty/register', {
      client_phone: clientData.phone.replace(/\D/g, ''),
      client_name: clientData.name,
      client_email: clientData.email || null // Email opcional
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao registrar cliente:', error);
    throw error;
  }
};

// ==================== FUNÇÕES PARA DEBUG ====================

export const debugAppointments = async () => {
  try {
    console.log('=== DEBUG: Verificando agendamentos ===');
    
    // Buscar todos os agendamentos
    const response = await api.get('/appointments');
    
    console.log('Total de agendamentos:', response.data.length);
    
    // Mostrar estrutura do primeiro agendamento
    if (response.data.length > 0) {
      console.log('Estrutura do primeiro agendamento:');
      console.log(JSON.stringify(response.data[0], null, 2));
      
      // Verificar campos disponíveis
      const first = response.data[0];
      console.log('Campos disponíveis no agendamento:');
      console.log('- client_name:', first.client_name);
      console.log('- client_phone:', first.client_phone);
      console.log('- client_email:', first.client_email); // AGORA INCLUÍDO
      console.log('- service_name:', first.service_name);
      console.log('- status:', first.status);
    }
    
    console.log('=== FIM DEBUG ===');
    
    return response.data;
  } catch (error) {
    console.error('Erro no debug:', error);
    return [];
  }
};


// ==================== FUNÇÕES PARA BUSCA POR EMAIL ====================

/**
 * Busca agendamentos por email do cliente
 */
export const getAppointmentsByEmail = async (email) => {
  try {
    console.log('📧 Buscando agendamentos para o email:', email);
    
    if (!email) {
      console.error('Email não fornecido');
      return [];
    }
    
    const cleanEmail = email.trim().toLowerCase();
    
    // Tentar endpoint específico se existir
    try {
      const response = await api.get(`/appointments/client/email/${encodeURIComponent(cleanEmail)}`);
      console.log(`✅ Encontrados ${response.data.length} agendamentos por email (endpoint específico)`);
      return response.data;
    } catch (error) {
      // Se o endpoint não existir, buscar todos e filtrar
      console.log('Endpoint específico não disponível, filtrando localmente...');
      
      const allAppointments = await api.get('/appointments');
      const filtered = allAppointments.data.filter(apt => {
        const aptEmail = (apt.client_email || '').toLowerCase();
        return aptEmail === cleanEmail;
      });
      
      console.log(`✅ Encontrados ${filtered.length} agendamentos por email (filtro local)`);
      return filtered;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar agendamentos por email:', error);
    return [];
  }
};

/**
 * Busca agendamentos por email OU telefone (fallback)
 */
export const getAppointmentsByEmailOrPhone = async (email, phone) => {
  try {
    console.log('🔍 Buscando agendamentos por email ou telefone:', { email, phone });
    
    let results = [];
    
    // Primeiro tenta por email
    if (email) {
      results = await getAppointmentsByEmail(email);
    }
    
    // Se não encontrou por email, tenta por telefone
    if (results.length === 0 && phone) {
      console.log('Nenhum resultado por email, tentando por telefone...');
      results = await getAppointmentsByPhone(phone);
    }
    
    return results;
  } catch (error) {
    console.error('❌ Erro na busca combinada:', error);
    return [];
  }
};


/* Envia uma notificação push para o usuário
 */
export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const response = await api.post('/notifications/send', {
      user_id: userId,
      title: title,
      body: body,
      data: data
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
};

/**
 * Testa se o navegador suporta notificações push
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Solicita permissão para notificações
 */
export const requestNotificationPermission = async () => {
  if (!isPushSupported()) {
    console.log('Push não suportado');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};




export default api;