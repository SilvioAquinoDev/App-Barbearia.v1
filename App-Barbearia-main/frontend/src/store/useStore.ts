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

interface Appointment {
  id: number;
  client_id: string;
  service_id: number;
  scheduled_time: string;
  status: string;
  notes?: string;
  notification_sent: boolean;
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
