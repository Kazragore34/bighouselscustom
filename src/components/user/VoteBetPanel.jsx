import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventParticipants, getEventById } from '../../services/events';
import { getBracketsByEvent } from '../../services/brackets';
import { generatePreviewBrackets } from '../../services/brackets';
import { getUserById } from '../../services/users';
import { createVote, hasUserVoted, getVoteCountsByEvent } from '../../services/votes';
import { createBet } from '../../services/bets';
import { calculateOdds } from '../../utils/prizeCalculator';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../shared/PaymentModal';
import BetsModal from './BetsModal';
import { Heart, DollarSign, Trophy, TrendingUp, GitBranch } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './VoteBetPanel.css';

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
  const [betAmounts, setBetAmounts] = useState({}); // Objeto con participantId -> amount
  const [userBets, setUserBets] = useState({}); // Objeto con participantId -> array de apuestas
  const [eventData, setEventData] = useState(null); // Datos del evento para validar fecha límite
  const [previewBrackets, setPreviewBrackets] = useState([]); // Preview de brackets basado en participantes actuales
  const [showBetsModal, setShowBetsModal] = useState(false); // Modal de apuestas

  useEffect(() => {
    if (user && user.id && eventId) {
      // Refrescar usuario antes de cargar datos para asegurar datos actualizados
      refreshUser().then(() => {
        loadData();
      });
    }
    
    // Actualizar brackets cada 5 segundos para ver ganadores en tiempo real
    const interval = setInterval(() => {
      if (user && user.id && eventId) {
        loadBracketsPreview();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [eventId, user?.id]);

  const loadBracketsPreview = async () => {
    try {
      // Intentar cargar brackets oficiales
      const officialBrackets = await getBracketsByEvent(eventId);
      if (officialBrackets.length > 0) {
        setPreviewBrackets(officialBrackets);
        return;
      }
      
      // Si no hay oficiales, regenerar preview
      if (participants.length > 0) {
        const event = await getEventById(eventId);
        const bracketType = event.bracketType || '1v1';
        const participantsPerBracket = event.participantsPerBracket || 2;
        const preview = generatePreviewBrackets(participants, bracketType, participantsPerBracket);
        setPreviewBrackets(preview);
      }
    } catch (error) {
      console.error('Error actualizando brackets:', error);
    }
  };

  const loadData = async () => {
    if (!user || !user.id || !eventId) {
      console.error('No hay usuario o eventId:', { user, eventId });
      return;
    }

    try {
      setLoading(true);
      
      // Cargar datos del evento (para validar fecha límite)
      const event = await getEventById(eventId);
      setEventData(event);
      
      // Cargar participantes
      const participantsData = await getEventParticipants(eventId);
      
      // Cargar datos de usuarios
      const participantsWithData = await Promise.all(
        participantsData.map(async (p) => {
          try {
            const userData = await getUserById(p.userId);
            return { ...p, ...userData };
          } catch (error) {
            console.error('Error cargando usuario participante:', p.userId, error);
            return { ...p, username: 'Usuario no encontrado', name: 'Usuario no encontrado' };
          }
        })
      );

      setParticipants(participantsWithData);

      // Generar preview de brackets basado en participantes actuales
      if (participantsWithData.length > 0 && event) {
        const bracketType = event.bracketType || '1v1';
        const participantsPerBracket = event.participantsPerBracket || 2;
        const preview = generatePreviewBrackets(participantsWithData, bracketType, participantsPerBracket);
        setPreviewBrackets(preview);
      }

      // Cargar conteo de votos
      const votes = await getVoteCountsByEvent(eventId).catch(() => ({}));
      setVoteCounts(votes);

      // Verificar si el usuario ya votó
      try {
        const hasVoted = await hasUserVoted(eventId, user.id);
        setUserVoted(hasVoted);
      } catch (error) {
        console.error('Error verificando voto:', error);
        setUserVoted(false);
      }

      // Cargar odds para cada participante
      const oddsPromises = participantsWithData.map(async (p) => {
        try {
          const odds = await calculateOdds(eventId, p.userId);
          return { [p.userId]: odds };
        } catch (error) {
          console.error('Error calculando odds:', error);
          return { [p.userId]: { odds: 1.0, payoutMultiplier: 1.0 } };
        }
      });
      const oddsResults = await Promise.all(oddsPromises);
      const oddsMap = Object.assign({}, ...oddsResults);
      setOddsData(oddsMap);

      // Cargar apuestas del usuario por participante
      const betsRef = collection(db, 'bets');
      const userBetsQuery = query(
        betsRef,
        where('eventId', '==', eventId),
        where('userId', '==', user.id)
      );
      const userBetsSnapshot = await getDocs(userBetsQuery);
      const betsByParticipant = {};
      userBetsSnapshot.docs.forEach(doc => {
        const bet = doc.data();
        if (!betsByParticipant[bet.participantId]) {
          betsByParticipant[bet.participantId] = [];
        }
        betsByParticipant[bet.participantId].push({
          id: doc.id,
          ...bet
        });
      });
      setUserBets(betsByParticipant);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos del evento. Por favor, recarga la página.');
    } finally {
      setLoading(false);
    }
  };

  const isBettingClosed = () => {
    if (!eventData || !eventData.betDeadline) return false;
    const deadline = new Date(eventData.betDeadline);
    const now = new Date();
    return now > deadline;
  };

  const handleVote = async (participantId) => {
    // Verificar permisos - Solo bloqueamos SOLO_VISUALIZAR
    if (user.userType === 'SOLO_VISUALIZAR') {
      alert('No tienes permisos para votar. Contacta al administrador.');
      return;
    }
    
    // Verificar fecha límite
    if (isBettingClosed()) {
      alert('⚠️ El plazo para votar ha expirado. La fecha límite era: ' + new Date(eventData.betDeadline).toLocaleString('es-ES'));
      return;
    }
    
    // Admin, PARTICIPANTE y VOTANTE_APOSTADOR pueden votar

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
    // Verificar permisos - Solo bloqueamos SOLO_VISUALIZAR
    if (user.userType === 'SOLO_VISUALIZAR') {
      alert('No tienes permisos para apostar. Contacta al administrador.');
      return;
    }
    
    // Verificar fecha límite
    if (isBettingClosed()) {
      alert('⚠️ El plazo para apostar ha expirado. La fecha límite era: ' + new Date(eventData.betDeadline).toLocaleString('es-ES'));
      return;
    }
    
    // Admin, PARTICIPANTE y VOTANTE_APOSTADOR pueden apostar

    const amount = betAmounts[participantId];
    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    try {
      const maxBetPerUser = eventData?.maxBetPerUser || 0;
      await createBet(eventId, user.id, participantId, amount, maxBetPerUser);
      setShowPaymentModal(true);
      // Limpiar solo el monto de este participante
      setBetAmounts({ ...betAmounts, [participantId]: '' });
      await loadData(); // Recargar datos
    } catch (error) {
      alert(error.message || 'Error al crear apuesta');
    }
  };

  // Verificar permisos de forma más robusta
  const canVoteOrBet = user && user.userType && user.userType !== 'SOLO_VISUALIZAR';
  const hasNoPermissions = user && user.userType && user.userType === 'SOLO_VISUALIZAR';

  // Debug: mostrar userType en consola
  useEffect(() => {
    if (user) {
      console.log('Usuario actual:', user);
      console.log('userType:', user.userType);
      console.log('Puede votar/apostar:', canVoteOrBet);
    }
  }, [user?.id, user?.userType]);

  if (!user) {
    return <div className="loading">Cargando usuario...</div>;
  }

  if (loading) {
    return <div className="loading">Cargando participantes...</div>;
  }

  return (
    <div className="vote-bet-panel">
      <div className="panel-header">
        <h2>Participantes</h2>
        <div className="header-actions">
          <button
            onClick={() => setShowBetsModal(true)}
            className="btn-view-bets"
            title="Ver mis apuestas"
          >
            <DollarSign size={18} />
            Mis Apuestas
          </button>
          <button
            onClick={() => {
              console.log('Navegando a brackets para evento:', eventId);
              navigate(`/events/${eventId}/brackets`);
            }}
            className="btn-view-brackets"
            title="Ver brackets del evento"
          >
            <GitBranch size={18} />
            Ver Brackets
          </button>
        </div>
      </div>
      
      {/* Mostrar fecha límite si existe */}
      {eventData && eventData.betDeadline && (
        <div className={`deadline-warning ${isBettingClosed() ? 'closed' : 'open'}`}>
          {isBettingClosed() ? (
            <p>⚠️ <strong>El plazo para apostar/votar ha expirado</strong> - Fecha límite: {new Date(eventData.betDeadline).toLocaleString('es-ES')}</p>
          ) : (
            <p>⏰ <strong>Fecha límite para apostar/votar:</strong> {new Date(eventData.betDeadline).toLocaleString('es-ES')}</p>
          )}
        </div>
      )}
      
      {/* Debug info - remover en producción */}
      {user && (
        <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px', borderRadius: '8px', fontSize: '0.9rem' }}>
          <strong>Debug:</strong> Tu tipo de usuario es: <strong>{user.userType}</strong> | 
          Puedes votar/apostar: <strong>{canVoteOrBet ? 'SÍ' : 'NO'}</strong>
        </div>
      )}
      
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
                {/* Mostrar botón de votar solo si tiene permisos y no ha votado */}
                {!userVoted && canVoteOrBet && (
                  <button
                    onClick={() => handleVote(participant.userId)}
                    className="btn-vote"
                  >
                    <Heart size={18} />
                    Votar por favorito
                  </button>
                )}
                
                {/* Mostrar mensaje si ya votó */}
                {userVoted && (
                  <div className="voted-message">
                    <p>✓ Ya votaste en este evento</p>
                  </div>
                )}

                {/* Mostrar advertencia solo para usuarios sin permisos */}
                {hasNoPermissions && (
                  <div className="permission-warning">
                    <p>⚠️ No tienes permisos para votar/apostar. Contacta al administrador.</p>
                  </div>
                )}

                {/* Sección de apuesta - visible para todos con permisos */}
                {canVoteOrBet && (
                  <>
                    <div className="bet-section">
                      <input
                        type="number"
                        placeholder="Monto a apostar"
                        value={betAmounts[participant.userId] || ''}
                        onChange={(e) => {
                          setBetAmounts({
                            ...betAmounts,
                            [participant.userId]: e.target.value
                          });
                        }}
                        min="0"
                        step="0.01"
                        className="bet-input"
                      />
                      <button
                        onClick={() => handleBet(participant.userId)}
                        className="btn-bet"
                        disabled={!betAmounts[participant.userId] || parseFloat(betAmounts[participant.userId] || 0) <= 0}
                      >
                        <DollarSign size={18} />
                        Apostar
                      </button>
                    </div>
                    
                    {/* Mostrar ganancias potenciales siempre */}
                    {betAmounts[participant.userId] && parseFloat(betAmounts[participant.userId]) > 0 && (
                      <div className="payout-info">
                        <Trophy size={14} />
                        <span>Ganarías: ${(parseFloat(betAmounts[participant.userId]) * odds.payoutMultiplier).toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* Mostrar resumen de apuestas existentes */}
                    {userBets[participant.userId] && userBets[participant.userId].length > 0 && (
                      <div className="existing-bets-summary">
                        <p className="existing-bets-title">
                          {userBets[participant.userId].length} apuesta(s) - Total: ${userBets[participant.userId]
                            .filter(b => b.status === 'confirmed')
                            .reduce((sum, b) => sum + b.amount, 0)
                            .toFixed(2)}
                        </p>
                        <button
                          onClick={() => setShowBetsModal(true)}
                          className="btn-view-details"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección de Brackets - Mostrar preview en tiempo real */}
      {previewBrackets.length > 0 && previewBrackets[0].matches.length > 0 && (
        <div className="brackets-section">
          <div className="brackets-section-header">
            <h3>📊 Vista Previa de Brackets</h3>
            <button
              onClick={() => {
                console.log('Navegando a brackets para evento:', eventId);
                navigate(`/events/${eventId}/brackets`);
              }}
              className="btn-view-brackets-inline"
              title="Ver brackets completos del evento"
            >
              <GitBranch size={18} />
              Ver Brackets Completos
            </button>
          </div>
          <p className="brackets-info">
            Vista previa basada en los {participants.length} participantes actuales del evento.
          </p>
          
          {/* Mostrar preview de todas las rondas */}
          <div className="brackets-preview">
            {previewBrackets.map((bracket, bracketIndex) => (
              <div key={bracketIndex} className="preview-round">
                <h4>
                  {bracket.isFinal ? '🏆 Final' : `Ronda ${bracket.round || bracketIndex + 1}`}
                </h4>
                <div className="preview-matches-grid">
                  {bracket.matches.map((match, matchIndex) => (
                    <div key={matchIndex} className={`preview-match-card ${match.winnerId ? 'has-winner' : ''}`}>
                      <div className="preview-match-header">
                        <span>
                          {match.isGroup ? `Grupo ${matchIndex + 1}` : match.isFinal ? '🏆 Final' : `Match ${matchIndex + 1}`}
                        </span>
                        {match.winnerId && (
                          <span className="preview-winner-badge">
                            <Trophy size={12} />
                            Ganador
                          </span>
                        )}
                      </div>
                      <div className="preview-match-participants">
                        {match.participants.map((participantId, pIndex) => {
                          const participant = participants.find(p => p.userId === participantId);
                          const isWinner = match.winnerId === participantId;
                          return (
                            <div 
                              key={participantId} 
                              className={`preview-participant ${isWinner ? 'winner' : ''}`}
                            >
                              <div className="preview-participant-photo">
                                {participant?.photoURL ? (
                                  <img src={participant.photoURL} alt={participant.username} />
                                ) : (
                                  <div className="preview-photo-placeholder">
                                    {participant?.username?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                              <span className="preview-participant-name">
                                {participant?.username || participantId}
                              </span>
                              {isWinner && (
                                <Trophy size={14} className="preview-trophy" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {match.status === 'completed' && (
                        <div className="preview-match-status">
                          ✓ Completado
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />

      <BetsModal
        eventId={eventId}
        isOpen={showBetsModal}
        onClose={() => setShowBetsModal(false)}
      />
    </div>
  );
};

export default VoteBetPanel;
