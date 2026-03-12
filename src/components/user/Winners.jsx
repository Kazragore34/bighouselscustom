import { useState, useEffect } from 'react';
import { getAllEvents, getEventById } from '../../services/events';
import { getVoteCountsByEvent } from '../../services/votes';
import { getUserById } from '../../services/users';
import { Trophy, Star, Award, Medal } from 'lucide-react';
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
  const [topWinners, setTopWinners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadTopVoted(selectedEvent);
      loadEventWinners(selectedEvent);
    } else {
      loadGlobalTopVoted();
      loadGlobalWinners();
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
      // Obtener todos los eventos activos/completados y sumar votos
      const allEvents = await getAllEvents();
      const activeEvents = allEvents.filter(e => e.status === 'active' || e.status === 'completed');
      
      const voteCountsMap = {};
      
      for (const event of activeEvents) {
        try {
          const voteCounts = await getVoteCountsByEvent(event.id);
          Object.entries(voteCounts).forEach(([userId, count]) => {
            voteCountsMap[userId] = (voteCountsMap[userId] || 0) + count;
          });
        } catch (error) {
          console.warn('Error cargando votos del evento:', event.id, error);
        }
      }
      
      const topVotedList = await Promise.all(
        Object.entries(voteCountsMap)
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
      console.error('Error cargando top global:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventWinners = async (eventId) => {
    try {
      const event = await getEventById(eventId);
      const winners = [];
      
      if (event.winnerId) {
        try {
          const winnerData = await getUserById(event.winnerId);
          winners.push({
            ...winnerData,
            eventId: event.id,
            eventName: event.name,
            eventIcon: event.icon
          });
        } catch (error) {
          console.warn('Error cargando ganador:', error);
        }
      }
      
      setTopWinners(winners.slice(0, 5));
    } catch (error) {
      console.error('Error cargando ganadores del evento:', error);
      setTopWinners([]);
    }
  };

  const loadGlobalWinners = async () => {
    try {
      const allEvents = await getAllEvents();
      const completedEvents = allEvents.filter(e => 
        e.status === 'completed' && (e.winnerId || e.winnerTeamId)
      );
      
      const winnersList = await Promise.all(
        completedEvents
          .slice(0, 5) // Solo los primeros 5 eventos con ganadores
          .map(async (event) => {
            try {
              if (event.winnerId) {
                const winnerData = await getUserById(event.winnerId);
                return {
                  ...winnerData,
                  eventId: event.id,
                  eventName: event.name,
                  eventIcon: event.icon,
                  winnerSetAt: event.winnerSetAt
                };
              }
              return null;
            } catch (error) {
              console.warn('Error cargando ganador del evento:', event.id, error);
              return null;
            }
          })
      );
      
      // Filtrar nulls y ordenar por fecha más reciente
      const validWinners = winnersList
        .filter(w => w !== null)
        .sort((a, b) => {
          if (a.winnerSetAt && b.winnerSetAt) {
            return b.winnerSetAt.toMillis() - a.winnerSetAt.toMillis();
          }
          return 0;
        })
        .slice(0, 5);
      
      setTopWinners(validWinners);
    } catch (error) {
      console.error('Error cargando ganadores globales:', error);
      setTopWinners([]);
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
        <div className="winners-content">
          {/* Sección 1: Más Votados */}
          <div className="winners-section">
            <div className="section-header">
              <Star size={28} className="section-icon" />
              <h2>Más Votados</h2>
            </div>
            {topVoted.length === 0 ? (
              <div className="no-data">
                <Star size={48} />
                <p>Aún no hay votos registrados</p>
              </div>
            ) : (
              <div className="winners-list">
                {topVoted.map((participant, index) => (
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
                            {participant.username?.charAt(0).toUpperCase() || '?'}
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
                ))}
              </div>
            )}
          </div>

          {/* Sección 2: Top 5 Ganadores */}
          <div className="winners-section">
            <div className="section-header">
              <Medal size={28} className="section-icon" />
              <h2>Top 5 Ganadores</h2>
            </div>
            {topWinners.length === 0 ? (
              <div className="no-data">
                <Trophy size={48} />
                <p>Aún no hay ganadores de eventos</p>
                <p className="no-data-subtitle">Los ganadores aparecerán aquí cuando los eventos se completen</p>
              </div>
            ) : (
              <div className="winners-list">
                {topWinners.map((winner, index) => (
                  <div key={winner.id || winner.eventId || index} className="winner-card winner-card-gold">
                    <div className="winner-rank">
                      {index === 0 && <Trophy size={28} className="gold" />}
                      {index === 1 && <Trophy size={26} className="silver" />}
                      {index === 2 && <Trophy size={24} className="bronze" />}
                      {index > 2 && <span className="rank-number">#{index + 1}</span>}
                    </div>
                    <div className="winner-info">
                      <div className="winner-photo">
                        {winner.photoURL ? (
                          <img src={winner.photoURL} alt={winner.username} />
                        ) : (
                          <div className="photo-placeholder">
                            {winner.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="winner-details">
                        <h3>{winner.username}</h3>
                        <div className="winner-event-info">
                          <span className="event-icon">{iconMap[winner.eventIcon] || '🏆'}</span>
                          <span className="event-name">{winner.eventName}</span>
                        </div>
                        {winner.badges && winner.badges.length > 0 && (
                          <div className="badges-list">
                            {winner.badges.map((badge, bIndex) => (
                              <span key={bIndex} className="badge-item">
                                {iconMap[badge.icon] || '🏆'} {badge.eventName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Winners;
