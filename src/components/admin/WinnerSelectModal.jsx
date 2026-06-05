import { useState } from 'react';
import { Trophy, X, Medal } from 'lucide-react';
import './admin-shared.css';

const POSITION_LABELS = ['1° Lugar', '2° Lugar', '3° Lugar', '4° Lugar', '5° Lugar'];
const POSITION_COLORS = ['#C9A84C', '#A8A8A8', '#CD7F32', 'var(--text-muted)', 'var(--text-muted)'];

/**
 * Modal VANTAGE para seleccionar 1 o varios ganadores con posición.
 * Props:
 *   maxWinners  — cuántos ganadores hay que seleccionar (default 1)
 *   participants — array de participantes { userId, username, photoURL }
 *   eventName    — nombre del evento para mostrar
 *   onConfirm(winners) — callback con array [{ userId, username, position }]
 */
const WinnerSelectModal = ({ isOpen, onClose, onConfirm, participants, eventName, maxWinners = 1 }) => {
  const [selected, setSelected] = useState([]); // [{ userId, username, photoURL, position }]

  if (!isOpen) return null;

  const getSlot = (pos) => selected.find(s => s.position === pos) || null;
  const isSelectedSomewhere = (userId) => selected.some(s => s.userId === userId);
  const nextFreePosition = () => {
    for (let i = 1; i <= maxWinners; i++) {
      if (!selected.find(s => s.position === i)) return i;
    }
    return null;
  };

  const handleParticipantClick = (p) => {
    // Si ya está seleccionado en alguna posición → quitarlo
    if (isSelectedSomewhere(p.userId)) {
      setSelected(prev => prev.filter(s => s.userId !== p.userId));
      return;
    }
    // Si ya hay maxWinners seleccionados → no añadir
    if (selected.length >= maxWinners) return;
    const pos = nextFreePosition();
    if (!pos) return;
    setSelected(prev => [...prev, { ...p, position: pos }].sort((a, b) => a.position - b.position));
  };

  const handleRemoveSlot = (pos) => {
    setSelected(prev => {
      const filtered = prev.filter(s => s.position !== pos);
      // Reordenar posiciones
      return filtered.map((s, i) => ({ ...s, position: i + 1 }));
    });
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    onConfirm(selected);
    setSelected([]);
  };

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  const allFilled = selected.length === maxWinners;

  return (
    <div className="admin-modal-overlay" onClick={handleClose}>
      <div className="admin-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} /> Declarar Ganador{maxWinners > 1 ? 'es' : ''}
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 16px' }}>
          Evento: <strong style={{ color: 'var(--text-primary)' }}>{eventName}</strong>
        </p>

        {/* Slots de posiciones */}
        {maxWinners > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {Array.from({ length: maxWinners }, (_, i) => {
              const pos = i + 1;
              const slot = getSlot(pos);
              return (
                <div key={pos} style={{
                  flex: 1,
                  minWidth: 120,
                  background: slot ? 'rgba(201,168,76,0.08)' : 'var(--bg-secondary)',
                  border: `1px solid ${slot ? POSITION_COLORS[i] : 'var(--border-gold)'}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  textAlign: 'center',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: POSITION_COLORS[i], marginBottom: 4 }}>
                    {POSITION_LABELS[i]}
                  </div>
                  {slot ? (
                    <>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{slot.username}</div>
                      <button
                        onClick={() => handleRemoveSlot(pos)}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                      >
                        <X size={11} />
                      </button>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Sin asignar</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lista de participantes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
          {participants.map(p => {
            const inSlot = selected.find(s => s.userId === p.userId);
            const disabled = !inSlot && selected.length >= maxWinners;
            return (
              <button
                key={p.userId || p.id}
                onClick={() => !disabled && handleParticipantClick(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: inSlot ? 'rgba(201,168,76,0.10)' : 'var(--bg-secondary)',
                  border: `1px solid ${inSlot ? POSITION_COLORS[(inSlot.position - 1)] : 'var(--border-gold)'}`,
                  borderRadius: 8,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                {p.photoURL ? (
                  <img src={p.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-gold)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-gold)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontWeight: 700, color: 'var(--gold-primary)', fontSize: '0.8rem' }}>
                    {(p.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <span style={{ flex: 1, color: inSlot ? 'var(--gold-primary)' : 'var(--text-primary)', fontWeight: 600 }}>
                  {p.username || p.name}
                </span>
                {inSlot && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: POSITION_COLORS[inSlot.position - 1], background: 'rgba(0,0,0,0.3)', padding: '2px 7px', borderRadius: 10 }}>
                    {POSITION_LABELS[inSlot.position - 1]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid var(--border-gold)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {maxWinners > 1
              ? `${selected.length} de ${maxWinners} posiciones asignadas.`
              : `Ganador: `}
            {maxWinners === 1 && <strong style={{ color: 'var(--gold-primary)' }}>{selected[0]?.username}</strong>}
            <br />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Se notificará a todos los apostadores y el evento quedará como FINALIZADO.
            </span>
          </div>
        )}

        <div className="admin-modal-footer">
          <button onClick={handleClose} className="btn-cancel">Cancelar</button>
          <button
            onClick={handleConfirm}
            className="btn-save"
            disabled={selected.length === 0}
            style={{ opacity: selected.length > 0 ? 1 : 0.4, cursor: selected.length > 0 ? 'pointer' : 'not-allowed' }}
          >
            <Trophy size={14} /> Confirmar {maxWinners > 1 ? `(${selected.length}/${maxWinners})` : 'Ganador'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerSelectModal;
