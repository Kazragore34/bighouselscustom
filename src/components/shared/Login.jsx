import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Chrome } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <div className="gta-logo">⭐</div>
            <h1>Los Santos Custom</h1>
          </div>
          <p>Sistema de Apuestas</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Ingresa tu usuario"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>

          <div className="divider">
            <span>O</span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="google-button"
          >
            <Chrome size={20} />
            Continuar con Google
          </button>

          <div className="signup-link">
            <p>¿No tienes cuenta? <Link to="/signup">Regístrate aquí</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
