import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MechanicRegister } from './pages/MechanicRegister';
import { Dashboard } from './pages/Dashboard';
import { ServiceRequest } from './pages/ServiceRequest';
import { Services } from './pages/Services';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminMechanics } from './pages/AdminMechanics';
import { MechanicDashboard } from './pages/MechanicDashboard';
import { useAuthStore } from './store/authStore';

function DashboardRoute() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'MECHANIC') return <Navigate to="/mechanic" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;

  return <Dashboard />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="mechanic/register" element={<MechanicRegister />} />
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="service-request" element={<ServiceRequest />} />
          <Route path="services" element={<Services />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/mechanics" element={<AdminMechanics />} />
          <Route path="mechanic" element={<MechanicDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
