import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBracketsByEvent, generatePreviewBrackets } from '../../services/brackets';
import { getEventParticipants } from '../../services/events';
import { getUserById } from '../../services/users';
import { Trophy, ArrowLeft, RefreshCw } from 'lucide-react';
import './BracketViewer.css';

const BracketViewer = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [brackets, setBrackets] = useState([]);
  const [participants, setParticipants] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    loadBrackets();
    
    // NO actualizar automáticamente constantemente
    // Solo se actualizará cuando el usuario haga clic en "Actualizar" o cuando cambien los participantes
    // Esto evita que los brackets cambien constantemente y no se puedan ver
  }, [eventId]);

  const loadBrackets = async () => {
    try {
      setLoading(true);
      console.log('Cargando brackets para evento:', eventId);
      
      // Primero intentar cargar brackets oficiales
      let bracketsData = [];
      try {
        const allBrackets = await getBracketsByEvent(eventId);
        // Filtrar solo brackets del evento actual para asegurar que no haya mezcla
        bracketsData = allBrackets.filter(b => b.eventId === eventId);
        console.log('Brackets oficiales encontrados:', bracketsData.length, bracketsData);
        
        if (bracketsData.length > 0) {
          setIsPreview(false);
        } else {
          setIsPreview(true);
        }
      } catch (error) {
        console.warn('No hay brackets oficiales, generando preview:', error);
        setIsPreview(true);
      }

      // Si no hay brackets oficiales, generar preview basado en participantes actuales
      if (bracketsData.length === 0) {
        const eventParticipants = await getEventParticipants(eventId);
        console.log('Participantes del evento:', eventParticipants);
        
        if (eventParticipants.length > 0) {
          // Obtener datos del evento para saber el tipo de bracket
          const { getEventById } = await import('../../services/events');
          const event = await getEventById(eventId);
          const bracketType = event.bracketType || '1v1';
          const participantsPerBracket = event.participantsPerBracket || 2;
          
          // Generar preview de brackets SOLO con participantes de este evento
          bracketsData = generatePreviewBrackets(eventParticipants, bracketType, participantsPerBracket);
          setIsPreview(true);
        }
      }

      setBrackets(bracketsData);

      // Cargar información de participantes (incluyendo ganadores de matches anteriores)
      const participantIds = new Set();
      bracketsData.forEach(bracket => {
        if (bracket.matches && Array.isArray(bracket.matches)) {
          bracket.matches.forEach(match => {
            if (match.participants && Array.isArray(match.participants)) {
              match.participants.forEach(id => {
                // Manejar placeholders de ganadores de grupos
                if (!id.startsWith('winner-group-')) {
                  participantIds.add(id);
                }
              });
            }
            // Agregar ganadores también
            if (match.winnerId) {
              participantIds.add(match.winnerId);
            }
          });
        }
      });

      const participantsData = {};
      for (const id of participantIds) {
        try {
          const userData = await getUserById(id);
          participantsData[id] = userData;
        } catch (error) {
          console.warn('Error cargando participante:', id, error);
          participantsData[id] = { username: id };
        }
      }
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error cargando brackets:', error);
      // No mostrar alert, solo log
    } finally {
      setLoading(false);
    }
  };

  const getParticipantName = (participantId) => {
    return participants[participantId]?.username || participantId;
  };

  if (loading) {
    return <div className="loading">Cargando brackets...</div>;
  }

  if (brackets.length === 0) {
    return (
      <div className="bracket-viewer">
        <div className="bracket-header">
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="btn-back"
            title="Volver al evento"
          >
            <ArrowLeft size={18} />
            Volver al Evento
          </button>
          <h2>Brackets del Evento</h2>
        </div>
        <div className="no-brackets">
          <Trophy size={48} />
          <p>Los brackets aún no han sido creados</p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
            El administrador debe crear los brackets desde el panel de administración.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bracket-viewer">
      <div className="bracket-header">
        <button
          onClick={() => navigate(`/events/${eventId}`)}
          className="btn-back"
          title="Volver al evento"
        >
          <ArrowLeft size={18} />
          Volver al Evento
        </button>
        <div className="bracket-title-section">
          <h2>Brackets del Evento</h2>
          {isPreview && (
            <span className="preview-badge">
              📊 Vista Previa (basada en participantes actuales)
            </span>
          )}
        </div>
        <button
          onClick={loadBrackets}
          className="btn-refresh"
          title="Actualizar brackets"
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </div>
      
      <div className="bracket-rounds-container">
        {brackets.map((bracket, bracketIndex) => (
          <div key={bracketIndex} className="bracket-round">
            <h3>
              {bracket.isFinal ? '🏆 Final' : `Ronda ${bracket.round}`}
            </h3>
            <div className="matches-container">
            {bracket.matches.map((match, matchIndex) => (
              <div key={matchIndex} className={`match-card ${match.isGroup ? 'group-match' : ''} ${match.isFinal ? 'final-match' : ''}`}>
                <div className="match-header">
                  {match.isGroup ? (
                    <span>Grupo {matchIndex + 1}</span>
                  ) : match.isFinal ? (
                    <span>🏆 Final</span>
                  ) : (
                    <span>Match {matchIndex + 1}</span>
                  )}
                  {match.winnerId && (
                    <span className="winner-badge">
                      <Trophy size={14} />
                      Ganador
                    </span>
                  )}
                </div>
                <div className="match-participants">
                  {match.participants.map((participantId, pIndex) => {
                    // Manejar placeholders para ganadores de grupos
                    if (participantId.startsWith('winner-group-')) {
                      // Buscar el ganador real del grupo anterior SOLO en brackets del mismo evento
                      const groupNumber = participantId.replace('winner-group-', '');
                      const previousRound = brackets.find((b, idx) => 
                        idx < bracketIndex && 
                        b.round === bracket.round - 1 &&
                        b.eventId === bracket.eventId
                      );
                      let actualWinner = null;
                      
                      if (previousRound && previousRound.matches) {
                        const groupMatch = previousRound.matches[parseInt(groupNumber) - 1];
                        if (groupMatch && groupMatch.winnerId) {
                          actualWinner = groupMatch.winnerId;
                        }
                      }
                      
                      return (
                        <div key={participantId} className={`participant placeholder ${actualWinner ? 'has-winner' : ''}`}>
                          <div className="participant-name">
                            {actualWinner ? (
                              <>
                                <Trophy size={14} className="trophy-icon-small" />
                                {getParticipantName(actualWinner)}
                              </>
                            ) : (
                              `Ganador ${participantId.replace('winner-group-', 'Grupo ')}`
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Filtrar "pending" y valores inválidos - no mostrar participantes pendientes
                    if (!participantId || participantId === 'pending' || participantId === null || participantId === undefined) {
                      return null;
                    }
                    
                    const isWinner = match.winnerId === participantId;
                    const participant = participants[participantId];
                    
                    return (
                      <div
                        key={participantId}
                        className={`participant ${isWinner ? 'winner' : ''} ${match.status === 'completed' && !isWinner ? 'eliminated' : ''}`}
                      >
                        <div className="participant-info-row">
                          {participant?.photoURL ? (
                            <img src={participant.photoURL} alt={participant.username} className="participant-photo-bracket" />
                          ) : (
                            <div className="participant-photo-placeholder-bracket">
                              {participant?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="participant-name">
                            {getParticipantName(participantId)}
                          </div>
                        </div>
                        {isWinner && (
                          <div className="winner-indicator">
                            <Trophy size={18} className="trophy-icon" />
                            <span>Ganador</span>
                          </div>
                        )}
                        {match.status === 'completed' && !isWinner && (
                          <div className="eliminated-indicator">
                            Eliminado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className={`match-status ${match.status}`}>
                  {match.status === 'completed' ? (
                    <span className="status-completed">
                      <Trophy size={14} />
                      Completado
                    </span>
                  ) : (
                    <span className="status-pending">
                      ⏳ Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketViewer;
