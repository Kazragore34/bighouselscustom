import { useState, useEffect } from 'react';
import { getPendingBets, confirmBet } from '../../services/bets';
import { getUserById } from '../../services/users';
import { useAuth } from '../../context/AuthContext';
import { Check, X, DollarSign, Clock } from 'lucide-react';
import './BetConfirmation.css';

const BetConfirmation = () => {
  const { user } = useAuth();
  const [pendingBets, setPendingBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingBets();
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

  const handleConfirmBet = async (betId) => {
    if (!confirm('¿Confirmar el pago de esta apuesta?')) {
      return;
    }

    try {
      await confirmBet(betId, user.id);
      alert('Apuesta confirmada exitosamente');
      loadPendingBets();
    } catch (error) {
      alert('Error al confirmar apuesta');
    }
  };

  if (loading) {
    return <div className="loading">Cargando apuestas pendientes...</div>;
  }

  return (
    <div className="bet-confirmation">
      <div className="page-header">
        <h1>Confirmación de Apuestas</h1>
        <div className="header-info">
          <Clock size={20} />
          <span>{pendingBets.length} apuestas pendientes</span>
        </div>
      </div>

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
