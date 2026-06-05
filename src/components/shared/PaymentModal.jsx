import { AlertCircle } from 'lucide-react';
import './PaymentModal.css';

const PaymentModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <AlertCircle size={48} className="alert-icon" />
          <h2>Apuesta Pendiente</h2>
        </div>
        
        <div className="modal-body">
          <p className="payment-message">
            <strong>¡Apuesta registrada! Ahora debes pagar IC al admin del evento.</strong>
          </p>
          <p className="payment-info">
            Tu apuesta quedará en estado <strong>pendiente</strong> hasta que el administrador confirme que recibió el pago en el juego.
          </p>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="modal-button">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
