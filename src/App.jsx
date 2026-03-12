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
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/dashboard" replace />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Navbar />
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Navbar />
              <EventSelector />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <Navbar />
              <VoteBetPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:eventId/brackets"
          element={
            <ProtectedRoute>
              <Navbar />
              <BracketViewer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/winners"
          element={
            <ProtectedRoute>
              <Navbar />
              <Winners />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navbar />
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <Navbar />
              <TeamManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <Navbar />
              <UserManagement />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/events"
          element={
            <AdminRoute>
              <Navbar />
              <EventManagement />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/bets"
          element={
            <AdminRoute>
              <Navbar />
              <BetConfirmation />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/events/:eventId/brackets"
          element={
            <AdminRoute>
              <Navbar />
              <BracketEditor />
            </AdminRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;
