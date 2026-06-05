import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/shared/Login';
import SignUp from './components/shared/SignUp';
import Navbar from './components/shared/Navbar';
import Dashboard from './components/user/Dashboard';
import EventSelector from './components/user/EventSelector';
import VoteBetPanel from './components/user/VoteBetPanel';
import BracketViewer from './components/user/BracketViewer';
import Winners from './components/user/Winners';
import Profile from './components/user/Profile';
import TeamManagement from './components/user/TeamManagement';
import UserManagement from './components/admin/UserManagement';
import EventManagement from './components/admin/EventManagement';
import BetConfirmation from './components/admin/BetConfirmation';
import BracketEditor from './components/admin/BracketEditor';
import HomePublic from './components/public/HomePublic';
import './App.css';

// Ruta que requiere login
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">◈ VANTAGE</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

// Ruta que requiere admin
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="loading-screen">◈ VANTAGE</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

// Layout con navbar
const WithNav = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

function App() {
  const { user } = useAuth();

  return (
    <div className="app">
      <Routes>
        {/* Público */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HomePublic />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignUp />} />

        {/* Usuario logado */}
        <Route path="/dashboard" element={<ProtectedRoute><WithNav><Dashboard /></WithNav></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><WithNav><EventSelector /></WithNav></ProtectedRoute>} />
        <Route path="/events/:eventId" element={<ProtectedRoute><WithNav><VoteBetPanel /></WithNav></ProtectedRoute>} />
        <Route path="/events/:eventId/brackets" element={<ProtectedRoute><WithNav><BracketViewer /></WithNav></ProtectedRoute>} />
        <Route path="/ganadores" element={<ProtectedRoute><WithNav><Winners /></WithNav></ProtectedRoute>} />
        {/* alias legacy */}
        <Route path="/winners" element={<Navigate to="/ganadores" replace />} />
        <Route path="/equipos" element={<ProtectedRoute><WithNav><TeamManagement /></WithNav></ProtectedRoute>} />
        {/* alias legacy */}
        <Route path="/teams" element={<Navigate to="/equipos" replace />} />
        <Route path="/perfil" element={<ProtectedRoute><WithNav><Profile /></WithNav></ProtectedRoute>} />
        {/* alias legacy */}
        <Route path="/profile" element={<Navigate to="/perfil" replace />} />

        {/* Admin */}
        <Route path="/admin/usuarios" element={<AdminRoute><WithNav><UserManagement /></WithNav></AdminRoute>} />
        {/* alias legacy */}
        <Route path="/admin/users" element={<Navigate to="/admin/usuarios" replace />} />
        <Route path="/admin/eventos" element={<AdminRoute><WithNav><EventManagement /></WithNav></AdminRoute>} />
        {/* alias legacy */}
        <Route path="/admin/events" element={<Navigate to="/admin/eventos" replace />} />
        <Route path="/admin/apuestas" element={<AdminRoute><WithNav><BetConfirmation /></WithNav></AdminRoute>} />
        {/* alias legacy */}
        <Route path="/admin/bets" element={<Navigate to="/admin/apuestas" replace />} />
        <Route
          path="/admin/events/:eventId/brackets"
          element={<AdminRoute><WithNav><BracketEditor /></WithNav></AdminRoute>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
