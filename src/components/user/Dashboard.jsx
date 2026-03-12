import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EventSelector from './EventSelector';
import { Trophy, TrendingUp, Users, DollarSign } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // El admin puede ver el dashboard de usuario también
  // Si quiere ir al panel admin, puede usar el menú de navegación

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h1>Bienvenido, {user?.username}</h1>
        <p>Selecciona un evento para comenzar</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <Trophy className="stat-icon" />
          <div className="stat-info">
            <h3>0</h3>
            <p>Eventos Activos</p>
          </div>
        </div>
        <div className="stat-card">
          <Users className="stat-icon" />
          <div className="stat-info">
            <h3>0</h3>
            <p>Votos Realizados</p>
          </div>
        </div>
        <div className="stat-card">
          <DollarSign className="stat-icon" />
          <div className="stat-info">
            <h3>$0</h3>
            <p>Total Apostado</p>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp className="stat-icon" />
          <div className="stat-info">
            <h3>0</h3>
            <p>Insignias</p>
          </div>
        </div>
      </div>

      <EventSelector />
    </div>
  );
};

export default Dashboard;
