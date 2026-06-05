import { useState, useEffect } from 'react';
import { getPendingBets, confirmBet, getBetsByEvent } from '../../services/bets';
import { getUserById } from '../../services/users';
import { useAuth } from '../../context/AuthContext';
import { getAllEvents } from '../../services/events';
import { Check, DollarSign, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import './admin-shared.css';
import './BetConfirmation.css';

const BetConfirmation = () => {
  const { user } = useAuth();
  const [pendingBets, setPendingBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPot, setTotalPot] = useState(0);
  const [eventPots, setEventPots] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPendingBets(), loadTotalPot()]);
    setLoading(false);
  };

  const loadPendingBets = async () => {
    try {
      const bets = await getPendingBets();
      const withUsers = await Promise.all(bets.map(async bet => {
        const [u, p] = await Promise.all([
          getUserById(bet.userId).catch(() => ({ username: bet.userId })),
          getUserById(bet.participantId).catch(() => ({ username: bet.participantId })),
        ]);
        return { ...bet, userName: u.username, participantName: p.username };
      }));
      setPendingBets(withUsers);
    } catch (error) {
      console.error('Error cargando apuestas:', error);
    }
  };

  const loadTotalPot = async () => {
    try {
      const events = await getAllEvents();
      let total = 0;
      const pots = {};
      for (const ev of events) {
        try {
          const bets = await getBetsByEvent(ev.id);
          const confirmed = bets.filter(b => b.status === 'confirmed');
          const evTotal = confirmed.reduce((s, b) => s + b.amount, 0);
          total += evTotal;
          if (evTotal > 0) pots[ev.id] = { name: ev.name, total: evTotal, count: confirmed.length };
        } catch {}
      }
      setTotalPot(total);
      setEventPots(pots);
    } catch (error) {
      console.error('Error cargando botes:', error);
    }
  };

  const handleConfirm = async (betId) => {
    if (!confirm('¿Confirmar el pago IC de esta apuesta?')) return;
    try {
      await confirmBet(betId, user.id);
      await loadAll();
    } catch (error) {
      alert('Error al confirmar: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando apuestas...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Confirmación de <span>Apuestas</span></h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            <Clock size={15} /> {pendingBets.length} pendientes
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--gold-primary)', fontWeight: 700 }}>
            <TrendingUp size={15} /> ${totalPot.toFixed(0)} en botes
          </span>
          <button
            onClick={loadAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border-gold)', color: 'var(--text-muted)', padding: '7px 12px', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* Botes por evento */}
      {Object.keys(eventPots).length > 0 && (
        <div className="event-pots-summary">
          <p style={{ fontSize: '0.75rem', color: 'var(--gold-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
            Botes Activos
          </p>
          <div className="pots-grid">
            {Object.entries(eventPots).map(([id, pot]) => (
              <div key={id} className="pot-card">
                <div className="pot-name">{pot.name}</div>
                <div className="pot-amount">${pot.total.toFixed(0)}</div>
                <div className="pot-count">{pot.count} confirmadas</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de pendientes */}
      {pendingBets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Check size={40} style={{ color: 'var(--gold-dark)', opacity: 0.4, marginBottom: 12 }} />
          <p>No hay apuestas pendientes de confirmación</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Apostó a</th>
                <th>Monto IC</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendingBets.map(bet => (
                <tr key={bet.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{bet.userName}</td>
                  <td>{bet.participantName}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gold-primary)', fontWeight: 700, fontFamily: 'Cinzel, serif' }}>
                      <DollarSign size={13} />{(bet.amount || 0).toFixed(0)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {bet.createdAt?.toDate ? bet.createdAt.toDate().toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td>
                    <button onClick={() => handleConfirm(bet.id)} className="btn-table-action btn-table-success">
                      <Check size={13} /> Confirmar Pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BetConfirmation;
