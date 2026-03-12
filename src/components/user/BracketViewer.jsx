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
  }, [eventId]);

  const loadBrackets = async () => {
    try {
      setLoading(true);
      console.log('Cargando brackets para evento:', eventId);
      
      // Primero intentar cargar brackets oficiales
      let bracketsData = [];
      try {
        bracketsData = await getBracketsByEvent(eventId);
        console.log('Brackets oficiales encontrados:', bracketsData);
        setIsPreview(false);
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
          
          // Generar preview de brackets
          bracketsData = generatePreviewBrackets(eventParticipants, bracketType, participantsPerBracket);
          setIsPreview(true);
        }
      }

      setBrackets(bracketsData);

      // Cargar información de participantes
      const participantIds = new Set();
      bracketsData.forEach(bracket => {
        if (bracket.matches && Array.isArray(bracket.matches)) {
          bracket.matches.forEach(match => {
            if (match.participants && Array.isArray(match.participants)) {
              match.participants.forEach(id => participantIds.add(id));
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
                      return (
                        <div key={participantId} className="participant placeholder">
                          <div className="participant-name">
                            Ganador {participantId.replace('winner-group-', 'Grupo ')}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={participantId}
                        className={`participant ${match.winnerId === participantId ? 'winner' : ''}`}
                      >
                        <div className="participant-name">
                          {getParticipantName(participantId)}
                        </div>
                        {match.winnerId === participantId && (
                          <Trophy size={16} className="trophy-icon" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className={`match-status ${match.status}`}>
                  {match.status === 'completed' ? 'Completado' : 'Pendiente'}
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
