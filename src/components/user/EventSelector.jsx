import { useState, useEffect } from 'react';
import { getAllEvents } from '../../services/events';
import { useNavigate } from 'react-router-dom';
import { Car, Users, Target, PersonStanding, Flag, Theater, Trophy } from 'lucide-react';
import './EventSelector.css';

const EVENT_TYPE_ICONS = {
  CARRERA_COCHES: { icon: Car, label: 'Carrera' },
  PELEA_COMBATE: { icon: Users, label: 'Combate' },
  DISPAROS: { icon: Target, label: 'Disparos' },
  CARRERA_PIE: { icon: Trophy, label: 'Atletismo' },
  POSTA_EQUIPOS: { icon: Flag, label: 'Posta' },
  ROL_LIBRE: { icon: Trophy, label: 'Rol' },
  race: { icon: Car, label: 'Carrera' },
  boxing: { icon: Users, label: 'Combate' },
  running: { icon: Trophy, label: 'Atletismo' },
  trophy: { icon: Trophy, label: 'Evento' },
};

const STATUS_LABELS = {
  active: 'Activo',
  ACTIVO: 'Activo',
  draft: 'Borrador',
  BORRADOR: 'Borrador',
  finished: 'Finalizado',
  FINALIZADO: 'Finalizado',
  cancelled: 'Cancelado',
  CANCELADO: 'Cancelado',
  EN_CURSO: 'En Curso',
  POSPUESTO: 'Pospuesto',
};

const EventSelector = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const all = await getAllEvents();
      const visible = all
        .filter(e => ['active', 'ACTIVO', 'EN_CURSO'].includes(e.status))
        .sort((a, b) => {
          const priority = ['EN_CURSO', 'active', 'ACTIVO'];
          return priority.indexOf(b.status) - priority.indexOf(a.status);
        });
      setEvents(visible);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando eventos...</div>;
  }

  return (
    <div className="event-selector">
      <p className="events-section-title">Eventos Disponibles</p>

      <div className="events-grid">
        {events.map(event => {
          const typeKey = event.eventType || event.icon || 'trophy';
          const typeInfo = EVENT_TYPE_ICONS[typeKey] || EVENT_TYPE_ICONS.trophy;
          const IconComponent = typeInfo.icon;
          const statusKey = event.status;
          const statusLabel = STATUS_LABELS[statusKey] || statusKey;

          return (
            <div
              key={event.id}
              className="event-card"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              {event.bannerURL ? (
                <div
                  className="event-banner"
                  style={{ backgroundImage: `url(${event.bannerURL})` }}
                >
                  <div className="event-overlay">
                    <span className="event-type-badge">{typeInfo.label}</span>
                  </div>
                </div>
              ) : (
                <div className="event-banner-placeholder">
                  <IconComponent size={56} />
                </div>
              )}

              <div className="event-info">
                <h2>{event.name}</h2>
                <p>{event.description || 'Sin descripción'}</p>
                <div className="event-footer">
                  <span className={`status-badge status-${statusKey}`}>{statusLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="no-events">
          <Trophy size={48} />
          <p>No hay eventos activos en este momento</p>
        </div>
      )}
    </div>
  );
};

export default EventSelector;
