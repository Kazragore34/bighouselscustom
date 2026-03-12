import { useState, useEffect } from 'react';
import { getBracketsByEvent, updateBracket, generateSmartBrackets } from '../../services/brackets';
import { getEventParticipants } from '../../services/events';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Shuffle, Save, RefreshCw } from 'lucide-react';
import './BracketEditor.css';

import { useParams } from 'react-router-dom';

const BracketEditor = () => {
  const { eventId } = useParams();
  const [brackets, setBrackets] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bracketsData, participantsData] = await Promise.all([
        getBracketsByEvent(eventId),
        getEventParticipants(eventId)
      ]);
      setBrackets(bracketsData);
      setParticipants(participantsData);
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
          {currentBracket.matches.map((match, matchIndex) => (
            <div key={matchIndex} className="match-container">
              <h3>Match {matchIndex + 1}</h3>
              {match.participants.map((participantId, pIndex) => {
                const participant = participants.find(p => p.userId === participantId);
                return (
                  <div key={participantId} className="participant-item">
                    {participant ? participant.username : participantId}
                  </div>
                );
              })}
            </div>
          ))}
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
