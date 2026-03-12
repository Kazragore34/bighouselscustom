import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getEventParticipants } from '../../services/events';
import { getUserById } from '../../services/users';
import { createVote, hasUserVoted, getVoteCountsByEvent } from '../../services/votes';
import { createBet } from '../../services/bets';
import { calculateOdds } from '../../utils/prizeCalculator';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../shared/PaymentModal';
import { Heart, DollarSign, Trophy, TrendingUp } from 'lucide-react';
import './VoteBetPanel.css';

const VoteBetPanel = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [voteCounts, setVoteCounts] = useState({});
  const [oddsData, setOddsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [userVoted, setUserVoted] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [betAmount, setBetAmount] = useState('');

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar participantes
      const participantsData = await getEventParticipants(eventId);
      
      // Cargar datos de usuarios
      const participantsWithData = await Promise.all(
        participantsData.map(async (p) => {
          const userData = await getUserById(p.userId);
          return { ...p, ...userData };
        })
      );

      setParticipants(participantsWithData);

      // Cargar conteo de votos
      const votes = await getVoteCountsByEvent(eventId);
      setVoteCounts(votes);

      // Verificar si el usuario ya votó
      const hasVoted = await hasUserVoted(eventId, user.id);
      setUserVoted(hasVoted);

      // Cargar odds para cada participante
      const oddsPromises = participantsWithData.map(async (p) => {
        const odds = await calculateOdds(eventId, p.userId);
        return { [p.userId]: odds };
      });
      const oddsResults = await Promise.all(oddsPromises);
      const oddsMap = Object.assign({}, ...oddsResults);
      setOddsData(oddsMap);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (participantId) => {
    try {
      await createVote(eventId, user.id, participantId);
      setUserVoted(true);
      await loadData(); // Recargar datos
      alert('Voto registrado exitosamente');
    } catch (error) {
      alert(error.message || 'Error al votar');
    }
  };

  const handleBet = async (participantId) => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    try {
      await createBet(eventId, user.id, participantId, betAmount);
      setShowPaymentModal(true);
      setBetAmount('');
      await loadData(); // Recargar datos
    } catch (error) {
      alert(error.message || 'Error al crear apuesta');
    }
  };

  if (loading) {
    return <div className="loading">Cargando participantes...</div>;
  }

  return (
    <div className="vote-bet-panel">
      <h2>Participantes</h2>
      
      <div className="participants-grid">
        {participants.map(participant => {
          const voteCount = voteCounts[participant.userId] || 0;
          const odds = oddsData[participant.userId] || { odds: 1.0, payoutMultiplier: 1.0 };
          
          return (
            <div key={participant.id} className="participant-card">
              <div className="participant-photo">
                {participant.photoURL ? (
                  <img src={participant.photoURL} alt={participant.username} />
                ) : (
                  <div className="photo-placeholder">
                    {participant.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="participant-info">
                <h3>{participant.username}</h3>
                <div className="participant-stats">
                  <div className="stat">
                    <Heart size={16} />
                    <span>{voteCount} votos</span>
                  </div>
                  <div className="stat">
                    <TrendingUp size={16} />
                    <span>Odds: {odds.odds}x</span>
                  </div>
                </div>
              </div>

              <div className="participant-actions">
                {!userVoted && (
                  <button
                    onClick={() => handleVote(participant.userId)}
                    className="btn-vote"
                  >
                    <Heart size={18} />
                    Votar por favorito
                  </button>
                )}

                <div className="bet-section">
                  <input
                    type="number"
                    placeholder="Monto a apostar"
                    value={selectedParticipant === participant.userId ? betAmount : ''}
                    onChange={(e) => {
                      setBetAmount(e.target.value);
                      setSelectedParticipant(participant.userId);
                    }}
                    min="0"
                    step="0.01"
                    className="bet-input"
                  />
                  <button
                    onClick={() => handleBet(participant.userId)}
                    className="btn-bet"
                    disabled={!betAmount || parseFloat(betAmount) <= 0}
                  >
                    <DollarSign size={18} />
                    Apostar
                  </button>
                </div>

                {odds.payoutMultiplier > 1 && (
                  <div className="payout-info">
                    <Trophy size={14} />
                    <span>Ganarías: ${(parseFloat(betAmount || 0) * odds.payoutMultiplier).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  );
};

export default VoteBetPanel;
