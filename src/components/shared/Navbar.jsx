import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Bell } from 'lucide-react';
import {
  getNotificationsByUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notifications';
import './Navbar.css';

// Componente de logo de marca — reemplazar con SVG cuando esté listo
const BrandLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span className="brand-icon">◈</span>
    <span className="brand-name">VANTAGE</span>
  </div>
);

const NOTIF_ICONS = {
  apuesta_confirmada: '✅',
  apuesta_ganada: '🎉',
  apuesta_perdida: '❌',
  evento_inicio: '📢',
  evento_ronda: '⚔️',
  insignia: '🏅',
};

const NotificationsWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [show, setShow] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await getNotificationsByUser(user.id);
    setNotifs(data);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      load();
      const interval = setInterval(load, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, load]);

  const unread = notifs.filter(n => !n.read).length;

  const handleOpen = () => {
    setShow(s => !s);
  };

  const handleRead = async (notif) => {
    if (!notif.read) await markNotificationRead(notif.id);
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.relatedEventId) {
      setShow(false);
      navigate(`/events/${notif.relatedEventId}`);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(user.id);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (!user) return null;

  return (
    <div className="notifications-widget">
      <button className="notifications-button" onClick={handleOpen} title="Notificaciones">
        <Bell size={18} />
        {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {show && (
        <>
          <div className="dropdown-backdrop" onClick={() => setShow(false)} />
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h3>Notificaciones</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {unread > 0 && (
                  <button
                    onClick={handleMarkAll}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                  >
                    Leer todas
                  </button>
                )}
                <button onClick={() => setShow(false)} className="close-dropdown">×</button>
              </div>
            </div>

            {notifs.length === 0 ? (
              <div className="no-notifications">Sin notificaciones</div>
            ) : (
              <div className="notifications-list">
                {notifs.slice(0, 20).map(n => (
                  <div
                    key={n.id}
                    className={`notification-item${n.read ? '' : ' unread'}`}
                    onClick={() => handleRead(n)}
                    style={{ cursor: n.relatedEventId ? 'pointer' : 'default' }}
                  >
                    <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                      {NOTIF_ICONS[n.type] || '🔔'}
                    </div>
                    <div className="notification-content">
                      <strong>{n.title}</strong>
                      <div style={{ fontSize: '0.82rem', marginTop: 2 }}>{n.message}</div>
                      {n.createdAt?.toDate && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                          {n.createdAt.toDate().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>
                    {!n.read && (
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold-primary)', flexShrink: 0 }} />
                    )}
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
        <div onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <BrandLogo />
        </div>

        <div className="navbar-menu">
          <button className={isActive('/dashboard') ? 'active' : ''} onClick={() => navigate('/dashboard')}>Inicio</button>
          <button className={isActive('/events') ? 'active' : ''} onClick={() => navigate('/events')}>Eventos</button>
          <button className={isActive('/ganadores') ? 'active' : ''} onClick={() => navigate('/ganadores')}>Ganadores</button>
          <button className={isActive('/equipos') ? 'active' : ''} onClick={() => navigate('/equipos')}>Equipos</button>

          {isAdmin && (
            <>
              <div className="navbar-admin-sep" />
              <button className={isActive('/admin/usuarios') ? 'active' : ''} onClick={() => navigate('/admin/usuarios')}>Usuarios</button>
              <button className={isActive('/admin/eventos') ? 'active' : ''} onClick={() => navigate('/admin/eventos')}>Eventos</button>
              <button className={isActive('/admin/apuestas') ? 'active' : ''} onClick={() => navigate('/admin/apuestas')}>Apuestas</button>
            </>
          )}
        </div>

        <div className="navbar-user">
          <NotificationsWidget />

          <div className="user-info clickable" onClick={() => navigate('/perfil')} title="Mi perfil">
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
