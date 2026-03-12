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
            <strong>¡Acérquese al taller para poder pagar la apuesta!</strong>
          </p>
          <p className="payment-info">
            Su apuesta quedará en estado pendiente hasta que el administrador confirme el pago.
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
