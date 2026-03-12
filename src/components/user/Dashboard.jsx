import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EventSelector from './EventSelector';
import { Trophy, TrendingUp, Users, DollarSign, Heart } from 'lucide-react';
import { getActiveEvents } from '../../services/events';
import { getBetsByUser } from '../../services/bets';
import { getVotesByUser } from '../../services/votes';
import { getVoteCountsByEvent } from '../../services/votes';
import { getUserById } from '../../services/users';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeEvents: 0,
    votesMade: 0,
    totalBet: 0,
    badges: 0
  });
  const [topVotedByEvent, setTopVotedByEvent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.id) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar eventos activos
      const activeEvents = await getActiveEvents();
      
      // Cargar votos y apuestas del usuario
      const [userVotes, userBets] = await Promise.all([
        getVotesByUser(user.id).catch(() => []),
        getBetsByUser(user.id).catch(() => [])
      ]);

      // Calcular total apostado (solo apuestas confirmadas)
      const totalBet = userBets
        .filter(bet => bet.status === 'confirmed')
        .reduce((sum, bet) => sum + bet.amount, 0);

      // Obtener badges del usuario
      const userData = await getUserById(user.id).catch(() => ({ badges: [] }));
      const badges = userData.badges?.length || 0;

      // Obtener más votado por evento
      const topVotedPromises = activeEvents.map(async (event) => {
        try {
          const voteCounts = await getVoteCountsByEvent(event.id);
          if (Object.keys(voteCounts).length === 0) return null;
          
          const topParticipant = Object.entries(voteCounts)
            .sort(([, a], [, b]) => b - a)[0];
          
          if (topParticipant) {
            const participantData = await getUserById(topParticipant[0]).catch(() => null);
            return {
              eventId: event.id,
              eventName: event.name,
              participantId: topParticipant[0],
              participantName: participantData?.username || 'Desconocido',
              votes: topParticipant[1]
            };
          }
          return null;
        } catch (error) {
          console.error('Error obteniendo más votado:', error);
          return null;
        }
      });

      const topVoted = (await Promise.all(topVotedPromises)).filter(Boolean);

      setStats({
        activeEvents: activeEvents.length,
        votesMade: userVotes.length,
        totalBet,
        badges
      });
      setTopVotedByEvent(topVoted);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // El admin puede ver el dashboard de usuario también
  // Si quiere ir al panel admin, puede usar el menú de navegación

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h1>Bienvenido, {user?.username}</h1>
        <p>Selecciona un evento para comenzar</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <Trophy className="stat-icon" />
          <div className="stat-info">
            <h3>{loading ? '...' : stats.activeEvents}</h3>
            <p>Eventos Activos</p>
          </div>
        </div>
        <div className="stat-card">
          <Heart className="stat-icon" />
          <div className="stat-info">
            <h3>{loading ? '...' : stats.votesMade}</h3>
            <p>Votos Realizados</p>
          </div>
        </div>
        <div className="stat-card">
          <DollarSign className="stat-icon" />
          <div className="stat-info">
            <h3>${loading ? '...' : stats.totalBet.toFixed(2)}</h3>
            <p>Total Apostado</p>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp className="stat-icon" />
          <div className="stat-info">
            <h3>{loading ? '...' : stats.badges}</h3>
            <p>Insignias</p>
          </div>
        </div>
      </div>

      {/* Mostrar más votado por evento */}
      {topVotedByEvent.length > 0 && (
        <div className="top-voted-section">
          <h2>⭐ Más Votados por Evento</h2>
          <div className="top-voted-grid">
            {topVotedByEvent.map((item) => (
              <div key={item.eventId} className="top-voted-card" onClick={() => navigate(`/events/${item.eventId}`)}>
                <h3>{item.eventName}</h3>
                <div className="top-voted-info">
                  <span className="top-voted-name">{item.participantName}</span>
                  <span className="top-voted-count">
                    <Heart size={14} />
                    {item.votes} votos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EventSelector />
    </div>
  );
};

export default Dashboard;
