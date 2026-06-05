import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllEvents } from '../../services/events';
import { Trophy, Target, Car, Users } from 'lucide-react';
import './HomePublic.css';

const STATUS_LABEL = {
  active: 'Activo', ACTIVO: 'Activo',
  EN_CURSO: 'En Curso',
  finished: 'Finalizado', FINALIZADO: 'Finalizado',
};

const EVENT_TYPE_ICON = {
  CARRERA_COCHES: '🚗', PELEA_COMBATE: '🥊', DISPAROS: '🎯',
  CARRERA_PIE: '🏃', POSTA_EQUIPOS: '🏁', ROL_LIBRE: '🎭',
  race: '🚗', fight: '🥊', competition: '🎯', other: '◈',
};

const HomePublic = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllEvents()
      .then(all => setEvents(all.filter(e => ['active', 'ACTIVO', 'EN_CURSO'].includes(e.status))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-public">
      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-brand">
            <span className="hero-icon">◈</span>
            <span className="hero-name">VANTAGE</span>
          </div>
          <h1 className="hero-headline">
            <span className="hero-highlight">La plataforma de apuestas</span>
          </h1>
          <p className="hero-sub">
            Apuesta en eventos en vivo del servidor. Vota por tus favoritos.<br />
            Escala el ranking. Todo con dinero in-character.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate('/login')}>
              Entrar
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate('/signup')}>
              Registrarse
            </button>
          </div>
        </div>
      </section>

      {/* Eventos visibles */}
      <section className="public-events">
        <div className="public-events-inner">
          <p className="section-label">Eventos Activos</p>
          {loading ? (
            <div className="pub-loading">Cargando eventos...</div>
          ) : events.length === 0 ? (
            <div className="pub-no-events">
              <Trophy size={40} />
              <p>No hay eventos activos en este momento</p>
            </div>
          ) : (
            <div className="pub-events-grid">
              {events.map(event => (
                <div key={event.id} className="pub-event-card">
                  {event.bannerURL ? (
                    <div className="pub-event-banner" style={{ backgroundImage: `url(${event.bannerURL})` }}>
                      <div className="pub-event-banner-overlay">
                        <span className="pub-event-type-icon">
                          {EVENT_TYPE_ICON[event.eventType || event.icon] || '◈'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pub-event-banner-placeholder">
                      <span style={{ fontSize: '2.5rem' }}>{EVENT_TYPE_ICON[event.eventType || event.icon] || '◈'}</span>
                    </div>
                  )}
                  <div className="pub-event-info">
                    <div className="pub-event-header">
                      <h3>{event.name}</h3>
                      <span className={`status-badge status-${event.status}`}>
                        {STATUS_LABEL[event.status] || event.status}
                      </span>
                    </div>
                    {event.description && <p>{event.description}</p>}
                    <div className="pub-event-cta">
                      <span className="pub-lock-msg">🔒 Inicia sesión para apostar</span>
                      <button className="btn-pub-login" onClick={() => navigate('/login')}>
                        Participar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-inner">
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <h3>Apuestas en Vivo</h3>
            <p>Apuesta en tiempo real durante los eventos del servidor.</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🏆</span>
            <h3>Rankings</h3>
            <p>Sube en el ranking de apostadores y participantes.</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🏅</span>
            <h3>Insignias</h3>
            <p>Gana insignias únicas por tus logros en el servidor.</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💰</span>
            <h3>Dinero IC</h3>
            <p>Apuestas con dinero in-character. Sin dinero real.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="pub-footer">
        <p>¿Ya tienes cuenta? <button onClick={() => navigate('/login')} className="btn-inline">Iniciar sesión</button></p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>VANTAGE • Dinero ficticio IC</p>
      </footer>
    </div>
  );
};

export default HomePublic;
