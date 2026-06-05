import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventParticipants, getEventById } from '../../services/events';
import { getBracketsByEvent } from '../../services/brackets';
import { getUserById } from '../../services/users';
import { createVote, hasUserVoted, getVoteCountsByEvent } from '../../services/votes';
import { createBet } from '../../services/bets';
import { calculateOdds } from '../../utils/prizeCalculator';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../shared/PaymentModal';
import BetsModal from './BetsModal';
import { Heart, DollarSign, Trophy, TrendingUp, GitBranch, ArrowLeft } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './VoteBetPanel.css';

const BLOCKED_ROLES = ['PENDIENTE_VERIFICACION', 'SOLO_VISUALIZAR', 'NO_PARTICIPA'];

const VoteBetPanel = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [voteCounts, setVoteCounts] = useState({});
  const [oddsData, setOddsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [userVoted, setUserVoted] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [betAmounts, setBetAmounts] = useState({});
  const [userBets, setUserBets] = useState({});
  const [eventData, setEventData] = useState(null);
  const [showBetsModal, setShowBetsModal] = useState(false);
  const [officialBracketsExist, setOfficialBracketsExist] = useState(false);

  useEffect(() => {
    if (user?.id && eventId) {
      refreshUser().then(() => loadData());
    }
  }, [eventId, user?.id]);

  const loadData = async () => {
    if (!user?.id || !eventId) return;
    try {
      setLoading(true);
      const event = await getEventById(eventId);
      setEventData(event);

      const participantsData = await getEventParticipants(eventId);
      const withData = await Promise.all(
        participantsData.map(async (p) => {
          try { return { ...p, ...await getUserById(p.userId) }; }
          catch { return { ...p, username: p.userId, name: p.userId }; }
        })
      );
      setParticipants(withData);

      // Comprobar si hay brackets oficiales (sin generarlos)
      try {
        const brackets = await getBracketsByEvent(eventId);
        setOfficialBracketsExist(brackets.filter(b => b.eventId === eventId).length > 0);
      } catch { setOfficialBracketsExist(false); }

      const votes = await getVoteCountsByEvent(eventId).catch(() => ({}));
      setVoteCounts(votes);

      const hasVoted = await hasUserVoted(eventId, user.id).catch(() => false);
      setUserVoted(hasVoted);

      const oddsResults = await Promise.all(
        withData.map(async (p) => {
          try {
            const odds = await calculateOdds(eventId, p.userId);
            return { [p.userId]: odds };
          } catch { return { [p.userId]: { odds: 1.0, payoutMultiplier: 1.0 } }; }
        })
      );
      setOddsData(Object.assign({}, ...oddsResults));

      const betsSnap = await getDocs(query(collection(db, 'bets'), where('eventId', '==', eventId), where('userId', '==', user.id)));
      const betsByParticipant = {};
      betsSnap.docs.forEach(d => {
        const b = { id: d.id, ...d.data() };
        if (!betsByParticipant[b.participantId]) betsByParticipant[b.participantId] = [];
        betsByParticipant[b.participantId].push(b);
      });
      setUserBets(betsByParticipant);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const isBettingClosed = () => {
    if (!eventData?.betDeadline) return false;
    return new Date() > new Date(eventData.betDeadline);
  };

  const userRole = user?.userType || user?.role || '';
  const canInteract = !BLOCKED_ROLES.includes(userRole);

  const handleVote = async (participantId) => {
    if (!canInteract) { alert('Tu cuenta está pendiente de verificación. Contacta al administrador.'); return; }
    if (isBettingClosed()) { alert('El plazo de votación ha expirado.'); return; }
    try {
      await createVote(eventId, user.id, participantId);
      setUserVoted(true);
      await loadData();
    } catch (error) {
      alert(error.message || 'Error al votar');
    }
  };

  const handleBet = async (participantId) => {
    if (!canInteract) { alert('Tu cuenta está pendiente de verificación. Contacta al administrador.'); return; }
    if (isBettingClosed()) { alert('El plazo de apuestas ha expirado.'); return; }
    const amount = betAmounts[participantId];
    if (!amount || parseFloat(amount) <= 0) { alert('Ingresa un monto válido'); return; }
    try {
      await createBet(eventId, user.id, participantId, amount, eventData?.maxBetPerUser || 0);
      setShowPaymentModal(true);
      setBetAmounts(prev => ({ ...prev, [participantId]: '' }));
      await loadData();
    } catch (error) {
      alert(error.message || 'Error al crear apuesta');
    }
  };

  if (!user) return <div className="loading" style={{ color: 'var(--text-muted)', padding: 48, textAlign: 'center' }}>Cargando...</div>;
  if (loading) return <div className="loading" style={{ color: 'var(--text-muted)', padding: 48, textAlign: 'center' }}>Cargando participantes...</div>;

  return (
    <div className="vote-bet-panel">
      {/* Header */}
      <div className="vbp-header">
        <button className="btn-vbp-back" onClick={() => navigate('/events')}>
          <ArrowLeft size={16} /> Eventos
        </button>
        <h2 className="vbp-title">{eventData?.name || 'Evento'}</h2>
        <div className="vbp-header-actions">
          <button className="btn-vbp-action" onClick={() => setShowBetsModal(true)}>
            <DollarSign size={16} /> Mis Apuestas
          </button>
          {officialBracketsExist && (
            <button className="btn-vbp-action" onClick={() => navigate(`/events/${eventId}/brackets`)}>
              <GitBranch size={16} /> Bracket
            </button>
          )}
        </div>
      </div>

      {/* Aviso de fecha límite */}
      {eventData?.betDeadline && (
        <div className={`vbp-deadline ${isBettingClosed() ? 'closed' : 'open'}`}>
          {isBettingClosed()
            ? `⚠️ Apuestas cerradas — límite: ${new Date(eventData.betDeadline).toLocaleString('es-ES')}`
            : `⏰ Límite: ${new Date(eventData.betDeadline).toLocaleString('es-ES')}`
          }
        </div>
      )}

      {/* Aviso de cuenta pendiente */}
      {!canInteract && (
        <div className="vbp-pending-notice">
          Tu cuenta está <strong>pendiente de verificación</strong>. Un administrador debe verificarla antes de poder votar o apostar.
        </div>
      )}

      {/* Grid de participantes */}
      {participants.length === 0 ? (
        <div className="vbp-no-participants">
          <Trophy size={40} />
          <p>No hay participantes en este evento</p>
        </div>
      ) : (
        <div className="participants-grid">
          {participants.map(p => {
            const voteCount = voteCounts[p.userId] || 0;
            const odds = oddsData[p.userId] || { odds: 1.0, payoutMultiplier: 1.0 };
            const myBets = userBets[p.userId] || [];
            const confirmedBetTotal = myBets.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.amount, 0);

            return (
              <div key={p.id} className="participant-card">
                {/* Foto */}
                <div className="participant-photo">
                  {p.photoURL
                    ? <img src={p.photoURL} alt={p.username} />
                    : <div className="photo-placeholder">{(p.username || '?')[0].toUpperCase()}</div>
                  }
                </div>

                <div className="participant-info">
                  <h3>{p.username || p.name}</h3>
                  <div className="participant-stats">
                    <span><Heart size={13} /> {voteCount}</span>
                    <span><TrendingUp size={13} /> {odds.odds}x</span>
                  </div>
                </div>

                <div className="participant-actions">
                  {/* Votar */}
                  {!userVoted && canInteract && !isBettingClosed() && (
                    <button className="btn-vote" onClick={() => handleVote(p.userId)}>
                      <Heart size={15} /> Votar
                    </button>
                  )}
                  {userVoted && (
                    <div className="voted-badge">✓ Votado</div>
                  )}

                  {/* Apostar */}
                  {canInteract && !isBettingClosed() && (
                    <div className="bet-section">
                      <input
                        type="number"
                        placeholder="Monto IC"
                        value={betAmounts[p.userId] || ''}
                        onChange={e => setBetAmounts(prev => ({ ...prev, [p.userId]: e.target.value }))}
                        min="0"
                        step="1"
                        className="bet-input"
                      />
                      <button
                        className="btn-bet"
                        onClick={() => handleBet(p.userId)}
                        disabled={!betAmounts[p.userId] || parseFloat(betAmounts[p.userId] || 0) <= 0}
                      >
                        <DollarSign size={15} /> Apostar
                      </button>
                    </div>
                  )}

                  {/* Ganancia potencial */}
                  {betAmounts[p.userId] && parseFloat(betAmounts[p.userId]) > 0 && (
                    <div className="payout-preview">
                      <Trophy size={12} /> Ganarías: ${(parseFloat(betAmounts[p.userId]) * odds.payoutMultiplier).toFixed(0)}
                    </div>
                  )}

                  {/* Resumen de mis apuestas */}
                  {myBets.length > 0 && (
                    <div className="my-bets-summary">
                      <span>{myBets.length} apuesta{myBets.length > 1 ? 's' : ''}</span>
                      {confirmedBetTotal > 0 && <span className="confirmed-amount">${confirmedBetTotal.toFixed(0)} confirmados</span>}
                      <button className="btn-see-bets" onClick={() => setShowBetsModal(true)}>Ver</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
      <BetsModal eventId={eventId} isOpen={showBetsModal} onClose={() => setShowBetsModal(false)} />
    </div>
  );
};

export default VoteBetPanel;
