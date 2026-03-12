import { useState, useEffect } from 'react';
import { getAllEvents } from '../../services/events';
import { getVoteCountsByEvent } from '../../services/votes';
import { getUserById } from '../../services/users';
import { Trophy, Star, Award } from 'lucide-react';
import './Winners.css';

const iconMap = {
  car: '🚗',
  boxing: '🥊',
  running: '🏃',
  search: '🔍',
  trophy: '🏆'
};

const Winners = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [topVoted, setTopVoted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadTopVoted(selectedEvent);
    } else {
      loadGlobalTopVoted();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const eventsData = await getAllEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  };

  const loadTopVoted = async (eventId) => {
    try {
      setLoading(true);
      const voteCounts = await getVoteCountsByEvent(eventId);
      
      const topVotedList = await Promise.all(
        Object.entries(voteCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(async ([userId, count]) => {
            try {
              const userData = await getUserById(userId);
              return { ...userData, voteCount: count };
            } catch (error) {
              return { username: userId, voteCount: count };
            }
          })
      );

      setTopVoted(topVotedList);
    } catch (error) {
      console.error('Error cargando top votados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalTopVoted = async () => {
    try {
      setLoading(true);
      // Implementar lógica para top global
      setTopVoted([]);
    } catch (error) {
      console.error('Error cargando top global:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="winners-page">
      <div className="page-header">
        <h1>
          <Trophy size={32} />
          Ganadores y Top Votados
        </h1>
      </div>

      <div className="event-filter">
        <button
          onClick={() => setSelectedEvent(null)}
          className={!selectedEvent ? 'active' : ''}
        >
          General
        </button>
        {events.map(event => (
          <button
            key={event.id}
            onClick={() => setSelectedEvent(event.id)}
            className={selectedEvent === event.id ? 'active' : ''}
          >
            {iconMap[event.icon] || '🏆'} {event.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="winners-list">
          {topVoted.length === 0 ? (
            <div className="no-winners">
              <Award size={64} />
              <p>No hay datos disponibles aún</p>
            </div>
          ) : (
            topVoted.map((participant, index) => (
              <div key={participant.id || index} className="winner-card">
                <div className="winner-rank">
                  {index === 0 && <Trophy size={24} className="gold" />}
                  {index === 1 && <Trophy size={24} className="silver" />}
                  {index === 2 && <Trophy size={24} className="bronze" />}
                  {index > 2 && <span className="rank-number">#{index + 1}</span>}
                </div>
                <div className="winner-info">
                  <div className="winner-photo">
                    {participant.photoURL ? (
                      <img src={participant.photoURL} alt={participant.username} />
                    ) : (
                      <div className="photo-placeholder">
                        {participant.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="winner-details">
                    <h3>{participant.username}</h3>
                    <div className="winner-stats">
                      <Star size={16} />
                      <span>{participant.voteCount} votos</span>
                    </div>
                    {participant.badges && participant.badges.length > 0 && (
                      <div className="badges-list">
                        {participant.badges.map((badge, bIndex) => (
                          <span key={bIndex} className="badge-item">
                            {iconMap[badge.icon] || '🏆'} {badge.eventName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Winners;
