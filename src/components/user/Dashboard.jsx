import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EventSelector from './EventSelector';
import { Trophy, TrendingUp, DollarSign, Heart } from 'lucide-react';
import { getActiveEvents } from '../../services/events';
import { getBetsByUser } from '../../services/bets';
import { getVotesByUser, getVoteCountsByEvent } from '../../services/votes';
import { getUserById } from '../../services/users';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeEvents: 0, votesMade: 0, totalBet: 0, badges: 0 });
  const [topVotedByEvent, setTopVotedByEvent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const activeEvents = await getActiveEvents();
      const [userVotes, userBets] = await Promise.all([
        getVotesByUser(user.id).catch(() => []),
        getBetsByUser(user.id).catch(() => [])
      ]);

      const totalBet = userBets
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.amount, 0);

      const userData = await getUserById(user.id).catch(() => ({ badges: [] }));
      const badges = userData.badges?.length || 0;

      const topVotedPromises = activeEvents.map(async (event) => {
        try {
          const voteCounts = await getVoteCountsByEvent(event.id);
          if (!Object.keys(voteCounts).length) return null;
          const top = Object.entries(voteCounts).sort(([, a], [, b]) => b - a)[0];
          if (!top) return null;
          const pData = await getUserById(top[0]).catch(() => null);
          return {
            eventId: event.id,
            eventName: event.name,
            participantName: pData?.username || 'Desconocido',
            votes: top[1]
          };
        } catch { return null; }
      });

      setStats({ activeEvents: activeEvents.length, votesMade: userVotes.length, totalBet, badges });
      setTopVotedByEvent((await Promise.all(topVotedPromises)).filter(Boolean));
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPending = user?.userType === 'PENDIENTE_VERIFICACION' || user?.role === 'PENDIENTE_VERIFICACION';

  return (
    <div className="user-dashboard">
      <div className="dashboard-hero">
        <h1>
          Bienvenido, <span className="hero-name">{user?.username || user?.name}</span>
        </h1>
        <p>Tu plataforma de apuestas</p>

        {isPending && (
          <div className="pending-banner">
            Tu cuenta está pendiente de verificación. Un administrador la revisará pronto.
          </div>
        )}
      </div>

      <div className="dashboard-stats">
        {[
          { icon: <Trophy size={20} />, value: stats.activeEvents, label: 'Eventos Activos' },
          { icon: <Heart size={20} />, value: stats.votesMade, label: 'Votos Realizados' },
          { icon: <DollarSign size={20} />, value: `$${stats.totalBet.toFixed(0)}`, label: 'Total Apostado' },
          { icon: <TrendingUp size={20} />, value: stats.badges, label: 'Insignias' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon-wrap">{s.icon}</div>
            <div className="stat-info">
              <h3>{loading ? '—' : s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {topVotedByEvent.length > 0 && (
        <div className="top-voted-section">
          <p className="section-title">Más Votados</p>
          <div className="top-voted-grid">
            {topVotedByEvent.map((item) => (
              <div
                key={item.eventId}
                className="top-voted-card"
                onClick={() => navigate(`/events/${item.eventId}`)}
              >
                <h3>{item.eventName}</h3>
                <div className="top-voted-info">
                  <span className="top-voted-name">{item.participantName}</span>
                  <span className="top-voted-count">
                    <Heart size={13} />
                    {item.votes}
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
