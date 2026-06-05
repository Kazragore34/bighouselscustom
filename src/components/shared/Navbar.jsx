import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Bell, Check, X } from 'lucide-react';
import { getPendingInvitations, acceptInvitation, rejectInvitation, getTeamById } from '../../services/teams';
import { getUserById } from '../../services/users';
import './Navbar.css';

// Componente de logo de marca — cambiar aquí cuando haya SVG
const BrandLogo = () => (
  <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span className="brand-icon">◈</span>
    <span className="brand-name">VANTAGE</span>
  </div>
);

const NotificationsWidget = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadInvitations();
      const interval = setInterval(loadInvitations, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadInvitations = async () => {
    if (!user) return;
    try {
      const pending = await getPendingInvitations(user.id);
      const withData = await Promise.all(
        pending.map(async (inv) => {
          try {
            const [fromUser, teamData] = await Promise.all([
              getUserById(inv.fromUserId).catch(() => ({ username: 'Usuario' })),
              getTeamById(inv.teamId).catch(() => ({ name: 'Equipo' }))
            ]);
            return { ...inv, fromUserName: fromUser.username || 'Usuario', teamName: teamData?.name || 'Equipo' };
          } catch {
            return { ...inv, fromUserName: 'Usuario', teamName: 'Equipo' };
          }
        })
      );
      setInvitations(withData);
    } catch (error) {
      console.error('Error cargando invitaciones:', error);
    }
  };

  const handleAccept = async (invitationId, e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await acceptInvitation(invitationId);
      await loadInvitations();
    } catch (error) {
      alert('Error al aceptar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (invitationId, e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await rejectInvitation(invitationId);
      await loadInvitations();
    } catch (error) {
      alert('Error al rechazar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="notifications-widget">
      <button
        className="notifications-button"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Notificaciones"
      >
        <Bell size={18} />
        {invitations.length > 0 && (
          <span className="notification-badge">{invitations.length}</span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="dropdown-backdrop" onClick={() => setShowDropdown(false)} />
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h3>Invitaciones</h3>
              <button onClick={() => setShowDropdown(false)} className="close-dropdown">×</button>
            </div>
            {invitations.length === 0 ? (
              <div className="no-notifications">Sin invitaciones pendientes</div>
            ) : (
              <div className="notifications-list">
                {invitations.map(inv => (
                  <div key={inv.id} className="notification-item">
                    <div className="notification-content">
                      <strong>{inv.fromUserName}</strong> te invitó al equipo{' '}
                      <strong>{inv.teamName}</strong>
                    </div>
                    <div className="notification-actions">
                      <button
                        onClick={(e) => handleAccept(inv.id, e)}
                        className="btn-notification-accept"
                        disabled={loading}
                        title="Aceptar"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={(e) => handleReject(inv.id, e)}
                        className="btn-notification-reject"
                        disabled={loading}
                        title="Rechazar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div onClick={() => navigate('/dashboard')}>
          <BrandLogo />
        </div>

        <div className="navbar-menu">
          <button
            className={isActive('/dashboard') ? 'active' : ''}
            onClick={() => navigate('/dashboard')}
          >
            Inicio
          </button>
          <button
            className={isActive('/events') ? 'active' : ''}
            onClick={() => navigate('/events')}
          >
            Eventos
          </button>
          <button
            className={isActive('/ganadores') ? 'active' : ''}
            onClick={() => navigate('/ganadores')}
          >
            Ganadores
          </button>
          <button
            className={isActive('/equipos') ? 'active' : ''}
            onClick={() => navigate('/equipos')}
          >
            Equipos
          </button>

          {isAdmin && (
            <>
              <div className="navbar-admin-sep" />
              <button
                className={isActive('/admin/usuarios') ? 'active' : ''}
                onClick={() => navigate('/admin/usuarios')}
              >
                Usuarios
              </button>
              <button
                className={isActive('/admin/eventos') ? 'active' : ''}
                onClick={() => navigate('/admin/eventos')}
              >
                Eventos
              </button>
              <button
                className={isActive('/admin/apuestas') ? 'active' : ''}
                onClick={() => navigate('/admin/apuestas')}
              >
                Apuestas
              </button>
            </>
          )}
        </div>

        <div className="navbar-user">
          <NotificationsWidget />

          <div
            className="user-info clickable"
            onClick={() => navigate('/perfil')}
            title="Mi perfil"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
            )}
            <span>{user?.username || user?.name}</span>
          </div>

          <button onClick={handleLogout} className="logout-button">
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
