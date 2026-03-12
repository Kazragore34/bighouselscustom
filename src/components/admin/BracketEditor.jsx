import { useState, useEffect } from 'react';
import { getBracketsByEvent, updateBracket, generateSmartBrackets, updateMatchWinner } from '../../services/brackets';
import { getEventParticipants, getEventById } from '../../services/events';
import { getUserById } from '../../services/users';
import { Shuffle, Save, RefreshCw, Trophy, Check } from 'lucide-react';
import './BracketEditor.css';

import { useParams } from 'react-router-dom';

const BracketEditor = () => {
  const { eventId } = useParams();
  const [brackets, setBrackets] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participantsData, setParticipantsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bracketsData, participantsData, eventData] = await Promise.all([
        getBracketsByEvent(eventId),
        getEventParticipants(eventId),
        getEventById(eventId)
      ]);
      
      setBrackets(bracketsData);
      setParticipants(participantsData);
      setEvent(eventData);
      
      // Cargar datos completos de participantes
      const participantsMap = {};
      for (const p of participantsData) {
        try {
          const userData = await getUserById(p.userId);
          participantsMap[p.userId] = userData;
        } catch (err) {
          participantsMap[p.userId] = { username: p.userId };
        }
      }
      setParticipantsData(participantsMap);
      
      // Establecer ronda actual (última ronda con matches pendientes o última ronda)
      if (bracketsData.length > 0) {
        const lastRound = bracketsData[bracketsData.length - 1];
        const hasPendingMatches = lastRound.matches.some(m => m.status === 'pending');
        setRound(hasPendingMatches ? bracketsData.length : Math.max(1, bracketsData.length - 1));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBrackets = async () => {
    if (!confirm('¿Generar brackets automáticamente? Esto reemplazará los brackets existentes.')) {
      return;
    }

    try {
      await generateSmartBrackets(eventId, participants, 'custom', 2);
      alert('Brackets generados exitosamente');
      loadData();
    } catch (error) {
      alert('Error al generar brackets: ' + error.message);
    }
  };


  const handleSetWinner = async (matchId, winnerId) => {
    try {
      const currentBracket = brackets[round - 1];
      if (!currentBracket) return;

      await updateMatchWinner(currentBracket.id, matchId, winnerId, eventId);
      alert('Ganador establecido. La siguiente ronda se generará automáticamente si todos los matches están completos.');
      await loadData(); // Recargar para ver la siguiente ronda
    } catch (error) {
      alert('Error al establecer ganador: ' + error.message);
    }
  };

  const handleSaveBrackets = async () => {
    try {
      const currentBracket = brackets[round - 1];
      if (currentBracket) {
        await updateBracket(currentBracket.id, { matches: currentBracket.matches });
        alert('Brackets guardados exitosamente');
      }
    } catch (error) {
      alert('Error al guardar brackets');
    }
  };

  if (loading) {
    return <div className="loading">Cargando brackets...</div>;
  }

  const currentBracket = brackets[round - 1];

  return (
    <div className="bracket-editor">
      <div className="editor-header">
        <h2>Editor de Brackets</h2>
        <div className="editor-actions">
          <button onClick={handleGenerateBrackets} className="btn-generate">
            <Shuffle size={18} />
            Generar Automáticamente
          </button>
          <button onClick={handleSaveBrackets} className="btn-save">
            <Save size={18} />
            Guardar Cambios
          </button>
        </div>
      </div>

      {brackets.length > 0 && (
        <div className="round-selector">
          <label>Ronda:</label>
          <select value={round} onChange={(e) => setRound(parseInt(e.target.value))}>
            {brackets.map((_, index) => (
              <option key={index} value={index + 1}>Ronda {index + 1}</option>
            ))}
          </select>
        </div>
      )}

      {currentBracket ? (
        <div className="brackets-container">
          {currentBracket.matches.map((match, matchIndex) => {
            const isCompleted = match.status === 'completed' && match.winnerId;
            return (
              <div key={matchIndex} className={`match-container ${isCompleted ? 'completed' : ''}`}>
                <div className="match-header-editor">
                  <h3>{match.isGroup ? `Grupo ${matchIndex + 1}` : match.isFinal ? '🏆 Final' : `Match ${matchIndex + 1}`}</h3>
                  {isCompleted && (
                    <span className="completed-badge">
                      <Check size={14} />
                      Completado
                    </span>
                  )}
                </div>
                <div className="match-participants-editor">
                  {match.participants.map((participantId, pIndex) => {
                    const participant = participantsData[participantId];
                    const isWinner = match.winnerId === participantId;
                    const isSelectable = !isCompleted && match.status === 'pending';
                    
                    return (
                      <div 
                        key={participantId} 
                        className={`participant-item-editor ${isWinner ? 'winner' : ''} ${isSelectable ? 'selectable' : ''}`}
                        onClick={() => {
                          if (isSelectable) {
                            handleSetWinner(match.id, participantId);
                          }
                        }}
                      >
                        <div className="participant-info-editor">
                          {participant?.photoURL ? (
                            <img src={participant.photoURL} alt={participant.username} className="participant-photo-small" />
                          ) : (
                            <div className="participant-photo-placeholder-small">
                              {participant?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <span>{participant?.username || participantId}</span>
                        </div>
                        {isWinner && (
                          <Trophy size={18} className="trophy-icon-editor" />
                        )}
                        {isSelectable && (
                          <button className="btn-select-winner" title="Hacer clic para establecer como ganador">
                            <Trophy size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!isCompleted && match.status === 'pending' && (
                  <div className="match-hint">
                    Haz clic en un participante para establecerlo como ganador
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-brackets">
          <p>No hay brackets creados. Genera brackets automáticamente o créalos manualmente.</p>
          <button onClick={handleGenerateBrackets} className="btn-generate">
            <Shuffle size={18} />
            Generar Brackets
          </button>
        </div>
      )}
    </div>
  );
};

export default BracketEditor;
