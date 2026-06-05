import { useState, useEffect } from 'react';
import { getPendingBets, confirmBet, getBetsByEvent } from '../../services/bets';
import { getUserById } from '../../services/users';
import { useAuth } from '../../context/AuthContext';
import { getAllEvents } from '../../services/events';
import { calculateWinnerPayouts } from '../../utils/prizeCalculator';
import { Check, DollarSign, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import './admin-shared.css';
import './BetConfirmation.css';

const BetConfirmation = () => {
  const { user } = useAuth();
  const [pendingBets, setPendingBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPot, setTotalPot] = useState(0);
  const [eventPots, setEventPots] = useState({});
  const [winnerPayouts, setWinnerPayouts] = useState([]); // Pagos pendientes a ganadores

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPendingBets(), loadTotalPot(), loadWinnerPayouts()]);
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

  const loadWinnerPayouts = async () => {
    try {
      const events = await getAllEvents();
      const finishedWithWinner = events.filter(ev =>
        ['FINALIZADO', 'finished'].includes(ev.status) && ev.winnerId
      );
      const payouts = [];
      for (const ev of finishedWithWinner) {
        const bets = await getBetsByEvent(ev.id).catch(() => []);
        const confirmed = bets.filter(b => b.status === 'confirmed');
        const commission = ev.commissionPercent || ev.houseCommission || 10;
        const rows = calculateWinnerPayouts(confirmed, ev.winnerId, commission);
        for (const row of rows) {
          const bettor = await getUserById(row.userId).catch(() => ({ username: row.userId }));
          payouts.push({ ...row, eventName: ev.name, username: bettor.username });
        }
      }
      setWinnerPayouts(payouts);
    } catch (e) {
      console.warn('Error cargando pagos ganadores:', e);
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

      {/* Sección: Pagos a ganadores (eventos finalizados) */}
      {winnerPayouts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.75rem', color: '#CF6679', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
            💳 Pagos pendientes a ganadores (debes pagarles IC en el juego)
          </p>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Evento</th>
                  <th>Apostó</th>
                  <th>Debe cobrar IC</th>
                </tr>
              </thead>
              <tbody>
                {winnerPayouts.map((p, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.username}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.eventName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>${(p.betAmount || 0).toLocaleString()}</td>
                    <td>
                      <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, color: '#4CAF7A', fontSize: '1rem' }}>
                        ${(p.payout || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
            * El pago es proporcional al pozo. La suma de todos los pagos = pozo neto (nunca excede lo recaudado).
          </p>
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
