import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { BarbershopProvider } from './contexts/BarbershopContext'

// Pages
import Home from './pages/Home'
import Booking from './pages/Booking'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Promotions from './pages/Promotions'
import Loyalty from './pages/Loyalty'
import PixPayment from './pages/PixPayment'

// Components
import Loading from './components/Loading'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  return user ? children : <Navigate to="/login" />;
}

function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/agendar" element={<Booking />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registrar" element={<Register />} />
      <Route path="/auth-callback" element={<AuthCallback />} />
      <Route path="/pagamento-pix" element={<PixPayment />} />

      {/* Private Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/historico"
        element={
          <PrivateRoute>
            <History />
          </PrivateRoute>
        }
      />
      <Route
        path="/promocoes"
        element={
          <PrivateRoute>
            <Promotions />
          </PrivateRoute>
        }
      />
      <Route
        path="/fidelidade"
        element={
          <PrivateRoute>
            <Loyalty />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BarbershopProvider>
      <AppContent />
    </BarbershopProvider>
  )
}

export default App