import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBetsByUser } from '../../services/bets';
import { getBetsByEvent } from '../../services/bets';
import { getUserById } from '../../services/users';
import { getEventById } from '../../services/events';
import { X, DollarSign, Trophy, Clock, CheckCircle } from 'lucide-react';
import './BetsModal.css';

const STATUS_MAP = {
  pending:   { label: 'Pendiente',  cls: 'pending',   icon: <Clock size={13} /> },
  confirmed: { label: 'Confirmada', cls: 'confirmed', icon: <CheckCircle size={13} /> },
  GANADORA:  { label: 'Ganada 🎉',  cls: 'won',       icon: <Trophy size={13} /> },
  PERDIDA:   { label: 'Perdida',    cls: 'lost',      icon: <X size={13} /> },
  DEVUELTA:  { label: 'Devuelta',   cls: 'returned',  icon: null },
};

const BetsModal = ({ eventId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [bets, setBets] = useState([]);
  const [participants, setParticipants] = useState({});
  const [poolData, setPoolData] = useState({}); // { participantId: { confirmed, totalPool, netPool } }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user && eventId) loadBets();
  }, [isOpen, user, eventId]);

  const loadBets = async () => {
    try {
      setLoading(true);
      const [userBets, allEventBets, event] = await Promise.all([
        getBetsByUser(user.id),
        getBetsByEvent(eventId),
        getEventById(eventId),
      ]);

      const myBets = userBets.filter(b => b.eventId === eventId);
      setBets(myBets);

      // Calcular pozo real por participante
      const commission = (event.commissionPercent || event.houseCommission || 10) / 100;
      const confirmedAll = allEventBets.filter(b => b.status === 'confirmed');
      const totalPool = confirmedAll.reduce((s, b) => s + (b.amount || 0), 0);
      const netPool = totalPool * (1 - commission);

      const byParticipant = {};
      confirmedAll.forEach(b => {
        if (!byParticipant[b.participantId]) byParticipant[b.participantId] = 0;
        byParticipant[b.participantId] += b.amount || 0;
      });

      const pool = {};
      Object.keys(byParticipant).forEach(pid => {
        const participantPool = byParticipant[pid];
        // Pago si este participante gana: proporción del pozo neto
        pool[pid] = {
          participantPool,
          totalPool,
          netPool,
          multiplier: participantPool > 0 ? netPool / participantPool : 0,
        };
      });
      setPoolData(pool);

      // Cargar datos de participantes
      const ids = [...new Set(myBets.map(b => b.participantId))];
      const pData = {};
      for (const id of ids) {
        try { pData[id] = await getUserById(id); }
        catch { pData[id] = { username: id }; }
      }
      setParticipants(pData);
    } catch (error) {
      console.error('Error cargando apuestas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Agrupar por participante
  const grouped = {};
  bets.forEach(b => {
    if (!grouped[b.participantId]) grouped[b.participantId] = [];
    grouped[b.participantId].push(b);
  });

  const totalConfirmed = bets.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.amount, 0);
  const totalPending   = bets.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bets-modal-vantage" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bets-modal-header">
          <h2>Mis Apuestas</h2>
          <button onClick={onClose} className="bets-modal-close"><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : bets.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <DollarSign size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No tienes apuestas en este evento</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="bets-summary-vantage">
              <div className="bets-summary-item">
                <span>Confirmado</span>
                <strong>${totalConfirmed.toLocaleString()}</strong>
              </div>
              {totalPending > 0 && (
                <div className="bets-summary-item">
                  <span>Pendiente de pago</span>
                  <strong style={{ color: 'var(--gold-primary)' }}>${totalPending.toLocaleString()}</strong>
                </div>
              )}
              <div className="bets-summary-item">
                <span>Apuestas</span>
                <strong>{bets.filter(b => b.status === 'confirmed').length} / {bets.length}</strong>
              </div>
            </div>

            {/* Por participante */}
            <div className="bets-participants-list">
              {Object.entries(grouped).map(([pid, pBets]) => {
                const p = participants[pid];
                const pool = poolData[pid];
                const myConfirmed = pBets.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.amount, 0);
                // Pago estimado parimutuel: pozo_neto × (mi_apuesta / total_en_este_participante)
                const estimatedPayout = pool && pool.netPool > 0 && pool.participantPool > 0
                  ? pool.netPool * (myConfirmed / pool.participantPool)
                  : 0;

                return (
                  <div key={pid} className="bets-participant-card">
                    <div className="bets-participant-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p?.photoURL
                          ? <img src={p.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-gold)', objectFit: 'cover' }} />
                          : <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-gold)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontWeight: 700, color: 'var(--gold-primary)', fontSize: '0.85rem' }}>
                              {(p?.username || '?')[0].toUpperCase()}
                            </div>
                        }
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p?.username || 'Participante'}</div>
                          {pool && pool.totalPool > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Pozo total: ${pool.totalPool.toLocaleString()} · Neto: ${pool.netPool.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      {myConfirmed > 0 && pool && estimatedPayout > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Si gana cobrarías</div>
                          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, color: 'var(--gold-primary)', fontSize: '1rem' }}>
                            ${estimatedPayout.toLocaleString('es', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lista de apuestas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                      {pBets.map(bet => {
                        const s = STATUS_MAP[bet.status] || STATUS_MAP.pending;
                        return (
                          <div key={bet.id} className="bets-bet-row">
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'Cinzel, serif' }}>
                              ${(bet.amount || 0).toLocaleString()}
                            </span>
                            <span className={`bet-status-badge ${s.cls}`}>
                              {s.icon} {s.label}
                            </span>
                            {bet.status === 'pending' && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Paga IC al admin</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-gold)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-cancel" style={{ padding: '8px 20px' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default BetsModal;
