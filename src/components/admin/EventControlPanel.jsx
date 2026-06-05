import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, getEventParticipants } from '../../services/events';
import { getUserById } from '../../services/users';
import { getRoundsByEvent, openRound, closeRoundBetting, resolveRound } from '../../services/eventRounds';
import { getBetsByEvent } from '../../services/bets';
import { ArrowLeft, Play, Lock, Trophy, RefreshCw, Plus } from 'lucide-react';
import './admin-shared.css';
import './EventControlPanel.css';

const STATUS_COLOR = {
  ABIERTA:  { color: '#4CAF7A', bg: 'var(--success-light)' },
  CERRADA:  { color: '#D4A44C', bg: 'var(--warning-light)' },
  RESUELTA: { color: 'var(--gold-primary)', bg: 'rgba(201,168,76,0.1)' },
};

const EventControlPanel = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [roundBets, setRoundBets] = useState({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => { loadAll(); }, [eventId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [ev, rds, parts, bets] = await Promise.all([
        getEventById(eventId),
        getRoundsByEvent(eventId),
        getEventParticipants(eventId),
        getBetsByEvent(eventId),
      ]);
      setEvent(ev);
      setRounds(rds);

      // Enriquecer participantes con datos de usuario
      const withData = await Promise.all(parts.map(async p => {
        try { return { ...p, ...await getUserById(p.userId) }; }
        catch { return { ...p, username: p.userId }; }
      }));
      setParticipants(withData);

      // Agrupar apuestas por ronda
      const byRound = {};
      bets.filter(b => b.status === 'confirmed' && b.roundNumber != null).forEach(b => {
        if (!byRound[b.roundNumber]) byRound[b.roundNumber] = [];
        byRound[b.roundNumber].push(b);
      });
      setRoundBets(byRound);
    } catch (error) {
      console.error('Error cargando panel:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeRound = rounds.find(r => r.status === 'ABIERTA' || r.status === 'CERRADA');
  const nextRoundNumber = rounds.length > 0 ? Math.max(...rounds.map(r => r.roundNumber)) + 1 : 1;
  const canOpenNew = !activeRound;

  const handleOpenRound = async () => {
    if (!confirm(`¿Abrir Ronda ${nextRoundNumber}? Los usuarios podrán apostar.`)) return;
    setWorking(true);
    try {
      await openRound(eventId, nextRoundNumber);
      await loadAll();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setWorking(false); }
  };

  const handleCloseRound = async (round) => {
    if (!confirm(`¿Cerrar apuestas de Ronda ${round.roundNumber}? Ya no se podrá apostar.`)) return;
    setWorking(true);
    try {
      await closeRoundBetting(round.id);
      await loadAll();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setWorking(false); }
  };

  const handleResolve = async (round) => {
    const opts = participants.map((p, i) => `${i + 1}. ${p.username || p.name}`).join('\n');
    const sel = prompt(`¿Quién ganó la Ronda ${round.roundNumber}?\n\n${opts}\n\nIngresa el número:`);
    if (!sel) return;
    const idx = parseInt(sel) - 1;
    if (idx < 0 || idx >= participants.length) { alert('Número inválido'); return; }
    const winner = participants[idx];
    if (!confirm(`¿Declarar ganador a ${winner.username} en Ronda ${round.roundNumber}?`)) return;
    setWorking(true);
    try {
      const commissionPercent = event?.commissionPercent || event?.houseCommission || 10;
      const result = await resolveRound(round.id, eventId, winner.userId, winner.username, commissionPercent);
      alert(`Ronda ${round.roundNumber} resuelta.\nPozo neto: $${result.netPool.toFixed(0)}\nComisión: $${result.commissionAmount.toFixed(0)}`);
      await loadAll();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setWorking(false); }
  };

  const getRoundPool = (roundNumber) => {
    const bets = roundBets[roundNumber] || [];
    return bets.reduce((s, b) => s + (b.amount || 0), 0);
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando panel...</div>;
  if (!event) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Evento no encontrado</div>;

  const isModE = event.competitionMode === 'RONDAS_INDEPENDIENTES';

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/eventos')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border-gold)', color: 'var(--text-muted)', padding: '7px 12px', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <h1>Panel: <span>{event.name}</span></h1>
        </div>
        <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border-gold)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem' }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Info del evento */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="ecp-info-chip">Modo: <strong>{event.competitionMode || 'BRACKET_TORNEO'}</strong></div>
        <div className="ecp-info-chip">Estado: <strong>{event.status}</strong></div>
        <div className="ecp-info-chip">Participantes: <strong>{participants.length}</strong></div>
        <div className="ecp-info-chip">Comisión: <strong>{event.commissionPercent || event.houseCommission || 10}%</strong></div>
      </div>

      {/* Panel de Rondas Independientes (Modo E) */}
      {isModE ? (
        <>
          {/* Botón abrir nueva ronda */}
          <div style={{ marginBottom: 20 }}>
            <button
              className="btn-add"
              onClick={handleOpenRound}
              disabled={!canOpenNew || working || participants.length === 0}
              title={!canOpenNew ? 'Cierra la ronda activa antes de abrir otra' : participants.length === 0 ? 'Añade participantes primero' : ''}
            >
              <Plus size={15} /> Abrir Ronda {nextRoundNumber}
            </button>
            {!canOpenNew && <span style={{ marginLeft: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Hay una ronda activa — resuélvela primero</span>}
          </div>

          {/* Lista de rondas */}
          {rounds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12 }}>
              <p>Sin rondas aún. Pulsa "Abrir Ronda 1" para empezar.</p>
            </div>
          ) : (
            <div className="rounds-list">
              {[...rounds].reverse().map(round => {
                const s = STATUS_COLOR[round.status] || STATUS_COLOR.RESUELTA;
                const pool = getRoundPool(round.roundNumber);
                return (
                  <div key={round.id} className={`round-card${round.status === 'ABIERTA' ? ' active-round' : ''}`}>
                    <div className="round-card-header">
                      <span className="round-number">Ronda {round.roundNumber}</span>
                      <span className="round-status-badge" style={{ color: s.color, background: s.bg }}>
                        {round.status}
                      </span>
                    </div>

                    <div className="round-card-stats">
                      <span>💰 Pozo confirmado: <strong>${pool.toFixed(0)}</strong></span>
                      {round.status === 'RESUELTA' && (
                        <>
                          <span>🏆 Ganador: <strong>{round.winnerName}</strong></span>
                          <span>📤 Neto repartido: <strong>${(round.netPool || 0).toFixed(0)}</strong></span>
                          <span>🏠 Comisión: <strong>${(round.commissionAmount || 0).toFixed(0)}</strong></span>
                        </>
                      )}
                    </div>

                    <div className="round-card-actions">
                      {round.status === 'ABIERTA' && (
                        <button
                          className="btn-table-action btn-table-danger"
                          style={{ padding: '7px 14px' }}
                          onClick={() => handleCloseRound(round)}
                          disabled={working}
                        >
                          <Lock size={13} /> Cerrar apuestas
                        </button>
                      )}
                      {round.status === 'CERRADA' && (
                        <button
                          className="btn-table-action btn-table-success"
                          style={{ padding: '7px 14px' }}
                          onClick={() => handleResolve(round)}
                          disabled={working}
                        >
                          <Trophy size={13} /> Declarar ganador
                        </button>
                      )}
                      {round.status === 'RESUELTA' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--gold-primary)' }}>✓ Completada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Para otros modos — redirige al editor de bracket */
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12 }}>
          <Trophy size={40} style={{ color: 'var(--gold-dark)', opacity: 0.4, marginBottom: 16 }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Este evento usa el modo <strong style={{ color: 'var(--gold-primary)' }}>{event.competitionMode || 'BRACKET_TORNEO'}</strong>.
          </p>
          <button className="btn-add" onClick={() => navigate(`/admin/events/${eventId}/brackets`)}>
            <Trophy size={14} /> Ir al editor de bracket
          </button>
        </div>
      )}
    </div>
  );
};

export default EventControlPanel;
