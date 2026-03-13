import { useState, useEffect } from 'react';
import { getPendingBets, confirmBet, getBetsByEvent } from '../../services/bets';
import { getUserById } from '../../services/users';
import { useAuth } from '../../context/AuthContext';
import { getAllEvents } from '../../services/events';
import { Check, X, DollarSign, Clock, TrendingUp } from 'lucide-react';
import './BetConfirmation.css';

const BetConfirmation = () => {
  const { user } = useAuth();
  const [pendingBets, setPendingBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPot, setTotalPot] = useState(0); // Bote total de todas las apuestas confirmadas
  const [eventPots, setEventPots] = useState({}); // Bote por evento

  useEffect(() => {
    loadPendingBets();
    loadTotalPot();
  }, []);

  const loadPendingBets = async () => {
    try {
      setLoading(true);
      const bets = await getPendingBets();
      
      // Cargar información de usuarios
      const betsWithUsers = await Promise.all(
        bets.map(async (bet) => {
          const [userData, participantData] = await Promise.all([
            getUserById(bet.userId),
            getUserById(bet.participantId)
          ]);
          return {
            ...bet,
            userName: userData.username,
            participantName: participantData.username
          };
        })
      );

      setPendingBets(betsWithUsers);
    } catch (error) {
      console.error('Error cargando apuestas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTotalPot = async () => {
    try {
      const events = await getAllEvents();
      let total = 0;
      const potsByEvent = {};

      for (const event of events) {
        try {
          const bets = await getBetsByEvent(event.id);
          const confirmedBets = bets.filter(b => b.status === 'confirmed');
          const eventTotal = confirmedBets.reduce((sum, bet) => sum + bet.amount, 0);
          total += eventTotal;
          potsByEvent[event.id] = {
            eventName: event.name,
            total: eventTotal,
            count: confirmedBets.length
          };
        } catch (error) {
          console.error(`Error cargando apuestas para evento ${event.id}:`, error);
        }
      }

      setTotalPot(total);
      setEventPots(potsByEvent);
    } catch (error) {
      console.error('Error cargando bote total:', error);
    }
  };

  const handleConfirmBet = async (betId) => {
    if (!confirm('¿Confirmar el pago de esta apuesta?')) {
      return;
    }

    try {
      await confirmBet(betId, user.id);
      alert('Apuesta confirmada exitosamente');
      loadPendingBets();
      loadTotalPot(); // Recargar bote total después de confirmar
    } catch (error) {
      alert('Error al confirmar apuesta');
    }
  };

  if (loading) {
    return <div className="loading">Cargando apuestas pendientes...</div>;
  }

  return (
    <div className="bet-confirmation">
      <div className="bet-confirmation-header">
        <h1>Confirmación de Apuestas</h1>
        <div className="header-stats">
          <div className="stat-item">
            <Clock size={20} />
            <span>{pendingBets.length} apuestas pendientes</span>
          </div>
          <div className="stat-item pot-total">
            <TrendingUp size={20} />
            <span>Bote Total: ${totalPot.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Resumen de botes por evento */}
      {Object.keys(eventPots).length > 0 && (
        <div className="event-pots-summary">
          <h2>Botes por Evento</h2>
          <div className="pots-grid">
            {Object.entries(eventPots).map(([eventId, pot]) => (
              <div key={eventId} className="pot-card">
                <h3>{pot.eventName}</h3>
                <div className="pot-amount">${pot.total.toFixed(2)}</div>
                <div className="pot-count">{pot.count} apuestas confirmadas</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingBets.length === 0 ? (
        <div className="no-bets">
          <Check size={64} />
          <p>No hay apuestas pendientes de confirmación</p>
        </div>
      ) : (
        <div className="bets-table-container">
          <table className="bets-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Participante</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendingBets.map(bet => (
                <tr key={bet.id}>
                  <td>{bet.userName}</td>
                  <td>{bet.participantName}</td>
                  <td className="amount-cell">
                    <DollarSign size={16} />
                    {bet.amount.toFixed(2)}
                  </td>
                  <td>
                    {bet.createdAt?.toDate ? bet.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleConfirmBet(bet.id)}
                      className="btn-confirm"
                    >
                      <Check size={16} />
                      Confirmar Pago
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
