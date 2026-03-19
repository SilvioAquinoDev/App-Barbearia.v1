import { create } from 'zustand';

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  is_active: boolean;
}

/*interface Appointment {
  id: number;
  client_id: string;
  service_id: number;
  scheduled_time: string;
  status: string;
  notes?: string;
  notification_sent: boolean;
}*/

interface Appointment {
  id: number;
  client_id?: string;        // Tornando opcional se pode ser string ou number
  client_name?: string;       // NOVO: nome do cliente
  client_phone?: string;      // NOVO: telefone do cliente
  client_email?: string;      // NOVO: email do cliente (para fidelidade)
  service_id: number;
  service_name?: string;      // NOVO: nome do serviço
  service_price?: number;     // NOVO: preço do serviço
  service_duration?: number;  // NOVO: duração do serviço
  scheduled_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';  // Tipando os status
  notes?: string;
  notification_sent?: boolean;
  created_at?: string;        // NOVO: data de criação
  updated_at?: string;        // NOVO: data de atualização
  barber_id?: number;         // NOVO: ID do barbeiro
}

interface CashRegister {
  id: number;
  barber_id: string;
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  closing_balance?: number;
  total_services: number;
  total_products: number;
  status: string;
}

interface StoreState {
  services: Service[];
  products: Product[];
  appointments: Appointment[];
  currentCashRegister: CashRegister | null;
  setServices: (services: Service[]) => void;
  setProducts: (products: Product[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setCurrentCashRegister: (register: CashRegister | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  services: [],
  products: [],
  appointments: [],
  currentCashRegister: null,
  setServices: (services) => set({ services }),
  setProducts: (products) => set({ products }),
  setAppointments: (appointments) => set({ appointments }),
  setCurrentCashRegister: (register) => set({ currentCashRegister: register }),
}));
