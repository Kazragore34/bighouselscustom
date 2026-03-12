import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBetsByUser } from '../../services/bets';
import { calculateOdds } from '../../utils/prizeCalculator';
import { getUserById } from '../../services/users';
import { X, DollarSign, Trophy, Clock, CheckCircle } from 'lucide-react';
import './BetsModal.css';

const BetsModal = ({ eventId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [bets, setBets] = useState([]);
  const [participants, setParticipants] = useState({});
  const [oddsData, setOddsData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user && eventId) {
      loadBets();
    }
  }, [isOpen, user, eventId]);

  const loadBets = async () => {
    try {
      setLoading(true);
      const userBets = await getBetsByUser(user.id);
      const eventBets = userBets.filter(bet => bet.eventId === eventId);
      setBets(eventBets);

      // Cargar información de participantes y odds
      const participantIds = [...new Set(eventBets.map(bet => bet.participantId))];
      const participantsData = {};
      const oddsPromises = [];

      for (const participantId of participantIds) {
        try {
          const userData = await getUserById(participantId);
          participantsData[participantId] = userData;

          const odds = await calculateOdds(eventId, participantId);
          oddsPromises.push({ participantId, odds });
        } catch (error) {
          console.error('Error cargando participante:', participantId, error);
        }
      }

      setParticipants(participantsData);

      const oddsResults = await Promise.all(oddsPromises);
      const oddsMap = {};
      oddsResults.forEach(({ participantId, odds }) => {
        oddsMap[participantId] = odds;
      });
      setOddsData(oddsMap);
    } catch (error) {
      console.error('Error cargando apuestas:', error);
      alert('Error al cargar apuestas');
    } finally {
      setLoading(false);
    }
  };

  const getTotalBet = () => {
    return bets
      .filter(bet => bet.status === 'confirmed')
      .reduce((sum, bet) => sum + bet.amount, 0);
  };

  const getTotalPotentialWinnings = () => {
    return bets
      .filter(bet => bet.status === 'confirmed')
      .reduce((sum, bet) => {
        const odds = oddsData[bet.participantId];
        if (odds) {
          return sum + (bet.amount * odds.payoutMultiplier);
        }
        return sum;
      }, 0);
  };

  const getBetsByParticipant = () => {
    const grouped = {};
    bets.forEach(bet => {
      if (!grouped[bet.participantId]) {
        grouped[bet.participantId] = [];
      }
      grouped[bet.participantId].push(bet);
    });
    return grouped;
  };

  if (!isOpen) return null;

  const betsByParticipant = getBetsByParticipant();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bets-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mis Apuestas</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando apuestas...</div>
        ) : bets.length === 0 ? (
          <div className="no-bets">
            <DollarSign size={48} />
            <p>No tienes apuestas en este evento</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="bets-summary">
              <div className="summary-item">
                <span className="summary-label">Total Apostado:</span>
                <span className="summary-value">${getTotalBet().toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Ganancias Potenciales:</span>
                <span className="summary-value potential">${getTotalPotentialWinnings().toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Apuestas Confirmadas:</span>
                <span className="summary-value">
                  {bets.filter(b => b.status === 'confirmed').length} / {bets.length}
                </span>
              </div>
            </div>

            {/* Lista de apuestas por participante */}
            <div className="bets-list">
              {Object.entries(betsByParticipant).map(([participantId, participantBets]) => {
                const participant = participants[participantId];
                const odds = oddsData[participantId] || { odds: 1.0, payoutMultiplier: 1.0 };
                const totalBet = participantBets
                  .filter(b => b.status === 'confirmed')
                  .reduce((sum, b) => sum + b.amount, 0);
                const potentialWinnings = totalBet * odds.payoutMultiplier;

                return (
                  <div key={participantId} className="participant-bets-card">
                    <div className="participant-header">
                      <div className="participant-info">
                        {participant?.photoURL ? (
                          <img src={participant.photoURL} alt={participant.username} className="participant-photo" />
                        ) : (
                          <div className="participant-photo-placeholder">
                            {participant?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <h3>{participant?.username || 'Participante'}</h3>
                          <span className="odds-info">Odds: {odds.odds}x</span>
                        </div>
                      </div>
                    </div>

                    <div className="bets-details">
                      {participantBets.map(bet => (
                        <div key={bet.id} className="bet-item">
                          <div className="bet-amount">
                            <DollarSign size={16} />
                            <span>${bet.amount.toFixed(2)}</span>
                          </div>
                          <div className={`bet-status ${bet.status}`}>
                            {bet.status === 'confirmed' ? (
                              <>
                                <CheckCircle size={16} />
                                <span>Confirmada</span>
                              </>
                            ) : (
                              <>
                                <Clock size={16} />
                                <span>Pendiente</span>
                              </>
                            )}
                          </div>
                          {bet.status === 'confirmed' && (
                            <div className="bet-potential">
                              <Trophy size={14} />
                              <span>Ganarías: ${(bet.amount * odds.payoutMultiplier).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {totalBet > 0 && (
                      <div className="participant-total">
                        <strong>Total en este participante: ${totalBet.toFixed(2)}</strong>
                        <span className="potential-winnings">
                          Ganarías: ${potentialWinnings.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-close-modal">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetsModal;
