import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
          <div className="navbar-logo">
            <span className="gta-logo-small">⭐</span>
            <h2>Los Santos Custom</h2>
          </div>
        </div>

        <div className="navbar-menu">
          {isAdmin ? (
            <>
              <button onClick={() => navigate('/admin/users')}>Usuarios</button>
              <button onClick={() => navigate('/admin/events')}>Eventos</button>
              <button onClick={() => navigate('/admin/bets')}>Confirmar Apuestas</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/dashboard')}>Inicio</button>
              <button onClick={() => navigate('/events')}>Eventos</button>
              <button onClick={() => navigate('/winners')}>Ganadores</button>
              <button onClick={() => navigate('/profile')}>Perfil</button>
            </>
          )}
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <User size={20} />
            <span>{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
