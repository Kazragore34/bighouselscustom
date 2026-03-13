import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, Check, X } from 'lucide-react';
import { getPendingInvitations, acceptInvitation, rejectInvitation, getTeamById } from '../../services/teams';
import { getUserById } from '../../services/users';
import './Navbar.css';

// Componente de notificaciones de invitaciones
const NotificationsWidget = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadInvitations();
      // Actualizar cada 30 segundos
      const interval = setInterval(loadInvitations, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadInvitations = async () => {
    if (!user) return;
    try {
      const pendingInvitations = await getPendingInvitations(user.id);
      // Cargar información adicional de las invitaciones
      const invitationsWithData = await Promise.all(
        pendingInvitations.map(async (inv) => {
          try {
            const [fromUser, teamData] = await Promise.all([
              getUserById(inv.fromUserId).catch(() => ({ username: 'Usuario' })),
              getTeamById(inv.teamId).catch(() => ({ name: 'Equipo' }))
            ]);
            return {
              ...inv,
              fromUserName: fromUser.username || 'Usuario',
              teamName: teamData?.name || 'Equipo'
            };
          } catch (error) {
            console.error('Error cargando datos de invitación:', error);
            return { ...inv, fromUserName: 'Usuario', teamName: 'Equipo' };
          }
        })
      );
      setInvitations(invitationsWithData);
    } catch (error) {
      console.error('Error cargando invitaciones:', error);
    }
  };

  const handleAccept = async (invitationId, e) => {
    e.stopPropagation();
    try {
      setLoading(true);
      await acceptInvitation(invitationId);
      await loadInvitations();
      alert('Invitación aceptada');
    } catch (error) {
      alert('Error al aceptar invitación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (invitationId, e) => {
    e.stopPropagation();
    try {
      setLoading(true);
      await rejectInvitation(invitationId);
      await loadInvitations();
    } catch (error) {
      alert('Error al rechazar invitación: ' + error.message);
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
        <Bell size={20} />
        {invitations.length > 0 && (
          <span className="notification-badge">{invitations.length}</span>
        )}
      </button>
      {showDropdown && (
        <>
          <div className="dropdown-backdrop" onClick={() => setShowDropdown(false)} />
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h3>Invitaciones a Equipos</h3>
              <button onClick={() => setShowDropdown(false)} className="close-dropdown">×</button>
            </div>
            {invitations.length === 0 ? (
              <div className="no-notifications">
                <p>No hay invitaciones pendientes</p>
              </div>
            ) : (
              <div className="notifications-list">
                {invitations.map(inv => (
                  <div key={inv.id} className="notification-item">
                    <div className="notification-content">
                      <strong>{inv.fromUserName || 'Usuario'}</strong> te invitó a unirte al equipo{' '}
                      <strong>{inv.teamName || 'Equipo'}</strong>
                    </div>
                    <div className="notification-actions">
                      <button
                        onClick={(e) => handleAccept(inv.id, e)}
                        className="btn-notification-accept"
                        disabled={loading}
                        title="Aceptar"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={(e) => handleReject(inv.id, e)}
                        className="btn-notification-reject"
                        disabled={loading}
                        title="Rechazar"
                      >
                        <X size={14} />
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
              <button onClick={() => navigate('/dashboard')}>Inicio</button>
              <button onClick={() => navigate('/events')}>Eventos</button>
              <button onClick={() => navigate('/teams')}>Equipos</button>
              <button onClick={() => navigate('/winners')}>Ganadores</button>
              <button onClick={() => navigate('/admin/users')}>Admin: Usuarios</button>
              <button onClick={() => navigate('/admin/events')}>Admin: Eventos</button>
              <button onClick={() => navigate('/admin/bets')}>Admin: Apuestas</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/dashboard')}>Inicio</button>
              <button onClick={() => navigate('/events')}>Eventos</button>
              <button onClick={() => navigate('/teams')}>Equipos</button>
              <button onClick={() => navigate('/winners')}>Ganadores</button>
            </>
          )}
        </div>

        <div className="navbar-user">
          <NotificationsWidget />
          <div className="user-info clickable" onClick={() => navigate('/profile')} title="Ir a mi perfil">
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
