import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBracketsByEvent, generateSmartBrackets, updateMatchWinner } from '../../services/brackets';
import { getEventParticipants, getEventById } from '../../services/events';
import { getUserById } from '../../services/users';
import { Shuffle, RefreshCw, Trophy, Check, ArrowLeft } from 'lucide-react';
import './admin-shared.css';
import './BracketEditor.css';

const BracketEditor = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [brackets, setBrackets] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [pData, setPData] = useState({});
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [event, setEvent] = useState(null);

  useEffect(() => { loadData(); }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allBrackets, parts, evData] = await Promise.all([
        getBracketsByEvent(eventId),
        getEventParticipants(eventId),
        getEventById(eventId),
      ]);
      const filtered = allBrackets.filter(b => b.eventId === eventId);
      setBrackets(filtered);
      setParticipants(parts);
      setEvent(evData);

      const map = {};
      for (const p of parts) {
        try { map[p.userId] = await getUserById(p.userId); }
        catch { map[p.userId] = { username: p.userId }; }
      }
      setPData(map);

      // Empezar en la primera ronda con matches pendientes (o la última si todas resueltas)
      if (filtered.length > 0) {
        const firstPending = filtered.findIndex(b => b.matches.some(m => m.status === 'pending'));
        setRound(firstPending >= 0 ? firstPending + 1 : filtered.length);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!confirm('¿Generar bracket oficial? Sobreescribirá el bracket actual y será visible para todos los usuarios.')) return;
    try {
      setLoading(true);
      const partsWithData = participants.map(p => ({ ...p, ...pData[p.userId] }));
      await generateSmartBrackets(eventId, partsWithData, event?.bracketType || '1v1', event?.participantsPerBracket || 2);
      await loadData();
    } catch (error) {
      alert('Error al generar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetWinner = async (matchId, winnerId) => {
    try {
      const current = brackets[round - 1];
      if (!current) return;
      await updateMatchWinner(current.id, matchId, winnerId, eventId);
      await loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const getName = (id) => pData[id]?.username || id;

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando brackets...</div>;

  const currentBracket = brackets[round - 1];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/eventos')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border-gold)', color: 'var(--text-muted)', padding: '7px 12px', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <h1>Editor de <span>Bracket</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleGenerate} className="btn-add" style={{ background: 'transparent', color: 'var(--gold-primary)', border: '1px solid var(--border-gold)' }}>
            <Shuffle size={14} /> Generar Bracket
          </button>
          <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border-gold)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* Selector de ronda */}
      {brackets.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ronda:</span>
          {brackets.map((b, i) => {
            // Solo la última ronda (o la que tenga 1 match y sea la última) se llama "Final"
            const isActualFinal = i === brackets.length - 1 && b.matches?.length === 1;
            return (
              <button
                key={i}
                onClick={() => setRound(i + 1)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: round === i + 1 ? '1px solid var(--gold-primary)' : '1px solid var(--border-gold)',
                  background: round === i + 1 ? 'var(--gold-glow)' : 'transparent',
                  color: round === i + 1 ? 'var(--gold-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontFamily: 'Cinzel, serif',
                }}
              >
                {isActualFinal ? '◈ Final' : `R${i + 1}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Sin brackets */}
      {brackets.length === 0 && (
        <div className="admin-table-container" style={{ textAlign: 'center', padding: 48 }}>
          <Trophy size={40} style={{ color: 'var(--gold-dark)', opacity: 0.3, marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No hay bracket generado aún.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
            Asegúrate de haber añadido participantes al evento antes de generar.
          </p>
          <button onClick={handleGenerate} className="btn-add">
            <Shuffle size={14} /> Generar Bracket Oficial
          </button>
        </div>
      )}

      {/* Matches de la ronda actual */}
      {currentBracket && (
        <div className="bracket-editor-grid">
          {currentBracket.matches.map((match, mi) => {
            const done = match.status === 'completed' && match.winnerId;
            return (
              <div key={match.id || mi} className={`editor-match-card${done ? ' done' : ''}`}>
                <div className="editor-match-header">
                  <span>{match.isGroup ? `Grupo ${mi + 1}` : match.isFinal ? '◈ Final' : `Match ${mi + 1}`}</span>
                  {done && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--gold-primary)' }}><Check size={12} /> Resuelto</span>}
                </div>

                <div className="editor-participants">
                  {match.participants?.map(pid => {
                    const isWinner = match.winnerId === pid;
                    const selectable = !done && match.status === 'pending';
                    return (
                      <div
                        key={pid}
                        className={`editor-participant${isWinner ? ' winner' : ''}${selectable ? ' selectable' : ''}`}
                        onClick={() => selectable && handleSetWinner(match.id, pid)}
                        title={selectable ? 'Clic para marcar ganador' : undefined}
                      >
                        {pData[pid]?.photoURL
                          ? <img src={pData[pid].photoURL} alt="" className="editor-p-photo" />
                          : <div className="editor-p-placeholder">{(getName(pid) || '?')[0].toUpperCase()}</div>
                        }
                        <span className="editor-p-name">{getName(pid)}</span>
                        {isWinner && <Trophy size={14} style={{ color: 'var(--gold-primary)', marginLeft: 'auto', flexShrink: 0 }} />}
                        {selectable && !isWinner && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>→</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!done && match.status === 'pending' && (
                  <p style={{ padding: '6px 12px', fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                    Clic en un participante para marcarlo ganador
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BracketEditor;
