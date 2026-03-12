import { useState, useEffect } from 'react';
import { getActiveEvents, getAllEvents } from '../../services/events';
import { useNavigate } from 'react-router-dom';
import { Car, Users, Search, Trophy } from 'lucide-react';
import './EventSelector.css';

const iconMap = {
  car: Car,
  boxing: Users,
  running: Users,
  search: Search,
  trophy: Trophy
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
      // Mostrar TODOS los eventos (activos, draft, etc.) para que los usuarios puedan verlos
      const allEvents = await getAllEvents();
      // Filtrar solo eventos activos y draft (no mostrar finished)
      const visibleEvents = allEvents.filter(e => e.status === 'active' || e.status === 'draft');
      // Ordenar: activos primero, luego drafts
      const sortedEvents = visibleEvents.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
      });
      setEvents(sortedEvents);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  if (loading) {
    return <div className="loading">Cargando eventos...</div>;
  }

  return (
    <div className="event-selector">
      <h1 className="page-title">Selecciona un Evento</h1>
      
      <div className="events-grid">
        {events.map(event => {
          const IconComponent = iconMap[event.icon] || Trophy;
          
          return (
            <div
              key={event.id}
              className="event-card"
              onClick={() => handleEventClick(event.id)}
            >
              {event.bannerURL ? (
                <div className="event-banner" style={{ backgroundImage: `url(${event.bannerURL})` }}>
                  <div className="event-overlay">
                    <IconComponent size={48} className="event-icon" />
                  </div>
                </div>
              ) : (
                <div className="event-banner-placeholder">
                  <IconComponent size={64} className="event-icon" />
                </div>
              )}
              
              <div className="event-info">
                <h2>{event.name}</h2>
                <p>{event.description || 'Sin descripción'}</p>
                <div className="event-status">
                  <span className={`status-badge status-${event.status}`}>
                    {event.status === 'active' ? 'Activo' : event.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="no-events">
          <Trophy size={64} />
          <p>No hay eventos activos en este momento</p>
        </div>
      )}
    </div>
  );
};

export default EventSelector;
