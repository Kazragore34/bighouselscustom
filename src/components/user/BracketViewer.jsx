import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBracketsByEvent } from '../../services/brackets';
import { getUserById } from '../../services/users';
import { Trophy, ArrowLeft } from 'lucide-react';
import './BracketViewer.css';

const BracketViewer = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [brackets, setBrackets] = useState([]);
  const [participants, setParticipants] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrackets();
  }, [eventId]);

  const loadBrackets = async () => {
    try {
      setLoading(true);
      const bracketsData = await getBracketsByEvent(eventId);
      setBrackets(bracketsData);

      // Cargar información de participantes
      const participantIds = new Set();
      bracketsData.forEach(bracket => {
        bracket.matches.forEach(match => {
          match.participants.forEach(id => participantIds.add(id));
        });
      });

      const participantsData = {};
      for (const id of participantIds) {
        try {
          const userData = await getUserById(id);
          participantsData[id] = userData;
        } catch (error) {
          participantsData[id] = { username: id };
        }
      }
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error cargando brackets:', error);
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
      <div className="no-brackets">
        <Trophy size={48} />
        <p>Los brackets aún no han sido creados</p>
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
        <h2>Brackets del Evento</h2>
      </div>
      
      {brackets.map((bracket, bracketIndex) => (
        <div key={bracketIndex} className="bracket-round">
          <h3>Ronda {bracket.round}</h3>
          <div className="matches-container">
            {bracket.matches.map((match, matchIndex) => (
              <div key={matchIndex} className="match-card">
                <div className="match-header">
                  <span>Match {matchIndex + 1}</span>
                  {match.winnerId && (
                    <span className="winner-badge">
                      <Trophy size={14} />
                      Ganador
                    </span>
                  )}
                </div>
                <div className="match-participants">
                  {match.participants.map((participantId, pIndex) => (
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
                  ))}
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
  );
};

export default BracketViewer;
