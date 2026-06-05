import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBracketsByEvent } from '../../services/brackets';
import { getUserById } from '../../services/users';
import { Trophy, ArrowLeft, RefreshCw } from 'lucide-react';
import './BracketViewer.css';

const BracketViewer = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [brackets, setBrackets] = useState([]);
  const [participants, setParticipants] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBrackets(); }, [eventId]);

  const loadBrackets = async () => {
    try {
      setLoading(true);
      // Solo leer brackets guardados en Firestore — nunca generar en cliente
      const allBrackets = await getBracketsByEvent(eventId);
      const bracketsData = allBrackets.filter(b => b.eventId === eventId);
      setBrackets(bracketsData);

      // Cargar datos de participantes
      const ids = new Set();
      bracketsData.forEach(b => {
        b.matches?.forEach(m => {
          m.participants?.forEach(id => {
            if (id && !id.startsWith('winner-group-') && id !== 'pending') ids.add(id);
          });
          if (m.winnerId) ids.add(m.winnerId);
        });
      });

      const pData = {};
      for (const id of ids) {
        try {
          pData[id] = await getUserById(id);
        } catch {
          pData[id] = { username: id };
        }
      }
      setParticipants(pData);
    } catch (error) {
      console.error('Error cargando brackets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getName = (id) => participants[id]?.username || id;

  if (loading) {
    return <div className="loading" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando brackets...</div>;
  }

  if (brackets.length === 0) {
    return (
      <div className="bracket-viewer">
        <div className="bracket-header">
          <button onClick={() => navigate(`/events/${eventId}`)} className="btn-back">
            <ArrowLeft size={16} /> Volver
          </button>
          <h2>Bracket del Evento</h2>
          <div />
        </div>
        <div className="no-brackets">
          <Trophy size={48} />
          <p>El bracket aún no ha sido generado</p>
          <p className="no-brackets-sub">El administrador debe generarlo desde el panel de control del evento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bracket-viewer">
      <div className="bracket-header">
        <button onClick={() => navigate(`/events/${eventId}`)} className="btn-back">
          <ArrowLeft size={16} /> Volver
        </button>
        <h2>Bracket del Evento</h2>
        <button onClick={loadBrackets} className="btn-refresh">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className="bracket-rounds-container">
        {brackets.map((bracket, bi) => (
          <div key={bracket.id || bi} className="bracket-round">
            <h3 className="round-title">
              {bracket.isFinal ? '◈ Final' : `Ronda ${bracket.round}`}
            </h3>
            <div className="matches-container">
              {bracket.matches?.map((match, mi) => (
                <div
                  key={match.id || mi}
                  className={`match-card${match.isGroup ? ' group-match' : ''}${match.isFinal ? ' final-match' : ''}`}
                >
                  <div className="match-header">
                    <span>{match.isGroup ? `Grupo ${mi + 1}` : match.isFinal ? '◈ Final' : `Match ${mi + 1}`}</span>
                    {match.winnerId && (
                      <span className="winner-badge"><Trophy size={12} /> Resuelto</span>
                    )}
                  </div>

                  <div className="match-participants">
                    {match.participants?.map((pid) => {
                      if (!pid || pid === 'pending') return null;

                      // Placeholder de ganador de grupo
                      if (pid.startsWith('winner-group-')) {
                        const groupIdx = parseInt(pid.replace('winner-group-', '')) - 1;
                        const prevRound = brackets.find((b, idx) => idx < bi && b.round === bracket.round - 1);
                        const actualWinner = prevRound?.matches?.[groupIdx]?.winnerId;
                        return (
                          <div key={pid} className={`participant placeholder${actualWinner ? ' has-winner' : ''}`}>
                            <div className="participant-name">
                              {actualWinner
                                ? <><Trophy size={12} /> {getName(actualWinner)}</>
                                : `Ganador ${pid.replace('winner-group-', 'Grupo ')}`
                              }
                            </div>
                          </div>
                        );
                      }

                      const isWinner = match.winnerId === pid;
                      const p = participants[pid];
                      return (
                        <div
                          key={pid}
                          className={`participant${isWinner ? ' winner' : ''}${match.status === 'completed' && !isWinner ? ' eliminated' : ''}`}
                        >
                          <div className="participant-info-row">
                            {p?.photoURL ? (
                              <img src={p.photoURL} alt="" className="participant-photo-bracket" />
                            ) : (
                              <div className="participant-photo-placeholder-bracket">
                                {(p?.username || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <span className="participant-name">{getName(pid)}</span>
                          </div>
                          {isWinner && <div className="winner-indicator"><Trophy size={14} /> Ganador</div>}
                          {match.status === 'completed' && !isWinner && <div className="eliminated-indicator">Eliminado</div>}
                        </div>
                      );
                    })}
                  </div>

                  <div className={`match-status ${match.status}`}>
                    {match.status === 'completed'
                      ? <span className="status-completed"><Trophy size={12} /> Completado</span>
                      : <span className="status-pending">⏳ Pendiente</span>
                    }
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
