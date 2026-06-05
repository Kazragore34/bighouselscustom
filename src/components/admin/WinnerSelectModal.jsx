import { useState } from 'react';
import { Trophy, X } from 'lucide-react';
import './admin-shared.css';

/**
 * Modal de diseño VANTAGE para seleccionar ganador de un evento.
 * Reemplaza el prompt() nativo del browser.
 */
const WinnerSelectModal = ({ isOpen, onClose, onConfirm, participants, eventName }) => {
  const [selected, setSelected] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected);
    setSelected(null);
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <div className="admin-modal-overlay" onClick={handleClose}>
      <div className="admin-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} /> Declarar Ganador
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 16px' }}>
          Evento: <strong style={{ color: 'var(--text-primary)' }}>{eventName}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', marginBottom: 20 }}>
          {participants.map(p => (
            <button
              key={p.userId || p.id}
              onClick={() => setSelected(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: selected?.userId === p.userId ? 'rgba(201,168,76,0.12)' : 'var(--bg-secondary)',
                border: `1px solid ${selected?.userId === p.userId ? 'var(--gold-primary)' : 'var(--border-gold)'}`,
                borderRadius: 8,
                cursor: 'pointer',
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
              <span style={{ color: selected?.userId === p.userId ? 'var(--gold-primary)' : 'var(--text-primary)', fontWeight: 600 }}>
                {p.username || p.name}
              </span>
              {selected?.userId === p.userId && (
                <Trophy size={14} style={{ color: 'var(--gold-primary)', marginLeft: 'auto' }} />
              )}
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid var(--border-gold)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Ganador seleccionado: <strong style={{ color: 'var(--gold-primary)' }}>{selected.username}</strong>
            <br />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Se notificará a todos los apostadores y el evento quedará como FINALIZADO.</span>
          </div>
        )}

        <div className="admin-modal-footer">
          <button onClick={handleClose} className="btn-cancel">Cancelar</button>
          <button
            onClick={handleConfirm}
            className="btn-save"
            disabled={!selected}
            style={{ opacity: selected ? 1 : 0.4, cursor: selected ? 'pointer' : 'not-allowed' }}
          >
            <Trophy size={14} /> Confirmar Ganador
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerSelectModal;
